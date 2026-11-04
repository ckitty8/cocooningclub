import { describe, expect, it } from "vitest";
import { nomFeuille, nomFichierInscrites, tableauInscrites, type InscriteExport } from "./exportInscrites";

const base: InscriteExport = {
  prenom: "Laurie", nom: "Mbone", email: "hello@maisondemains.fr", telephone: "+33683947184", compte: "Sans compte",
  statut: "confirme", statutPaiement: "non_requis", autorisationImage: false, accordWhatsapp: true, dateNaissance: null,
  recueLe: new Date(2026, 10, 4, 14, 38).toISOString(),
};

describe("export Excel des inscrites d'un atelier", () => {
  it("reprend les réponses du formulaire", () => {
    const t = tableauInscrites([base]);
    expect(t[0]).toEqual(["Prénom", "Nom", "E-mail", "Téléphone", "Compte", "Statut", "Paiement", "Droit à l'image", "Groupe WhatsApp", "Reçue le"]);
    expect(t[1]).toEqual(["Laurie", "Mbone", "hello@maisondemains.fr", "+33683947184", "Sans compte", "Validée", "Gratuit", "N'autorise pas", "Accepte", "04/11/2026 14:38"]);
  });
  it("ajoute tarif, présence et date de naissance seulement s'ils sont connus", () => {
    const t = tableauInscrites([{ ...base, tarif: "Gratuit", presente: true, dateNaissance: "1990-03-02", autorisationImage: null }]);
    expect(t[0]).toEqual(["Prénom", "Nom", "E-mail", "Téléphone", "Compte", "Tarif", "Statut", "Paiement", "Présente", "Droit à l'image", "Groupe WhatsApp", "Date de naissance", "Reçue le"]);
    expect(t[1].slice(5, 12)).toEqual(["Gratuit", "Validée", "Gratuit", "Oui", "Pas de réponse", "Accepte", "02/03/1990"]);
  });
  it("donne un nom de fichier et de feuille valides", () => {
    expect(nomFichierInscrites("Journée Création Instagram", "2026-11-05")).toBe("inscrites-journee-creation-instagram-2026-11-05.xlsx");
    expect(nomFeuille("Atelier : bougies / savons [débutantes] et encore plus long")).toHaveLength(31);
    expect(nomFeuille("Atelier : bougies")).toBe("Atelier   bougies");
  });
});
