CREATE TABLE "time_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"manual" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "time_log_ends_after_start" CHECK ("time_log"."ended_at" is null or "time_log"."ended_at" >= "time_log"."started_at"),
	CONSTRAINT "time_log_manual_is_closed" CHECK (not "time_log"."manual" or "time_log"."ended_at" is not null)
);
--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "time_log" ADD CONSTRAINT "time_log_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_log" ADD CONSTRAINT "time_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "time_log_one_open_per_user_idx" ON "time_log" USING btree ("user_id") WHERE "time_log"."ended_at" is null;--> statement-breakpoint
CREATE INDEX "time_log_task_id_started_at_idx" ON "time_log" USING btree ("task_id","started_at");