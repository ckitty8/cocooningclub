import { describe, expect, it } from "vitest";
import { ACCES_DOCUMENTS, LIBELLES_ACCES, accesVisiblesDansEspaceMembre } from "./accesDocuments";

describe("accès des documents", () => {
  it("propose les trois niveaux, administrateurs en premier", () => {
    expect(ACCES_DOCUMENTS).toEqual(["admins", "membres", "tous"]);
    expect(LIBELLES_ACCES.tous).toBe("Tous les utilisateurs (administrateurs + membres)");
  });
  it("un membre ne voit jamais les documents réservés aux administrateurs", () => {
    expect(accesVisiblesDansEspaceMembre("membre")).toEqual(["membres", "tous"]);
    expect(accesVisiblesDansEspaceMembre("membre")).not.toContain("admins");
  });
  it("une administratrice voit tout (pas de filtre), y compris pendant la simulation d'un autre rôle ailleurs", () => {
    expect(accesVisiblesDansEspaceMembre("administrateur")).toBeNull();
    expect(accesVisiblesDansEspaceMembre("createur")).toBeNull();
    expect(accesVisiblesDansEspaceMembre(undefined)).toBeNull();
  });
});
