create extension if not exists "vector" with schema "public" version '0.8.0';

create type "public"."application_status" as enum ('未対応', '書類選考中', '一次面接調整中', '一次面接済', '二次面接調整中', '二次面接済', '最終面接調整中', '最終面接済', '内定', '内定辞退', '不採用', 'スカウト承諾');

create type "public"."event_format" as enum ('online', 'onsite', 'hybrid');

create type "public"."grandprix_type" as enum ('case', 'webtest', 'bizscore');

create type "public"."offer_status" as enum ('pending', 'accepted', 'rejected');

create type "public"."question_category" as enum ('web_lang', 'web_math', 'case', 'biz_battle', 'spi_language');

create type "public"."role_enum" as enum ('student', 'company', 'company_admin', 'admin');

create type "public"."section_type" as enum ('quant', 'verbal', 'english', 'logical');

create type "public"."selection_type" as enum ('fulltime', 'internship_short', 'event');

create type "public"."session_status" as enum ('in_progress', 'submitted', 'graded');

create type "public"."test_code" as enum ('spi', 'tamatebako', 'case', 'bizscore');

create sequence "public"."role_change_log_id_seq";

alter table "public"."resumes" drop constraint "resumes_user_id_fkey";

alter table "public"."student_profiles" drop constraint "student_profiles_user_id_fkey";

drop view if exists "public"."student_resume_jobtypes";

create table "public"."activity_logs" (
    "id" uuid not null default gen_random_uuid(),
    "timestamp" timestamp with time zone default now(),
    "actor" text not null,
    "role" text not null,
    "action" text not null,
    "target" text not null,
    "ip_address" text not null,
    "title" text,
    "description" text,
    "metadata" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."activity_logs" enable row level security;

create table "public"."applications" (
    "id" uuid not null default gen_random_uuid(),
    "student_id" uuid,
    "job_id" uuid,
    "status" application_status default '未対応'::application_status,
    "created_at" timestamp with time zone default now(),
    "applied_at" date default CURRENT_DATE,
    "interest_level" smallint,
    "self_pr" text,
    "last_activity" timestamp with time zone default now(),
    "resume_url" text,
    "company_id" uuid
);


alter table "public"."applications" enable row level security;

create table "public"."article_bookmarks" (
    "id" uuid not null default gen_random_uuid(),
    "article_id" text not null,
    "user_id" uuid not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."article_bookmarks" enable row level security;

create table "public"."article_comments" (
    "id" uuid not null default gen_random_uuid(),
    "article_id" text not null,
    "user_id" uuid not null,
    "body" text not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."article_comments" enable row level security;

create table "public"."bizscore_questions" (
    "id" uuid not null default gen_random_uuid(),
    "order_no" integer,
    "question" text,
    "weight" numeric default 1.0
);


create table "public"."challenge_questions" (
    "challenge_id" uuid not null,
    "question_id" uuid not null,
    "order_no" integer,
    "weight" integer default 1
);


alter table "public"."challenge_questions" enable row level security;

create table "public"."challenge_sessions" (
    "id" uuid not null default gen_random_uuid(),
    "challenge_id" uuid,
    "student_id" uuid,
    "started_at" timestamp with time zone default now(),
    "ended_at" timestamp with time zone,
    "score" numeric,
    "elapsed_sec" integer,
    "status" session_status default 'in_progress'::session_status
);


alter table "public"."challenge_sessions" enable row level security;

create table "public"."challenge_submissions" (
    "id" uuid not null default gen_random_uuid(),
    "challenge_id" uuid not null,
    "student_id" uuid not null,
    "answer" text not null,
    "status" text not null default 'submitted'::text,
    "score" integer,
    "comment" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "auto_score" integer,
    "final_score" integer,
    "score_source" text,
    "answers" jsonb,
    "session_id" uuid not null
);


alter table "public"."challenge_submissions" enable row level security;

create table "public"."challenges" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "description" text,
    "word_limit" integer,
    "deadline" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "category" text not null default 'webtest'::text,
    "company" text,
    "time_limit_min" integer not null default 40,
    "question_count" integer not null default 40,
    "start_date" timestamp with time zone not null default now(),
    "student_id" uuid,
    "score" numeric not null default 0,
    "type" grandprix_type not null default 'case'::grandprix_type,
    "event_id" uuid,
    "created_by" uuid not null default auth.uid(),
    "answer_video_url" text,
    "time_limit_s" integer not null default 900,
    "test_code" test_code,
    "section_type" section_type
);


alter table "public"."challenges" enable row level security;

create table "public"."chat_rooms" (
    "id" uuid not null default uuid_generate_v4(),
    "company_id" uuid,
    "student_id" uuid,
    "job_id" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "scout_id" uuid
);


alter table "public"."chat_rooms" enable row level security;

create table "public"."companies" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "name" text not null,
    "description" text,
    "website" text,
    "logo" text,
    "created_at" timestamp with time zone default now(),
    "cover_image_url" text,
    "industry" text,
    "founded_year" integer,
    "employee_count" integer,
    "location" text,
    "recruit_website" text,
    "status" text not null default '承認待ち'::text,
    "contact_email" character varying,
    "phone" character varying,
    "address" text,
    "video_url" text,
    "tagline" text,
    "representative" text,
    "founded_on" date,
    "capital_jpy" bigint,
    "revenue_jpy" bigint,
    "headquarters" text,
    "cover_image" text,
    "created_by" uuid
);


alter table "public"."companies" enable row level security;

create table "public"."company_business_areas" (
    "company_id" uuid not null,
    "ordinal" integer not null,
    "area" text
);


create table "public"."company_events" (
    "id" uuid not null default uuid_generate_v4(),
    "company_id" uuid,
    "title" text,
    "type" text,
    "datetime" timestamp with time zone,
    "location" text,
    "url" text
);


create table "public"."company_favorites" (
    "id" uuid not null default gen_random_uuid(),
    "company_id" uuid not null,
    "user_id" uuid not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."company_favorites" enable row level security;

create table "public"."company_highlights" (
    "id" uuid not null default uuid_generate_v4(),
    "company_id" uuid,
    "ordinal" integer,
    "icon" text,
    "title" text,
    "body" text
);


create table "public"."company_interviews" (
    "id" uuid not null default uuid_generate_v4(),
    "company_id" uuid,
    "question" text,
    "answer_hint" text,
    "experience_text" text,
    "graduation_year" integer,
    "posted_at" timestamp with time zone default now(),
    "selection_category" text,
    "phase" text,
    "user_id" uuid
);


create table "public"."company_members" (
    "id" uuid not null default gen_random_uuid(),
    "company_id" uuid not null,
    "user_id" uuid not null,
    "role" text not null default 'recruiter'::text,
    "invited_at" timestamp with time zone not null default now(),
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."company_members" enable row level security;

create table "public"."company_philosophy" (
    "company_id" uuid not null,
    "ordinal" integer not null,
    "paragraph" text
);


create table "public"."company_positions" (
    "company_id" uuid not null,
    "ordinal" integer not null,
    "position" text
);


create table "public"."company_recruit_info" (
    "company_id" uuid not null,
    "message" text
);


alter table "public"."company_recruit_info" enable row level security;

create table "public"."company_reviews" (
    "id" uuid not null default uuid_generate_v4(),
    "company_id" uuid,
    "rating" numeric(2,1),
    "title" text,
    "body" text,
    "role" text,
    "tenure_years" integer,
    "posted_at" timestamp with time zone default now(),
    "rating_growth" numeric,
    "rating_worklife" numeric,
    "rating_selection" numeric,
    "rating_culture" numeric,
    "user_id" uuid
);


create table "public"."company_student_memos" (
    "id" uuid not null default gen_random_uuid(),
    "company_id" uuid not null,
    "student_id" uuid not null,
    "memo" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


create table "public"."event_details" (
    "selection_id" uuid not null,
    "event_date" date,
    "capacity" integer,
    "format" text,
    "venue" text,
    "target_grad_years" integer[],
    "sessions" jsonb,
    "contact_email" text,
    "notes" text,
    "job_id" uuid,
    "is_online" boolean
);


create table "public"."event_participants" (
    "id" uuid not null default gen_random_uuid(),
    "event_id" uuid not null,
    "student_id" uuid not null,
    "status" text not null default 'reserved'::text,
    "created_at" timestamp with time zone default now()
);


alter table "public"."event_participants" enable row level security;

create table "public"."events" (
    "id" uuid not null default gen_random_uuid(),
    "title" character varying(120) not null,
    "description" text,
    "event_date" date not null,
    "event_type" character varying(24) default 'online'::character varying,
    "cover_image" text,
    "status" character varying(12) default 'draft'::character varying,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."events" enable row level security;

create table "public"."features" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "content" text,
    "status" text not null default 'draft'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."features" enable row level security;

create table "public"."fulltime_details" (
    "selection_id" uuid,
    "is_ongoing" boolean default true,
    "job_id" uuid not null,
    "working_days" text,
    "salary_min" numeric,
    "salary_max" numeric,
    "working_hours" text,
    "benefits" text
);


create table "public"."inquiries" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "email" text not null,
    "company" text not null,
    "message" text not null,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."inquiries" enable row level security;

create table "public"."internship_details" (
    "selection_id" uuid not null,
    "start_date" date,
    "end_date" date,
    "duration_weeks" integer,
    "work_days_per_week" integer,
    "is_paid" boolean,
    "allowance" text,
    "target_grad_years" integer[],
    "format" event_format,
    "sessions" jsonb,
    "capacity" integer,
    "selection_flow" jsonb,
    "perks" text,
    "contact_email" text,
    "notes" text,
    "job_id" uuid
);


create table "public"."job_embeddings" (
    "job_id" uuid not null,
    "content" text not null,
    "embedding" vector(1536)
);


alter table "public"."job_embeddings" enable row level security;

create table "public"."job_interests" (
    "id" uuid not null default gen_random_uuid(),
    "student_id" uuid not null,
    "job_id" uuid not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."job_interests" enable row level security;

create table "public"."job_tags" (
    "id" uuid not null default uuid_generate_v4(),
    "job_id" uuid not null,
    "tag" text not null
);


alter table "public"."job_tags" enable row level security;

create table "public"."jobs" (
    "id" uuid not null default gen_random_uuid(),
    "company_id" uuid,
    "title" text not null,
    "description" text,
    "requirements" text,
    "location" text,
    "work_type" text,
    "salary_range" text,
    "published" boolean default true,
    "created_at" timestamp with time zone not null default now(),
    "cover_image_url" text,
    "is_recommended" boolean not null default false,
    "views" integer not null default 0,
    "published_until" date,
    "selection_type" selection_type,
    "application_deadline" date,
    "category" text default '本選考'::text,
    "start_date" date,
    "user_id" uuid not null default auth.uid(),
    "department" text
);


alter table "public"."jobs" enable row level security;

create table "public"."media_authors" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "display_name" text not null,
    "bio" text,
    "avatar_url" text
);


create table "public"."media_categories" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "slug" text not null,
    "order" integer default 0
);


create table "public"."media_posts" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "slug" text not null,
    "excerpt" text,
    "content_md" text,
    "content_html" text,
    "cover_image_url" text,
    "status" text not null default 'draft'::text,
    "published_at" timestamp with time zone,
    "author_id" uuid,
    "category_id" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "deleted_at" timestamp with time zone,
    "preview_token" uuid default uuid_generate_v4()
);


alter table "public"."media_posts" enable row level security;

create table "public"."media_posts_tags" (
    "post_id" uuid not null,
    "tag_id" uuid not null
);


alter table "public"."media_posts_tags" enable row level security;

create table "public"."media_tags" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "slug" text not null
);


create table "public"."messages" (
    "id" uuid not null default uuid_generate_v4(),
    "chat_room_id" uuid not null,
    "sender_id" uuid not null,
    "content" text not null,
    "is_read" boolean default false,
    "attachment_url" text,
    "created_at" timestamp with time zone default now(),
    "answered_at" timestamp with time zone
);


alter table "public"."messages" enable row level security;

create table "public"."notifications" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "title" character varying(255) not null,
    "message" text not null,
    "notification_type" character varying(50) not null,
    "related_id" uuid not null,
    "is_read" boolean default false,
    "created_at" timestamp with time zone default now(),
    "channel" text default 'in_app'::text,
    "send_status" text,
    "send_after" timestamp with time zone default now(),
    "error_reason" text,
    "url" text
);


alter table "public"."notifications" enable row level security;

create table "public"."qualifications" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null
);


create table "public"."question_bank" (
    "id" uuid not null default gen_random_uuid(),
    "category" question_category,
    "stem" text not null,
    "choices" jsonb,
    "correct_choice" integer,
    "expected_kw" text[],
    "difficulty" integer default 3,
    "explanation" text,
    "created_at" timestamp with time zone default now(),
    "challenge_id" uuid,
    "weight" numeric default 1.0,
    "grand_type" grandprix_type not null default 'case'::grandprix_type,
    "order_no" integer,
    "stem_img_url" text,
    "choices_img" jsonb
);


alter table "public"."question_bank" enable row level security;

create table "public"."referral_codes" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "code" text not null,
    "created_at" timestamp with time zone default now()
);


create table "public"."referral_uses" (
    "id" uuid not null default gen_random_uuid(),
    "referral_code_id" uuid not null,
    "referred_user_id" uuid,
    "status" text default 'pending'::text,
    "created_at" timestamp with time zone default now()
);


create table "public"."role_change_log" (
    "id" bigint not null default nextval('role_change_log_id_seq'::regclass),
    "user_id" uuid,
    "old_role" text,
    "new_role" text,
    "changed_by" text default current_setting('request.jwt.claim.email'::text, true),
    "query" text default current_query(),
    "changed_at" timestamp with time zone default now()
);


create table "public"."scout_templates" (
    "id" uuid not null default uuid_generate_v4(),
    "company_id" uuid not null,
    "title" text not null,
    "content" text not null,
    "created_at" timestamp with time zone default now(),
    "is_global" boolean default false,
    "position" text,
    "offer_range" text,
    "job_id" uuid
);


alter table "public"."scout_templates" enable row level security;

create table "public"."scouts" (
    "id" uuid not null default uuid_generate_v4(),
    "company_id" uuid not null,
    "student_id" uuid not null,
    "job_id" uuid,
    "message" text not null,
    "status" character varying(50) default 'sent'::character varying,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "is_read" boolean not null default false,
    "offer_amount" text,
    "offer_position" text,
    "accepted_at" timestamp with time zone,
    "declined_at" timestamp with time zone,
    "chat_room_id" uuid,
    "company_member_id" uuid not null
);


alter table "public"."scouts" enable row level security;

create table "public"."session_answers" (
    "session_id" uuid not null,
    "question_id" uuid not null,
    "answer_raw" jsonb,
    "is_correct" boolean,
    "score" numeric,
    "elapsed_sec" integer,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."session_answers" enable row level security;

create table "public"."skills" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null
);


create table "public"."student_profiles_backup" (
    "id" uuid,
    "user_id" uuid,
    "full_name" text,
    "university" text,
    "faculty" text,
    "department" text,
    "birth_date" date,
    "gender" text,
    "pr_text" text,
    "created_at" timestamp with time zone,
    "last_name" text,
    "first_name" text,
    "last_name_kana" text,
    "first_name_kana" text,
    "phone" text,
    "address" text,
    "admission_month" date,
    "graduation_month" date,
    "research_theme" text,
    "qualification_text" text,
    "skill_text" text,
    "language_skill" text,
    "pr_title" text,
    "pr_body" text,
    "strength1" text,
    "strength2" text,
    "strength3" text,
    "motive" text,
    "desired_industries" text[],
    "desired_positions" text[],
    "desired_locations" text[],
    "work_style" text,
    "employment_type" text,
    "salary_range" text,
    "work_style_options" text[],
    "preference_note" text,
    "updated_at" timestamp with time zone,
    "status" text,
    "has_internship_experience" boolean,
    "interests" text[],
    "about" text,
    "experience" jsonb,
    "join_ipo" boolean,
    "postal_code" character varying(8),
    "avatar_url" text,
    "hometown" text,
    "address_line" text,
    "city" text,
    "prefecture" text,
    "is_completed" boolean,
    "preferred_industries" text[],
    "auth_user_id" uuid,
    "skills" text[],
    "qualifications" text[]
);


create table "public"."student_qualifications" (
    "student_id" uuid not null,
    "qualification_id" uuid not null
);


create table "public"."student_skills" (
    "student_id" uuid not null,
    "skill_id" uuid not null
);


create table "public"."user_roles" (
    "user_id" uuid not null,
    "role" character varying(50) not null default 'student'::character varying,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."user_roles" enable row level security;

create table "public"."user_signups" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "referral_source" text not null,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."user_signups" enable row level security;

create table "public"."users" (
    "id" uuid not null default gen_random_uuid(),
    "email" text not null,
    "password" text,
    "role" text not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."users" enable row level security;

create table "public"."webtest_questions" (
    "id" uuid not null default gen_random_uuid(),
    "challenge_id" uuid,
    "order_no" integer,
    "question" text,
    "choice1" text,
    "choice2" text,
    "choice3" text,
    "choice4" text,
    "correct_choice" integer
);


alter table "public"."resumes" drop column "job_type";

alter table "public"."resumes" drop column "title";

alter table "public"."resumes" add column "desired_job_title" text;

alter table "public"."resumes" add column "educations" jsonb;

alter table "public"."resumes" add column "experiences" jsonb;

alter table "public"."resumes" add column "skills" jsonb;

alter table "public"."resumes" add column "summary" text;

alter table "public"."resumes" alter column "created_at" drop not null;

alter table "public"."resumes" alter column "updated_at" drop not null;

alter table "public"."resumes" alter column "work_experiences" set default '[]'::jsonb;

alter table "public"."resumes" alter column "work_experiences" set not null;

alter table "public"."resumes" enable row level security;

alter table "public"."student_profiles" drop column "birthday";

alter table "public"."student_profiles" drop column "kana";

alter table "public"."student_profiles" drop column "summary";

alter table "public"."student_profiles" drop column "year_of_graduation";

alter table "public"."student_profiles" add column "about" text;

alter table "public"."student_profiles" add column "address" text;

alter table "public"."student_profiles" add column "address_line" text;

alter table "public"."student_profiles" add column "admission_month" date;

alter table "public"."student_profiles" add column "auth_user_id" uuid;

alter table "public"."student_profiles" add column "avatar_url" text;

alter table "public"."student_profiles" add column "birth_date" date;

alter table "public"."student_profiles" add column "city" text;

alter table "public"."student_profiles" add column "desired_industries" text[];

alter table "public"."student_profiles" add column "desired_locations" text[] default '{}'::text[];

alter table "public"."student_profiles" add column "desired_positions" text[] default '{}'::text[];

alter table "public"."student_profiles" add column "employment_type" text;

alter table "public"."student_profiles" add column "experience" jsonb default '[]'::jsonb;

alter table "public"."student_profiles" add column "first_name_kana" text;

alter table "public"."student_profiles" add column "full_name" text;

alter table "public"."student_profiles" add column "graduation_month" date;

alter table "public"."student_profiles" add column "has_internship_experience" boolean not null default false;

alter table "public"."student_profiles" add column "hometown" text;

alter table "public"."student_profiles" add column "interests" text[] not null default '{}'::text[];

alter table "public"."student_profiles" add column "is_completed" boolean default false;

alter table "public"."student_profiles" add column "join_ipo" boolean default false;

alter table "public"."student_profiles" add column "language_skill" text;

alter table "public"."student_profiles" add column "last_name_kana" text;

alter table "public"."student_profiles" add column "last_sign_in_at" timestamp with time zone;

alter table "public"."student_profiles" add column "motive" text;

alter table "public"."student_profiles" add column "phone" text;

alter table "public"."student_profiles" add column "postal_code" character varying(8);

alter table "public"."student_profiles" add column "pr_body" text;

alter table "public"."student_profiles" add column "pr_text" text;

alter table "public"."student_profiles" add column "pr_title" text;

alter table "public"."student_profiles" add column "prefecture" text;

alter table "public"."student_profiles" add column "preference_note" text;

alter table "public"."student_profiles" add column "preferred_industries" text[] default '{}'::text[];

alter table "public"."student_profiles" add column "qualification_text" text;

alter table "public"."student_profiles" add column "qualifications" text[] default '{}'::text[];

alter table "public"."student_profiles" add column "referral_source" text;

alter table "public"."student_profiles" add column "research_theme" text;

alter table "public"."student_profiles" add column "salary_range" text;

alter table "public"."student_profiles" add column "skill_text" text;

alter table "public"."student_profiles" add column "skills" text[] default '{}'::text[];

alter table "public"."student_profiles" add column "status" text not null default 'アクティブ'::text;

alter table "public"."student_profiles" add column "strength1" text;

alter table "public"."student_profiles" add column "strength2" text;

alter table "public"."student_profiles" add column "strength3" text;

alter table "public"."student_profiles" add column "work_style" text;

alter table "public"."student_profiles" add column "work_style_options" text[] default '{}'::text[];

alter table "public"."student_profiles" alter column "created_at" drop not null;

alter table "public"."student_profiles" alter column "id" set default gen_random_uuid();

alter table "public"."student_profiles" alter column "user_id" drop not null;

alter table "public"."student_profiles" enable row level security;

alter sequence "public"."role_change_log_id_seq" owned by "public"."role_change_log"."id";

CREATE UNIQUE INDEX activity_logs_pkey ON public.activity_logs USING btree (id);

CREATE UNIQUE INDEX applications_pkey ON public.applications USING btree (id);

CREATE UNIQUE INDEX article_bookmarks_article_id_user_id_key ON public.article_bookmarks USING btree (article_id, user_id);

CREATE UNIQUE INDEX article_bookmarks_pkey ON public.article_bookmarks USING btree (id);

CREATE UNIQUE INDEX article_comments_pkey ON public.article_comments USING btree (id);

CREATE UNIQUE INDEX bizscore_questions_pkey ON public.bizscore_questions USING btree (id);

CREATE UNIQUE INDEX challenge_questions_pkey ON public.challenge_questions USING btree (challenge_id, question_id);

CREATE UNIQUE INDEX challenge_sessions_pkey ON public.challenge_sessions USING btree (id);

CREATE UNIQUE INDEX challenge_submissions_pkey ON public.challenge_submissions USING btree (id);

CREATE UNIQUE INDEX challenge_submissions_session_id_unique ON public.challenge_submissions USING btree (session_id);

CREATE INDEX challenges_created_by_idx ON public.challenges USING btree (created_by);

CREATE UNIQUE INDEX challenges_pkey ON public.challenges USING btree (id);

CREATE UNIQUE INDEX chat_rooms_company_student_job_key ON public.chat_rooms USING btree (company_id, student_id, job_id);

CREATE UNIQUE INDEX chat_rooms_pkey ON public.chat_rooms USING btree (id);

CREATE INDEX chat_rooms_scout_id_idx ON public.chat_rooms USING btree (scout_id);

CREATE UNIQUE INDEX companies_pkey ON public.companies USING btree (id);

CREATE UNIQUE INDEX companies_user_id_unique ON public.companies USING btree (user_id);

CREATE UNIQUE INDEX company_business_areas_pkey ON public.company_business_areas USING btree (company_id, ordinal);

CREATE UNIQUE INDEX company_events_pkey ON public.company_events USING btree (id);

CREATE UNIQUE INDEX company_favorites_company_id_user_id_key ON public.company_favorites USING btree (company_id, user_id);

CREATE UNIQUE INDEX company_favorites_pkey ON public.company_favorites USING btree (id);

CREATE UNIQUE INDEX company_highlights_pkey ON public.company_highlights USING btree (id);

CREATE INDEX company_interviews_company_idx ON public.company_interviews USING btree (company_id);

CREATE UNIQUE INDEX company_interviews_pkey ON public.company_interviews USING btree (id);

CREATE UNIQUE INDEX company_members_pkey ON public.company_members USING btree (id);

CREATE UNIQUE INDEX company_members_unique ON public.company_members USING btree (company_id, user_id);

CREATE UNIQUE INDEX company_philosophy_pkey ON public.company_philosophy USING btree (company_id, ordinal);

CREATE UNIQUE INDEX company_positions_pkey ON public.company_positions USING btree (company_id, ordinal);

CREATE UNIQUE INDEX company_recruit_info_pkey ON public.company_recruit_info USING btree (company_id);

CREATE INDEX company_reviews_company_idx ON public.company_reviews USING btree (company_id);

CREATE UNIQUE INDEX company_reviews_pkey ON public.company_reviews USING btree (id);

CREATE UNIQUE INDEX company_student_memos_pkey ON public.company_student_memos USING btree (id);

CREATE UNIQUE INDEX event_details_pkey ON public.event_details USING btree (selection_id);

CREATE UNIQUE INDEX event_participants_pkey ON public.event_participants USING btree (id);

CREATE UNIQUE INDEX events_pkey ON public.events USING btree (id);

CREATE UNIQUE INDEX features_pkey ON public.features USING btree (id);

CREATE UNIQUE INDEX fulltime_details_pkey ON public.fulltime_details USING btree (job_id);

CREATE INDEX idx_activity_logs_action ON public.activity_logs USING btree (action);

CREATE INDEX idx_activity_logs_actor ON public.activity_logs USING btree (actor);

CREATE INDEX idx_activity_logs_role ON public.activity_logs USING btree (role);

CREATE INDEX idx_activity_logs_timestamp ON public.activity_logs USING btree ("timestamp");

CREATE INDEX idx_applications_job_id ON public.applications USING btree (job_id);

CREATE INDEX idx_applications_student_id ON public.applications USING btree (student_id);

CREATE INDEX idx_company_members_company ON public.company_members USING btree (company_id);

CREATE INDEX idx_job_embeddings_vector ON public.job_embeddings USING ivfflat (embedding vector_cosine_ops);

CREATE INDEX idx_jobs_company_id ON public.jobs USING btree (company_id);

CREATE INDEX idx_jobs_published_until ON public.jobs USING btree (published_until);

CREATE INDEX idx_messages_chat_room_id ON public.messages USING btree (chat_room_id);

CREATE INDEX idx_messages_room_unread ON public.messages USING btree (chat_room_id, is_read) WHERE (is_read = false);

CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_id);

CREATE INDEX idx_notifications_pending ON public.notifications USING btree (send_status, channel, send_after) WHERE (send_status = 'pending'::text);

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);

