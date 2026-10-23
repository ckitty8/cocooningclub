import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { Session, User } from "@supabase/supabase-js";
import { AuthContext, type AuthContextType, type Profile } from "@/contexts/auth";
import RoleGuard from "./RoleGuard";

const profilDe = (surcharge: Partial<Profile> = {}): Profile => ({
  id: "u1",
  nom: "Dupont",
  prenom: "Marie",
  email: "marie@exemple.fr",
  telephone: null,
  date_naissance: null,
  url_avatar: null,
  debut_abonnement: null,
  fin_abonnement: null,
  role: "membre",
  est_actif: true,
  cree_le: "2026-01-01T00:00:00Z",
  ...surcharge,
});

const contexte = (surcharge: Partial<AuthContextType> = {}): AuthContextType => ({
  user: { id: "u1" } as User,
  session: {} as Session,
  profile: profilDe(),
  loading: false,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
  ...surcharge,
});

// Affiche la page protégée sur /protege ; chaque destination de redirection
// a sa propre route pour savoir où l'on a atterri.
const rendre = (auth: AuthContextType, allowedRoles = ["administrateur"], redirectTo?: string) =>
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={["/protege"]}>
        <Routes>
          <Route
            path="/protege"
            element={
              <RoleGuard allowedRoles={allowedRoles} redirectTo={redirectTo}>
                <p>Contenu protégé</p>
              </RoleGuard>
            }
          />
          <Route path="/login" element={<p>Page de connexion</p>} />
          <Route path="/connexion-perso" element={<p>Connexion personnalisée</p>} />
          <Route path="/" element={<p>Accueil</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

describe("RoleGuard", () => {
  it("affiche le contenu quand le rôle est autorisé", () => {
    rendre(contexte({ profile: profilDe({ role: "administrateur" }) }));
    expect(screen.getByText("Contenu protégé")).toBeInTheDocument();
  });

  it("accepte n'importe lequel des rôles autorisés", () => {
    rendre(contexte({ profile: profilDe({ role: "inscrit" }) }), ["inscrit", "membre", "administrateur"]);
    expect(screen.getByText("Contenu protégé")).toBeInTheDocument();
  });

  it("n'affiche ni contenu ni redirection pendant le chargement", () => {
    rendre(contexte({ loading: true, user: null, profile: null }));
    expect(screen.queryByText("Contenu protégé")).not.toBeInTheDocument();
    expect(screen.queryByText("Page de connexion")).not.toBeInTheDocument();
    expect(screen.queryByText("Accueil")).not.toBeInTheDocument();
  });

  it("redirige vers /login sans utilisateur connecté", () => {
    rendre(contexte({ user: null, profile: null }));
    expect(screen.getByText("Page de connexion")).toBeInTheDocument();
    expect(screen.queryByText("Contenu protégé")).not.toBeInTheDocument();
  });

  it("redirige vers /login quand le profil est introuvable", () => {
    rendre(contexte({ profile: null }));
    expect(screen.getByText("Page de connexion")).toBeInTheDocument();
  });

  it("respecte une destination de redirection personnalisée", () => {
    rendre(contexte({ user: null, profile: null }), ["administrateur"], "/connexion-perso");
    expect(screen.getByText("Connexion personnalisée")).toBeInTheDocument();
  });

  it("renvoie un compte désactivé vers /login?inactive=true, même avec le bon rôle", () => {
    render(
      <AuthContext.Provider value={contexte({ profile: profilDe({ role: "administrateur", est_actif: false }) })}>
        <MemoryRouter initialEntries={["/protege"]}>
          <Routes>
            <Route
              path="/protege"
              element={<RoleGuard allowedRoles={["administrateur"]}><p>Contenu protégé</p></RoleGuard>}
            />
            <Route path="/login" element={<LocationEcho />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.getByTestId("search")).toHaveTextContent("?inactive=true");
    expect(screen.queryByText("Contenu protégé")).not.toBeInTheDocument();
  });

  it("renvoie un membre vers l'accueil sur une route réservée aux administrateurs", () => {
    rendre(contexte({ profile: profilDe({ role: "membre" }) }));
    expect(screen.getByText("Accueil")).toBeInTheDocument();
    expect(screen.queryByText("Contenu protégé")).not.toBeInTheDocument();
  });

  it("renvoie un administrateur vers l'accueil si le rôle n'est pas dans la liste", () => {
    rendre(contexte({ profile: profilDe({ role: "administrateur" }) }), ["membre"]);
    expect(screen.getByText("Accueil")).toBeInTheDocument();
  });
});

function LocationEcho() {
  return <p data-testid="search">{useLocation().search}</p>;
}
