ALTER TABLE "notification" ALTER COLUMN "actor_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "due_date" date;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_due_once_idx" ON "notification" USING btree ("user_id","task_id","kind","due_date") WHERE "notification"."due_date" is not null;