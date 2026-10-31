DROP INDEX "board_column_project_id_kind_idx";--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "paused_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "board_column_project_id_kind_idx" ON "board_column" USING btree ("project_id","kind") WHERE "board_column"."kind" <> 'custom';