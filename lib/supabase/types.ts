export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          actor: string
          created_at: string | null
          description: string | null
          id: string
          ip_address: string
          metadata: Json | null
          role: string
          target: string
          timestamp: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          action: string
          actor: string
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address: string
          metadata?: Json | null
          role: string
          target: string
          timestamp?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string
          metadata?: Json | null
          role?: string
          target?: string
          timestamp?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      applications: {
        Row: {
          applied_at: string | null
          company_id: string | null
          created_at: string | null
          id: string
          interest_level: number | null
          job_id: string | null
          last_activity: string | null
          resume_url: string | null
          self_pr: string | null
          status: Database["public"]["Enums"]["application_status"] | null
          student_id: string | null
        }
        Insert: {
          applied_at?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          interest_level?: number | null
          job_id?: string | null
          last_activity?: string | null
          resume_url?: string | null
          self_pr?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          student_id?: string | null
        }
        Update: {
          applied_at?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          interest_level?: number | null
          job_id?: string | null
          last_activity?: string | null
          resume_url?: string | null
          self_pr?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "selections_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_with_email"
            referencedColumns: ["student_id"]
          },
        ]
      }
      article_bookmarks: {
        Row: {
          article_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "company_member_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      article_comments: {
        Row: {
          article_id: string
          body: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          article_id: string
          body: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          article_id?: string
          body?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "company_member_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      bizscore_questions: {
        Row: {
          id: string
          order_no: number | null
          question: string | null
          weight: number | null
        }
        Insert: {
          id?: string
          order_no?: number | null
          question?: string | null
          weight?: number | null
        }
        Update: {
          id?: string
          order_no?: number | null
          question?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      challenge_questions: {
        Row: {
          challenge_id: string
          order_no: number | null
          question_id: string
          weight: number | null
        }
        Insert: {
          challenge_id: string
          order_no?: number | null
          question_id: string
          weight?: number | null
        }
        Update: {
          challenge_id?: string
          order_no?: number | null
          question_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_questions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_sessions: {
        Row: {
          challenge_id: string | null
          elapsed_sec: number | null
          ended_at: string | null
          id: string
          score: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["session_status"] | null
          student_id: string | null
        }
        Insert: {
          challenge_id?: string | null
          elapsed_sec?: number | null
          ended_at?: string | null
          id?: string
          score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"] | null
          student_id?: string | null
        }
        Update: {
          challenge_id?: string | null
          elapsed_sec?: number | null
          ended_at?: string | null
          id?: string
          score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"] | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_sessions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_with_email"
            referencedColumns: ["student_id"]
          },
        ]
      }
      challenge_submissions: {
        Row: {
          answer: string
          answers: Json | null
          auto_score: number | null
          challenge_id: string
          comment: string | null
          created_at: string
          final_score: number | null
          id: string
          score: number | null
          score_source: string | null
          session_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          answer: string
          answers?: Json | null
          auto_score?: number | null
          challenge_id: string
          comment?: string | null
          created_at?: string
          final_score?: number | null
          id?: string
          score?: number | null
          score_source?: string | null
          session_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          answer?: string
          answers?: Json | null
          auto_score?: number | null
          challenge_id?: string
          comment?: string | null
          created_at?: string
          final_score?: number | null
          id?: string
          score?: number | null
          score_source?: string | null
          session_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_with_email"
            referencedColumns: ["student_id"]
          },
        ]
      }
      challenges: {
        Row: {
          answer_video_url: string | null
          category: string
          company: string | null
          created_at: string
          created_by: string
          deadline: string | null
          description: string | null
          event_id: string | null
          id: string
          question_count: number
          score: number
          section_type: Database["public"]["Enums"]["section_type"] | null
          start_date: string
          student_id: string | null
          test_code: Database["public"]["Enums"]["test_code"] | null
          time_limit_min: number
          time_limit_s: number
          title: string
          type: Database["public"]["Enums"]["grandprix_type"]
          updated_at: string
          word_limit: number | null
        }
        Insert: {
          answer_video_url?: string | null
          category?: string
          company?: string | null
          created_at?: string
          created_by?: string
          deadline?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          question_count?: number
          score?: number
          section_type?: Database["public"]["Enums"]["section_type"] | null
          start_date?: string
          student_id?: string | null
          test_code?: Database["public"]["Enums"]["test_code"] | null
          time_limit_min?: number
          time_limit_s?: number
          title: string
          type?: Database["public"]["Enums"]["grandprix_type"]
          updated_at?: string
          word_limit?: number | null
        }
        Update: {
          answer_video_url?: string | null
          category?: string
          company?: string | null
          created_at?: string
          created_by?: string
          deadline?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          question_count?: number
          score?: number
          section_type?: Database["public"]["Enums"]["section_type"] | null
          start_date?: string
          student_id?: string | null
          test_code?: Database["public"]["Enums"]["test_code"] | null
          time_limit_min?: number
          time_limit_s?: number
          title?: string
          type?: Database["public"]["Enums"]["grandprix_type"]
          updated_at?: string
          word_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "challenges_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "applicants_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "challenges_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          job_id: string | null
          scout_id: string | null
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          scout_id?: string | null
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          scout_id?: string | null
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
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
            foreignKeyName: "chat_rooms_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "selections_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_with_email"
            referencedColumns: ["student_id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          capital_jpy: number | null
          contact_email: string | null
          cover_image: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          employee_count: number | null
          founded_on: string | null
          founded_year: number | null
          headquarters: string | null
          id: string
          industry: string | null
          location: string | null
          logo: string | null
          name: string
          phone: string | null
          recruit_website: string | null
          representative: string | null
          revenue_jpy: number | null
          status: string
          tagline: string | null
          user_id: string | null
          video_url: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          capital_jpy?: number | null
          contact_email?: string | null
          cover_image?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          employee_count?: number | null
          founded_on?: string | null
          founded_year?: number | null
          headquarters?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          logo?: string | null
          name: string
          phone?: string | null
          recruit_website?: string | null
          representative?: string | null
          revenue_jpy?: number | null
          status?: string
          tagline?: string | null
          user_id?: string | null
          video_url?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          capital_jpy?: number | null
          contact_email?: string | null
          cover_image?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          employee_count?: number | null
          founded_on?: string | null
          founded_year?: number | null
          headquarters?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          logo?: string | null
          name?: string
          phone?: string | null
          recruit_website?: string | null
          representative?: string | null
          revenue_jpy?: number | null
          status?: string
          tagline?: string | null
          user_id?: string | null
          video_url?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "company_member_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      company_business_areas: {
        Row: {
          area: string | null
          company_id: string
          ordinal: number
        }
        Insert: {
          area?: string | null
          company_id: string
          ordinal: number
        }
        Update: {
          area?: string | null
          company_id?: string
          ordinal?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_business_areas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_business_areas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
        ]
      }
      company_events: {
        Row: {
          company_id: string | null
          datetime: string | null
          id: string
          location: string | null
          title: string | null
          type: string | null
          url: string | null
        }
        Insert: {
          company_id?: string | null
          datetime?: string | null
          id?: string
          location?: string | null
          title?: string | null
          type?: string | null
          url?: string | null
        }
        Update: {
          company_id?: string | null
          datetime?: string | null
          id?: string
          location?: string | null
          title?: string | null
          type?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
        ]
      }
      company_favorites: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_favorites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_favorites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "company_member_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      company_highlights: {
        Row: {
          body: string | null
          company_id: string | null
          icon: string | null
          id: string
          ordinal: number | null
          title: string | null
        }
        Insert: {
          body?: string | null
          company_id?: string | null
          icon?: string | null
          id?: string
          ordinal?: number | null
          title?: string | null
        }
        Update: {
          body?: string | null
          company_id?: string | null
          icon?: string | null
          id?: string
          ordinal?: number | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_highlights_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_highlights_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
        ]
      }
      company_interviews: {
        Row: {
          answer_hint: string | null
          company_id: string | null
          experience_text: string | null
          graduation_year: number | null
          id: string
          phase: string | null
          posted_at: string | null
          question: string | null
          selection_category: string | null
          user_id: string | null
        }
        Insert: {
          answer_hint?: string | null
          company_id?: string | null
          experience_text?: string | null
          graduation_year?: number | null
          id?: string
          phase?: string | null
          posted_at?: string | null
          question?: string | null
          selection_category?: string | null
          user_id?: string | null
        }
        Update: {
          answer_hint?: string | null
          company_id?: string | null
          experience_text?: string | null
          graduation_year?: number | null
          id?: string
          phase?: string | null
          posted_at?: string | null
          question?: string | null
          selection_category?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_interviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_interviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_interviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "company_member_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          invited_at: string
          role: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          invited_at?: string
          role?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          invited_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "company_member_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      company_philosophy: {
        Row: {
          company_id: string
          ordinal: number
          paragraph: string | null
        }
        Insert: {
          company_id: string
          ordinal: number
          paragraph?: string | null
        }
        Update: {
          company_id?: string
          ordinal?: number
          paragraph?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_philosophy_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_philosophy_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
        ]
      }
      company_positions: {
        Row: {
          company_id: string
          ordinal: number
          position: string | null
        }
        Insert: {
          company_id: string
          ordinal: number
          position?: string | null
        }
        Update: {
          company_id?: string
          ordinal?: number
          position?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_positions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_positions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
        ]
      }
      company_recruit_info: {
        Row: {
          company_id: string
          message: string | null
        }
        Insert: {
          company_id: string
          message?: string | null
        }
        Update: {
          company_id?: string
          message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_recruit_info_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_recruit_info_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
        ]
      }
      company_reviews: {
        Row: {
          body: string | null
          company_id: string | null
          id: string
          posted_at: string | null
          rating: number | null
          rating_culture: number | null
          rating_growth: number | null
          rating_selection: number | null
          rating_worklife: number | null
          role: string | null
          tenure_years: number | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          company_id?: string | null
          id?: string
          posted_at?: string | null
          rating?: number | null
          rating_culture?: number | null
          rating_growth?: number | null
          rating_selection?: number | null
          rating_worklife?: number | null
          role?: string | null
          tenure_years?: number | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          company_id?: string | null
          id?: string
          posted_at?: string | null
          rating?: number | null
          rating_culture?: number | null
          rating_growth?: number | null
          rating_selection?: number | null
          rating_worklife?: number | null
          role?: string | null
          tenure_years?: number | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "company_member_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      company_student_memos: {
        Row: {
          company_id: string
          created_at: string
          id: string
          memo: string
          student_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          memo: string
          student_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          memo?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_student_memos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_student_memos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_student_memos_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_student_memos_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_with_email"
            referencedColumns: ["student_id"]
          },
        ]
      }
      event_details: {
        Row: {
          capacity: number | null
          contact_email: string | null
          event_date: string | null
          format: string | null
          is_online: boolean | null
          job_id: string | null
          notes: string | null
          selection_id: string
          sessions: Json | null
          target_grad_years: number[] | null
          venue: string | null
        }
        Insert: {
          capacity?: number | null
          contact_email?: string | null
          event_date?: string | null
          format?: string | null
          is_online?: boolean | null
          job_id?: string | null
          notes?: string | null
          selection_id: string
          sessions?: Json | null
          target_grad_years?: number[] | null
          venue?: string | null
        }
        Update: {
          capacity?: number | null
          contact_email?: string | null
          event_date?: string | null
          format?: string | null
          is_online?: boolean | null
          job_id?: string | null
          notes?: string | null
          selection_id?: string
          sessions?: Json | null
          target_grad_years?: number[] | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_event_job"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_event_job"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "selections_view"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          status: string
          student_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          status?: string
          student_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_with_email"
            referencedColumns: ["student_id"]
          },
        ]
      }
      events: {
        Row: {
          cover_image: string | null
          created_at: string | null
          description: string | null
          event_date: string
          event_type: string | null
          id: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          event_date: string
          event_type?: string | null
          id?: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          event_date?: string
          event_type?: string | null
          id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      features: {
        Row: {
          content: string | null
          created_at: string
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      fulltime_details: {
        Row: {
          benefits: string | null
          is_ongoing: boolean | null
          job_id: string
          salary_max: number | null
          salary_min: number | null
          selection_id: string | null
          working_days: string | null
          working_hours: string | null
        }
        Insert: {
          benefits?: string | null
          is_ongoing?: boolean | null
          job_id: string
          salary_max?: number | null
          salary_min?: number | null
          selection_id?: string | null
          working_days?: string | null
          working_hours?: string | null
        }
        Update: {
          benefits?: string | null
          is_ongoing?: boolean | null
          job_id?: string
          salary_max?: number | null
          salary_min?: number | null
          selection_id?: string | null
          working_days?: string | null
          working_hours?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_fulltime_job"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fulltime_job"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "selections_view"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          company: string
          created_at: string
          email: string
          id: string
          message: string
          name: string
        }
        Insert: {
          company: string
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
        }
        Update: {
          company?: string
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
        }
        Relationships: []
      }
      intern_long_details: {
        Row: {
          commission_rate: string | null
          created_at: string | null
          hourly_wage: number | null
          id: string
          is_paid: boolean
          job_id: string | null
          min_duration_months: number | null
          remuneration_type: string
          selection_id: string
          start_date: string | null
          updated_at: string | null
          work_days_per_week: number | null
        }
        Insert: {
          commission_rate?: string | null
          created_at?: string | null
          hourly_wage?: number | null
          id?: string
          is_paid?: boolean
          job_id?: string | null
          min_duration_months?: number | null
          remuneration_type?: string
          selection_id: string
          start_date?: string | null
          updated_at?: string | null
          work_days_per_week?: number | null
        }
        Update: {
          commission_rate?: string | null
          created_at?: string | null
          hourly_wage?: number | null
          id?: string
          is_paid?: boolean
          job_id?: string | null
          min_duration_months?: number | null
          remuneration_type?: string
          selection_id?: string
          start_date?: string | null
          updated_at?: string | null
          work_days_per_week?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "intern_long_details_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intern_long_details_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "selections_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intern_long_details_selection_id_fkey"
            columns: ["selection_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intern_long_details_selection_id_fkey"
            columns: ["selection_id"]
            isOneToOne: true
            referencedRelation: "selections_view"
            referencedColumns: ["id"]
          },
        ]
      }
      internship_details: {
        Row: {
          allowance: string | null
          capacity: number | null
          contact_email: string | null
          duration_weeks: number | null
          end_date: string | null
          format: Database["public"]["Enums"]["event_format"] | null
          is_paid: boolean | null
          job_id: string | null
          notes: string | null
          perks: string | null
          selection_flow: Json | null
          selection_id: string
          sessions: Json | null
          start_date: string | null
          target_grad_years: number[] | null
          work_days_per_week: number | null
        }
        Insert: {
          allowance?: string | null
          capacity?: number | null
          contact_email?: string | null
          duration_weeks?: number | null
          end_date?: string | null
          format?: Database["public"]["Enums"]["event_format"] | null
          is_paid?: boolean | null
          job_id?: string | null
          notes?: string | null
          perks?: string | null
          selection_flow?: Json | null
          selection_id: string
          sessions?: Json | null
          start_date?: string | null
          target_grad_years?: number[] | null
          work_days_per_week?: number | null
        }
        Update: {
          allowance?: string | null
          capacity?: number | null
          contact_email?: string | null
          duration_weeks?: number | null
          end_date?: string | null
          format?: Database["public"]["Enums"]["event_format"] | null
          is_paid?: boolean | null
          job_id?: string | null
          notes?: string | null
          perks?: string | null
          selection_flow?: Json | null
          selection_id?: string
          sessions?: Json | null
          start_date?: string | null
          target_grad_years?: number[] | null
          work_days_per_week?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_internship_job"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_internship_job"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "selections_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internship_details_selection_id_fkey"
            columns: ["selection_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internship_details_selection_id_fkey"
            columns: ["selection_id"]
            isOneToOne: true
            referencedRelation: "selections_view"
            referencedColumns: ["id"]
          },
        ]
      }
      job_embeddings: {
        Row: {
          content: string
          embedding: string | null
          job_id: string
        }
        Insert: {
          content: string
          embedding?: string | null
          job_id: string
        }
        Update: {
          content?: string
          embedding?: string | null
          job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_embeddings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_embeddings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "selections_view"
            referencedColumns: ["id"]
          },
        ]
      }
      job_interests: {
        Row: {
          created_at: string | null
          id: string
          job_id: string
          student_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id: string
          student_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_interests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_interests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "selections_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_interests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_interests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_with_email"
            referencedColumns: ["student_id"]
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
          {
            foreignKeyName: "job_tags_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "selections_view"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          application_deadline: string | null
          category: string | null
          company_id: string | null
          cover_image_url: string | null
          created_at: string
          department: string | null
          description: string | null
          id: string
          is_recommended: boolean
          location: string | null
          published: boolean | null
          published_until: string | null
          requirements: string | null
          salary_range: string | null
          selection_type: Database["public"]["Enums"]["selection_type"] | null
          start_date: string | null
          title: string
          user_id: string
          views: number
          work_type: string | null
        }
        Insert: {
          application_deadline?: string | null
          category?: string | null
          company_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          is_recommended?: boolean
          location?: string | null
          published?: boolean | null
          published_until?: string | null
          requirements?: string | null
          salary_range?: string | null
          selection_type?: Database["public"]["Enums"]["selection_type"] | null
          start_date?: string | null
          title: string
          user_id?: string
          views?: number
          work_type?: string | null
        }
        Update: {
          application_deadline?: string | null
          category?: string | null
          company_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          is_recommended?: boolean
          location?: string | null
          published?: boolean | null
          published_until?: string | null
          requirements?: string | null
          salary_range?: string | null
          selection_type?: Database["public"]["Enums"]["selection_type"] | null
          start_date?: string | null
          title?: string
          user_id?: string
          views?: number
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "company_member_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      media_authors: {
        Row: {
          avatar_url: string | null
          bio: string | null
          display_name: string
          id: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          display_name: string
          id?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          display_name?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_authors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "company_member_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      media_categories: {
        Row: {
          id: string
          name: string
          order: number | null
          slug: string
        }
        Insert: {
          id?: string
          name: string
          order?: number | null
          slug: string
        }
        Update: {
          id?: string
          name?: string
          order?: number | null
          slug?: string
        }
        Relationships: []
      }
      media_posts: {
        Row: {
          author_id: string | null
          category_id: string | null
          content_html: string | null
          content_md: string | null
          cover_image_url: string | null
          created_at: string | null
          deleted_at: string | null
          excerpt: string | null
          id: string
          preview_token: string | null
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          category_id?: string | null
          content_html?: string | null
          content_md?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          excerpt?: string | null
          id?: string
          preview_token?: string | null
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          category_id?: string | null
          content_html?: string | null
          content_md?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          excerpt?: string | null
          id?: string
          preview_token?: string | null
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "media_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "media_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      media_posts_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_posts_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "media_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_posts_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "media_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      media_tags: {
        Row: {
          id: string
          name: string
          slug: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          answered_at: string | null
          attachment_url: string | null
          chat_room_id: string
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          sender_id: string
        }
        Insert: {
          answered_at?: string | null
          attachment_url?: string | null
          chat_room_id: string
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id: string
        }
        Update: {
          answered_at?: string | null
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
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "company_member_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: string | null
          created_at: string | null
          error_reason: string | null
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          related_id: string
          send_after: string | null
          send_status: string | null
          title: string
          url: string | null
          user_id: string
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          error_reason?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          related_id: string
          send_after?: string | null
          send_status?: string | null
          title: string
          url?: string | null
          user_id: string
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          error_reason?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          related_id?: string
          send_after?: string | null
          send_status?: string | null
          title?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "company_member_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      qualifications: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      question_bank: {
        Row: {
          category: Database["public"]["Enums"]["question_category"] | null
          challenge_id: string | null
          choices: Json | null
          choices_img: Json | null
          correct_choice: number | null
          created_at: string | null
          difficulty: number | null
          expected_kw: string[] | null
          explanation: string | null
          grand_type: Database["public"]["Enums"]["grandprix_type"]
          id: string
          order_no: number | null
          stem: string
          stem_img_url: string | null
          weight: number | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["question_category"] | null
          challenge_id?: string | null
          choices?: Json | null
          choices_img?: Json | null
          correct_choice?: number | null
          created_at?: string | null
          difficulty?: number | null
          expected_kw?: string[] | null
          explanation?: string | null
          grand_type?: Database["public"]["Enums"]["grandprix_type"]
          id?: string
          order_no?: number | null
          stem: string
          stem_img_url?: string | null
          weight?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["question_category"] | null
          challenge_id?: string | null
          choices?: Json | null
          choices_img?: Json | null
          correct_choice?: number | null
          created_at?: string | null
          difficulty?: number | null
          expected_kw?: string[] | null
          explanation?: string | null
          grand_type?: Database["public"]["Enums"]["grandprix_type"]
          id?: string
          order_no?: number | null
          stem?: string
          stem_img_url?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "company_member_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_uses: {
        Row: {
          created_at: string | null
          id: string
          referral_code_id: string
          referred_user_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referral_code_id: string
          referred_user_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referral_code_id?: string
          referred_user_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_uses_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_uses_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "company_member_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      resumes: {
        Row: {
          created_at: string | null
          desired_job_title: string | null
          educations: Json | null
          experiences: Json | null
          form_data: Json
          id: string
          job_type: string | null
          skills: Json | null
          summary: string | null
          updated_at: string | null
          user_id: string | null
          work_experiences: Json
        }
        Insert: {
          created_at?: string | null
          desired_job_title?: string | null
          educations?: Json | null
          experiences?: Json | null
          form_data?: Json
          id?: string
          job_type?: string | null
          skills?: Json | null
          summary?: string | null
          updated_at?: string | null
          user_id?: string | null
          work_experiences?: Json
        }
        Update: {
          created_at?: string | null
          desired_job_title?: string | null
          educations?: Json | null
          experiences?: Json | null
          form_data?: Json
          id?: string
          job_type?: string | null
          skills?: Json | null
          summary?: string | null
          updated_at?: string | null
          user_id?: string | null
          work_experiences?: Json
        }
        Relationships: [
          {
            foreignKeyName: "resumes_user_id_profile_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "applicants_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "resumes_user_id_profile_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "student_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      role_change_log: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: number
          new_role: string | null
          old_role: string | null
          query: string | null
          user_id: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: number
          new_role?: string | null
          old_role?: string | null
          query?: string | null
          user_id?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: number
          new_role?: string | null
          old_role?: string | null
          query?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      scout_templates: {
        Row: {
          company_id: string
          content: string
          created_at: string | null
          id: string
          is_global: boolean | null
          job_id: string | null
          offer_range: string | null
          position: string | null
          title: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string | null
          id?: string
          is_global?: boolean | null
          job_id?: string | null
          offer_range?: string | null
          position?: string | null
          title: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_global?: boolean | null
          job_id?: string | null
          offer_range?: string | null
          position?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_templates_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_templates_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_templates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_templates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "selections_view"
            referencedColumns: ["id"]
          },
        ]
      }
      scouts: {
        Row: {
          accepted_at: string | null
          chat_room_id: string | null
          company_id: string
          company_member_id: string
          created_at: string | null
          declined_at: string | null
          id: string
          is_read: boolean
          job_id: string | null
          message: string
          offer_amount: string | null
          offer_position: string | null
          status: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          chat_room_id?: string | null
          company_id: string
          company_member_id: string
          created_at?: string | null
          declined_at?: string | null
          id?: string
          is_read?: boolean
          job_id?: string | null
          message: string
          offer_amount?: string | null
          offer_position?: string | null
          status?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          chat_room_id?: string | null
          company_id?: string
          company_member_id?: string
          created_at?: string | null
          declined_at?: string | null
          id?: string
          is_read?: boolean
          job_id?: string | null
          message?: string
          offer_amount?: string | null
          offer_position?: string | null
          status?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_scouts_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_scouts_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_scouts_student"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_scouts_student"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_with_email"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "scouts_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scouts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scouts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scouts_company_member_id_fkey"
            columns: ["company_member_id"]
            isOneToOne: false
            referencedRelation: "company_members"
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
            foreignKeyName: "scouts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "selections_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scouts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scouts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_with_email"
            referencedColumns: ["student_id"]
          },
        ]
      }
      session_answers: {
        Row: {
          answer_raw: Json | null
          created_at: string
          elapsed_sec: number | null
          is_correct: boolean | null
          question_id: string
          score: number | null
          session_id: string
        }
        Insert: {
          answer_raw?: Json | null
          created_at?: string
          elapsed_sec?: number | null
          is_correct?: boolean | null
          question_id: string
          score?: number | null
          session_id: string
        }
        Update: {
          answer_raw?: Json | null
          created_at?: string
          elapsed_sec?: number | null
          is_correct?: boolean | null
          question_id?: string
          score?: number | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "challenge_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          about: string | null
          address: string | null
          address_line: string | null
          admission_month: string | null
          auth_user_id: string | null
          avatar_url: string | null
          birth_date: string | null
          city: string | null
          created_at: string | null
          department: string | null
          desired_industries: string[] | null
          desired_locations: string[] | null
          desired_positions: string[] | null
          employment_type: string | null
          experience: Json | null
          faculty: string | null
          first_name: string | null
          first_name_kana: string | null
          full_name: string | null
          gender: string | null
          graduation_month: string | null
          has_internship_experience: boolean
          hometown: string | null
          id: string
          interests: string[]
          is_completed: boolean | null
          join_ipo: boolean | null
          language_skill: string | null
          last_name: string | null
          last_name_kana: string | null
          last_sign_in_at: string | null
          motive: string | null
          phone: string | null
          postal_code: string | null
          pr_body: string | null
          pr_text: string | null
          pr_title: string | null
          prefecture: string | null
          preference_note: string | null
          preferred_industries: string[] | null
          qualification_text: string | null
          qualifications: string[] | null
          referral_source: string | null
          research_theme: string | null
          salary_range: string | null
          skill_text: string | null
          skills: string[] | null
          status: string
          strength1: string | null
          strength2: string | null
          strength3: string | null
          university: string | null
          updated_at: string
          user_id: string | null
          work_style: string | null
          work_style_options: string[] | null
        }
        Insert: {
          about?: string | null
          address?: string | null
          address_line?: string | null
          admission_month?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string | null
          department?: string | null
          desired_industries?: string[] | null
          desired_locations?: string[] | null
          desired_positions?: string[] | null
          employment_type?: string | null
          experience?: Json | null
          faculty?: string | null
          first_name?: string | null
          first_name_kana?: string | null
          full_name?: string | null
          gender?: string | null
          graduation_month?: string | null
          has_internship_experience?: boolean
          hometown?: string | null
          id?: string
          interests?: string[]
          is_completed?: boolean | null
          join_ipo?: boolean | null
          language_skill?: string | null
          last_name?: string | null
          last_name_kana?: string | null
          last_sign_in_at?: string | null
          motive?: string | null
          phone?: string | null
          postal_code?: string | null
          pr_body?: string | null
          pr_text?: string | null
          pr_title?: string | null
          prefecture?: string | null
          preference_note?: string | null
          preferred_industries?: string[] | null
          qualification_text?: string | null
          qualifications?: string[] | null
          referral_source?: string | null
          research_theme?: string | null
          salary_range?: string | null
          skill_text?: string | null
          skills?: string[] | null
          status?: string
          strength1?: string | null
          strength2?: string | null
          strength3?: string | null
          university?: string | null
          updated_at?: string
          user_id?: string | null
          work_style?: string | null
          work_style_options?: string[] | null
        }
        Update: {
          about?: string | null
          address?: string | null
          address_line?: string | null
          admission_month?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string | null
          department?: string | null
          desired_industries?: string[] | null
          desired_locations?: string[] | null
          desired_positions?: string[] | null
          employment_type?: string | null
          experience?: Json | null
          faculty?: string | null
          first_name?: string | null
          first_name_kana?: string | null
          full_name?: string | null
          gender?: string | null
          graduation_month?: string | null
          has_internship_experience?: boolean
          hometown?: string | null
          id?: string
          interests?: string[]
          is_completed?: boolean | null
          join_ipo?: boolean | null
          language_skill?: string | null
          last_name?: string | null
          last_name_kana?: string | null
          last_sign_in_at?: string | null
          motive?: string | null
          phone?: string | null
          postal_code?: string | null
          pr_body?: string | null
          pr_text?: string | null
          pr_title?: string | null
          prefecture?: string | null
          preference_note?: string | null
          preferred_industries?: string[] | null
          qualification_text?: string | null
          qualifications?: string[] | null
          referral_source?: string | null
          research_theme?: string | null
          salary_range?: string | null
          skill_text?: string | null
          skills?: string[] | null
          status?: string
          strength1?: string | null
          strength2?: string | null
          strength3?: string | null
          university?: string | null
          updated_at?: string
          user_id?: string | null
          work_style?: string | null
          work_style_options?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "company_member_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles_backup: {
        Row: {
          about: string | null
          address: string | null
          address_line: string | null
          admission_month: string | null
          auth_user_id: string | null
          avatar_url: string | null
          birth_date: string | null
          city: string | null
          created_at: string | null
          department: string | null
          desired_industries: string[] | null
          desired_locations: string[] | null
          desired_positions: string[] | null
          employment_type: string | null
          experience: Json | null
          faculty: string | null
          first_name: string | null
          first_name_kana: string | null
          full_name: string | null
          gender: string | null
          graduation_month: string | null
          has_internship_experience: boolean | null
          hometown: string | null
          id: string | null
          interests: string[] | null
          is_completed: boolean | null
          join_ipo: boolean | null
          language_skill: string | null
          last_name: string | null
          last_name_kana: string | null
          motive: string | null
          phone: string | null
          postal_code: string | null
          pr_body: string | null
          pr_text: string | null
          pr_title: string | null
          prefecture: string | null
          preference_note: string | null
          preferred_industries: string[] | null
          qualification_text: string | null
          qualifications: string[] | null
          research_theme: string | null
          salary_range: string | null
          skill_text: string | null
          skills: string[] | null
          status: string | null
          strength1: string | null
          strength2: string | null
          strength3: string | null
          university: string | null
          updated_at: string | null
          user_id: string | null
          work_style: string | null
          work_style_options: string[] | null
        }
        Insert: {
          about?: string | null
          address?: string | null
          address_line?: string | null
          admission_month?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string | null
          department?: string | null
          desired_industries?: string[] | null
          desired_locations?: string[] | null
          desired_positions?: string[] | null
          employment_type?: string | null
          experience?: Json | null
          faculty?: string | null
          first_name?: string | null
          first_name_kana?: string | null
          full_name?: string | null
          gender?: string | null
          graduation_month?: string | null
          has_internship_experience?: boolean | null
          hometown?: string | null
          id?: string | null
          interests?: string[] | null
          is_completed?: boolean | null
          join_ipo?: boolean | null
          language_skill?: string | null
          last_name?: string | null
          last_name_kana?: string | null
          motive?: string | null
          phone?: string | null
          postal_code?: string | null
          pr_body?: string | null
          pr_text?: string | null
          pr_title?: string | null
          prefecture?: string | null
          preference_note?: string | null
          preferred_industries?: string[] | null
          qualification_text?: string | null
          qualifications?: string[] | null
          research_theme?: string | null
          salary_range?: string | null
          skill_text?: string | null
          skills?: string[] | null
          status?: string | null
          strength1?: string | null
          strength2?: string | null
          strength3?: string | null
          university?: string | null
          updated_at?: string | null
          user_id?: string | null
          work_style?: string | null
          work_style_options?: string[] | null
        }
        Update: {
          about?: string | null
          address?: string | null
          address_line?: string | null
          admission_month?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string | null
          department?: string | null
          desired_industries?: string[] | null
          desired_locations?: string[] | null
          desired_positions?: string[] | null
          employment_type?: string | null
          experience?: Json | null
          faculty?: string | null
          first_name?: string | null
          first_name_kana?: string | null
          full_name?: string | null
          gender?: string | null
          graduation_month?: string | null
          has_internship_experience?: boolean | null
          hometown?: string | null
          id?: string | null
          interests?: string[] | null
          is_completed?: boolean | null
          join_ipo?: boolean | null
          language_skill?: string | null
          last_name?: string | null
          last_name_kana?: string | null
          motive?: string | null
          phone?: string | null
          postal_code?: string | null
          pr_body?: string | null
          pr_text?: string | null
          pr_title?: string | null
          prefecture?: string | null
          preference_note?: string | null
          preferred_industries?: string[] | null
          qualification_text?: string | null
          qualifications?: string[] | null
          research_theme?: string | null
          salary_range?: string | null
          skill_text?: string | null
          skills?: string[] | null
          status?: string | null
          strength1?: string | null
          strength2?: string | null
          strength3?: string | null
          university?: string | null
          updated_at?: string | null
          user_id?: string | null
          work_style?: string | null
          work_style_options?: string[] | null
        }
        Relationships: []
      }
      student_qualifications: {
        Row: {
          qualification_id: string
          student_id: string
        }
        Insert: {
          qualification_id: string
          student_id: string
        }
        Update: {
          qualification_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_qualifications_qualification_id_fkey"
            columns: ["qualification_id"]
            isOneToOne: false
            referencedRelation: "qualifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_qualifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_qualifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_with_email"
            referencedColumns: ["student_id"]
          },
        ]
      }
      student_skills: {
        Row: {
          skill_id: string
          student_id: string
        }
        Insert: {
          skill_id: string
          student_id: string
        }
        Update: {
          skill_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_skills_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_skills_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_with_email"
            referencedColumns: ["student_id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "company_member_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      user_signups: {
        Row: {
          created_at: string
          id: string
          referral_source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_source: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_signups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "company_member_emails"
            referencedColumns: ["id"]
          },
        ]
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
      webtest_questions: {
        Row: {
          challenge_id: string | null
          choice1: string | null
          choice2: string | null
          choice3: string | null
          choice4: string | null
          correct_choice: number | null
          id: string
          order_no: number | null
          question: string | null
        }
        Insert: {
          challenge_id?: string | null
          choice1?: string | null
          choice2?: string | null
          choice3?: string | null
          choice4?: string | null
          correct_choice?: number | null
          id?: string
          order_no?: number | null
          question?: string | null
        }
        Update: {
          challenge_id?: string | null
          choice1?: string | null
          choice2?: string | null
          choice3?: string | null
          choice4?: string | null
          correct_choice?: number | null
          id?: string
          order_no?: number | null
          question?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webtest_questions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      applicants_view: {
        Row: {
          address_line: string | null
          application_date: string | null
          application_id: string | null
          birth_date: string | null
          city: string | null
          company_id: string | null
          department: string | null
          desired_locations: string[] | null
          desired_positions: string[] | null
          employment_type: string | null
          faculty: string | null
          first_name: string | null
          first_name_kana: string | null
          full_name: string | null
          gender: string | null
          graduation_month: string | null
          has_internship_experience: boolean | null
          hometown: string | null
          job_id: string | null
          languages: string | null
          last_name: string | null
          last_name_kana: string | null
          phone: string | null
          postal_code: string | null
          pr_text: string | null
          prefecture: string | null
          preferred_industries: string[] | null
          profile_image: string | null
          qualifications: string[] | null
          skills: string[] | null
          status: Database["public"]["Enums"]["application_status"] | null
          student_id: string | null
          university: string | null
          user_id: string | null
          work_experience: Json | null
          work_style: string | null
          work_style_options: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "selections_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_with_email"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "company_member_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      companies_view: {
        Row: {
          business_areas: Json | null
          capital_jpy: number | null
          cover_image: string | null
          cover_image_url: string | null
          employee_count: number | null
          favorite_count: number | null
          founded_year: number | null
          headquarters: string | null
          id: string | null
          industry: string | null
          logo: string | null
          name: string | null
          philosophy: Json | null
          positions: Json | null
          rating: number | null
          recruit_message: string | null
          representative: string | null
          revenue_jpy: number | null
          tagline: string | null
          video_url: string | null
        }
        Relationships: []
      }
      company_favorite_counts: {
        Row: {
          company_id: string | null
          favorite_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_favorites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_favorites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
        ]
      }
      company_member_emails: {
        Row: {
          company_id: string | null
          email: string | null
          id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
        ]
      }
      gp_rank: {
        Row: {
          category: Database["public"]["Enums"]["grandprix_type"] | null
          month: string | null
          rank: number | null
          student_id: string | null
          total_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_with_email"
            referencedColumns: ["student_id"]
          },
        ]
      }
      job_app_count: {
        Row: {
          cnt: number | null
          job_title: string | null
        }
        Relationships: []
      }
      selections_view: {
        Row: {
          allowance: string | null
          application_deadline: string | null
          capacity: number | null
          company_id: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          duration_weeks: number | null
          end_date: string | null
          event_date: string | null
          format: string | null
          id: string | null
          is_online: boolean | null
          location: string | null
          published: boolean | null
          salary_max: number | null
          salary_min: number | null
          selection_type: Database["public"]["Enums"]["selection_type"] | null
          start_date: string | null
          title: string | null
          venue: string | null
          views: number | null
          work_days_per_week: number | null
          working_days: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
        ]
      }
      student_applications_view: {
        Row: {
          applied_date: string | null
          company_id: string | null
          company_logo: string | null
          company_name: string | null
          has_unread_messages: boolean | null
          id: string | null
          job_id: string | null
          location: string | null
          status: Database["public"]["Enums"]["application_status"] | null
          student_id: string | null
          title: string | null
          unread_count: number | null
          work_style: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "selections_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_with_email"
            referencedColumns: ["student_id"]
          },
        ]
      }
      student_resume_jobtypes: {
        Row: {
          job_types: string[] | null
          student_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resumes_user_id_profile_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "applicants_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "resumes_user_id_profile_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "student_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      student_with_email: {
        Row: {
          email: string | null
          full_name: string | null
          graduation_month: string | null
          last_sign_in_at: string | null
          student_id: string | null
          university: string | null
        }
        Relationships: []
      }
      user_companies: {
        Row: {
          company_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "company_member_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      v_messages_with_sender: {
        Row: {
          answered_at: string | null
          attachment_url: string | null
          chat_room_id: string | null
          content: string | null
          created_at: string | null
          id: string | null
          is_read: boolean | null
          sender_avatar_url: string | null
          sender_full_name: string | null
          sender_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "company_member_emails"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_offer: {
        Args: { p_scout_id: string }
        Returns: {
          room_id: string
        }[]
      }
      auto_grade_answer: {
        Args: { p_question_id: string; p_answer_raw: Json }
        Returns: number
      }
      avg_response_time: {
        Args: Record<PropertyKey, never>
        Returns: {
          avg_response_sec: number
        }[]
      }
      avg_response_time_sec: {
        Args: Record<PropertyKey, never>
        Returns: {
          avg_response_sec: number
        }[]
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      calculate_profile_completion: {
        Args: { p_user_id: string }
        Returns: number
      }
      calculate_resume_completion: {
        Args: { p_user_id: string }
        Returns: {
          score: number
          missing: string[]
        }[]
      }
      calculate_work_history_completion: {
        Args: { p_user_id: string }
        Returns: {
          score: number
          missing: string[]
        }[]
      }
      count_unread: {
        Args: Record<PropertyKey, never> | { _uid: string }
        Returns: number
      }
      create_referral_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      custom_access_token_hook: {
        Args: { uid: string; email: string; claims: Json }
        Returns: Json
      }
      dashboard_overview: {
        Args: Record<PropertyKey, never>
        Returns: {
          students: number
          companies: number
          applications: number
          scouts: number
        }[]
      }
      get_leaderboard: {
        Args: { p_limit?: number }
        Returns: {
          student_id: string
          total_score: number
          rank: number
          full_name: string
          avatar: string
        }[]
      }
      get_my_chat_rooms: {
        Args: { p_user: string }
        Returns: {
          id: string
          company_id: string
          student_id: string
          updated_at: string
          company_name: string
          company_logo: string
          last_message: string
          last_created: string
          is_unread: boolean
        }[]
      }
      get_or_create_chat_room_from_scout: {
        Args: { p_scout_id: string }
        Returns: {
          company_id: string | null
          created_at: string | null
          id: string
          job_id: string | null
          scout_id: string | null
          student_id: string | null
          updated_at: string | null
        }
      }
      get_user_role: {
        Args: { p_uid: string }
        Returns: string
      }
      grade_session: {
        Args: { p_session_id: string }
        Returns: number
      }
      grade_webtest: {
        Args: { p_submission_id: string }
        Returns: undefined
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      increment_job_view: {
        Args: { _job_id: string }
        Returns: undefined
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_application_owner: {
        Args: { p_student_id: string }
        Returns: boolean
      }
      is_chat_participant: {
        Args: { room_id: string }
        Returns: boolean
      }
      is_company: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_company_member: {
        Args: { c_id: string }
        Returns: boolean
      }
      is_company_owner: {
        Args: { c_uuid: string }
        Returns: boolean
      }
      is_student: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      jwt_custom_claims_hook: {
        Args: { event: Json } | { uid: string; email: string; claims: Json }
        Returns: Json
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      match_job_embeddings: {
        Args: {
          query_embedding: string
          match_count: number
          similarity_threshold: number
        }
        Returns: {
          job_id: string
          content: string
          score: number
        }[]
      }
      prepare_session_answers: {
        Args: { p_session_uuid: string }
        Returns: undefined
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      start_webtest_session: {
        Args: { p_challenge_id: string; p_student_id: string }
        Returns: string
      }
      start_webtest_session_balanced: {
        Args: { p_challenge_id: string; p_student_id: string }
        Returns: string
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      application_status:
        | "未対応"
        | "書類選考中"
        | "一次面接調整中"
        | "一次面接済"
        | "二次面接調整中"
        | "二次面接済"
        | "最終面接調整中"
        | "最終面接済"
        | "内定"
        | "内定辞退"
        | "不採用"
        | "スカウト承諾"
      event_format: "online" | "onsite" | "hybrid"
      grandprix_type: "case" | "webtest" | "bizscore"
      offer_status: "pending" | "accepted" | "rejected"
      question_category:
        | "web_lang"
        | "web_math"
        | "case"
        | "biz_battle"
        | "spi_language"
      role_enum: "student" | "company" | "company_admin" | "admin"
      section_type: "quant" | "verbal" | "english" | "logical"
      selection_type: "fulltime" | "internship_short" | "event" | "intern_long"
      session_status: "in_progress" | "submitted" | "graded"
      test_code: "spi" | "tamatebako" | "case" | "bizscore"
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
      application_status: [
        "未対応",
        "書類選考中",
        "一次面接調整中",
        "一次面接済",
        "二次面接調整中",
        "二次面接済",
        "最終面接調整中",
        "最終面接済",
        "内定",
        "内定辞退",
        "不採用",
        "スカウト承諾",
      ],
      event_format: ["online", "onsite", "hybrid"],
      grandprix_type: ["case", "webtest", "bizscore"],
      offer_status: ["pending", "accepted", "rejected"],
      question_category: [
        "web_lang",
        "web_math",
        "case",
        "biz_battle",
        "spi_language",
      ],
      role_enum: ["student", "company", "company_admin", "admin"],
      section_type: ["quant", "verbal", "english", "logical"],
      selection_type: ["fulltime", "internship_short", "event", "intern_long"],
      session_status: ["in_progress", "submitted", "graded"],
      test_code: ["spi", "tamatebako", "case", "bizscore"],
    },
  },
} as const
