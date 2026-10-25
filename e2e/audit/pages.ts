// Pages auditées (contraste et mise en page), avec les données d'exemple dont elles ont besoin.
import { ATELIER_TEST } from "../supabaseMock";

export interface PageAuditee {
  chemin: string;
  profil: "visiteur" | "membre" | "admin" | "createur";
}

export const PAGES: PageAuditee[] = [
  { chemin: "/", profil: "visiteur" },
  { chemin: "/calendrier", profil: "visiteur" },
  { chemin: `/inscription/${ATELIER_TEST.id}`, profil: "visiteur" },
  { chemin: "/notre-histoire", profil: "visiteur" },
  { chemin: "/login", profil: "visiteur" },
  { chemin: "/forgot-password", profil: "visiteur" },
  { chemin: "/confidentialite", profil: "visiteur" },
  { chemin: "/cgu", profil: "visiteur" },
  { chemin: "/mentions-legales", profil: "visiteur" },
  { chemin: "/introuvable", profil: "visiteur" },
  { chemin: "/espace-membre", profil: "membre" },
  { chemin: "/espace-membre/ateliers", profil: "membre" },
  { chemin: "/espace-membre/inscriptions", profil: "membre" },
  { chemin: "/espace-membre/magazine", profil: "membre" },
  { chemin: "/espace-membre/mon-adhesion", profil: "membre" },
  { chemin: "/espace-membre/mon-compte", profil: "membre" },
  { chemin: "/espace-membre/boite-a-idees", profil: "membre" },
  { chemin: "/admin/dashboard", profil: "admin" },
  { chemin: "/admin/membres", profil: "admin" },
  { chemin: "/admin/offre", profil: "admin" },
  { chemin: "/admin/ateliers", profil: "admin" },
  { chemin: `/admin/ateliers/${ATELIER_TEST.id}`, profil: "admin" },
  { chemin: "/admin/pre-inscriptions", profil: "admin" },
  { chemin: "/admin/documents", profil: "admin" },
  { chemin: "/admin/formulaire", profil: "admin" },
  { chemin: "/admin/messages-templates", profil: "admin" },
  { chemin: "/admin/disponibilites", profil: "admin" },
  { chemin: "/admin/boite-a-idees", profil: "admin" },
  { chemin: "/admin/avis", profil: "admin" },
  { chemin: "/admin/mon-compte", profil: "admin" },
  { chemin: "/admin/createur/simulateur", profil: "createur" },
  { chemin: "/admin/createur/droits", profil: "createur" },
  { chemin: "/admin/createur/matrice", profil: "createur" },
];
