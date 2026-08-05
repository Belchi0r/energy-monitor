BEGIN;

-- Prevent writes while the ownership and uniqueness checks are running.
LOCK TABLE "Device" IN SHARE ROW EXCLUSIVE MODE;

-- Preserve all rows and fail before changing constraints when ownership
-- or per-user name uniqueness cannot be enforced safely.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Device"
    WHERE "userId" IS NULL
  ) THEN
    RAISE EXCEPTION
      'Device.userId contains NULL values; backfill ownership before applying this migration.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Device"
    GROUP BY "userId", lower(btrim("name"))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Duplicate device names exist within the same owner scope; resolve them before applying this migration.';
  END IF;
END $$;

-- Replace global uniqueness with ownership-scoped, case-insensitive
-- and whitespace-normalized uniqueness.
DROP INDEX "Device_name_key";

ALTER TABLE "Device"
ALTER COLUMN "userId" SET NOT NULL;

-- Prisma Schema cannot represent PostgreSQL expression indexes,
-- so this index is intentionally managed by the migration SQL.
CREATE UNIQUE INDEX "Device_userId_name_ci_key"
ON "Device" ("userId", lower(btrim("name")));

COMMIT;