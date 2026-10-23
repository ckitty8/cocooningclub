import { describe, expect, it } from "vitest";
import {
  ACCES,
  COLONNES_MATRICE,
  MATRICE,
  ORDRE_ROLES,
  ROLES,
  estRoleSimulable,
  pageAccueilDuRole,
  roleEffectif,
  roleReelDe,
} from "./roles";

describe("rôle d'un compte", () => {
  it("fait du compte marqué est_createur un créateur", () => {
    expect(roleReelDe({ role: "administrateur", est_createur: true })).toBe("createur");
  });

  it("garde le rôle de la base pour les autres, même si la colonne manque", () => {
    expect(roleReelDe({ role: "administrateur", est_createur: false })).toBe("administrateur");
    expect(roleReelDe({ role: "membre" })).toBe("membre");
  });
});

describe("simulation", () => {
  it("ne s'applique qu'au créateur", () => {
    expect(roleEffectif("createur", "membre")).toBe("membre");
    expect(roleEffectif("administrateur", "membre")).toBe("administrateur");
    expect(roleEffectif("membre", "administrateur")).toBe("membre");
  });

  it("revient au rôle réel sans simulation", () => {
    expect(roleEffectif("createur", null)).toBe("createur");
    expect(roleEffectif(null, "membre")).toBeNull();
  });

  it("n'accepte pas de simuler le créateur ni un rôle inconnu", () => {
    expect(estRoleSimulable("membre_premium")).toBe(true);
    expect(estRoleSimulable("createur")).toBe(false);
    expect(estRoleSimulable("root")).toBe(false);
    expect(estRoleSimulable(null)).toBe(false);
  });

  it("envoie les rôles d'équipe vers l'administration, les autres vers l'espace membre", () => {
    expect(pageAccueilDuRole("createur")).toBe("/admin/dashboard");
    expect(pageAccueilDuRole("administrateur")).toBe("/admin/dashboard");
    expect(pageAccueilDuRole("membre")).toBe("/espace-membre");
    expect(pageAccueilDuRole(null)).toBe("/espace-membre");
  });
});

describe("accès par zone", () => {
  it("réserve les outils du créateur au créateur", () => {
    expect(ACCES.createur).toEqual(["createur"]);
  });

  it("donne au créateur tous les accès de l'administrateur", () => {
    for (const zone of Object.values(ACCES) as readonly (readonly string[])[]) {
      if (zone.includes("administrateur")) expect(zone).toContain("createur");
    }
  });
});

describe("matrice des rôles", () => {
  const lignes = MATRICE.flatMap(section => section.lignes);

  it("décrit chaque rôle", () => {
    for (const role of ORDRE_ROLES) expect(ROLES[role].libelle).toBeTruthy();
  });

  it("n'utilise que des colonnes connues", () => {
    for (const ligne of lignes) {
      for (const colonne of ligne.acces) expect(COLONNES_MATRICE).toContain(colonne);
    }
  });

  it("ne donne jamais moins de droits au créateur qu'à l'administrateur", () => {
    for (const ligne of lignes) {
      if (ligne.acces.includes("administrateur")) expect(ligne.acces, ligne.libelle).toContain("createur");
    }
  });

  it("ne laisse entrer un visiteur que dans le site public", () => {
    for (const section of MATRICE) {
      const visiteurAutorise = section.lignes.some(l => l.acces.includes("visiteur"));
      expect(visiteurAutorise, section.titre).toBe(section.titre === "Site public");
    }
  });

  it("ne permet à personne d'attribuer le statut de créateur depuis le site", () => {
    const ligne = lignes.find(l => l.libelle.startsWith("Attribuer ou retirer le statut de créateur"));
    expect(ligne?.acces).toEqual([]);
  });
});
