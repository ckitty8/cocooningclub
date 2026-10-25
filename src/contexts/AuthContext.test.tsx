import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/useAuth";
import { AuthProvider } from "./AuthContext";

type Callback = (event: string, session: Session | null) => void;

// Doublure du client Supabase : on capture le callback d'onAuthStateChange
// pour simuler les événements d'authentification à la main.
const mocks = vi.hoisted(() => ({
  callback: null as Callback | null,
  unsubscribe: vi.fn(),
  maybeSingle: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.from,
    auth: {
      onAuthStateChange: (cb: Callback) => {
        mocks.callback = cb;
        return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
      },
      signInWithPassword: mocks.signInWithPassword,
      signOut: mocks.signOut,
    },
  },
}));

const PROFIL = { id: "u1", prenom: "Marie", nom: "Dupont", role: "membre", est_actif: true };
const SESSION = { user: { id: "u1" } } as Session;

const Sonde = () => {
  const { loading, profile, user, signIn, signOut } = useAuth();
  return (
    <div>
      <p data-testid="etat">{loading ? "chargement" : "pret"}</p>
      <p data-testid="profil">{profile ? profile.prenom : "aucun"}</p>
      <p data-testid="user">{user ? user.id : "anonyme"}</p>
      <button onClick={() => signIn("a@b.fr", "mdp")}>connexion</button>
      <button onClick={() => signOut()}>deconnexion</button>
    </div>
  );
};

const monter = () => render(<AuthProvider><Sonde /></AuthProvider>);
const emettre = (event: string, session: Session | null) => act(() => mocks.callback?.(event, session));
// Laisse passer le setTimeout(0) de l'AuthProvider puis la promesse du profil.
const attendreProfil = () => act(() => vi.advanceTimersByTimeAsync(1));

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.callback = null;
    mocks.unsubscribe.mockReset();
    mocks.maybeSingle.mockReset().mockResolvedValue({ data: PROFIL, error: null });
    mocks.eq.mockReset().mockReturnValue({ maybeSingle: mocks.maybeSingle });
    mocks.select.mockReset().mockReturnValue({ eq: mocks.eq });
    mocks.from.mockReset().mockReturnValue({ select: mocks.select });
    mocks.signInWithPassword.mockReset().mockResolvedValue({ error: null });
    mocks.signOut.mockReset().mockResolvedValue({ error: null });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("reste en chargement jusqu'au premier événement d'authentification", () => {
    monter();
    expect(screen.getByTestId("etat")).toHaveTextContent("chargement");
  });

  it("sans session : fin du chargement, aucun profil, aucune requête", () => {
    monter();
    emettre("INITIAL_SESSION", null);
    expect(screen.getByTestId("etat")).toHaveTextContent("pret");
    expect(screen.getByTestId("profil")).toHaveTextContent("aucun");
    expect(screen.getByTestId("user")).toHaveTextContent("anonyme");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("avec session : reste en chargement jusqu'à l'arrivée du profil", async () => {
    monter();
    emettre("SIGNED_IN", SESSION);
    expect(screen.getByTestId("etat")).toHaveTextContent("chargement");
    // Le chargement est différé hors du callback (anti-deadlock Supabase).
    expect(mocks.from).not.toHaveBeenCalled();

    await attendreProfil();

    expect(mocks.from).toHaveBeenCalledWith("utilisateurs");
    expect(mocks.eq).toHaveBeenCalledWith("id", "u1");
    expect(screen.getByTestId("etat")).toHaveTextContent("pret");
    expect(screen.getByTestId("profil")).toHaveTextContent("Marie");
    expect(screen.getByTestId("user")).toHaveTextContent("u1");
  });

  it("TOKEN_REFRESHED ne repasse pas en chargement et ne recharge pas le profil", async () => {
    monter();
    emettre("SIGNED_IN", SESSION);
    await attendreProfil();
    mocks.from.mockClear();

    emettre("TOKEN_REFRESHED", SESSION);
    await attendreProfil();

    expect(screen.getByTestId("etat")).toHaveTextContent("pret");
    expect(screen.getByTestId("profil")).toHaveTextContent("Marie");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("USER_UPDATED est traité comme TOKEN_REFRESHED", async () => {
    monter();
    emettre("SIGNED_IN", SESSION);
    await attendreProfil();
    mocks.from.mockClear();

    emettre("USER_UPDATED", SESSION);
    await attendreProfil();

    expect(screen.getByTestId("etat")).toHaveTextContent("pret");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("erreur de requête : le chargement se termine sans profil", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { message: "boom", code: "42501" } });
    monter();
    emettre("SIGNED_IN", SESSION);
    await attendreProfil();

    expect(screen.getByTestId("etat")).toHaveTextContent("pret");
    expect(screen.getByTestId("profil")).toHaveTextContent("aucun");
  });

  it("aucune ligne pour cet utilisateur : pas de profil, pas de blocage", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    monter();
    emettre("SIGNED_IN", SESSION);
    await attendreProfil();

    expect(screen.getByTestId("etat")).toHaveTextContent("pret");
    expect(screen.getByTestId("profil")).toHaveTextContent("aucun");
  });

  it("requête sans réponse : abandon au bout de 5 s au lieu de bloquer l'interface", async () => {
    mocks.maybeSingle.mockReturnValue(new Promise(() => {}));
    monter();
    emettre("SIGNED_IN", SESSION);
    await attendreProfil();
    expect(screen.getByTestId("etat")).toHaveTextContent("chargement");

    await act(() => vi.advanceTimersByTimeAsync(5000));

    expect(screen.getByTestId("etat")).toHaveTextContent("pret");
    expect(screen.getByTestId("profil")).toHaveTextContent("aucun");
  });

  it("déconnexion : le profil est effacé", async () => {
    monter();
    emettre("SIGNED_IN", SESSION);
    await attendreProfil();

    await act(async () => screen.getByText("deconnexion").click());
    expect(mocks.signOut).toHaveBeenCalled();
    expect(screen.getByTestId("profil")).toHaveTextContent("aucun");

    emettre("SIGNED_OUT", null);
    expect(screen.getByTestId("user")).toHaveTextContent("anonyme");
    expect(screen.getByTestId("etat")).toHaveTextContent("pret");
  });

  it("signIn transmet l'email et le mot de passe à Supabase", async () => {
    monter();
    await act(async () => screen.getByText("connexion").click());
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: "a@b.fr", password: "mdp" });
  });

  it("se désabonne des événements au démontage", () => {
    const { unmount } = monter();
    unmount();
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
