// Participantes aux ateliers SANS compte : les pré-inscriptions faites par le formulaire public (« invitées »)
// ne créent aucune fiche `utilisateurs`, elles n'apparaissent donc pas dans la liste des comptes de Membres.
// On les regroupe ici par personne (e-mail, à défaut prénom + nom) pour les montrer à part.

export interface PreInscriptionInvitee {
  utilisateur_id: string | null;
  prenom_invite: string | null;
  nom_invite: string | null;
  email_invite: string | null;
  telephone_invite: string | null;
  statut: string;
  inscrit_le: string;
  autorisation_image?: boolean | null;
  accord_whatsapp?: boolean | null;
  ateliers?: { titre: string | null; date_atelier: string | null } | null;
}

export interface Participante {
  cle: string;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  /** Pré-inscriptions de la personne (annulées comprises). */
  demandes: number;
  validees: number;
  /** Titre et date de l'atelier de la demande la plus récente. */
  dernierAtelier: { titre: string; date: string | null } | null;
  derniereDemande: string;
  /** Réponses du formulaire de la demande la plus récente (null = pas de réponse). */
  autorisationImage: boolean | null;
  accordWhatsapp: boolean | null;
}

const nettoyer = (v: string | null | undefined) => (v ?? "").trim();

/**
 * Regroupe les pré-inscriptions sans compte par personne, la plus récente d'abord.
 * Sont écartées : les demandes rattachées à un compte, celles dont l'e-mail correspond à un compte existant
 * (la personne est déjà dans la liste des comptes) et les demandes anonymisées (ni nom ni e-mail).
 */
export const regrouperParticipantes = (inscriptions: PreInscriptionInvitee[], emailsComptes: Iterable<string>): Participante[] => {
  const comptes = new Set(Array.from(emailsComptes, e => e.trim().toLowerCase()));
  const parCle = new Map<string, Participante>();
  const triees = [...inscriptions].sort((a, b) => b.inscrit_le.localeCompare(a.inscrit_le));
  for (const i of triees) {
    if (i.utilisateur_id) continue;
    const email = nettoyer(i.email_invite).toLowerCase();
    const prenom = nettoyer(i.prenom_invite);
    const nom = nettoyer(i.nom_invite);
    if (email && comptes.has(email)) continue;
    const cle = email || `${prenom} ${nom}`.trim().toLowerCase();
    if (!cle) continue;
    const existante = parCle.get(cle);
    if (existante) {
      existante.demandes += 1;
      if (i.statut === "confirme") existante.validees += 1;
      if (!existante.telephone && nettoyer(i.telephone_invite)) existante.telephone = nettoyer(i.telephone_invite);
      continue;
    }
    parCle.set(cle, {
      cle, prenom, nom,
      email: email || null,
      telephone: nettoyer(i.telephone_invite) || null,
      demandes: 1,
      validees: i.statut === "confirme" ? 1 : 0,
      dernierAtelier: i.ateliers?.titre ? { titre: i.ateliers.titre, date: i.ateliers.date_atelier ?? null } : null,
      derniereDemande: i.inscrit_le,
      autorisationImage: i.autorisation_image ?? null,
      accordWhatsapp: i.accord_whatsapp ?? null,
    });
  }
  return Array.from(parCle.values());
};
