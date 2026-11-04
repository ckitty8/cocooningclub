// Chiffres et export d'une fiche d'atelier (inscrites, paiement, présence).

export interface LigneInscrite {
  statut: string;
  statut_paiement: string;
  present: boolean | null;
}

export interface ResumeInscrites {
  total: number;
  confirmees: number;
  aTraiter: number;
  presentes: number;
  /** Montant attendu : inscrites confirmées × tarif. */
  attendu: number;
  /** Montant déjà encaissé : confirmées marquées payées × tarif. */
  encaisse: number;
}

export const resumeInscrites = (lignes: LigneInscrite[], tarif: number): ResumeInscrites => {
  const confirmees = lignes.filter(l => l.statut === "confirme");
  return {
    total: lignes.length,
    confirmees: confirmees.length,
    aTraiter: lignes.filter(l => l.statut === "en_attente").length,
    presentes: lignes.filter(l => l.present).length,
    attendu: confirmees.length * tarif,
    encaisse: confirmees.filter(l => l.statut_paiement === "paye").length * tarif,
  };
};