CREATE INDEX idx_scouts_company_created ON public.scouts USING btree (company_id, created_at DESC);

CREATE INDEX idx_scouts_company_id ON public.scouts USING btree (company_id);

CREATE INDEX idx_scouts_student ON public.scouts USING btree (student_id);

CREATE INDEX idx_scouts_student_id ON public.scouts USING btree (student_id);

CREATE INDEX idx_student_profiles_user_id ON public.student_profiles USING btree (user_id);

CREATE INDEX idx_templates_company ON public.scout_templates USING btree (company_id);

CREATE UNIQUE INDEX idx_unique_submission ON public.challenge_submissions USING btree (challenge_id, student_id);

CREATE UNIQUE INDEX inquiries_pkey ON public.inquiries USING btree (id);

CREATE UNIQUE INDEX internship_details_pkey ON public.internship_details USING btree (selection_id);

CREATE UNIQUE INDEX job_embeddings_pkey ON public.job_embeddings USING btree (job_id);

CREATE UNIQUE INDEX job_interests_pkey ON public.job_interests USING btree (id);

CREATE UNIQUE INDEX job_interests_student_id_job_id_key ON public.job_interests USING btree (student_id, job_id);

CREATE UNIQUE INDEX job_tags_pkey ON public.job_tags USING btree (id);

CREATE UNIQUE INDEX jobs_pkey ON public.jobs USING btree (id);

CREATE INDEX jobs_start_date_idx ON public.jobs USING btree (start_date);

CREATE INDEX jobs_user_id_idx ON public.jobs USING btree (user_id);

CREATE UNIQUE INDEX media_authors_pkey ON public.media_authors USING btree (id);

CREATE UNIQUE INDEX media_categories_pkey ON public.media_categories USING btree (id);

CREATE UNIQUE INDEX media_categories_slug_key ON public.media_categories USING btree (slug);

CREATE UNIQUE INDEX media_posts_pkey ON public.media_posts USING btree (id);

CREATE UNIQUE INDEX media_posts_slug_key ON public.media_posts USING btree (slug);

CREATE UNIQUE INDEX media_posts_tags_pkey ON public.media_posts_tags USING btree (post_id, tag_id);

CREATE UNIQUE INDEX media_tags_pkey ON public.media_tags USING btree (id);

CREATE UNIQUE INDEX media_tags_slug_key ON public.media_tags USING btree (slug);

CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE INDEX notifications_user_isread_idx ON public.notifications USING btree (user_id, is_read);

CREATE UNIQUE INDEX qualifications_name_key ON public.qualifications USING btree (name);

CREATE UNIQUE INDEX qualifications_pkey ON public.qualifications USING btree (id);

CREATE UNIQUE INDEX question_bank_pkey ON public.question_bank USING btree (id);

CREATE UNIQUE INDEX referral_codes_code_key ON public.referral_codes USING btree (code);

CREATE UNIQUE INDEX referral_codes_pkey ON public.referral_codes USING btree (id);

CREATE UNIQUE INDEX referral_codes_user_id_key ON public.referral_codes USING btree (user_id);

CREATE UNIQUE INDEX referral_uses_pkey ON public.referral_uses USING btree (id);

CREATE UNIQUE INDEX resumes_user_id_key ON public.resumes USING btree (user_id);

CREATE UNIQUE INDEX resumes_user_id_unique ON public.resumes USING btree (user_id);

CREATE UNIQUE INDEX role_change_log_pkey ON public.role_change_log USING btree (id);

CREATE UNIQUE INDEX scout_templates_pkey ON public.scout_templates USING btree (id);

CREATE UNIQUE INDEX scouts_pkey ON public.scouts USING btree (id);

CREATE UNIQUE INDEX session_answers_pkey ON public.session_answers USING btree (session_id, question_id);

CREATE UNIQUE INDEX skills_name_key ON public.skills USING btree (name);

CREATE UNIQUE INDEX skills_pkey ON public.skills USING btree (id);

CREATE INDEX student_profiles_postal_code_idx ON public.student_profiles USING btree (postal_code);

CREATE UNIQUE INDEX student_profiles_user_id_key ON public.student_profiles USING btree (user_id);

CREATE UNIQUE INDEX student_qualifications_pkey ON public.student_qualifications USING btree (student_id, qualification_id);

CREATE UNIQUE INDEX student_skills_pkey ON public.student_skills USING btree (student_id, skill_id);

CREATE UNIQUE INDEX uniq_once_per_chall ON public.challenge_sessions USING btree (challenge_id, student_id);

CREATE UNIQUE INDEX unique_chat_room ON public.chat_rooms USING btree (company_id, student_id);

CREATE UNIQUE INDEX unique_scout ON public.scouts USING btree (company_id, student_id, job_id);

CREATE UNIQUE INDEX uq_company_members_company_user ON public.company_members USING btree (company_id, user_id);

CREATE UNIQUE INDEX uq_event_job ON public.event_details USING btree (job_id);

CREATE UNIQUE INDEX uq_fulltime_job ON public.fulltime_details USING btree (job_id);

CREATE UNIQUE INDEX uq_internship_job ON public.internship_details USING btree (job_id);

CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (user_id);

CREATE UNIQUE INDEX user_roles_user_id_unique ON public.user_roles USING btree (user_id);

CREATE UNIQUE INDEX user_signups_pkey ON public.user_signups USING btree (id);

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

CREATE UNIQUE INDEX webtest_questions_pkey ON public.webtest_questions USING btree (id);

alter table "public"."activity_logs" add constraint "activity_logs_pkey" PRIMARY KEY using index "activity_logs_pkey";

alter table "public"."applications" add constraint "applications_pkey" PRIMARY KEY using index "applications_pkey";

alter table "public"."article_bookmarks" add constraint "article_bookmarks_pkey" PRIMARY KEY using index "article_bookmarks_pkey";

alter table "public"."article_comments" add constraint "article_comments_pkey" PRIMARY KEY using index "article_comments_pkey";

alter table "public"."bizscore_questions" add constraint "bizscore_questions_pkey" PRIMARY KEY using index "bizscore_questions_pkey";

alter table "public"."challenge_questions" add constraint "challenge_questions_pkey" PRIMARY KEY using index "challenge_questions_pkey";

alter table "public"."challenge_sessions" add constraint "challenge_sessions_pkey" PRIMARY KEY using index "challenge_sessions_pkey";

alter table "public"."challenge_submissions" add constraint "challenge_submissions_pkey" PRIMARY KEY using index "challenge_submissions_pkey";

alter table "public"."challenges" add constraint "challenges_pkey" PRIMARY KEY using index "challenges_pkey";

alter table "public"."chat_rooms" add constraint "chat_rooms_pkey" PRIMARY KEY using index "chat_rooms_pkey";

alter table "public"."companies" add constraint "companies_pkey" PRIMARY KEY using index "companies_pkey";

alter table "public"."company_business_areas" add constraint "company_business_areas_pkey" PRIMARY KEY using index "company_business_areas_pkey";

alter table "public"."company_events" add constraint "company_events_pkey" PRIMARY KEY using index "company_events_pkey";

alter table "public"."company_favorites" add constraint "company_favorites_pkey" PRIMARY KEY using index "company_favorites_pkey";

alter table "public"."company_highlights" add constraint "company_highlights_pkey" PRIMARY KEY using index "company_highlights_pkey";

alter table "public"."company_interviews" add constraint "company_interviews_pkey" PRIMARY KEY using index "company_interviews_pkey";

alter table "public"."company_members" add constraint "company_members_pkey" PRIMARY KEY using index "company_members_pkey";

alter table "public"."company_philosophy" add constraint "company_philosophy_pkey" PRIMARY KEY using index "company_philosophy_pkey";

alter table "public"."company_positions" add constraint "company_positions_pkey" PRIMARY KEY using index "company_positions_pkey";

alter table "public"."company_recruit_info" add constraint "company_recruit_info_pkey" PRIMARY KEY using index "company_recruit_info_pkey";

alter table "public"."company_reviews" add constraint "company_reviews_pkey" PRIMARY KEY using index "company_reviews_pkey";

alter table "public"."company_student_memos" add constraint "company_student_memos_pkey" PRIMARY KEY using index "company_student_memos_pkey";

alter table "public"."event_details" add constraint "event_details_pkey" PRIMARY KEY using index "event_details_pkey";

alter table "public"."event_participants" add constraint "event_participants_pkey" PRIMARY KEY using index "event_participants_pkey";

alter table "public"."events" add constraint "events_pkey" PRIMARY KEY using index "events_pkey";

alter table "public"."features" add constraint "features_pkey" PRIMARY KEY using index "features_pkey";

alter table "public"."fulltime_details" add constraint "fulltime_details_pkey" PRIMARY KEY using index "fulltime_details_pkey";

alter table "public"."inquiries" add constraint "inquiries_pkey" PRIMARY KEY using index "inquiries_pkey";

alter table "public"."internship_details" add constraint "internship_details_pkey" PRIMARY KEY using index "internship_details_pkey";

alter table "public"."job_embeddings" add constraint "job_embeddings_pkey" PRIMARY KEY using index "job_embeddings_pkey";

alter table "public"."job_interests" add constraint "job_interests_pkey" PRIMARY KEY using index "job_interests_pkey";

alter table "public"."job_tags" add constraint "job_tags_pkey" PRIMARY KEY using index "job_tags_pkey";

alter table "public"."jobs" add constraint "jobs_pkey" PRIMARY KEY using index "jobs_pkey";

alter table "public"."media_authors" add constraint "media_authors_pkey" PRIMARY KEY using index "media_authors_pkey";

alter table "public"."media_categories" add constraint "media_categories_pkey" PRIMARY KEY using index "media_categories_pkey";

alter table "public"."media_posts" add constraint "media_posts_pkey" PRIMARY KEY using index "media_posts_pkey";

alter table "public"."media_posts_tags" add constraint "media_posts_tags_pkey" PRIMARY KEY using index "media_posts_tags_pkey";

alter table "public"."media_tags" add constraint "media_tags_pkey" PRIMARY KEY using index "media_tags_pkey";

alter table "public"."messages" add constraint "messages_pkey" PRIMARY KEY using index "messages_pkey";

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."qualifications" add constraint "qualifications_pkey" PRIMARY KEY using index "qualifications_pkey";

alter table "public"."question_bank" add constraint "question_bank_pkey" PRIMARY KEY using index "question_bank_pkey";

alter table "public"."referral_codes" add constraint "referral_codes_pkey" PRIMARY KEY using index "referral_codes_pkey";

alter table "public"."referral_uses" add constraint "referral_uses_pkey" PRIMARY KEY using index "referral_uses_pkey";

alter table "public"."role_change_log" add constraint "role_change_log_pkey" PRIMARY KEY using index "role_change_log_pkey";

alter table "public"."scout_templates" add constraint "scout_templates_pkey" PRIMARY KEY using index "scout_templates_pkey";

alter table "public"."scouts" add constraint "scouts_pkey" PRIMARY KEY using index "scouts_pkey";

alter table "public"."session_answers" add constraint "session_answers_pkey" PRIMARY KEY using index "session_answers_pkey";

alter table "public"."skills" add constraint "skills_pkey" PRIMARY KEY using index "skills_pkey";

alter table "public"."student_qualifications" add constraint "student_qualifications_pkey" PRIMARY KEY using index "student_qualifications_pkey";

alter table "public"."student_skills" add constraint "student_skills_pkey" PRIMARY KEY using index "student_skills_pkey";

alter table "public"."user_roles" add constraint "user_roles_pkey" PRIMARY KEY using index "user_roles_pkey";

alter table "public"."user_signups" add constraint "user_signups_pkey" PRIMARY KEY using index "user_signups_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."webtest_questions" add constraint "webtest_questions_pkey" PRIMARY KEY using index "webtest_questions_pkey";

alter table "public"."applications" add constraint "applications_company_fk" FOREIGN KEY (company_id) REFERENCES companies(id) not valid;

alter table "public"."applications" validate constraint "applications_company_fk";

alter table "public"."applications" add constraint "applications_interest_level_check" CHECK (((interest_level >= 0) AND (interest_level <= 100))) not valid;

alter table "public"."applications" validate constraint "applications_interest_level_check";

alter table "public"."applications" add constraint "applications_job_id_fkey" FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE not valid;

alter table "public"."applications" validate constraint "applications_job_id_fkey";

alter table "public"."applications" add constraint "applications_student_id_fkey" FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."applications" validate constraint "applications_student_id_fkey";

alter table "public"."article_bookmarks" add constraint "article_bookmarks_article_id_user_id_key" UNIQUE using index "article_bookmarks_article_id_user_id_key";

alter table "public"."article_bookmarks" add constraint "article_bookmarks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."article_bookmarks" validate constraint "article_bookmarks_user_id_fkey";

alter table "public"."article_comments" add constraint "article_comments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."article_comments" validate constraint "article_comments_user_id_fkey";

alter table "public"."challenge_questions" add constraint "challenge_questions_challenge_id_fkey" FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE not valid;

alter table "public"."challenge_questions" validate constraint "challenge_questions_challenge_id_fkey";

alter table "public"."challenge_questions" add constraint "challenge_questions_question_id_fkey" FOREIGN KEY (question_id) REFERENCES question_bank(id) ON DELETE CASCADE not valid;

alter table "public"."challenge_questions" validate constraint "challenge_questions_question_id_fkey";

alter table "public"."challenge_sessions" add constraint "challenge_sessions_challenge_id_fkey" FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE not valid;

alter table "public"."challenge_sessions" validate constraint "challenge_sessions_challenge_id_fkey";

alter table "public"."challenge_sessions" add constraint "challenge_sessions_student_id_fkey" FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."challenge_sessions" validate constraint "challenge_sessions_student_id_fkey";

alter table "public"."challenge_sessions" add constraint "uniq_once_per_chall" UNIQUE using index "uniq_once_per_chall";

alter table "public"."challenge_submissions" add constraint "challenge_submissions_session_id_unique" UNIQUE using index "challenge_submissions_session_id_unique";

alter table "public"."challenge_submissions" add constraint "challenge_submissions_student_id_fkey" FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."challenge_submissions" validate constraint "challenge_submissions_student_id_fkey";

alter table "public"."challenges" add constraint "challenges_student_id_fkey" FOREIGN KEY (student_id) REFERENCES student_profiles(user_id) ON DELETE CASCADE not valid;

alter table "public"."challenges" validate constraint "challenges_student_id_fkey";

alter table "public"."chat_rooms" add constraint "chat_rooms_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE not valid;

alter table "public"."chat_rooms" validate constraint "chat_rooms_company_id_fkey";

alter table "public"."chat_rooms" add constraint "chat_rooms_company_student_job_key" UNIQUE using index "chat_rooms_company_student_job_key";

alter table "public"."chat_rooms" add constraint "chat_rooms_job_id_fkey" FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL not valid;

alter table "public"."chat_rooms" validate constraint "chat_rooms_job_id_fkey";

alter table "public"."chat_rooms" add constraint "chat_rooms_scout_id_fkey" FOREIGN KEY (scout_id) REFERENCES scouts(id) ON DELETE CASCADE not valid;

alter table "public"."chat_rooms" validate constraint "chat_rooms_scout_id_fkey";

alter table "public"."chat_rooms" add constraint "chat_rooms_student_id_fkey" FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."chat_rooms" validate constraint "chat_rooms_student_id_fkey";

alter table "public"."chat_rooms" add constraint "unique_chat_room" UNIQUE using index "unique_chat_room";

alter table "public"."companies" add constraint "companies_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."companies" validate constraint "companies_user_id_fkey";

alter table "public"."companies" add constraint "companies_user_id_unique" UNIQUE using index "companies_user_id_unique";

alter table "public"."company_business_areas" add constraint "company_business_areas_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE not valid;

alter table "public"."company_business_areas" validate constraint "company_business_areas_company_id_fkey";

alter table "public"."company_events" add constraint "company_events_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE not valid;

alter table "public"."company_events" validate constraint "company_events_company_id_fkey";

alter table "public"."company_favorites" add constraint "company_favorites_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE not valid;

alter table "public"."company_favorites" validate constraint "company_favorites_company_id_fkey";

alter table "public"."company_favorites" add constraint "company_favorites_company_id_user_id_key" UNIQUE using index "company_favorites_company_id_user_id_key";

alter table "public"."company_favorites" add constraint "company_favorites_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."company_favorites" validate constraint "company_favorites_user_id_fkey";

alter table "public"."company_highlights" add constraint "company_highlights_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE not valid;

alter table "public"."company_highlights" validate constraint "company_highlights_company_id_fkey";

alter table "public"."company_interviews" add constraint "company_interviews_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE not valid;

alter table "public"."company_interviews" validate constraint "company_interviews_company_id_fkey";

alter table "public"."company_interviews" add constraint "company_interviews_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."company_interviews" validate constraint "company_interviews_user_id_fkey";

alter table "public"."company_members" add constraint "company_members_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE not valid;

alter table "public"."company_members" validate constraint "company_members_company_id_fkey";

alter table "public"."company_members" add constraint "company_members_unique" UNIQUE using index "company_members_unique";

alter table "public"."company_members" add constraint "company_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."company_members" validate constraint "company_members_user_id_fkey";

alter table "public"."company_philosophy" add constraint "company_philosophy_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE not valid;

alter table "public"."company_philosophy" validate constraint "company_philosophy_company_id_fkey";

alter table "public"."company_positions" add constraint "company_positions_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE not valid;

alter table "public"."company_positions" validate constraint "company_positions_company_id_fkey";

alter table "public"."company_recruit_info" add constraint "company_recruit_info_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE not valid;

alter table "public"."company_recruit_info" validate constraint "company_recruit_info_company_id_fkey";

alter table "public"."company_reviews" add constraint "company_reviews_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE not valid;

alter table "public"."company_reviews" validate constraint "company_reviews_company_id_fkey";

alter table "public"."company_reviews" add constraint "company_reviews_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."company_reviews" validate constraint "company_reviews_user_id_fkey";

alter table "public"."company_student_memos" add constraint "company_student_memos_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE not valid;

alter table "public"."company_student_memos" validate constraint "company_student_memos_company_id_fkey";

alter table "public"."company_student_memos" add constraint "company_student_memos_student_id_fkey" FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."company_student_memos" validate constraint "company_student_memos_student_id_fkey";

alter table "public"."event_details" add constraint "fk_event_job" FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE not valid;

alter table "public"."event_details" validate constraint "fk_event_job";

alter table "public"."event_details" add constraint "uq_event_job" UNIQUE using index "uq_event_job";

alter table "public"."event_participants" add constraint "event_participants_student_id_fkey" FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."event_participants" validate constraint "event_participants_student_id_fkey";

alter table "public"."fulltime_details" add constraint "fk_fulltime_job" FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE not valid;

alter table "public"."fulltime_details" validate constraint "fk_fulltime_job";

alter table "public"."fulltime_details" add constraint "uq_fulltime_job" UNIQUE using index "uq_fulltime_job";

alter table "public"."internship_details" add constraint "fk_internship_job" FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE not valid;

alter table "public"."internship_details" validate constraint "fk_internship_job";

