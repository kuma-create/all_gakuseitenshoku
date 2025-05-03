import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions based on our database schema
export type Job = {
  id: number
  title: string
  description: string
  company_id: string
  location: string
  salary_min: number
  salary_max: number
  employment_type: string
  work_style: string
  status: string
  created_at: string
  updated_at: string
  deadline: string | null
  department: string | null
  requirements: string | null
  benefits: string | null
  views: number
}

export type Company = {
  id: string
  name: string
  description: string
  logo_url: string
  cover_image_url: string | null
  industry: string
  founded_year: number | null
  employee_count: number | null
  location: string
  website_url: string | null
  created_at: string
}

export type JobTag = {
  job_id: number
  tag: string
}
