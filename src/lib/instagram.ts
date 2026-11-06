// Compte Instagram facultatif saisi dans le formulaire de pré-inscription (06/11).
// La personne peut taper « @moncompte », « moncompte » ou coller le lien de son profil : on garde « @moncompte ».

/** Règles d'Instagram : 1 à 30 caractères, lettres, chiffres, points et tirets bas. */
const IDENTIFIANT = /^[A-Za-z0-9._]{1,30}$/;

/** « https://www.instagram.com/mon.compte/?hl=fr » ou « @Mon.Compte » → « mon.compte » (sans @) ; texte tel quel s'il n'est pas reconnu. */
const extraire = (saisie: string): string => {
  const v = saisie.trim();
  const lien = v.match(/^(?:https?:\/\/)?(?:www\.|m\.)?(?:instagram\.com|instagr\.am)\/([^/?#\s]+)/i);
  return (lien ? lien[1] : v).replace(/^@+/, "").trim();
};

/** Saisie vide ou identifiant valide. */
export const instagramValide = (saisie: string | null | undefined): boolean => {
  const v = (saisie ?? "").trim();
  return v === "" || IDENTIFIANT.test(extraire(v));
};

/** Valeur enregistrée : « @moncompte » (en minuscules, comme Instagram), ou null si rien n'est saisi ou si c'est illisible. */
export const normaliserInstagram = (saisie: string | null | undefined): string | null => {
  const v = (saisie ?? "").trim();
  if (!v) return null;
  const id = extraire(v);
  return IDENTIFIANT.test(id) ? `@${id.toLowerCase()}` : null;
};

/** Lien du profil pour l'administration (« @moncompte » → https://www.instagram.com/moncompte/). */
export const lienInstagram = (compte: string | null | undefined): string | null => {
  const n = normaliserInstagram(compte);
  return n ? `https://www.instagram.com/${n.slice(1)}/` : null;
};
