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
      derived_metrics: {
        Row: {
          add_on_revenue: number | null
          add_on_revenue_per_player: number | null
          addon_opportunity_high: number | null
          addon_opportunity_low: number | null
          addon_score: number | null
          apparel_margin_pct: number | null
          apparel_opportunity_high: number | null
          apparel_opportunity_low: number | null
          apparel_profit: number | null
          apparel_revenue_per_player: number | null
          apparel_score: number | null
          at_benchmark: boolean | null
          calculated_at: string
          diagnosis_text: string | null
          dues_revenue: number | null
          dues_revenue_pct: number | null
          estimated_churned_players: number | null
          estimated_returning_players: number | null
          event_opportunity_high: number | null
          event_opportunity_low: number | null
          event_score: number | null
          facility_revenue_pct: number | null
          high_dues_concentration: boolean | null
          high_sponsorship_dependency: boolean | null
          hs_player_pct: number | null
          id: string
          market_multiplier: number | null
          monetization_tier:
            | Database["public"]["Enums"]["monetization_tier"]
            | null
          next_steps: Json | null
          non_dues_revenue: number | null
          non_dues_revenue_per_player: number | null
          org_id: string
          pricing_opportunity_high: number | null
          pricing_opportunity_low: number | null
          pricing_score: number | null
          priority_engine: string | null
          retention_opportunity_high: number | null
          retention_opportunity_low: number | null
          retention_score: number | null
          revenue_benchmark: number | null
          revenue_gap: number | null
          revenue_per_event: number | null
          revenue_per_player: number | null
          sponsorship_opportunity_high: number | null
          sponsorship_opportunity_low: number | null
          sponsorship_revenue_per_sponsor: number | null
          sponsorship_score: number | null
          total_engine_score: number | null
          total_opportunity_high: number | null
          total_opportunity_low: number | null
        }
        Insert: {
          add_on_revenue?: number | null
          add_on_revenue_per_player?: number | null
          addon_opportunity_high?: number | null
          addon_opportunity_low?: number | null
          addon_score?: number | null
          apparel_margin_pct?: number | null
          apparel_opportunity_high?: number | null
          apparel_opportunity_low?: number | null
          apparel_profit?: number | null
          apparel_revenue_per_player?: number | null
          apparel_score?: number | null
          at_benchmark?: boolean | null
          calculated_at?: string
          diagnosis_text?: string | null
          dues_revenue?: number | null
          dues_revenue_pct?: number | null
          estimated_churned_players?: number | null
          estimated_returning_players?: number | null
          event_opportunity_high?: number | null
          event_opportunity_low?: number | null
          event_score?: number | null
          facility_revenue_pct?: number | null
          high_dues_concentration?: boolean | null
          high_sponsorship_dependency?: boolean | null
          hs_player_pct?: number | null
          id?: string
          market_multiplier?: number | null
          monetization_tier?:
            | Database["public"]["Enums"]["monetization_tier"]
            | null
          next_steps?: Json | null
          non_dues_revenue?: number | null
          non_dues_revenue_per_player?: number | null
          org_id: string
          pricing_opportunity_high?: number | null
          pricing_opportunity_low?: number | null
          pricing_score?: number | null
          priority_engine?: string | null
          retention_opportunity_high?: number | null
          retention_opportunity_low?: number | null
          retention_score?: number | null
          revenue_benchmark?: number | null
          revenue_gap?: number | null
          revenue_per_event?: number | null
          revenue_per_player?: number | null
          sponsorship_opportunity_high?: number | null
          sponsorship_opportunity_low?: number | null
          sponsorship_revenue_per_sponsor?: number | null
          sponsorship_score?: number | null
          total_engine_score?: number | null
          total_opportunity_high?: number | null
          total_opportunity_low?: number | null
        }
        Update: {
          add_on_revenue?: number | null
          add_on_revenue_per_player?: number | null
          addon_opportunity_high?: number | null
          addon_opportunity_low?: number | null
          addon_score?: number | null
          apparel_margin_pct?: number | null
          apparel_opportunity_high?: number | null
          apparel_opportunity_low?: number | null
          apparel_profit?: number | null
          apparel_revenue_per_player?: number | null
          apparel_score?: number | null
          at_benchmark?: boolean | null
          calculated_at?: string
          diagnosis_text?: string | null
          dues_revenue?: number | null
          dues_revenue_pct?: number | null
          estimated_churned_players?: number | null
          estimated_returning_players?: number | null
          event_opportunity_high?: number | null
          event_opportunity_low?: number | null
          event_score?: number | null
          facility_revenue_pct?: number | null
          high_dues_concentration?: boolean | null
          high_sponsorship_dependency?: boolean | null
          hs_player_pct?: number | null
          id?: string
          market_multiplier?: number | null
          monetization_tier?:
            | Database["public"]["Enums"]["monetization_tier"]
            | null
          next_steps?: Json | null
          non_dues_revenue?: number | null
          non_dues_revenue_per_player?: number | null
          org_id?: string
          pricing_opportunity_high?: number | null
          pricing_opportunity_low?: number | null
          pricing_score?: number | null
          priority_engine?: string | null
          retention_opportunity_high?: number | null
          retention_opportunity_low?: number | null
          retention_score?: number | null
          revenue_benchmark?: number | null
          revenue_gap?: number | null
          revenue_per_event?: number | null
          revenue_per_player?: number | null
          sponsorship_opportunity_high?: number | null
          sponsorship_opportunity_low?: number | null
          sponsorship_revenue_per_sponsor?: number | null
          sponsorship_score?: number | null
          total_engine_score?: number | null
          total_opportunity_high?: number | null
          total_opportunity_low?: number | null
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
      organization_intake: {
        Row: {
          apparel_margin: string | null
          apparel_model: string | null
          apparel_revenue: number | null
          average_roster_size: number | null
          avg_hs_player_fee: number | null
          avg_player_years: number | null
          avg_youth_player_fee: number | null
          camps_revenue: number | null
          city_state: string | null
          clinics_revenue: number | null
          coach_alignment: string | null
          coaching_structure: string | null
          current_growth_trend: string | null
          demand_for_organization: string | null
          dues_inclusions: string[] | null
          email: string | null
          events_per_year: number | null
          facility_rental_revenue: number | null
          hs_players: number | null
          id: string
          knows_profit_margin: string | null
          lessons_revenue: number | null
          local_market_competition: string | null
          market_strategy: string | null
          market_type: string | null
          number_of_sponsors: number | null
          operational_structure: string | null
          org_id: string
          org_type: string | null
          organization_focus: string | null
          organization_name: string | null
          other_addon_revenue: number | null
          parent_communication: string[] | null
          phone: string | null
          player_commitment_level: string | null
          player_mix: string | null
          player_selection_approach: string | null
          price_point: string | null
          pricing_approach: string | null
          primary_contact_name: string | null
          profit_margin_range: string | null
          retention_pct: number | null
          runs_own_events: string | null
          seasons_offered: string[] | null
          seeks_sponsorships: string | null
          showcase_revenue: number | null
          sponsorship_approach: string | null
          submitted_at: string
          team_structure: string | null
          tiered_packages: string | null
          total_annual_revenue: number | null
          total_event_revenue: number | null
          total_players: number | null
          total_sponsorship_revenue: number | null
          total_teams: number | null
          typical_player_participation: string | null
          updated_at: string
          years_in_operation: string | null
          youth_players: number | null
        }
        Insert: {
          apparel_margin?: string | null
          apparel_model?: string | null
          apparel_revenue?: number | null
          average_roster_size?: number | null
          avg_hs_player_fee?: number | null
          avg_player_years?: number | null
          avg_youth_player_fee?: number | null
          camps_revenue?: number | null
          city_state?: string | null
          clinics_revenue?: number | null
          coach_alignment?: string | null
          coaching_structure?: string | null
          current_growth_trend?: string | null
          demand_for_organization?: string | null
          dues_inclusions?: string[] | null
          email?: string | null
          events_per_year?: number | null
          facility_rental_revenue?: number | null
          hs_players?: number | null
          id?: string
          knows_profit_margin?: string | null
          lessons_revenue?: number | null
          local_market_competition?: string | null
          market_strategy?: string | null
          market_type?: string | null
          number_of_sponsors?: number | null
          operational_structure?: string | null
          org_id: string
          org_type?: string | null
          organization_focus?: string | null
          organization_name?: string | null
          other_addon_revenue?: number | null
          parent_communication?: string[] | null
          phone?: string | null
          player_commitment_level?: string | null
          player_mix?: string | null
          player_selection_approach?: string | null
          price_point?: string | null
          pricing_approach?: string | null
          primary_contact_name?: string | null
          profit_margin_range?: string | null
          retention_pct?: number | null
          runs_own_events?: string | null
          seasons_offered?: string[] | null
          seeks_sponsorships?: string | null
          showcase_revenue?: number | null
          sponsorship_approach?: string | null
          submitted_at?: string
          team_structure?: string | null
          tiered_packages?: string | null
          total_annual_revenue?: number | null
          total_event_revenue?: number | null
          total_players?: number | null
          total_sponsorship_revenue?: number | null
          total_teams?: number | null
          typical_player_participation?: string | null
          updated_at?: string
          years_in_operation?: string | null
          youth_players?: number | null
        }
        Update: {
          apparel_margin?: string | null
          apparel_model?: string | null
          apparel_revenue?: number | null
          average_roster_size?: number | null
          avg_hs_player_fee?: number | null
          avg_player_years?: number | null
          avg_youth_player_fee?: number | null
          camps_revenue?: number | null
          city_state?: string | null
          clinics_revenue?: number | null
          coach_alignment?: string | null
          coaching_structure?: string | null
          current_growth_trend?: string | null
          demand_for_organization?: string | null
          dues_inclusions?: string[] | null
          email?: string | null
          events_per_year?: number | null
          facility_rental_revenue?: number | null
          hs_players?: number | null
          id?: string
          knows_profit_margin?: string | null
          lessons_revenue?: number | null
          local_market_competition?: string | null
          market_strategy?: string | null
          market_type?: string | null
          number_of_sponsors?: number | null
          operational_structure?: string | null
          org_id?: string
          org_type?: string | null
          organization_focus?: string | null
          organization_name?: string | null
          other_addon_revenue?: number | null
          parent_communication?: string[] | null
          phone?: string | null
          player_commitment_level?: string | null
          player_mix?: string | null
          player_selection_approach?: string | null
          price_point?: string | null
          pricing_approach?: string | null
          primary_contact_name?: string | null
          profit_margin_range?: string | null
          retention_pct?: number | null
          runs_own_events?: string | null
          seasons_offered?: string[] | null
          seeks_sponsorships?: string | null
          showcase_revenue?: number | null
          sponsorship_approach?: string | null
          submitted_at?: string
          team_structure?: string | null
          tiered_packages?: string | null
          total_annual_revenue?: number | null
          total_event_revenue?: number | null
          total_players?: number | null
          total_sponsorship_revenue?: number | null
          total_teams?: number | null
          typical_player_participation?: string | null
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
          city_state: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          org_type: string | null
          phone: string | null
          primary_user_id: string | null
          updated_at: string
        }
        Insert: {
          city_state?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          org_type?: string | null
          phone?: string | null
          primary_user_id?: string | null
          updated_at?: string
        }
        Update: {
          city_state?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          org_type?: string | null
          phone?: string | null
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
    }
    Enums: {
      app_role: "admin" | "org_user"
      invitation_status: "pending" | "accepted" | "revoked" | "expired"
      monetization_tier:
        | "Foundational"
        | "Emerging"
        | "Growth"
        | "Advanced"
        | "Elite"
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
      app_role: ["admin", "org_user"],
      invitation_status: ["pending", "accepted", "revoked", "expired"],
      monetization_tier: [
        "Foundational",
        "Emerging",
        "Growth",
        "Advanced",
        "Elite",
      ],
    },
  },
} as const