alter table "public"."internship_details" add constraint "internship_details_selection_id_fkey" FOREIGN KEY (selection_id) REFERENCES jobs(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."internship_details" validate constraint "internship_details_selection_id_fkey";

alter table "public"."internship_details" add constraint "uq_internship_job" UNIQUE using index "uq_internship_job";

alter table "public"."job_embeddings" add constraint "job_embeddings_job_id_fkey" FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE not valid;

alter table "public"."job_embeddings" validate constraint "job_embeddings_job_id_fkey";

alter table "public"."job_interests" add constraint "job_interests_job_id_fkey" FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE not valid;

alter table "public"."job_interests" validate constraint "job_interests_job_id_fkey";

alter table "public"."job_interests" add constraint "job_interests_student_id_fkey" FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."job_interests" validate constraint "job_interests_student_id_fkey";

alter table "public"."job_interests" add constraint "job_interests_student_id_job_id_key" UNIQUE using index "job_interests_student_id_job_id_key";

alter table "public"."job_tags" add constraint "job_tags_job_id_fkey" FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE not valid;

alter table "public"."job_tags" validate constraint "job_tags_job_id_fkey";

alter table "public"."jobs" add constraint "jobs_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE not valid;

alter table "public"."jobs" validate constraint "jobs_company_id_fkey";

alter table "public"."jobs" add constraint "jobs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."jobs" validate constraint "jobs_user_id_fkey";

alter table "public"."media_authors" add constraint "media_authors_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."media_authors" validate constraint "media_authors_user_id_fkey";

alter table "public"."media_categories" add constraint "media_categories_slug_key" UNIQUE using index "media_categories_slug_key";

alter table "public"."media_posts" add constraint "media_posts_author_id_fkey" FOREIGN KEY (author_id) REFERENCES media_authors(id) ON DELETE SET NULL not valid;

alter table "public"."media_posts" validate constraint "media_posts_author_id_fkey";

alter table "public"."media_posts" add constraint "media_posts_category_id_fkey" FOREIGN KEY (category_id) REFERENCES media_categories(id) ON DELETE SET NULL not valid;

alter table "public"."media_posts" validate constraint "media_posts_category_id_fkey";

alter table "public"."media_posts" add constraint "media_posts_slug_key" UNIQUE using index "media_posts_slug_key";

alter table "public"."media_posts_tags" add constraint "media_posts_tags_post_id_fkey" FOREIGN KEY (post_id) REFERENCES media_posts(id) ON DELETE CASCADE not valid;

alter table "public"."media_posts_tags" validate constraint "media_posts_tags_post_id_fkey";

alter table "public"."media_posts_tags" add constraint "media_posts_tags_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES media_tags(id) ON DELETE CASCADE not valid;

alter table "public"."media_posts_tags" validate constraint "media_posts_tags_tag_id_fkey";

alter table "public"."media_tags" add constraint "media_tags_slug_key" UNIQUE using index "media_tags_slug_key";

alter table "public"."messages" add constraint "messages_chat_room_id_fkey" FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_chat_room_id_fkey";

alter table "public"."messages" add constraint "messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_sender_id_fkey";

alter table "public"."notifications" add constraint "notifications_channel_check" CHECK ((channel = ANY (ARRAY['email'::text, 'in_app'::text, 'both'::text]))) not valid;

alter table "public"."notifications" validate constraint "notifications_channel_check";

alter table "public"."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_user_id_fkey";

alter table "public"."qualifications" add constraint "qualifications_name_key" UNIQUE using index "qualifications_name_key";

alter table "public"."question_bank" add constraint "question_bank_challenge_id_fkey" FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE not valid;

alter table "public"."question_bank" validate constraint "question_bank_challenge_id_fkey";

alter table "public"."referral_codes" add constraint "referral_codes_code_key" UNIQUE using index "referral_codes_code_key";

alter table "public"."referral_codes" add constraint "referral_codes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."referral_codes" validate constraint "referral_codes_user_id_fkey";

alter table "public"."referral_codes" add constraint "referral_codes_user_id_key" UNIQUE using index "referral_codes_user_id_key";

alter table "public"."referral_uses" add constraint "referral_uses_referral_code_id_fkey" FOREIGN KEY (referral_code_id) REFERENCES referral_codes(id) ON DELETE CASCADE not valid;

alter table "public"."referral_uses" validate constraint "referral_uses_referral_code_id_fkey";

alter table "public"."referral_uses" add constraint "referral_uses_referred_user_id_fkey" FOREIGN KEY (referred_user_id) REFERENCES auth.users(id) not valid;

alter table "public"."referral_uses" validate constraint "referral_uses_referred_user_id_fkey";

alter table "public"."resumes" add constraint "resumes_user_id_key" UNIQUE using index "resumes_user_id_key";

alter table "public"."resumes" add constraint "resumes_user_id_profile_fkey" FOREIGN KEY (user_id) REFERENCES student_profiles(user_id) ON DELETE CASCADE not valid;

alter table "public"."resumes" validate constraint "resumes_user_id_profile_fkey";

alter table "public"."resumes" add constraint "resumes_user_id_unique" UNIQUE using index "resumes_user_id_unique";

alter table "public"."scout_templates" add constraint "fk_templates_company" FOREIGN KEY (company_id) REFERENCES companies(id) not valid;

alter table "public"."scout_templates" validate constraint "fk_templates_company";

alter table "public"."scout_templates" add constraint "scout_templates_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE not valid;

alter table "public"."scout_templates" validate constraint "scout_templates_company_id_fkey";

alter table "public"."scout_templates" add constraint "scout_templates_job_id_fkey" FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL not valid;

alter table "public"."scout_templates" validate constraint "scout_templates_job_id_fkey";

alter table "public"."scouts" add constraint "chk_scout_status" CHECK ((((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('sent'::character varying)::text, ('opened'::character varying)::text, ('replied'::character varying)::text, ('archived'::character varying)::text, ('accepted'::character varying)::text, ('declined'::character varying)::text])) AND (((status)::text <> ALL (ARRAY[('accepted'::character varying)::text, ('declined'::character varying)::text])) OR (((status)::text = 'accepted'::text) AND (accepted_at IS NOT NULL)) OR (((status)::text = 'declined'::text) AND (declined_at IS NOT NULL))))) not valid;

alter table "public"."scouts" validate constraint "chk_scout_status";

alter table "public"."scouts" add constraint "fk_scouts_company" FOREIGN KEY (company_id) REFERENCES companies(id) not valid;

alter table "public"."scouts" validate constraint "fk_scouts_company";

alter table "public"."scouts" add constraint "fk_scouts_student" FOREIGN KEY (student_id) REFERENCES student_profiles(id) not valid;

alter table "public"."scouts" validate constraint "fk_scouts_student";

alter table "public"."scouts" add constraint "scouts_chat_room_id_fkey" FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) not valid;

alter table "public"."scouts" validate constraint "scouts_chat_room_id_fkey";

alter table "public"."scouts" add constraint "scouts_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE not valid;

alter table "public"."scouts" validate constraint "scouts_company_id_fkey";

alter table "public"."scouts" add constraint "scouts_company_member_id_fkey" FOREIGN KEY (company_member_id) REFERENCES company_members(id) ON DELETE CASCADE not valid;

alter table "public"."scouts" validate constraint "scouts_company_member_id_fkey";

alter table "public"."scouts" add constraint "scouts_job_id_fkey" FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL not valid;

alter table "public"."scouts" validate constraint "scouts_job_id_fkey";

alter table "public"."scouts" add constraint "scouts_student_id_fkey" FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."scouts" validate constraint "scouts_student_id_fkey";

alter table "public"."scouts" add constraint "unique_scout" UNIQUE using index "unique_scout";

alter table "public"."session_answers" add constraint "session_answers_question_id_fkey" FOREIGN KEY (question_id) REFERENCES question_bank(id) ON DELETE CASCADE not valid;

alter table "public"."session_answers" validate constraint "session_answers_question_id_fkey";

alter table "public"."session_answers" add constraint "session_answers_session_id_fkey" FOREIGN KEY (session_id) REFERENCES challenge_sessions(id) ON DELETE CASCADE not valid;

alter table "public"."session_answers" validate constraint "session_answers_session_id_fkey";

alter table "public"."skills" add constraint "skills_name_key" UNIQUE using index "skills_name_key";

alter table "public"."student_profiles" add constraint "student_profiles_user_id_key" UNIQUE using index "student_profiles_user_id_key";

alter table "public"."student_qualifications" add constraint "student_qualifications_qualification_id_fkey" FOREIGN KEY (qualification_id) REFERENCES qualifications(id) ON DELETE CASCADE not valid;

alter table "public"."student_qualifications" validate constraint "student_qualifications_qualification_id_fkey";

alter table "public"."student_qualifications" add constraint "student_qualifications_student_id_fkey" FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."student_qualifications" validate constraint "student_qualifications_student_id_fkey";

alter table "public"."student_skills" add constraint "student_skills_skill_id_fkey" FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE not valid;

alter table "public"."student_skills" validate constraint "student_skills_skill_id_fkey";

alter table "public"."student_skills" add constraint "student_skills_student_id_fkey" FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."student_skills" validate constraint "student_skills_student_id_fkey";

alter table "public"."user_roles" add constraint "user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_roles" validate constraint "user_roles_user_id_fkey";

alter table "public"."user_roles" add constraint "user_roles_user_id_unique" UNIQUE using index "user_roles_user_id_unique";

alter table "public"."user_signups" add constraint "user_signups_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_signups" validate constraint "user_signups_user_id_fkey";

alter table "public"."users" add constraint "users_email_key" UNIQUE using index "users_email_key";

alter table "public"."users" add constraint "users_role_check" CHECK ((role = ANY (ARRAY['student'::text, 'company'::text, 'admin'::text]))) not valid;

alter table "public"."users" validate constraint "users_role_check";

alter table "public"."webtest_questions" add constraint "webtest_questions_challenge_id_fkey" FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE not valid;

alter table "public"."webtest_questions" validate constraint "webtest_questions_challenge_id_fkey";

alter table "public"."webtest_questions" add constraint "webtest_questions_correct_choice_check" CHECK (((correct_choice >= 1) AND (correct_choice <= 4))) not valid;

alter table "public"."webtest_questions" validate constraint "webtest_questions_correct_choice_check";

alter table "public"."student_profiles" add constraint "student_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED not valid;

