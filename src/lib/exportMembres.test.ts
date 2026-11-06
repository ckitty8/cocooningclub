import { describe, expect, it } from "vitest";
import { COLONNES_COMPTES, COLONNES_PARTICIPANTES, nomFichierMembres, tableauComptes, tableauParticipantes } from "./exportMembres";

describe("export Excel de l'écran Membres", () => {
  it("met une ligne d'en-tête puis une ligne par compte", () => {
    const t = tableauComptes([{
      prenom: "Marie", nom: "Dupont", email: "marie@x.fr", telephone: null, role: "Inscrit", numeroAdherente: "0003", offres: "L'Espace Chill",
      actif: true, naissance: "", activite: "Illustratrice", hobby: null, consentementPhotos: "Oui", creeLe: "2026-10-26T08:00:00Z",
    }]);
    expect(t[0]).toEqual(COLONNES_COMPTES);
    expect(t[1]).toEqual(["Marie", "Dupont", "marie@x.fr", "", "Inscrit", "0003", "L'Espace Chill", "Actif", "", "Illustratrice", "", "Oui", "26/10/2026"]);
  });
  it("reprend les participantes sans compte avec leurs réponses", () => {
    const t = tableauParticipantes([{
      cle: "s", prenom: "Sophie", nom: "Allain", email: "sophie@x.fr", telephone: "0601", demandes: 2, validees: 1,
      dernierAtelier: { titre: "Journée Création Instagram", date: "2026-11-05" }, derniereDemande: "2026-11-03T13:27:00Z",
      autorisationImage: true, accordWhatsapp: null,
    }]);
    expect(t[0]).toEqual(COLONNES_PARTICIPANTES);
    expect(t[1]).toEqual(["Sophie", "Allain", "sophie@x.fr", "0601", "Journée Création Instagram", "05/11/2026", "2", "1", "Autorise", "", "03/11/2026"]);
  });
  it("date le nom du fichier", () => {
    expect(nomFichierMembres(new Date(2026, 10, 4))).toBe("membres-cocooning-club-2026-11-04.xlsx");
  });
});
