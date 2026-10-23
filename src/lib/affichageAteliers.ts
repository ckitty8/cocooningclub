// Préférence d'affichage de la liste des ateliers (admin), propre à chaque
// administratrice. Stockée dans le navigateur, sans aucune donnée en base.

export type AffichageAteliers = "cartes" | "liste";

type Stockage = Pick<Storage, "getItem" | "setItem">;

const cle = (utilisateurId: string) => `admin.ateliers.affichage.${utilisateurId}`;

const stockageNavigateur = (): Stockage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/** Affichage choisi par cette personne ; « cartes » par défaut. */
export const lireAffichage = (utilisateurId: string, stockage: Stockage | null = stockageNavigateur()): AffichageAteliers => {
  try {
    return stockage?.getItem(cle(utilisateurId)) === "liste" ? "liste" : "cartes";
  } catch {
    return "cartes";
  }
};

export const enregistrerAffichage = (
  utilisateurId: string,
  affichage: AffichageAteliers,
  stockage: Stockage | null = stockageNavigateur(),
) => {
  try {
    stockage?.setItem(cle(utilisateurId), affichage);
  } catch {
    // Stockage indisponible (navigation privée) : le choix vaut pour la session seulement.
  }
};
