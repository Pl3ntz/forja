CREATE TABLE "cover_letter_body_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cover_letter_id" uuid NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cover_letters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"cv_id" uuid,
	"locale" text NOT NULL,
	"template_id" text DEFAULT 'default' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"pdf_filename" text DEFAULT '' NOT NULL,
	"sender_name" text DEFAULT '' NOT NULL,
	"sender_title" text DEFAULT '' NOT NULL,
	"sender_location" text DEFAULT '' NOT NULL,
	"sender_email" text DEFAULT '' NOT NULL,
	"sender_phone" text DEFAULT '' NOT NULL,
	"sender_linkedin" text DEFAULT '' NOT NULL,
	"recipient_salutation" text DEFAULT 'Dear Hiring Manager' NOT NULL,
	"recipient_name" text DEFAULT '' NOT NULL,
	"recipient_company" text DEFAULT '' NOT NULL,
	"recipient_address" text DEFAULT '' NOT NULL,
	"letter_date" text DEFAULT '' NOT NULL,
	"closing_phrase" text DEFAULT 'Sincerely,' NOT NULL,
	"signature" text DEFAULT '' NOT NULL,
	"custom_latex" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cv_certification_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cv_id" uuid NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"issuer" text DEFAULT '' NOT NULL,
	"year" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cv_experience_items" ADD COLUMN "intro" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "cv_experience_items" ADD COLUMN "skills" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "cvs" ADD COLUMN "header_title" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "id_token" text;--> statement-breakpoint
ALTER TABLE "cover_letter_body_items" ADD CONSTRAINT "cover_letter_body_items_cover_letter_id_cover_letters_id_fk" FOREIGN KEY ("cover_letter_id") REFERENCES "public"."cover_letters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_letters" ADD CONSTRAINT "cover_letters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_letters" ADD CONSTRAINT "cover_letters_cv_id_cvs_id_fk" FOREIGN KEY ("cv_id") REFERENCES "public"."cvs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_certification_items" ADD CONSTRAINT "cv_certification_items_cv_id_cvs_id_fk" FOREIGN KEY ("cv_id") REFERENCES "public"."cvs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cover_letter_body_items_cover_letter_id_idx" ON "cover_letter_body_items" USING btree ("cover_letter_id");--> statement-breakpoint
CREATE INDEX "cover_letters_user_id_idx" ON "cover_letters" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cover_letters_cv_id_idx" ON "cover_letters" USING btree ("cv_id");--> statement-breakpoint
CREATE INDEX "cv_certification_items_cv_id_idx" ON "cv_certification_items" USING btree ("cv_id");