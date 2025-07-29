create extension if not exists "http" with schema "extensions";


revoke references on table "public"."user_roles" from "authenticated";

revoke trigger on table "public"."user_roles" from "authenticated";

revoke truncate on table "public"."user_roles" from "authenticated";

drop view if exists "public"."selections_view";

drop view if exists "public"."student_resume_jobtypes";

alter type "public"."selection_type" rename to "selection_type__old_version_to_be_dropped";

create type "public"."selection_type" as enum ('fulltime', 'internship_short', 'event', 'intern_long');

create table "public"."intern_long_details" (
    "id" uuid not null default uuid_generate_v4(),
    "selection_id" uuid not null,
    "start_date" date,
    "min_duration_months" integer,
    "work_days_per_week" integer,
    "hourly_wage" numeric,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."intern_long_details" enable row level security;

alter table "public"."jobs" alter column selection_type type "public"."selection_type" using selection_type::text::"public"."selection_type";

drop type "public"."selection_type__old_version_to_be_dropped";

alter table "public"."resumes" add column "job_type" text;

CREATE INDEX idx_intern_long_details_selection_id ON public.intern_long_details USING btree (selection_id);

CREATE INDEX idx_jobs_selection_type_published ON public.jobs USING btree (selection_type, published) WHERE (published = true);

CREATE UNIQUE INDEX intern_long_details_pkey ON public.intern_long_details USING btree (id);

CREATE UNIQUE INDEX intern_long_details_selection_id_key ON public.intern_long_details USING btree (selection_id);

alter table "public"."intern_long_details" add constraint "intern_long_details_pkey" PRIMARY KEY using index "intern_long_details_pkey";

alter table "public"."intern_long_details" add constraint "intern_long_details_selection_id_fkey" FOREIGN KEY (selection_id) REFERENCES jobs(id) ON DELETE CASCADE not valid;

alter table "public"."intern_long_details" validate constraint "intern_long_details_selection_id_fkey";

alter table "public"."intern_long_details" add constraint "intern_long_details_selection_id_key" UNIQUE using index "intern_long_details_selection_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.set_timestamp_intern_long_details()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
;

create or replace view "public"."selections_view" as  SELECT j.id,
    j.company_id,
    j.title,
    j.description,
    j.location,
    j.published,
    j.views,
    j.selection_type,
    j.application_deadline,
    j.cover_image_url,
    j.created_at,
    f.working_days,
    f.salary_min,
    f.salary_max,
    i.start_date,
    i.end_date,
    i.duration_weeks,
    i.work_days_per_week,
    i.allowance,
    e.event_date,
    e.capacity,
    e.venue,
    e.format,
    e.is_online
   FROM (((jobs j
     LEFT JOIN fulltime_details f ON ((f.job_id = j.id)))
     LEFT JOIN internship_details i ON ((i.job_id = j.id)))
     LEFT JOIN event_details e ON ((e.job_id = j.id)));


create or replace view "public"."student_resume_jobtypes" as  SELECT r.user_id AS student_id,
    array_agg(DISTINCT (w.value ->> 'jobType'::text)) AS job_types
   FROM resumes r,
    LATERAL jsonb_array_elements(r.work_experiences) w(value)
  GROUP BY r.user_id;


grant delete on table "public"."intern_long_details" to "anon";

grant insert on table "public"."intern_long_details" to "anon";

grant references on table "public"."intern_long_details" to "anon";

grant select on table "public"."intern_long_details" to "anon";

grant trigger on table "public"."intern_long_details" to "anon";

grant truncate on table "public"."intern_long_details" to "anon";

grant update on table "public"."intern_long_details" to "anon";

grant delete on table "public"."intern_long_details" to "authenticated";

grant insert on table "public"."intern_long_details" to "authenticated";

grant references on table "public"."intern_long_details" to "authenticated";

grant select on table "public"."intern_long_details" to "authenticated";

grant trigger on table "public"."intern_long_details" to "authenticated";

grant truncate on table "public"."intern_long_details" to "authenticated";

grant update on table "public"."intern_long_details" to "authenticated";

grant delete on table "public"."intern_long_details" to "service_role";

grant insert on table "public"."intern_long_details" to "service_role";

grant references on table "public"."intern_long_details" to "service_role";

grant select on table "public"."intern_long_details" to "service_role";

grant trigger on table "public"."intern_long_details" to "service_role";

grant truncate on table "public"."intern_long_details" to "service_role";

grant update on table "public"."intern_long_details" to "service_role";

create policy "company can manage own intern_long_details"
on "public"."intern_long_details"
as permissive
for all
to public
using (is_company_member(( SELECT jobs.company_id
   FROM jobs
  WHERE (jobs.id = intern_long_details.selection_id))))
with check (is_company_member(( SELECT jobs.company_id
   FROM jobs
  WHERE (jobs.id = intern_long_details.selection_id))));


CREATE TRIGGER trg_intern_long_details_timestamp BEFORE UPDATE ON public.intern_long_details FOR EACH ROW EXECUTE FUNCTION set_timestamp_intern_long_details();


