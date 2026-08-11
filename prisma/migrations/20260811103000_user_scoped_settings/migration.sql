-- Make settings user-owned and migrate existing global settings safely.
ALTER TABLE "settings"
ADD COLUMN "userId" TEXT;

DO $$
DECLARE
  owner_id TEXT;
  borrower_owner_count INTEGER;
  user_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT "userId")
  INTO borrower_owner_count
  FROM "borrowers";

  IF borrower_owner_count = 1 THEN
    SELECT DISTINCT "userId"
    INTO owner_id
    FROM "borrowers"
    LIMIT 1;
  ELSIF borrower_owner_count = 0 THEN
    SELECT COUNT(*)
    INTO user_count
    FROM "users";

    IF user_count = 1 THEN
      SELECT "id"
      INTO owner_id
      FROM "users"
      LIMIT 1;
    ELSE
      RAISE EXCEPTION 'Cannot migrate settings ownership safely: found % users and no borrowers. Manual mapping required.', user_count;
    END IF;
  ELSE
    RAISE EXCEPTION 'Cannot migrate settings ownership safely: found % distinct borrower owners. Manual mapping required before migration.', borrower_owner_count;
  END IF;

  UPDATE "settings"
  SET "userId" = owner_id
  WHERE "userId" IS NULL;
END $$;

ALTER TABLE "settings"
ALTER COLUMN "userId" SET NOT NULL;

DROP INDEX IF EXISTS "settings_key_key";

CREATE INDEX "settings_userId_idx" ON "settings"("userId");
CREATE UNIQUE INDEX "settings_userId_key_key" ON "settings"("userId", "key");

ALTER TABLE "settings"
ADD CONSTRAINT "settings_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
