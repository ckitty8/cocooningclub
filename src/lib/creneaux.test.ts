import { describe, expect, it } from "vitest";
import {
  aDesCreneaux, creneauComplet, creneauxProposes, depuisSaisie, horairesCreneau, lireCreneaux, placesPrisesParCreneau,
  saisieCreneauxVide, tarifsAvecCreneau, verifierSaisie, versSaisie,
} from "./creneaux";

const atelier = {
  heure_debut: "10:00:00", duree: "7h",
  matin: "Shooting photo", apres_midi: "Montage de Reels",
  creneaux: { matin: { debut: "10:00", fin: "13:00", places: 2 }, apres_midi: { debut: "14:00", fin: "17:00" }, journee: { tarif: 40, tarif_adherent: 30 } },
};

describe("créneaux des ateliers Business", () => {
  it("liste les créneaux proposés dans l'ordre, avec horaires et programme", () => {
    const liste = creneauxProposes(atelier);
    expect(liste.map(c => c.cle)).toEqual(["matin", "apres_midi", "journee"]);
    expect(liste[0]).toMatchObject({ debut: "10:00", fin: "13:00", programme: "Shooting photo", tarif: null });
    // La journée va du début du matin à la fin de l'après-midi.
    expect(horairesCreneau(liste[2])).toBe("10:00 – 17:00");
    expect(liste[2].tarif).toBe(40);
  });

  it("seuls les créneaux cochés sont proposés ; un atelier sans créneau n'en propose aucun", () => {
    expect(creneauxProposes({ ...atelier, creneaux: { matin: {} } }).map(c => c.cle)).toEqual(["matin"]);
    expect(aDesCreneaux(null)).toBe(false);
    expect(aDesCreneaux("pas du json")).toBe(false);
    expect(aDesCreneaux({ journee: {} })).toBe(true);
    expect(lireCreneaux('{"matin":{"places":"8"}}').matin?.places).toBe(8);
  });

  it("compte les places : la journée prend une place le matin et une l'après-midi", () => {
    const pris = placesPrisesParCreneau(["matin", "journee", "apres_midi", null]);
    expect(pris).toEqual({ matin: 2, apres_midi: 2, journee: 1 });
    // Matin limité à 2 : complet ; après-midi illimité : jamais complet ; la journée est complète si le matin l'est.
    expect(creneauComplet("matin", atelier.creneaux, pris)).toBe(true);
    expect(creneauComplet("apres_midi", atelier.creneaux, pris)).toBe(false);
    expect(creneauComplet("journee", atelier.creneaux, pris)).toBe(true);
    expect(creneauComplet("journee", atelier.creneaux, { matin: 1, apres_midi: 9 })).toBe(false);
  });

  it("le prix d'un créneau est facultatif : sans prix, ce sont les tarifs de l'atelier", () => {
    const a = { ...atelier, tarif_standard: 0, tarif_adherent: null };
    expect(tarifsAvecCreneau(a, "matin")).toBe(a);
    expect(tarifsAvecCreneau(a, null)).toBe(a);
    expect(tarifsAvecCreneau(a, "journee")).toMatchObject({ tarif_standard: 40, tarif_adherent: 30 });
  });

  it("saisie du formulaire d'administration : aller-retour, vide = null, contrôles", () => {
    expect(depuisSaisie(saisieCreneauxVide())).toBeNull();
    const s = versSaisie(atelier.creneaux);
    expect(s.matin).toMatchObject({ actif: true, places: "2", tarif: "" });
    expect(depuisSaisie(s)).toEqual({
      matin: { debut: "10:00", fin: "13:00", places: 2, tarif: null, tarif_adherent: null },
      apres_midi: { debut: "14:00", fin: "17:00", places: null, tarif: null, tarif_adherent: null },
      journee: { tarif: 40, tarif_adherent: 30 },
    });
    expect(verifierSaisie(s)).toBeNull();
    expect(verifierSaisie({ ...s, matin: { ...s.matin, places: "0" } })).toMatch(/Matinée/);
    expect(verifierSaisie({ ...s, journee: { ...s.journee, tarif: "abc" } })).toMatch(/Journée entière/);
  });
});
