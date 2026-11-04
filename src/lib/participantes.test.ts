import { describe, expect, it } from "vitest";
import { regrouperParticipantes, type PreInscriptionInvitee } from "./participantes";

const demande = (p: Partial<PreInscriptionInvitee>): PreInscriptionInvitee => ({
  utilisateur_id: null, prenom_invite: "Sophie", nom_invite: "Allain", email_invite: "sophie@exemple.fr",
  telephone_invite: null, statut: "en_attente", inscrit_le: "2026-11-03T10:00:00Z", ...p,
});

describe("participantes aux ateliers sans compte", () => {
  it("regroupe les demandes d'une même personne par e-mail (sans tenir compte des majuscules)", () => {
    const r = regrouperParticipantes([
      demande({ statut: "confirme", ateliers: { titre: "Ancien", date_atelier: "2026-10-01" }, inscrit_le: "2026-09-01T10:00:00Z" }),
      demande({ email_invite: " Sophie@Exemple.fr ", statut: "confirme", telephone_invite: "0601", ateliers: { titre: "Journée Création Instagram", date_atelier: "2026-11-05" }, autorisation_image: true, accord_whatsapp: false }),
    ], []);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      prenom: "Sophie", nom: "Allain", email: "sophie@exemple.fr", telephone: "0601", demandes: 2, validees: 2,
      dernierAtelier: { titre: "Journée Création Instagram", date: "2026-11-05" }, autorisationImage: true, accordWhatsapp: false,
    });
  });
  it("met la demande la plus récente en premier", () => {
    const r = regrouperParticipantes([
      demande({ email_invite: "a@x.fr", inscrit_le: "2026-11-01T10:00:00Z" }),
      demande({ email_invite: "b@x.fr", inscrit_le: "2026-11-04T10:00:00Z" }),
    ], []);
    expect(r.map(p => p.email)).toEqual(["b@x.fr", "a@x.fr"]);
  });
  it("écarte les demandes rattachées à un compte ou dont l'e-mail a déjà un compte", () => {
    const r = regrouperParticipantes([
      demande({ utilisateur_id: "u1", email_invite: null }),
      demande({ email_invite: "compte@x.fr" }),
      demande({ email_invite: "nouvelle@x.fr" }),
    ], ["Compte@x.fr"]);
    expect(r.map(p => p.email)).toEqual(["nouvelle@x.fr"]);
  });
  it("écarte les demandes anonymisées et regroupe par nom sans e-mail", () => {
    const r = regrouperParticipantes([
      demande({ prenom_invite: null, nom_invite: null, email_invite: null }),
      demande({ email_invite: null }),
      demande({ email_invite: "", prenom_invite: " sophie", nom_invite: "ALLAIN " }),
    ], []);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ email: null, demandes: 2 });
  });
});