alter table "public"."student_profiles" validate constraint "student_profiles_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.accept_offer(p_scout_id uuid)
 RETURNS TABLE(room_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_company_id uuid;
  v_student_id uuid;
  v_room_id   uuid;
begin
  -- 対象スカウトの company_id / student_id を取得
  select company_id, student_id
    into v_company_id, v_student_id
  from scouts
  where id = p_scout_id;

  -- 既存チャットルームがあれば取得
  select id
    into v_room_id
  from chat_rooms
  where company_id = v_company_id
    and student_id = v_student_id
  limit 1;

  -- 無ければ新規作成
  if v_room_id is null then
    insert into chat_rooms (company_id, student_id)
    values (v_company_id, v_student_id)
    returning id into v_room_id;
  end if;

  -- scouts を更新
  update scouts
  set    status       = 'accepted',
         chat_room_id = v_room_id
  where  id = p_scout_id;

  -- 返却値
  return query select v_room_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.add_creator_to_members()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.created_by is null then
    return new;
  end if;

  insert into public.company_members(company_id, user_id, role)
  values (new.id, new.created_by, 'admin')
  on conflict do nothing;   -- 二重挿入防止

  return new;
end; $function$
;

CREATE OR REPLACE FUNCTION public.add_owner_to_company_members()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  insert into company_members (company_id, user_id, role)
  values (new.id, new.user_id, 'owner');
  return new;
end;
$function$
;

create or replace view "public"."applicants_view" as  SELECT a.id AS application_id,
    a.status,
    a.created_at AS application_date,
    a.student_id,
    a.job_id,
    a.company_id,
    sp.user_id,
    sp.last_name,
    sp.first_name,
    sp.last_name_kana,
    sp.first_name_kana,
    sp.full_name,
    sp.avatar_url AS profile_image,
    sp.university,
    sp.faculty,
    sp.department,
    sp.graduation_month,
    sp.hometown,
    sp.phone,
    sp.postal_code,
    sp.prefecture,
    sp.city,
    sp.address_line,
    sp.gender,
    sp.birth_date,
    sp.desired_positions,
    sp.work_style_options,
    sp.desired_locations,
    sp.work_style,
    sp.employment_type,
    sp.preferred_industries,
    sp.skills,
    sp.qualifications,
    sp.language_skill AS languages,
    sp.pr_text,
    sp.experience AS work_experience,
    sp.has_internship_experience
   FROM (applications a
     LEFT JOIN student_profiles sp ON ((sp.id = a.student_id)));


CREATE OR REPLACE FUNCTION public.auto_grade_answer(p_question_id uuid, p_answer_raw jsonb)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
declare
  v_q        question_bank%rowtype;
  v_text     text;
  v_hit      int := 0;
  kw         text;
begin
  select * into v_q from question_bank where id = p_question_id;

  -- 択一 ―――――――――――――――――――――――――――――――――
  if v_q.category in ('web_lang','web_math') then
    return case
      when (p_answer_raw->>'choice')::int = v_q.correct_choice then 1
      else 0
    end;
  end if;

  -- 自由記述 ――――――――――――――――――――――――――――――
  v_text := lower(coalesce(p_answer_raw->>'text',''));

  if v_q.expected_kw is null then
    return 0;
  end if;

  foreach kw in array v_q.expected_kw loop
    if v_text like '%' || lower(kw) || '%' then
      v_hit := v_hit + 1;
    end if;
  end loop;

  return (v_hit::numeric /
          greatest(array_length(v_q.expected_kw,1),1)) * 5;  -- ×5 点
end;
$function$
;

CREATE OR REPLACE FUNCTION public.avg_response_time()
 RETURNS TABLE(avg_response_sec double precision)
 LANGUAGE sql
 STABLE
AS $function$
  with replies as (
    select
      m2.created_at - m1.created_at as diff
    from messages m1
    join messages m2
      on m2.chat_room_id = m1.chat_room_id
      and m1.sender_id <> m2.sender_id
      and m2.created_at > m1.created_at
  )
  select avg(extract(epoch from diff)) as avg_response_sec
  from replies;
$function$
;

CREATE OR REPLACE FUNCTION public.avg_response_time_sec()
 RETURNS TABLE(avg_response_sec numeric)
 LANGUAGE sql
AS $function$
  select avg(extract(epoch from (answered_at - created_at))) as avg_response_sec
  from   messages
  where  answered_at is not null;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_profile_completion(p_user_id uuid)
 RETURNS numeric
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  select
    (
      (full_name        is not null)::int +
      (avatar_url       is not null)::int +
      (prefecture       is not null)::int +
      (graduation_month is not null)::int +  -- ← 修正
      (about            is not null)::int
    )::numeric / 5
  from student_profiles
  where user_id = p_user_id;
$function$
;

create or replace view "public"."companies_view" as  SELECT c.id,
    c.name,
    c.tagline,
    c.logo,
    c.cover_image_url,
    c.industry,
    c.representative,
    c.founded_year,
    c.capital_jpy,
    c.revenue_jpy,
    c.employee_count,
    c.headquarters,
    COALESCE(ph.philosophy, '[]'::json) AS philosophy,
    COALESCE(ba.business_areas, '[]'::json) AS business_areas,
    COALESCE(pos.positions, '[]'::json) AS positions,
    rec.message AS recruit_message,
    (COALESCE(rt.avg_rating, (0)::numeric))::numeric(3,2) AS rating,
    COALESCE(fv.favorite_count, (0)::bigint) AS favorite_count,
    c.video_url,
    c.cover_image
   FROM ((((((companies c
     LEFT JOIN LATERAL ( SELECT json_agg(cp.paragraph ORDER BY cp.ordinal) AS philosophy
           FROM company_philosophy cp
          WHERE (cp.company_id = c.id)) ph ON (true))
     LEFT JOIN LATERAL ( SELECT json_agg(cba.area ORDER BY cba.ordinal) AS business_areas
           FROM company_business_areas cba
          WHERE (cba.company_id = c.id)) ba ON (true))
     LEFT JOIN LATERAL ( SELECT json_agg(cp2."position" ORDER BY cp2.ordinal) AS positions
           FROM company_positions cp2
          WHERE (cp2.company_id = c.id)) pos ON (true))
     LEFT JOIN company_recruit_info rec ON ((rec.company_id = c.id)))
     LEFT JOIN LATERAL ( SELECT (avg(cr.rating))::numeric(3,2) AS avg_rating
           FROM company_reviews cr
          WHERE (cr.company_id = c.id)) rt ON (true))
     LEFT JOIN LATERAL ( SELECT count(*) AS favorite_count
           FROM company_favorites cf
          WHERE (cf.company_id = c.id)) fv ON (true));


create or replace view "public"."company_favorite_counts" as  SELECT company_favorites.company_id,
    count(*) AS favorite_count
   FROM company_favorites
  GROUP BY company_favorites.company_id;


create or replace view "public"."company_member_emails" as  SELECT u.id,
    u.email,
    cm.company_id
   FROM (auth.users u
     JOIN company_members cm ON ((cm.user_id = u.id)))
  WHERE (cm.company_id IN ( SELECT company_members.company_id
           FROM company_members
          WHERE (company_members.user_id = auth.uid())));


CREATE OR REPLACE FUNCTION public.count_unread()
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select count(*)
  from public.notifications
  where user_id = auth.uid()
    and is_read = false;
$function$
;

CREATE OR REPLACE FUNCTION public.count_unread(_uid uuid)
 RETURNS bigint
 LANGUAGE sql
AS $function$
  select count(*) from notifications
  where user_id = _uid and is_read = false;
$function$
;

CREATE OR REPLACE FUNCTION public.create_referral_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  new_code text;
begin
  new_code := substring(encode(gen_random_bytes(4), 'hex') for 8); -- 8桁16進
  insert into referral_codes(user_id, code)
    values (auth.uid(), new_code)
    on conflict (user_id)         -- ← 制約が付いたので衝突解決できる
    do update set code = excluded.code
    returning code into new_code;
  return new_code;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(uid uuid, email text, claims jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  r text;
begin
  -- user_roles からロール取得
  select role into r
  from   public.user_roles
  where  user_id = uid;

  if r is null then
    r := 'student';
  end if;

  -- 既存 claims (claims) にマージして返す
  return coalesce(claims, '{}'::jsonb)
         || jsonb_build_object(
              'role',      r,
              'is_admin',  (r = 'admin')
            );
exception
  when others then
    raise notice '[custom_access_token_hook] %', sqlerrm;
    -- 何があっても NULL を返さない
    return jsonb_build_object('hook_error', sqlerrm);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.dashboard_overview()
 RETURNS TABLE(students integer, companies integer, applications integer, scouts integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    (select count(*) from student_profiles),   -- public スキーマ
    (select count(*) from companies),
    (select count(*) from applications),
    (select count(*) from scouts);
$function$
;

CREATE OR REPLACE FUNCTION public.enqueue_email_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  -- channel='email' の行だけ送信
  if (NEW.channel = 'email') then
    perform
      supabase_functions.http_request(
        -- あなたのプロジェクト URL に置き換え
        'https://cpinzmlynykyrxdvkshl.supabase.co/functions/v1/send-email',
        'POST',
        'application/json',
        json_build_object(
          'notification_id', NEW.id,
          'user_id',         NEW.user_id
        )::text
      );
  end if;
  return NEW;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_user_id()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.user_id is null then
    new.user_id := new.id;      -- id をそのままコピー
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.f_create_student_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.student_profiles(id, auth_user_id, full_name, created_at)
  values (new.id, new.id, new.raw_user_meta_data->>'full_name', now())
  on conflict (id) do update
      set auth_user_id = excluded.auth_user_id;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.filling_company_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET row_security TO 'off'
AS $function$
begin
  -- jobs に紐づく company_id を自動で埋める
  new.company_id := (
    select company_id
    from   public.jobs
    where  id = new.job_id
    limit  1
  );
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_create_profile_from_student()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.student_profiles (user_id, full_name)
  VALUES (NEW.user_id, NEW.name)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_notify_send_email()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  perform net.http_post(
    'https://cpinzmlynykyrxdvkshl.functions.supabase.co/send-email',
    to_jsonb(NEW),
    '{}'::jsonb,                     -- params
    jsonb_build_object(              -- headers
      'Content-Type', 'application/json'
    ),
    1000
  );
  return NEW;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_offer_approved_notify()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  target_uid uuid;
  comp_name  text;
begin
  ----------------------------------------------------------------
  -- 1. Company メール宛先 (代表 Auth UID) を取得
  ----------------------------------------------------------------
  select cm.user_id, c.name into target_uid, comp_name
  from public.company_members cm
  join public.companies       c on c.id = cm.company_id
  where cm.company_id = NEW.company_id
  limit 1;

  if target_uid is null then
    -- 宛先が無い場合は何もしない
    return new;
  end if;

  ----------------------------------------------------------------
  -- 2. notifications に挿入 → 既存トリガでメール送信される
  ----------------------------------------------------------------
  insert into public.notifications(
      user_id,
      title,
      message,
      channel,
      notification_type,
      send_status)
  values (
      target_uid,
      'オファーが承認されました',
      '学生がオファーを承認しました。チャットで詳細を確認してください。',
      'email',
      'offer',
      null               -- ← send_status = NULL で既存トリガが発火
  );

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_scout_accepted_notify()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  target_uid uuid;
  comp_name  text;
begin
  select cm.user_id, c.name
    into target_uid, comp_name
  from public.company_members cm
  join public.companies       c on c.id = cm.company_id
  where cm.company_id = NEW.company_id
  limit 1;

  if target_uid is null then
    return NEW;
  end if;

  insert into public.notifications(
      user_id,
      title,
      message,
      channel,
      notification_type,
      send_status)               -- ★ ここを pending に
  values (
      target_uid,
      'スカウトが受諾されました',
      '学生がスカウトを受諾しました。チャットで詳細を確認してください。',
      'email',
      'scout_accepted',
      'pending'                  -- ★ NULL → 'pending'
  );

  return NEW;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_leaderboard(p_limit integer DEFAULT 100)
 RETURNS TABLE(student_id uuid, total_score numeric, rank integer, full_name text, avatar text)
 LANGUAGE sql
AS $function$
  select gr.student_id,
         gr.total_score,
         gr.rank,
         sp.full_name,
         sp.avatar                       -- ← avatar 列に合わせて
    from gp_rank gr
    left join student_profiles sp on sp.id = gr.student_id
   order by gr.rank
   limit p_limit
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_chat_rooms(p_user uuid)
 RETURNS TABLE(id uuid, company_id uuid, student_id uuid, updated_at timestamp with time zone, company_name text, company_logo text, last_message text, last_created timestamp with time zone, is_unread boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  with my_companies as (
    select company_id
    from public.company_members
    where user_id = p_user
  )
  , my_rooms as (
    select cr.*
    from public.chat_rooms cr
    where cr.student_id = (
            select id from public.student_profiles where user_id = p_user
          )
       or cr.company_id in (select company_id from my_companies)
  )
  , latest as (
    select distinct on (m.chat_room_id) *
    from public.messages m
    where m.chat_room_id in (select id from my_rooms)
    order by m.chat_room_id, m.created_at desc
  )
  select
    r.id,
    r.company_id,
    r.student_id,
    r.updated_at,
    c.name  as company_name,
    c.logo  as company_logo,
    l.content     as last_message,
    l.created_at  as last_created,
    (not l.is_read) and l.sender_id <> p_user as is_unread
  from my_rooms r
  join public.companies c on c.id = r.company_id
  left join latest l       on l.chat_room_id = r.id
  order by r.updated_at desc;
$function$
;

CREATE OR REPLACE FUNCTION public.get_or_create_chat_room_from_scout(p_scout_id uuid)
 RETURNS chat_rooms
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_room chat_rooms;
begin
  -- scouts から company_id, student_id を取得
  select s.company_id, s.student_id
    into v_room
    from scouts s
   where s.id = p_scout_id;

  -- 既にあるか確認
  select * into v_room
    from chat_rooms
   where company_id = v_room.company_id
     and student_id = v_room.student_id
   limit 1;

  if v_room.id is null then
    insert into chat_rooms(company_id, student_id)
      values (v_room.company_id, v_room.student_id)
      returning * into v_room;
  end if;

  return v_room;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_role(p_uid uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select role
  from user_roles
  where user_id = p_uid
  limit 1
$function$
;

create materialized view "public"."gp_rank" as  WITH monthly_totals AS (
         SELECT s.student_id,
            c.type AS category,
            date_trunc('month'::text, s.created_at) AS month,
            sum(COALESCE(s.final_score, s.auto_score, 0)) AS total_score
           FROM (challenge_submissions s
             JOIN challenges c ON ((c.id = s.challenge_id)))
          WHERE (s.status = '採点済み'::text)
          GROUP BY s.student_id, c.type, (date_trunc('month'::text, s.created_at))
        )
 SELECT rank() OVER (PARTITION BY monthly_totals.month, monthly_totals.category ORDER BY monthly_totals.total_score DESC) AS rank,
    monthly_totals.student_id,
    monthly_totals.category,
    monthly_totals.month,
    monthly_totals.total_score
   FROM monthly_totals;


CREATE OR REPLACE FUNCTION public.grade_session(p_session_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
declare
  v_total numeric;
begin
  -- 問別採点
  update session_answers sa
  set score = auto_grade_answer(sa.question_id, sa.answer_raw),
      is_correct = (score = 1)
  where sa.session_id = p_session_id;

  -- session 集計
  select sum(score) into v_total
    from session_answers
   where session_id = p_session_id;

  update challenge_sessions
  set ended_at    = now(),
      elapsed_sec = extract(epoch from now()-started_at)::int,
      score       = v_total,
      status      = 'graded'
  where id = p_session_id;

  return v_total;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.grade_webtest(p_submission_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  total   int := 0;
  correct int := 0;
  q       record;
  ans     jsonb;
begin
  select answers into ans
    from challenge_submissions
    where id = p_submission_id;

  for q in
    select id, correct_choice
    from   webtest_questions
    where  challenge_id = (
      select challenge_id from challenge_submissions where id = p_submission_id
    )
  loop
    total := total + 1;
    if (ans ->> q.id::text)::int = q.correct_choice then
      correct := correct + 1;
    end if;
  end loop;

  update challenge_submissions
  set    auto_score  = (correct * 100.0 / total)::int,
         final_score = (correct * 100.0 / total)::int,
         score_source = 'auto',
         status = '採点済'
  where  id = p_submission_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- ここで user_roles / companies へ自由に書き込み
  insert into public.user_roles (user_id, role)
       values (new.id, 'company')
  on conflict (user_id) do update set role = excluded.role;

  insert into public.companies (user_id, name, status)
       values (new.id,
               new.raw_user_meta_data->>'full_name',
               '承認待ち')
  on conflict (user_id) do nothing;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_job_view(_job_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  update jobs set views = views + 1 where id = _job_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$ select auth.jwt() ->> 'role' = 'admin' $function$
;

CREATE OR REPLACE FUNCTION public.is_application_owner(p_student_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM student_profiles
     WHERE id      = p_student_id
       AND user_id = auth.uid()
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_chat_participant(room_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select exists (
    select 1 from chat_rooms
    where id = room_id
      and (
        student_id = auth.uid() or
        is_company_member(company_id) or
        is_admin()
      )
  )
$function$
;

CREATE OR REPLACE FUNCTION public.is_company()
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$ select auth.jwt() ->> 'role' = 'company' $function$
;

CREATE OR REPLACE FUNCTION public.is_company_member(c_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET row_security TO 'off'
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM public.company_members
     WHERE user_id   = auth.uid()
       AND company_id = c_id
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_company_owner(c_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
      from public.company_members
     where company_id = c_uuid
       and user_id    = auth.uid()
       and role       = 'owner'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_student()
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$ select auth.jwt() ->> 'role' = 'student' $function$
;

create or replace view "public"."job_app_count" as  SELECT j.title AS job_title,
    count(a.id) AS cnt
   FROM (jobs j
     LEFT JOIN applications a ON ((a.job_id = j.id)))
  GROUP BY j.id;


CREATE OR REPLACE FUNCTION public.jwt_custom_claims_hook(event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
  base jsonb := event->'claims';                           -- デフォルト (iss / sub / exp …)
  meta jsonb := coalesce(event->'user_metadata', '{}'::jsonb);
begin
  -- user_metadata.role があれば上書き
  if meta ? 'role' then
    base := jsonb_set(base, '{role}', meta->'role', true);
  end if;

  -- 必要なら追加クレームをここでセット
  -- 例: company_id など
  -- if meta ? 'company_id' then
  --   base := jsonb_set(base, '{company_id}', meta->'company_id', true);
  -- end if;

  return jsonb_build_object('claims', base);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.jwt_custom_claims_hook(uid uuid, email text, claims jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
  out_claims jsonb;
begin
  -- ここで user_roles や companies を JOIN してカスタム claims を構築
  select jsonb_build_object(
    'role'  , coalesce(r.role, 'student'),
    'company_id', c.id,
    'password_updated_at', u.password_updated_at
  )
  into out_claims
  from auth.users u
  left join public.user_roles r on r.user_id = uid
  left join public.companies  c on c.user_id = uid;

  -- ↑ ↑ ↑ ここのロジックがバグっていると全部おかしくなる ↑ ↑ ↑

  return out_claims;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.log_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  _actor uuid := auth.uid();
  _role  text := public.get_user_role(_actor);
  _target text;
begin
  -- 削除時だけ OLD.id、それ以外は NEW.id
  _target := TG_TABLE_NAME || ':' ||
             (case when TG_OP = 'DELETE' then OLD.id else NEW.id end);

  insert into public.activity_logs(actor, role, action, target)
  values (_actor, coalesce(_role, 'unknown'), TG_OP, _target);

  -- 通常は row をそのまま返す
  if TG_OP = 'DELETE' then
    return OLD;
  else
    return NEW;
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.log_role_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  insert into public.role_change_log (user_id, old_role, new_role)
  values (old.user_id, old.role, new.role);
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.match_job_embeddings(query_embedding vector, match_count integer, similarity_threshold double precision)
 RETURNS TABLE(job_id uuid, content text, score double precision)
 LANGUAGE sql
 STABLE
AS $function$
  select
    je.job_id,
    je.content,
    1 - (je.embedding <=> query_embedding) as score      -- cosine 距離の場合
    -- 1 - (je.embedding <-> query_embedding) as score   -- L2 距離の場合
  from job_embeddings je
  where
    (1 - (je.embedding <=> query_embedding)) >= similarity_threshold
  order by
    je.embedding <=> query_embedding            -- 距離が近い順
  limit match_count;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_on_chat_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  target_auth_uid uuid;
begin
  -- 1) chat_rooms.student_id から auth UID を引く
  select sp.auth_user_id
    into target_auth_uid
    from student_profiles sp
   where sp.id = (
     select student_id from chat_rooms where id = NEW.chat_room_id
   )
   limit 1;

  -- auth UID が取れなければ通知をスキップ
  if target_auth_uid is null then
    return NEW;
  end if;

  -- 2) notifications へ INSERT (related_id は NEW.id のまま)
  insert into notifications (
    user_id,
    title,
    message,
    notification_type,
    related_id,
    channel,
    send_status
  ) values (
    target_auth_uid,
    '新着チャットがあります',
    NEW.content,
    'chat',
    NEW.id,
    'in_app',
    'pending'
  );

  return NEW;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_on_scout_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid;
begin
  -- student_profiles から Auth UID を取得
  select auth_user_id into uid
  from   public.student_profiles
  where  id = new.student_id;

  if uid is null then
    -- UID が無い学生は通知だけスキップ（scout は残す）
    raise notice 'auth UID not found for student %', new.student_id;
    return new;
  end if;

  insert into public.notifications (
    id,          user_id,     title,  message,
    notification_type,        related_id,
    is_read,     channel,     send_status
  ) values (
    gen_random_uuid(),
    uid,
    '新しいスカウトが届きました',
    '企業からスカウトが届いています。詳細を確認してください。',
    'scout',
    new.id,
    false,
    'in_app',   -- email / in_app / both のいずれか
    'sent'
  );

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prepare_session_answers(p_session_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/*
  1. p_session_uuid で指定された challenge_sessions を取得
  2. その challenge に紐づく question_id をすべて拾う
  3. session_answers に (session_id, question_id) を一括 INSERT
*/
begin
  insert into public.session_answers (session_id, question_id)
  select
    p_session_uuid,
    cq.question_id
  from public.challenge_sessions cs
  join public.challenge_questions cq on cq.challenge_id = cs.challenge_id
  where cs.id = p_session_uuid
  on conflict do nothing;   -- 既に入っていれば無視
end;
$function$
;

CREATE OR REPLACE FUNCTION public.queue_email_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- net.http_post を呼び出す（戻り値はジョブ ID）
  perform net.http_post(
    'https://cpinzmlynykyrxdvkshl.supabase.co/functions/v1/send-email'::text,
    jsonb_build_object('Content-Type','application/json'),
    jsonb_build_object(
      'user_id',           new.user_id,
      'notification_type', new.notification_type,
      'related_id',        new.related_id,
      'channel',           new.channel
    )
  );
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.scout_to_application()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  app_exists boolean;
begin
  -- 承諾以外は無視
  if (new.status <> '承諾') then
    return new;
  end if;

  -- すでに applications 行があるか?
  select exists (
    select 1
    from applications
    where student_id = new.student_id
      and job_id     = new.job_id
  ) into app_exists;

  if not app_exists then
    insert into applications (
      id,
      student_id,
      job_id,
      status,
      applied_at,
      company_id
    )
    values (
      gen_random_uuid(),
      new.student_id,
      new.job_id,
      'スカウト承諾',
      new.accepted_at,
      (select company_id from jobs where id = new.job_id)
    );
  end if;

  return new;
end;
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


CREATE OR REPLACE FUNCTION public.set_answered_at_on_company_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  is_company boolean;
begin
  /* 会社ユーザか判定 : company_members に存在するか  */
  select exists (
    select 1
    from public.company_members
    where user_id = new.sender_id
  )
  into is_company;

  if is_company then
    /* まだ answered_at が NULL の学生メッセージにタイムスタンプを付与 */
    update public.messages
    set    answered_at = new.created_at
    where  chat_room_id = new.chat_room_id
      and  answered_at  is null
      and  sender_id not in (
            select user_id
            from public.company_members
          );
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.start_webtest_session(p_challenge_id uuid, p_student_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
declare
  v_session_id uuid := gen_random_uuid();
begin
  -- ① セッション行
  insert into challenge_sessions(id, challenge_id, student_id)
    values (v_session_id, p_challenge_id, p_student_id);

  -- ② 言語20
  insert into session_answers(session_id, question_id)
  select v_session_id, q.id
    from question_bank q
   where q.category = 'web_lang'
   order by random()
   limit 20;

  -- ③ 非言語20
  insert into session_answers(session_id, question_id)
  select v_session_id, q.id
    from question_bank q
   where q.category = 'web_math'
   order by random()
   limit 20;

  return v_session_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.start_webtest_session_balanced(p_challenge_id uuid, p_student_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
declare
  v_session_id uuid := gen_random_uuid();
begin
  insert into challenge_sessions(id, challenge_id, student_id)
  values (v_session_id, p_challenge_id, p_student_id);

  /* 言語：easy≦2 ×10問 ＋ 3≦hard ×10問 */
  insert into session_answers(session_id, question_id)
  select v_session_id, id
    from (
      (select id from question_bank
        where category='web_lang' and difficulty<=2
        order by random() limit 10)
      union all
      (select id from question_bank
        where category='web_lang' and difficulty>=3
        order by random() limit 10)
    ) s;

  /* 非言語：同様に 10＋10 */
  insert into session_answers(session_id, question_id)
  select v_session_id, id
    from (
      (select id from question_bank
        where category='web_math' and difficulty<=2
        order by random() limit 10)
      union all
      (select id from question_bank
        where category='web_math' and difficulty>=3
        order by random() limit 10)
    ) s;

  return v_session_id;
end;
$function$
;

create or replace view "public"."student_applications_view" as  SELECT a.id,
    a.student_id,
    a.job_id,
    a.status,
    a.created_at AS applied_date,
    a.company_id,
    false AS has_unread_messages,
    0 AS unread_count,
    j.title,
    c.name AS company_name,
    c.location,
    NULL::text AS company_logo,
    NULL::text AS work_style
   FROM ((applications a
     JOIN jobs j ON ((j.id = a.job_id)))
     JOIN companies c ON ((c.id = a.company_id)));


create or replace view "public"."student_with_email" as  SELECT sp.id AS student_id,
    COALESCE(sp.full_name, concat_ws(' '::text, sp.last_name, sp.first_name)) AS full_name,
    sp.university,
    sp.graduation_month,
    u.email
   FROM (student_profiles sp
     JOIN auth.users u ON ((u.id = COALESCE(sp.user_id, sp.auth_user_id))))
  WHERE (u.email IS NOT NULL);


CREATE OR REPLACE FUNCTION public.sync_last_sign_in()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.student_profiles
  SET    last_sign_in_at = NEW.last_sign_in_at
  WHERE  user_id = NEW.id;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_user_id()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.user_id is null then
    new.user_id := new.id;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_user_roles()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'student')          -- ★必要なら動的に決めてもOK
  on conflict do nothing;             -- ★UPDATE しない
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_send_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.channel in ('email','both') then
    -- ★ URL を正式パスに変更
    perform net.http_post(
      'https://cpinzmlynykyrxdvkshl.functions.supabase.co/functions/v1/send-email',
      jsonb_build_object(
        'id',      new.id,
        'user_id', new.user_id,
        'title',   new.title,
        'message', new.message
      ),
      null,
      '{"Content-Type":"application/json"}'::jsonb,
      10000        -- timeout 10 秒
    );
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_modified_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- updated_at カラムがある時だけセット
  if exists (
    select 1
    from information_schema.columns
    where table_schema = tg_table_schema
      and table_name   = tg_table_name
      and column_name  = 'updated_at'
  ) then
    new.updated_at = now();
  end if;
  return new;
end; $function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

create or replace view "public"."user_companies" as  SELECT DISTINCT company_members.user_id,
    company_members.company_id
   FROM company_members;


create or replace view "public"."v_messages_with_sender" as  SELECT m.id,
    m.chat_room_id,
    m.sender_id,
    m.content,
    m.is_read,
    m.attachment_url,
    m.created_at,
    m.answered_at,
    p.full_name AS sender_full_name,
    p.avatar_url AS sender_avatar_url
   FROM (messages m
     LEFT JOIN student_profiles p ON ((p.id = m.sender_id)));


create or replace view "public"."student_resume_jobtypes" as  SELECT r.user_id AS student_id,
    array_agg(DISTINCT jt.value) AS job_types
   FROM ((resumes r
     CROSS JOIN LATERAL jsonb_array_elements(r.work_experiences) w(value))
     CROSS JOIN LATERAL jsonb_array_elements_text((w.value -> 'jobTypes'::text)) jt(value))
  GROUP BY r.user_id;


CREATE INDEX gp_rank_month_category_idx ON public.gp_rank USING btree (month, category);

grant delete on table "public"."activity_logs" to "admin";

grant insert on table "public"."activity_logs" to "admin";

grant select on table "public"."activity_logs" to "admin";

grant update on table "public"."activity_logs" to "admin";

grant delete on table "public"."activity_logs" to "anon";

grant insert on table "public"."activity_logs" to "anon";

grant references on table "public"."activity_logs" to "anon";

grant select on table "public"."activity_logs" to "anon";

grant trigger on table "public"."activity_logs" to "anon";

grant truncate on table "public"."activity_logs" to "anon";

grant update on table "public"."activity_logs" to "anon";

grant delete on table "public"."activity_logs" to "authenticated";

grant insert on table "public"."activity_logs" to "authenticated";

grant references on table "public"."activity_logs" to "authenticated";

grant select on table "public"."activity_logs" to "authenticated";

grant trigger on table "public"."activity_logs" to "authenticated";

grant truncate on table "public"."activity_logs" to "authenticated";

grant update on table "public"."activity_logs" to "authenticated";

grant delete on table "public"."activity_logs" to "service_role";

grant insert on table "public"."activity_logs" to "service_role";

grant references on table "public"."activity_logs" to "service_role";

grant select on table "public"."activity_logs" to "service_role";

grant trigger on table "public"."activity_logs" to "service_role";

grant truncate on table "public"."activity_logs" to "service_role";

grant update on table "public"."activity_logs" to "service_role";

grant delete on table "public"."applications" to "admin";

grant insert on table "public"."applications" to "admin";

grant select on table "public"."applications" to "admin";

grant update on table "public"."applications" to "admin";

grant delete on table "public"."applications" to "anon";

grant insert on table "public"."applications" to "anon";

grant references on table "public"."applications" to "anon";

grant select on table "public"."applications" to "anon";

grant trigger on table "public"."applications" to "anon";

grant truncate on table "public"."applications" to "anon";

grant update on table "public"."applications" to "anon";

grant delete on table "public"."applications" to "authenticated";

grant insert on table "public"."applications" to "authenticated";

grant references on table "public"."applications" to "authenticated";

grant select on table "public"."applications" to "authenticated";

grant trigger on table "public"."applications" to "authenticated";

grant truncate on table "public"."applications" to "authenticated";

grant update on table "public"."applications" to "authenticated";

grant delete on table "public"."applications" to "service_role";

grant insert on table "public"."applications" to "service_role";

grant references on table "public"."applications" to "service_role";

grant select on table "public"."applications" to "service_role";

grant trigger on table "public"."applications" to "service_role";

grant truncate on table "public"."applications" to "service_role";

grant update on table "public"."applications" to "service_role";

grant delete on table "public"."article_bookmarks" to "anon";

grant insert on table "public"."article_bookmarks" to "anon";

grant references on table "public"."article_bookmarks" to "anon";

grant select on table "public"."article_bookmarks" to "anon";

grant trigger on table "public"."article_bookmarks" to "anon";

grant truncate on table "public"."article_bookmarks" to "anon";

grant update on table "public"."article_bookmarks" to "anon";

grant delete on table "public"."article_bookmarks" to "authenticated";

grant insert on table "public"."article_bookmarks" to "authenticated";

grant references on table "public"."article_bookmarks" to "authenticated";

grant select on table "public"."article_bookmarks" to "authenticated";

grant trigger on table "public"."article_bookmarks" to "authenticated";

grant truncate on table "public"."article_bookmarks" to "authenticated";

grant update on table "public"."article_bookmarks" to "authenticated";

grant delete on table "public"."article_bookmarks" to "service_role";

grant insert on table "public"."article_bookmarks" to "service_role";

grant references on table "public"."article_bookmarks" to "service_role";

grant select on table "public"."article_bookmarks" to "service_role";

grant trigger on table "public"."article_bookmarks" to "service_role";

grant truncate on table "public"."article_bookmarks" to "service_role";

grant update on table "public"."article_bookmarks" to "service_role";

grant delete on table "public"."article_comments" to "anon";

grant insert on table "public"."article_comments" to "anon";

grant references on table "public"."article_comments" to "anon";

grant select on table "public"."article_comments" to "anon";

grant trigger on table "public"."article_comments" to "anon";

grant truncate on table "public"."article_comments" to "anon";

grant update on table "public"."article_comments" to "anon";

grant delete on table "public"."article_comments" to "authenticated";

grant insert on table "public"."article_comments" to "authenticated";

grant references on table "public"."article_comments" to "authenticated";

grant select on table "public"."article_comments" to "authenticated";

grant trigger on table "public"."article_comments" to "authenticated";

grant truncate on table "public"."article_comments" to "authenticated";

grant update on table "public"."article_comments" to "authenticated";

grant delete on table "public"."article_comments" to "service_role";

grant insert on table "public"."article_comments" to "service_role";

grant references on table "public"."article_comments" to "service_role";

grant select on table "public"."article_comments" to "service_role";

grant trigger on table "public"."article_comments" to "service_role";

grant truncate on table "public"."article_comments" to "service_role";

grant update on table "public"."article_comments" to "service_role";

grant delete on table "public"."bizscore_questions" to "anon";

grant insert on table "public"."bizscore_questions" to "anon";

grant references on table "public"."bizscore_questions" to "anon";

grant select on table "public"."bizscore_questions" to "anon";

grant trigger on table "public"."bizscore_questions" to "anon";

grant truncate on table "public"."bizscore_questions" to "anon";

grant update on table "public"."bizscore_questions" to "anon";

grant delete on table "public"."bizscore_questions" to "authenticated";

grant insert on table "public"."bizscore_questions" to "authenticated";

grant references on table "public"."bizscore_questions" to "authenticated";

grant select on table "public"."bizscore_questions" to "authenticated";

grant trigger on table "public"."bizscore_questions" to "authenticated";

grant truncate on table "public"."bizscore_questions" to "authenticated";

grant update on table "public"."bizscore_questions" to "authenticated";

grant delete on table "public"."bizscore_questions" to "service_role";

grant insert on table "public"."bizscore_questions" to "service_role";

grant references on table "public"."bizscore_questions" to "service_role";

grant select on table "public"."bizscore_questions" to "service_role";

grant trigger on table "public"."bizscore_questions" to "service_role";

grant truncate on table "public"."bizscore_questions" to "service_role";

grant update on table "public"."bizscore_questions" to "service_role";

grant delete on table "public"."challenge_questions" to "admin";

grant insert on table "public"."challenge_questions" to "admin";

grant select on table "public"."challenge_questions" to "admin";

grant update on table "public"."challenge_questions" to "admin";

grant delete on table "public"."challenge_questions" to "anon";

grant insert on table "public"."challenge_questions" to "anon";

grant references on table "public"."challenge_questions" to "anon";

grant select on table "public"."challenge_questions" to "anon";

grant trigger on table "public"."challenge_questions" to "anon";

grant truncate on table "public"."challenge_questions" to "anon";

grant update on table "public"."challenge_questions" to "anon";

grant delete on table "public"."challenge_questions" to "authenticated";

grant insert on table "public"."challenge_questions" to "authenticated";

grant references on table "public"."challenge_questions" to "authenticated";

grant select on table "public"."challenge_questions" to "authenticated";

grant trigger on table "public"."challenge_questions" to "authenticated";

grant truncate on table "public"."challenge_questions" to "authenticated";

grant update on table "public"."challenge_questions" to "authenticated";

grant delete on table "public"."challenge_questions" to "service_role";

grant insert on table "public"."challenge_questions" to "service_role";

grant references on table "public"."challenge_questions" to "service_role";

grant select on table "public"."challenge_questions" to "service_role";

grant trigger on table "public"."challenge_questions" to "service_role";

grant truncate on table "public"."challenge_questions" to "service_role";

grant update on table "public"."challenge_questions" to "service_role";

grant delete on table "public"."challenge_sessions" to "admin";

grant insert on table "public"."challenge_sessions" to "admin";

grant select on table "public"."challenge_sessions" to "admin";

grant update on table "public"."challenge_sessions" to "admin";

grant delete on table "public"."challenge_sessions" to "anon";

grant insert on table "public"."challenge_sessions" to "anon";

grant references on table "public"."challenge_sessions" to "anon";

grant select on table "public"."challenge_sessions" to "anon";

grant trigger on table "public"."challenge_sessions" to "anon";

grant truncate on table "public"."challenge_sessions" to "anon";

grant update on table "public"."challenge_sessions" to "anon";

grant delete on table "public"."challenge_sessions" to "authenticated";

grant insert on table "public"."challenge_sessions" to "authenticated";

grant references on table "public"."challenge_sessions" to "authenticated";

grant select on table "public"."challenge_sessions" to "authenticated";

grant trigger on table "public"."challenge_sessions" to "authenticated";

grant truncate on table "public"."challenge_sessions" to "authenticated";

grant update on table "public"."challenge_sessions" to "authenticated";

grant delete on table "public"."challenge_sessions" to "service_role";

grant insert on table "public"."challenge_sessions" to "service_role";

grant references on table "public"."challenge_sessions" to "service_role";

grant select on table "public"."challenge_sessions" to "service_role";

grant trigger on table "public"."challenge_sessions" to "service_role";

grant truncate on table "public"."challenge_sessions" to "service_role";

grant update on table "public"."challenge_sessions" to "service_role";

grant delete on table "public"."challenge_submissions" to "admin";

grant insert on table "public"."challenge_submissions" to "admin";

grant select on table "public"."challenge_submissions" to "admin";

grant update on table "public"."challenge_submissions" to "admin";

grant delete on table "public"."challenge_submissions" to "anon";

grant insert on table "public"."challenge_submissions" to "anon";

grant references on table "public"."challenge_submissions" to "anon";

grant select on table "public"."challenge_submissions" to "anon";

grant trigger on table "public"."challenge_submissions" to "anon";

grant truncate on table "public"."challenge_submissions" to "anon";

grant update on table "public"."challenge_submissions" to "anon";

grant delete on table "public"."challenge_submissions" to "authenticated";

grant insert on table "public"."challenge_submissions" to "authenticated";

grant references on table "public"."challenge_submissions" to "authenticated";

grant select on table "public"."challenge_submissions" to "authenticated";

grant trigger on table "public"."challenge_submissions" to "authenticated";

grant truncate on table "public"."challenge_submissions" to "authenticated";

grant update on table "public"."challenge_submissions" to "authenticated";

grant delete on table "public"."challenge_submissions" to "service_role";

grant insert on table "public"."challenge_submissions" to "service_role";

grant references on table "public"."challenge_submissions" to "service_role";

grant select on table "public"."challenge_submissions" to "service_role";

grant trigger on table "public"."challenge_submissions" to "service_role";

grant truncate on table "public"."challenge_submissions" to "service_role";

grant update on table "public"."challenge_submissions" to "service_role";

grant delete on table "public"."challenges" to "admin";

grant insert on table "public"."challenges" to "admin";

grant select on table "public"."challenges" to "admin";

grant update on table "public"."challenges" to "admin";

grant delete on table "public"."challenges" to "anon";

grant insert on table "public"."challenges" to "anon";

grant references on table "public"."challenges" to "anon";

grant select on table "public"."challenges" to "anon";

grant trigger on table "public"."challenges" to "anon";

grant truncate on table "public"."challenges" to "anon";

grant update on table "public"."challenges" to "anon";

grant delete on table "public"."challenges" to "authenticated";

grant insert on table "public"."challenges" to "authenticated";

grant references on table "public"."challenges" to "authenticated";

grant select on table "public"."challenges" to "authenticated";

grant trigger on table "public"."challenges" to "authenticated";

grant truncate on table "public"."challenges" to "authenticated";

grant update on table "public"."challenges" to "authenticated";

grant delete on table "public"."challenges" to "service_role";

grant insert on table "public"."challenges" to "service_role";

grant references on table "public"."challenges" to "service_role";

grant select on table "public"."challenges" to "service_role";

grant trigger on table "public"."challenges" to "service_role";

grant truncate on table "public"."challenges" to "service_role";

grant update on table "public"."challenges" to "service_role";

grant delete on table "public"."chat_rooms" to "admin";

grant insert on table "public"."chat_rooms" to "admin";

grant select on table "public"."chat_rooms" to "admin";

grant update on table "public"."chat_rooms" to "admin";

grant delete on table "public"."chat_rooms" to "anon";

grant insert on table "public"."chat_rooms" to "anon";

grant references on table "public"."chat_rooms" to "anon";

grant select on table "public"."chat_rooms" to "anon";

grant trigger on table "public"."chat_rooms" to "anon";

grant truncate on table "public"."chat_rooms" to "anon";

grant update on table "public"."chat_rooms" to "anon";

grant delete on table "public"."chat_rooms" to "authenticated";

grant insert on table "public"."chat_rooms" to "authenticated";

grant references on table "public"."chat_rooms" to "authenticated";

grant select on table "public"."chat_rooms" to "authenticated";

grant trigger on table "public"."chat_rooms" to "authenticated";

grant truncate on table "public"."chat_rooms" to "authenticated";

grant update on table "public"."chat_rooms" to "authenticated";

grant delete on table "public"."chat_rooms" to "service_role";

grant insert on table "public"."chat_rooms" to "service_role";

grant references on table "public"."chat_rooms" to "service_role";

grant select on table "public"."chat_rooms" to "service_role";

grant trigger on table "public"."chat_rooms" to "service_role";

grant truncate on table "public"."chat_rooms" to "service_role";

grant update on table "public"."chat_rooms" to "service_role";

grant delete on table "public"."companies" to "admin";

grant insert on table "public"."companies" to "admin";

grant select on table "public"."companies" to "admin";

grant update on table "public"."companies" to "admin";

grant delete on table "public"."companies" to "anon";

grant insert on table "public"."companies" to "anon";

grant references on table "public"."companies" to "anon";

grant select on table "public"."companies" to "anon";

grant trigger on table "public"."companies" to "anon";

grant truncate on table "public"."companies" to "anon";

grant update on table "public"."companies" to "anon";

grant delete on table "public"."companies" to "authenticated";

grant insert on table "public"."companies" to "authenticated";

grant references on table "public"."companies" to "authenticated";

grant select on table "public"."companies" to "authenticated";

grant trigger on table "public"."companies" to "authenticated";

grant truncate on table "public"."companies" to "authenticated";

grant update on table "public"."companies" to "authenticated";

grant delete on table "public"."companies" to "service_role";

grant insert on table "public"."companies" to "service_role";

grant references on table "public"."companies" to "service_role";

grant select on table "public"."companies" to "service_role";

grant trigger on table "public"."companies" to "service_role";

grant truncate on table "public"."companies" to "service_role";

grant update on table "public"."companies" to "service_role";

grant delete on table "public"."company_business_areas" to "anon";

grant insert on table "public"."company_business_areas" to "anon";

grant references on table "public"."company_business_areas" to "anon";

grant select on table "public"."company_business_areas" to "anon";

grant trigger on table "public"."company_business_areas" to "anon";

grant truncate on table "public"."company_business_areas" to "anon";

grant update on table "public"."company_business_areas" to "anon";

grant delete on table "public"."company_business_areas" to "authenticated";

grant insert on table "public"."company_business_areas" to "authenticated";

grant references on table "public"."company_business_areas" to "authenticated";

grant select on table "public"."company_business_areas" to "authenticated";

grant trigger on table "public"."company_business_areas" to "authenticated";

grant truncate on table "public"."company_business_areas" to "authenticated";

grant update on table "public"."company_business_areas" to "authenticated";

grant delete on table "public"."company_business_areas" to "service_role";

grant insert on table "public"."company_business_areas" to "service_role";

grant references on table "public"."company_business_areas" to "service_role";

grant select on table "public"."company_business_areas" to "service_role";

grant trigger on table "public"."company_business_areas" to "service_role";

grant truncate on table "public"."company_business_areas" to "service_role";

grant update on table "public"."company_business_areas" to "service_role";

grant delete on table "public"."company_events" to "anon";

grant insert on table "public"."company_events" to "anon";

grant references on table "public"."company_events" to "anon";

grant select on table "public"."company_events" to "anon";

grant trigger on table "public"."company_events" to "anon";

grant truncate on table "public"."company_events" to "anon";

grant update on table "public"."company_events" to "anon";

grant delete on table "public"."company_events" to "authenticated";

grant insert on table "public"."company_events" to "authenticated";

grant references on table "public"."company_events" to "authenticated";

grant select on table "public"."company_events" to "authenticated";

grant trigger on table "public"."company_events" to "authenticated";

grant truncate on table "public"."company_events" to "authenticated";

grant update on table "public"."company_events" to "authenticated";

grant delete on table "public"."company_events" to "service_role";

grant insert on table "public"."company_events" to "service_role";

grant references on table "public"."company_events" to "service_role";

grant select on table "public"."company_events" to "service_role";

grant trigger on table "public"."company_events" to "service_role";

grant truncate on table "public"."company_events" to "service_role";

grant update on table "public"."company_events" to "service_role";

grant delete on table "public"."company_favorites" to "anon";

grant insert on table "public"."company_favorites" to "anon";

grant references on table "public"."company_favorites" to "anon";

grant select on table "public"."company_favorites" to "anon";

grant trigger on table "public"."company_favorites" to "anon";

grant truncate on table "public"."company_favorites" to "anon";

grant update on table "public"."company_favorites" to "anon";

grant delete on table "public"."company_favorites" to "authenticated";

grant insert on table "public"."company_favorites" to "authenticated";

grant references on table "public"."company_favorites" to "authenticated";

grant select on table "public"."company_favorites" to "authenticated";

grant trigger on table "public"."company_favorites" to "authenticated";

grant truncate on table "public"."company_favorites" to "authenticated";

grant update on table "public"."company_favorites" to "authenticated";

grant delete on table "public"."company_favorites" to "service_role";

grant insert on table "public"."company_favorites" to "service_role";

grant references on table "public"."company_favorites" to "service_role";

grant select on table "public"."company_favorites" to "service_role";

grant trigger on table "public"."company_favorites" to "service_role";

grant truncate on table "public"."company_favorites" to "service_role";

grant update on table "public"."company_favorites" to "service_role";

grant delete on table "public"."company_highlights" to "anon";

grant insert on table "public"."company_highlights" to "anon";

grant references on table "public"."company_highlights" to "anon";

grant select on table "public"."company_highlights" to "anon";

grant trigger on table "public"."company_highlights" to "anon";

grant truncate on table "public"."company_highlights" to "anon";

grant update on table "public"."company_highlights" to "anon";

grant delete on table "public"."company_highlights" to "authenticated";

grant insert on table "public"."company_highlights" to "authenticated";

grant references on table "public"."company_highlights" to "authenticated";

grant select on table "public"."company_highlights" to "authenticated";

grant trigger on table "public"."company_highlights" to "authenticated";

grant truncate on table "public"."company_highlights" to "authenticated";

grant update on table "public"."company_highlights" to "authenticated";

grant delete on table "public"."company_highlights" to "service_role";

grant insert on table "public"."company_highlights" to "service_role";

grant references on table "public"."company_highlights" to "service_role";

grant select on table "public"."company_highlights" to "service_role";

grant trigger on table "public"."company_highlights" to "service_role";

grant truncate on table "public"."company_highlights" to "service_role";

grant update on table "public"."company_highlights" to "service_role";

grant delete on table "public"."company_interviews" to "anon";

grant insert on table "public"."company_interviews" to "anon";

grant references on table "public"."company_interviews" to "anon";

grant select on table "public"."company_interviews" to "anon";

grant trigger on table "public"."company_interviews" to "anon";

grant truncate on table "public"."company_interviews" to "anon";

grant update on table "public"."company_interviews" to "anon";

grant delete on table "public"."company_interviews" to "authenticated";

grant insert on table "public"."company_interviews" to "authenticated";

grant references on table "public"."company_interviews" to "authenticated";

grant select on table "public"."company_interviews" to "authenticated";

grant trigger on table "public"."company_interviews" to "authenticated";

grant truncate on table "public"."company_interviews" to "authenticated";

grant update on table "public"."company_interviews" to "authenticated";

grant delete on table "public"."company_interviews" to "service_role";

grant insert on table "public"."company_interviews" to "service_role";

grant references on table "public"."company_interviews" to "service_role";

grant select on table "public"."company_interviews" to "service_role";

grant trigger on table "public"."company_interviews" to "service_role";

grant truncate on table "public"."company_interviews" to "service_role";

grant update on table "public"."company_interviews" to "service_role";

grant delete on table "public"."company_members" to "admin";

grant insert on table "public"."company_members" to "admin";

grant select on table "public"."company_members" to "admin";

grant update on table "public"."company_members" to "admin";

grant delete on table "public"."company_members" to "anon";

grant insert on table "public"."company_members" to "anon";

grant references on table "public"."company_members" to "anon";

grant select on table "public"."company_members" to "anon";

grant trigger on table "public"."company_members" to "anon";

grant truncate on table "public"."company_members" to "anon";

grant update on table "public"."company_members" to "anon";

grant delete on table "public"."company_members" to "authenticated";

grant insert on table "public"."company_members" to "authenticated";

grant references on table "public"."company_members" to "authenticated";

grant select on table "public"."company_members" to "authenticated";

grant trigger on table "public"."company_members" to "authenticated";

grant truncate on table "public"."company_members" to "authenticated";

grant update on table "public"."company_members" to "authenticated";

grant delete on table "public"."company_members" to "service_role";

grant insert on table "public"."company_members" to "service_role";

grant references on table "public"."company_members" to "service_role";

grant select on table "public"."company_members" to "service_role";

grant trigger on table "public"."company_members" to "service_role";

grant truncate on table "public"."company_members" to "service_role";

grant update on table "public"."company_members" to "service_role";

grant delete on table "public"."company_philosophy" to "anon";

grant insert on table "public"."company_philosophy" to "anon";

grant references on table "public"."company_philosophy" to "anon";

grant select on table "public"."company_philosophy" to "anon";

grant trigger on table "public"."company_philosophy" to "anon";

grant truncate on table "public"."company_philosophy" to "anon";

grant update on table "public"."company_philosophy" to "anon";

grant delete on table "public"."company_philosophy" to "authenticated";

grant insert on table "public"."company_philosophy" to "authenticated";

grant references on table "public"."company_philosophy" to "authenticated";

grant select on table "public"."company_philosophy" to "authenticated";

grant trigger on table "public"."company_philosophy" to "authenticated";

grant truncate on table "public"."company_philosophy" to "authenticated";

grant update on table "public"."company_philosophy" to "authenticated";

grant delete on table "public"."company_philosophy" to "service_role";

grant insert on table "public"."company_philosophy" to "service_role";

grant references on table "public"."company_philosophy" to "service_role";

grant select on table "public"."company_philosophy" to "service_role";

grant trigger on table "public"."company_philosophy" to "service_role";

grant truncate on table "public"."company_philosophy" to "service_role";

grant update on table "public"."company_philosophy" to "service_role";

grant delete on table "public"."company_positions" to "anon";

grant insert on table "public"."company_positions" to "anon";

grant references on table "public"."company_positions" to "anon";

grant select on table "public"."company_positions" to "anon";

grant trigger on table "public"."company_positions" to "anon";

grant truncate on table "public"."company_positions" to "anon";

grant update on table "public"."company_positions" to "anon";

grant delete on table "public"."company_positions" to "authenticated";

grant insert on table "public"."company_positions" to "authenticated";

grant references on table "public"."company_positions" to "authenticated";

grant select on table "public"."company_positions" to "authenticated";

grant trigger on table "public"."company_positions" to "authenticated";

grant truncate on table "public"."company_positions" to "authenticated";

grant update on table "public"."company_positions" to "authenticated";

grant delete on table "public"."company_positions" to "service_role";

grant insert on table "public"."company_positions" to "service_role";

grant references on table "public"."company_positions" to "service_role";

grant select on table "public"."company_positions" to "service_role";

grant trigger on table "public"."company_positions" to "service_role";

grant truncate on table "public"."company_positions" to "service_role";

grant update on table "public"."company_positions" to "service_role";

grant delete on table "public"."company_recruit_info" to "anon";

grant insert on table "public"."company_recruit_info" to "anon";

grant references on table "public"."company_recruit_info" to "anon";

grant select on table "public"."company_recruit_info" to "anon";

grant trigger on table "public"."company_recruit_info" to "anon";

grant truncate on table "public"."company_recruit_info" to "anon";

grant update on table "public"."company_recruit_info" to "anon";

grant delete on table "public"."company_recruit_info" to "authenticated";

grant insert on table "public"."company_recruit_info" to "authenticated";

grant references on table "public"."company_recruit_info" to "authenticated";

grant select on table "public"."company_recruit_info" to "authenticated";

grant trigger on table "public"."company_recruit_info" to "authenticated";

grant truncate on table "public"."company_recruit_info" to "authenticated";

grant update on table "public"."company_recruit_info" to "authenticated";

grant delete on table "public"."company_recruit_info" to "service_role";

grant insert on table "public"."company_recruit_info" to "service_role";

grant references on table "public"."company_recruit_info" to "service_role";

grant select on table "public"."company_recruit_info" to "service_role";

grant trigger on table "public"."company_recruit_info" to "service_role";

grant truncate on table "public"."company_recruit_info" to "service_role";

grant update on table "public"."company_recruit_info" to "service_role";

grant delete on table "public"."company_reviews" to "anon";

grant insert on table "public"."company_reviews" to "anon";

grant references on table "public"."company_reviews" to "anon";

grant select on table "public"."company_reviews" to "anon";

grant trigger on table "public"."company_reviews" to "anon";

grant truncate on table "public"."company_reviews" to "anon";

grant update on table "public"."company_reviews" to "anon";

grant delete on table "public"."company_reviews" to "authenticated";

grant insert on table "public"."company_reviews" to "authenticated";

grant references on table "public"."company_reviews" to "authenticated";

grant select on table "public"."company_reviews" to "authenticated";

grant trigger on table "public"."company_reviews" to "authenticated";

grant truncate on table "public"."company_reviews" to "authenticated";

grant update on table "public"."company_reviews" to "authenticated";

grant delete on table "public"."company_reviews" to "service_role";

grant insert on table "public"."company_reviews" to "service_role";

grant references on table "public"."company_reviews" to "service_role";

grant select on table "public"."company_reviews" to "service_role";

grant trigger on table "public"."company_reviews" to "service_role";

grant truncate on table "public"."company_reviews" to "service_role";

grant update on table "public"."company_reviews" to "service_role";

grant delete on table "public"."company_student_memos" to "anon";

grant insert on table "public"."company_student_memos" to "anon";

grant references on table "public"."company_student_memos" to "anon";

grant select on table "public"."company_student_memos" to "anon";

grant trigger on table "public"."company_student_memos" to "anon";

grant truncate on table "public"."company_student_memos" to "anon";

grant update on table "public"."company_student_memos" to "anon";

grant delete on table "public"."company_student_memos" to "authenticated";

grant insert on table "public"."company_student_memos" to "authenticated";

grant references on table "public"."company_student_memos" to "authenticated";

grant select on table "public"."company_student_memos" to "authenticated";

grant trigger on table "public"."company_student_memos" to "authenticated";

grant truncate on table "public"."company_student_memos" to "authenticated";

grant update on table "public"."company_student_memos" to "authenticated";

grant delete on table "public"."company_student_memos" to "service_role";

grant insert on table "public"."company_student_memos" to "service_role";

grant references on table "public"."company_student_memos" to "service_role";

grant select on table "public"."company_student_memos" to "service_role";

grant trigger on table "public"."company_student_memos" to "service_role";

grant truncate on table "public"."company_student_memos" to "service_role";

grant update on table "public"."company_student_memos" to "service_role";

grant delete on table "public"."event_details" to "anon";

grant insert on table "public"."event_details" to "anon";

grant references on table "public"."event_details" to "anon";

grant select on table "public"."event_details" to "anon";

grant trigger on table "public"."event_details" to "anon";

grant truncate on table "public"."event_details" to "anon";

grant update on table "public"."event_details" to "anon";

grant delete on table "public"."event_details" to "authenticated";

grant insert on table "public"."event_details" to "authenticated";

grant references on table "public"."event_details" to "authenticated";

grant select on table "public"."event_details" to "authenticated";

grant trigger on table "public"."event_details" to "authenticated";

grant truncate on table "public"."event_details" to "authenticated";

grant update on table "public"."event_details" to "authenticated";

grant delete on table "public"."event_details" to "service_role";

grant insert on table "public"."event_details" to "service_role";

grant references on table "public"."event_details" to "service_role";

grant select on table "public"."event_details" to "service_role";

grant trigger on table "public"."event_details" to "service_role";

grant truncate on table "public"."event_details" to "service_role";

grant update on table "public"."event_details" to "service_role";

grant delete on table "public"."event_participants" to "anon";

grant insert on table "public"."event_participants" to "anon";

grant references on table "public"."event_participants" to "anon";

grant select on table "public"."event_participants" to "anon";

grant trigger on table "public"."event_participants" to "anon";

grant truncate on table "public"."event_participants" to "anon";

grant update on table "public"."event_participants" to "anon";

grant delete on table "public"."event_participants" to "authenticated";

grant insert on table "public"."event_participants" to "authenticated";

grant references on table "public"."event_participants" to "authenticated";

grant select on table "public"."event_participants" to "authenticated";

grant trigger on table "public"."event_participants" to "authenticated";

grant truncate on table "public"."event_participants" to "authenticated";

grant update on table "public"."event_participants" to "authenticated";

grant delete on table "public"."event_participants" to "service_role";

grant insert on table "public"."event_participants" to "service_role";

grant references on table "public"."event_participants" to "service_role";

grant select on table "public"."event_participants" to "service_role";

grant trigger on table "public"."event_participants" to "service_role";

grant truncate on table "public"."event_participants" to "service_role";

grant update on table "public"."event_participants" to "service_role";

grant delete on table "public"."events" to "anon";

grant insert on table "public"."events" to "anon";

grant references on table "public"."events" to "anon";

grant select on table "public"."events" to "anon";

grant trigger on table "public"."events" to "anon";

grant truncate on table "public"."events" to "anon";

grant update on table "public"."events" to "anon";

grant delete on table "public"."events" to "authenticated";

grant insert on table "public"."events" to "authenticated";

grant references on table "public"."events" to "authenticated";

grant select on table "public"."events" to "authenticated";

grant trigger on table "public"."events" to "authenticated";

grant truncate on table "public"."events" to "authenticated";

grant update on table "public"."events" to "authenticated";

grant delete on table "public"."events" to "service_role";

grant insert on table "public"."events" to "service_role";

grant references on table "public"."events" to "service_role";

grant select on table "public"."events" to "service_role";

grant trigger on table "public"."events" to "service_role";

grant truncate on table "public"."events" to "service_role";

grant update on table "public"."events" to "service_role";

grant delete on table "public"."features" to "anon";

grant insert on table "public"."features" to "anon";

grant references on table "public"."features" to "anon";

grant select on table "public"."features" to "anon";

grant trigger on table "public"."features" to "anon";

grant truncate on table "public"."features" to "anon";

grant update on table "public"."features" to "anon";

grant delete on table "public"."features" to "authenticated";

grant insert on table "public"."features" to "authenticated";

grant references on table "public"."features" to "authenticated";

grant select on table "public"."features" to "authenticated";

grant trigger on table "public"."features" to "authenticated";

grant truncate on table "public"."features" to "authenticated";

grant update on table "public"."features" to "authenticated";

grant delete on table "public"."features" to "service_role";

grant insert on table "public"."features" to "service_role";

grant references on table "public"."features" to "service_role";

grant select on table "public"."features" to "service_role";

grant trigger on table "public"."features" to "service_role";

grant truncate on table "public"."features" to "service_role";

grant update on table "public"."features" to "service_role";

grant delete on table "public"."fulltime_details" to "anon";

grant insert on table "public"."fulltime_details" to "anon";

grant references on table "public"."fulltime_details" to "anon";

grant select on table "public"."fulltime_details" to "anon";

grant trigger on table "public"."fulltime_details" to "anon";

grant truncate on table "public"."fulltime_details" to "anon";

grant update on table "public"."fulltime_details" to "anon";

grant delete on table "public"."fulltime_details" to "authenticated";

grant insert on table "public"."fulltime_details" to "authenticated";

grant references on table "public"."fulltime_details" to "authenticated";

grant select on table "public"."fulltime_details" to "authenticated";

grant trigger on table "public"."fulltime_details" to "authenticated";

grant truncate on table "public"."fulltime_details" to "authenticated";

grant update on table "public"."fulltime_details" to "authenticated";

grant delete on table "public"."fulltime_details" to "service_role";

grant insert on table "public"."fulltime_details" to "service_role";

grant references on table "public"."fulltime_details" to "service_role";

grant select on table "public"."fulltime_details" to "service_role";

grant trigger on table "public"."fulltime_details" to "service_role";

grant truncate on table "public"."fulltime_details" to "service_role";

grant update on table "public"."fulltime_details" to "service_role";

grant delete on table "public"."inquiries" to "anon";

grant insert on table "public"."inquiries" to "anon";

grant references on table "public"."inquiries" to "anon";

grant select on table "public"."inquiries" to "anon";

grant trigger on table "public"."inquiries" to "anon";

grant truncate on table "public"."inquiries" to "anon";

grant update on table "public"."inquiries" to "anon";

grant delete on table "public"."inquiries" to "authenticated";

grant insert on table "public"."inquiries" to "authenticated";

grant references on table "public"."inquiries" to "authenticated";

grant select on table "public"."inquiries" to "authenticated";

grant trigger on table "public"."inquiries" to "authenticated";

grant truncate on table "public"."inquiries" to "authenticated";

grant update on table "public"."inquiries" to "authenticated";

grant delete on table "public"."inquiries" to "service_role";

grant insert on table "public"."inquiries" to "service_role";

grant references on table "public"."inquiries" to "service_role";

grant select on table "public"."inquiries" to "service_role";

grant trigger on table "public"."inquiries" to "service_role";

grant truncate on table "public"."inquiries" to "service_role";

grant update on table "public"."inquiries" to "service_role";

grant delete on table "public"."internship_details" to "anon";

grant insert on table "public"."internship_details" to "anon";

grant references on table "public"."internship_details" to "anon";

grant select on table "public"."internship_details" to "anon";

grant trigger on table "public"."internship_details" to "anon";

grant truncate on table "public"."internship_details" to "anon";

grant update on table "public"."internship_details" to "anon";

grant delete on table "public"."internship_details" to "authenticated";

grant insert on table "public"."internship_details" to "authenticated";

grant references on table "public"."internship_details" to "authenticated";

grant select on table "public"."internship_details" to "authenticated";

grant trigger on table "public"."internship_details" to "authenticated";

grant truncate on table "public"."internship_details" to "authenticated";

grant update on table "public"."internship_details" to "authenticated";

grant delete on table "public"."internship_details" to "service_role";

grant insert on table "public"."internship_details" to "service_role";

grant references on table "public"."internship_details" to "service_role";

grant select on table "public"."internship_details" to "service_role";

grant trigger on table "public"."internship_details" to "service_role";

grant truncate on table "public"."internship_details" to "service_role";

grant update on table "public"."internship_details" to "service_role";

grant delete on table "public"."job_embeddings" to "anon";

grant insert on table "public"."job_embeddings" to "anon";

grant references on table "public"."job_embeddings" to "anon";

grant select on table "public"."job_embeddings" to "anon";

grant trigger on table "public"."job_embeddings" to "anon";

grant truncate on table "public"."job_embeddings" to "anon";

grant update on table "public"."job_embeddings" to "anon";

grant delete on table "public"."job_embeddings" to "authenticated";

grant insert on table "public"."job_embeddings" to "authenticated";

grant references on table "public"."job_embeddings" to "authenticated";

grant select on table "public"."job_embeddings" to "authenticated";

grant trigger on table "public"."job_embeddings" to "authenticated";

grant truncate on table "public"."job_embeddings" to "authenticated";

grant update on table "public"."job_embeddings" to "authenticated";

grant delete on table "public"."job_embeddings" to "service_role";

grant insert on table "public"."job_embeddings" to "service_role";

grant references on table "public"."job_embeddings" to "service_role";

grant select on table "public"."job_embeddings" to "service_role";

grant trigger on table "public"."job_embeddings" to "service_role";

grant truncate on table "public"."job_embeddings" to "service_role";

grant update on table "public"."job_embeddings" to "service_role";

grant delete on table "public"."job_interests" to "admin";

grant insert on table "public"."job_interests" to "admin";

grant select on table "public"."job_interests" to "admin";

grant update on table "public"."job_interests" to "admin";

grant delete on table "public"."job_interests" to "anon";

grant insert on table "public"."job_interests" to "anon";

grant references on table "public"."job_interests" to "anon";

grant select on table "public"."job_interests" to "anon";

grant trigger on table "public"."job_interests" to "anon";

grant truncate on table "public"."job_interests" to "anon";

grant update on table "public"."job_interests" to "anon";

grant delete on table "public"."job_interests" to "authenticated";

grant insert on table "public"."job_interests" to "authenticated";

grant references on table "public"."job_interests" to "authenticated";

grant select on table "public"."job_interests" to "authenticated";

grant trigger on table "public"."job_interests" to "authenticated";

grant truncate on table "public"."job_interests" to "authenticated";

grant update on table "public"."job_interests" to "authenticated";

grant delete on table "public"."job_interests" to "service_role";

grant insert on table "public"."job_interests" to "service_role";

grant references on table "public"."job_interests" to "service_role";

grant select on table "public"."job_interests" to "service_role";

grant trigger on table "public"."job_interests" to "service_role";

grant truncate on table "public"."job_interests" to "service_role";

grant update on table "public"."job_interests" to "service_role";

grant delete on table "public"."job_tags" to "admin";

grant insert on table "public"."job_tags" to "admin";

grant select on table "public"."job_tags" to "admin";

grant update on table "public"."job_tags" to "admin";

grant delete on table "public"."job_tags" to "anon";

grant insert on table "public"."job_tags" to "anon";

grant references on table "public"."job_tags" to "anon";

grant select on table "public"."job_tags" to "anon";

grant trigger on table "public"."job_tags" to "anon";

grant truncate on table "public"."job_tags" to "anon";

grant update on table "public"."job_tags" to "anon";

grant delete on table "public"."job_tags" to "authenticated";

grant insert on table "public"."job_tags" to "authenticated";

grant references on table "public"."job_tags" to "authenticated";

grant select on table "public"."job_tags" to "authenticated";

grant trigger on table "public"."job_tags" to "authenticated";

grant truncate on table "public"."job_tags" to "authenticated";

grant update on table "public"."job_tags" to "authenticated";

grant delete on table "public"."job_tags" to "service_role";

grant insert on table "public"."job_tags" to "service_role";

grant references on table "public"."job_tags" to "service_role";

grant select on table "public"."job_tags" to "service_role";

grant trigger on table "public"."job_tags" to "service_role";

grant truncate on table "public"."job_tags" to "service_role";

grant update on table "public"."job_tags" to "service_role";

grant delete on table "public"."jobs" to "admin";

grant insert on table "public"."jobs" to "admin";

grant select on table "public"."jobs" to "admin";

grant update on table "public"."jobs" to "admin";

grant delete on table "public"."jobs" to "anon";

grant insert on table "public"."jobs" to "anon";

grant references on table "public"."jobs" to "anon";

grant select on table "public"."jobs" to "anon";

grant trigger on table "public"."jobs" to "anon";

grant truncate on table "public"."jobs" to "anon";

grant update on table "public"."jobs" to "anon";

grant delete on table "public"."jobs" to "authenticated";

grant insert on table "public"."jobs" to "authenticated";

grant references on table "public"."jobs" to "authenticated";

grant select on table "public"."jobs" to "authenticated";

grant trigger on table "public"."jobs" to "authenticated";

grant truncate on table "public"."jobs" to "authenticated";

grant update on table "public"."jobs" to "authenticated";

grant delete on table "public"."jobs" to "service_role";

grant insert on table "public"."jobs" to "service_role";

grant references on table "public"."jobs" to "service_role";

grant select on table "public"."jobs" to "service_role";

grant trigger on table "public"."jobs" to "service_role";

grant truncate on table "public"."jobs" to "service_role";

grant update on table "public"."jobs" to "service_role";

grant delete on table "public"."media_authors" to "anon";

grant insert on table "public"."media_authors" to "anon";

grant references on table "public"."media_authors" to "anon";

grant select on table "public"."media_authors" to "anon";

grant trigger on table "public"."media_authors" to "anon";

grant truncate on table "public"."media_authors" to "anon";

grant update on table "public"."media_authors" to "anon";

grant delete on table "public"."media_authors" to "authenticated";

grant insert on table "public"."media_authors" to "authenticated";

grant references on table "public"."media_authors" to "authenticated";

grant select on table "public"."media_authors" to "authenticated";

grant trigger on table "public"."media_authors" to "authenticated";

grant truncate on table "public"."media_authors" to "authenticated";

grant update on table "public"."media_authors" to "authenticated";

grant delete on table "public"."media_authors" to "service_role";

grant insert on table "public"."media_authors" to "service_role";

grant references on table "public"."media_authors" to "service_role";

grant select on table "public"."media_authors" to "service_role";

grant trigger on table "public"."media_authors" to "service_role";

grant truncate on table "public"."media_authors" to "service_role";

grant update on table "public"."media_authors" to "service_role";

grant delete on table "public"."media_categories" to "anon";

grant insert on table "public"."media_categories" to "anon";

grant references on table "public"."media_categories" to "anon";

grant select on table "public"."media_categories" to "anon";

grant trigger on table "public"."media_categories" to "anon";

grant truncate on table "public"."media_categories" to "anon";

grant update on table "public"."media_categories" to "anon";

grant delete on table "public"."media_categories" to "authenticated";

grant insert on table "public"."media_categories" to "authenticated";

grant references on table "public"."media_categories" to "authenticated";

grant select on table "public"."media_categories" to "authenticated";

grant trigger on table "public"."media_categories" to "authenticated";

grant truncate on table "public"."media_categories" to "authenticated";

grant update on table "public"."media_categories" to "authenticated";

grant delete on table "public"."media_categories" to "service_role";

grant insert on table "public"."media_categories" to "service_role";

grant references on table "public"."media_categories" to "service_role";

grant select on table "public"."media_categories" to "service_role";

grant trigger on table "public"."media_categories" to "service_role";

grant truncate on table "public"."media_categories" to "service_role";

grant update on table "public"."media_categories" to "service_role";

grant delete on table "public"."media_posts" to "anon";

grant insert on table "public"."media_posts" to "anon";

grant references on table "public"."media_posts" to "anon";

grant select on table "public"."media_posts" to "anon";

grant trigger on table "public"."media_posts" to "anon";

grant truncate on table "public"."media_posts" to "anon";

grant update on table "public"."media_posts" to "anon";

grant delete on table "public"."media_posts" to "authenticated";

grant insert on table "public"."media_posts" to "authenticated";

grant references on table "public"."media_posts" to "authenticated";

grant select on table "public"."media_posts" to "authenticated";

grant trigger on table "public"."media_posts" to "authenticated";

grant truncate on table "public"."media_posts" to "authenticated";

grant update on table "public"."media_posts" to "authenticated";

grant delete on table "public"."media_posts" to "service_role";

grant insert on table "public"."media_posts" to "service_role";

grant references on table "public"."media_posts" to "service_role";

grant select on table "public"."media_posts" to "service_role";

grant trigger on table "public"."media_posts" to "service_role";

grant truncate on table "public"."media_posts" to "service_role";

grant update on table "public"."media_posts" to "service_role";

grant delete on table "public"."media_posts_tags" to "anon";

grant insert on table "public"."media_posts_tags" to "anon";

grant references on table "public"."media_posts_tags" to "anon";

grant select on table "public"."media_posts_tags" to "anon";

grant trigger on table "public"."media_posts_tags" to "anon";

grant truncate on table "public"."media_posts_tags" to "anon";

grant update on table "public"."media_posts_tags" to "anon";

grant delete on table "public"."media_posts_tags" to "authenticated";

grant insert on table "public"."media_posts_tags" to "authenticated";

grant references on table "public"."media_posts_tags" to "authenticated";

grant select on table "public"."media_posts_tags" to "authenticated";

grant trigger on table "public"."media_posts_tags" to "authenticated";

grant truncate on table "public"."media_posts_tags" to "authenticated";

grant update on table "public"."media_posts_tags" to "authenticated";

grant delete on table "public"."media_posts_tags" to "service_role";

grant insert on table "public"."media_posts_tags" to "service_role";

grant references on table "public"."media_posts_tags" to "service_role";

grant select on table "public"."media_posts_tags" to "service_role";

grant trigger on table "public"."media_posts_tags" to "service_role";

grant truncate on table "public"."media_posts_tags" to "service_role";

grant update on table "public"."media_posts_tags" to "service_role";

grant delete on table "public"."media_tags" to "anon";

grant insert on table "public"."media_tags" to "anon";

grant references on table "public"."media_tags" to "anon";

grant select on table "public"."media_tags" to "anon";

grant trigger on table "public"."media_tags" to "anon";

grant truncate on table "public"."media_tags" to "anon";

grant update on table "public"."media_tags" to "anon";

grant delete on table "public"."media_tags" to "authenticated";

grant insert on table "public"."media_tags" to "authenticated";

grant references on table "public"."media_tags" to "authenticated";

grant select on table "public"."media_tags" to "authenticated";

grant trigger on table "public"."media_tags" to "authenticated";

grant truncate on table "public"."media_tags" to "authenticated";

grant update on table "public"."media_tags" to "authenticated";

grant delete on table "public"."media_tags" to "service_role";

grant insert on table "public"."media_tags" to "service_role";

grant references on table "public"."media_tags" to "service_role";

grant select on table "public"."media_tags" to "service_role";

grant trigger on table "public"."media_tags" to "service_role";

grant truncate on table "public"."media_tags" to "service_role";

grant update on table "public"."media_tags" to "service_role";

grant delete on table "public"."messages" to "admin";

grant insert on table "public"."messages" to "admin";

grant select on table "public"."messages" to "admin";

grant update on table "public"."messages" to "admin";

grant delete on table "public"."messages" to "anon";

grant insert on table "public"."messages" to "anon";

grant references on table "public"."messages" to "anon";

grant select on table "public"."messages" to "anon";

grant trigger on table "public"."messages" to "anon";

grant truncate on table "public"."messages" to "anon";

grant update on table "public"."messages" to "anon";

grant delete on table "public"."messages" to "authenticated";

grant insert on table "public"."messages" to "authenticated";

grant references on table "public"."messages" to "authenticated";

grant select on table "public"."messages" to "authenticated";

grant trigger on table "public"."messages" to "authenticated";

grant truncate on table "public"."messages" to "authenticated";

grant update on table "public"."messages" to "authenticated";

grant delete on table "public"."messages" to "service_role";

grant insert on table "public"."messages" to "service_role";

grant references on table "public"."messages" to "service_role";

grant select on table "public"."messages" to "service_role";

grant trigger on table "public"."messages" to "service_role";

grant truncate on table "public"."messages" to "service_role";

grant update on table "public"."messages" to "service_role";

grant delete on table "public"."notifications" to "admin";

grant insert on table "public"."notifications" to "admin";

grant select on table "public"."notifications" to "admin";

grant update on table "public"."notifications" to "admin";

grant delete on table "public"."notifications" to "anon";

grant insert on table "public"."notifications" to "anon";

grant references on table "public"."notifications" to "anon";

grant select on table "public"."notifications" to "anon";

grant trigger on table "public"."notifications" to "anon";

grant truncate on table "public"."notifications" to "anon";

grant update on table "public"."notifications" to "anon";

grant delete on table "public"."notifications" to "authenticated";

grant insert on table "public"."notifications" to "authenticated";

grant references on table "public"."notifications" to "authenticated";

grant select on table "public"."notifications" to "authenticated";

grant trigger on table "public"."notifications" to "authenticated";

grant truncate on table "public"."notifications" to "authenticated";

grant update on table "public"."notifications" to "authenticated";

grant delete on table "public"."notifications" to "service_role";

grant insert on table "public"."notifications" to "service_role";

grant references on table "public"."notifications" to "service_role";

grant select on table "public"."notifications" to "service_role";

grant trigger on table "public"."notifications" to "service_role";

grant truncate on table "public"."notifications" to "service_role";

grant update on table "public"."notifications" to "service_role";

grant delete on table "public"."qualifications" to "anon";

grant insert on table "public"."qualifications" to "anon";

grant references on table "public"."qualifications" to "anon";

grant select on table "public"."qualifications" to "anon";

grant trigger on table "public"."qualifications" to "anon";

grant truncate on table "public"."qualifications" to "anon";

grant update on table "public"."qualifications" to "anon";

grant delete on table "public"."qualifications" to "authenticated";

grant insert on table "public"."qualifications" to "authenticated";

grant references on table "public"."qualifications" to "authenticated";

grant select on table "public"."qualifications" to "authenticated";

grant trigger on table "public"."qualifications" to "authenticated";

grant truncate on table "public"."qualifications" to "authenticated";

grant update on table "public"."qualifications" to "authenticated";

grant delete on table "public"."qualifications" to "service_role";

grant insert on table "public"."qualifications" to "service_role";

grant references on table "public"."qualifications" to "service_role";

grant select on table "public"."qualifications" to "service_role";

grant trigger on table "public"."qualifications" to "service_role";

grant truncate on table "public"."qualifications" to "service_role";

grant update on table "public"."qualifications" to "service_role";

grant delete on table "public"."question_bank" to "admin";

grant insert on table "public"."question_bank" to "admin";

grant select on table "public"."question_bank" to "admin";

grant update on table "public"."question_bank" to "admin";

grant delete on table "public"."question_bank" to "anon";

grant insert on table "public"."question_bank" to "anon";

grant references on table "public"."question_bank" to "anon";

grant select on table "public"."question_bank" to "anon";

grant trigger on table "public"."question_bank" to "anon";

grant truncate on table "public"."question_bank" to "anon";

grant update on table "public"."question_bank" to "anon";

grant delete on table "public"."question_bank" to "authenticated";

grant insert on table "public"."question_bank" to "authenticated";

grant references on table "public"."question_bank" to "authenticated";

grant select on table "public"."question_bank" to "authenticated";

grant trigger on table "public"."question_bank" to "authenticated";

grant truncate on table "public"."question_bank" to "authenticated";

grant update on table "public"."question_bank" to "authenticated";

grant delete on table "public"."question_bank" to "service_role";

grant insert on table "public"."question_bank" to "service_role";

grant references on table "public"."question_bank" to "service_role";

grant select on table "public"."question_bank" to "service_role";

grant trigger on table "public"."question_bank" to "service_role";

grant truncate on table "public"."question_bank" to "service_role";

grant update on table "public"."question_bank" to "service_role";

grant delete on table "public"."referral_codes" to "anon";

grant insert on table "public"."referral_codes" to "anon";

grant references on table "public"."referral_codes" to "anon";

grant select on table "public"."referral_codes" to "anon";

grant trigger on table "public"."referral_codes" to "anon";

grant truncate on table "public"."referral_codes" to "anon";

grant update on table "public"."referral_codes" to "anon";

grant delete on table "public"."referral_codes" to "authenticated";

grant insert on table "public"."referral_codes" to "authenticated";

grant references on table "public"."referral_codes" to "authenticated";

grant select on table "public"."referral_codes" to "authenticated";

grant trigger on table "public"."referral_codes" to "authenticated";

grant truncate on table "public"."referral_codes" to "authenticated";

grant update on table "public"."referral_codes" to "authenticated";

grant delete on table "public"."referral_codes" to "service_role";

grant insert on table "public"."referral_codes" to "service_role";

grant references on table "public"."referral_codes" to "service_role";

grant select on table "public"."referral_codes" to "service_role";

grant trigger on table "public"."referral_codes" to "service_role";

grant truncate on table "public"."referral_codes" to "service_role";

grant update on table "public"."referral_codes" to "service_role";

grant delete on table "public"."referral_uses" to "anon";

grant insert on table "public"."referral_uses" to "anon";

grant references on table "public"."referral_uses" to "anon";

grant select on table "public"."referral_uses" to "anon";

grant trigger on table "public"."referral_uses" to "anon";

grant truncate on table "public"."referral_uses" to "anon";

grant update on table "public"."referral_uses" to "anon";

grant delete on table "public"."referral_uses" to "authenticated";

grant insert on table "public"."referral_uses" to "authenticated";

grant references on table "public"."referral_uses" to "authenticated";

grant select on table "public"."referral_uses" to "authenticated";

grant trigger on table "public"."referral_uses" to "authenticated";

grant truncate on table "public"."referral_uses" to "authenticated";

grant update on table "public"."referral_uses" to "authenticated";

grant delete on table "public"."referral_uses" to "service_role";

grant insert on table "public"."referral_uses" to "service_role";

grant references on table "public"."referral_uses" to "service_role";

grant select on table "public"."referral_uses" to "service_role";

grant trigger on table "public"."referral_uses" to "service_role";

grant truncate on table "public"."referral_uses" to "service_role";

grant update on table "public"."referral_uses" to "service_role";

grant delete on table "public"."resumes" to "admin";

grant insert on table "public"."resumes" to "admin";

grant select on table "public"."resumes" to "admin";

grant update on table "public"."resumes" to "admin";

grant delete on table "public"."role_change_log" to "anon";

grant insert on table "public"."role_change_log" to "anon";

grant references on table "public"."role_change_log" to "anon";

grant select on table "public"."role_change_log" to "anon";

grant trigger on table "public"."role_change_log" to "anon";

grant truncate on table "public"."role_change_log" to "anon";

grant update on table "public"."role_change_log" to "anon";

grant delete on table "public"."role_change_log" to "authenticated";

grant insert on table "public"."role_change_log" to "authenticated";

grant references on table "public"."role_change_log" to "authenticated";

grant select on table "public"."role_change_log" to "authenticated";

grant trigger on table "public"."role_change_log" to "authenticated";

grant truncate on table "public"."role_change_log" to "authenticated";

grant update on table "public"."role_change_log" to "authenticated";

grant delete on table "public"."role_change_log" to "service_role";

grant insert on table "public"."role_change_log" to "service_role";

grant references on table "public"."role_change_log" to "service_role";

grant select on table "public"."role_change_log" to "service_role";

grant trigger on table "public"."role_change_log" to "service_role";

grant truncate on table "public"."role_change_log" to "service_role";

grant update on table "public"."role_change_log" to "service_role";

grant delete on table "public"."scout_templates" to "admin";

grant insert on table "public"."scout_templates" to "admin";

grant select on table "public"."scout_templates" to "admin";

grant update on table "public"."scout_templates" to "admin";

grant delete on table "public"."scout_templates" to "anon";

grant insert on table "public"."scout_templates" to "anon";

grant references on table "public"."scout_templates" to "anon";

grant select on table "public"."scout_templates" to "anon";

grant trigger on table "public"."scout_templates" to "anon";

grant truncate on table "public"."scout_templates" to "anon";

grant update on table "public"."scout_templates" to "anon";

grant delete on table "public"."scout_templates" to "authenticated";

grant insert on table "public"."scout_templates" to "authenticated";

grant references on table "public"."scout_templates" to "authenticated";

grant select on table "public"."scout_templates" to "authenticated";

grant trigger on table "public"."scout_templates" to "authenticated";

grant truncate on table "public"."scout_templates" to "authenticated";

grant update on table "public"."scout_templates" to "authenticated";

grant delete on table "public"."scout_templates" to "service_role";

grant insert on table "public"."scout_templates" to "service_role";

grant references on table "public"."scout_templates" to "service_role";

grant select on table "public"."scout_templates" to "service_role";

grant trigger on table "public"."scout_templates" to "service_role";

grant truncate on table "public"."scout_templates" to "service_role";

grant update on table "public"."scout_templates" to "service_role";

grant delete on table "public"."scouts" to "admin";

grant insert on table "public"."scouts" to "admin";

grant select on table "public"."scouts" to "admin";

grant update on table "public"."scouts" to "admin";

grant delete on table "public"."scouts" to "anon";

grant insert on table "public"."scouts" to "anon";

grant references on table "public"."scouts" to "anon";

grant select on table "public"."scouts" to "anon";

grant trigger on table "public"."scouts" to "anon";

grant truncate on table "public"."scouts" to "anon";

grant update on table "public"."scouts" to "anon";

grant delete on table "public"."scouts" to "authenticated";

grant insert on table "public"."scouts" to "authenticated";

grant references on table "public"."scouts" to "authenticated";

grant select on table "public"."scouts" to "authenticated";

grant trigger on table "public"."scouts" to "authenticated";

grant truncate on table "public"."scouts" to "authenticated";

grant update on table "public"."scouts" to "authenticated";

grant delete on table "public"."scouts" to "service_role";

grant insert on table "public"."scouts" to "service_role";

grant references on table "public"."scouts" to "service_role";

grant select on table "public"."scouts" to "service_role";

grant trigger on table "public"."scouts" to "service_role";

grant truncate on table "public"."scouts" to "service_role";

grant update on table "public"."scouts" to "service_role";

grant delete on table "public"."session_answers" to "admin";

grant insert on table "public"."session_answers" to "admin";

grant select on table "public"."session_answers" to "admin";

grant update on table "public"."session_answers" to "admin";

grant delete on table "public"."session_answers" to "anon";

grant insert on table "public"."session_answers" to "anon";

grant references on table "public"."session_answers" to "anon";

grant select on table "public"."session_answers" to "anon";

grant trigger on table "public"."session_answers" to "anon";

grant truncate on table "public"."session_answers" to "anon";

grant update on table "public"."session_answers" to "anon";

grant delete on table "public"."session_answers" to "authenticated";

grant insert on table "public"."session_answers" to "authenticated";

grant references on table "public"."session_answers" to "authenticated";

grant select on table "public"."session_answers" to "authenticated";

grant trigger on table "public"."session_answers" to "authenticated";

grant truncate on table "public"."session_answers" to "authenticated";

grant update on table "public"."session_answers" to "authenticated";

grant delete on table "public"."session_answers" to "service_role";

grant insert on table "public"."session_answers" to "service_role";

grant references on table "public"."session_answers" to "service_role";

grant select on table "public"."session_answers" to "service_role";

grant trigger on table "public"."session_answers" to "service_role";

grant truncate on table "public"."session_answers" to "service_role";

grant update on table "public"."session_answers" to "service_role";

grant delete on table "public"."skills" to "anon";

grant insert on table "public"."skills" to "anon";

grant references on table "public"."skills" to "anon";

grant select on table "public"."skills" to "anon";

grant trigger on table "public"."skills" to "anon";

grant truncate on table "public"."skills" to "anon";

grant update on table "public"."skills" to "anon";

grant delete on table "public"."skills" to "authenticated";

grant insert on table "public"."skills" to "authenticated";

grant references on table "public"."skills" to "authenticated";

grant select on table "public"."skills" to "authenticated";

grant trigger on table "public"."skills" to "authenticated";

grant truncate on table "public"."skills" to "authenticated";

grant update on table "public"."skills" to "authenticated";

grant delete on table "public"."skills" to "service_role";

grant insert on table "public"."skills" to "service_role";

grant references on table "public"."skills" to "service_role";

grant select on table "public"."skills" to "service_role";

grant trigger on table "public"."skills" to "service_role";

grant truncate on table "public"."skills" to "service_role";

grant update on table "public"."skills" to "service_role";

grant delete on table "public"."student_profiles" to "admin";

grant insert on table "public"."student_profiles" to "admin";

grant select on table "public"."student_profiles" to "admin";

grant update on table "public"."student_profiles" to "admin";

grant insert on table "public"."student_profiles" to "authenticator";

grant select on table "public"."student_profiles" to "authenticator";

grant update on table "public"."student_profiles" to "authenticator";

grant delete on table "public"."student_profiles_backup" to "anon";

grant insert on table "public"."student_profiles_backup" to "anon";

grant references on table "public"."student_profiles_backup" to "anon";

grant select on table "public"."student_profiles_backup" to "anon";

grant trigger on table "public"."student_profiles_backup" to "anon";

grant truncate on table "public"."student_profiles_backup" to "anon";

grant update on table "public"."student_profiles_backup" to "anon";

grant delete on table "public"."student_profiles_backup" to "authenticated";

grant insert on table "public"."student_profiles_backup" to "authenticated";

grant references on table "public"."student_profiles_backup" to "authenticated";

grant select on table "public"."student_profiles_backup" to "authenticated";

grant trigger on table "public"."student_profiles_backup" to "authenticated";

grant truncate on table "public"."student_profiles_backup" to "authenticated";

grant update on table "public"."student_profiles_backup" to "authenticated";

grant delete on table "public"."student_profiles_backup" to "service_role";

grant insert on table "public"."student_profiles_backup" to "service_role";

grant references on table "public"."student_profiles_backup" to "service_role";

grant select on table "public"."student_profiles_backup" to "service_role";

grant trigger on table "public"."student_profiles_backup" to "service_role";

grant truncate on table "public"."student_profiles_backup" to "service_role";

grant update on table "public"."student_profiles_backup" to "service_role";

grant delete on table "public"."student_qualifications" to "anon";

grant insert on table "public"."student_qualifications" to "anon";

grant references on table "public"."student_qualifications" to "anon";

grant select on table "public"."student_qualifications" to "anon";

grant trigger on table "public"."student_qualifications" to "anon";

grant truncate on table "public"."student_qualifications" to "anon";

grant update on table "public"."student_qualifications" to "anon";

grant delete on table "public"."student_qualifications" to "authenticated";

grant insert on table "public"."student_qualifications" to "authenticated";

grant references on table "public"."student_qualifications" to "authenticated";

grant select on table "public"."student_qualifications" to "authenticated";

grant trigger on table "public"."student_qualifications" to "authenticated";

grant truncate on table "public"."student_qualifications" to "authenticated";

grant update on table "public"."student_qualifications" to "authenticated";

grant delete on table "public"."student_qualifications" to "service_role";

grant insert on table "public"."student_qualifications" to "service_role";

grant references on table "public"."student_qualifications" to "service_role";

grant select on table "public"."student_qualifications" to "service_role";

grant trigger on table "public"."student_qualifications" to "service_role";

grant truncate on table "public"."student_qualifications" to "service_role";

grant update on table "public"."student_qualifications" to "service_role";

grant delete on table "public"."student_skills" to "anon";

grant insert on table "public"."student_skills" to "anon";

grant references on table "public"."student_skills" to "anon";

grant select on table "public"."student_skills" to "anon";

grant trigger on table "public"."student_skills" to "anon";

grant truncate on table "public"."student_skills" to "anon";

grant update on table "public"."student_skills" to "anon";

grant delete on table "public"."student_skills" to "authenticated";

grant insert on table "public"."student_skills" to "authenticated";

grant references on table "public"."student_skills" to "authenticated";

grant select on table "public"."student_skills" to "authenticated";

grant trigger on table "public"."student_skills" to "authenticated";

grant truncate on table "public"."student_skills" to "authenticated";

grant update on table "public"."student_skills" to "authenticated";

grant delete on table "public"."student_skills" to "service_role";

grant insert on table "public"."student_skills" to "service_role";

grant references on table "public"."student_skills" to "service_role";

grant select on table "public"."student_skills" to "service_role";

grant trigger on table "public"."student_skills" to "service_role";

grant truncate on table "public"."student_skills" to "service_role";

grant update on table "public"."student_skills" to "service_role";

grant delete on table "public"."user_roles" to "admin";

grant insert on table "public"."user_roles" to "admin";

grant select on table "public"."user_roles" to "admin";

grant update on table "public"."user_roles" to "admin";

grant delete on table "public"."user_roles" to "anon";

grant insert on table "public"."user_roles" to "anon";

grant references on table "public"."user_roles" to "anon";

grant select on table "public"."user_roles" to "anon";

grant trigger on table "public"."user_roles" to "anon";

grant truncate on table "public"."user_roles" to "anon";

grant update on table "public"."user_roles" to "anon";

grant delete on table "public"."user_roles" to "authenticated";

grant insert on table "public"."user_roles" to "authenticated";

grant select on table "public"."user_roles" to "authenticated";

grant update on table "public"."user_roles" to "authenticated";

grant delete on table "public"."user_roles" to "service_role";

grant insert on table "public"."user_roles" to "service_role";

grant references on table "public"."user_roles" to "service_role";

grant select on table "public"."user_roles" to "service_role";

grant trigger on table "public"."user_roles" to "service_role";

grant truncate on table "public"."user_roles" to "service_role";

grant update on table "public"."user_roles" to "service_role";

grant insert on table "public"."user_roles" to "supabase_admin";

grant select on table "public"."user_roles" to "supabase_admin";

grant update on table "public"."user_roles" to "supabase_admin";

grant insert on table "public"."user_roles" to "supabase_auth_admin";

grant select on table "public"."user_roles" to "supabase_auth_admin";

grant update on table "public"."user_roles" to "supabase_auth_admin";

grant delete on table "public"."user_signups" to "admin";

grant insert on table "public"."user_signups" to "admin";

grant select on table "public"."user_signups" to "admin";

grant update on table "public"."user_signups" to "admin";

grant delete on table "public"."user_signups" to "anon";

grant insert on table "public"."user_signups" to "anon";

grant references on table "public"."user_signups" to "anon";

grant select on table "public"."user_signups" to "anon";

grant trigger on table "public"."user_signups" to "anon";

grant truncate on table "public"."user_signups" to "anon";

grant update on table "public"."user_signups" to "anon";

grant delete on table "public"."user_signups" to "authenticated";

grant insert on table "public"."user_signups" to "authenticated";

grant references on table "public"."user_signups" to "authenticated";

grant select on table "public"."user_signups" to "authenticated";

grant trigger on table "public"."user_signups" to "authenticated";

grant truncate on table "public"."user_signups" to "authenticated";

grant update on table "public"."user_signups" to "authenticated";

grant delete on table "public"."user_signups" to "service_role";

grant insert on table "public"."user_signups" to "service_role";

grant references on table "public"."user_signups" to "service_role";

grant select on table "public"."user_signups" to "service_role";

grant trigger on table "public"."user_signups" to "service_role";

grant truncate on table "public"."user_signups" to "service_role";

grant update on table "public"."user_signups" to "service_role";

grant delete on table "public"."users" to "admin";

grant insert on table "public"."users" to "admin";

grant select on table "public"."users" to "admin";

grant update on table "public"."users" to "admin";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";

grant delete on table "public"."webtest_questions" to "anon";

grant insert on table "public"."webtest_questions" to "anon";

grant references on table "public"."webtest_questions" to "anon";

grant select on table "public"."webtest_questions" to "anon";

grant trigger on table "public"."webtest_questions" to "anon";

grant truncate on table "public"."webtest_questions" to "anon";

grant update on table "public"."webtest_questions" to "anon";

grant delete on table "public"."webtest_questions" to "authenticated";

grant insert on table "public"."webtest_questions" to "authenticated";

grant references on table "public"."webtest_questions" to "authenticated";

grant select on table "public"."webtest_questions" to "authenticated";

grant trigger on table "public"."webtest_questions" to "authenticated";

grant truncate on table "public"."webtest_questions" to "authenticated";

grant update on table "public"."webtest_questions" to "authenticated";

grant delete on table "public"."webtest_questions" to "service_role";

grant insert on table "public"."webtest_questions" to "service_role";

grant references on table "public"."webtest_questions" to "service_role";

grant select on table "public"."webtest_questions" to "service_role";

grant trigger on table "public"."webtest_questions" to "service_role";

grant truncate on table "public"."webtest_questions" to "service_role";

grant update on table "public"."webtest_questions" to "service_role";

create policy "admin_only"
on "public"."activity_logs"
as permissive
for all
to public
using (((auth.jwt() ->> 'role'::text) = 'admin'::text));


create policy "admins_can_read_logs"
on "public"."activity_logs"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = 'admin'::text)))));


create policy "app_company_select"
on "public"."applications"
as permissive
for select
to authenticated
using ((company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid()))));


create policy "app_student_insert"
on "public"."applications"
as permissive
for insert
to public
with check ((student_id IN ( SELECT student_profiles.id
   FROM student_profiles
  WHERE (student_profiles.user_id = auth.uid()))));


create policy "app_student_select"
on "public"."applications"
as permissive
for select
to public
using ((student_id IN ( SELECT student_profiles.id
   FROM student_profiles
  WHERE (student_profiles.user_id = auth.uid()))));


create policy "Authenticated can insert challenge_questions"
on "public"."challenge_questions"
as permissive
for insert
to authenticated
with check (true);


create policy "admin_only"
on "public"."challenge_questions"
as permissive
for all
to public
using (((auth.jwt() ->> 'role'::text) = 'admin'::text));


create policy "cq_any_insert"
on "public"."challenge_questions"
as permissive
for insert
to authenticated
with check (true);


create policy "cq_any_select"
on "public"."challenge_questions"
as permissive
for select
to authenticated
using (true);


create policy "cq_authenticated_delete"
on "public"."challenge_questions"
as permissive
for delete
to authenticated
using (true);


create policy "cq_authenticated_insert"
on "public"."challenge_questions"
as permissive
for insert
to authenticated
with check (true);


create policy "cq_insert_debug"
on "public"."challenge_questions"
as permissive
for insert
to authenticated
with check (true);


create policy "cq_owner_insert"
on "public"."challenge_questions"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM challenges c
  WHERE ((c.id = challenge_questions.challenge_id) AND (c.created_by = auth.uid())))));


create policy "cq_owner_select"
on "public"."challenge_questions"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM challenges c
  WHERE ((c.id = challenge_questions.challenge_id) AND (c.created_by = auth.uid())))));


create policy "cq_select_auth"
on "public"."challenge_questions"
as permissive
for select
to authenticated
using (true);


create policy "Student can see own session"
on "public"."challenge_sessions"
as permissive
for all
to public
using ((student_id = auth.uid()));


create policy "admin_or_owner"
on "public"."challenge_sessions"
as permissive
for all
to public
using ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (student_id = auth.uid())));


