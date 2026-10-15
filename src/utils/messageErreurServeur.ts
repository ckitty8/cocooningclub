// Codes Postgres des erreurs « métier » rédigées en français pour le public,
// affichées telles quelles :
//   - P0001 : RAISE EXCEPTION des triggers de validation / limite d'envois ;
//   - 22023 : inscriptions closes (trigger bloquer_inscription_tardive).
// Toute autre erreur reste générique pour ne pas exposer de détails techniques.
const CODES_MESSAGE_PUBLIC = ["P0001", "22023"];

export const messageErreurServeur = (error: { code?: string; message?: string } | null): string =>
  error?.message && error.code && CODES_MESSAGE_PUBLIC.includes(error.code)
    ? error.message
    : "Une erreur est survenue. Veuillez réessayer.";
