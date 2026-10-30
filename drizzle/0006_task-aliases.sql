CREATE TABLE "task_alias" (
	"project_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"task_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "task_alias_project_id_number_pk" PRIMARY KEY("project_id","number")
);
--> statement-breakpoint
ALTER TABLE "task_alias" ADD CONSTRAINT "task_alias_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_alias" ADD CONSTRAINT "task_alias_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_alias_task_id_idx" ON "task_alias" USING btree ("task_id");