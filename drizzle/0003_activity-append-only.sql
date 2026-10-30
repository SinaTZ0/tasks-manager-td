-- Activity is append-only (docs/app.md rule 7): no code path may edit or remove history. The one exception is the
-- integration tests' cleanup, which sets `tofang.test_cleanup` for its own transaction (`SET LOCAL`) to delete the
-- rows it created; the application never sets it.
CREATE FUNCTION activity_append_only() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('tofang.test_cleanup', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'activity is append-only: % refused', TG_OP;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER activity_append_only BEFORE UPDATE OR DELETE ON "activity"
  FOR EACH ROW EXECUTE FUNCTION activity_append_only();
--> statement-breakpoint
CREATE TRIGGER activity_no_truncate BEFORE TRUNCATE ON "activity"
  FOR EACH STATEMENT EXECUTE FUNCTION activity_append_only();
