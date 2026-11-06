// Réponse par Gmail à un message du formulaire de contact (Admin → Formulaire de contact, 06/11).
// Le site n'envoie rien lui-même : il ouvre Gmail (messagerie du club) avec le brouillon prêt.

export interface MessageContact {
  prenom?: string | null;
  email?: string | null;
  message?: string | null;
  cree_le: string;
  reponses?: Record<string, string> | null;
}

/** Longueur maximale du message d'origine recopié (le lien Gmail doit rester court). */
const CITATION_MAX = 1500;

const champ = (reponses: Record<string, string> | null | undefined, motif: RegExp) =>
  Object.entries(reponses ?? {}).find(([cle]) => motif.test(cle))?.[1]?.trim() || "";

/** Adresse de la personne : colonne e-mail, sinon réponse « Email » / « E-mail » du formulaire. */
export const emailContact = (m: MessageContact): string =>
  (m.email?.trim() || champ(m.reponses, /^e-?mail$/i)).trim();

/** Prénom pour la formule d'appel. */
export const prenomContact = (m: MessageContact): string => m.prenom?.trim() || champ(m.reponses, /^pr[ée]nom$/i);

/** Texte du message reçu : colonne message, sinon réponse « Message ». */
const texteContact = (m: MessageContact): string => (m.message?.trim() || champ(m.reponses, /^message$/i));

const dateLongue = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
};

/** Brouillon de réponse : sujet, corps (formule d'appel, signature, message d'origine cité). */
export const brouillonReponse = (m: MessageContact): { sujet: string; corps: string } => {
  const prenom = prenomContact(m);
  const texte = texteContact(m);
  const cite = texte.length > CITATION_MAX ? `${texte.slice(0, CITATION_MAX)}…` : texte;
  const date = dateLongue(m.cree_le);
  return {
    sujet: "Votre message au Cocooning Club",
    corps: [
      `Bonjour${prenom ? ` ${prenom}` : ""},`,
      "",
      "",
      "",
      "Belle journée,",
      "L'équipe du Cocooning Club",
      ...(cite ? ["", `--- Votre message${date ? ` du ${date}` : ""} ---`, ...cite.split(/\r?\n/).map(l => `> ${l}`)] : []),
    ].join("\n"),
  };
};

/** Lien qui ouvre la fenêtre « Nouveau message » de Gmail, destinataire, sujet et corps remplis. */
export const lienGmailReponse = (m: MessageContact): string | null => {
  const email = emailContact(m);
  if (!email) return null;
  const { sujet, corps } = brouillonReponse(m);
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
};
