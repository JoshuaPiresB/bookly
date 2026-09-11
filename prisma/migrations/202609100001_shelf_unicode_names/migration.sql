BEGIN;

-- A collation C do ambiente local só convertia letras ASCII. PostgreSQL 17
-- oferece pg_c_utf8, cujo lower é Unicode e independente da localidade do SO.
CREATE FUNCTION bookly_normalize_shelf_name(value text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT lower(regexp_replace(btrim(normalize(value, NFC)), '\s+', ' ', 'g') COLLATE "pg_c_utf8");
$$;

-- Não apagar/mesclar dados caso uma base existente tenha nomes equivalentes.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Shelf" GROUP BY "userId", bookly_normalize_shelf_name("name") HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Há estantes com nomes equivalentes. Renomeie-as antes de aplicar esta migration.';
  END IF;
END $$;

ALTER TABLE "Shelf" DROP CONSTRAINT "Shelf_normalized_name_valid";
UPDATE "Shelf" SET "normalizedName" = bookly_normalize_shelf_name("name") WHERE "normalizedName" IS DISTINCT FROM bookly_normalize_shelf_name("name");
ALTER TABLE "Shelf" ADD CONSTRAINT "Shelf_normalized_name_valid" CHECK ("normalizedName" = bookly_normalize_shelf_name("name"));

CREATE FUNCTION normalize_shelf_name_on_write() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW."normalizedName" := bookly_normalize_shelf_name(NEW."name");
  RETURN NEW;
END;
$$;
CREATE TRIGGER "Shelf_normalize_name" BEFORE INSERT OR UPDATE OF "name", "normalizedName" ON "Shelf"
FOR EACH ROW EXECUTE FUNCTION normalize_shelf_name_on_write();

COMMIT;
