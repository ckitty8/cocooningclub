// Message WhatsApp des ateliers à venir (écran Ateliers, bouton « Message WhatsApp ») : nom, date, heure, lieu et
// lien d'inscription de chaque atelier publié qui a encore de la place, prêt à envoyer dans un groupe ou à une personne.
// Le lien est toujours celui du site en ligne (jamais celui de la preview ou de l'ordinateur).

export const SITE_PUBLIC = "https://www.lecocooningclub.fr";

export interface AtelierReseaux {
  id: string;
  titre: string;
  date_atelier: string;
  heure_debut: string | null;
  heure_fin?: string | null;
  lieu: string | null;
  statut: string;
}

/**
 * Ateliers à annoncer : date d'aujourd'hui ou plus tard, publiés (pas les complets : plus de place ; pas les
 * brouillons : leur lien ne marche pas pour le public) ; triés par date puis heure.
 */
export const ateliersPourReseaux = <A extends AtelierReseaux>(ateliers: A[], aujourdhui: string): A[] =>
  ateliers
    .filter(a => a.date_atelier >= aujourdhui && a.statut === "publie")
    .sort((a, b) => a.date_atelier.localeCompare(b.date_atelier) || (a.heure_debut ?? "").localeCompare(b.heure_debut ?? ""));

export const lienPublicInscription = (id: string) => `${SITE_PUBLIC}/inscription/${id}`;

/** « Jeudi 5 novembre 2026 » */
export const dateLongueReseaux = (iso: string) => {
  const t = new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** « 14h30 – 16h30 », « 14h30 », ou vide. */
export const heureReseaux = (debut: string | null, fin?: string | null) => {
  const h = (v: string) => v.slice(0, 5).replace(":", "h");
  return debut ? `${h(debut)}${fin ? ` – ${h(fin)}` : ""}` : "";
};

/**
 * Texte du message (mise en forme WhatsApp : *gras*) :
 *   ✨ *Nos prochains ateliers* ✨
 *
 *   *Papotages - Animal Totem*
 *   📅 Dimanche 6 décembre 2026 · 14h30 – 16h30
 *   📍 Le flamboyant
 *   👉 Inscription : https://www.lecocooningclub.fr/inscription/…
 */
export const messageWhatsApp = (ateliers: AtelierReseaux[]): string => {
  const blocs = ateliers.map(a => {
    const heure = heureReseaux(a.heure_debut, a.heure_fin);
    return [
      `*${a.titre.trim()}*`,
      `📅 ${dateLongueReseaux(a.date_atelier)}${heure ? ` · ${heure}` : ""}`,
      ...(a.lieu?.trim() ? [`📍 ${a.lieu.trim()}`] : []),
      `👉 Inscription : ${lienPublicInscription(a.id)}`,
    ].join("\n");
  });
  return [`✨ *Nos prochains ateliers* ✨`, ...blocs, "À très vite au Cocooning Club 💛"].join("\n\n");
};

/** Ouvre WhatsApp (application ou WhatsApp Web) avec le message prêt : on choisit ensuite le groupe ou la personne. */
export const lienWhatsAppMessage = (texte: string) => `https://wa.me/?text=${encodeURIComponent(texte)}`;
