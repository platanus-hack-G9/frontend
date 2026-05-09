


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."articles" (
    "id" bigint NOT NULL,
    "url" "text" NOT NULL,
    "guid" "text" NOT NULL,
    "medium_slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "summary" "text" NOT NULL,
    "body" "text" NOT NULL,
    "author" "text",
    "published_at" timestamp with time zone NOT NULL,
    "language" "text" DEFAULT 'es'::"text" NOT NULL,
    "topics" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "extraction_path" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "articles_extraction_path_check" CHECK (("extraction_path" = ANY (ARRAY['readability'::"text", 'playwright'::"text", 'rss-only'::"text"])))
);


ALTER TABLE "public"."articles" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."articles_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."articles_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."articles_id_seq" OWNED BY "public"."articles"."id";



CREATE TABLE IF NOT EXISTS "public"."ingest_attempts" (
    "id" bigint NOT NULL,
    "run_id" bigint NOT NULL,
    "url" "text" NOT NULL,
    "outcome" "text" NOT NULL,
    "extractor" "text",
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ingest_attempts_outcome_check" CHECK (("outcome" = ANY (ARRAY['inserted'::"text", 'duplicate'::"text", 'failed'::"text", 'quality_gate'::"text"])))
);


ALTER TABLE "public"."ingest_attempts" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."ingest_attempts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ingest_attempts_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."ingest_attempts_id_seq" OWNED BY "public"."ingest_attempts"."id";



CREATE TABLE IF NOT EXISTS "public"."ingest_runs" (
    "id" bigint NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "finished_at" timestamp with time zone,
    "feeds_processed" integer DEFAULT 0 NOT NULL,
    "articles_found" integer DEFAULT 0 NOT NULL,
    "articles_new" integer DEFAULT 0 NOT NULL,
    "articles_failed" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."ingest_runs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."ingest_runs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ingest_runs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."ingest_runs_id_seq" OWNED BY "public"."ingest_runs"."id";



CREATE TABLE IF NOT EXISTS "public"."media" (
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "feed_url" "text" NOT NULL,
    "base_url" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."media" OWNER TO "postgres";


ALTER TABLE ONLY "public"."articles" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."articles_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ingest_attempts" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ingest_attempts_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ingest_runs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ingest_runs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_url_key" UNIQUE ("url");



ALTER TABLE ONLY "public"."ingest_attempts"
    ADD CONSTRAINT "ingest_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ingest_runs"
    ADD CONSTRAINT "ingest_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_pkey" PRIMARY KEY ("slug");



CREATE INDEX "articles_medium_slug_idx" ON "public"."articles" USING "btree" ("medium_slug");



CREATE INDEX "articles_published_at_idx" ON "public"."articles" USING "btree" ("published_at" DESC);



CREATE INDEX "articles_topics_gin_idx" ON "public"."articles" USING "gin" ("topics");



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_medium_slug_fkey" FOREIGN KEY ("medium_slug") REFERENCES "public"."media"("slug");



ALTER TABLE ONLY "public"."ingest_attempts"
    ADD CONSTRAINT "ingest_attempts_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."ingest_runs"("id");





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





































































































































































GRANT ALL ON TABLE "public"."articles" TO "anon";
GRANT ALL ON TABLE "public"."articles" TO "authenticated";
GRANT ALL ON TABLE "public"."articles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."articles_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."articles_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."articles_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ingest_attempts" TO "anon";
GRANT ALL ON TABLE "public"."ingest_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."ingest_attempts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ingest_attempts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ingest_attempts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ingest_attempts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ingest_runs" TO "anon";
GRANT ALL ON TABLE "public"."ingest_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."ingest_runs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ingest_runs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ingest_runs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ingest_runs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."media" TO "anon";
GRANT ALL ON TABLE "public"."media" TO "authenticated";
GRANT ALL ON TABLE "public"."media" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































