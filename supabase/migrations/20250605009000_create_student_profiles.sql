-- Migration: create_student_profiles
-- Creates the student_profiles table if it does not already exist.
CREATE TABLE IF NOT EXISTS public.student_profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name         text,
  last_name          text,
  kana               text,
  gender             text,
  birthday           date,
  university         text,
  faculty            text,
  department         text,
  year_of_graduation integer,
  summary            text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
