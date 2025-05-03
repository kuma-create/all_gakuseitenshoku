export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      student_profiles: {
        Row: {
          id: string
          user_id: string | null
          full_name: string | null
          university: string | null
          faculty: string | null
          department: string | null
          graduation_year: number | null
          birth_date: string | null
          gender: string | null
          profile_image: string | null
          skills: string[] | null
          pr_text: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          full_name?: string | null
          university?: string | null
          faculty?: string | null
          department?: string | null
          graduation_year?: number | null
          birth_date?: string | null
          gender?: string | null
          profile_image?: string | null
          skills?: string[] | null
          pr_text?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          full_name?: string | null
          university?: string | null
          faculty?: string | null
          department?: string | null
          graduation_year?: number | null
          birth_date?: string | null
          gender?: string | null
          profile_image?: string | null
          skills?: string[] | null
          pr_text?: string | null
          created_at?: string | null
        }
      }
      jobs: {
        Row: {
          id: string
          title: string
          company_id: string
          description: string
          requirements: string[] | null
          location: string | null
          salary_range: string | null
          job_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          company_id: string
          description: string
          requirements?: string[] | null
          location?: string | null
          salary_range?: string | null
          job_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          company_id?: string
          description?: string
          requirements?: string[] | null
          location?: string | null
          salary_range?: string | null
          job_type?: string | null
          created_at?: string
        }
      }
      applications: {
        Row: {
          id: string
          job_id: string
          student_id: string
          status: string
          created_at: string
          resume_url: string | null
          cover_letter: string | null
        }
        Insert: {
          id?: string
          job_id: string
          student_id: string
          status: string
          created_at?: string
          resume_url?: string | null
          cover_letter?: string | null
        }
        Update: {
          id?: string
          job_id?: string
          student_id?: string
          status?: string
          created_at?: string
          resume_url?: string | null
          cover_letter?: string | null
        }
      }
      scouts: {
        Row: {
          id: string
          company_id: string
          student_id: string
          message: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          student_id: string
          message?: string | null
          status: string
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          student_id?: string
          message?: string | null
          status?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
export type InsertTables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]
export type UpdateTables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"]