create policy "students insert own sessions"
on "public"."challenge_sessions"
as permissive
for insert
to public
with check ((student_id = ( SELECT student_profiles.id
   FROM student_profiles
  WHERE (student_profiles.user_id = auth.uid()))));


create policy "students manage own sessions"
on "public"."challenge_sessions"
as permissive
for all
to public
using ((student_id IN ( SELECT student_profiles.id
   FROM student_profiles
  WHERE (student_profiles.user_id = auth.uid()))))
with check ((student_id IN ( SELECT student_profiles.id
   FROM student_profiles
  WHERE (student_profiles.user_id = auth.uid()))));


create policy "students select own sessions"
on "public"."challenge_sessions"
as permissive
for select
to public
using ((student_id = ( SELECT student_profiles.id
   FROM student_profiles
  WHERE (student_profiles.user_id = auth.uid()))));


create policy "students update own sessions"
on "public"."challenge_sessions"
as permissive
for update
to public
using ((student_id = ( SELECT student_profiles.id
   FROM student_profiles
  WHERE (student_profiles.user_id = auth.uid()))));


create policy "Admins can grade"
on "public"."challenge_submissions"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = 'admin'::text)))))
with check (true);


create policy "Admins read all"
on "public"."challenge_submissions"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = 'admin'::text)))));


