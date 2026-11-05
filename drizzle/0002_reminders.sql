CREATE TABLE "reminder" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"task_id" uuid NOT NULL,
	"remind_at" timestamp NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reminder" ADD CONSTRAINT "reminder_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder" ADD CONSTRAINT "reminder_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reminder_user_id_task_id_idx" ON "reminder" USING btree ("user_id","task_id");--> statement-breakpoint
CREATE INDEX "reminder_remind_at_idx" ON "reminder" USING btree ("remind_at");