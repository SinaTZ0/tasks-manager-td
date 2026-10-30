CREATE TABLE "delegation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"previous_assignee_id" text,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"actor_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"task_id" uuid,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "delegation" ADD CONSTRAINT "delegation_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegation" ADD CONSTRAINT "delegation_from_id_user_id_fk" FOREIGN KEY ("from_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegation" ADD CONSTRAINT "delegation_to_id_user_id_fk" FOREIGN KEY ("to_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegation" ADD CONSTRAINT "delegation_previous_assignee_id_user_id_fk" FOREIGN KEY ("previous_assignee_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "delegation_task_id_created_at_idx" ON "delegation" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "delegation_from_id_idx" ON "delegation" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "notification_user_id_created_at_idx" ON "notification" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notification_unread_idx" ON "notification" USING btree ("user_id") WHERE "notification"."read_at" is null;