create policy "admin_or_owner"
on "public"."challenge_submissions"
as permissive
for all
to public
using ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (student_id = auth.uid())));


create policy "admin_or_owner"
on "public"."challenges"
as permissive
for all
to public
using ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (student_id = auth.uid())));


create policy "challenges_authenticated_write"
on "public"."challenges"
as permissive
for all
to authenticated
using (true)
with check (true);


create policy "challenges_insert_auth"
on "public"."challenges"
as permissive
for insert
to authenticated
with check ((created_by = auth.uid()));


create policy "challenges_rw_owner"
on "public"."challenges"
as permissive
for all
to authenticated
using ((created_by = auth.uid()))
with check ((created_by = auth.uid()));


create policy "select_webtest_authenticated"
on "public"."challenges"
as permissive
for select
to authenticated
using (((student_id IS NULL) AND (category = 'webtest'::text) AND (start_date <= now()) AND ((deadline IS NULL) OR (deadline >= now()))));


create policy "company member can insert chat room"
on "public"."chat_rooms"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM company_members
  WHERE ((company_members.company_id = chat_rooms.company_id) AND (company_members.user_id = auth.uid())))));


create policy "company_can_access_their_chat_rooms"
on "public"."chat_rooms"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM company_members cu
  WHERE ((cu.company_id = chat_rooms.company_id) AND (cu.user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM company_members cu
  WHERE ((cu.company_id = chat_rooms.company_id) AND (cu.user_id = auth.uid())))));


