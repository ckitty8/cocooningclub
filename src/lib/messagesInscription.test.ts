import { describe, expect, it } from "vitest";
import { clesModele, remplirModele, telephonePourWhatsApp } from "./messagesInscription";

const insc = {
  prenom_invite: null, nom_invite: null, email_invite: null, telephone_invite: null, date_naissance: null,
  utilisateurs: { prenom: "Marie", nom: "Dupont", email: "m@x.fr", telephone: "0601020304" },
  ateliers: { titre: "Papotages - Méthode DISC", date_atelier: "2026-11-05", heure_debut: "18:30:00", lieu: "Salle des fêtes" },
};

describe("messages aux pré-inscrites", () => {
  it("remplit les variables du modèle", () => {
    expect(remplirModele("Bonjour {prenom} {nom}, {titre} à {heure} ({lieu})", insc)).toBe(
      "Bonjour Marie Dupont, Papotages - Méthode DISC à 18:30 (Salle des fêtes)",
    );
  });
  it("met le numéro au format WhatsApp", () => {
    expect(telephonePourWhatsApp("06 01 02 03 04")).toBe("33601020304");
    expect(telephonePourWhatsApp("+33 6 01 02 03 04")).toBe("33601020304");
  });
  it("choisit le modèle selon la décision", () => {
    expect(clesModele(true, "mail").corps).toBe("validation_mail_corps");
    expect(clesModele(false, "whatsapp").corps).toBe("refus_whatsapp");
  });
});
