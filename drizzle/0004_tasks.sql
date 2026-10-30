CREATE TABLE "label" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"column_id" uuid NOT NULL,
	"position" text collate "C" NOT NULL,
	"title" text NOT NULL,
	"description" jsonb,
	"description_text" text DEFAULT '' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"due_date" date,
	"estimate_minutes" integer,
	"owner_id" text NOT NULL,
	"assignee_id" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "task_label" (
	"task_id" uuid NOT NULL,
	"label_id" uuid NOT NULL,
	CONSTRAINT "task_label_task_id_label_id_pk" PRIMARY KEY("task_id","label_id")
);
--> statement-breakpoint
ALTER TABLE "label" ADD CONSTRAINT "label_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_column_id_board_column_id_fk" FOREIGN KEY ("column_id") REFERENCES "public"."board_column"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_label" ADD CONSTRAINT "task_label_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_label" ADD CONSTRAINT "task_label_label_id_label_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."label"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "label_project_id_name_idx" ON "label" USING btree ("project_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "task_project_id_number_idx" ON "task" USING btree ("project_id","number");--> statement-breakpoint
CREATE INDEX "task_column_id_position_idx" ON "task" USING btree ("column_id","position");--> statement-breakpoint
CREATE INDEX "task_project_id_archived_at_idx" ON "task" USING btree ("project_id","archived_at");--> statement-breakpoint
CREATE INDEX "task_label_label_id_idx" ON "task_label" USING btree ("label_id");