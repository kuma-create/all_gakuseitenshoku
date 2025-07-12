revoke references on table "public"."student_profiles" from "authenticated";

revoke trigger on table "public"."student_profiles" from "authenticated";

revoke truncate on table "public"."student_profiles" from "authenticated";

revoke references on table "public"."user_roles" from "authenticated";

revoke trigger on table "public"."user_roles" from "authenticated";

revoke truncate on table "public"."user_roles" from "authenticated";

--alter table "public"."resumes" drop constraint "resumes_user_id_fkey";

--drop view if exists "public"."student_resume_jobtypes";

--alter table "public"."resumes" drop column "job_type";

--alter table "public"."resumes" drop column "title";

--alter table "public"."resumes" add column "desired_job_title" text;

--alter table "public"."resumes" add column "educations" jsonb;

--alter table "public"."resumes" add column "experiences" jsonb;

--alter table "public"."resumes" add column "form_data" jsonb not null default '{}'::jsonb;

--alter table "public"."resumes" add column "skills" jsonb;

--alter table "public"."resumes" alter column "user_id" drop not null;

--alter table "public"."resumes" alter column "work_experiences" set not null;

create or replace view "public"."student_resume_jobtypes" as  SELECT r.user_id AS student_id,
    array_agg(DISTINCT (w.value ->> 'jobType'::text)) AS job_types
   FROM resumes r,
    LATERAL jsonb_array_elements(r.work_experiences) w(value)
  GROUP BY r.user_id;