create policy "select_chat_rooms_participants"
on "public"."chat_rooms"
as permissive
for select
to authenticated
using (((auth.uid() IN ( SELECT student_profiles.user_id
   FROM student_profiles
  WHERE (student_profiles.id = chat_rooms.student_id))) OR (auth.uid() IN ( SELECT company_members.user_id
   FROM company_members
  WHERE (company_members.company_id = chat_rooms.company_id)))));


create policy "student can insert chat room"
on "public"."chat_rooms"
as permissive
for insert
to public
with check ((student_id = ( SELECT sp.id
   FROM student_profiles sp
  WHERE (sp.user_id = auth.uid())
 LIMIT 1)));


create policy "student_can_read_their_chat_rooms"
on "public"."chat_rooms"
as permissive
for select
to public
using ((student_id = auth.uid()));


create policy "student_can_write_their_chat_rooms"
on "public"."chat_rooms"
as permissive
for all
to public
using ((student_id = auth.uid()))
with check ((student_id = auth.uid()));


create policy "admin_all"
on "public"."companies"
as permissive
for all
to public
using (((auth.jwt() ->> 'role'::text) = 'admin'::text))
with check (((auth.jwt() ->> 'role'::text) = 'admin'::text));


create policy "admin_or_owner"
on "public"."companies"
as permissive
for all
to public
using ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (user_id = auth.uid())));


create policy "admin_or_owner_write"
on "public"."companies"
as permissive
for all
to public
using ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (user_id = auth.uid())));


create policy "companies_admin_all"
on "public"."companies"
as permissive
for all
to supabase_auth_admin
using (true)
with check (true);


create policy "companies_select"
on "public"."companies"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM company_members
  WHERE ((company_members.company_id = companies.id) AND (company_members.user_id = auth.uid())))));


create policy "company_admin can select own company"
on "public"."companies"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "insert own company"
on "public"."companies"
as permissive
for insert
to public
with check ((user_id = auth.uid()));


create policy "public read companies"
on "public"."companies"
as permissive
for select
to public
using (true);


create policy "select own company"
on "public"."companies"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "update own company"
on "public"."companies"
as permissive
for update
to public
using ((user_id = auth.uid()));


create policy "企業メンバーだけが更新"
on "public"."companies"
as permissive
for update
to public
using ((is_company_member(id) OR ((auth.jwt() ->> 'role'::text) = 'admin'::text)))
with check ((is_company_member(id) OR ((auth.jwt() ->> 'role'::text) = 'admin'::text)));


create policy "公開読み取り"
on "public"."companies"
as permissive
for select
to public
using (true);


create policy "Favorites: Allow delete by owner"
on "public"."company_favorites"
as permissive
for delete
to public
using ((user_id = auth.uid()));


create policy "Favorites: Allow insert by owner"
on "public"."company_favorites"
as permissive
for insert
to public
with check ((user_id = auth.uid()));


create policy "Favorites: Allow select for authenticated"
on "public"."company_favorites"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "Owners can read own company_members"
on "public"."company_members"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "Users can read own company_members"
on "public"."company_members"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "cm_company_select"
on "public"."company_members"
as permissive
for select
to public
using ((company_id IN ( SELECT user_companies.company_id
   FROM user_companies
  WHERE (user_companies.user_id = auth.uid()))));


create policy "cm_owner_delete"
on "public"."company_members"
as permissive
for delete
to authenticated
using (is_company_owner(company_id));


create policy "cm_self_delete"
on "public"."company_members"
as permissive
for delete
to authenticated
using ((user_id = auth.uid()));


create policy "cm_self_insert"
on "public"."company_members"
as permissive
for insert
to authenticated
with check ((user_id = auth.uid()));


create policy "cm_self_only"
on "public"."company_members"
as permissive
for all
to authenticated
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));


create policy "cri_self_all"
on "public"."company_recruit_info"
as permissive
for all
to authenticated
using ((company_id IN ( SELECT companies.id
   FROM companies
  WHERE (companies.user_id = auth.uid()))))
with check ((company_id IN ( SELECT companies.id
   FROM companies
  WHERE (companies.user_id = auth.uid()))));


create policy "ep_student_insert"
on "public"."event_participants"
as permissive
for insert
to public
with check ((student_id IN ( SELECT student_profiles.id
   FROM student_profiles
  WHERE (student_profiles.user_id = auth.uid()))));


create policy "ep_student_select"
on "public"."event_participants"
as permissive
for select
to public
using ((student_id IN ( SELECT student_profiles.id
   FROM student_profiles
  WHERE (student_profiles.user_id = auth.uid()))));


create policy "admin_full_access"
on "public"."events"
as permissive
for all
to authenticated
using ((auth.role() = 'admin'::text))
with check ((auth.role() = 'admin'::text));


create policy "select_published_events"
on "public"."events"
as permissive
for select
to public
using (((status)::text = 'published'::text));


create policy "Admins full access"
on "public"."features"
as permissive
for all
to public
using (((auth.role() = 'service_role'::text) OR ((auth.jwt() ->> 'role'::text) = 'admin'::text)));


create policy "Admins manage features"
on "public"."features"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = 'admin'::text)))))
with check ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = 'admin'::text)))));


create policy "Allow anonymous insert"
on "public"."inquiries"
as permissive
for insert
to public
with check (true);


create policy "Allow anon read embeddings"
on "public"."job_embeddings"
as permissive
for select
to public
using (true);


create policy "admin_or_owner"
on "public"."job_interests"
as permissive
for all
to public
using ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (student_id = auth.uid())));


create policy "学生本人のみ削除"
on "public"."job_interests"
as permissive
for delete
to public
using (((student_id = auth.uid()) OR is_admin()));


create policy "学生本人のみ参照"
on "public"."job_interests"
as permissive
for select
to public
using (((student_id = auth.uid()) OR is_admin()));


create policy "学生本人のみ追加"
on "public"."job_interests"
as permissive
for insert
to public
with check (((student_id = auth.uid()) OR is_admin()));


create policy "Anyone can view job tags"
on "public"."job_tags"
as permissive
for select
to public
using (true);


create policy "admin_only"
on "public"."job_tags"
as permissive
for all
to public
using (((auth.jwt() ->> 'role'::text) = 'admin'::text));


create policy "public read job_tags"
on "public"."job_tags"
as permissive
for select
to public
using (true);


create policy "admin_can_do_anything"
on "public"."jobs"
as permissive
for all
to admin
using (true)
with check (true);


create policy "company user can insert jobs"
on "public"."jobs"
as permissive
for insert
to authenticated
with check ((company_id IN ( SELECT companies.id
   FROM companies
  WHERE (companies.user_id = auth.uid()))));


create policy "company_can_manage_own_jobs"
on "public"."jobs"
as permissive
for all
to public
using ((company_id IN ( SELECT companies.id
   FROM companies
  WHERE (companies.user_id = auth.uid()))))
with check ((company_id IN ( SELECT companies.id
   FROM companies
  WHERE (companies.user_id = auth.uid()))));


create policy "public_can_view_published_jobs"
on "public"."jobs"
as permissive
for select
to public
using ((published = true));


create policy "service_role_can_update_is_recommended"
on "public"."jobs"
as permissive
for update
to service_role
using (true)
with check (true);


create policy "Public read media_categories"
on "public"."media_categories"
as permissive
for select
to public
using (true);


create policy "author read draft"
on "public"."media_posts"
as permissive
for select
to public
using (((status = 'published'::text) OR (auth.uid() = ( SELECT media_authors.user_id
   FROM media_authors
  WHERE (media_authors.id = media_posts.author_id)))));


