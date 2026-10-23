import { describe, expect, it } from "vitest";
import { enregistrerAffichage, lireAffichage } from "./affichageAteliers";

const faux = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe("affichage des ateliers", () => {
  it("affiche les cartes par défaut", () => expect(lireAffichage("a", faux())).toBe("cartes"));

  it("retient le choix de chaque administratrice séparément", () => {
    const s = faux();
    enregistrerAffichage("a", "liste", s);
    expect(lireAffichage("a", s)).toBe("liste");
    expect(lireAffichage("b", s)).toBe("cartes");
  });

  it("ignore une valeur inconnue et un stockage indisponible", () => {
    const s = faux();
    s.setItem("admin.ateliers.affichage.a", "n'importe quoi");
    expect(lireAffichage("a", s)).toBe("cartes");
    expect(lireAffichage("a", null)).toBe("cartes");
    expect(() => enregistrerAffichage("a", "liste", null)).not.toThrow();
  });
});
