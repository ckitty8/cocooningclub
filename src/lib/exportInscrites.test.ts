import { describe, expect, it } from "vitest";
import { feuilleEmargement, LIGNES_LIBRES, nomFeuille, nomFichierEmargement, nomFichierInscrites, sousTitreAtelier, tableauInscrites, type InscriteExport } from "./exportInscrites";

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

describe("feuille d'émargement", () => {
  const atelier = { titre: "Journée Création Instagram", sousTitre: "Jeudi 5 novembre 2026 · 10:00 – 17:00 · La Picorette" };
  const valeurs = (ligne: (Record<string, unknown> | null)[]) => ligne.map(c => c?.value);

  it("trie par nom, ajoute une colonne Signature et des lignes libres, en paysage", () => {
    const f = feuilleEmargement(atelier, [
      { prenom: "Sophie", nom: "Allain", telephone: "0601", autorisationImage: true, paiement: "" },
      { prenom: "Laurie", nom: "Mbone", telephone: null, autorisationImage: false, paiement: "" },
      { prenom: "Cristina", nom: "canto", telephone: null, autorisationImage: null, paiement: "" },
    ]);
    expect(f.orientation).toBe("landscape");
    expect(f.cellules[0][0]?.value).toBe("Feuille d'émargement");
    expect(f.cellules[1][0]?.value).toBe("Journée Création Instagram");
    expect(f.cellules[2][0]?.value).toBe(atelier.sousTitre);
    expect(f.cellules[3][0]?.value).toBe("3 participantes validées · Le Cocooning Club");
    expect(valeurs(f.cellules[5])).toEqual(["N°", "Nom", "Prénom", "Téléphone", "Droit à l'image", "Signature"]);
    expect(valeurs(f.cellules[6])).toEqual([1, "ALLAIN", "Sophie", "0601", "Oui", ""]);
    expect(valeurs(f.cellules[7])).toEqual([2, "CANTO", "Cristina", "", "—", ""]);
    expect(valeurs(f.cellules[8])).toEqual([3, "MBONE", "Laurie", "", "Non", ""]);
    expect(f.cellules[8][4]).toMatchObject({ fontWeight: "bold", textColor: "#b42318" }); // « Non » bien visible
    const libres = f.cellules.slice(9, 9 + LIGNES_LIBRES);
    expect(libres.map(l => l[0]?.value)).toEqual([4, 5, 6, 7, 8]);
    expect(libres.every(l => l.slice(1).every(c => c?.value === ""))).toBe(true);
    expect(f.largeurs).toHaveLength(6);
  });

  it("ajoute la colonne Paiement seulement s'il y a quelque chose à régler", () => {
    const f = feuilleEmargement(atelier, [{ prenom: "A", nom: "B", telephone: null, autorisationImage: true, paiement: "À régler · 15 €" }]);
    expect(valeurs(f.cellules[5])).toEqual(["N°", "Nom", "Prénom", "Téléphone", "Droit à l'image", "Paiement", "Signature"]);
    expect(f.cellules[6][5]?.value).toBe("À régler · 15 €");
  });

  it("écrit la date, l'heure et le lieu, et nomme le fichier", () => {
    expect(sousTitreAtelier({ date_atelier: "2026-11-05", heure_debut: "10:00:00", heure_fin: "17:00:00", lieu: "La Picorette" }))
      .toBe("Jeudi 5 novembre 2026 · 10:00 – 17:00 · La Picorette");
    expect(sousTitreAtelier({ date_atelier: "2026-11-05", heure_debut: null, lieu: null })).toBe("Jeudi 5 novembre 2026");
    expect(nomFichierEmargement("Journée Création Instagram", "2026-11-05")).toBe("emargement-journee-creation-instagram-2026-11-05.xlsx");
  });
});
