export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      applications: {
        Row: {
          created_at: string | null
          id: string
          job_id: string | null
          status: string | null
          student_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          status?: string | null
          student_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          status?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          job_id: string | null
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          employee_count: number | null
          founded_year: number | null
          id: string
          industry: string | null
          location: string | null
          logo: string | null
          name: string
          user_id: string | null
          website: string | null
          website_url: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          employee_count?: number | null
          founded_year?: number | null
          id?: string
          industry?: string | null
          location?: string | null
          logo?: string | null
          name: string
          user_id?: string | null
          website?: string | null
          website_url?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          employee_count?: number | null
          founded_year?: number | null
          id?: string
          industry?: string | null
          location?: string | null
          logo?: string | null
          name?: string
          user_id?: string | null
          website?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      company_profiles: {
        Row: {
          address: string | null
          company_name: string
          contact_email: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          employee_count: number | null
          founded_year: number | null
          headquarters: string | null
          id: string
          industry: string | null
          logo_url: string | null
          phone: string | null
          updated_at: string | null
          user_id: string
          website_url: string | null
        }
        Insert: {
          address?: string | null
          company_name: string
          contact_email?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          employee_count?: number | null
          founded_year?: number | null
          headquarters?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id: string
          website_url?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string
          contact_email?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          employee_count?: number | null
          founded_year?: number | null
          headquarters?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      grandprix_challenges: {
        Row: {
          created_at: string | null
          deadline: string | null
          id: string
          question: string | null
          title: string | null
          word_limit: number | null
        }
        Insert: {
          created_at?: string | null
          deadline?: string | null
          id?: string
          question?: string | null
          title?: string | null
          word_limit?: number | null
        }
        Update: {
          created_at?: string | null
          deadline?: string | null
          id?: string
          question?: string | null
          title?: string | null
          word_limit?: number | null
        }
        Relationships: []
      }
      grandprix_events: {
        Row: {
          created_at: string | null
          description: string
          end_date: string
          event_type: string
          id: string
          is_active: boolean | null
          start_date: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          end_date: string
          event_type: string
          id?: string
          is_active?: boolean | null
          start_date: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          end_date?: string
          event_type?: string
          id?: string
          is_active?: boolean | null
          start_date?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      grandprix_participants: {
        Row: {
          created_at: string | null
          event_id: string
          feedback: string | null
          id: string
          score: number | null
          status: string | null
          student_id: string
          submission_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          feedback?: string | null
          id?: string
          score?: number | null
          status?: string | null
          student_id: string
          submission_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          feedback?: string | null
          id?: string
          score?: number | null
          status?: string | null
          student_id?: string
          submission_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grandprix_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "grandprix_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grandprix_participants_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grandprix_submissions: {
        Row: {
          answer: string | null
          challenge_id: string | null
          feedback: string | null
          id: string
          score: number | null
          status: string | null
          student_id: string | null
          submitted_at: string | null
        }
        Insert: {
          answer?: string | null
          challenge_id?: string | null
          feedback?: string | null
          id?: string
          score?: number | null
          status?: string | null
          student_id?: string | null
          submitted_at?: string | null
        }
        Update: {
          answer?: string | null
          challenge_id?: string | null
          feedback?: string | null
          id?: string
          score?: number | null
          status?: string | null
          student_id?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grandprix_submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "grandprix_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grandprix_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_tags: {
        Row: {
          id: string
          job_id: string
          tag: string
        }
        Insert: {
          id?: string
          job_id: string
          tag: string
        }
        Update: {
          id?: string
          job_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_tags_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          company_id: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_recommended: boolean
          location: string | null
          published: boolean | null
          requirements: string | null
          salary_max: number | null
          salary_min: number | null
          salary_range: string | null
          title: string
          work_type: string | null
        }
        Insert: {
          company_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_recommended?: boolean
          location?: string | null
          published?: boolean | null
          requirements?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_range?: string | null
          title: string
          work_type?: string | null
        }
        Update: {
          company_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_recommended?: boolean
          location?: string | null
          published?: boolean | null
          requirements?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_range?: string | null
          title?: string
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_url: string | null
          chat_room_id: string
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          sender_id: string
        }
        Insert: {
          attachment_url?: string | null
          chat_room_id: string
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id: string
        }
        Update: {
          attachment_url?: string | null
          chat_room_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          related_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          related_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          related_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          application_id: string | null
          benefits: Json | null
          company_id: string | null
          created_at: string | null
          expiration_date: string | null
          id: string
          salary: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["offer_status"] | null
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          application_id?: string | null
          benefits?: Json | null
          company_id?: string | null
          created_at?: string | null
          expiration_date?: string | null
          id?: string
          salary?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["offer_status"] | null
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string | null
          benefits?: Json | null
          company_id?: string | null
          created_at?: string | null
          expiration_date?: string | null
          id?: string
          salary?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["offer_status"] | null
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scouts: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          job_id: string | null
          message: string
          status: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          job_id?: string | null
          message: string
          status?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          job_id?: string | null
          message?: string
          status?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scouts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scouts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scouts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          birth_date: string | null
          created_at: string | null
          department: string | null
          email: string | null
          faculty: string | null
          full_name: string | null
          gender: string | null
          graduation_year: number | null
          id: string
          pr_text: string | null
          profile_image: string | null
          skills: string[] | null
          university: string | null
          user_id: string | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          faculty?: string | null
          full_name?: string | null
          gender?: string | null
          graduation_year?: number | null
          id?: string
          pr_text?: string | null
          profile_image?: string | null
          skills?: string[] | null
          university?: string | null
          user_id?: string | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          faculty?: string | null
          full_name?: string | null
          gender?: string | null
          graduation_year?: number | null
          id?: string
          pr_text?: string | null
          profile_image?: string | null
          skills?: string[] | null
          university?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          password: string | null
          role: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          password?: string | null
          role: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          password?: string | null
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      offer_status: "pending" | "accepted" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      offer_status: ["pending", "accepted", "rejected"],
    },
  },
} as const
