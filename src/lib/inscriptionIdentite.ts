// Identité affichée aux administrateurs pour une pré-inscription.
//
// Visiteur : l'identité est saisie dans les champs « invité ». Membre connecté :
// ces champs sont vides (la base les refuse), et on retombe sur la fiche du
// compte liée par utilisateur_id.

export interface FicheCompte {
  prenom: string | null;
  nom: string | null;
  email: string | null;
  telephone: string | null;
}

export interface InscriptionIdentifiable {
  prenom_invite: string | null;
  nom_invite: string | null;
  email_invite: string | null;
  telephone_invite: string | null;
  date_naissance: string | null;
  utilisateurs?: FicheCompte | null;
}

export const inscIdentite = (insc: InscriptionIdentifiable) => ({
  prenom: insc.prenom_invite ?? insc.utilisateurs?.prenom ?? "",
  nom: insc.nom_invite ?? insc.utilisateurs?.nom ?? "",
  email: insc.email_invite ?? insc.utilisateurs?.email ?? null,
  telephone: insc.telephone_invite ?? insc.utilisateurs?.telephone ?? null,
  // Date saisie pour l'atelier uniquement : les comptes ne la conservent plus.
  dateNaissance: insc.date_naissance,
});
