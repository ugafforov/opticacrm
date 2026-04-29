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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bemor_tarixi: {
        Row: {
          bemor_id: string
          created_at: string
          id: string
          linza_turi: string
          mijoz: string | null
          od: string
          os: string
          sana: string
          telefon: string | null
          tugilan_yili: number | null
          user_id: string
        }
        Insert: {
          bemor_id: string
          created_at?: string
          id?: string
          linza_turi: string
          mijoz?: string | null
          od: string
          os: string
          sana: string
          telefon?: string | null
          tugilan_yili?: number | null
          user_id: string
        }
        Update: {
          bemor_id?: string
          created_at?: string
          id?: string
          linza_turi?: string
          mijoz?: string | null
          od?: string
          os?: string
          sana?: string
          telefon?: string | null
          tugilan_yili?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bemor_tarixi_bemor_id_fkey"
            columns: ["bemor_id"]
            isOneToOne: false
            referencedRelation: "linza_royxatlari"
            referencedColumns: ["id"]
          },
        ]
      }
      buyurtmalar: {
        Row: {
          created_at: string
          id: string
          jami_summa: number
          mijoz: string
          od: string
          oprava_narxi: number
          oprava_turi: string
          os: string
          oyna_narxi: number
          oyna_tури: string
          sana: string
          tartib_raqam: number
          telefon: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          jami_summa?: number
          mijoz: string
          od: string
          oprava_narxi?: number
          oprava_turi: string
          os: string
          oyna_narxi?: number
          oyna_tури: string
          sana: string
          tartib_raqam?: number
          telefon?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          jami_summa?: number
          mijoz?: string
          od?: string
          oprava_narxi?: number
          oprava_turi?: string
          os?: string
          oyna_narxi?: number
          oyna_tури?: string
          sana?: string
          tartib_raqam?: number
          telefon?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chiqindilar: {
        Row: {
          created_at: string
          data: Json
          deleted_at: string
          id: string
          item_id: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: Json
          deleted_at: string
          id?: string
          item_id: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          deleted_at?: string
          id?: string
          item_id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      linza_royxatlari: {
        Row: {
          created_at: string
          id: string
          linza_turi: string
          mijoz: string
          od: string
          os: string
          oxirgi_aloqa: string | null
          sana: string
          tartib_raqam: number
          telefon: string
          tugilan_yili: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          linza_turi: string
          mijoz: string
          od: string
          os: string
          oxirgi_aloqa?: string | null
          sana: string
          tartib_raqam?: number
          telefon: string
          tugilan_yili?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          linza_turi?: string
          mijoz?: string
          od?: string
          os?: string
          oxirgi_aloqa?: string | null
          sana?: string
          tartib_raqam?: number
          telefon?: string
          tugilan_yili?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      linza_sotuvlari: {
        Row: {
          created_at: string
          id: string
          kliyent: string
          linza_turi: string
          sana: string
          summa: number
          tartib_raqam: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kliyent: string
          linza_turi: string
          sana: string
          summa?: number
          tartib_raqam?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kliyent?: string
          linza_turi?: string
          sana?: string
          summa?: number
          tartib_raqam?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      qarz_tolovlari: {
        Row: {
          created_at: string
          id: string
          izoh: string | null
          qarzdor_id: string
          sana: string
          summa: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          izoh?: string | null
          qarzdor_id: string
          sana: string
          summa?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          izoh?: string | null
          qarzdor_id?: string
          sana?: string
          summa?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qarz_tolovlari_qarzdor_id_fkey"
            columns: ["qarzdor_id"]
            isOneToOne: false
            referencedRelation: "qarzdorlar"
            referencedColumns: ["id"]
          },
        ]
      }
      qarzdorlar: {
        Row: {
          created_at: string
          holat: string
          id: string
          izoh: string | null
          mijoz: string
          oxirgi_aloqa: string | null
          qarz_summasi: number
          qoldiq_summa: number
          sana: string
          tartib_raqam: number
          telefon: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          holat?: string
          id?: string
          izoh?: string | null
          mijoz: string
          oxirgi_aloqa?: string | null
          qarz_summasi?: number
          qoldiq_summa?: number
          sana: string
          tartib_raqam?: number
          telefon?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          holat?: string
          id?: string
          izoh?: string | null
          mijoz?: string
          oxirgi_aloqa?: string | null
          qarz_summasi?: number
          qoldiq_summa?: number
          sana?: string
          tartib_raqam?: number
          telefon?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tayyor_kozoynaklar: {
        Row: {
          created_at: string
          id: string
          kliyent: string
          kozoynak_turi: string
          sana: string
          summa: number
          tartib_raqam: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kliyent: string
          kozoynak_turi: string
          sana: string
          summa?: number
          tartib_raqam: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kliyent?: string
          kozoynak_turi?: string
          sana?: string
          summa?: number
          tartib_raqam?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tekshiruvlar: {
        Row: {
          created_at: string
          id: string
          jami_summa: number
          mijoz: string
          refraksiyametriya: boolean
          sana: string
          tanometriya: boolean
          tartib_raqam: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          jami_summa?: number
          mijoz: string
          refraksiyametriya?: boolean
          sana: string
          tanometriya?: boolean
          tartib_raqam: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          jami_summa?: number
          mijoz?: string
          refraksiyametriya?: boolean
          sana?: string
          tanometriya?: boolean
          tartib_raqam?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      telegram_allowed_users: {
        Row: {
          created_at: string
          id: string
          label: string | null
          phone: string | null
          telegram_chat_id: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          phone?: string | null
          telegram_chat_id?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          phone?: string | null
          telegram_chat_id?: number | null
        }
        Relationships: []
      }
      telegram_bot_state: {
        Row: {
          id: number
          update_offset: number
          updated_at: string
        }
        Insert: {
          id: number
          update_offset?: number
          updated_at?: string
        }
        Update: {
          id?: number
          update_offset?: number
          updated_at?: string
        }
        Relationships: []
      }
      telegram_pending_auth: {
        Row: {
          chat_id: number
          created_at: string
        }
        Insert: {
          chat_id: number
          created_at?: string
        }
        Update: {
          chat_id?: number
          created_at?: string
        }
        Relationships: []
      }
      telegram_settings: {
        Row: {
          id: number
          source_user_id: string | null
          updated_at: string
        }
        Insert: {
          id: number
          source_user_id?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          source_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      telegram_subscribers: {
        Row: {
          chat_id: number
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          phone: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          chat_id: number
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          phone?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          chat_id?: number
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          phone?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      xarajatlar: {
        Row: {
          created_at: string
          id: string
          kategoriya: string
          sana: string
          summa: number
          tartib_raqam: number
          tavsif: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kategoriya: string
          sana: string
          summa?: number
          tartib_raqam?: number
          tavsif?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kategoriya?: string
          sana?: string
          summa?: number
          tartib_raqam?: number
          tavsif?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
