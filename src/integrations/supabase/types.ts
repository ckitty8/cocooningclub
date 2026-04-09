export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      utilisateurs: {
        Row: {
          id: string
          email: string
          mot_de_passe_hash: string | null
          prenom: string
          nom: string
          telephone: string | null
          role: "administrateur" | "inscrit" | "membre_standard" | "membre_premium"
          url_avatar: string | null
          debut_abonnement: string | null
          fin_abonnement: string | null
          est_actif: boolean
          cree_le: string
          modifie_le: string
        }
        Insert: {
          id?: string
          email: string
          mot_de_passe_hash?: string | null
          prenom: string
          nom: string
          telephone?: string | null
          role?: "administrateur" | "inscrit" | "membre_standard" | "membre_premium"
          url_avatar?: string | null
          debut_abonnement?: string | null
          fin_abonnement?: string | null
          est_actif?: boolean
          cree_le?: string
          modifie_le?: string
        }
        Update: {
          id?: string
          email?: string
          mot_de_passe_hash?: string | null
          prenom?: string
          nom?: string
          telephone?: string | null
          role?: "administrateur" | "inscrit" | "membre_standard" | "membre_premium"
          url_avatar?: string | null
          debut_abonnement?: string | null
          fin_abonnement?: string | null
          est_actif?: boolean
          cree_le?: string
          modifie_le?: string
        }
        Relationships: []
      }
      formateurs: {
        Row: {
          id: string
          prenom: string
          nom: string
          email: string | null
          telephone: string | null
          bio: string | null
          specialites: string | null
          url_photo: string | null
          est_externe: boolean
          utilisateur_id: string | null
          est_actif: boolean
          cree_le: string
          modifie_le: string
        }
        Insert: {
          id?: string
          prenom: string
          nom: string
          email?: string | null
          telephone?: string | null
          bio?: string | null
          specialites?: string | null
          url_photo?: string | null
          est_externe?: boolean
          utilisateur_id?: string | null
          est_actif?: boolean
          cree_le?: string
          modifie_le?: string
        }
        Update: {
          id?: string
          prenom?: string
          nom?: string
          email?: string | null
          telephone?: string | null
          bio?: string | null
          specialites?: string | null
          url_photo?: string | null
          est_externe?: boolean
          utilisateur_id?: string | null
          est_actif?: boolean
          cree_le?: string
          modifie_le?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          nom: string
          description: string | null
          slug: string
          url_icone: string | null
          ordre_affichage: number
          cree_le: string
        }
        Insert: {
          id?: string
          nom: string
          description?: string | null
          slug: string
          url_icone?: string | null
          ordre_affichage?: number
          cree_le?: string
        }
        Update: {
          id?: string
          nom?: string
          description?: string | null
          slug?: string
          url_icone?: string | null
          ordre_affichage?: number
          cree_le?: string
        }
        Relationships: []
      }
      ateliers: {
        Row: {
          id: string
          categorie_id: string
          formateur_id: string | null
          titre: string
          description: string | null
          description_courte: string | null
          niveau: "debutant" | "intermediaire" | "avance"
          lieu: string | null
          url_image: string | null
          date_atelier: string
          heure_debut: string
          duree: string
          places_max: number
          places_disponibles: number
          tarif_standard: number
          tarif_premium: number
          tarif_affichage: string | null
          lien_paypal: string | null
          statut: "brouillon" | "publie" | "complet" | "annule" | "termine"
          modele_id: string | null
          recurrence: "hebdomadaire" | "bimensuel" | "mensuel" | null
          cree_le: string
          modifie_le: string
        }
        Insert: {
          id?: string
          categorie_id: string
          formateur_id?: string | null
          titre: string
          description?: string | null
          description_courte?: string | null
          niveau?: "debutant" | "intermediaire" | "avance"
          lieu?: string | null
          url_image?: string | null
          date_atelier: string
          heure_debut: string
          duree?: string
          places_max?: number
          places_disponibles?: number
          tarif_standard?: number
          tarif_premium?: number
          tarif_affichage?: string | null
          lien_paypal?: string | null
          statut?: "brouillon" | "publie" | "complet" | "annule" | "termine"
          modele_id?: string | null
          recurrence?: "hebdomadaire" | "bimensuel" | "mensuel" | null
          cree_le?: string
          modifie_le?: string
        }
        Update: {
          id?: string
          categorie_id?: string
          formateur_id?: string | null
          titre?: string
          description?: string | null
          description_courte?: string | null
          niveau?: "debutant" | "intermediaire" | "avance"
          lieu?: string | null
          url_image?: string | null
          date_atelier?: string
          heure_debut?: string
          duree?: string
          places_max?: number
          places_disponibles?: number
          tarif_standard?: number
          tarif_premium?: number
          tarif_affichage?: string | null
          lien_paypal?: string | null
          statut?: "brouillon" | "publie" | "complet" | "annule" | "termine"
          modele_id?: string | null
          recurrence?: "hebdomadaire" | "bimensuel" | "mensuel" | null
          cree_le?: string
          modifie_le?: string
        }
        Relationships: [
          {
            foreignKeyName: "ateliers_categorie_id_fkey"
            columns: ["categorie_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      inscriptions: {
        Row: {
          id: string
          atelier_id: string
          utilisateur_id: string | null
          nom_invite: string | null
          prenom_invite: string | null
          email_invite: string | null
          date_naissance: string | null
          statut: "en_attente" | "confirme" | "annule"
          statut_paiement: "en_attente" | "paye" | "non_requis"
          present: boolean
          inscrit_le: string
          annule_le: string | null
        }
        Insert: {
          id?: string
          atelier_id: string
          utilisateur_id?: string | null
          nom_invite?: string | null
          prenom_invite?: string | null
          email_invite?: string | null
          date_naissance?: string | null
          statut?: "en_attente" | "confirme" | "annule"
          statut_paiement?: "en_attente" | "paye" | "non_requis"
          present?: boolean
          inscrit_le?: string
          annule_le?: string | null
        }
        Update: {
          id?: string
          atelier_id?: string
          utilisateur_id?: string | null
          nom_invite?: string | null
          prenom_invite?: string | null
          email_invite?: string | null
          date_naissance?: string | null
          statut?: "en_attente" | "confirme" | "annule"
          statut_paiement?: "en_attente" | "paye" | "non_requis"
          present?: boolean
          inscrit_le?: string
          annule_le?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inscriptions_atelier_id_fkey"
            columns: ["atelier_id"]
            isOneToOne: false
            referencedRelation: "ateliers"
            referencedColumns: ["id"]
          }
        ]
      }
      avis: {
        Row: {
          id: string
          utilisateur_id: string
          inscription_id: string
          note: number
          commentaire: string | null
          moderation: "en_attente" | "approuve" | "rejete"
          mis_en_avant: boolean
          cree_le: string
          modere_le: string | null
        }
        Insert: {
          id?: string
          utilisateur_id: string
          inscription_id: string
          note: number
          commentaire?: string | null
          moderation?: "en_attente" | "approuve" | "rejete"
          mis_en_avant?: boolean
          cree_le?: string
          modere_le?: string | null
        }
        Update: {
          id?: string
          utilisateur_id?: string
          inscription_id?: string
          note?: number
          commentaire?: string | null
          moderation?: "en_attente" | "approuve" | "rejete"
          mis_en_avant?: boolean
          cree_le?: string
          modere_le?: string | null
        }
        Relationships: []
      }
      transactions_paypal: {
        Row: {
          id: string
          inscription_id: string
          paypal_transaction_id: string
          montant: number
          devise: string
          email_payeur: string | null
          statut: "en_attente" | "complete" | "rembourse" | "echoue"
          donnees_brutes: Record<string, unknown> | null
          paypal_cree_le: string | null
          enregistre_le: string
        }
        Insert: {
          id?: string
          inscription_id: string
          paypal_transaction_id: string
          montant: number
          devise?: string
          email_payeur?: string | null
          statut?: "en_attente" | "complete" | "rembourse" | "echoue"
          donnees_brutes?: Record<string, unknown> | null
          paypal_cree_le?: string | null
          enregistre_le?: string
        }
        Update: {
          id?: string
          inscription_id?: string
          paypal_transaction_id?: string
          montant?: number
          devise?: string
          email_payeur?: string | null
          statut?: "en_attente" | "complete" | "rembourse" | "echoue"
          donnees_brutes?: Record<string, unknown> | null
          paypal_cree_le?: string | null
          enregistre_le?: string
        }
        Relationships: []
      }
      logs: {
        Row: {
          id: string
          utilisateur_id: string | null
          action: string
          table_cible: string | null
          enregistrement_cible_id: string | null
          details: Record<string, unknown> | null
          adresse_ip: string | null
          user_agent: string | null
          horodatage: string
        }
        Insert: {
          id?: string
          utilisateur_id?: string | null
          action: string
          table_cible?: string | null
          enregistrement_cible_id?: string | null
          details?: Record<string, unknown> | null
          adresse_ip?: string | null
          user_agent?: string | null
          horodatage?: string
        }
        Update: {
          id?: string
          utilisateur_id?: string | null
          action?: string
          table_cible?: string | null
          enregistrement_cible_id?: string | null
          details?: Record<string, unknown> | null
          adresse_ip?: string | null
          user_agent?: string | null
          horodatage?: string
        }
        Relationships: []
      }
    }
    Views: {
      vue_prochains_ateliers: {
        Row: {
          id: string | null
          titre: string | null
          description_courte: string | null
          categorie: string | null
          lieu: string | null
          date_atelier: string | null
          heure_debut: string | null
          places_disponibles: number | null
          places_max: number | null
          tarif_affichage: string | null
          statut: string | null
        }
        Relationships: []
      }
      vue_avis_publies: {
        Row: {
          avis_id: string | null
          note: number | null
          commentaire: string | null
          mis_en_avant: boolean | null
          cree_le: string | null
          prenom: string | null
          atelier_titre: string | null
          categorie: string | null
        }
        Relationships: []
      }
      vue_suivi_inscriptions: {
        Row: {
          prenom: string | null
          nom: string | null
          email: string | null
          atelier_titre: string | null
          date_atelier: string | null
          statut_inscription: string | null
          statut_paiement: string | null
          present: boolean | null
          inscrit_le: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
