create table if not exists "public"."intern_long_details" (
  "id" uuid not null default uuid_generate_v4(),
  "selection_id" uuid not null,
  "start_date" date,
  "min_duration_months" integer,
  "work_days_per_week" integer,
  "hourly_wage" numeric,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "is_paid" boolean not null default false,
  "job_id" uuid
);
