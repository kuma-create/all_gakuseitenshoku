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
        ]
      }
      challenge_submissions: {
        Row: {
          answer: string
          challenge_id: string
          comment: string | null
          created_at: string
          id: string
          score: number | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          answer: string
          challenge_id: string
          comment?: string | null
          created_at?: string
          id?: string
          score?: number | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          answer?: string
          challenge_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          score?: number | null
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
        ]
      }
      challenges: {
        Row: {
          category: string
          company: string | null
          created_at: string
          deadline: string
          description: string
          id: string
          question_count: number
          time_limit_min: number
          title: string
          updated_at: string
          word_limit: number
        }
        Insert: {
          category?: string
          company?: string | null
          created_at?: string
          deadline: string
          description: string
          id?: string
          question_count?: number
          time_limit_min?: number
          title: string
          updated_at?: string
          word_limit: number
        }
        Update: {
          category?: string
          company?: string | null
          created_at?: string
          deadline?: string
          description?: string
          id?: string
          question_count?: number
          time_limit_min?: number
          title?: string
          updated_at?: string
          word_limit?: number
        }
        Relationships: []
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
            referencedRelation: "companies"
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
          address: string | null
          contact_email: string | null
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
          phone: string | null
          recruit_website: string | null
          status: string
          user_id: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
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
          phone?: string | null
          recruit_website?: string | null
          status?: string
          user_id?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
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
          phone?: string | null
          recruit_website?: string | null
          status?: string
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
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
        ]
      }
      experiences: {
        Row: {
          achievements: string | null
          company_name: string | null
          created_at: string | null
          end_date: string | null
          id: string
          role: string | null
          start_date: string | null
          user_id: string | null
        }
        Insert: {
          achievements?: string | null
          company_name?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          role?: string | null
          start_date?: string | null
          user_id?: string | null
        }
        Update: {
          achievements?: string | null
          company_name?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          role?: string | null
          start_date?: string | null
          user_id?: string | null
        }
        Relationships: []
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
            foreignKeyName: "job_interests_student_id_fkey"
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
          published_until: string | null
          requirements: string | null
          salary_max: number | null
          salary_min: number | null
          salary_range: string | null
          title: string
          views: number
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
          published_until?: string | null
          requirements?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_range?: string | null
          title: string
          views?: number
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
          published_until?: string | null
          requirements?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_range?: string | null
          title?: string
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
        ]
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
      question_bank: {
        Row: {
          category: Database["public"]["Enums"]["question_category"]
          choices: Json | null
          correct_choice: number | null
          created_at: string | null
          difficulty: number | null
          expected_kw: string[] | null
          explanation: string | null
          id: string
          stem: string
        }
        Insert: {
          category: Database["public"]["Enums"]["question_category"]
          choices?: Json | null
          correct_choice?: number | null
          created_at?: string | null
          difficulty?: number | null
          expected_kw?: string[] | null
          explanation?: string | null
          id?: string
          stem: string
        }
        Update: {
          category?: Database["public"]["Enums"]["question_category"]
          choices?: Json | null
          correct_choice?: number | null
          created_at?: string | null
          difficulty?: number | null
          expected_kw?: string[] | null
          explanation?: string | null
          id?: string
          stem?: string
        }
        Relationships: []
      }
      resumes: {
        Row: {
          created_at: string | null
          desired_job_title: string | null
          educations: Json | null
          experiences: Json | null
          id: string
          skills: Json | null
          summary: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          desired_job_title?: string | null
          educations?: Json | null
          experiences?: Json | null
          id?: string
          skills?: Json | null
          summary?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          desired_job_title?: string | null
          educations?: Json | null
          experiences?: Json | null
          id?: string
          skills?: Json | null
          summary?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resumes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      scout_templates: {
        Row: {
          company_id: string
          content: string
          created_at: string | null
          id: string
          title: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string | null
          id?: string
          title: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string | null
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "scout_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      scouts: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          is_read: boolean
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
          is_read?: boolean
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
          is_read?: boolean
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
            referencedRelation: "companies"
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
      session_answers: {
        Row: {
          answer_raw: Json | null
          elapsed_sec: number | null
          is_correct: boolean | null
          question_id: string
          score: number | null
          session_id: string
        }
        Insert: {
          answer_raw?: Json | null
          elapsed_sec?: number | null
          is_correct?: boolean | null
          question_id: string
          score?: number | null
          session_id: string
        }
        Update: {
          answer_raw?: Json | null
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
      student_profiles: {
        Row: {
          about: string | null
          academic_year: number | null
          address: string | null
          admission_month: string | null
          avatar: string | null
          avatar_url: string | null
          birth_date: string | null
          created_at: string | null
          department: string | null
          desired_industries: string[] | null
          desired_locations: string[] | null
          desired_positions: string[] | null
          dev_tools: string | null
          email: string | null
          employment_type: string | null
          enrollment_status: string | null
          experience: Json | null
          faculty: string | null
          first_name: string | null
          first_name_kana: string | null
          framework_lib: string | null
          full_name: string | null
          gender: string | null
          graduation_month: string | null
          graduation_year: number | null
          has_internship_experience: boolean
          id: string
          interests: string[]
          join_ipo: boolean | null
          language_skill: string | null
          last_name: string | null
          last_name_kana: string | null
          location: string | null
          major: string | null
          motive: string | null
          phone: string | null
          postal_code: string | null
          pr_body: string | null
          pr_text: string | null
          pr_title: string | null
          preference_note: string | null
          profile_image: string | null
          qualification_text: string | null
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
          academic_year?: number | null
          address?: string | null
          admission_month?: string | null
          avatar?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          department?: string | null
          desired_industries?: string[] | null
          desired_locations?: string[] | null
          desired_positions?: string[] | null
          dev_tools?: string | null
          email?: string | null
          employment_type?: string | null
          enrollment_status?: string | null
          experience?: Json | null
          faculty?: string | null
          first_name?: string | null
          first_name_kana?: string | null
          framework_lib?: string | null
          full_name?: string | null
          gender?: string | null
          graduation_month?: string | null
          graduation_year?: number | null
          has_internship_experience?: boolean
          id?: string
          interests?: string[]
          join_ipo?: boolean | null
          language_skill?: string | null
          last_name?: string | null
          last_name_kana?: string | null
          location?: string | null
          major?: string | null
          motive?: string | null
          phone?: string | null
          postal_code?: string | null
          pr_body?: string | null
          pr_text?: string | null
          pr_title?: string | null
          preference_note?: string | null
          profile_image?: string | null
          qualification_text?: string | null
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
          academic_year?: number | null
          address?: string | null
          admission_month?: string | null
          avatar?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          department?: string | null
          desired_industries?: string[] | null
          desired_locations?: string[] | null
          desired_positions?: string[] | null
          dev_tools?: string | null
          email?: string | null
          employment_type?: string | null
          enrollment_status?: string | null
          experience?: Json | null
          faculty?: string | null
          first_name?: string | null
          first_name_kana?: string | null
          framework_lib?: string | null
          full_name?: string | null
          gender?: string | null
          graduation_month?: string | null
          graduation_year?: number | null
          has_internship_experience?: boolean
          id?: string
          interests?: string[]
          join_ipo?: boolean | null
          language_skill?: string | null
          last_name?: string | null
          last_name_kana?: string | null
          location?: string | null
          major?: string | null
          motive?: string | null
          phone?: string | null
          postal_code?: string | null
          pr_body?: string | null
          pr_text?: string | null
          pr_title?: string | null
          preference_note?: string | null
          profile_image?: string | null
          qualification_text?: string | null
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
      gp_rank: {
        Row: {
          rank: number | null
          student_id: string | null
          total_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
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
    }
    Functions: {
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
      calculate_profile_completion: {
        Args: { p_user_id: string }
        Returns: {
          score: number
          missing: string[]
        }[]
      }
      calculate_resume_completion: {
        Args: { p_user_id: string }
        Returns: {
          score: number
          missing: string[]
        }[]
      }
      count_unread: {
        Args: { _uid: string }
        Returns: number
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
      grade_session: {
        Args: { p_session_id: string }
        Returns: number
      }
      increment_job_view: {
        Args: { _job_id: string }
        Returns: undefined
      }
      is_admin: {
        Args: Record<PropertyKey, never>
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
      is_student: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      start_webtest_session: {
        Args: { p_challenge_id: string; p_student_id: string }
        Returns: string
      }
      start_webtest_session_balanced: {
        Args: { p_challenge_id: string; p_student_id: string }
        Returns: string
      }
    }
    Enums: {
      offer_status: "pending" | "accepted" | "rejected"
      question_category: "web_lang" | "web_math" | "case" | "biz_battle"
      session_status: "in_progress" | "submitted" | "graded"
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
      question_category: ["web_lang", "web_math", "case", "biz_battle"],
      session_status: ["in_progress", "submitted", "graded"],
    },
  },
} as const
