DROP INDEX "activity_project_id_created_at_idx";--> statement-breakpoint
DROP INDEX "activity_task_id_created_at_idx";--> statement-breakpoint
ALTER TABLE "activity" ADD COLUMN "seq" bigint NOT NULL GENERATED ALWAYS AS IDENTITY (sequence name "activity_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1);--> statement-breakpoint
CREATE INDEX "activity_project_id_created_at_idx" ON "activity" USING btree ("project_id","created_at","seq");--> statement-breakpoint
CREATE INDEX "activity_task_id_created_at_idx" ON "activity" USING btree ("task_id","created_at","seq");