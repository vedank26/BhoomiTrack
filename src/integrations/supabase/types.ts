export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      acquisition_cases: {
        Row: {
          assigned_to: string | null;
          case_no: string;
          closed_at: string | null;
          created_at: string;
          created_by: string | null;
          current_stage: Database["public"]["Enums"]["workflow_stage"];
          id: string;
          method: Database["public"]["Enums"]["acquisition_method"];
          opened_at: string;
          parcel_id: string;
          priority: Database["public"]["Enums"]["case_priority"];
          project_id: string;
          responsible_office: string | null;
          status: Database["public"]["Enums"]["case_status"];
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          assigned_to?: string | null;
          case_no: string;
          closed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          current_stage?: Database["public"]["Enums"]["workflow_stage"];
          id?: string;
          method?: Database["public"]["Enums"]["acquisition_method"];
          opened_at?: string;
          parcel_id: string;
          priority?: Database["public"]["Enums"]["case_priority"];
          project_id: string;
          responsible_office?: string | null;
          status?: Database["public"]["Enums"]["case_status"];
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          assigned_to?: string | null;
          case_no?: string;
          closed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          current_stage?: Database["public"]["Enums"]["workflow_stage"];
          id?: string;
          method?: Database["public"]["Enums"]["acquisition_method"];
          opened_at?: string;
          parcel_id?: string;
          priority?: Database["public"]["Enums"]["case_priority"];
          project_id?: string;
          responsible_office?: string | null;
          status?: Database["public"]["Enums"]["case_status"];
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "acquisition_cases_parcel_id_fkey";
            columns: ["parcel_id"];
            isOneToOne: false;
            referencedRelation: "parcels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "acquisition_cases_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      alignments: {
        Row: {
          created_at: string;
          created_by: string | null;
          end_chainage_m: number | null;
          geom: unknown;
          id: string;
          metadata: Json;
          name: string | null;
          project_id: string;
          source_crs: string | null;
          start_chainage_m: number | null;
          updated_at: string;
          updated_by: string | null;
          version_ref: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          end_chainage_m?: number | null;
          geom?: unknown;
          id?: string;
          metadata?: Json;
          name?: string | null;
          project_id: string;
          source_crs?: string | null;
          start_chainage_m?: number | null;
          updated_at?: string;
          updated_by?: string | null;
          version_ref: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          end_chainage_m?: number | null;
          geom?: unknown;
          id?: string;
          metadata?: Json;
          name?: string | null;
          project_id?: string;
          source_crs?: string | null;
          start_chainage_m?: number | null;
          updated_at?: string;
          updated_by?: string | null;
          version_ref?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alignments_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      case_workflow_events: {
        Row: {
          action: string | null;
          actor_label: string | null;
          actor_user_id: string | null;
          case_id: string;
          created_at: string;
          event_type: string;
          from_stage: Database["public"]["Enums"]["workflow_stage"] | null;
          id: string;
          metadata: Json;
          occurred_at: string;
          remarks: string | null;
          stage: Database["public"]["Enums"]["workflow_stage"];
          to_stage: Database["public"]["Enums"]["workflow_stage"] | null;
        };
        Insert: {
          action?: string | null;
          actor_label?: string | null;
          actor_user_id?: string | null;
          case_id: string;
          created_at?: string;
          event_type: string;
          from_stage?: Database["public"]["Enums"]["workflow_stage"] | null;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          remarks?: string | null;
          stage: Database["public"]["Enums"]["workflow_stage"];
          to_stage?: Database["public"]["Enums"]["workflow_stage"] | null;
        };
        Update: {
          action?: string | null;
          actor_label?: string | null;
          actor_user_id?: string | null;
          case_id?: string;
          created_at?: string;
          event_type?: string;
          from_stage?: Database["public"]["Enums"]["workflow_stage"] | null;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          remarks?: string | null;
          stage?: Database["public"]["Enums"]["workflow_stage"];
          to_stage?: Database["public"]["Enums"]["workflow_stage"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "case_workflow_events_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "acquisition_cases";
            referencedColumns: ["id"];
          },
        ];
      };
      survey_land_record_verifications: {
        Row: {
          case_id: string;
          created_at: string;
          id: string;
          parcel_id: string;
          record_date: string | null;
          record_reference: string | null;
          record_source: string | null;
          record_type: string;
          remarks: string | null;
          updated_at: string;
          verification_date: string | null;
          verification_status: string;
          verified_by: string | null;
        };
        Insert: {
          case_id: string;
          created_at?: string;
          id?: string;
          parcel_id: string;
          record_date?: string | null;
          record_reference?: string | null;
          record_source?: string | null;
          record_type: string;
          remarks?: string | null;
          updated_at?: string;
          verification_date?: string | null;
          verification_status?: string;
          verified_by?: string | null;
        };
        Update: {
          case_id?: string;
          created_at?: string;
          id?: string;
          parcel_id?: string;
          record_date?: string | null;
          record_reference?: string | null;
          record_source?: string | null;
          record_type?: string;
          remarks?: string | null;
          updated_at?: string;
          verification_date?: string | null;
          verification_status?: string;
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "survey_land_record_verifications_case_parcel_fkey";
            columns: ["case_id", "parcel_id"];
            isOneToOne: false;
            referencedRelation: "acquisition_cases";
            referencedColumns: ["id", "parcel_id"];
          },
        ];
      };
      survey_ownership_interest_verifications: {
        Row: {
          case_id: string;
          created_at: string;
          id: string;
          interest_id: string;
          parcel_id: string;
          record_reference: string | null;
          remarks: string | null;
          updated_at: string;
          verification_date: string | null;
          verification_source: string | null;
          verification_status: string;
          verified_by: string | null;
        };
        Insert: {
          case_id: string;
          created_at?: string;
          id?: string;
          interest_id: string;
          parcel_id: string;
          record_reference?: string | null;
          remarks?: string | null;
          updated_at?: string;
          verification_date?: string | null;
          verification_source?: string | null;
          verification_status?: string;
          verified_by?: string | null;
        };
        Update: {
          case_id?: string;
          created_at?: string;
          id?: string;
          interest_id?: string;
          parcel_id?: string;
          record_reference?: string | null;
          remarks?: string | null;
          updated_at?: string;
          verification_date?: string | null;
          verification_source?: string | null;
          verification_status?: string;
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "survey_ownership_interest_verifications_case_parcel_fkey";
            columns: ["case_id", "parcel_id"];
            isOneToOne: false;
            referencedRelation: "acquisition_cases";
            referencedColumns: ["id", "parcel_id"];
          },
          {
            foreignKeyName: "survey_ownership_interest_verifications_interest_id_fkey";
            columns: ["interest_id"];
            isOneToOne: false;
            referencedRelation: "land_interests";
            referencedColumns: ["id"];
          },
        ];
      };
      survey_measurement_verifications: {
        Row: {
          boundary_verification_status: string;
          case_id: string;
          created_at: string;
          evidence_reference: string | null;
          field_notes: string | null;
          field_visit_date: string | null;
          id: string;
          measured_area_sqm: number | null;
          measurement_date: string | null;
          measurement_purpose: string | null;
          measurement_reference: string | null;
          measurement_status: string;
          parcel_id: string;
          recorded_by: string | null;
          remarks: string | null;
          scheduled_date: string | null;
          updated_at: string;
        };
        Insert: {
          boundary_verification_status?: string;
          case_id: string;
          created_at?: string;
          evidence_reference?: string | null;
          field_notes?: string | null;
          field_visit_date?: string | null;
          id?: string;
          measured_area_sqm?: number | null;
          measurement_date?: string | null;
          measurement_purpose?: string | null;
          measurement_reference?: string | null;
          measurement_status?: string;
          parcel_id: string;
          recorded_by?: string | null;
          remarks?: string | null;
          scheduled_date?: string | null;
          updated_at?: string;
        };
        Update: {
          boundary_verification_status?: string;
          case_id?: string;
          created_at?: string;
          evidence_reference?: string | null;
          field_notes?: string | null;
          field_visit_date?: string | null;
          id?: string;
          measured_area_sqm?: number | null;
          measurement_date?: string | null;
          measurement_purpose?: string | null;
          measurement_reference?: string | null;
          measurement_status?: string;
          parcel_id?: string;
          recorded_by?: string | null;
          remarks?: string | null;
          scheduled_date?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "survey_measurement_verifications_case_parcel_fkey";
            columns: ["case_id", "parcel_id"];
            isOneToOne: false;
            referencedRelation: "acquisition_cases";
            referencedColumns: ["id", "parcel_id"];
          },
        ];
      };
      survey_issues: {
        Row: {
          case_id: string;
          created_at: string;
          description: string;
          evidence_reference: string | null;
          id: string;
          issue_type: string;
          parcel_id: string;
          raised_at: string;
          raised_by: string;
          remarks: string | null;
          resolution: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          severity: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          case_id: string;
          created_at?: string;
          description: string;
          evidence_reference?: string | null;
          id?: string;
          issue_type: string;
          parcel_id: string;
          raised_at?: string;
          raised_by?: string;
          remarks?: string | null;
          resolution?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          case_id?: string;
          created_at?: string;
          description?: string;
          evidence_reference?: string | null;
          id?: string;
          issue_type?: string;
          parcel_id?: string;
          raised_at?: string;
          raised_by?: string;
          remarks?: string | null;
          resolution?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "survey_issues_case_parcel_fkey";
            columns: ["case_id", "parcel_id"];
            isOneToOne: false;
            referencedRelation: "acquisition_cases";
            referencedColumns: ["id", "parcel_id"];
          },
        ];
      };
      land_interests: {
        Row: {
          created_at: string;
          effective_from: string | null;
          effective_to: string | null;
          id: string;
          interest_type: Database["public"]["Enums"]["interest_type"];
          parcel_id: string;
          party_id: string;
          record_ref: string | null;
          share_denominator: number | null;
          share_numerator: number | null;
          updated_at: string;
          verification: Database["public"]["Enums"]["verification_status"];
        };
        Insert: {
          created_at?: string;
          effective_from?: string | null;
          effective_to?: string | null;
          id?: string;
          interest_type?: Database["public"]["Enums"]["interest_type"];
          parcel_id: string;
          party_id: string;
          record_ref?: string | null;
          share_denominator?: number | null;
          share_numerator?: number | null;
          updated_at?: string;
          verification?: Database["public"]["Enums"]["verification_status"];
        };
        Update: {
          created_at?: string;
          effective_from?: string | null;
          effective_to?: string | null;
          id?: string;
          interest_type?: Database["public"]["Enums"]["interest_type"];
          parcel_id?: string;
          party_id?: string;
          record_ref?: string | null;
          share_denominator?: number | null;
          share_numerator?: number | null;
          updated_at?: string;
          verification?: Database["public"]["Enums"]["verification_status"];
        };
        Relationships: [
          {
            foreignKeyName: "land_interests_parcel_id_fkey";
            columns: ["parcel_id"];
            isOneToOne: false;
            referencedRelation: "parcels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "land_interests_party_id_fkey";
            columns: ["party_id"];
            isOneToOne: false;
            referencedRelation: "parties";
            referencedColumns: ["id"];
          },
        ];
      };
      parcels: {
        Row: {
          created_at: string;
          created_by: string | null;
          district: string;
          gat_no: string | null;
          geom: unknown;
          id: string;
          is_synthetic: boolean;
          khasra_no: string | null;
          land_use: string | null;
          parcel_ref: string;
          source_crs: string | null;
          source_ref: Json;
          state: string;
          status: Database["public"]["Enums"]["parcel_status"];
          survey_no: string | null;
          tehsil: string | null;
          total_area_sqm: number | null;
          updated_at: string;
          updated_by: string | null;
          village: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          district: string;
          gat_no?: string | null;
          geom?: unknown;
          id?: string;
          is_synthetic?: boolean;
          khasra_no?: string | null;
          land_use?: string | null;
          parcel_ref: string;
          source_crs?: string | null;
          source_ref?: Json;
          state: string;
          status?: Database["public"]["Enums"]["parcel_status"];
          survey_no?: string | null;
          tehsil?: string | null;
          total_area_sqm?: number | null;
          updated_at?: string;
          updated_by?: string | null;
          village: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          district?: string;
          gat_no?: string | null;
          geom?: unknown;
          id?: string;
          is_synthetic?: boolean;
          khasra_no?: string | null;
          land_use?: string | null;
          parcel_ref?: string;
          source_crs?: string | null;
          source_ref?: Json;
          state?: string;
          status?: Database["public"]["Enums"]["parcel_status"];
          survey_no?: string | null;
          tehsil?: string | null;
          total_area_sqm?: number | null;
          updated_at?: string;
          updated_by?: string | null;
          village?: string;
        };
        Relationships: [];
      };
      parties: {
        Row: {
          contact: Json;
          created_at: string;
          display_name: string;
          id: string;
          is_synthetic: boolean;
          party_ref: string;
          party_type: Database["public"]["Enums"]["party_type"];
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          contact?: Json;
          created_at?: string;
          display_name: string;
          id?: string;
          is_synthetic?: boolean;
          party_ref: string;
          party_type?: Database["public"]["Enums"]["party_type"];
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          contact?: Json;
          created_at?: string;
          display_name?: string;
          id?: string;
          is_synthetic?: boolean;
          party_ref?: string;
          party_type?: Database["public"]["Enums"]["party_type"];
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_parcels: {
        Row: {
          affected_area_sqm: number | null;
          created_at: string;
          id: string;
          inclusion_reason: string | null;
          parcel_id: string;
          project_id: string;
          updated_at: string;
        };
        Insert: {
          affected_area_sqm?: number | null;
          created_at?: string;
          id?: string;
          inclusion_reason?: string | null;
          parcel_id: string;
          project_id: string;
          updated_at?: string;
        };
        Update: {
          affected_area_sqm?: number | null;
          created_at?: string;
          id?: string;
          inclusion_reason?: string | null;
          parcel_id?: string;
          project_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_parcels_parcel_id_fkey";
            columns: ["parcel_id"];
            isOneToOne: false;
            referencedRelation: "parcels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_parcels_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          authority: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          districts: string[];
          id: string;
          is_synthetic: boolean;
          metadata: Json;
          project_code: string;
          project_name: string;
          project_type: string;
          state: string;
          status: Database["public"]["Enums"]["project_status"];
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          authority?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          districts?: string[];
          id?: string;
          is_synthetic?: boolean;
          metadata?: Json;
          project_code: string;
          project_name: string;
          project_type: string;
          state: string;
          status?: Database["public"]["Enums"]["project_status"];
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          authority?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          districts?: string[];
          id?: string;
          is_synthetic?: boolean;
          metadata?: Json;
          project_code?: string;
          project_name?: string;
          project_type?: string;
          state?: string;
          status?: Database["public"]["Enums"]["project_status"];
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      bind_demo_party: {
        Args: never;
        Returns: null;
      };
      survey_verification_handoff_enabled: {
        Args: never;
        Returns: boolean;
      };
      citizen_can_see_case: { Args: { _case_id: string }; Returns: boolean };
      citizen_can_see_parcel: { Args: { _parcel_id: string }; Returns: boolean };
      citizen_can_see_project: {
        Args: { _project_id: string };
        Returns: boolean;
      };
      current_app_role: {
        Args: never;
        Returns: Database["public"]["Enums"]["app_role"];
      };
      get_project_gis_data: {
        Args: { p_project_id: string };
        Returns: Json;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      acquisition_method:
        | "lara_2013"
        | "negotiated_purchase"
        | "consent_award"
        | "state_highway_act"
        | "national_highway_act"
        | "other";
      app_role: "officer" | "ministry" | "citizen";
      case_priority: "low" | "normal" | "high" | "critical";
      case_status: "open" | "in_progress" | "on_hold" | "closed" | "withdrawn";
      interest_type:
        | "owner"
        | "co_owner"
        | "tenant"
        | "lessee"
        | "mortgagee"
        | "occupant"
        | "easement"
        | "other";
      parcel_status: "active" | "superseded" | "disputed";
      party_type:
        "individual" | "joint" | "company" | "trust" | "government" | "religious" | "unknown";
      project_status: "draft" | "planned" | "active" | "on_hold" | "completed" | "cancelled";
      verification_status: "unverified" | "pending" | "verified" | "disputed";
      workflow_stage:
        | "identification"
        | "preliminary_notification"
        | "survey"
        | "objection"
        | "hearing"
        | "declaration"
        | "award"
        | "compensation"
        | "possession"
        | "completed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      acquisition_method: [
        "lara_2013",
        "negotiated_purchase",
        "consent_award",
        "state_highway_act",
        "national_highway_act",
        "other",
      ],
      app_role: ["officer", "ministry", "citizen"],
      case_priority: ["low", "normal", "high", "critical"],
      case_status: ["open", "in_progress", "on_hold", "closed", "withdrawn"],
      interest_type: [
        "owner",
        "co_owner",
        "tenant",
        "lessee",
        "mortgagee",
        "occupant",
        "easement",
        "other",
      ],
      parcel_status: ["active", "superseded", "disputed"],
      party_type: ["individual", "joint", "company", "trust", "government", "religious", "unknown"],
      project_status: ["draft", "planned", "active", "on_hold", "completed", "cancelled"],
      verification_status: ["unverified", "pending", "verified", "disputed"],
      workflow_stage: [
        "identification",
        "preliminary_notification",
        "survey",
        "objection",
        "hearing",
        "declaration",
        "award",
        "compensation",
        "possession",
        "completed",
      ],
    },
  },
} as const;
