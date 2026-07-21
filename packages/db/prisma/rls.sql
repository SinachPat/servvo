-- Servvo — Row-Level Security (defense-in-depth for tenant isolation)
--
-- NOT part of the migration chain on purpose. Applying this REQUIRES the application
-- to set `app.brand_id` on every connection first; otherwise every query returns zero
-- rows and the app appears empty. Wire the session variable, then apply this.
--
-- Application-layer scoping (`brandScope()` in @servvo/db) is the primary control.
-- This is the second lock: if a query ever forgets its brand filter, Postgres refuses
-- rather than leaking another brand's data.
--
--   Apply:  psql "$DATABASE_URL" -f packages/db/prisma/rls.sql
--
-- Per-request wiring (inside a transaction, parameterised — never string-interpolated):
--   SET LOCAL app.brand_id = $1;

-- Helper: the brand scope of the current session, or NULL when unset.
CREATE OR REPLACE FUNCTION current_brand_id() RETURNS text AS $$
  SELECT NULLIF(current_setting('app.brand_id', true), '');
$$ LANGUAGE sql STABLE;

-- Enable + force RLS on every brand-scoped table.
-- FORCE makes the policy apply to the table owner too, which is what the app connects as.
ALTER TABLE "Brand"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Brand"             FORCE  ROW LEVEL SECURITY;
ALTER TABLE "Connection"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Connection"        FORCE  ROW LEVEL SECURITY;
ALTER TABLE "Location"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Location"          FORCE  ROW LEVEL SECURITY;
ALTER TABLE "AgentGrant"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentGrant"        FORCE  ROW LEVEL SECURITY;
ALTER TABLE "Policy"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Policy"            FORCE  ROW LEVEL SECURITY;
ALTER TABLE "ConfirmationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConfirmationToken" FORCE  ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"          FORCE  ROW LEVEL SECURITY;

-- Brand keys off its own id; every other table off its brandId column.
DROP POLICY IF EXISTS brand_isolation ON "Brand";
CREATE POLICY brand_isolation ON "Brand"
  USING (id = current_brand_id())
  WITH CHECK (id = current_brand_id());

DROP POLICY IF EXISTS brand_isolation ON "Connection";
CREATE POLICY brand_isolation ON "Connection"
  USING ("brandId" = current_brand_id())
  WITH CHECK ("brandId" = current_brand_id());

DROP POLICY IF EXISTS brand_isolation ON "Location";
CREATE POLICY brand_isolation ON "Location"
  USING ("brandId" = current_brand_id())
  WITH CHECK ("brandId" = current_brand_id());

DROP POLICY IF EXISTS brand_isolation ON "AgentGrant";
CREATE POLICY brand_isolation ON "AgentGrant"
  USING ("brandId" = current_brand_id())
  WITH CHECK ("brandId" = current_brand_id());

DROP POLICY IF EXISTS brand_isolation ON "Policy";
CREATE POLICY brand_isolation ON "Policy"
  USING ("brandId" = current_brand_id())
  WITH CHECK ("brandId" = current_brand_id());

DROP POLICY IF EXISTS brand_isolation ON "ConfirmationToken";
CREATE POLICY brand_isolation ON "ConfirmationToken"
  USING ("brandId" = current_brand_id())
  WITH CHECK ("brandId" = current_brand_id());

-- AuditLog is append-only from the app's perspective: rows may be inserted and read
-- within the brand scope, but the absence of an UPDATE/DELETE policy means Postgres
-- refuses modification outright.
DROP POLICY IF EXISTS audit_read  ON "AuditLog";
DROP POLICY IF EXISTS audit_write ON "AuditLog";
CREATE POLICY audit_read  ON "AuditLog" FOR SELECT USING ("brandId" = current_brand_id());
CREATE POLICY audit_write ON "AuditLog" FOR INSERT WITH CHECK ("brandId" = current_brand_id());

-- Verify after applying:
--   SET app.brand_id = 'some-brand'; SELECT count(*) FROM "AuditLog";  -- scoped
--   RESET app.brand_id;              SELECT count(*) FROM "AuditLog";  -- 0 rows
