export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      antennes: {
        Row: {
          cree_le: string
          description: string | null
          id: string
          nom: string
          ordre_affichage: number
          slug: string
          url_icone: string | null
        }
        Insert: {
          cree_le?: string
          description?: string | null
          id?: string
          nom: string
          ordre_affichage?: number
          slug: string
          url_icone?: string | null
        }
        Update: {
          cree_le?: string
          description?: string | null
          id?: string
          nom?: string
          ordre_affichage?: number
          slug?: string
          url_icone?: string | null
        }
        Relationships: []
      }
      ateliers: {
        Row: {
          antenne_id: string
          cree_le: string
          date_atelier: string
          date_fin_inscription: string | null
          description: string | null
          description_courte: string | null
          duree: string
          formateur_id: string | null
          heure_debut: string
          id: string
          lien_paypal: string | null
          lieu: string | null
          modele_id: string | null
          modifie_le: string
          niveau: Database["public"]["Enums"]["niveau_atelier"]
          places_disponibles: number
          places_max: number
          recurrence: Database["public"]["Enums"]["type_recurrence"] | null
          statut: Database["public"]["Enums"]["statut_atelier"]
          tarif_admin: number | null
          tarif_affichage: string | null
          tarif_standard: number
          titre: string
          url_image: string | null
        }
        Insert: {
          antenne_id: string
          cree_le?: string
          date_atelier: string
          date_fin_inscription?: string | null
          description?: string | null
          description_courte?: string | null
          duree?: string
          formateur_id?: string | null
          heure_debut: string
          id?: string
          lien_paypal?: string | null
          lieu?: string | null
          modele_id?: string | null
          modifie_le?: string
          niveau?: Database["public"]["Enums"]["niveau_atelier"]
          places_disponibles?: number
          places_max?: number
          recurrence?: Database["public"]["Enums"]["type_recurrence"] | null
          statut?: Database["public"]["Enums"]["statut_atelier"]
          tarif_admin?: number | null
          tarif_affichage?: string | null
          tarif_standard?: number
          titre: string
          url_image?: string | null
        }
        Update: {
          antenne_id?: string
          cree_le?: string
          date_atelier?: string
          date_fin_inscription?: string | null
          description?: string | null
          description_courte?: string | null
          duree?: string
          formateur_id?: string | null
          heure_debut?: string
          id?: string
          lien_paypal?: string | null
          lieu?: string | null
          modele_id?: string | null
          modifie_le?: string
          niveau?: Database["public"]["Enums"]["niveau_atelier"]
          places_disponibles?: number
          places_max?: number
          recurrence?: Database["public"]["Enums"]["type_recurrence"] | null
          statut?: Database["public"]["Enums"]["statut_atelier"]
          tarif_admin?: number | null
          tarif_affichage?: string | null
          tarif_standard?: number
          titre?: string
          url_image?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ateliers_antenne_id_fkey"
            columns: ["antenne_id"]
            isOneToOne: false
            referencedRelation: "antennes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ateliers_formateur_id_fkey"
            columns: ["formateur_id"]
            isOneToOne: false
            referencedRelation: "formateurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ateliers_modele_id_fkey"
            columns: ["modele_id"]
            isOneToOne: false
            referencedRelation: "ateliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ateliers_modele_id_fkey"
            columns: ["modele_id"]
            isOneToOne: false
            referencedRelation: "vue_prochains_ateliers"
            referencedColumns: ["id"]
          },
        ]
      }
      avis: {
        Row: {
          commentaire: string | null
          cree_le: string
          id: string
          inscription_id: string | null
          mis_en_avant: boolean
          moderation: Database["public"]["Enums"]["statut_moderation"]
          modere_le: string | null
          nom_auteur: string | null
          note: number
          utilisateur_id: string | null
        }
        Insert: {
          commentaire?: string | null
          cree_le?: string
          id?: string
          inscription_id?: string | null
          mis_en_avant?: boolean
          moderation?: Database["public"]["Enums"]["statut_moderation"]
          modere_le?: string | null
          nom_auteur?: string | null
          note: number
          utilisateur_id?: string | null
        }
        Update: {
          commentaire?: string | null
          cree_le?: string
          id?: string
          inscription_id?: string | null
          mis_en_avant?: boolean
          moderation?: Database["public"]["Enums"]["statut_moderation"]
          modere_le?: string | null
          nom_auteur?: string | null
          note?: number
          utilisateur_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avis_inscription_id_fkey"
            columns: ["inscription_id"]
            isOneToOne: false
            referencedRelation: "inscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avis_utilisateur_id_fkey"
            columns: ["utilisateur_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          cree_le: string
          email: string | null
          id: string
          lu: boolean
          reponses: Json | null
          telephone: string | null
        }
        Insert: {
          cree_le?: string
          email?: string | null
          id?: string
          lu?: boolean
          reponses?: Json | null
          telephone?: string | null
        }
        Update: {
          cree_le?: string
          email?: string | null
          id?: string
          lu?: boolean
          reponses?: Json | null
          telephone?: string | null
        }
        Relationships: []
      }
      disponibilites: {
        Row: {
          cree_le: string
          heure_debut: string
          heure_fin: string
          id: string
          jour_semaine: number
          utilisateur_id: string
        }
        Insert: {
          cree_le?: string
          heure_debut: string
          heure_fin: string
          id?: string
          jour_semaine: number
          utilisateur_id: string
        }
        Update: {
          cree_le?: string
          heure_debut?: string
          heure_fin?: string
          id?: string
          jour_semaine?: number
          utilisateur_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disponibilites_utilisateur_id_fkey"
            columns: ["utilisateur_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          acces: Database["public"]["Enums"]["acces_document"]
          created_at: string
          description: string | null
          fichier_chemin: string | null
          fichier_url: string | null
          id: string
          lien_externe: string | null
          modifie_le: string
          titre: string
          type: Database["public"]["Enums"]["type_document"]
          url_image: string | null
        }
        Insert: {
          acces?: Database["public"]["Enums"]["acces_document"]
          created_at?: string
          description?: string | null
          fichier_chemin?: string | null
          fichier_url?: string | null
          id?: string
          lien_externe?: string | null
          modifie_le?: string
          titre: string
          type?: Database["public"]["Enums"]["type_document"]
          url_image?: string | null
        }
        Update: {
          acces?: Database["public"]["Enums"]["acces_document"]
          created_at?: string
          description?: string | null
          fichier_chemin?: string | null
          fichier_url?: string | null
          id?: string
          lien_externe?: string | null
          modifie_le?: string
          titre?: string
          type?: Database["public"]["Enums"]["type_document"]
          url_image?: string | null
        }
        Relationships: []
      }
      form_fields: {
        Row: {
          cree_le: string
          deletable: boolean
          field_type: string
          formulaire_id: string
          id: string
          label: string
          obligatoire: boolean
          options: string[] | null
          position: number
        }
        Insert: {
          cree_le?: string
          deletable?: boolean
          field_type: string
          formulaire_id: string
          id?: string
          label: string
          obligatoire?: boolean
          options?: string[] | null
          position?: number
        }
        Update: {
          cree_le?: string
          deletable?: boolean
          field_type?: string
          formulaire_id?: string
          id?: string
          label?: string
          obligatoire?: boolean
          options?: string[] | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_formulaire_id_fkey"
            columns: ["formulaire_id"]
            isOneToOne: false
            referencedRelation: "formulaires"
            referencedColumns: ["id"]
          },
        ]
      }
      formateurs: {
        Row: {
          bio: string | null
          cree_le: string
          email: string | null
          est_actif: boolean
          est_externe: boolean
          id: string
          modifie_le: string
          nom: string
          prenom: string
          specialites: string | null
          telephone: string | null
          url_photo: string | null
          utilisateur_id: string | null
        }
        Insert: {
          bio?: string | null
          cree_le?: string
          email?: string | null
          est_actif?: boolean
          est_externe?: boolean
          id?: string
          modifie_le?: string
          nom: string
          prenom: string
          specialites?: string | null
          telephone?: string | null
          url_photo?: string | null
          utilisateur_id?: string | null
        }
        Update: {
          bio?: string | null
          cree_le?: string
          email?: string | null
          est_actif?: boolean
          est_externe?: boolean
          id?: string
          modifie_le?: string
          nom?: string
          prenom?: string
          specialites?: string | null
          telephone?: string | null
          url_photo?: string | null
          utilisateur_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "formateurs_utilisateur_id_fkey"
            columns: ["utilisateur_id"]
            isOneToOne: true
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      formulaires: {
        Row: {
          cree_le: string
          description: string | null
          est_actif: boolean
          id: string
          modifie_le: string
          nom: string
        }
        Insert: {
          cree_le?: string
          description?: string | null
          est_actif?: boolean
          id?: string
          modifie_le?: string
          nom: string
        }
        Update: {
          cree_le?: string
          description?: string | null
          est_actif?: boolean
          id?: string
          modifie_le?: string
          nom?: string
        }
        Relationships: []
      }
      idee_reactions: {
        Row: {
          cree_le: string
          id: string
          idee_id: string
          reaction: Database["public"]["Enums"]["reaction_idee"]
          utilisateur_id: string
        }
        Insert: {
          cree_le?: string
          id?: string
          idee_id: string
          reaction: Database["public"]["Enums"]["reaction_idee"]
          utilisateur_id: string
        }
        Update: {
          cree_le?: string
          id?: string
          idee_id?: string
          reaction?: Database["public"]["Enums"]["reaction_idee"]
          utilisateur_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idee_reactions_idee_id_fkey"
            columns: ["idee_id"]
            isOneToOne: false
            referencedRelation: "idees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idee_reactions_utilisateur_id_fkey"
            columns: ["utilisateur_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      idees: {
        Row: {
          categorie: Database["public"]["Enums"]["categorie_idee"]
          cree_le: string
          description: string | null
          id: string
          modifie_le: string
          titre: string
          utilisateur_id: string
        }
        Insert: {
          categorie?: Database["public"]["Enums"]["categorie_idee"]
          cree_le?: string
          description?: string | null
          id?: string
          modifie_le?: string
          titre: string
          utilisateur_id: string
        }
        Update: {
          categorie?: Database["public"]["Enums"]["categorie_idee"]
          cree_le?: string
          description?: string | null
          id?: string
          modifie_le?: string
          titre?: string
          utilisateur_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idees_utilisateur_id_fkey"
            columns: ["utilisateur_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      indisponibilites: {
        Row: {
          cree_le: string
          date_debut: string
          date_fin: string
          id: string
          motif: string | null
          utilisateur_id: string
        }
        Insert: {
          cree_le?: string
          date_debut: string
          date_fin: string
          id?: string
          motif?: string | null
          utilisateur_id: string
        }
        Update: {
          cree_le?: string
          date_debut?: string
          date_fin?: string
          id?: string
          motif?: string | null
          utilisateur_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "indisponibilites_utilisateur_id_fkey"
            columns: ["utilisateur_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      inscriptions: {
        Row: {
          annule_le: string | null
          atelier_id: string
          date_naissance: string | null
          email_invite: string | null
          id: string
          inscrit_le: string
          nom_invite: string | null
          prenom_invite: string | null
          present: boolean
          statut: Database["public"]["Enums"]["statut_inscription"]
          statut_paiement: Database["public"]["Enums"]["statut_paiement"]
          telephone_invite: string | null
          utilisateur_id: string | null
        }
        Insert: {
          annule_le?: string | null
          atelier_id: string
          date_naissance?: string | null
          email_invite?: string | null
          id?: string
          inscrit_le?: string
          nom_invite?: string | null
          prenom_invite?: string | null
          present?: boolean
          statut?: Database["public"]["Enums"]["statut_inscription"]
          statut_paiement?: Database["public"]["Enums"]["statut_paiement"]
          telephone_invite?: string | null
          utilisateur_id?: string | null
        }
        Update: {
          annule_le?: string | null
          atelier_id?: string
          date_naissance?: string | null
          email_invite?: string | null
          id?: string
          inscrit_le?: string
          nom_invite?: string | null
          prenom_invite?: string | null
          present?: boolean
          statut?: Database["public"]["Enums"]["statut_inscription"]
          statut_paiement?: Database["public"]["Enums"]["statut_paiement"]
          telephone_invite?: string | null
          utilisateur_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inscriptions_atelier_id_fkey"
            columns: ["atelier_id"]
            isOneToOne: false
            referencedRelation: "ateliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscriptions_atelier_id_fkey"
            columns: ["atelier_id"]
            isOneToOne: false
            referencedRelation: "vue_prochains_ateliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscriptions_utilisateur_id_fkey"
            columns: ["utilisateur_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      inscriptions_backup_20260430: {
        Row: {
          annule_le: string | null
          atelier_id: string | null
          date_naissance: string | null
          email_invite: string | null
          id: string | null
          inscrit_le: string | null
          nom_invite: string | null
          prenom_invite: string | null
          present: boolean | null
          statut: Database["public"]["Enums"]["statut_inscription"] | null
          statut_paiement: Database["public"]["Enums"]["statut_paiement"] | null
          telephone_invite: string | null
          utilisateur_id: string | null
        }
        Insert: {
          annule_le?: string | null
          atelier_id?: string | null
          date_naissance?: string | null
          email_invite?: string | null
          id?: string | null
          inscrit_le?: string | null
          nom_invite?: string | null
          prenom_invite?: string | null
          present?: boolean | null
          statut?: Database["public"]["Enums"]["statut_inscription"] | null
          statut_paiement?:
            | Database["public"]["Enums"]["statut_paiement"]
            | null
          telephone_invite?: string | null
          utilisateur_id?: string | null
        }
        Update: {
          annule_le?: string | null
          atelier_id?: string | null
          date_naissance?: string | null
          email_invite?: string | null
          id?: string | null
          inscrit_le?: string | null
          nom_invite?: string | null
          prenom_invite?: string | null
          present?: boolean | null
          statut?: Database["public"]["Enums"]["statut_inscription"] | null
          statut_paiement?:
            | Database["public"]["Enums"]["statut_paiement"]
            | null
          telephone_invite?: string | null
          utilisateur_id?: string | null
        }
        Relationships: []
      }
      jours_feries: {
        Row: {
          annee: number
          date: string
          id: string
          nom: string
        }
        Insert: {
          annee: number
          date: string
          id?: string
          nom: string
        }
        Update: {
          annee?: number
          date?: string
          id?: string
          nom?: string
        }
        Relationships: []
      }
      logs: {
        Row: {
          action: Database["public"]["Enums"]["type_action_log"]
          adresse_ip: string | null
          details: Json | null
          enregistrement_cible_id: string | null
          horodatage: string
          id: string
          table_cible: string | null
          user_agent: string | null
          utilisateur_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["type_action_log"]
          adresse_ip?: string | null
          details?: Json | null
          enregistrement_cible_id?: string | null
          horodatage?: string
          id?: string
          table_cible?: string | null
          user_agent?: string | null
          utilisateur_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["type_action_log"]
          adresse_ip?: string | null
          details?: Json | null
          enregistrement_cible_id?: string | null
          horodatage?: string
          id?: string
          table_cible?: string | null
          user_agent?: string | null
          utilisateur_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_utilisateur_id_fkey"
            columns: ["utilisateur_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      modeles_message: {
        Row: {
          canal: string
          contenu: string
          cree_le: string | null
          id: string
          nom: string
          sujet: string | null
        }
        Insert: {
          canal: string
          contenu: string
          cree_le?: string | null
          id?: string
          nom: string
          sujet?: string | null
        }
        Update: {
          canal?: string
          contenu?: string
          cree_le?: string | null
          id?: string
          nom?: string
          sujet?: string | null
        }
        Relationships: []
      }
      parametres_messages: {
        Row: {
          cle: string
          description: string | null
          id: string
          libelle: string
          modifie_le: string
          modifie_par: string | null
          valeur: string
        }
        Insert: {
          cle: string
          description?: string | null
          id?: string
          libelle: string
          modifie_le?: string
          modifie_par?: string | null
          valeur: string
        }
        Update: {
          cle?: string
          description?: string | null
          id?: string
          libelle?: string
          modifie_le?: string
          modifie_par?: string | null
          valeur?: string
        }
        Relationships: [
          {
            foreignKeyName: "parametres_messages_modifie_par_fkey"
            columns: ["modifie_par"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions_paypal: {
        Row: {
          devise: string
          donnees_brutes: Json | null
          email_payeur: string | null
          enregistre_le: string
          id: string
          inscription_id: string
          montant: number
          paypal_cree_le: string | null
          paypal_transaction_id: string
          statut: Database["public"]["Enums"]["statut_transaction_paypal"]
        }
        Insert: {
          devise?: string
          donnees_brutes?: Json | null
          email_payeur?: string | null
          enregistre_le?: string
          id?: string
          inscription_id: string
          montant: number
          paypal_cree_le?: string | null
          paypal_transaction_id: string
          statut?: Database["public"]["Enums"]["statut_transaction_paypal"]
        }
        Update: {
          devise?: string
          donnees_brutes?: Json | null
          email_payeur?: string | null
          enregistre_le?: string
          id?: string
          inscription_id?: string
          montant?: number
          paypal_cree_le?: string | null
          paypal_transaction_id?: string
          statut?: Database["public"]["Enums"]["statut_transaction_paypal"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_paypal_inscription_id_fkey"
            columns: ["inscription_id"]
            isOneToOne: true
            referencedRelation: "inscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions_paypal_backup_20260430: {
        Row: {
          devise: string | null
          donnees_brutes: Json | null
          email_payeur: string | null
          enregistre_le: string | null
          id: string | null
          inscription_id: string | null
          montant: number | null
          paypal_cree_le: string | null
          paypal_transaction_id: string | null
          statut:
            | Database["public"]["Enums"]["statut_transaction_paypal"]
            | null
        }
        Insert: {
          devise?: string | null
          donnees_brutes?: Json | null
          email_payeur?: string | null
          enregistre_le?: string | null
          id?: string | null
          inscription_id?: string | null
          montant?: number | null
          paypal_cree_le?: string | null
          paypal_transaction_id?: string | null
          statut?:
            | Database["public"]["Enums"]["statut_transaction_paypal"]
            | null
        }
        Update: {
          devise?: string | null
          donnees_brutes?: Json | null
          email_payeur?: string | null
          enregistre_le?: string | null
          id?: string | null
          inscription_id?: string | null
          montant?: number | null
          paypal_cree_le?: string | null
          paypal_transaction_id?: string | null
          statut?:
            | Database["public"]["Enums"]["statut_transaction_paypal"]
            | null
        }
        Relationships: []
      }
      utilisateurs: {
        Row: {
          code_couleur_conges: string | null
          couleur_conges: string | null
          cree_le: string
          date_naissance: string | null
          debut_abonnement: string | null
          email: string
          est_actif: boolean
          fin_abonnement: string | null
          id: string
          modifie_le: string
          mot_de_passe_hash: string | null
          nom: string
          prenom: string
          role: Database["public"]["Enums"]["role_utilisateur"]
          telephone: string | null
          url_avatar: string | null
        }
        Insert: {
          code_couleur_conges?: string | null
          couleur_conges?: string | null
          cree_le?: string
          date_naissance?: string | null
          debut_abonnement?: string | null
          email: string
          est_actif?: boolean
          fin_abonnement?: string | null
          id?: string
          modifie_le?: string
          mot_de_passe_hash?: string | null
          nom: string
          prenom: string
          role?: Database["public"]["Enums"]["role_utilisateur"]
          telephone?: string | null
          url_avatar?: string | null
        }
        Update: {
          code_couleur_conges?: string | null
          couleur_conges?: string | null
          cree_le?: string
          date_naissance?: string | null
          debut_abonnement?: string | null
          email?: string
          est_actif?: boolean
          fin_abonnement?: string | null
          id?: string
          modifie_le?: string
          mot_de_passe_hash?: string | null
          nom?: string
          prenom?: string
          role?: Database["public"]["Enums"]["role_utilisateur"]
          telephone?: string | null
          url_avatar?: string | null
        }
        Relationships: []
      }
      vacances_scolaires: {
        Row: {
          annee_scolaire: string
          date_debut: string
          date_fin: string
          id: string
          nom: string
          zone: string
        }
        Insert: {
          annee_scolaire: string
          date_debut: string
          date_fin: string
          id?: string
          nom: string
          zone?: string
        }
        Update: {
          annee_scolaire?: string
          date_debut?: string
          date_fin?: string
          id?: string
          nom?: string
          zone?: string
        }
        Relationships: []
      }
      visites_site: {
        Row: {
          cree_le: string
          id: string
          page: string
          referrer: string | null
          user_agent: string | null
          visiteur_hash: string | null
        }
        Insert: {
          cree_le?: string
          id?: string
          page: string
          referrer?: string | null
          user_agent?: string | null
          visiteur_hash?: string | null
        }
        Update: {
          cree_le?: string
          id?: string
          page?: string
          referrer?: string | null
          user_agent?: string | null
          visiteur_hash?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      vue_avis_publies: {
        Row: {
          antenne: string | null
          atelier_titre: string | null
          avis_id: string | null
          commentaire: string | null
          cree_le: string | null
          mis_en_avant: boolean | null
          note: number | null
          prenom: string | null
          url_avatar: string | null
        }
        Relationships: []
      }
      vue_logs: {
        Row: {
          action: Database["public"]["Enums"]["type_action_log"] | null
          adresse_ip: string | null
          auteur: string | null
          auteur_code_couleur: string | null
          auteur_couleur: string | null
          auteur_email: string | null
          details: Json | null
          enregistrement_cible_id: string | null
          horodatage: string | null
          id: string | null
          table_cible: string | null
          user_agent: string | null
          utilisateur_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_utilisateur_id_fkey"
            columns: ["utilisateur_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      vue_prochains_ateliers: {
        Row: {
          antenne: string | null
          antenne_slug: string | null
          date_atelier: string | null
          description: string | null
          description_courte: string | null
          duree: string | null
          formateur_nom: string | null
          formateur_photo: string | null
          formateur_prenom: string | null
          heure_debut: string | null
          id: string | null
          lieu: string | null
          niveau: Database["public"]["Enums"]["niveau_atelier"] | null
          places_disponibles: number | null
          places_max: number | null
          statut: Database["public"]["Enums"]["statut_atelier"] | null
          tarif_affichage: string | null
          tarif_standard: number | null
          titre: string | null
          url_image: string | null
        }
        Relationships: []
      }
      vue_suivi_inscriptions: {
        Row: {
          atelier_titre: string | null
          date_atelier: string | null
          date_naissance: string | null
          email: string | null
          inscrit_le: string | null
          montant: number | null
          nom: string | null
          paypal_transaction_id: string | null
          prenom: string | null
          present: boolean | null
          role: Database["public"]["Enums"]["role_utilisateur"] | null
          statut_inscription:
            | Database["public"]["Enums"]["statut_inscription"]
            | null
          statut_paiement: Database["public"]["Enums"]["statut_paiement"] | null
          statut_paypal:
            | Database["public"]["Enums"]["statut_transaction_paypal"]
            | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_dispo_le: { Args: { p_date: string }; Returns: boolean }
      depublier_ateliers_passes: { Args: never; Returns: number }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      acces_document: "membres" | "premium" | "tous"
      categorie_idee:
        | "evolution_site"
        | "ateliers"
        | "anomalie_site"
        | "membres"
        | "communication"
        | "evenements"
        | "organisation"
        | "autre"
      niveau_atelier: "debutant" | "intermediaire" | "avance"
      reaction_idee: "valide" | "non_valide" | "a_discuter"
      role_utilisateur:
        | "administrateur"
        | "inscrit"
        | "membre"
        | "membre_premium"
      statut_atelier: "brouillon" | "publie" | "complet" | "annule" | "termine"
      statut_inscription: "en_attente" | "confirme" | "annule"
      statut_moderation: "en_attente" | "approuve" | "rejete"
      statut_paiement: "en_attente" | "paye" | "non_requis"
      statut_transaction_paypal:
        | "en_attente"
        | "complete"
        | "rembourse"
        | "echoue"
      type_action_log:
        | "connexion"
        | "deconnexion"
        | "inscription_atelier"
        | "annulation_inscription"
        | "paiement_recu"
        | "remboursement"
        | "avis_soumis"
        | "avis_modere"
        | "profil_modifie"
        | "mot_de_passe_modifie"
        | "atelier_cree"
        | "atelier_modifie"
        | "membre_promu"
        | "membre_desactive"
        | "export_donnees"
        | "autre"
      type_document: "magazine" | "guide" | "lien_externe"
      type_recurrence: "hebdomadaire" | "bimensuel" | "mensuel"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      acces_document: ["membres", "premium", "tous"],
      categorie_idee: [
        "evolution_site",
        "ateliers",
        "anomalie_site",
        "membres",
        "communication",
        "evenements",
        "organisation",
        "autre",
      ],
      niveau_atelier: ["debutant", "intermediaire", "avance"],
      reaction_idee: ["valide", "non_valide", "a_discuter"],
      role_utilisateur: [
        "administrateur",
        "inscrit",
        "membre",
        "membre_premium",
      ],
      statut_atelier: ["brouillon", "publie", "complet", "annule", "termine"],
      statut_inscription: ["en_attente", "confirme", "annule"],
      statut_moderation: ["en_attente", "approuve", "rejete"],
      statut_paiement: ["en_attente", "paye", "non_requis"],
      statut_transaction_paypal: [
        "en_attente",
        "complete",
        "rembourse",
        "echoue",
      ],
      type_action_log: [
        "connexion",
        "deconnexion",
        "inscription_atelier",
        "annulation_inscription",
        "paiement_recu",
        "remboursement",
        "avis_soumis",
        "avis_modere",
        "profil_modifie",
        "mot_de_passe_modifie",
        "atelier_cree",
        "atelier_modifie",
        "membre_promu",
        "membre_desactive",
        "export_donnees",
        "autre",
      ],
      type_document: ["magazine", "guide", "lien_externe"],
      type_recurrence: ["hebdomadaire", "bimensuel", "mensuel"],
    },
  },
} as const
