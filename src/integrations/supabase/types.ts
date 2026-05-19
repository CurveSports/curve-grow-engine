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
      acquisition_budget_items: {
        Row: {
          acquisition_id: string
          actual_amount: number | null
          budgeted_amount: number | null
          category: string
          created_at: string
          created_by: string | null
          date_incurred: string | null
          description: string
          id: string
          is_paid: boolean
          notes: string | null
          payment_method: string | null
          receipt_document_id: string | null
          updated_at: string
          vendor: string | null
          workstream: string
        }
        Insert: {
          acquisition_id: string
          actual_amount?: number | null
          budgeted_amount?: number | null
          category: string
          created_at?: string
          created_by?: string | null
          date_incurred?: string | null
          description: string
          id?: string
          is_paid?: boolean
          notes?: string | null
          payment_method?: string | null
          receipt_document_id?: string | null
          updated_at?: string
          vendor?: string | null
          workstream: string
        }
        Update: {
          acquisition_id?: string
          actual_amount?: number | null
          budgeted_amount?: number | null
          category?: string
          created_at?: string
          created_by?: string | null
          date_incurred?: string | null
          description?: string
          id?: string
          is_paid?: boolean
          notes?: string | null
          payment_method?: string | null
          receipt_document_id?: string | null
          updated_at?: string
          vendor?: string | null
          workstream?: string
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_budget_items_acquisition_id_fkey"
            columns: ["acquisition_id"]
            isOneToOne: false
            referencedRelation: "acquisition_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_budget_items_receipt_document_id_fkey"
            columns: ["receipt_document_id"]
            isOneToOne: false
            referencedRelation: "acquisition_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      acquisition_communications: {
        Row: {
          acquisition_id: string
          communication_date: string
          communication_type: string
          contact_name: string | null
          contact_organization: string | null
          contact_role: string | null
          created_at: string
          follow_up_completed: boolean
          follow_up_date: string | null
          follow_up_needed: boolean
          follow_up_notes: string | null
          id: string
          logged_by: string | null
          method: string | null
          related_document_ids: string[] | null
          related_task_id: string | null
          subject: string
          summary: string | null
        }
        Insert: {
          acquisition_id: string
          communication_date?: string
          communication_type: string
          contact_name?: string | null
          contact_organization?: string | null
          contact_role?: string | null
          created_at?: string
          follow_up_completed?: boolean
          follow_up_date?: string | null
          follow_up_needed?: boolean
          follow_up_notes?: string | null
          id?: string
          logged_by?: string | null
          method?: string | null
          related_document_ids?: string[] | null
          related_task_id?: string | null
          subject: string
          summary?: string | null
        }
        Update: {
          acquisition_id?: string
          communication_date?: string
          communication_type?: string
          contact_name?: string | null
          contact_organization?: string | null
          contact_role?: string | null
          created_at?: string
          follow_up_completed?: boolean
          follow_up_date?: string | null
          follow_up_needed?: boolean
          follow_up_notes?: string | null
          id?: string
          logged_by?: string | null
          method?: string | null
          related_document_ids?: string[] | null
          related_task_id?: string | null
          subject?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_communications_acquisition_id_fkey"
            columns: ["acquisition_id"]
            isOneToOne: false
            referencedRelation: "acquisition_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_communications_related_task_id_fkey"
            columns: ["related_task_id"]
            isOneToOne: false
            referencedRelation: "acquisition_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      acquisition_compliance_items: {
        Row: {
          acquisition_id: string
          completed_date: string | null
          created_at: string
          created_by: string | null
          documentation_notes: string | null
          documentation_url: string | null
          due_date: string | null
          expiration_date: string | null
          id: string
          last_reminder_sent_at: string | null
          notes: string | null
          ori_number: string | null
          reference_number: string | null
          reminder_count: number
          requirement_name: string
          requirement_type: string
          staff_id: string
          status: string
          updated_at: string
          vendor: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          acquisition_id: string
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          documentation_notes?: string | null
          documentation_url?: string | null
          due_date?: string | null
          expiration_date?: string | null
          id?: string
          last_reminder_sent_at?: string | null
          notes?: string | null
          ori_number?: string | null
          reference_number?: string | null
          reminder_count?: number
          requirement_name: string
          requirement_type: string
          staff_id: string
          status?: string
          updated_at?: string
          vendor?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          acquisition_id?: string
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          documentation_notes?: string | null
          documentation_url?: string | null
          due_date?: string | null
          expiration_date?: string | null
          id?: string
          last_reminder_sent_at?: string | null
          notes?: string | null
          ori_number?: string | null
          reference_number?: string | null
          reminder_count?: number
          requirement_name?: string
          requirement_type?: string
          staff_id?: string
          status?: string
          updated_at?: string
          vendor?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_compliance_items_acquisition_id_fkey"
            columns: ["acquisition_id"]
            isOneToOne: false
            referencedRelation: "acquisition_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_compliance_items_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "acquisition_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      acquisition_documents: {
        Row: {
          acquisition_id: string
          created_at: string
          document_description: string | null
          document_name: string
          document_type: string | null
          external_url: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          is_current_version: boolean
          is_seller_visible: boolean
          previous_version_id: string | null
          requires_review: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          storage_type: string
          updated_at: string
          uploaded_by: string | null
          version: number
          version_notes: string | null
          workstream: string | null
        }
        Insert: {
          acquisition_id: string
          created_at?: string
          document_description?: string | null
          document_name: string
          document_type?: string | null
          external_url?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_current_version?: boolean
          is_seller_visible?: boolean
          previous_version_id?: string | null
          requires_review?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          storage_type: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number
          version_notes?: string | null
          workstream?: string | null
        }
        Update: {
          acquisition_id?: string
          created_at?: string
          document_description?: string | null
          document_name?: string
          document_type?: string | null
          external_url?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_current_version?: boolean
          is_seller_visible?: boolean
          previous_version_id?: string | null
          requires_review?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          storage_type?: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number
          version_notes?: string | null
          workstream?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_documents_acquisition_id_fkey"
            columns: ["acquisition_id"]
            isOneToOne: false
            referencedRelation: "acquisition_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_documents_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "acquisition_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      acquisition_meeting_agendas: {
        Row: {
          acquisition_id: string
          ai_talking_points: string | null
          compliance_status: Json | null
          created_at: string
          custom_items: Json | null
          decisions_needed: Json | null
          documents_for_review: Json | null
          edited_by: string | null
          generated_by: string | null
          id: string
          items_needing_discussion: Json | null
          meeting_date: string | null
          next_week_priorities: Json | null
          pending_follow_ups: Json | null
          previous_action_items: Json | null
          previous_transcript_id: string | null
          status: string
          status_updates: Json | null
          updated_at: string
          week_number: number | null
          workstream_status: Json | null
        }
        Insert: {
          acquisition_id: string
          ai_talking_points?: string | null
          compliance_status?: Json | null
          created_at?: string
          custom_items?: Json | null
          decisions_needed?: Json | null
          documents_for_review?: Json | null
          edited_by?: string | null
          generated_by?: string | null
          id?: string
          items_needing_discussion?: Json | null
          meeting_date?: string | null
          next_week_priorities?: Json | null
          pending_follow_ups?: Json | null
          previous_action_items?: Json | null
          previous_transcript_id?: string | null
          status?: string
          status_updates?: Json | null
          updated_at?: string
          week_number?: number | null
          workstream_status?: Json | null
        }
        Update: {
          acquisition_id?: string
          ai_talking_points?: string | null
          compliance_status?: Json | null
          created_at?: string
          custom_items?: Json | null
          decisions_needed?: Json | null
          documents_for_review?: Json | null
          edited_by?: string | null
          generated_by?: string | null
          id?: string
          items_needing_discussion?: Json | null
          meeting_date?: string | null
          next_week_priorities?: Json | null
          pending_follow_ups?: Json | null
          previous_action_items?: Json | null
          previous_transcript_id?: string | null
          status?: string
          status_updates?: Json | null
          updated_at?: string
          week_number?: number | null
          workstream_status?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_meeting_agendas_acquisition_id_fkey"
            columns: ["acquisition_id"]
            isOneToOne: false
            referencedRelation: "acquisition_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_meeting_agendas_previous_transcript_id_fkey"
            columns: ["previous_transcript_id"]
            isOneToOne: false
            referencedRelation: "acquisition_meeting_transcripts"
            referencedColumns: ["id"]
          },
        ]
      }
      acquisition_meeting_transcripts: {
        Row: {
          acquisition_id: string | null
          action_items: Json | null
          ai_error: string | null
          ai_status: string
          created_at: string
          created_by: string | null
          follow_ups: Json | null
          id: string
          is_archived: boolean
          is_tagged: boolean
          key_decisions: Json | null
          meeting_date: string | null
          meeting_summary: string | null
          meeting_title: string | null
          open_issues: Json | null
          processed_at: string | null
          raw_transcript: string | null
          risk_flags: Json | null
          source_type: string
          suggestions_applied_count: number
          suggestions_dismissed_count: number
          suggestions_reviewed: boolean
          updated_at: string
          zoom_duration_minutes: number | null
          zoom_host_email: string | null
          zoom_meeting_id: string | null
          zoom_meeting_topic: string | null
          zoom_participants: Json | null
          zoom_recording_url: string | null
        }
        Insert: {
          acquisition_id?: string | null
          action_items?: Json | null
          ai_error?: string | null
          ai_status?: string
          created_at?: string
          created_by?: string | null
          follow_ups?: Json | null
          id?: string
          is_archived?: boolean
          is_tagged?: boolean
          key_decisions?: Json | null
          meeting_date?: string | null
          meeting_summary?: string | null
          meeting_title?: string | null
          open_issues?: Json | null
          processed_at?: string | null
          raw_transcript?: string | null
          risk_flags?: Json | null
          source_type: string
          suggestions_applied_count?: number
          suggestions_dismissed_count?: number
          suggestions_reviewed?: boolean
          updated_at?: string
          zoom_duration_minutes?: number | null
          zoom_host_email?: string | null
          zoom_meeting_id?: string | null
          zoom_meeting_topic?: string | null
          zoom_participants?: Json | null
          zoom_recording_url?: string | null
        }
        Update: {
          acquisition_id?: string | null
          action_items?: Json | null
          ai_error?: string | null
          ai_status?: string
          created_at?: string
          created_by?: string | null
          follow_ups?: Json | null
          id?: string
          is_archived?: boolean
          is_tagged?: boolean
          key_decisions?: Json | null
          meeting_date?: string | null
          meeting_summary?: string | null
          meeting_title?: string | null
          open_issues?: Json | null
          processed_at?: string | null
          raw_transcript?: string | null
          risk_flags?: Json | null
          source_type?: string
          suggestions_applied_count?: number
          suggestions_dismissed_count?: number
          suggestions_reviewed?: boolean
          updated_at?: string
          zoom_duration_minutes?: number | null
          zoom_host_email?: string | null
          zoom_meeting_id?: string | null
          zoom_meeting_topic?: string | null
          zoom_participants?: Json | null
          zoom_recording_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_meeting_transcripts_acquisition_id_fkey"
            columns: ["acquisition_id"]
            isOneToOne: false
            referencedRelation: "acquisition_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      acquisition_portal_activity: {
        Row: {
          acquisition_id: string
          action: string
          actor_name: string | null
          created_at: string
          detail: string | null
          id: string
          portal_user_id: string | null
          staff_token_id: string | null
        }
        Insert: {
          acquisition_id: string
          action: string
          actor_name?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          portal_user_id?: string | null
          staff_token_id?: string | null
        }
        Update: {
          acquisition_id?: string
          action?: string
          actor_name?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          portal_user_id?: string | null
          staff_token_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_portal_activity_acquisition_id_fkey"
            columns: ["acquisition_id"]
            isOneToOne: false
            referencedRelation: "acquisition_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_portal_activity_portal_user_id_fkey"
            columns: ["portal_user_id"]
            isOneToOne: false
            referencedRelation: "acquisition_portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_portal_activity_staff_token_id_fkey"
            columns: ["staff_token_id"]
            isOneToOne: false
            referencedRelation: "acquisition_staff_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      acquisition_portal_config: {
        Row: {
          acquisition_id: string
          config_key: string
          config_label: string | null
          config_value: string | null
          display_order: number
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          acquisition_id: string
          config_key: string
          config_label?: string | null
          config_value?: string | null
          display_order?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          acquisition_id?: string
          config_key?: string
          config_label?: string | null
          config_value?: string | null
          display_order?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_portal_config_acquisition_id_fkey"
            columns: ["acquisition_id"]
            isOneToOne: false
            referencedRelation: "acquisition_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      acquisition_portal_content: {
        Row: {
          acquisition_id: string
          content_key: string
          content_text: string | null
          display_order: number
          id: string
          is_visible: boolean
          portal_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          acquisition_id: string
          content_key: string
          content_text?: string | null
          display_order?: number
          id?: string
          is_visible?: boolean
          portal_type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          acquisition_id?: string
          content_key?: string
          content_text?: string | null
          display_order?: number
          id?: string
          is_visible?: boolean
          portal_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_portal_content_acquisition_id_fkey"
            columns: ["acquisition_id"]
            isOneToOne: false
            referencedRelation: "acquisition_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      acquisition_portal_users: {
        Row: {
          access_expires_at: string | null
          access_granted_at: string
          acquisition_id: string
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          invited_by: string | null
          is_active: boolean
          last_login_at: string | null
          portal_type: string
          user_id: string
        }
        Insert: {
          access_expires_at?: string | null
          access_granted_at?: string
          acquisition_id: string
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean
          last_login_at?: string | null
          portal_type?: string
          user_id: string
        }
        Update: {
          access_expires_at?: string | null
          access_granted_at?: string
          acquisition_id?: string
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean
          last_login_at?: string | null
          portal_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_portal_users_acquisition_id_fkey"
            columns: ["acquisition_id"]
            isOneToOne: false
            referencedRelation: "acquisition_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      acquisition_projects: {
        Row: {
          acquisition_notes: string | null
          blocked_tasks: number
          city: string | null
          close_date: string | null
          club_name: string
          codename: string | null
          completed_tasks: number
          completion_pct: number
          compliance_pct: number
          created_at: string
          created_by: string | null
          data_assets_pct: number
          entity_name: string | null
          financial_pct: number
          hr_culture_pct: number
          id: string
          integration_pct: number
          it_pct: number
          legal_pct: number
          marketing_pct: number
          overdue_tasks: number
          phase: string
          seller_primary_email: string | null
          seller_primary_name: string | null
          seller_primary_phone: string | null
          seller_secondary_email: string | null
          seller_secondary_name: string | null
          state: string | null
          status: string
          testing_pct: number
          total_tasks: number
          updated_at: string
          value_creation_summary: string | null
        }
        Insert: {
          acquisition_notes?: string | null
          blocked_tasks?: number
          city?: string | null
          close_date?: string | null
          club_name: string
          codename?: string | null
          completed_tasks?: number
          completion_pct?: number
          compliance_pct?: number
          created_at?: string
          created_by?: string | null
          data_assets_pct?: number
          entity_name?: string | null
          financial_pct?: number
          hr_culture_pct?: number
          id?: string
          integration_pct?: number
          it_pct?: number
          legal_pct?: number
          marketing_pct?: number
          overdue_tasks?: number
          phase?: string
          seller_primary_email?: string | null
          seller_primary_name?: string | null
          seller_primary_phone?: string | null
          seller_secondary_email?: string | null
          seller_secondary_name?: string | null
          state?: string | null
          status?: string
          testing_pct?: number
          total_tasks?: number
          updated_at?: string
          value_creation_summary?: string | null
        }
        Update: {
          acquisition_notes?: string | null
          blocked_tasks?: number
          city?: string | null
          close_date?: string | null
          club_name?: string
          codename?: string | null
          completed_tasks?: number
          completion_pct?: number
          compliance_pct?: number
          created_at?: string
          created_by?: string | null
          data_assets_pct?: number
          entity_name?: string | null
          financial_pct?: number
          hr_culture_pct?: number
          id?: string
          integration_pct?: number
          it_pct?: number
          legal_pct?: number
          marketing_pct?: number
          overdue_tasks?: number
          phase?: string
          seller_primary_email?: string | null
          seller_primary_name?: string | null
          seller_primary_phone?: string | null
          seller_secondary_email?: string | null
          seller_secondary_name?: string | null
          state?: string | null
          status?: string
          testing_pct?: number
          total_tasks?: number
          updated_at?: string
          value_creation_summary?: string | null
        }
        Relationships: []
      }
      acquisition_seller_sentiment: {
        Row: {
          acquisition_id: string
          custom_milestone_name: string | null
          id: string
          milestone: string
          notes: string | null
          recorded_at: string
          recorded_by: string | null
          sentiment_score: number
        }
        Insert: {
          acquisition_id: string
          custom_milestone_name?: string | null
          id?: string
          milestone: string
          notes?: string | null
          recorded_at?: string
          recorded_by?: string | null
          sentiment_score: number
        }
        Update: {
          acquisition_id?: string
          custom_milestone_name?: string | null
          id?: string
          milestone?: string
          notes?: string | null
          recorded_at?: string
          recorded_by?: string | null
          sentiment_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_seller_sentiment_acquisition_id_fkey"
            columns: ["acquisition_id"]
            isOneToOne: false
            referencedRelation: "acquisition_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      acquisition_staff: {
        Row: {
          acquisition_id: string
          compliance_pct: number
          compliance_status: string
          created_at: string
          created_by: string | null
          email: string | null
          employment_type: string | null
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          notes: string | null
          phone: string | null
          role: string
          role_type: string | null
          start_date: string | null
          team_or_department: string | null
          updated_at: string
        }
        Insert: {
          acquisition_id: string
          compliance_pct?: number
          compliance_status?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          employment_type?: string | null
          first_name: string
          id?: string
          is_active?: boolean
          last_name: string
          notes?: string | null
          phone?: string | null
          role: string
          role_type?: string | null
          start_date?: string | null
          team_or_department?: string | null
          updated_at?: string
        }
        Update: {
          acquisition_id?: string
          compliance_pct?: number
          compliance_status?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          employment_type?: string | null
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          notes?: string | null
          phone?: string | null
          role?: string
          role_type?: string | null
          start_date?: string | null
          team_or_department?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_staff_acquisition_id_fkey"
            columns: ["acquisition_id"]
            isOneToOne: false
            referencedRelation: "acquisition_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      acquisition_staff_tokens: {
        Row: {
          access_count: number
          acquisition_id: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          last_accessed_at: string | null
          link_sent_at: string | null
          staff_id: string
          token: string
        }
        Insert: {
          access_count?: number
          acquisition_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          link_sent_at?: string | null
          staff_id: string
          token: string
        }
        Update: {
          access_count?: number
          acquisition_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          link_sent_at?: string | null
          staff_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_staff_tokens_acquisition_id_fkey"
            columns: ["acquisition_id"]
            isOneToOne: false
            referencedRelation: "acquisition_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_staff_tokens_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: true
            referencedRelation: "acquisition_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      acquisition_task_activity: {
        Row: {
          acquisition_id: string
          action: string
          created_at: string
          id: string
          new_value: string | null
          old_value: string | null
          performed_by: string | null
          task_id: string
        }
        Insert: {
          acquisition_id: string
          action: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          performed_by?: string | null
          task_id: string
        }
        Update: {
          acquisition_id?: string
          action?: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          performed_by?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_task_activity_acquisition_id_fkey"
            columns: ["acquisition_id"]
            isOneToOne: false
            referencedRelation: "acquisition_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_task_activity_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "acquisition_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      acquisition_task_notes: {
        Row: {
          acquisition_id: string
          created_at: string
          created_by: string
          id: string
          is_seller_visible: boolean
          note_text: string
          task_id: string
        }
        Insert: {
          acquisition_id: string
          created_at?: string
          created_by: string
          id?: string
          is_seller_visible?: boolean
          note_text: string
          task_id: string
        }
        Update: {
          acquisition_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_seller_visible?: boolean
          note_text?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_task_notes_acquisition_id_fkey"
            columns: ["acquisition_id"]
            isOneToOne: false
            referencedRelation: "acquisition_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_task_notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "acquisition_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      acquisition_task_suggestions: {
        Row: {
          acquisition_id: string
          confidence: string | null
          context_from_transcript: string | null
          created_at: string
          existing_task_id: string | null
          existing_task_title: string | null
          id: string
          resolution: string
          resolved_at: string | null
          resolved_by: string | null
          suggested_action: string
          suggestion_type: string
          transcript_id: string
        }
        Insert: {
          acquisition_id: string
          confidence?: string | null
          context_from_transcript?: string | null
          created_at?: string
          existing_task_id?: string | null
          existing_task_title?: string | null
          id?: string
          resolution?: string
          resolved_at?: string | null
          resolved_by?: string | null
          suggested_action: string
          suggestion_type: string
          transcript_id: string
        }
        Update: {
          acquisition_id?: string
          confidence?: string | null
          context_from_transcript?: string | null
          created_at?: string
          existing_task_id?: string | null
          existing_task_title?: string | null
          id?: string
          resolution?: string
          resolved_at?: string | null
          resolved_by?: string | null
          suggested_action?: string
          suggestion_type?: string
          transcript_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_task_suggestions_acquisition_id_fkey"
            columns: ["acquisition_id"]
            isOneToOne: false
            referencedRelation: "acquisition_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_task_suggestions_existing_task_id_fkey"
            columns: ["existing_task_id"]
            isOneToOne: false
            referencedRelation: "acquisition_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_task_suggestions_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "acquisition_meeting_transcripts"
            referencedColumns: ["id"]
          },
        ]
      }
      acquisition_task_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          florida_only: boolean
          id: string
          is_seller_visible: boolean
          is_staff_visible: boolean
          is_system_template: boolean
          lead_role: string | null
          phase: string
          priority: string | null
          state_filter: string | null
          suggested_days_from_close: number | null
          title: string
          workstream: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          florida_only?: boolean
          id?: string
          is_seller_visible?: boolean
          is_staff_visible?: boolean
          is_system_template?: boolean
          lead_role?: string | null
          phase: string
          priority?: string | null
          state_filter?: string | null
          suggested_days_from_close?: number | null
          title: string
          workstream: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          florida_only?: boolean
          id?: string
          is_seller_visible?: boolean
          is_staff_visible?: boolean
          is_system_template?: boolean
          lead_role?: string | null
          phase?: string
          priority?: string | null
          state_filter?: string | null
          suggested_days_from_close?: number | null
          title?: string
          workstream?: string
        }
        Relationships: []
      }
      acquisition_tasks: {
        Row: {
          acquisition_id: string
          completed_date: string | null
          created_at: string
          created_by: string | null
          curve_notes: string | null
          days_in_current_status: number | null
          dependency: string | null
          description: string | null
          display_order: number
          id: string
          is_custom: boolean
          is_seller_visible: boolean
          is_staff_visible: boolean
          lead_person_id: string | null
          lead_person_name: string | null
          phase: string
          priority: string | null
          seller_notes: string | null
          status: string
          target_date: string | null
          template_id: string | null
          title: string
          updated_at: string
          workstream: string
        }
        Insert: {
          acquisition_id: string
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          curve_notes?: string | null
          days_in_current_status?: number | null
          dependency?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_custom?: boolean
          is_seller_visible?: boolean
          is_staff_visible?: boolean
          lead_person_id?: string | null
          lead_person_name?: string | null
          phase: string
          priority?: string | null
          seller_notes?: string | null
          status?: string
          target_date?: string | null
          template_id?: string | null
          title: string
          updated_at?: string
          workstream: string
        }
        Update: {
          acquisition_id?: string
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          curve_notes?: string | null
          days_in_current_status?: number | null
          dependency?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_custom?: boolean
          is_seller_visible?: boolean
          is_staff_visible?: boolean
          lead_person_id?: string | null
          lead_person_name?: string | null
          phase?: string
          priority?: string | null
          seller_notes?: string | null
          status?: string
          target_date?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string
          workstream?: string
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_tasks_acquisition_id_fkey"
            columns: ["acquisition_id"]
            isOneToOne: false
            referencedRelation: "acquisition_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      acquisition_weekly_rollups: {
        Row: {
          acquisition_id: string
          blocked_tasks: number | null
          completed_tasks: number | null
          completion_pct: number | null
          compliance_pct: number | null
          compliant_staff: number | null
          created_at: string
          days_since_close: number | null
          executive_summary: string | null
          generated_by: string | null
          id: string
          next_week_priorities: Json | null
          overdue_tasks: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_flags: Json | null
          sent_at: string | null
          sent_to: string[] | null
          status: string
          tasks_completed_this_week: number | null
          tasks_started_this_week: number | null
          total_staff: number | null
          total_tasks: number | null
          week_end_date: string
          week_number: number
          week_start_date: string
          workstream_data: Json | null
        }
        Insert: {
          acquisition_id: string
          blocked_tasks?: number | null
          completed_tasks?: number | null
          completion_pct?: number | null
          compliance_pct?: number | null
          compliant_staff?: number | null
          created_at?: string
          days_since_close?: number | null
          executive_summary?: string | null
          generated_by?: string | null
          id?: string
          next_week_priorities?: Json | null
          overdue_tasks?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_flags?: Json | null
          sent_at?: string | null
          sent_to?: string[] | null
          status?: string
          tasks_completed_this_week?: number | null
          tasks_started_this_week?: number | null
          total_staff?: number | null
          total_tasks?: number | null
          week_end_date: string
          week_number: number
          week_start_date: string
          workstream_data?: Json | null
        }
        Update: {
          acquisition_id?: string
          blocked_tasks?: number | null
          completed_tasks?: number | null
          completion_pct?: number | null
          compliance_pct?: number | null
          compliant_staff?: number | null
          created_at?: string
          days_since_close?: number | null
          executive_summary?: string | null
          generated_by?: string | null
          id?: string
          next_week_priorities?: Json | null
          overdue_tasks?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_flags?: Json | null
          sent_at?: string | null
          sent_to?: string[] | null
          status?: string
          tasks_completed_this_week?: number | null
          tasks_started_this_week?: number | null
          total_staff?: number | null
          total_tasks?: number | null
          week_end_date?: string
          week_number?: number
          week_start_date?: string
          workstream_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_weekly_rollups_acquisition_id_fkey"
            columns: ["acquisition_id"]
            isOneToOne: false
            referencedRelation: "acquisition_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_alert_dismissals: {
        Row: {
          alert_signature: string
          alert_type: string
          dismissed_at: string
          dismissed_by: string
          id: string
          org_id: string
        }
        Insert: {
          alert_signature: string
          alert_type: string
          dismissed_at?: string
          dismissed_by: string
          id?: string
          org_id: string
        }
        Update: {
          alert_signature?: string
          alert_type?: string
          dismissed_at?: string
          dismissed_by?: string
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_alert_dismissals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_org_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          org_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          org_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_org_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_org_reviews: {
        Row: {
          id: string
          kind: Database["public"]["Enums"]["admin_review_kind"]
          note: string | null
          org_id: string
          reviewed_at: string
          reviewed_by: string
        }
        Insert: {
          id?: string
          kind: Database["public"]["Enums"]["admin_review_kind"]
          note?: string | null
          org_id: string
          reviewed_at?: string
          reviewed_by: string
        }
        Update: {
          id?: string
          kind?: Database["public"]["Enums"]["admin_review_kind"]
          note?: string | null
          org_id?: string
          reviewed_at?: string
          reviewed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_org_reviews_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_comments: {
        Row: {
          approval_id: string
          author_id: string | null
          author_role: string | null
          comment_text: string
          comment_type: string
          created_at: string
          id: string
        }
        Insert: {
          approval_id: string
          author_id?: string | null
          author_role?: string | null
          comment_text: string
          comment_type?: string
          created_at?: string
          id?: string
        }
        Update: {
          approval_id?: string
          author_id?: string | null
          author_role?: string | null
          comment_text?: string
          comment_type?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_comments_approval_id_fkey"
            columns: ["approval_id"]
            isOneToOne: false
            referencedRelation: "approval_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_queue: {
        Row: {
          campaign_id: string | null
          created_at: string
          current_stage: string
          curve_decision: string | null
          curve_review_notes: string | null
          curve_reviewed_at: string | null
          curve_reviewer_id: string | null
          design_id: string | null
          email_send_id: string | null
          finalized_at: string | null
          id: string
          org_decision: string | null
          org_id: string
          org_review_notes: string | null
          org_reviewed_at: string | null
          org_reviewer_id: string | null
          priority: string
          status: string
          subject_type: string
          submitted_at: string
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          current_stage?: string
          curve_decision?: string | null
          curve_review_notes?: string | null
          curve_reviewed_at?: string | null
          curve_reviewer_id?: string | null
          design_id?: string | null
          email_send_id?: string | null
          finalized_at?: string | null
          id?: string
          org_decision?: string | null
          org_id: string
          org_review_notes?: string | null
          org_reviewed_at?: string | null
          org_reviewer_id?: string | null
          priority?: string
          status?: string
          subject_type: string
          submitted_at?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          current_stage?: string
          curve_decision?: string | null
          curve_review_notes?: string | null
          curve_reviewed_at?: string | null
          curve_reviewer_id?: string | null
          design_id?: string | null
          email_send_id?: string | null
          finalized_at?: string | null
          id?: string
          org_decision?: string | null
          org_id?: string
          org_review_notes?: string | null
          org_reviewed_at?: string | null
          org_reviewer_id?: string | null
          priority?: string
          status?: string
          subject_type?: string
          submitted_at?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_queue_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_queue_email_send_id_fkey"
            columns: ["email_send_id"]
            isOneToOne: false
            referencedRelation: "org_email_sends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_queue_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_assets: {
        Row: {
          asset_type: string
          campaign_id: string
          created_at: string
          design_id: string | null
          email_send_id: string | null
          id: string
          label: string | null
          notes: string | null
          sort_order: number
        }
        Insert: {
          asset_type: string
          campaign_id: string
          created_at?: string
          design_id?: string | null
          email_send_id?: string | null
          id?: string
          label?: string | null
          notes?: string | null
          sort_order?: number
        }
        Update: {
          asset_type?: string
          campaign_id?: string
          created_at?: string
          design_id?: string | null
          email_send_id?: string | null
          id?: string
          label?: string | null
          notes?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_assets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_assets_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_assets_email_send_id_fkey"
            columns: ["email_send_id"]
            isOneToOne: false
            referencedRelation: "org_email_sends"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_sequence_assets: {
        Row: {
          asset_label: string | null
          asset_type: string | null
          channel: string | null
          copy_template: string | null
          days_from_anchor: number | null
          design_template_id: string | null
          email_template_id: string | null
          id: string
          notes: string | null
          order_in_sequence: number | null
          preview_text_template: string | null
          required: boolean | null
          sequence_template_id: string | null
          subject_template: string | null
          target_segment_filter: Json | null
          time_of_day: string | null
        }
        Insert: {
          asset_label?: string | null
          asset_type?: string | null
          channel?: string | null
          copy_template?: string | null
          days_from_anchor?: number | null
          design_template_id?: string | null
          email_template_id?: string | null
          id?: string
          notes?: string | null
          order_in_sequence?: number | null
          preview_text_template?: string | null
          required?: boolean | null
          sequence_template_id?: string | null
          subject_template?: string | null
          target_segment_filter?: Json | null
          time_of_day?: string | null
        }
        Update: {
          asset_label?: string | null
          asset_type?: string | null
          channel?: string | null
          copy_template?: string | null
          days_from_anchor?: number | null
          design_template_id?: string | null
          email_template_id?: string | null
          id?: string
          notes?: string | null
          order_in_sequence?: number | null
          preview_text_template?: string | null
          required?: boolean | null
          sequence_template_id?: string | null
          subject_template?: string | null
          target_segment_filter?: Json | null
          time_of_day?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_sequence_assets_sequence_template_id_fkey"
            columns: ["sequence_template_id"]
            isOneToOne: false
            referencedRelation: "campaign_sequence_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_sequence_templates: {
        Row: {
          active: boolean | null
          anchor_event: string | null
          anchor_label: string | null
          best_for: string | null
          category: string | null
          created_at: string | null
          default_goal_target: number | null
          description: string | null
          duration_days: number | null
          goal_metric: string | null
          id: string
          is_system: boolean | null
          name: string
          owner_org_id: string | null
          preview_summary: string | null
          sort_order: number | null
          thumbnail_url: string | null
          tier: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          anchor_event?: string | null
          anchor_label?: string | null
          best_for?: string | null
          category?: string | null
          created_at?: string | null
          default_goal_target?: number | null
          description?: string | null
          duration_days?: number | null
          goal_metric?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          owner_org_id?: string | null
          preview_summary?: string | null
          sort_order?: number | null
          thumbnail_url?: string | null
          tier?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          anchor_event?: string | null
          anchor_label?: string | null
          best_for?: string | null
          category?: string | null
          created_at?: string | null
          default_goal_target?: number | null
          description?: string | null
          duration_days?: number | null
          goal_metric?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          owner_org_id?: string | null
          preview_summary?: string | null
          sort_order?: number | null
          thumbnail_url?: string | null
          tier?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_sequence_templates_owner_org_id_fkey"
            columns: ["owner_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          brand_color: string | null
          campaign_type: string
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          created_by_role: string | null
          description: string | null
          end_date: string | null
          goal: string | null
          id: string
          metrics: Json | null
          name: string
          org_id: string
          segment_id: string | null
          start_date: string | null
          status: string
          target_audience: Json | null
          updated_at: string
        }
        Insert: {
          brand_color?: string | null
          campaign_type?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          created_by_role?: string | null
          description?: string | null
          end_date?: string | null
          goal?: string | null
          id?: string
          metrics?: Json | null
          name: string
          org_id: string
          segment_id?: string | null
          start_date?: string | null
          status?: string
          target_audience?: Json | null
          updated_at?: string
        }
        Update: {
          brand_color?: string | null
          campaign_type?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          created_by_role?: string | null
          description?: string | null
          end_date?: string | null
          goal?: string | null
          id?: string
          metrics?: Json | null
          name?: string
          org_id?: string
          segment_id?: string | null
          start_date?: string | null
          status?: string
          target_audience?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "org_contact_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_requirement_templates: {
        Row: {
          applies_to_role_types: string[]
          created_at: string
          default_days_to_complete: number
          description: string | null
          display_order: number
          expires_after_years: number | null
          id: string
          is_active: boolean
          requirement_name: string
          requirement_type: string
          state_filter: string | null
        }
        Insert: {
          applies_to_role_types?: string[]
          created_at?: string
          default_days_to_complete?: number
          description?: string | null
          display_order?: number
          expires_after_years?: number | null
          id?: string
          is_active?: boolean
          requirement_name: string
          requirement_type: string
          state_filter?: string | null
        }
        Update: {
          applies_to_role_types?: string[]
          created_at?: string
          default_days_to_complete?: number
          description?: string | null
          display_order?: number
          expires_after_years?: number | null
          id?: string
          is_active?: boolean
          requirement_name?: string
          requirement_type?: string
          state_filter?: string | null
        }
        Relationships: []
      }
      curve_marketing_portfolio_summary: {
        Row: {
          avg_click_rate: number | null
          avg_open_rate: number | null
          calculated_at: string | null
          id: string
          period_end: string | null
          period_start: string | null
          period_type: string | null
          portfolio_nps_score: number | null
          total_ai_cost_cents: number | null
          total_campaigns_active: number | null
          total_campaigns_completed: number | null
          total_designs_approved: number | null
          total_designs_created: number | null
          total_email_cost_cents: number | null
          total_emails_clicked: number | null
          total_emails_delivered: number | null
          total_emails_opened: number | null
          total_emails_sent: number | null
          total_nps_responses: number | null
          total_orgs_active: number | null
          total_sms_cost_cents: number | null
          total_sms_delivered: number | null
          total_sms_opt_outs: number | null
          total_sms_sent: number | null
          total_social_engagement: number | null
          total_social_posts: number | null
        }
        Insert: {
          avg_click_rate?: number | null
          avg_open_rate?: number | null
          calculated_at?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          period_type?: string | null
          portfolio_nps_score?: number | null
          total_ai_cost_cents?: number | null
          total_campaigns_active?: number | null
          total_campaigns_completed?: number | null
          total_designs_approved?: number | null
          total_designs_created?: number | null
          total_email_cost_cents?: number | null
          total_emails_clicked?: number | null
          total_emails_delivered?: number | null
          total_emails_opened?: number | null
          total_emails_sent?: number | null
          total_nps_responses?: number | null
          total_orgs_active?: number | null
          total_sms_cost_cents?: number | null
          total_sms_delivered?: number | null
          total_sms_opt_outs?: number | null
          total_sms_sent?: number | null
          total_social_engagement?: number | null
          total_social_posts?: number | null
        }
        Update: {
          avg_click_rate?: number | null
          avg_open_rate?: number | null
          calculated_at?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          period_type?: string | null
          portfolio_nps_score?: number | null
          total_ai_cost_cents?: number | null
          total_campaigns_active?: number | null
          total_campaigns_completed?: number | null
          total_designs_approved?: number | null
          total_designs_created?: number | null
          total_email_cost_cents?: number | null
          total_emails_clicked?: number | null
          total_emails_delivered?: number | null
          total_emails_opened?: number | null
          total_emails_sent?: number | null
          total_nps_responses?: number | null
          total_orgs_active?: number | null
          total_sms_cost_cents?: number | null
          total_sms_delivered?: number | null
          total_sms_opt_outs?: number | null
          total_sms_sent?: number | null
          total_social_engagement?: number | null
          total_social_posts?: number | null
        }
        Relationships: []
      }
      curve_portfolio_summary: {
        Row: {
          curve_share_this_month: number
          curve_share_this_quarter: number
          id: string
          last_updated: string
          new_revenue_this_month: number
          new_revenue_this_quarter: number
          total_collected: number
          total_curve_share_earned: number
          total_investment_deployed: number
          total_investment_recovered: number
          total_invoiced: number
          total_new_revenue_generated: number
          total_orgs_active: number
          total_outstanding: number
        }
        Insert: {
          curve_share_this_month?: number
          curve_share_this_quarter?: number
          id?: string
          last_updated?: string
          new_revenue_this_month?: number
          new_revenue_this_quarter?: number
          total_collected?: number
          total_curve_share_earned?: number
          total_investment_deployed?: number
          total_investment_recovered?: number
          total_invoiced?: number
          total_new_revenue_generated?: number
          total_orgs_active?: number
          total_outstanding?: number
        }
        Update: {
          curve_share_this_month?: number
          curve_share_this_quarter?: number
          id?: string
          last_updated?: string
          new_revenue_this_month?: number
          new_revenue_this_quarter?: number
          total_collected?: number
          total_curve_share_earned?: number
          total_investment_deployed?: number
          total_investment_recovered?: number
          total_invoiced?: number
          total_new_revenue_generated?: number
          total_orgs_active?: number
          total_outstanding?: number
        }
        Relationships: []
      }
      derived_metrics: {
        Row: {
          active_project_engines: Json | null
          add_on_revenue: number | null
          add_on_revenue_per_player: number | null
          addon_opportunity_high: number | null
          addon_opportunity_low: number | null
          addon_score: number | null
          admin_alerts: Json | null
          affiliate_fee_opportunity_high: number | null
          affiliate_fee_opportunity_low: number | null
          affiliate_fee_revenue: number | null
          affiliate_revenue_per_affiliate: number | null
          affiliate_score: number | null
          affiliate_total_revenue: number | null
          annual_hs_equivalent: number | null
          annual_youth_equivalent: number | null
          apparel_opportunity_high: number | null
          apparel_opportunity_low: number | null
          apparel_score: number | null
          asset_score: number | null
          at_benchmark: boolean | null
          audience_score: number | null
          blended_annual_fee_overall: number | null
          calculated_at: string
          calculated_total_revenue: number | null
          can_reach_next_tier: boolean | null
          diagnosis_text: string | null
          dues_revenue: number | null
          dues_revenue_pct: number | null
          engagement_approach_recommendation: string | null
          engagement_complexity: string | null
          estimated_churned_players: number | null
          estimated_returning_players: number | null
          event_opportunity_high: number | null
          event_opportunity_low: number | null
          event_revenue_target: number | null
          event_score: number | null
          execution_risk: string | null
          facility_at_benchmark: boolean | null
          facility_opportunity_high: number | null
          facility_opportunity_low: number | null
          facility_revenue_benchmark: number | null
          facility_revenue_gap: number | null
          facility_revenue_pct: number | null
          facility_score: number | null
          fastest_path_engines: Json | null
          fastest_path_total_points: number | null
          fmv_per_sponsor_high: number | null
          fmv_per_sponsor_low: number | null
          growth_opportunity_direction: string | null
          hard_goods_margin_per_player_high: number | null
          hard_goods_margin_per_player_low: number | null
          high_dues_concentration: boolean | null
          high_sponsorship_dependency: boolean | null
          hs_fee_vs_market: string | null
          hs_player_pct: number | null
          id: string
          lessons_revenue_org: number | null
          market_multiplier: number | null
          market_position_health_score: number | null
          market_risk: string | null
          marketing_score: number | null
          marketing_tasks_complete: number
          marketing_tasks_total: number
          monetization_tier:
            | Database["public"]["Enums"]["monetization_tier"]
            | null
          next_steps: Json | null
          next_tier: string | null
          next_tier_threshold: number | null
          non_dues_revenue: number | null
          non_dues_revenue_per_player: number | null
          operations_health_score: number | null
          org_id: string
          overall_health_score: number | null
          platform_marketing_updated_at: string | null
          platform_score: number | null
          platform_tasks_complete: number
          platform_tasks_total: number
          points_to_next_tier: number | null
          pricing_benchmark_hs_high: number | null
          pricing_benchmark_hs_low: number | null
          pricing_benchmark_youth_high: number | null
          pricing_benchmark_youth_low: number | null
          pricing_opportunity_high: number | null
          pricing_opportunity_low: number | null
          pricing_score: number | null
          pricing_strategy_note: string | null
          priority_engine: string | null
          program_health_score: number | null
          project_aligned_with_fastest_path: boolean | null
          retention_health: string | null
          retention_opportunity_high: number | null
          retention_opportunity_low: number | null
          retention_referral_opportunity_high: number | null
          retention_referral_opportunity_low: number | null
          retention_risk: string | null
          retention_score: number | null
          revenue_benchmark: number | null
          revenue_gap: number | null
          revenue_per_event: number | null
          revenue_per_player: number | null
          revenue_protected_per_pct: number | null
          selection_leakage_flag: boolean | null
          sponsorship_opportunity_high: number | null
          sponsorship_opportunity_low: number | null
          sponsorship_revenue_per_sponsor: number | null
          sponsorship_score: number | null
          strategic_clarity_score: number | null
          tasks_generated_at: string | null
          total_engine_score: number | null
          total_opportunity_high: number | null
          total_opportunity_low: number | null
          uniform_margin_gap_per_player: number | null
          youth_fee_vs_market: string | null
        }
        Insert: {
          active_project_engines?: Json | null
          add_on_revenue?: number | null
          add_on_revenue_per_player?: number | null
          addon_opportunity_high?: number | null
          addon_opportunity_low?: number | null
          addon_score?: number | null
          admin_alerts?: Json | null
          affiliate_fee_opportunity_high?: number | null
          affiliate_fee_opportunity_low?: number | null
          affiliate_fee_revenue?: number | null
          affiliate_revenue_per_affiliate?: number | null
          affiliate_score?: number | null
          affiliate_total_revenue?: number | null
          annual_hs_equivalent?: number | null
          annual_youth_equivalent?: number | null
          apparel_opportunity_high?: number | null
          apparel_opportunity_low?: number | null
          apparel_score?: number | null
          asset_score?: number | null
          at_benchmark?: boolean | null
          audience_score?: number | null
          blended_annual_fee_overall?: number | null
          calculated_at?: string
          calculated_total_revenue?: number | null
          can_reach_next_tier?: boolean | null
          diagnosis_text?: string | null
          dues_revenue?: number | null
          dues_revenue_pct?: number | null
          engagement_approach_recommendation?: string | null
          engagement_complexity?: string | null
          estimated_churned_players?: number | null
          estimated_returning_players?: number | null
          event_opportunity_high?: number | null
          event_opportunity_low?: number | null
          event_revenue_target?: number | null
          event_score?: number | null
          execution_risk?: string | null
          facility_at_benchmark?: boolean | null
          facility_opportunity_high?: number | null
          facility_opportunity_low?: number | null
          facility_revenue_benchmark?: number | null
          facility_revenue_gap?: number | null
          facility_revenue_pct?: number | null
          facility_score?: number | null
          fastest_path_engines?: Json | null
          fastest_path_total_points?: number | null
          fmv_per_sponsor_high?: number | null
          fmv_per_sponsor_low?: number | null
          growth_opportunity_direction?: string | null
          hard_goods_margin_per_player_high?: number | null
          hard_goods_margin_per_player_low?: number | null
          high_dues_concentration?: boolean | null
          high_sponsorship_dependency?: boolean | null
          hs_fee_vs_market?: string | null
          hs_player_pct?: number | null
          id?: string
          lessons_revenue_org?: number | null
          market_multiplier?: number | null
          market_position_health_score?: number | null
          market_risk?: string | null
          marketing_score?: number | null
          marketing_tasks_complete?: number
          marketing_tasks_total?: number
          monetization_tier?:
            | Database["public"]["Enums"]["monetization_tier"]
            | null
          next_steps?: Json | null
          next_tier?: string | null
          next_tier_threshold?: number | null
          non_dues_revenue?: number | null
          non_dues_revenue_per_player?: number | null
          operations_health_score?: number | null
          org_id: string
          overall_health_score?: number | null
          platform_marketing_updated_at?: string | null
          platform_score?: number | null
          platform_tasks_complete?: number
          platform_tasks_total?: number
          points_to_next_tier?: number | null
          pricing_benchmark_hs_high?: number | null
          pricing_benchmark_hs_low?: number | null
          pricing_benchmark_youth_high?: number | null
          pricing_benchmark_youth_low?: number | null
          pricing_opportunity_high?: number | null
          pricing_opportunity_low?: number | null
          pricing_score?: number | null
          pricing_strategy_note?: string | null
          priority_engine?: string | null
          program_health_score?: number | null
          project_aligned_with_fastest_path?: boolean | null
          retention_health?: string | null
          retention_opportunity_high?: number | null
          retention_opportunity_low?: number | null
          retention_referral_opportunity_high?: number | null
          retention_referral_opportunity_low?: number | null
          retention_risk?: string | null
          retention_score?: number | null
          revenue_benchmark?: number | null
          revenue_gap?: number | null
          revenue_per_event?: number | null
          revenue_per_player?: number | null
          revenue_protected_per_pct?: number | null
          selection_leakage_flag?: boolean | null
          sponsorship_opportunity_high?: number | null
          sponsorship_opportunity_low?: number | null
          sponsorship_revenue_per_sponsor?: number | null
          sponsorship_score?: number | null
          strategic_clarity_score?: number | null
          tasks_generated_at?: string | null
          total_engine_score?: number | null
          total_opportunity_high?: number | null
          total_opportunity_low?: number | null
          uniform_margin_gap_per_player?: number | null
          youth_fee_vs_market?: string | null
        }
        Update: {
          active_project_engines?: Json | null
          add_on_revenue?: number | null
          add_on_revenue_per_player?: number | null
          addon_opportunity_high?: number | null
          addon_opportunity_low?: number | null
          addon_score?: number | null
          admin_alerts?: Json | null
          affiliate_fee_opportunity_high?: number | null
          affiliate_fee_opportunity_low?: number | null
          affiliate_fee_revenue?: number | null
          affiliate_revenue_per_affiliate?: number | null
          affiliate_score?: number | null
          affiliate_total_revenue?: number | null
          annual_hs_equivalent?: number | null
          annual_youth_equivalent?: number | null
          apparel_opportunity_high?: number | null
          apparel_opportunity_low?: number | null
          apparel_score?: number | null
          asset_score?: number | null
          at_benchmark?: boolean | null
          audience_score?: number | null
          blended_annual_fee_overall?: number | null
          calculated_at?: string
          calculated_total_revenue?: number | null
          can_reach_next_tier?: boolean | null
          diagnosis_text?: string | null
          dues_revenue?: number | null
          dues_revenue_pct?: number | null
          engagement_approach_recommendation?: string | null
          engagement_complexity?: string | null
          estimated_churned_players?: number | null
          estimated_returning_players?: number | null
          event_opportunity_high?: number | null
          event_opportunity_low?: number | null
          event_revenue_target?: number | null
          event_score?: number | null
          execution_risk?: string | null
          facility_at_benchmark?: boolean | null
          facility_opportunity_high?: number | null
          facility_opportunity_low?: number | null
          facility_revenue_benchmark?: number | null
          facility_revenue_gap?: number | null
          facility_revenue_pct?: number | null
          facility_score?: number | null
          fastest_path_engines?: Json | null
          fastest_path_total_points?: number | null
          fmv_per_sponsor_high?: number | null
          fmv_per_sponsor_low?: number | null
          growth_opportunity_direction?: string | null
          hard_goods_margin_per_player_high?: number | null
          hard_goods_margin_per_player_low?: number | null
          high_dues_concentration?: boolean | null
          high_sponsorship_dependency?: boolean | null
          hs_fee_vs_market?: string | null
          hs_player_pct?: number | null
          id?: string
          lessons_revenue_org?: number | null
          market_multiplier?: number | null
          market_position_health_score?: number | null
          market_risk?: string | null
          marketing_score?: number | null
          marketing_tasks_complete?: number
          marketing_tasks_total?: number
          monetization_tier?:
            | Database["public"]["Enums"]["monetization_tier"]
            | null
          next_steps?: Json | null
          next_tier?: string | null
          next_tier_threshold?: number | null
          non_dues_revenue?: number | null
          non_dues_revenue_per_player?: number | null
          operations_health_score?: number | null
          org_id?: string
          overall_health_score?: number | null
          platform_marketing_updated_at?: string | null
          platform_score?: number | null
          platform_tasks_complete?: number
          platform_tasks_total?: number
          points_to_next_tier?: number | null
          pricing_benchmark_hs_high?: number | null
          pricing_benchmark_hs_low?: number | null
          pricing_benchmark_youth_high?: number | null
          pricing_benchmark_youth_low?: number | null
          pricing_opportunity_high?: number | null
          pricing_opportunity_low?: number | null
          pricing_score?: number | null
          pricing_strategy_note?: string | null
          priority_engine?: string | null
          program_health_score?: number | null
          project_aligned_with_fastest_path?: boolean | null
          retention_health?: string | null
          retention_opportunity_high?: number | null
          retention_opportunity_low?: number | null
          retention_referral_opportunity_high?: number | null
          retention_referral_opportunity_low?: number | null
          retention_risk?: string | null
          retention_score?: number | null
          revenue_benchmark?: number | null
          revenue_gap?: number | null
          revenue_per_event?: number | null
          revenue_per_player?: number | null
          revenue_protected_per_pct?: number | null
          selection_leakage_flag?: boolean | null
          sponsorship_opportunity_high?: number | null
          sponsorship_opportunity_low?: number | null
          sponsorship_revenue_per_sponsor?: number | null
          sponsorship_score?: number | null
          strategic_clarity_score?: number | null
          tasks_generated_at?: string | null
          total_engine_score?: number | null
          total_opportunity_high?: number | null
          total_opportunity_low?: number | null
          uniform_margin_gap_per_player?: number | null
          youth_fee_vs_market?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "derived_metrics_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      design_refinements: {
        Row: {
          created_at: string
          design_id: string
          id: string
          new_html: string | null
          previous_html: string | null
          refined_by: string | null
          refinement_prompt: string
        }
        Insert: {
          created_at?: string
          design_id: string
          id?: string
          new_html?: string | null
          previous_html?: string | null
          refined_by?: string | null
          refinement_prompt: string
        }
        Update: {
          created_at?: string
          design_id?: string
          id?: string
          new_html?: string | null
          previous_html?: string | null
          refined_by?: string | null
          refinement_prompt?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_refinements_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
        ]
      }
      design_system_prompts: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          prompt_template: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          prompt_template: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          prompt_template?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      design_templates: {
        Row: {
          active: boolean
          base_prompt: string
          category: string
          composition_config: Json | null
          created_at: string
          design_type: string
          dimensions: Json
          example_output: string | null
          generation_engine: string | null
          hero_source: string
          id: string
          input_fields: Json
          is_system: boolean
          mood: string | null
          name: string
          owner_org_id: string | null
          sort_order: number
          stability_model: string | null
          stability_prompt_template: string | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_prompt: string
          category?: string
          composition_config?: Json | null
          created_at?: string
          design_type: string
          dimensions?: Json
          example_output?: string | null
          generation_engine?: string | null
          hero_source?: string
          id?: string
          input_fields?: Json
          is_system?: boolean
          mood?: string | null
          name: string
          owner_org_id?: string | null
          sort_order?: number
          stability_model?: string | null
          stability_prompt_template?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_prompt?: string
          category?: string
          composition_config?: Json | null
          created_at?: string
          design_type?: string
          dimensions?: Json
          example_output?: string | null
          generation_engine?: string | null
          hero_source?: string
          id?: string
          input_fields?: Json
          is_system?: boolean
          mood?: string | null
          name?: string
          owner_org_id?: string | null
          sort_order?: number
          stability_model?: string | null
          stability_prompt_template?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_templates_owner_org_id_fkey"
            columns: ["owner_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      designs: {
        Row: {
          ai_model_used: string | null
          approved_at: string | null
          approved_by: string | null
          assets_used: Json
          composition_config: Json | null
          composition_spec: Json | null
          created_at: string
          created_by: string | null
          created_by_role: string | null
          design_type: string
          export_urls: Json | null
          field_values: Json | null
          generated_html: string | null
          generation_cost_cents: number | null
          generation_engine: string | null
          generation_error: string | null
          generation_started_at: string | null
          generation_time_ms: number | null
          hero_image_url: string | null
          hero_seed: string | null
          id: string
          name: string | null
          org_id: string
          parent_design_id: string | null
          preview_url: string | null
          prompt_input: Json | null
          skin_id: string | null
          stability_image_url: string | null
          stability_prompt: string | null
          stability_seed: number | null
          status: string
          style_modifier: string | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          ai_model_used?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assets_used?: Json
          composition_config?: Json | null
          composition_spec?: Json | null
          created_at?: string
          created_by?: string | null
          created_by_role?: string | null
          design_type: string
          export_urls?: Json | null
          field_values?: Json | null
          generated_html?: string | null
          generation_cost_cents?: number | null
          generation_engine?: string | null
          generation_error?: string | null
          generation_started_at?: string | null
          generation_time_ms?: number | null
          hero_image_url?: string | null
          hero_seed?: string | null
          id?: string
          name?: string | null
          org_id: string
          parent_design_id?: string | null
          preview_url?: string | null
          prompt_input?: Json | null
          skin_id?: string | null
          stability_image_url?: string | null
          stability_prompt?: string | null
          stability_seed?: number | null
          status?: string
          style_modifier?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          ai_model_used?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assets_used?: Json
          composition_config?: Json | null
          composition_spec?: Json | null
          created_at?: string
          created_by?: string | null
          created_by_role?: string | null
          design_type?: string
          export_urls?: Json | null
          field_values?: Json | null
          generated_html?: string | null
          generation_cost_cents?: number | null
          generation_engine?: string | null
          generation_error?: string | null
          generation_started_at?: string | null
          generation_time_ms?: number | null
          hero_image_url?: string | null
          hero_seed?: string | null
          id?: string
          name?: string | null
          org_id?: string
          parent_design_id?: string | null
          preview_url?: string | null
          prompt_input?: Json | null
          skin_id?: string | null
          stability_image_url?: string | null
          stability_prompt?: string | null
          stability_seed?: number | null
          status?: string
          style_modifier?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "designs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_parent_design_id_fkey"
            columns: ["parent_design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "design_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          description: string | null
          id: string
          input_fields: Json | null
          is_system: boolean
          jsx_source: string | null
          mjml_source: string | null
          name: string
          owner_org_id: string | null
          preview_props: Json | null
          rendering_engine: string
          sort_order: number | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          input_fields?: Json | null
          is_system?: boolean
          jsx_source?: string | null
          mjml_source?: string | null
          name: string
          owner_org_id?: string | null
          preview_props?: Json | null
          rendering_engine?: string
          sort_order?: number | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          input_fields?: Json | null
          is_system?: boolean
          jsx_source?: string | null
          mjml_source?: string | null
          name?: string
          owner_org_id?: string | null
          preview_props?: Json | null
          rendering_engine?: string
          sort_order?: number | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_owner_org_id_fkey"
            columns: ["owner_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      event_survey_responses: {
        Row: {
          check_delivery_email: string | null
          check_payable_to: string | null
          extra: Json | null
          first_name: string
          id: string
          ip_address: string | null
          last_name: string
          notes: string | null
          organization: string
          payment_method: string
          personal_email: string
          phone: string
          submitted_at: string
          survey_id: string
          w9_file_name: string | null
          w9_file_path: string | null
          zelle_id: string | null
          zelle_id_type: string | null
        }
        Insert: {
          check_delivery_email?: string | null
          check_payable_to?: string | null
          extra?: Json | null
          first_name: string
          id?: string
          ip_address?: string | null
          last_name: string
          notes?: string | null
          organization: string
          payment_method: string
          personal_email: string
          phone: string
          submitted_at?: string
          survey_id: string
          w9_file_name?: string | null
          w9_file_path?: string | null
          zelle_id?: string | null
          zelle_id_type?: string | null
        }
        Update: {
          check_delivery_email?: string | null
          check_payable_to?: string | null
          extra?: Json | null
          first_name?: string
          id?: string
          ip_address?: string | null
          last_name?: string
          notes?: string | null
          organization?: string
          payment_method?: string
          personal_email?: string
          phone?: string
          submitted_at?: string
          survey_id?: string
          w9_file_name?: string | null
          w9_file_path?: string | null
          zelle_id?: string | null
          zelle_id_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "event_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      event_surveys: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          fields: Json
          id: string
          instructions: string | null
          is_active: boolean
          slug: string
          title: string
          updated_at: string
          w9_template_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields?: Json
          id?: string
          instructions?: string | null
          is_active?: boolean
          slug: string
          title?: string
          updated_at?: string
          w9_template_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields?: Json
          id?: string
          instructions?: string | null
          is_active?: boolean
          slug?: string
          title?: string
          updated_at?: string
          w9_template_url?: string | null
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string | null
          is_primary: boolean
          org_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["invitation_status"]
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          is_primary?: boolean
          org_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          is_primary?: boolean
          org_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_send_log: {
        Row: {
          action_link: string | null
          created_at: string
          email: string
          email_error: string | null
          id: string
          link_type: string | null
          org_id: string | null
          sent_email: boolean
          triggered_by: string | null
          user_existed: boolean | null
          was_confirmed: boolean | null
        }
        Insert: {
          action_link?: string | null
          created_at?: string
          email: string
          email_error?: string | null
          id?: string
          link_type?: string | null
          org_id?: string | null
          sent_email?: boolean
          triggered_by?: string | null
          user_existed?: boolean | null
          was_confirmed?: boolean | null
        }
        Update: {
          action_link?: string | null
          created_at?: string
          email?: string
          email_error?: string | null
          id?: string
          link_type?: string | null
          org_id?: string | null
          sent_email?: boolean
          triggered_by?: string | null
          user_existed?: boolean | null
          was_confirmed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_send_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      magic_links: {
        Row: {
          action: string
          campaign_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          org_id: string
          payload: Json
          token: string
          used_at: string | null
          used_by_email: string | null
        }
        Insert: {
          action: string
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          org_id: string
          payload?: Json
          token: string
          used_at?: string | null
          used_by_email?: string | null
        }
        Update: {
          action?: string
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          org_id?: string
          payload?: Json
          token?: string
          used_at?: string | null
          used_by_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "magic_links_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "magic_links_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "org_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "magic_links_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          id: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          org_id: string | null
          recipient_role: Database["public"]["Enums"]["notification_recipient_role"]
          sent_at: string
          task_ids: Json
        }
        Insert: {
          id?: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          org_id?: string | null
          recipient_role: Database["public"]["Enums"]["notification_recipient_role"]
          sent_at?: string
          task_ids?: Json
        }
        Update: {
          id?: string
          notification_type?: Database["public"]["Enums"]["notification_type"]
          org_id?: string | null
          recipient_role?: Database["public"]["Enums"]["notification_recipient_role"]
          sent_at?: string
          task_ids?: Json
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_ab_test_runs: {
        Row: {
          created_at: string
          created_by: string | null
          decision_window_hours: number
          id: string
          name: string
          org_id: string
          sample_size: number | null
          status: string
          test_type: string
          updated_at: string
          variant_a_email_send_id: string | null
          variant_b_email_send_id: string | null
          winner_metric: string
          winner_picked_at: string | null
          winner_variant: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          decision_window_hours?: number
          id?: string
          name: string
          org_id: string
          sample_size?: number | null
          status?: string
          test_type?: string
          updated_at?: string
          variant_a_email_send_id?: string | null
          variant_b_email_send_id?: string | null
          winner_metric?: string
          winner_picked_at?: string | null
          winner_variant?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          decision_window_hours?: number
          id?: string
          name?: string
          org_id?: string
          sample_size?: number | null
          status?: string
          test_type?: string
          updated_at?: string
          variant_a_email_send_id?: string | null
          variant_b_email_send_id?: string | null
          winner_metric?: string
          winner_picked_at?: string | null
          winner_variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_ab_test_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_ab_test_runs_variant_a_email_send_id_fkey"
            columns: ["variant_a_email_send_id"]
            isOneToOne: false
            referencedRelation: "org_email_sends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_ab_test_runs_variant_b_email_send_id_fkey"
            columns: ["variant_b_email_send_id"]
            isOneToOne: false
            referencedRelation: "org_email_sends"
            referencedColumns: ["id"]
          },
        ]
      }
      org_ayrshare_profiles: {
        Row: {
          active: boolean
          ayrshare_profile_key: string
          ayrshare_ref_id: string | null
          created_at: string
          display_title: string | null
          id: string
          is_mock: boolean
          org_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          ayrshare_profile_key: string
          ayrshare_ref_id?: string | null
          created_at?: string
          display_title?: string | null
          id?: string
          is_mock?: boolean
          org_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          ayrshare_profile_key?: string
          ayrshare_ref_id?: string | null
          created_at?: string
          display_title?: string | null
          id?: string
          is_mock?: boolean
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_ayrshare_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_brand_assets: {
        Row: {
          ai_tags: string[]
          alt_text: string | null
          archived: boolean
          asset_type: string
          body_text: string | null
          caption: string | null
          duration_seconds: number | null
          file_size_bytes: number | null
          filename: string | null
          height: number | null
          id: string
          last_used_at: string | null
          media_type: string
          mime_type: string | null
          org_id: string
          poster_url: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string | null
          uploaded_at: string
          uploaded_by: string | null
          url: string | null
          used_count: number
          width: number | null
        }
        Insert: {
          ai_tags?: string[]
          alt_text?: string | null
          archived?: boolean
          asset_type?: string
          body_text?: string | null
          caption?: string | null
          duration_seconds?: number | null
          file_size_bytes?: number | null
          filename?: string | null
          height?: number | null
          id?: string
          last_used_at?: string | null
          media_type?: string
          mime_type?: string | null
          org_id: string
          poster_url?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          url?: string | null
          used_count?: number
          width?: number | null
        }
        Update: {
          ai_tags?: string[]
          alt_text?: string | null
          archived?: boolean
          asset_type?: string
          body_text?: string | null
          caption?: string | null
          duration_seconds?: number | null
          file_size_bytes?: number | null
          filename?: string | null
          height?: number | null
          id?: string
          last_used_at?: string | null
          media_type?: string
          mime_type?: string | null
          org_id?: string
          poster_url?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          url?: string | null
          used_count?: number
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "org_brand_assets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_brand_kits: {
        Row: {
          brand_voice_notes: string | null
          color_accent: string | null
          color_dark: string | null
          color_light: string | null
          color_primary: string | null
          color_secondary: string | null
          created_at: string
          font_body: string | null
          font_heading: string | null
          hashtags: string[] | null
          id: string
          logo_mark_url: string | null
          logo_primary_url: string | null
          logo_secondary_url: string | null
          org_id: string
          tagline: string | null
          updated_at: string
        }
        Insert: {
          brand_voice_notes?: string | null
          color_accent?: string | null
          color_dark?: string | null
          color_light?: string | null
          color_primary?: string | null
          color_secondary?: string | null
          created_at?: string
          font_body?: string | null
          font_heading?: string | null
          hashtags?: string[] | null
          id?: string
          logo_mark_url?: string | null
          logo_primary_url?: string | null
          logo_secondary_url?: string | null
          org_id: string
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          brand_voice_notes?: string | null
          color_accent?: string | null
          color_dark?: string | null
          color_light?: string | null
          color_primary?: string | null
          color_secondary?: string | null
          created_at?: string
          font_body?: string | null
          font_heading?: string | null
          hashtags?: string[] | null
          id?: string
          logo_mark_url?: string | null
          logo_primary_url?: string | null
          logo_secondary_url?: string | null
          org_id?: string
          tagline?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_brand_kits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_branding: {
        Row: {
          accent_hsl: string | null
          logo_format: string | null
          logo_height: number | null
          logo_original_url: string | null
          logo_processing_error: string | null
          logo_processing_status: string | null
          logo_quality: string | null
          logo_url: string | null
          logo_width: number | null
          org_id: string
          primary_hsl: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accent_hsl?: string | null
          logo_format?: string | null
          logo_height?: number | null
          logo_original_url?: string | null
          logo_processing_error?: string | null
          logo_processing_status?: string | null
          logo_quality?: string | null
          logo_url?: string | null
          logo_width?: number | null
          org_id: string
          primary_hsl?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accent_hsl?: string | null
          logo_format?: string | null
          logo_height?: number | null
          logo_original_url?: string | null
          logo_processing_error?: string | null
          logo_processing_status?: string | null
          logo_quality?: string | null
          logo_url?: string | null
          logo_width?: number | null
          org_id?: string
          primary_hsl?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_branding_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_calculator_scenarios: {
        Row: {
          calculator_type: string
          id: string
          input_values: Json
          notes: string | null
          org_id: string
          output_values: Json
          saved_at: string
          saved_by: string
          scenario_label: string
          updated_at: string
        }
        Insert: {
          calculator_type: string
          id?: string
          input_values?: Json
          notes?: string | null
          org_id: string
          output_values?: Json
          saved_at?: string
          saved_by: string
          scenario_label: string
          updated_at?: string
        }
        Update: {
          calculator_type?: string
          id?: string
          input_values?: Json
          notes?: string | null
          org_id?: string
          output_values?: Json
          saved_at?: string
          saved_by?: string
          scenario_label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_calculator_scenarios_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_calendar_items: {
        Row: {
          ai_communication_type: string | null
          calculated_due_date: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_custom: boolean
          is_non_negotiable: boolean
          is_sent: boolean
          is_system_item: boolean
          is_tbd: boolean
          org_id: string
          phase: string
          recurrence_day: string | null
          recurrence_frequency: string | null
          recurrence_note: string | null
          season_id: string
          sent_at: string | null
          sent_by: string | null
          sent_notes: string | null
          stakeholder: string
          system_code: string | null
          timing_anchor: string | null
          timing_direction: string | null
          timing_note: string | null
          timing_offset_days: number | null
          timing_type: string
          title: string
          track: string | null
          updated_at: string
        }
        Insert: {
          ai_communication_type?: string | null
          calculated_due_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_custom?: boolean
          is_non_negotiable?: boolean
          is_sent?: boolean
          is_system_item?: boolean
          is_tbd?: boolean
          org_id: string
          phase: string
          recurrence_day?: string | null
          recurrence_frequency?: string | null
          recurrence_note?: string | null
          season_id: string
          sent_at?: string | null
          sent_by?: string | null
          sent_notes?: string | null
          stakeholder: string
          system_code?: string | null
          timing_anchor?: string | null
          timing_direction?: string | null
          timing_note?: string | null
          timing_offset_days?: number | null
          timing_type: string
          title: string
          track?: string | null
          updated_at?: string
        }
        Update: {
          ai_communication_type?: string | null
          calculated_due_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_custom?: boolean
          is_non_negotiable?: boolean
          is_sent?: boolean
          is_system_item?: boolean
          is_tbd?: boolean
          org_id?: string
          phase?: string
          recurrence_day?: string | null
          recurrence_frequency?: string | null
          recurrence_note?: string | null
          season_id?: string
          sent_at?: string | null
          sent_by?: string | null
          sent_notes?: string | null
          stakeholder?: string
          system_code?: string | null
          timing_anchor?: string | null
          timing_direction?: string | null
          timing_note?: string | null
          timing_offset_days?: number | null
          timing_type?: string
          title?: string
          track?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_calendar_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_calendar_items_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "org_communication_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      org_communication_log: {
        Row: {
          calendar_item_id: string | null
          communication_type: string
          external_message_id: string | null
          format: string | null
          generated_at: string
          generated_by: string
          generated_on_behalf_of_org: boolean
          id: string
          org_id: string
          outreach_track: string | null
          prompt_text: string | null
          send_body_excerpt: string | null
          send_channel: string | null
          send_platform_id: string | null
          send_recipient: string | null
          send_subject: string | null
          sent_at: string | null
          tone: string | null
          was_refined: boolean
        }
        Insert: {
          calendar_item_id?: string | null
          communication_type: string
          external_message_id?: string | null
          format?: string | null
          generated_at?: string
          generated_by: string
          generated_on_behalf_of_org?: boolean
          id?: string
          org_id: string
          outreach_track?: string | null
          prompt_text?: string | null
          send_body_excerpt?: string | null
          send_channel?: string | null
          send_platform_id?: string | null
          send_recipient?: string | null
          send_subject?: string | null
          sent_at?: string | null
          tone?: string | null
          was_refined?: boolean
        }
        Update: {
          calendar_item_id?: string | null
          communication_type?: string
          external_message_id?: string | null
          format?: string | null
          generated_at?: string
          generated_by?: string
          generated_on_behalf_of_org?: boolean
          id?: string
          org_id?: string
          outreach_track?: string | null
          prompt_text?: string | null
          send_body_excerpt?: string | null
          send_channel?: string | null
          send_platform_id?: string | null
          send_recipient?: string | null
          send_subject?: string | null
          sent_at?: string | null
          tone?: string | null
          was_refined?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "org_communication_log_calendar_item_id_fkey"
            columns: ["calendar_item_id"]
            isOneToOne: false
            referencedRelation: "org_calendar_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_communication_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_communication_log_send_platform_id_fkey"
            columns: ["send_platform_id"]
            isOneToOne: false
            referencedRelation: "org_send_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      org_communication_seasons: {
        Row: {
          created_at: string
          created_by: string
          has_tryouts: boolean
          id: string
          org_id: string
          re_enrollment_deadline: string | null
          season_end_date: string
          season_name: string
          season_start_date: string
          status: string
          track: string
          tryout_date: string | null
          tryout_date_tbd: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          has_tryouts?: boolean
          id?: string
          org_id: string
          re_enrollment_deadline?: string | null
          season_end_date: string
          season_name: string
          season_start_date: string
          status?: string
          track: string
          tryout_date?: string | null
          tryout_date_tbd?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          has_tryouts?: boolean
          id?: string
          org_id?: string
          re_enrollment_deadline?: string | null
          season_end_date?: string
          season_name?: string
          season_start_date?: string
          status?: string
          track?: string
          tryout_date?: string | null
          tryout_date_tbd?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_communication_seasons_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_communication_standards: {
        Row: {
          created_at: string
          id: string
          last_updated_by: string | null
          org_id: string
          standards_content: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_updated_by?: string | null
          org_id: string
          standards_content: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_updated_by?: string | null
          org_id?: string
          standards_content?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_communication_standards_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_communication_tracks: {
        Row: {
          created_at: string
          has_hs_track: boolean
          has_youth_track: boolean
          id: string
          org_id: string
          tracks_configured_at: string | null
          tracks_configured_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          has_hs_track?: boolean
          has_youth_track?: boolean
          id?: string
          org_id: string
          tracks_configured_at?: string | null
          tracks_configured_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          has_hs_track?: boolean
          has_youth_track?: boolean
          id?: string
          org_id?: string
          tracks_configured_at?: string | null
          tracks_configured_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_communication_tracks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_contact_group_members: {
        Row: {
          added_at: string
          contact_id: string
          group_id: string
          org_id: string
        }
        Insert: {
          added_at?: string
          contact_id: string
          group_id: string
          org_id: string
        }
        Update: {
          added_at?: string
          contact_id?: string
          group_id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_contact_group_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "org_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_contact_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "org_contact_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_contact_group_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_contact_groups: {
        Row: {
          created_at: string
          description: string | null
          group_type: string
          id: string
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          group_type?: string
          id?: string
          name: string
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          group_type?: string
          id?: string
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_contact_groups_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_contact_segments: {
        Row: {
          contact_count: number
          created_at: string
          description: string | null
          filter_rules: Json
          id: string
          is_system: boolean
          name: string
          org_id: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          contact_count?: number
          created_at?: string
          description?: string | null
          filter_rules?: Json
          id?: string
          is_system?: boolean
          name: string
          org_id: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          contact_count?: number
          created_at?: string
          description?: string | null
          filter_rules?: Json
          id?: string
          is_system?: boolean
          name?: string
          org_id?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_contact_segments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_contact_segments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "org_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      org_contact_uploads: {
        Row: {
          created_at: string
          duplicates_merged: number | null
          error_details: Json | null
          errors: number | null
          filename: string | null
          id: string
          org_id: string
          status: string
          successful_imports: number | null
          total_rows: number | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          duplicates_merged?: number | null
          error_details?: Json | null
          errors?: number | null
          filename?: string | null
          id?: string
          org_id: string
          status?: string
          successful_imports?: number | null
          total_rows?: number | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          duplicates_merged?: number | null
          error_details?: Json | null
          errors?: number | null
          filename?: string | null
          id?: string
          org_id?: string
          status?: string
          successful_imports?: number | null
          total_rows?: number | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_contact_uploads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_contacts: {
        Row: {
          archived_at: string | null
          best_send_hour: number | null
          contact_type: string
          created_at: string
          custom_fields: Json | null
          email: string | null
          first_name: string | null
          hard_bounce: boolean
          id: string
          last_engaged_at: string | null
          last_name: string | null
          org_id: string
          parent_of_contact_id: string | null
          phone: string | null
          phone_normalized: string | null
          player_grad_year: number | null
          season: string | null
          sms_opt_in: boolean
          sms_opt_in_date: string | null
          source: string | null
          source_batch_id: string | null
          team_assignments: string[] | null
          unsubscribed: boolean
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          best_send_hour?: number | null
          contact_type?: string
          created_at?: string
          custom_fields?: Json | null
          email?: string | null
          first_name?: string | null
          hard_bounce?: boolean
          id?: string
          last_engaged_at?: string | null
          last_name?: string | null
          org_id: string
          parent_of_contact_id?: string | null
          phone?: string | null
          phone_normalized?: string | null
          player_grad_year?: number | null
          season?: string | null
          sms_opt_in?: boolean
          sms_opt_in_date?: string | null
          source?: string | null
          source_batch_id?: string | null
          team_assignments?: string[] | null
          unsubscribed?: boolean
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          best_send_hour?: number | null
          contact_type?: string
          created_at?: string
          custom_fields?: Json | null
          email?: string | null
          first_name?: string | null
          hard_bounce?: boolean
          id?: string
          last_engaged_at?: string | null
          last_name?: string | null
          org_id?: string
          parent_of_contact_id?: string | null
          phone?: string | null
          phone_normalized?: string | null
          player_grad_year?: number | null
          season?: string | null
          sms_opt_in?: boolean
          sms_opt_in_date?: string | null
          source?: string | null
          source_batch_id?: string | null
          team_assignments?: string[] | null
          unsubscribed?: boolean
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_contacts_parent_of_contact_id_fkey"
            columns: ["parent_of_contact_id"]
            isOneToOne: false
            referencedRelation: "org_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      org_content_collection_items: {
        Row: {
          added_at: string
          asset_id: string
          collection_id: string
        }
        Insert: {
          added_at?: string
          asset_id: string
          collection_id: string
        }
        Update: {
          added_at?: string
          asset_id?: string
          collection_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_content_collection_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "org_brand_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_content_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "org_content_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      org_content_collections: {
        Row: {
          cover_asset_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          cover_asset_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          org_id: string
          updated_at?: string
        }
        Update: {
          cover_asset_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_content_collections_cover_asset_id_fkey"
            columns: ["cover_asset_id"]
            isOneToOne: false
            referencedRelation: "org_brand_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_content_collections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_contract_installments: {
        Row: {
          amount: number
          contract_id: string
          created_at: string
          due_date: string | null
          id: string
          installment_number: number
          is_paid: boolean
          logged_by: string | null
          org_id: string
          paid_date: string | null
          payment_notes: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          contract_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          installment_number: number
          is_paid?: boolean
          logged_by?: string | null
          org_id: string
          paid_date?: string | null
          payment_notes?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          contract_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          installment_number?: number
          is_paid?: boolean
          logged_by?: string | null
          org_id?: string
          paid_date?: string | null
          payment_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_contract_installments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "org_engagement_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_contract_installments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_cost_log: {
        Row: {
          amount_usd: number
          cost_type: string
          description: string | null
          id: string
          meta: Json | null
          occurred_at: string
          org_id: string
          units: number | null
        }
        Insert: {
          amount_usd?: number
          cost_type: string
          description?: string | null
          id?: string
          meta?: Json | null
          occurred_at?: string
          org_id: string
          units?: number | null
        }
        Update: {
          amount_usd?: number
          cost_type?: string
          description?: string | null
          id?: string
          meta?: Json | null
          occurred_at?: string
          org_id?: string
          units?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "org_cost_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_digital_audits: {
        Row: {
          ai_summary: string | null
          audit_type: string
          comparison_to_previous: Json | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          fixes: Json | null
          id: string
          model_used: string | null
          org_id: string
          overall_score: number | null
          previous_audit_id: string | null
          scores_breakdown: Json | null
          scraped_pages: Json | null
          social_evidence: Json | null
          social_score: number | null
          sponsor_flags: Json | null
          status: string
          trigger_source: string
          triggered_by: string | null
          website_score: number | null
          wins: Json | null
        }
        Insert: {
          ai_summary?: string | null
          audit_type: string
          comparison_to_previous?: Json | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          fixes?: Json | null
          id?: string
          model_used?: string | null
          org_id: string
          overall_score?: number | null
          previous_audit_id?: string | null
          scores_breakdown?: Json | null
          scraped_pages?: Json | null
          social_evidence?: Json | null
          social_score?: number | null
          sponsor_flags?: Json | null
          status?: string
          trigger_source?: string
          triggered_by?: string | null
          website_score?: number | null
          wins?: Json | null
        }
        Update: {
          ai_summary?: string | null
          audit_type?: string
          comparison_to_previous?: Json | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          fixes?: Json | null
          id?: string
          model_used?: string | null
          org_id?: string
          overall_score?: number | null
          previous_audit_id?: string | null
          scores_breakdown?: Json | null
          scraped_pages?: Json | null
          social_evidence?: Json | null
          social_score?: number | null
          sponsor_flags?: Json | null
          status?: string
          trigger_source?: string
          triggered_by?: string | null
          website_score?: number | null
          wins?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "org_digital_audits_previous_audit_id_fkey"
            columns: ["previous_audit_id"]
            isOneToOne: false
            referencedRelation: "org_digital_audits"
            referencedColumns: ["id"]
          },
        ]
      }
      org_digital_presence: {
        Row: {
          created_at: string
          facebook_url: string | null
          id: string
          instagram_handle: string | null
          linkedin_url: string | null
          org_id: string
          posting_frequency: string | null
          primary_audience_notes: string | null
          recent_post_urls: Json
          social_post_samples: Json | null
          tiktok_handle: string | null
          updated_at: string
          updated_by: string | null
          website_url: string | null
          x_handle: string | null
          youtube_url: string | null
        }
        Insert: {
          created_at?: string
          facebook_url?: string | null
          id?: string
          instagram_handle?: string | null
          linkedin_url?: string | null
          org_id: string
          posting_frequency?: string | null
          primary_audience_notes?: string | null
          recent_post_urls?: Json
          social_post_samples?: Json | null
          tiktok_handle?: string | null
          updated_at?: string
          updated_by?: string | null
          website_url?: string | null
          x_handle?: string | null
          youtube_url?: string | null
        }
        Update: {
          created_at?: string
          facebook_url?: string | null
          id?: string
          instagram_handle?: string | null
          linkedin_url?: string | null
          org_id?: string
          posting_frequency?: string | null
          primary_audience_notes?: string | null
          recent_post_urls?: Json
          social_post_samples?: Json | null
          tiktok_handle?: string | null
          updated_at?: string
          updated_by?: string | null
          website_url?: string | null
          x_handle?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      org_email_ab_tests: {
        Row: {
          campaign_asset_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          email_id: string | null
          id: string
          org_id: string
          split_pct: number
          started_at: string | null
          status: string
          test_window_hours: number
          updated_at: string
          variant_a_clicks: number
          variant_a_opens: number
          variant_a_preview: string | null
          variant_a_sent: number
          variant_a_subject: string
          variant_b_clicks: number
          variant_b_opens: number
          variant_b_preview: string | null
          variant_b_sent: number
          variant_b_subject: string
          winner_metric: string
          winner_variant: string | null
        }
        Insert: {
          campaign_asset_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          email_id?: string | null
          id?: string
          org_id: string
          split_pct?: number
          started_at?: string | null
          status?: string
          test_window_hours?: number
          updated_at?: string
          variant_a_clicks?: number
          variant_a_opens?: number
          variant_a_preview?: string | null
          variant_a_sent?: number
          variant_a_subject: string
          variant_b_clicks?: number
          variant_b_opens?: number
          variant_b_preview?: string | null
          variant_b_sent?: number
          variant_b_subject: string
          winner_metric?: string
          winner_variant?: string | null
        }
        Update: {
          campaign_asset_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          email_id?: string | null
          id?: string
          org_id?: string
          split_pct?: number
          started_at?: string | null
          status?: string
          test_window_hours?: number
          updated_at?: string
          variant_a_clicks?: number
          variant_a_opens?: number
          variant_a_preview?: string | null
          variant_a_sent?: number
          variant_a_subject?: string
          variant_b_clicks?: number
          variant_b_opens?: number
          variant_b_preview?: string | null
          variant_b_sent?: number
          variant_b_subject?: string
          winner_metric?: string
          winner_variant?: string | null
        }
        Relationships: []
      }
      org_email_domains: {
        Row: {
          created_at: string
          dkim_verified: boolean
          domain: string
          from_email: string | null
          from_name: string | null
          id: string
          is_default: boolean
          org_id: string
          provider_domain_id: string | null
          spf_verified: boolean
          verification_records: Json | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          dkim_verified?: boolean
          domain: string
          from_email?: string | null
          from_name?: string | null
          id?: string
          is_default?: boolean
          org_id: string
          provider_domain_id?: string | null
          spf_verified?: boolean
          verification_records?: Json | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          dkim_verified?: boolean
          domain?: string
          from_email?: string | null
          from_name?: string | null
          id?: string
          is_default?: boolean
          org_id?: string
          provider_domain_id?: string | null
          spf_verified?: boolean
          verification_records?: Json | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_email_domains_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_email_events: {
        Row: {
          contact_id: string | null
          email: string | null
          event_data: Json | null
          event_type: string
          id: string
          occurred_at: string
          send_id: string
        }
        Insert: {
          contact_id?: string | null
          email?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          occurred_at?: string
          send_id: string
        }
        Update: {
          contact_id?: string | null
          email?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          occurred_at?: string
          send_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_email_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "org_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_email_events_send_id_fkey"
            columns: ["send_id"]
            isOneToOne: false
            referencedRelation: "org_email_sends"
            referencedColumns: ["id"]
          },
        ]
      }
      org_email_send_queue: {
        Row: {
          attempts: number
          contact_id: string
          created_at: string
          email_send_id: string
          id: string
          last_error: string | null
          org_id: string
          scheduled_for: string
          sent_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          contact_id: string
          created_at?: string
          email_send_id: string
          id?: string
          last_error?: string | null
          org_id: string
          scheduled_for: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          contact_id?: string
          created_at?: string
          email_send_id?: string
          id?: string
          last_error?: string | null
          org_id?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_email_send_queue_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "org_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_email_send_queue_email_send_id_fkey"
            columns: ["email_send_id"]
            isOneToOne: false
            referencedRelation: "org_email_sends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_email_send_queue_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_email_sends: {
        Row: {
          bounced_count: number | null
          clicked_count: number | null
          created_at: string
          created_by: string | null
          dark_mode_optimized: boolean | null
          delivered_count: number | null
          design_id: string | null
          from_email: string | null
          from_name: string | null
          html_body: string | null
          id: string
          jsx_source: string | null
          opened_count: number | null
          org_id: string
          preview_text: string | null
          provider_batch_id: string | null
          recipient_count: number | null
          rendering_engine: string | null
          reply_to: string | null
          scheduled_for: string | null
          segment_id: string | null
          send_at_optimal_time: boolean
          sent_at: string | null
          spam_check_at: string | null
          spam_check_details: Json | null
          spam_score: number | null
          status: string
          subject: string | null
          template_id: string | null
          template_props: Json | null
          text_body: string | null
          unsubscribed_count: number | null
        }
        Insert: {
          bounced_count?: number | null
          clicked_count?: number | null
          created_at?: string
          created_by?: string | null
          dark_mode_optimized?: boolean | null
          delivered_count?: number | null
          design_id?: string | null
          from_email?: string | null
          from_name?: string | null
          html_body?: string | null
          id?: string
          jsx_source?: string | null
          opened_count?: number | null
          org_id: string
          preview_text?: string | null
          provider_batch_id?: string | null
          recipient_count?: number | null
          rendering_engine?: string | null
          reply_to?: string | null
          scheduled_for?: string | null
          segment_id?: string | null
          send_at_optimal_time?: boolean
          sent_at?: string | null
          spam_check_at?: string | null
          spam_check_details?: Json | null
          spam_score?: number | null
          status?: string
          subject?: string | null
          template_id?: string | null
          template_props?: Json | null
          text_body?: string | null
          unsubscribed_count?: number | null
        }
        Update: {
          bounced_count?: number | null
          clicked_count?: number | null
          created_at?: string
          created_by?: string | null
          dark_mode_optimized?: boolean | null
          delivered_count?: number | null
          design_id?: string | null
          from_email?: string | null
          from_name?: string | null
          html_body?: string | null
          id?: string
          jsx_source?: string | null
          opened_count?: number | null
          org_id?: string
          preview_text?: string | null
          provider_batch_id?: string | null
          recipient_count?: number | null
          rendering_engine?: string | null
          reply_to?: string | null
          scheduled_for?: string | null
          segment_id?: string | null
          send_at_optimal_time?: boolean
          sent_at?: string | null
          spam_check_at?: string | null
          spam_check_details?: Json | null
          spam_score?: number | null
          status?: string
          subject?: string | null
          template_id?: string | null
          template_props?: Json | null
          text_body?: string | null
          unsubscribed_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "org_email_sends_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_email_sends_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "org_contact_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_email_sends_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      org_engagement_baselines: {
        Row: {
          adjustment_reason: string | null
          baseline_notes: string | null
          baseline_revenue: number
          baseline_set_at: string
          baseline_set_by: string
          id: string
          org_id: string
          original_calculated_revenue: number | null
          was_manually_adjusted: boolean
        }
        Insert: {
          adjustment_reason?: string | null
          baseline_notes?: string | null
          baseline_revenue: number
          baseline_set_at?: string
          baseline_set_by: string
          id?: string
          org_id: string
          original_calculated_revenue?: number | null
          was_manually_adjusted?: boolean
        }
        Update: {
          adjustment_reason?: string | null
          baseline_notes?: string | null
          baseline_revenue?: number
          baseline_set_at?: string
          baseline_set_by?: string
          id?: string
          org_id?: string
          original_calculated_revenue?: number | null
          was_manually_adjusted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "org_engagement_baselines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_engagement_contracts: {
        Row: {
          contract_notes: string | null
          contract_signed_date: string | null
          contract_status: string
          contract_value: number
          created_at: string
          created_by: string
          id: string
          installment_amount: number | null
          installment_count: number | null
          installment_frequency: string | null
          investment_fully_recovered: boolean
          investment_recovered_at: string | null
          org_id: string
          total_paid_to_date: number
          updated_at: string
        }
        Insert: {
          contract_notes?: string | null
          contract_signed_date?: string | null
          contract_status?: string
          contract_value: number
          created_at?: string
          created_by: string
          id?: string
          installment_amount?: number | null
          installment_count?: number | null
          installment_frequency?: string | null
          investment_fully_recovered?: boolean
          investment_recovered_at?: string | null
          org_id: string
          total_paid_to_date?: number
          updated_at?: string
        }
        Update: {
          contract_notes?: string | null
          contract_signed_date?: string | null
          contract_status?: string
          contract_value?: number
          created_at?: string
          created_by?: string
          id?: string
          installment_amount?: number | null
          installment_count?: number | null
          installment_frequency?: string | null
          investment_fully_recovered?: boolean
          investment_recovered_at?: string | null
          org_id?: string
          total_paid_to_date?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_engagement_contracts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_marketing_summary: {
        Row: {
          avg_click_rate_l30: number | null
          avg_open_rate_l30: number | null
          campaigns_active: number | null
          campaigns_completed_l30: number | null
          contacts_email_subscribed: number | null
          contacts_sms_subscribed: number | null
          contacts_total: number | null
          current_nps_score: number | null
          designs_created_l30: number | null
          emails_sent_l30: number | null
          emails_sent_l90: number | null
          last_activity_at: string | null
          marketing_health_score: number | null
          nps_trend: string | null
          org_id: string
          refreshed_at: string | null
          sms_sent_l30: number | null
          social_posts_l30: number | null
          total_social_engagement_l30: number | null
        }
        Insert: {
          avg_click_rate_l30?: number | null
          avg_open_rate_l30?: number | null
          campaigns_active?: number | null
          campaigns_completed_l30?: number | null
          contacts_email_subscribed?: number | null
          contacts_sms_subscribed?: number | null
          contacts_total?: number | null
          current_nps_score?: number | null
          designs_created_l30?: number | null
          emails_sent_l30?: number | null
          emails_sent_l90?: number | null
          last_activity_at?: string | null
          marketing_health_score?: number | null
          nps_trend?: string | null
          org_id: string
          refreshed_at?: string | null
          sms_sent_l30?: number | null
          social_posts_l30?: number | null
          total_social_engagement_l30?: number | null
        }
        Update: {
          avg_click_rate_l30?: number | null
          avg_open_rate_l30?: number | null
          campaigns_active?: number | null
          campaigns_completed_l30?: number | null
          contacts_email_subscribed?: number | null
          contacts_sms_subscribed?: number | null
          contacts_total?: number | null
          current_nps_score?: number | null
          designs_created_l30?: number | null
          emails_sent_l30?: number | null
          emails_sent_l90?: number | null
          last_activity_at?: string | null
          marketing_health_score?: number | null
          nps_trend?: string | null
          org_id?: string
          refreshed_at?: string | null
          sms_sent_l30?: number | null
          social_posts_l30?: number | null
          total_social_engagement_l30?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "org_marketing_summary_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_notes: {
        Row: {
          created_at: string
          created_by: string
          id: string
          note_text: string
          org_id: string
          tag: Database["public"]["Enums"]["org_note_tag"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          note_text: string
          org_id: string
          tag?: Database["public"]["Enums"]["org_note_tag"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          note_text?: string
          org_id?: string
          tag?: Database["public"]["Enums"]["org_note_tag"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_notes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_nps_responses: {
        Row: {
          category: string | null
          contact_id: string | null
          flagged_for_followup: boolean | null
          followup_completed_at: string | null
          followup_completed_by: string | null
          followup_notes: string | null
          followup_resolved_outcome: string | null
          followup_response: string | null
          id: string
          ip_address: string | null
          responded_at: string | null
          responded_via: string | null
          score: number | null
          survey_id: string | null
          user_agent: string | null
        }
        Insert: {
          category?: string | null
          contact_id?: string | null
          flagged_for_followup?: boolean | null
          followup_completed_at?: string | null
          followup_completed_by?: string | null
          followup_notes?: string | null
          followup_resolved_outcome?: string | null
          followup_response?: string | null
          id?: string
          ip_address?: string | null
          responded_at?: string | null
          responded_via?: string | null
          score?: number | null
          survey_id?: string | null
          user_agent?: string | null
        }
        Update: {
          category?: string | null
          contact_id?: string | null
          flagged_for_followup?: boolean | null
          followup_completed_at?: string | null
          followup_completed_by?: string | null
          followup_notes?: string | null
          followup_resolved_outcome?: string | null
          followup_response?: string | null
          id?: string
          ip_address?: string | null
          responded_at?: string | null
          responded_via?: string | null
          score?: number | null
          survey_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_nps_responses_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "org_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_nps_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "org_nps_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      org_nps_surveys: {
        Row: {
          audience_segment_id: string | null
          closed_at: string | null
          created_at: string | null
          created_by: string | null
          detractor_count: number | null
          followup_question_detractor: string | null
          followup_question_passive: string | null
          followup_question_promoter: string | null
          id: string
          name: string | null
          nps_score: number | null
          org_id: string | null
          passive_count: number | null
          promoter_count: number | null
          question: string | null
          recipient_count: number | null
          response_count: number | null
          scale_max: number | null
          scale_min: number | null
          scheduled_for: string | null
          send_channel: string | null
          sent_at: string | null
          status: string | null
          trigger_type: string | null
          updated_at: string | null
        }
        Insert: {
          audience_segment_id?: string | null
          closed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          detractor_count?: number | null
          followup_question_detractor?: string | null
          followup_question_passive?: string | null
          followup_question_promoter?: string | null
          id?: string
          name?: string | null
          nps_score?: number | null
          org_id?: string | null
          passive_count?: number | null
          promoter_count?: number | null
          question?: string | null
          recipient_count?: number | null
          response_count?: number | null
          scale_max?: number | null
          scale_min?: number | null
          scheduled_for?: string | null
          send_channel?: string | null
          sent_at?: string | null
          status?: string | null
          trigger_type?: string | null
          updated_at?: string | null
        }
        Update: {
          audience_segment_id?: string | null
          closed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          detractor_count?: number | null
          followup_question_detractor?: string | null
          followup_question_passive?: string | null
          followup_question_promoter?: string | null
          id?: string
          name?: string | null
          nps_score?: number | null
          org_id?: string | null
          passive_count?: number | null
          promoter_count?: number | null
          question?: string | null
          recipient_count?: number | null
          response_count?: number | null
          scale_max?: number | null
          scale_min?: number | null
          scheduled_for?: string | null
          send_channel?: string | null
          sent_at?: string | null
          status?: string | null
          trigger_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_nps_surveys_audience_segment_id_fkey"
            columns: ["audience_segment_id"]
            isOneToOne: false
            referencedRelation: "org_contact_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_nps_surveys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_presentation_edits: {
        Row: {
          edited_at: string
          edited_by: string
          edited_value: string
          field_key: string
          id: string
          org_id: string
          presentation_type: string
          slide_number: number
        }
        Insert: {
          edited_at?: string
          edited_by: string
          edited_value: string
          field_key: string
          id?: string
          org_id: string
          presentation_type: string
          slide_number: number
        }
        Update: {
          edited_at?: string
          edited_by?: string
          edited_value?: string
          field_key?: string
          id?: string
          org_id?: string
          presentation_type?: string
          slide_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "org_presentation_edits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_projects: {
        Row: {
          auto_created: boolean
          awaiting_completion_approval: boolean
          completion_approved_at: string | null
          completion_approved_by: string | null
          created_at: string
          created_by: string
          description: string | null
          display_order: number
          engine: Database["public"]["Enums"]["task_engine"] | null
          id: string
          name: string
          org_id: string
          release_date: string | null
          released_at: string | null
          released_by: string | null
          status: Database["public"]["Enums"]["org_project_status"]
          suggested_next_project_id: string | null
          updated_at: string
        }
        Insert: {
          auto_created?: boolean
          awaiting_completion_approval?: boolean
          completion_approved_at?: string | null
          completion_approved_by?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          display_order?: number
          engine?: Database["public"]["Enums"]["task_engine"] | null
          id?: string
          name: string
          org_id: string
          release_date?: string | null
          released_at?: string | null
          released_by?: string | null
          status?: Database["public"]["Enums"]["org_project_status"]
          suggested_next_project_id?: string | null
          updated_at?: string
        }
        Update: {
          auto_created?: boolean
          awaiting_completion_approval?: boolean
          completion_approved_at?: string | null
          completion_approved_by?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          display_order?: number
          engine?: Database["public"]["Enums"]["task_engine"] | null
          id?: string
          name?: string
          org_id?: string
          release_date?: string | null
          released_at?: string | null
          released_by?: string | null
          status?: Database["public"]["Enums"]["org_project_status"]
          suggested_next_project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_projects_suggested_next_project_id_fkey"
            columns: ["suggested_next_project_id"]
            isOneToOne: false
            referencedRelation: "org_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      org_revenue_entries: {
        Row: {
          amount: number
          created_at: string
          description: string
          engine: string
          entry_type: string
          id: string
          is_verified: boolean
          logged_by: string
          org_id: string
          period_end: string | null
          period_start: string | null
          revenue_date: string
          sponsorship_lead_id: string | null
          supporting_notes: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          engine: string
          entry_type: string
          id?: string
          is_verified?: boolean
          logged_by: string
          org_id: string
          period_end?: string | null
          period_start?: string | null
          revenue_date: string
          sponsorship_lead_id?: string | null
          supporting_notes?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          engine?: string
          entry_type?: string
          id?: string
          is_verified?: boolean
          logged_by?: string
          org_id?: string
          period_end?: string | null
          period_start?: string | null
          revenue_date?: string
          sponsorship_lead_id?: string | null
          supporting_notes?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_revenue_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_revenue_entries_sponsorship_lead_id_fkey"
            columns: ["sponsorship_lead_id"]
            isOneToOne: false
            referencedRelation: "sponsorship_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      org_revenue_share_invoices: {
        Row: {
          created_at: string
          curve_share_this_period: number
          due_date: string | null
          generated_by: string
          id: string
          invoice_date: string
          invoice_notes: string | null
          invoice_number: string
          new_revenue_this_period: number
          org_id: string
          paid_amount: number | null
          paid_at: string | null
          payment_notes: string | null
          period_end: string
          period_start: string
          recovery_threshold: number
          revenue_above_threshold_this_period: number
          revenue_entry_ids: Json | null
          revenue_toward_recovery_after: number
          revenue_toward_recovery_prior: number
          sent_at: string | null
          status: string
          total_curve_share_to_date: number
          total_new_revenue_to_date: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          curve_share_this_period: number
          due_date?: string | null
          generated_by: string
          id?: string
          invoice_date?: string
          invoice_notes?: string | null
          invoice_number: string
          new_revenue_this_period: number
          org_id: string
          paid_amount?: number | null
          paid_at?: string | null
          payment_notes?: string | null
          period_end: string
          period_start: string
          recovery_threshold: number
          revenue_above_threshold_this_period: number
          revenue_entry_ids?: Json | null
          revenue_toward_recovery_after: number
          revenue_toward_recovery_prior: number
          sent_at?: string | null
          status?: string
          total_curve_share_to_date: number
          total_new_revenue_to_date: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          curve_share_this_period?: number
          due_date?: string | null
          generated_by?: string
          id?: string
          invoice_date?: string
          invoice_notes?: string | null
          invoice_number?: string
          new_revenue_this_period?: number
          org_id?: string
          paid_amount?: number | null
          paid_at?: string | null
          payment_notes?: string | null
          period_end?: string
          period_start?: string
          recovery_threshold?: number
          revenue_above_threshold_this_period?: number
          revenue_entry_ids?: Json | null
          revenue_toward_recovery_after?: number
          revenue_toward_recovery_prior?: number
          sent_at?: string | null
          status?: string
          total_curve_share_to_date?: number
          total_new_revenue_to_date?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_revenue_share_invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_revenue_share_summary: {
        Row: {
          addon_new_revenue: number
          affiliate_new_revenue: number
          apparel_new_revenue: number
          contract_value: number
          curve_share_earned: number
          events_new_revenue: number
          facility_new_revenue: number
          id: string
          investment_fully_recovered: boolean
          investment_recovered_pct: number
          last_calculated_at: string
          org_id: string
          other_new_revenue: number
          outstanding_balance: number
          pricing_new_revenue: number
          recovery_threshold: number
          retention_new_revenue: number
          revenue_above_threshold: number
          revenue_baseline: number
          revenue_toward_recovery: number
          sponsorship_new_revenue: number
          total_collected: number
          total_invoiced: number
          total_new_revenue: number
          total_paid_to_date: number
          updated_at: string
        }
        Insert: {
          addon_new_revenue?: number
          affiliate_new_revenue?: number
          apparel_new_revenue?: number
          contract_value?: number
          curve_share_earned?: number
          events_new_revenue?: number
          facility_new_revenue?: number
          id?: string
          investment_fully_recovered?: boolean
          investment_recovered_pct?: number
          last_calculated_at?: string
          org_id: string
          other_new_revenue?: number
          outstanding_balance?: number
          pricing_new_revenue?: number
          recovery_threshold?: number
          retention_new_revenue?: number
          revenue_above_threshold?: number
          revenue_baseline?: number
          revenue_toward_recovery?: number
          sponsorship_new_revenue?: number
          total_collected?: number
          total_invoiced?: number
          total_new_revenue?: number
          total_paid_to_date?: number
          updated_at?: string
        }
        Update: {
          addon_new_revenue?: number
          affiliate_new_revenue?: number
          apparel_new_revenue?: number
          contract_value?: number
          curve_share_earned?: number
          events_new_revenue?: number
          facility_new_revenue?: number
          id?: string
          investment_fully_recovered?: boolean
          investment_recovered_pct?: number
          last_calculated_at?: string
          org_id?: string
          other_new_revenue?: number
          outstanding_balance?: number
          pricing_new_revenue?: number
          recovery_threshold?: number
          retention_new_revenue?: number
          revenue_above_threshold?: number
          revenue_baseline?: number
          revenue_toward_recovery?: number
          sponsorship_new_revenue?: number
          total_collected?: number
          total_invoiced?: number
          total_new_revenue?: number
          total_paid_to_date?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_revenue_share_summary_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_seasons: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          org_id: string
          season_end_date: string
          season_start_date: string
          sport: Database["public"]["Enums"]["org_sport"]
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          org_id: string
          season_end_date: string
          season_start_date: string
          sport?: Database["public"]["Enums"]["org_sport"]
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          org_id?: string
          season_end_date?: string
          season_start_date?: string
          sport?: Database["public"]["Enums"]["org_sport"]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_seasons_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_send_platforms: {
        Row: {
          created_at: string
          created_by: string
          display_order: number
          id: string
          label: string
          org_id: string
          platform_type: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by: string
          display_order?: number
          id?: string
          label: string
          org_id: string
          platform_type?: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string
          display_order?: number
          id?: string
          label?: string
          org_id?: string
          platform_type?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_send_platforms_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_send_time_recommendations: {
        Row: {
          audience_segment: string | null
          click_rate: number
          computed_at: string
          confidence: string
          day_of_week: number
          hour_of_day: number
          id: string
          is_recommended: boolean
          open_rate: number
          org_id: string
          sample_size: number
        }
        Insert: {
          audience_segment?: string | null
          click_rate?: number
          computed_at?: string
          confidence?: string
          day_of_week: number
          hour_of_day: number
          id?: string
          is_recommended?: boolean
          open_rate?: number
          org_id: string
          sample_size?: number
        }
        Update: {
          audience_segment?: string | null
          click_rate?: number
          computed_at?: string
          confidence?: string
          day_of_week?: number
          hour_of_day?: number
          id?: string
          is_recommended?: boolean
          open_rate?: number
          org_id?: string
          sample_size?: number
        }
        Relationships: []
      }
      org_shared_files: {
        Row: {
          created_at: string
          description: string | null
          folder_path: string
          id: string
          mime_type: string | null
          name: string
          org_id: string
          size_bytes: number | null
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          folder_path?: string
          id?: string
          mime_type?: string | null
          name: string
          org_id: string
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          folder_path?: string
          id?: string
          mime_type?: string | null
          name?: string
          org_id?: string
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_shared_files_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_shared_folders: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          org_id: string
          path: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          org_id: string
          path: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          org_id?: string
          path?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_shared_folders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_shortlinks: {
        Row: {
          active: boolean
          brand_color: string | null
          campaign_id: string | null
          click_count: number
          created_at: string
          created_by: string | null
          design_id: string | null
          expires_at: string | null
          id: string
          label: string | null
          org_id: string
          slug: string
          target_url: string
          unique_click_count: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          brand_color?: string | null
          campaign_id?: string | null
          click_count?: number
          created_at?: string
          created_by?: string | null
          design_id?: string | null
          expires_at?: string | null
          id?: string
          label?: string | null
          org_id: string
          slug: string
          target_url: string
          unique_click_count?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          brand_color?: string | null
          campaign_id?: string | null
          click_count?: number
          created_at?: string
          created_by?: string | null
          design_id?: string | null
          expires_at?: string | null
          id?: string
          label?: string | null
          org_id?: string
          slug?: string
          target_url?: string
          unique_click_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_shortlinks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_shortlinks_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_shortlinks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_sms_drafts: {
        Row: {
          body: string
          campaign_asset_id: string | null
          created_at: string
          created_by: string | null
          estimated_recipients: number
          id: string
          org_id: string
          segment_id: string | null
          shortlink_id: string | null
          source_email_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          body: string
          campaign_asset_id?: string | null
          created_at?: string
          created_by?: string | null
          estimated_recipients?: number
          id?: string
          org_id: string
          segment_id?: string | null
          shortlink_id?: string | null
          source_email_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          body?: string
          campaign_asset_id?: string | null
          created_at?: string
          created_by?: string | null
          estimated_recipients?: number
          id?: string
          org_id?: string
          segment_id?: string | null
          shortlink_id?: string | null
          source_email_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      org_sms_events: {
        Row: {
          contact_id: string | null
          error_code: string | null
          error_message: string | null
          event_type: string | null
          id: string
          occurred_at: string | null
          send_id: string | null
          twilio_message_sid: string | null
        }
        Insert: {
          contact_id?: string | null
          error_code?: string | null
          error_message?: string | null
          event_type?: string | null
          id?: string
          occurred_at?: string | null
          send_id?: string | null
          twilio_message_sid?: string | null
        }
        Update: {
          contact_id?: string | null
          error_code?: string | null
          error_message?: string | null
          event_type?: string | null
          id?: string
          occurred_at?: string | null
          send_id?: string | null
          twilio_message_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_sms_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "org_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_sms_events_send_id_fkey"
            columns: ["send_id"]
            isOneToOne: false
            referencedRelation: "org_sms_sends"
            referencedColumns: ["id"]
          },
        ]
      }
      org_sms_inbound: {
        Row: {
          action_taken: string | null
          body: string | null
          contact_id: string | null
          from_number: string | null
          id: string
          org_id: string | null
          received_at: string | null
          to_number: string | null
          twilio_message_sid: string | null
        }
        Insert: {
          action_taken?: string | null
          body?: string | null
          contact_id?: string | null
          from_number?: string | null
          id?: string
          org_id?: string | null
          received_at?: string | null
          to_number?: string | null
          twilio_message_sid?: string | null
        }
        Update: {
          action_taken?: string | null
          body?: string | null
          contact_id?: string | null
          from_number?: string | null
          id?: string
          org_id?: string | null
          received_at?: string | null
          to_number?: string | null
          twilio_message_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_sms_inbound_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "org_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_sms_inbound_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_sms_numbers: {
        Row: {
          active: boolean | null
          area_code: string | null
          display_name: string | null
          id: string
          monthly_cost_cents: number | null
          org_id: string | null
          provisioned_at: string | null
          released_at: string | null
          tcpa_consent_attested: boolean | null
          tcpa_consent_attested_at: string | null
          tcpa_consent_attested_by: string | null
          twilio_phone_number: string | null
          twilio_phone_sid: string | null
        }
        Insert: {
          active?: boolean | null
          area_code?: string | null
          display_name?: string | null
          id?: string
          monthly_cost_cents?: number | null
          org_id?: string | null
          provisioned_at?: string | null
          released_at?: string | null
          tcpa_consent_attested?: boolean | null
          tcpa_consent_attested_at?: string | null
          tcpa_consent_attested_by?: string | null
          twilio_phone_number?: string | null
          twilio_phone_sid?: string | null
        }
        Update: {
          active?: boolean | null
          area_code?: string | null
          display_name?: string | null
          id?: string
          monthly_cost_cents?: number | null
          org_id?: string | null
          provisioned_at?: string | null
          released_at?: string | null
          tcpa_consent_attested?: boolean | null
          tcpa_consent_attested_at?: string | null
          tcpa_consent_attested_by?: string | null
          twilio_phone_number?: string | null
          twilio_phone_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_sms_numbers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_sms_sends: {
        Row: {
          ab_test_id: string | null
          ab_variant: string | null
          campaign_id: string | null
          cost_cents: number | null
          created_at: string | null
          created_by: string | null
          delivered_count: number | null
          failed_count: number | null
          from_number_id: string | null
          id: string
          include_opt_out: boolean | null
          message_body: string
          opt_out_count: number | null
          org_id: string | null
          recipient_count: number | null
          scheduled_for: string | null
          segment_id: string | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          ab_test_id?: string | null
          ab_variant?: string | null
          campaign_id?: string | null
          cost_cents?: number | null
          created_at?: string | null
          created_by?: string | null
          delivered_count?: number | null
          failed_count?: number | null
          from_number_id?: string | null
          id?: string
          include_opt_out?: boolean | null
          message_body: string
          opt_out_count?: number | null
          org_id?: string | null
          recipient_count?: number | null
          scheduled_for?: string | null
          segment_id?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          ab_test_id?: string | null
          ab_variant?: string | null
          campaign_id?: string | null
          cost_cents?: number | null
          created_at?: string | null
          created_by?: string | null
          delivered_count?: number | null
          failed_count?: number | null
          from_number_id?: string | null
          id?: string
          include_opt_out?: boolean | null
          message_body?: string
          opt_out_count?: number | null
          org_id?: string | null
          recipient_count?: number | null
          scheduled_for?: string | null
          segment_id?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_sms_sends_from_number_id_fkey"
            columns: ["from_number_id"]
            isOneToOne: false
            referencedRelation: "org_sms_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_sms_sends_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_sms_sends_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "org_contact_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      org_social_accounts: {
        Row: {
          ayrshare_account_id: string | null
          ayrshare_metadata: Json
          created_at: string
          created_by: string | null
          display_name: string | null
          external_id: string | null
          handle: string
          id: string
          last_synced_at: string | null
          org_id: string
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          ayrshare_account_id?: string | null
          ayrshare_metadata?: Json
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          external_id?: string | null
          handle: string
          id?: string
          last_synced_at?: string | null
          org_id: string
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          ayrshare_account_id?: string | null
          ayrshare_metadata?: Json
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          external_id?: string | null
          handle?: string
          id?: string
          last_synced_at?: string | null
          org_id?: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      org_social_posts: {
        Row: {
          ayrshare_post_id: string | null
          body: string
          campaign_asset_id: string | null
          comments_count: number
          created_at: string
          created_by: string | null
          design_id: string | null
          engagement_data: Json
          error_message: string | null
          external_post_id: string | null
          id: string
          impressions_count: number
          last_metric_sync: string | null
          likes_count: number
          media_urls: string[]
          org_id: string
          platform_urls: Json
          posted_at: string | null
          scheduled_for: string | null
          shares_count: number
          shortlink_id: string | null
          social_account_id: string
          status: string
          updated_at: string
        }
        Insert: {
          ayrshare_post_id?: string | null
          body: string
          campaign_asset_id?: string | null
          comments_count?: number
          created_at?: string
          created_by?: string | null
          design_id?: string | null
          engagement_data?: Json
          error_message?: string | null
          external_post_id?: string | null
          id?: string
          impressions_count?: number
          last_metric_sync?: string | null
          likes_count?: number
          media_urls?: string[]
          org_id: string
          platform_urls?: Json
          posted_at?: string | null
          scheduled_for?: string | null
          shares_count?: number
          shortlink_id?: string | null
          social_account_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          ayrshare_post_id?: string | null
          body?: string
          campaign_asset_id?: string | null
          comments_count?: number
          created_at?: string
          created_by?: string | null
          design_id?: string | null
          engagement_data?: Json
          error_message?: string | null
          external_post_id?: string | null
          id?: string
          impressions_count?: number
          last_metric_sync?: string | null
          likes_count?: number
          media_urls?: string[]
          org_id?: string
          platform_urls?: Json
          posted_at?: string | null
          scheduled_for?: string | null
          shares_count?: number
          shortlink_id?: string | null
          social_account_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_social_posts_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "org_social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      org_sponsorship_summary: {
        Row: {
          cold_leads: number
          curve_share_sponsorship: number
          deals_closed_lost: number
          deals_closed_won: number
          id: string
          last_updated: string
          leads_contacted: number
          leads_responded: number
          meetings_scheduled: number
          org_id: string
          proposals_sent: number
          total_closed_value: number
          total_leads: number
          warm_leads: number
        }
        Insert: {
          cold_leads?: number
          curve_share_sponsorship?: number
          deals_closed_lost?: number
          deals_closed_won?: number
          id?: string
          last_updated?: string
          leads_contacted?: number
          leads_responded?: number
          meetings_scheduled?: number
          org_id: string
          proposals_sent?: number
          total_closed_value?: number
          total_leads?: number
          warm_leads?: number
        }
        Update: {
          cold_leads?: number
          curve_share_sponsorship?: number
          deals_closed_lost?: number
          deals_closed_won?: number
          id?: string
          last_updated?: string
          leads_contacted?: number
          leads_responded?: number
          meetings_scheduled?: number
          org_id?: string
          proposals_sent?: number
          total_closed_value?: number
          total_leads?: number
          warm_leads?: number
        }
        Relationships: [
          {
            foreignKeyName: "org_sponsorship_summary_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_sponsorship_tiers: {
        Row: {
          approved_at: string
          approved_by: string
          community_amount: number
          created_at: string
          fmv_per_sponsor_mid: number | null
          id: string
          notes: string | null
          org_id: string
          presenting_amount: number
          source_inputs: Json | null
          supporting_amount: number
          updated_at: string
        }
        Insert: {
          approved_at?: string
          approved_by: string
          community_amount: number
          created_at?: string
          fmv_per_sponsor_mid?: number | null
          id?: string
          notes?: string | null
          org_id: string
          presenting_amount: number
          source_inputs?: Json | null
          supporting_amount: number
          updated_at?: string
        }
        Update: {
          approved_at?: string
          approved_by?: string
          community_amount?: number
          created_at?: string
          fmv_per_sponsor_mid?: number | null
          id?: string
          notes?: string | null
          org_id?: string
          presenting_amount?: number
          source_inputs?: Json | null
          supporting_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_sponsorship_tiers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_task_assignees: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          org_id: string
          task_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          org_id: string
          task_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          org_id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_task_assignees_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "org_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      org_tasks: {
        Row: {
          assigned_by: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string
          due_date: string | null
          engine: Database["public"]["Enums"]["task_engine"]
          id: string
          last_activity_at: string
          org_id: string
          owner_type: Database["public"]["Enums"]["task_owner_type"]
          plan_status: Database["public"]["Enums"]["plan_status"]
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          source: Database["public"]["Enums"]["task_source"]
          status: Database["public"]["Enums"]["task_status"]
          suggested_due_date: string | null
          task_type: Database["public"]["Enums"]["task_type"]
          template_id: string | null
          title: string
        }
        Insert: {
          assigned_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          engine: Database["public"]["Enums"]["task_engine"]
          id?: string
          last_activity_at?: string
          org_id: string
          owner_type?: Database["public"]["Enums"]["task_owner_type"]
          plan_status?: Database["public"]["Enums"]["plan_status"]
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          source?: Database["public"]["Enums"]["task_source"]
          status?: Database["public"]["Enums"]["task_status"]
          suggested_due_date?: string | null
          task_type: Database["public"]["Enums"]["task_type"]
          template_id?: string | null
          title: string
        }
        Update: {
          assigned_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          engine?: Database["public"]["Enums"]["task_engine"]
          id?: string
          last_activity_at?: string
          org_id?: string
          owner_type?: Database["public"]["Enums"]["task_owner_type"]
          plan_status?: Database["public"]["Enums"]["plan_status"]
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          source?: Database["public"]["Enums"]["task_source"]
          status?: Database["public"]["Enums"]["task_status"]
          suggested_due_date?: string | null
          task_type?: Database["public"]["Enums"]["task_type"]
          template_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "org_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      org_team_memberships: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          is_primary_parent: boolean
          jersey_number: string | null
          org_id: string
          position: string | null
          role: Database["public"]["Enums"]["team_member_role"]
          team_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          is_primary_parent?: boolean
          jersey_number?: string | null
          org_id: string
          position?: string | null
          role: Database["public"]["Enums"]["team_member_role"]
          team_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          is_primary_parent?: boolean
          jersey_number?: string | null
          org_id?: string
          position?: string | null
          role?: Database["public"]["Enums"]["team_member_role"]
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_team_memberships_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "org_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_team_memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "org_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      org_teams: {
        Row: {
          age_group: string | null
          created_at: string
          division: string | null
          external_id: string | null
          external_source: string | null
          id: string
          name: string
          notes: string | null
          org_id: string
          season_id: string
          updated_at: string
        }
        Insert: {
          age_group?: string | null
          created_at?: string
          division?: string | null
          external_id?: string | null
          external_source?: string | null
          id?: string
          name: string
          notes?: string | null
          org_id: string
          season_id: string
          updated_at?: string
        }
        Update: {
          age_group?: string | null
          created_at?: string
          division?: string | null
          external_id?: string | null
          external_source?: string | null
          id?: string
          name?: string
          notes?: string | null
          org_id?: string
          season_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_teams_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_teams_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "org_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      org_tier_history: {
        Row: {
          changed_at: string
          id: string
          intake_submission_id: string | null
          new_score: number | null
          new_tier: string
          org_id: string
          previous_score: number | null
          previous_tier: string | null
        }
        Insert: {
          changed_at?: string
          id?: string
          intake_submission_id?: string | null
          new_score?: number | null
          new_tier: string
          org_id: string
          previous_score?: number | null
          previous_tier?: string | null
        }
        Update: {
          changed_at?: string
          id?: string
          intake_submission_id?: string | null
          new_score?: number | null
          new_tier?: string
          org_id?: string
          previous_score?: number | null
          previous_tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_tier_history_intake_submission_id_fkey"
            columns: ["intake_submission_id"]
            isOneToOne: false
            referencedRelation: "organization_intake"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_tier_history_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_weekly_focus: {
        Row: {
          created_at: string
          focus_note: string | null
          focus_task_ids: Json | null
          id: string
          org_id: string
          set_by: string
          updated_at: string
          week_starting: string
        }
        Insert: {
          created_at?: string
          focus_note?: string | null
          focus_task_ids?: Json | null
          id?: string
          org_id: string
          set_by: string
          updated_at?: string
          week_starting: string
        }
        Update: {
          created_at?: string
          focus_note?: string | null
          focus_task_ids?: Json | null
          id?: string
          org_id?: string
          set_by?: string
          updated_at?: string
          week_starting?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_weekly_focus_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_intake: {
        Row: {
          active_coaches: number | null
          addon_soft_goods_spend: string | null
          affiliate_apparel_revenue: number | null
          affiliate_fee_per_player: number | null
          affiliate_players_charged: number | null
          alacarte_annual_hs_spend: number | null
          alacarte_annual_youth_spend: number | null
          annual_facility_rental_revenue: number | null
          average_roster_size: number | null
          avg_months_active: number | null
          avg_player_years: number | null
          brand_descriptions: string | null
          camps_revenue: number | null
          city_state: string | null
          clinics_revenue: number | null
          coach_alignment: string | null
          coaching_structure: string | null
          current_growth_trend: string | null
          data_days_revenue: number | null
          demand_for_organization: string | null
          dues_inclusions: string[] | null
          dues_model: string | null
          email: string | null
          event_types_offered: string[] | null
          events_per_year: number | null
          facility_locations: number | null
          facility_rental_revenue: number | null
          fall_hs_fee: number | null
          fall_hs_players: number | null
          fall_youth_fee: number | null
          fall_youth_players: number | null
          flat_annual_hs_fee: number | null
          flat_annual_youth_fee: number | null
          hard_goods_markup: string | null
          hard_goods_purchased: string | null
          hard_goods_spend: string | null
          has_affiliates: boolean | null
          hs_players: number | null
          id: string
          knows_profit_margin: string | null
          lessons_capture_pct: number | null
          lessons_revenue: number | null
          lessons_revenue_gross: number | null
          lessons_revenue_model: string | null
          local_market_competition: string | null
          market_strategy: string | null
          market_type: string | null
          mixed_annual_hs_fee: number | null
          mixed_annual_youth_fee: number | null
          monthly_hs_fee: number | null
          monthly_youth_fee: number | null
          number_of_affiliates: number | null
          number_of_brands: number | null
          number_of_sponsors: number | null
          operates_multiple_brands: boolean | null
          operational_structure: string | null
          org_id: string
          org_type: string | null
          organization_focus: string | null
          organization_name: string | null
          other_addon_revenue: number | null
          other_events_revenue: number | null
          parent_communication: string[] | null
          phone: string | null
          player_commitment_level: string | null
          player_mix: string | null
          player_selection_approach: string | null
          price_point: string | null
          pricing_approach: string | null
          primary_contact_name: string | null
          profit_margin_range: string | null
          recruiting_events_revenue: number | null
          retention_pct: number | null
          revenue_needs_review: boolean | null
          revenue_verification: string | null
          runs_own_events: string | null
          seasons_offered: string[] | null
          seeks_sponsorships: string | null
          showcase_revenue: number | null
          sponsorship_approach: string | null
          spring_youth_fee: number | null
          spring_youth_players: number | null
          submitted_at: string
          summer_hs_fee: number | null
          summer_hs_players: number | null
          summer_youth_fee: number | null
          summer_youth_players: number | null
          team_store_status: string | null
          team_structure: string | null
          tiered_packages: string | null
          total_event_revenue: number | null
          total_players: number | null
          total_sponsorship_revenue: number | null
          total_teams: number | null
          tournament_fee_per_player: number | null
          tournament_fee_structure: string | null
          tournaments_per_hs_player: string | null
          tournaments_per_youth_player: string | null
          tournaments_revenue: number | null
          tryouts_revenue: number | null
          typical_player_participation: string | null
          uniform_markup: string | null
          uniform_package_cost: string | null
          uniform_vendor: string | null
          updated_at: string
          years_in_operation: string | null
          youth_players: number | null
        }
        Insert: {
          active_coaches?: number | null
          addon_soft_goods_spend?: string | null
          affiliate_apparel_revenue?: number | null
          affiliate_fee_per_player?: number | null
          affiliate_players_charged?: number | null
          alacarte_annual_hs_spend?: number | null
          alacarte_annual_youth_spend?: number | null
          annual_facility_rental_revenue?: number | null
          average_roster_size?: number | null
          avg_months_active?: number | null
          avg_player_years?: number | null
          brand_descriptions?: string | null
          camps_revenue?: number | null
          city_state?: string | null
          clinics_revenue?: number | null
          coach_alignment?: string | null
          coaching_structure?: string | null
          current_growth_trend?: string | null
          data_days_revenue?: number | null
          demand_for_organization?: string | null
          dues_inclusions?: string[] | null
          dues_model?: string | null
          email?: string | null
          event_types_offered?: string[] | null
          events_per_year?: number | null
          facility_locations?: number | null
          facility_rental_revenue?: number | null
          fall_hs_fee?: number | null
          fall_hs_players?: number | null
          fall_youth_fee?: number | null
          fall_youth_players?: number | null
          flat_annual_hs_fee?: number | null
          flat_annual_youth_fee?: number | null
          hard_goods_markup?: string | null
          hard_goods_purchased?: string | null
          hard_goods_spend?: string | null
          has_affiliates?: boolean | null
          hs_players?: number | null
          id?: string
          knows_profit_margin?: string | null
          lessons_capture_pct?: number | null
          lessons_revenue?: number | null
          lessons_revenue_gross?: number | null
          lessons_revenue_model?: string | null
          local_market_competition?: string | null
          market_strategy?: string | null
          market_type?: string | null
          mixed_annual_hs_fee?: number | null
          mixed_annual_youth_fee?: number | null
          monthly_hs_fee?: number | null
          monthly_youth_fee?: number | null
          number_of_affiliates?: number | null
          number_of_brands?: number | null
          number_of_sponsors?: number | null
          operates_multiple_brands?: boolean | null
          operational_structure?: string | null
          org_id: string
          org_type?: string | null
          organization_focus?: string | null
          organization_name?: string | null
          other_addon_revenue?: number | null
          other_events_revenue?: number | null
          parent_communication?: string[] | null
          phone?: string | null
          player_commitment_level?: string | null
          player_mix?: string | null
          player_selection_approach?: string | null
          price_point?: string | null
          pricing_approach?: string | null
          primary_contact_name?: string | null
          profit_margin_range?: string | null
          recruiting_events_revenue?: number | null
          retention_pct?: number | null
          revenue_needs_review?: boolean | null
          revenue_verification?: string | null
          runs_own_events?: string | null
          seasons_offered?: string[] | null
          seeks_sponsorships?: string | null
          showcase_revenue?: number | null
          sponsorship_approach?: string | null
          spring_youth_fee?: number | null
          spring_youth_players?: number | null
          submitted_at?: string
          summer_hs_fee?: number | null
          summer_hs_players?: number | null
          summer_youth_fee?: number | null
          summer_youth_players?: number | null
          team_store_status?: string | null
          team_structure?: string | null
          tiered_packages?: string | null
          total_event_revenue?: number | null
          total_players?: number | null
          total_sponsorship_revenue?: number | null
          total_teams?: number | null
          tournament_fee_per_player?: number | null
          tournament_fee_structure?: string | null
          tournaments_per_hs_player?: string | null
          tournaments_per_youth_player?: string | null
          tournaments_revenue?: number | null
          tryouts_revenue?: number | null
          typical_player_participation?: string | null
          uniform_markup?: string | null
          uniform_package_cost?: string | null
          uniform_vendor?: string | null
          updated_at?: string
          years_in_operation?: string | null
          youth_players?: number | null
        }
        Update: {
          active_coaches?: number | null
          addon_soft_goods_spend?: string | null
          affiliate_apparel_revenue?: number | null
          affiliate_fee_per_player?: number | null
          affiliate_players_charged?: number | null
          alacarte_annual_hs_spend?: number | null
          alacarte_annual_youth_spend?: number | null
          annual_facility_rental_revenue?: number | null
          average_roster_size?: number | null
          avg_months_active?: number | null
          avg_player_years?: number | null
          brand_descriptions?: string | null
          camps_revenue?: number | null
          city_state?: string | null
          clinics_revenue?: number | null
          coach_alignment?: string | null
          coaching_structure?: string | null
          current_growth_trend?: string | null
          data_days_revenue?: number | null
          demand_for_organization?: string | null
          dues_inclusions?: string[] | null
          dues_model?: string | null
          email?: string | null
          event_types_offered?: string[] | null
          events_per_year?: number | null
          facility_locations?: number | null
          facility_rental_revenue?: number | null
          fall_hs_fee?: number | null
          fall_hs_players?: number | null
          fall_youth_fee?: number | null
          fall_youth_players?: number | null
          flat_annual_hs_fee?: number | null
          flat_annual_youth_fee?: number | null
          hard_goods_markup?: string | null
          hard_goods_purchased?: string | null
          hard_goods_spend?: string | null
          has_affiliates?: boolean | null
          hs_players?: number | null
          id?: string
          knows_profit_margin?: string | null
          lessons_capture_pct?: number | null
          lessons_revenue?: number | null
          lessons_revenue_gross?: number | null
          lessons_revenue_model?: string | null
          local_market_competition?: string | null
          market_strategy?: string | null
          market_type?: string | null
          mixed_annual_hs_fee?: number | null
          mixed_annual_youth_fee?: number | null
          monthly_hs_fee?: number | null
          monthly_youth_fee?: number | null
          number_of_affiliates?: number | null
          number_of_brands?: number | null
          number_of_sponsors?: number | null
          operates_multiple_brands?: boolean | null
          operational_structure?: string | null
          org_id?: string
          org_type?: string | null
          organization_focus?: string | null
          organization_name?: string | null
          other_addon_revenue?: number | null
          other_events_revenue?: number | null
          parent_communication?: string[] | null
          phone?: string | null
          player_commitment_level?: string | null
          player_mix?: string | null
          player_selection_approach?: string | null
          price_point?: string | null
          pricing_approach?: string | null
          primary_contact_name?: string | null
          profit_margin_range?: string | null
          recruiting_events_revenue?: number | null
          retention_pct?: number | null
          revenue_needs_review?: boolean | null
          revenue_verification?: string | null
          runs_own_events?: string | null
          seasons_offered?: string[] | null
          seeks_sponsorships?: string | null
          showcase_revenue?: number | null
          sponsorship_approach?: string | null
          spring_youth_fee?: number | null
          spring_youth_players?: number | null
          submitted_at?: string
          summer_hs_fee?: number | null
          summer_hs_players?: number | null
          summer_youth_fee?: number | null
          summer_youth_players?: number | null
          team_store_status?: string | null
          team_structure?: string | null
          tiered_packages?: string | null
          total_event_revenue?: number | null
          total_players?: number | null
          total_sponsorship_revenue?: number | null
          total_teams?: number | null
          tournament_fee_per_player?: number | null
          tournament_fee_structure?: string | null
          tournaments_per_hs_player?: string | null
          tournaments_per_youth_player?: string | null
          tournaments_revenue?: number | null
          tryouts_revenue?: number | null
          typical_player_participation?: string | null
          uniform_markup?: string | null
          uniform_package_cost?: string | null
          uniform_vendor?: string | null
          updated_at?: string
          years_in_operation?: string | null
          youth_players?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_intake_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          active_project_count: number
          city_state: string | null
          completed_project_count: number
          contact_name: string | null
          created_at: string
          draft_project_count: number
          email: string | null
          engagement_baseline_set: boolean
          id: string
          last_activity_at: string
          name: string
          org_type: string | null
          phone: string | null
          plan_activated_at: string | null
          plan_activated_revenue: number | null
          primary_user_id: string | null
          short_domain: string | null
          sport: string
          updated_at: string
        }
        Insert: {
          active_project_count?: number
          city_state?: string | null
          completed_project_count?: number
          contact_name?: string | null
          created_at?: string
          draft_project_count?: number
          email?: string | null
          engagement_baseline_set?: boolean
          id?: string
          last_activity_at?: string
          name: string
          org_type?: string | null
          phone?: string | null
          plan_activated_at?: string | null
          plan_activated_revenue?: number | null
          primary_user_id?: string | null
          short_domain?: string | null
          sport?: string
          updated_at?: string
        }
        Update: {
          active_project_count?: number
          city_state?: string | null
          completed_project_count?: number
          contact_name?: string | null
          created_at?: string
          draft_project_count?: number
          email?: string | null
          engagement_baseline_set?: boolean
          id?: string
          last_activity_at?: string
          name?: string
          org_type?: string | null
          phone?: string | null
          plan_activated_at?: string | null
          plan_activated_revenue?: number | null
          primary_user_id?: string | null
          short_domain?: string | null
          sport?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          module_access: string[]
          org_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          module_access?: string[]
          org_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          module_access?: string[]
          org_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          active: boolean
          aliases: string[] | null
          athletic_conference: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          id: string
          level: string
          logo_url: string | null
          mascot: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          short_name: string | null
          state: string | null
          updated_at: string
          verified: boolean
          website: string | null
        }
        Insert: {
          active?: boolean
          aliases?: string[] | null
          athletic_conference?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          level?: string
          logo_url?: string | null
          mascot?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          short_name?: string | null
          state?: string | null
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          active?: boolean
          aliases?: string[] | null
          athletic_conference?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          level?: string
          logo_url?: string | null
          mascot?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          short_name?: string | null
          state?: string | null
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: []
      }
      shortlink_clicks: {
        Row: {
          country: string | null
          id: string
          ip_hash: string | null
          occurred_at: string
          referer: string | null
          shortlink_id: string
          user_agent: string | null
        }
        Insert: {
          country?: string | null
          id?: string
          ip_hash?: string | null
          occurred_at?: string
          referer?: string | null
          shortlink_id: string
          user_agent?: string | null
        }
        Update: {
          country?: string | null
          id?: string
          ip_hash?: string | null
          occurred_at?: string
          referer?: string | null
          shortlink_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shortlink_clicks_shortlink_id_fkey"
            columns: ["shortlink_id"]
            isOneToOne: false
            referencedRelation: "org_shortlinks"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsorship_lead_notes: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_client_visible: boolean
          lead_id: string
          note_text: string
          org_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_client_visible?: boolean
          lead_id: string
          note_text: string
          org_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_client_visible?: boolean
          lead_id?: string
          note_text?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsorship_lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "sponsorship_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsorship_lead_notes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsorship_lead_stage_history: {
        Row: {
          changed_at: string
          changed_by: string
          from_stage: string | null
          id: string
          lead_id: string
          notes: string | null
          org_id: string
          to_stage: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          from_stage?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          org_id: string
          to_stage: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          from_stage?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          org_id?: string
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsorship_lead_stage_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "sponsorship_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsorship_lead_stage_history_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsorship_leads: {
        Row: {
          ai_generated: boolean
          ai_generation_notes: string | null
          assigned_to: string | null
          business_name: string
          business_type: string | null
          city_state: string | null
          closed_at: string | null
          closed_value: number | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          is_warm: boolean
          last_stage_change_at: string
          org_id: string
          proposed_value: number | null
          source: string
          source_other: string | null
          sponsorship_tier: string | null
          stage: string
          submitted_at: string
          updated_at: string
          warm_flagged_by_dsf: boolean
          warm_flagged_by_org: boolean
          warm_notes: string | null
          warm_reasons: string[] | null
        }
        Insert: {
          ai_generated?: boolean
          ai_generation_notes?: string | null
          assigned_to?: string | null
          business_name: string
          business_type?: string | null
          city_state?: string | null
          closed_at?: string | null
          closed_value?: number | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          is_warm?: boolean
          last_stage_change_at?: string
          org_id: string
          proposed_value?: number | null
          source: string
          source_other?: string | null
          sponsorship_tier?: string | null
          stage?: string
          submitted_at?: string
          updated_at?: string
          warm_flagged_by_dsf?: boolean
          warm_flagged_by_org?: boolean
          warm_notes?: string | null
          warm_reasons?: string[] | null
        }
        Update: {
          ai_generated?: boolean
          ai_generation_notes?: string | null
          assigned_to?: string | null
          business_name?: string
          business_type?: string | null
          city_state?: string | null
          closed_at?: string | null
          closed_value?: number | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          is_warm?: boolean
          last_stage_change_at?: string
          org_id?: string
          proposed_value?: number | null
          source?: string
          source_other?: string | null
          sponsorship_tier?: string | null
          stage?: string
          submitted_at?: string
          updated_at?: string
          warm_flagged_by_dsf?: boolean
          warm_flagged_by_org?: boolean
          warm_notes?: string | null
          warm_reasons?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsorship_leads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_integrations: {
        Row: {
          activate_when: string | null
          category: string | null
          created_at: string
          display_name: string
          env_var_names: string[]
          estimated_cost_monthly: string | null
          id: string
          integration_key: string
          last_health_check_at: string | null
          last_health_check_result: Json | null
          notes: string | null
          provider_docs_url: string | null
          setup_instructions: string | null
          sort_order: number
          status: string
          updated_at: string
          used_by_features: string[]
          what_unlocks_when_wired: string | null
          what_works_when_stubbed: string | null
        }
        Insert: {
          activate_when?: string | null
          category?: string | null
          created_at?: string
          display_name: string
          env_var_names?: string[]
          estimated_cost_monthly?: string | null
          id?: string
          integration_key: string
          last_health_check_at?: string | null
          last_health_check_result?: Json | null
          notes?: string | null
          provider_docs_url?: string | null
          setup_instructions?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
          used_by_features?: string[]
          what_unlocks_when_wired?: string | null
          what_works_when_stubbed?: string | null
        }
        Update: {
          activate_when?: string | null
          category?: string | null
          created_at?: string
          display_name?: string
          env_var_names?: string[]
          estimated_cost_monthly?: string | null
          id?: string
          integration_key?: string
          last_health_check_at?: string | null
          last_health_check_result?: Json | null
          notes?: string | null
          provider_docs_url?: string | null
          setup_instructions?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
          used_by_features?: string[]
          what_unlocks_when_wired?: string | null
          what_works_when_stubbed?: string | null
        }
        Relationships: []
      }
      task_activity_log: {
        Row: {
          action: Database["public"]["Enums"]["task_action"]
          created_at: string
          id: string
          new_value: string | null
          old_value: string | null
          org_id: string
          performed_by: string | null
          task_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["task_action"]
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          org_id: string
          performed_by?: string | null
          task_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["task_action"]
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          org_id?: string
          performed_by?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_activity_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_activity_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "org_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_notes: {
        Row: {
          created_at: string
          created_by: string
          id: string
          note_text: string
          org_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          note_text: string
          org_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          note_text?: string
          org_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_notes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "org_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          display_order: number
          engine: Database["public"]["Enums"]["task_engine"]
          id: string
          is_system_template: boolean
          owner_type: Database["public"]["Enums"]["task_owner_type"]
          suggested_days_to_complete: number
          task_type: Database["public"]["Enums"]["task_type"]
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          display_order?: number
          engine: Database["public"]["Enums"]["task_engine"]
          id?: string
          is_system_template?: boolean
          owner_type?: Database["public"]["Enums"]["task_owner_type"]
          suggested_days_to_complete?: number
          task_type: Database["public"]["Enums"]["task_type"]
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          display_order?: number
          engine?: Database["public"]["Enums"]["task_engine"]
          id?: string
          is_system_template?: boolean
          owner_type?: Database["public"]["Enums"]["task_owner_type"]
          suggested_days_to_complete?: number
          task_type?: Database["public"]["Enums"]["task_type"]
          title?: string
        }
        Relationships: []
      }
      user_email_connections: {
        Row: {
          access_token_encrypted: string | null
          connected_at: string
          display_name: string | null
          email_address: string
          id: string
          last_error: string | null
          last_used_at: string | null
          provider: string
          refresh_token_encrypted: string
          scopes: string | null
          status: string
          token_expires_at: string | null
          user_id: string
        }
        Insert: {
          access_token_encrypted?: string | null
          connected_at?: string
          display_name?: string | null
          email_address: string
          id?: string
          last_error?: string | null
          last_used_at?: string | null
          provider: string
          refresh_token_encrypted: string
          scopes?: string | null
          status?: string
          token_expires_at?: string | null
          user_id: string
        }
        Update: {
          access_token_encrypted?: string | null
          connected_at?: string
          display_name?: string | null
          email_address?: string
          id?: string
          last_error?: string | null
          last_used_at?: string | null
          provider?: string
          refresh_token_encrypted?: string
          scopes?: string | null
          status?: string
          token_expires_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_email_oauth_states: {
        Row: {
          created_at: string
          provider: string
          redirect_to: string | null
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          provider: string
          redirect_to?: string | null
          state: string
          user_id: string
        }
        Update: {
          created_at?: string
          provider?: string
          redirect_to?: string | null
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      user_onboarding: {
        Row: {
          branding_completed_at: string | null
          created_at: string
          id: string
          intake_completed_at: string | null
          intake_started_at: string | null
          password_set_at: string | null
          report_viewed_at: string | null
          updated_at: string
          user_id: string
          welcomed_at: string | null
        }
        Insert: {
          branding_completed_at?: string | null
          created_at?: string
          id?: string
          intake_completed_at?: string | null
          intake_started_at?: string | null
          password_set_at?: string | null
          report_viewed_at?: string | null
          updated_at?: string
          user_id: string
          welcomed_at?: string | null
        }
        Update: {
          branding_completed_at?: string | null
          created_at?: string
          id?: string
          intake_completed_at?: string | null
          intake_started_at?: string | null
          password_set_at?: string | null
          report_viewed_at?: string | null
          updated_at?: string
          user_id?: string
          welcomed_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_organization_cascade: {
        Args: { _org_id: string }
        Returns: undefined
      }
      claim_pending_invitation: {
        Args: never
        Returns: {
          claimed: boolean
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      count_segment_contacts: { Args: { _segment_id: string }; Returns: number }
      current_org_id: { Args: never; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      find_duplicate_contact: {
        Args: {
          _email: string
          _first_name: string
          _last_name: string
          _org_id: string
          _phone: string
        }
        Returns: string
      }
      generate_staff_token: { Args: never; Returns: string }
      get_org_sponsorship_view: {
        Args: { p_org_id: string }
        Returns: {
          assigned_rep_name: string
          business_name: string
          business_type: string
          city_state: string
          client_notes: Json
          closed_at: string
          closed_value: number
          contact_name: string
          id: string
          is_warm: boolean
          last_stage_change_at: string
          source: string
          sponsorship_tier: string
          stage: string
          stage_simplified: string
          submitted_at: string
          warm_notes: string
          warm_reasons: string[]
        }[]
      }
      has_module_access: {
        Args: { _module: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_primary: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recalculate_revenue_share: {
        Args: { p_org_id: string }
        Returns: undefined
      }
      recompute_org_project_counts: {
        Args: { _org_id: string }
        Returns: undefined
      }
      recompute_org_segment_counts: {
        Args: { _org_id: string }
        Returns: undefined
      }
      recompute_platform_marketing_scores: {
        Args: { _org_id: string }
        Returns: undefined
      }
      recompute_sponsorship_summary: {
        Args: { _org_id: string }
        Returns: undefined
      }
      seed_org_system_segments: {
        Args: { _org_id: string }
        Returns: undefined
      }
      seed_org_team_segments: { Args: { _org_id: string }; Returns: undefined }
      seed_portal_config: {
        Args: { _acq_id: string; _state: string }
        Returns: undefined
      }
      update_acquisition_phases: { Args: never; Returns: undefined }
    }
    Enums: {
      admin_review_kind: "high_alert" | "revenue_review"
      app_role: "admin" | "org_user" | "seller_portal"
      invitation_status: "pending" | "accepted" | "revoked" | "expired"
      monetization_tier:
        | "Foundational"
        | "Emerging"
        | "Growth"
        | "Advanced"
        | "Elite"
      notification_recipient_role: "admin" | "org_all"
      notification_type:
        | "task_completed"
        | "task_overdue"
        | "no_activity_digest"
        | "high_risk_alert"
        | "project_released"
        | "project_completion_pending"
        | "project_completed"
        | "next_project_suggested"
        | "calculator_share"
        | "tier_advancement"
        | "sponsorship_closed"
        | "sponsorship_stale"
      org_note_tag:
        | "internal_planning"
        | "kickoff"
        | "check_in"
        | "issue"
        | "win"
        | "renewal"
      org_project_status: "draft" | "active" | "completed"
      org_sport: "baseball" | "softball" | "other"
      plan_status: "draft" | "active" | "parked"
      task_action:
        | "created"
        | "status_changed"
        | "note_added"
        | "due_date_changed"
        | "reassigned"
        | "completed"
        | "assigned_to_project"
        | "removed_from_project"
        | "project_released"
        | "project_completed"
      task_engine:
        | "Pricing"
        | "Sponsorship"
        | "Apparel"
        | "Events"
        | "Add-Ons"
        | "Retention"
        | "Facility"
        | "Operations"
        | "Affiliate"
        | "Platform"
        | "Marketing"
      task_owner_type: "curve_team" | "org_user" | "third_party" | "combo"
      task_priority: "high" | "medium" | "low"
      task_source: "system" | "library" | "custom"
      task_status: "not_started" | "in_progress" | "completed" | "overdue"
      task_type: "Strategy" | "Execute" | "Communication" | "Track"
      team_member_role:
        | "player"
        | "coach"
        | "assistant_coach"
        | "team_manager"
        | "parent"
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
    Enums: {
      admin_review_kind: ["high_alert", "revenue_review"],
      app_role: ["admin", "org_user", "seller_portal"],
      invitation_status: ["pending", "accepted", "revoked", "expired"],
      monetization_tier: [
        "Foundational",
        "Emerging",
        "Growth",
        "Advanced",
        "Elite",
      ],
      notification_recipient_role: ["admin", "org_all"],
      notification_type: [
        "task_completed",
        "task_overdue",
        "no_activity_digest",
        "high_risk_alert",
        "project_released",
        "project_completion_pending",
        "project_completed",
        "next_project_suggested",
        "calculator_share",
        "tier_advancement",
        "sponsorship_closed",
        "sponsorship_stale",
      ],
      org_note_tag: [
        "internal_planning",
        "kickoff",
        "check_in",
        "issue",
        "win",
        "renewal",
      ],
      org_project_status: ["draft", "active", "completed"],
      org_sport: ["baseball", "softball", "other"],
      plan_status: ["draft", "active", "parked"],
      task_action: [
        "created",
        "status_changed",
        "note_added",
        "due_date_changed",
        "reassigned",
        "completed",
        "assigned_to_project",
        "removed_from_project",
        "project_released",
        "project_completed",
      ],
      task_engine: [
        "Pricing",
        "Sponsorship",
        "Apparel",
        "Events",
        "Add-Ons",
        "Retention",
        "Facility",
        "Operations",
        "Affiliate",
        "Platform",
        "Marketing",
      ],
      task_owner_type: ["curve_team", "org_user", "third_party", "combo"],
      task_priority: ["high", "medium", "low"],
      task_source: ["system", "library", "custom"],
      task_status: ["not_started", "in_progress", "completed", "overdue"],
      task_type: ["Strategy", "Execute", "Communication", "Track"],
      team_member_role: [
        "player",
        "coach",
        "assistant_coach",
        "team_manager",
        "parent",
      ],
    },
  },
} as const
