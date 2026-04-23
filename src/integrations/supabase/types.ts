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
      org_communication_log: {
        Row: {
          communication_type: string
          format: string | null
          generated_at: string
          generated_by: string
          generated_on_behalf_of_org: boolean
          id: string
          org_id: string
          outreach_track: string | null
          prompt_text: string | null
          tone: string | null
          was_refined: boolean
        }
        Insert: {
          communication_type: string
          format?: string | null
          generated_at?: string
          generated_by: string
          generated_on_behalf_of_org?: boolean
          id?: string
          org_id: string
          outreach_track?: string | null
          prompt_text?: string | null
          tone?: string | null
          was_refined?: boolean
        }
        Update: {
          communication_type?: string
          format?: string | null
          generated_at?: string
          generated_by?: string
          generated_on_behalf_of_org?: boolean
          id?: string
          org_id?: string
          outreach_track?: string | null
          prompt_text?: string | null
          tone?: string | null
          was_refined?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "org_communication_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
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
          id: string
          last_activity_at: string
          name: string
          org_type: string | null
          phone: string | null
          plan_activated_at: string | null
          primary_user_id: string | null
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
          id?: string
          last_activity_at?: string
          name: string
          org_type?: string | null
          phone?: string | null
          plan_activated_at?: string | null
          primary_user_id?: string | null
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
          id?: string
          last_activity_at?: string
          name?: string
          org_type?: string | null
          phone?: string | null
          plan_activated_at?: string | null
          primary_user_id?: string | null
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
          org_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          org_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
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
      user_onboarding: {
        Row: {
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
      claim_pending_invitation: {
        Args: never
        Returns: {
          claimed: boolean
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      current_org_id: { Args: never; Returns: string }
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
      recompute_org_project_counts: {
        Args: { _org_id: string }
        Returns: undefined
      }
      recompute_platform_marketing_scores: {
        Args: { _org_id: string }
        Returns: undefined
      }
    }
    Enums: {
      admin_review_kind: "high_alert" | "revenue_review"
      app_role: "admin" | "org_user"
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
      org_note_tag:
        | "internal_planning"
        | "kickoff"
        | "check_in"
        | "issue"
        | "win"
        | "renewal"
      org_project_status: "draft" | "active" | "completed"
      plan_status: "draft" | "active"
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
      app_role: ["admin", "org_user"],
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
      plan_status: ["draft", "active"],
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
    },
  },
} as const
