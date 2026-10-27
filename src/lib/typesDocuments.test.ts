import { describe, expect, it } from "vitest";
import { LIBELLES_TYPE, LIBELLES_TYPE_MEMBRE, LIBELLES_TYPE_MENU, TYPES_DOCUMENTS } from "./typesDocuments";

describe("types de documents", () => {
  it("propose les six types dans l'ordre, chacun avec un libellé", () => {
    expect(TYPES_DOCUMENTS).toEqual(["magazine", "guide", "lien_externe", "interne", "administratif", "autre"]);
    for (const t of TYPES_DOCUMENTS) {
      expect(LIBELLES_TYPE_MENU[t]).toBeTruthy();
      expect(LIBELLES_TYPE[t]).toBeTruthy();
      expect(LIBELLES_TYPE_MEMBRE[t]).toBeTruthy();
    }
  });

  it("nomme les nouveaux types comme demandé dans le menu", () => {
    expect(LIBELLES_TYPE_MENU.interne).toBe("Documents internes");
    expect(LIBELLES_TYPE_MENU.administratif).toBe("Documents administratifs");
    expect(LIBELLES_TYPE_MENU.autre).toBe("Autres");
  });

  it("garde « Ressource » pour un lien externe côté membre seulement", () => {
    expect(LIBELLES_TYPE_MEMBRE.lien_externe).toBe("Ressource");
    expect(LIBELLES_TYPE.lien_externe).toBe("Lien externe");
  });
});
