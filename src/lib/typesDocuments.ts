// Types de documents (Admin → Documents → menu « Type » ; espace membre → Magazine).
// Le type ne décide pas de l'accès (c'est `documents.acces`, voir accesDocuments.ts) : il sert à classer et à étiqueter.

export type TypeDocument = "magazine" | "guide" | "lien_externe" | "interne" | "administratif" | "autre";

/** Dans l'ordre d'affichage du menu « Type ». */
export const TYPES_DOCUMENTS: readonly TypeDocument[] = ["magazine", "guide", "lien_externe", "interne", "administratif", "autre"];

/** Menu « Type » de l'administration. */
export const LIBELLES_TYPE_MENU: Record<TypeDocument, string> = {
  magazine: "Magazine",
  guide: "Guide",
  lien_externe: "Lien externe",
  interne: "Documents internes",
  administratif: "Documents administratifs",
  autre: "Autres",
};

/** Pastille d'un document, côté administration. */
export const LIBELLES_TYPE: Record<TypeDocument, string> = {
  ...LIBELLES_TYPE_MENU,
  interne: "Document interne",
  administratif: "Document administratif",
  autre: "Autre",
};

/** Pastille d'un document dans l'espace membre (un lien externe y est une « Ressource »). */
export const LIBELLES_TYPE_MEMBRE: Record<TypeDocument, string> = { ...LIBELLES_TYPE, lien_externe: "Ressource" };
