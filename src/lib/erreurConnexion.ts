// Message affiché quand la connexion échoue : on distingue « adresse non confirmée » (le plus fréquent pour un
// compte créé par l'équipe) d'un vrai mauvais mot de passe, au lieu de tout appeler « incorrect ».

interface ErreurAuth {
  code?: string;
  message?: string;
  status?: number;
}

export const messageErreurConnexion = (erreur: ErreurAuth | null | undefined): string => {
  const code = erreur?.code ?? "";
  const message = (erreur?.message ?? "").toLowerCase();
  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return "Ton adresse e-mail n'est pas encore confirmée : clique sur le lien « Confirmer mon compte » reçu par e-mail, puis reconnecte-toi.";
  }
  if (code === "over_request_rate_limit" || erreur?.status === 429 || message.includes("rate limit")) {
    return "Trop de tentatives. Patiente quelques minutes avant de réessayer.";
  }
  if (code === "user_banned") return "Ce compte est désactivé. Contacte l'administrateur.";
  return "Email ou mot de passe incorrect.";
};