create policy "author update own post"
on "public"."media_posts"
as permissive
for update
to public
using ((auth.uid() = ( SELECT media_authors.user_id
   FROM media_authors
  WHERE (media_authors.id = media_posts.author_id))));


create policy "media_posts_insert_own"
on "public"."media_posts"
as permissive
for insert
to public
with check ((auth.uid() = ( SELECT media_authors.user_id
   FROM media_authors
  WHERE (media_authors.id = media_posts.author_id))));


create policy "public read published posts"
on "public"."media_posts"
as permissive
for select
to public
using ((status = 'published'::text));


create policy "media_posts_tags_insert_if_owner"
on "public"."media_posts_tags"
as permissive
for insert
to public
with check ((auth.uid() = ( SELECT a.user_id
   FROM (media_authors a
     JOIN media_posts p ON ((p.author_id = a.id)))
  WHERE (p.id = media_posts_tags.post_id))));


create policy "participant_can_insert"
on "public"."messages"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM chat_rooms cr
  WHERE ((cr.id = messages.chat_room_id) AND ((EXISTS ( SELECT 1
           FROM student_profiles sp
          WHERE ((sp.id = cr.student_id) AND (sp.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM company_members cm
          WHERE ((cm.company_id = cr.company_id) AND (cm.user_id = auth.uid())))))))));


create policy "participant_can_select"
on "public"."messages"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM chat_rooms cr
  WHERE ((cr.id = messages.chat_room_id) AND ((EXISTS ( SELECT 1
           FROM student_profiles sp
          WHERE ((sp.id = cr.student_id) AND (sp.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM company_members cm
          WHERE ((cm.company_id = cr.company_id) AND (cm.user_id = auth.uid())))))))));


create policy "participant_can_update"
on "public"."messages"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM chat_rooms cr
  WHERE ((cr.id = messages.chat_room_id) AND ((EXISTS ( SELECT 1
           FROM student_profiles sp
          WHERE ((sp.id = cr.student_id) AND (sp.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM company_members cm
          WHERE ((cm.company_id = cr.company_id) AND (cm.user_id = auth.uid())))))))))
with check (true);


create policy "Admins insert"
on "public"."notifications"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = 'admin'::text)))));


create policy "Users can mark notifications as read"
on "public"."notifications"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view own notifications"
on "public"."notifications"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "admin_or_owner"
on "public"."notifications"
as permissive
for all
to public
using ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (user_id = auth.uid())));


create policy "insert_notifications"
on "public"."notifications"
as permissive
for insert
to authenticated
with check (true);


create policy "insert_own_notifications"
on "public"."notifications"
as permissive
for insert
to authenticated
with check ((auth.uid() = user_id));


create policy "owner_read"
on "public"."notifications"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "select own notifications"
on "public"."notifications"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "select_own_notifications"
on "public"."notifications"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "update own notifications"
on "public"."notifications"
as permissive
for update
to public
using ((user_id = auth.uid()));


create policy "update_is_read"
on "public"."notifications"
as permissive
for update
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "Allow read for all users"
on "public"."question_bank"
as permissive
for select
to public
using (true);


create policy "admin_only"
on "public"."question_bank"
as permissive
for all
to public
using (((auth.jwt() ->> 'role'::text) = 'admin'::text));


create policy "authenticated_insert"
on "public"."question_bank"
as permissive
for insert
to authenticated
with check (true);


create policy "Owner can read own codes"
on "public"."referral_codes"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Owner can read own uses"
on "public"."referral_uses"
as permissive
for select
to public
using ((auth.uid() = ( SELECT rc.user_id
   FROM referral_codes rc
  WHERE (rc.id = referral_uses.referral_code_id))));


create policy "Admin or Owner can read resumes"
on "public"."resumes"
as permissive
for select
to public
using (((auth.uid() = user_id) OR ((auth.jwt() ->> 'role'::text) = 'admin'::text)));


create policy "Admin or Owner can update resumes"
on "public"."resumes"
as permissive
for update
to public
using (((auth.uid() = user_id) OR ((auth.jwt() ->> 'role'::text) = 'admin'::text)));


create policy "Company can read resumes of their applicants"
on "public"."resumes"
as permissive
for select
to authenticated
using ((user_id IN ( SELECT applications.student_id
   FROM applications
  WHERE (applications.company_id = auth.uid()))));


create policy "admin_or_owner"
on "public"."resumes"
as permissive
for all
to public
using ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (user_id = auth.uid())));


create policy "allow all select for resumes"
on "public"."resumes"
as permissive
for select
to public
using (true);


create policy "allow select for all users"
on "public"."resumes"
as permissive
for select
to public
using (true);


create policy "company can read all resumes"
on "public"."resumes"
as permissive
for select
to authenticated
using (true);


create policy "public read resumes"
on "public"."resumes"
as permissive
for select
to authenticated
using (true);


create policy "resume_owner_all"
on "public"."resumes"
as permissive
for all
to public
using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = ANY (ARRAY[('company'::character varying)::text, ('company_admin'::character varying)::text])))))))
with check ((user_id = auth.uid()));


create policy "resume_owner_insert"
on "public"."resumes"
as permissive
for insert
to public
with check ((user_id = auth.uid()));


create policy "resume_owner_update"
on "public"."resumes"
as permissive
for update
to public
using ((user_id = auth.uid()));


create policy "resume_select"
on "public"."resumes"
as permissive
for select
to authenticated
using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = ANY (ARRAY[('company'::character varying)::text, ('company_admin'::character varying)::text])))))));


create policy "resumes_owner"
on "public"."resumes"
as permissive
for all
to public
using ((auth.uid() = user_id));


create policy "resumes_readable_by_company"
on "public"."resumes"
as permissive
for select
to authenticated
using (((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = ANY (ARRAY[('company'::character varying)::text, ('company_admin'::character varying)::text]))))) OR (user_id = auth.uid())));


create policy "company_members_can_delete_templates"
on "public"."scout_templates"
as permissive
for delete
to public
using (is_company_member(company_id));


create policy "company_members_can_insert_templates"
on "public"."scout_templates"
as permissive
for insert
to public
with check (is_company_member(company_id));


create policy "company_members_can_read_their_templates"
on "public"."scout_templates"
as permissive
for select
to public
using (is_company_member(company_id));


create policy "company_members_can_update_templates"
on "public"."scout_templates"
as permissive
for update
to public
using (is_company_member(company_id))
with check (is_company_member(company_id));


create policy "company_members_delete"
on "public"."scout_templates"
as permissive
for delete
to authenticated
using (is_company_member(company_id));


create policy "company_members_insert"
on "public"."scout_templates"
as permissive
for insert
to authenticated
with check (is_company_member(company_id));


create policy "company_members_read"
on "public"."scout_templates"
as permissive
for select
to authenticated
using (is_company_member(company_id));


create policy "company_members_update"
on "public"."scout_templates"
as permissive
for update
to authenticated
using (is_company_member(company_id))
with check (is_company_member(company_id));


create policy "Students can update scout status"
on "public"."scouts"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM student_profiles
  WHERE ((student_profiles.id = scouts.student_id) AND (student_profiles.user_id = auth.uid())))));


create policy "Students can view and respond to scouts"
on "public"."scouts"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM student_profiles
  WHERE ((student_profiles.id = scouts.student_id) AND (student_profiles.user_id = auth.uid())))));


create policy "admin_or_owner"
on "public"."scouts"
as permissive
for all
to public
using ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (student_id = auth.uid())));


create policy "company can read own scouts"
on "public"."scouts"
as permissive
for select
to public
using ((company_member_id = ( SELECT company_members.id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())
 LIMIT 1)));


create policy "company can update own scouts"
on "public"."scouts"
as permissive
for update
to public
using ((company_member_id = ( SELECT company_members.id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())
 LIMIT 1)));


create policy "company read scouts"
on "public"."scouts"
as permissive
for select
to public
using ((job_id IN ( SELECT jobs.id
   FROM jobs
  WHERE (jobs.company_id = auth.uid()))));


create policy "company_manage_scouts"
on "public"."scouts"
as permissive
for all
to authenticated
using (((EXISTS ( SELECT 1
   FROM companies c
  WHERE ((c.id = scouts.company_id) AND (c.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM company_members m
  WHERE ((m.company_id = scouts.company_id) AND (m.user_id = auth.uid()))))))
with check (((EXISTS ( SELECT 1
   FROM companies c
  WHERE ((c.id = scouts.company_id) AND (c.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM company_members m
  WHERE ((m.company_id = scouts.company_id) AND (m.user_id = auth.uid()))))));


create policy "student_read_own_scouts"
on "public"."scouts"
as permissive
for select
to public
using ((student_id = auth.uid()));


create policy "Student can fetch own answers"
on "public"."session_answers"
as permissive
for all
to public
using ((session_id IN ( SELECT challenge_sessions.id
   FROM challenge_sessions
  WHERE (challenge_sessions.student_id = auth.uid()))));


create policy "admin_only"
on "public"."session_answers"
as permissive
for all
to public
using (((auth.jwt() ->> 'role'::text) = 'admin'::text));


create policy "student owns answer"
on "public"."session_answers"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM challenge_sessions cs
  WHERE ((cs.id = session_answers.session_id) AND (cs.student_id = auth.uid())))));


create policy "students insert own session answers"
on "public"."session_answers"
as permissive
for insert
to public
with check ((session_id IN ( SELECT challenge_sessions.id
   FROM challenge_sessions
  WHERE (challenge_sessions.student_id = ( SELECT student_profiles.id
           FROM student_profiles
          WHERE (student_profiles.user_id = auth.uid()))))));


create policy "students select own session answers"
on "public"."session_answers"
as permissive
for select
to public
using ((session_id IN ( SELECT challenge_sessions.id
   FROM challenge_sessions
  WHERE (challenge_sessions.student_id = ( SELECT student_profiles.id
           FROM student_profiles
          WHERE (student_profiles.user_id = auth.uid()))))));


create policy "students update own session answers"
on "public"."session_answers"
as permissive
for update
to public
using ((session_id IN ( SELECT challenge_sessions.id
   FROM challenge_sessions
  WHERE (challenge_sessions.student_id = ( SELECT student_profiles.id
           FROM student_profiles
          WHERE (student_profiles.user_id = auth.uid()))))));


create policy "server insert"
on "public"."student_profiles"
as permissive
for insert
to authenticator
with check (true);


create policy "sp_company_read"
on "public"."student_profiles"
as permissive
for select
to public
using (((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = ANY (ARRAY[('company'::character varying)::text, ('company_admin'::character varying)::text]))))) OR (COALESCE((auth.jwt() ->> 'role'::text), ''::text) = 'admin'::text)));


create policy "sp_owner_insert"
on "public"."student_profiles"
as permissive
for insert
to public
with check ((user_id = auth.uid()));


create policy "sp_owner_select"
on "public"."student_profiles"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "sp_owner_update"
on "public"."student_profiles"
as permissive
for update
to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));


create policy "students_insert_own"
on "public"."student_profiles"
as permissive
for insert
to public
with check ((user_id = auth.uid()));


create policy "students_select_admin"
on "public"."student_profiles"
as permissive
for select
to public
using (((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = 'admin'::text)))) OR (auth.role() = 'service_role'::text)));


create policy "students_select_own"
on "public"."student_profiles"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "students_update_own"
on "public"."student_profiles"
as permissive
for update
to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));


create policy "Admins can read all roles"
on "public"."user_roles"
as permissive
for select
to public
using ((((auth.jwt() ->> 'is_admin'::text))::boolean = true));


create policy "Read roles for debugging"
on "public"."user_roles"
as permissive
for select
to public
using (true);


create policy "admin_all"
on "public"."user_roles"
as permissive
for all
to public
using (((auth.jwt() ->> 'role'::text) = 'admin'::text))
with check (((auth.jwt() ->> 'role'::text) = 'admin'::text));


create policy "admin_or_owner"
on "public"."user_roles"
as permissive
for all
to public
using ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (user_id = auth.uid())));


create policy "insert_own_role_once"
on "public"."user_roles"
as permissive
for insert
to public
with check (((auth.uid() = user_id) AND (NOT (EXISTS ( SELECT 1
   FROM user_roles r2
  WHERE (r2.user_id = auth.uid()))))));


create policy "read_own_role"
on "public"."user_roles"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "select_own_role"
on "public"."user_roles"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "user can read own role"
on "public"."user_roles"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "user_roles_admin_all"
on "public"."user_roles"
as permissive
for all
to supabase_admin, supabase_auth_admin
using (true)
with check (true);


create policy "user_roles_block_delete"
on "public"."user_roles"
as permissive
for delete
to authenticated
using (false);


create policy "user_roles_block_update"
on "public"."user_roles"
as permissive
for update
to authenticated
using (false);


create policy "user_roles_insert_once"
on "public"."user_roles"
as permissive
for insert
to authenticated
with check (true);


create policy "Users can insert their own signup row"
on "public"."user_signups"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can select their own signup row"
on "public"."user_signups"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "admin_or_owner"
on "public"."user_signups"
as permissive
for all
to public
using ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (user_id = auth.uid())));


create policy "admin_only"
on "public"."users"
as permissive
for select
to public
using (((auth.jwt() ->> 'role'::text) = 'admin'::text));


create policy "self_insert"
on "public"."users"
as permissive
for insert
to public
with check ((id = auth.uid()));


create policy "self_update"
on "public"."users"
as permissive
for update
to public
using ((id = auth.uid()));


CREATE TRIGGER update_activity_logs_updated_at BEFORE UPDATE ON public.activity_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_fill_company_id BEFORE INSERT ON public.applications FOR EACH ROW EXECUTE FUNCTION filling_company_id();

CREATE TRIGGER update_applications_modtime BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_chat_rooms_modtime BEFORE UPDATE ON public.chat_rooms FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_add_creator_to_members AFTER INSERT ON public.companies FOR EACH ROW EXECUTE FUNCTION add_creator_to_members();

CREATE TRIGGER trg_company_after_insert AFTER INSERT ON public.companies FOR EACH ROW EXECUTE FUNCTION add_owner_to_company_members();

CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.company_student_memos FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_events_updated BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.features FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_jobs_modtime BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_notify_on_chat_insert AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION notify_on_chat_insert();

CREATE TRIGGER trg_set_answered_at_company BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION set_answered_at_on_company_insert();

CREATE TRIGGER trg_notifications_email AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION enqueue_email_notification();

CREATE TRIGGER trg_notify_email_queue AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION queue_email_notification();

CREATE TRIGGER trg_send_email AFTER INSERT ON public.notifications FOR EACH ROW WHEN (((new.channel = 'email'::text) AND ((new.send_status IS NULL) OR (new.send_status = 'pending'::text)))) EXECUTE FUNCTION fn_notify_send_email();

CREATE TRIGGER trg_notify_on_scout_insert AFTER INSERT ON public.scouts FOR EACH ROW EXECUTE FUNCTION notify_on_scout_insert();

CREATE TRIGGER trg_scout_accepted_notify AFTER UPDATE ON public.scouts FOR EACH ROW WHEN ((((new.status)::text = 'accepted'::text) AND ((old.status)::text IS DISTINCT FROM (new.status)::text))) EXECUTE FUNCTION fn_scout_accepted_notify();

CREATE TRIGGER trg_scout_to_application AFTER INSERT OR UPDATE OF status ON public.scouts FOR EACH ROW EXECUTE FUNCTION scout_to_application();

CREATE TRIGGER update_scouts_modtime BEFORE UPDATE ON public.scouts FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_ensure_user_id BEFORE INSERT OR UPDATE ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION ensure_user_id();

CREATE TRIGGER trg_set_user_id BEFORE INSERT ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION sync_user_id();

CREATE TRIGGER update_student_profiles_modtime BEFORE UPDATE ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_log_role_change AFTER UPDATE ON public.user_roles FOR EACH ROW WHEN (((old.role)::text IS DISTINCT FROM (new.role)::text)) EXECUTE FUNCTION log_role_change();


revoke delete on table "storage"."migrations" from "anon";

revoke insert on table "storage"."migrations" from "anon";

revoke references on table "storage"."migrations" from "anon";

revoke select on table "storage"."migrations" from "anon";

revoke trigger on table "storage"."migrations" from "anon";

revoke truncate on table "storage"."migrations" from "anon";

revoke update on table "storage"."migrations" from "anon";

revoke delete on table "storage"."migrations" from "authenticated";

revoke insert on table "storage"."migrations" from "authenticated";

revoke references on table "storage"."migrations" from "authenticated";

revoke select on table "storage"."migrations" from "authenticated";

revoke trigger on table "storage"."migrations" from "authenticated";

revoke truncate on table "storage"."migrations" from "authenticated";

revoke update on table "storage"."migrations" from "authenticated";

revoke delete on table "storage"."migrations" from "postgres";

revoke insert on table "storage"."migrations" from "postgres";

revoke references on table "storage"."migrations" from "postgres";

revoke select on table "storage"."migrations" from "postgres";

revoke trigger on table "storage"."migrations" from "postgres";

revoke truncate on table "storage"."migrations" from "postgres";

revoke update on table "storage"."migrations" from "postgres";

revoke delete on table "storage"."migrations" from "service_role";

revoke insert on table "storage"."migrations" from "service_role";

revoke references on table "storage"."migrations" from "service_role";

revoke select on table "storage"."migrations" from "service_role";

revoke trigger on table "storage"."migrations" from "service_role";

revoke truncate on table "storage"."migrations" from "service_role";

revoke update on table "storage"."migrations" from "service_role";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$function$
;

CREATE OR REPLACE FUNCTION storage.extension(name text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
_parts text[];
_filename text;
BEGIN
	select string_to_array(name, '/') into _parts;
	select _parts[array_length(_parts,1)] into _filename;
	-- @todo return the last part instead of 2
	return reverse(split_part(reverse(_filename), '.', 1));
END
$function$
;

CREATE OR REPLACE FUNCTION storage.filename(name text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$function$
;

CREATE OR REPLACE FUNCTION storage.foldername(name text)
 RETURNS text[]
 LANGUAGE plpgsql
AS $function$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[1:array_length(_parts,1)-1];
END
$function$
;

CREATE OR REPLACE FUNCTION storage.get_size_by_bucket()
 RETURNS TABLE(size bigint, bucket_id text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    return query
        select sum((metadata->>'size')::int) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$function$
;

CREATE OR REPLACE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text)
 RETURNS TABLE(key text, id text, created_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$function$
;

CREATE OR REPLACE FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text)
 RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$function$
;

CREATE OR REPLACE FUNCTION storage.operation()
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)
 RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  v_order_by text;
  v_sort_order text;
begin
  case
    when sortcolumn = 'name' then
      v_order_by = 'name';
    when sortcolumn = 'updated_at' then
      v_order_by = 'updated_at';
    when sortcolumn = 'created_at' then
      v_order_by = 'created_at';
    when sortcolumn = 'last_accessed_at' then
      v_order_by = 'last_accessed_at';
    else
      v_order_by = 'name';
  end case;

  case
    when sortorder = 'asc' then
      v_sort_order = 'asc';
    when sortorder = 'desc' then
      v_sort_order = 'desc';
    else
      v_sort_order = 'asc';
  end case;

  v_order_by = v_order_by || ' ' || v_sort_order;

  return query execute
    'with folders as (
       select path_tokens[$1] as folder
       from storage.objects
         where objects.name ilike $2 || $3 || ''%''
           and bucket_id = $4
           and array_length(objects.path_tokens, 1) <> $1
       group by folder
       order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$function$
;

CREATE OR REPLACE FUNCTION storage.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$function$
;

grant delete on table "storage"."s3_multipart_uploads" to "postgres";

grant insert on table "storage"."s3_multipart_uploads" to "postgres";

grant references on table "storage"."s3_multipart_uploads" to "postgres";

grant select on table "storage"."s3_multipart_uploads" to "postgres";

grant trigger on table "storage"."s3_multipart_uploads" to "postgres";

grant truncate on table "storage"."s3_multipart_uploads" to "postgres";

grant update on table "storage"."s3_multipart_uploads" to "postgres";

grant delete on table "storage"."s3_multipart_uploads_parts" to "postgres";

grant insert on table "storage"."s3_multipart_uploads_parts" to "postgres";

grant references on table "storage"."s3_multipart_uploads_parts" to "postgres";

grant select on table "storage"."s3_multipart_uploads_parts" to "postgres";

grant trigger on table "storage"."s3_multipart_uploads_parts" to "postgres";

grant truncate on table "storage"."s3_multipart_uploads_parts" to "postgres";

grant update on table "storage"."s3_multipart_uploads_parts" to "postgres";

create policy "Authenticated can read media"
on "storage"."objects"
as permissive
for select
to public
using (((bucket_id = 'media'::text) AND (auth.role() = 'authenticated'::text)));


create policy "Authenticated can upload to media"
on "storage"."objects"
as permissive
for insert
to public
with check (((bucket_id = 'media'::text) AND (auth.role() = 'authenticated'::text)));


create policy "Authenticated uploads"
on "storage"."objects"
as permissive
for insert
to public
with check (((bucket_id = 'media'::text) AND (auth.role() = 'authenticated'::text)));


create policy "allow_company_logo_delete"
on "storage"."objects"
as permissive
for delete
to authenticated
using ((bucket_id = 'company-logos'::text));


create policy "allow_company_logo_insert"
on "storage"."objects"
as permissive
for insert
to authenticated
with check ((bucket_id = 'company-logos'::text));


create policy "allow_company_logo_select"
on "storage"."objects"
as permissive
for select
to authenticated
using ((bucket_id = 'company-logos'::text));


create policy "allow_company_logo_update"
on "storage"."objects"
as permissive
for update
to authenticated
using ((bucket_id = 'company-logos'::text))
with check ((bucket_id = 'company-logos'::text));


create policy "attachments anon select"
on "storage"."objects"
as permissive
for select
to public
using ((bucket_id = 'attachments'::text));


create policy "attachments auth write"
on "storage"."objects"
as permissive
for all
to public
using (((bucket_id = 'attachments'::text) AND (auth.role() = 'authenticated'::text)));


create policy "auth users can read job-covers"
on "storage"."objects"
as permissive
for select
to authenticated
using ((bucket_id = 'job-covers'::text));


create policy "auth users can upload job-covers"
on "storage"."objects"
as permissive
for insert
to authenticated
with check ((bucket_id = 'job-covers'::text));


create policy "avatars insert"
on "storage"."objects"
as permissive
for insert
to authenticated
with check ((bucket_id = 'avatars'::text));


create policy "avatars read"
on "storage"."objects"
as permissive
for select
to public
using ((bucket_id = 'avatars'::text));


create policy "avatars update"
on "storage"."objects"
as permissive
for update
to authenticated
using ((bucket_id = 'avatars'::text));


create policy "company-covers delete"
on "storage"."objects"
as permissive
for delete
to authenticated
using ((bucket_id = 'company-covers'::text));


create policy "company-covers insert"
on "storage"."objects"
as permissive
for insert
to authenticated
with check ((bucket_id = 'company-covers'::text));


create policy "company-covers select"
on "storage"."objects"
as permissive
for select
to authenticated
using ((bucket_id = 'company-covers'::text));


create policy "company-covers update"
on "storage"."objects"
as permissive
for update
to authenticated
using ((bucket_id = 'company-covers'::text))
with check ((bucket_id = 'company-covers'::text));


create policy "public read avatars"
on "storage"."objects"
as permissive
for select
to public
using ((bucket_id = 'avatars'::text));


create policy "upload job-covers"
on "storage"."objects"
as permissive
for insert
to authenticated
with check (((bucket_id = 'job-covers'::text) AND (auth.uid() IS NOT NULL)));



