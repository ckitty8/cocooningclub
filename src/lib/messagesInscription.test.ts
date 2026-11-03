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
  it("reprend aussi l'adresse, la carte, l'heure de fin et les tarifs de l'atelier", () => {
    const complet = {
      ...insc,
      ateliers: {
        ...insc.ateliers, adresse: "12 rue de la Paix, 93220 Gagny", duree: "2h30", tarif_standard: 15, tarif_adherent: 10,
        espaces: { nom: "Papotages" }, date_fin_inscription: "2026-11-01",
      },
    };
    expect(remplirModele("{espace} · {adresse} · {heure}-{heure_fin} ({duree}) · {tarif} / {tarif_adherent} · avant le {date_limite}", complet)).toBe(
      "Papotages · 12 rue de la Paix, 93220 Gagny · 18:30-21:00 (2h30) · 15 € / 10 € · avant le 01 novembre 2026",
    );
    expect(remplirModele("{carte}", complet)).toBe("https://www.google.com/maps/search/?api=1&query=12%20rue%20de%20la%20Paix%2C%2093220%20Gagny");
  });
  it("un lien Google Maps collé dans l'adresse sert d'adresse et de carte ; un champ vide reste vide", () => {
    const lien = "https://maps.app.goo.gl/abc";
    const avecLien = { ...insc, ateliers: { ...insc.ateliers, adresse: lien } };
    expect(remplirModele("{adresse}|{carte}|{matin}|{tarif}", avecLien)).toBe(`${lien}|${lien}||`);
    expect(remplirModele("{tarif}", { ...insc, ateliers: { ...insc.ateliers, tarif_standard: 0 } })).toBe("Gratuit");
  });
  it("reprend le créneau choisi et son prix (ateliers Business)", () => {
    const business = {
      ...insc, creneau: "matin",
      ateliers: { ...insc.ateliers, tarif_standard: 0, creneaux: { matin: { debut: "10:00", fin: "13:00", tarif: 25 }, journee: {} } },
    };
    expect(remplirModele("{creneau} · {tarif}", business)).toBe("Matinée (10:00 – 13:00) · 25 €");
    expect(remplirModele("[{creneau}]", insc)).toBe("[]");
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
