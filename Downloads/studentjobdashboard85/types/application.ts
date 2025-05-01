// Define the Application type based on your Supabase schema
export interface Application {
  id: string
  student_id: string
  job_id: string
  status: string
  cover_letter: string | null
  created_at: string
  updated_at: string
  // Include the joined tables
  jobs?: {
    id: string
    title: string
    location: string | null
    job_type: string | null
    company_id: string
    companies?: {
      id: string
      name: string
      logo_url: string | null
    }
  }
  students?: {
    id: string
    first_name: string | null
    last_name: string | null
    university: string | null
    major: string | null
    graduation_year: number | null
    avatar_url: string | null
  }
}

// Type for the company applications client props
export interface CompanyApplicationsClientProps {
  applications: Application[]
}
