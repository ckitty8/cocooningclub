// Les contrôles côté base (limite d'envois, validation des champs) lèvent des
// erreurs avec le code Postgres P0001 et un message en français destiné au
// public : on l'affiche tel quel. Toute autre erreur reste générique pour ne
// pas exposer de détails techniques.
export const messageErreurServeur = (error: { code?: string; message?: string } | null): string =>
  error?.code === "P0001" && error.message
    ? error.message
    : "Une erreur est survenue. Veuillez réessayer.";
