// Niveaux d'accès des documents (Admin → Documents ; espace membre → Magazine et tableau de bord).
// La sécurité est dans la base (politiques RLS : un membre ne lit jamais un document « admins ») ;
// ces libellés et ce filtre servent à l'affichage.

export type AccesDocument = "admins" | "membres" | "tous";

/** Dans l'ordre d'affichage du menu « Accès ». */
export const ACCES_DOCUMENTS: readonly AccesDocument[] = ["admins", "membres", "tous"];

export const LIBELLES_ACCES: Record<AccesDocument, string> = {
  admins: "Administrateurs uniquement",
  membres: "Membres uniquement",
  tous: "Tous les utilisateurs (administrateurs + membres)",
};

export const AIDES_ACCES: Record<AccesDocument, string> = {
  admins: "Visible et téléchargeable uniquement par les administrateurs (ex. bulletin d'adhésion vierge).",
  membres: "Visible par les membres dans leur espace ; les administrateurs le gèrent depuis cet écran.",
  tous: "Visible par les membres et par les administrateurs.",
};

/** Accès qu'une personne voit dans l'espace membre : un membre ne voit jamais les documents « admins ». */
export const accesVisiblesDansEspaceMembre = (role: string | null | undefined): AccesDocument[] | null =>
  role === "membre" ? ["membres", "tous"] : null; // null : aucun filtre (administrateurs : tout)
