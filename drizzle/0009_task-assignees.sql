CREATE TABLE "task_assignee" (
	"task_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "task_assignee_task_id_user_id_pk" PRIMARY KEY("task_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "task" DROP CONSTRAINT "task_assignee_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "task_assignee" ADD CONSTRAINT "task_assignee_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignee" ADD CONSTRAINT "task_assignee_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_assignee_user_id_idx" ON "task_assignee" USING btree ("user_id");--> statement-breakpoint
-- Each task's one assignee becomes its first, before the column goes.
INSERT INTO "task_assignee" ("task_id", "user_id") SELECT "id", "assignee_id" FROM "task" WHERE "assignee_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "task" DROP COLUMN "assignee_id";