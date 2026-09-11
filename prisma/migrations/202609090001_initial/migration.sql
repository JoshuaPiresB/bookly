-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ShelfType" AS ENUM ('SYSTEM', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SystemShelfKey" AS ENUM ('FAVORITES', 'WANT_TO_READ', 'READ');

-- CreateEnum
CREATE TYPE "ReadingStatus" AS ENUM ('WANT_TO_READ', 'READING', 'READ');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" UUID NOT NULL,
    "externalId" VARCHAR(128) NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "authors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "coverUrl" TEXT,
    "publisher" TEXT,
    "publishedDate" VARCHAR(32),
    "pageCount" INTEGER,
    "language" VARCHAR(32),
    "isbn10" VARCHAR(10),
    "isbn13" VARCHAR(13),
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "averageRating" DOUBLE PRECISION,
    "ratingsCount" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shelf" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "normalizedName" VARCHAR(80) NOT NULL,
    "description" VARCHAR(500),
    "type" "ShelfType" NOT NULL DEFAULT 'CUSTOM',
    "systemKey" "SystemShelfKey",
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Shelf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShelfBook" (
    "shelfId" UUID NOT NULL,
    "bookId" UUID NOT NULL,
    "addedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShelfBook_pkey" PRIMARY KEY ("shelfId","bookId")
);

-- CreateTable
CREATE TABLE "ReadingState" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "bookId" UUID NOT NULL,
    "status" "ReadingStatus" NOT NULL DEFAULT 'WANT_TO_READ',
    "currentPage" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMPTZ(3),
    "finishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ReadingState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "bookId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" VARCHAR(120),
    "content" VARCHAR(20000) NOT NULL,
    "finishedAt" DATE,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingNote" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "bookId" UUID NOT NULL,
    "page" INTEGER,
    "content" VARCHAR(20000) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ReadingNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthRateLimit" (
    "key" VARCHAR(80) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AuthRateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Book_externalId_key" ON "Book"("externalId");

-- CreateIndex
CREATE INDEX "Book_isbn10_idx" ON "Book"("isbn10");

-- CreateIndex
CREATE INDEX "Book_isbn13_idx" ON "Book"("isbn13");

-- CreateIndex
CREATE INDEX "Shelf_userId_createdAt_idx" ON "Shelf"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Shelf_userId_normalizedName_key" ON "Shelf"("userId", "normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "Shelf_userId_systemKey_key" ON "Shelf"("userId", "systemKey");

-- CreateIndex
CREATE INDEX "ShelfBook_bookId_idx" ON "ShelfBook"("bookId");

-- CreateIndex
CREATE INDEX "ShelfBook_shelfId_addedAt_idx" ON "ShelfBook"("shelfId", "addedAt");

-- CreateIndex
CREATE INDEX "ReadingState_userId_status_updatedAt_idx" ON "ReadingState"("userId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "ReadingState_bookId_idx" ON "ReadingState"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingState_userId_bookId_key" ON "ReadingState"("userId", "bookId");

-- CreateIndex
CREATE INDEX "Review_userId_createdAt_idx" ON "Review"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Review_bookId_idx" ON "Review"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_userId_bookId_key" ON "Review"("userId", "bookId");

-- CreateIndex
CREATE INDEX "ReadingNote_userId_bookId_createdAt_idx" ON "ReadingNote"("userId", "bookId", "createdAt");

-- CreateIndex
CREATE INDEX "ReadingNote_bookId_idx" ON "ReadingNote"("bookId");

-- CreateIndex
CREATE INDEX "AuthRateLimit_expiresAt_idx" ON "AuthRateLimit"("expiresAt");

-- AddForeignKey
ALTER TABLE "Shelf" ADD CONSTRAINT "Shelf_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShelfBook" ADD CONSTRAINT "ShelfBook_shelfId_fkey" FOREIGN KEY ("shelfId") REFERENCES "Shelf"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShelfBook" ADD CONSTRAINT "ShelfBook_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingState" ADD CONSTRAINT "ReadingState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingState" ADD CONSTRAINT "ReadingState_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingNote" ADD CONSTRAINT "ReadingNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingNote" ADD CONSTRAINT "ReadingNote_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Invariantes que o schema Prisma não representa: manter nesta migration SQL.
ALTER TABLE "User"
  ADD CONSTRAINT "User_name_not_blank" CHECK (length(btrim("name")) > 0),
  ADD CONSTRAINT "User_email_normalized" CHECK ("email" = lower(btrim("email"))),
  ADD CONSTRAINT "User_session_version_positive" CHECK ("sessionVersion" > 0);
ALTER TABLE "Book"
  ADD CONSTRAINT "Book_title_not_blank" CHECK (length(btrim("title")) > 0),
  ADD CONSTRAINT "Book_external_id_not_blank" CHECK (length(btrim("externalId")) > 0),
  ADD CONSTRAINT "Book_page_count_nonnegative" CHECK ("pageCount" IS NULL OR "pageCount" >= 0),
  ADD CONSTRAINT "Book_rating_valid" CHECK ("averageRating" IS NULL OR "averageRating" BETWEEN 0 AND 5),
  ADD CONSTRAINT "Book_ratings_count_nonnegative" CHECK ("ratingsCount" IS NULL OR "ratingsCount" >= 0);
ALTER TABLE "Shelf"
  ADD CONSTRAINT "Shelf_name_not_blank" CHECK (length(btrim("name")) > 0),
  ADD CONSTRAINT "Shelf_normalized_name_valid" CHECK ("normalizedName" = lower(regexp_replace(btrim("name"), '\s+', ' ', 'g'))),
  ADD CONSTRAINT "Shelf_system_key_matches_type" CHECK (
    ("type" = 'SYSTEM' AND "systemKey" IS NOT NULL) OR
    ("type" = 'CUSTOM' AND "systemKey" IS NULL)
  );
ALTER TABLE "ReadingState"
  ADD CONSTRAINT "ReadingState_page_nonnegative" CHECK ("currentPage" >= 0),
  ADD CONSTRAINT "ReadingState_dates_ordered" CHECK ("startedAt" IS NULL OR "finishedAt" IS NULL OR "finishedAt" >= "startedAt"),
  ADD CONSTRAINT "ReadingState_completion_required" CHECK ("status" <> 'READ' OR "finishedAt" IS NOT NULL);
ALTER TABLE "Review"
  ADD CONSTRAINT "Review_rating_range" CHECK ("rating" BETWEEN 1 AND 5),
  ADD CONSTRAINT "Review_content_not_blank" CHECK (length(btrim("content")) > 0);
ALTER TABLE "ReadingNote"
  ADD CONSTRAINT "ReadingNote_page_positive" CHECK ("page" IS NULL OR "page" > 0),
  ADD CONSTRAINT "ReadingNote_content_not_blank" CHECK (length(btrim("content")) > 0);
ALTER TABLE "AuthRateLimit" ADD CONSTRAINT "AuthRateLimit_attempts_positive" CHECK ("attempts" > 0);

-- Impede excluir estantes SYSTEM por SQL ou por um serviço futuro descuidado.
-- A cascata de exclusão da própria conta é permitida quando o pai já não existe.
CREATE FUNCTION protect_system_shelf() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."type" = 'SYSTEM' AND EXISTS (SELECT 1 FROM "User" WHERE "id" = OLD."userId") THEN
      RAISE EXCEPTION 'As estantes padrão não podem ser excluídas.' USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;
  IF NEW."userId" IS DISTINCT FROM OLD."userId"
     OR NEW."type" IS DISTINCT FROM OLD."type"
     OR NEW."systemKey" IS DISTINCT FROM OLD."systemKey"
     OR (OLD."type" = 'SYSTEM' AND (NEW."name" IS DISTINCT FROM OLD."name" OR NEW."normalizedName" IS DISTINCT FROM OLD."normalizedName")) THEN
    RAISE EXCEPTION 'A identidade da estante não pode ser alterada.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "Shelf_protect_system" BEFORE DELETE OR UPDATE ON "Shelf"
FOR EACH ROW EXECUTE FUNCTION protect_system_shelf();

-- O limite de páginas depende de outra tabela e exige trigger, não CHECK.
CREATE FUNCTION validate_book_page_reference() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE total integer; current_page integer;
BEGIN
  SELECT "pageCount" INTO total FROM "Book" WHERE "id" = NEW."bookId" FOR SHARE;
  IF TG_TABLE_NAME = 'ReadingState' THEN current_page := NEW."currentPage";
  ELSE current_page := NEW."page";
  END IF;
  IF total IS NOT NULL AND current_page > total THEN
    RAISE EXCEPTION 'A página não pode ultrapassar o total do livro.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "ReadingState_page_limit" BEFORE INSERT OR UPDATE ON "ReadingState"
FOR EACH ROW EXECUTE FUNCTION validate_book_page_reference();
CREATE TRIGGER "ReadingNote_page_limit" BEFORE INSERT OR UPDATE ON "ReadingNote"
FOR EACH ROW EXECUTE FUNCTION validate_book_page_reference();

CREATE FUNCTION validate_book_page_count_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."pageCount" IS NOT NULL AND NEW."pageCount" IS DISTINCT FROM OLD."pageCount" AND (
    EXISTS (SELECT 1 FROM "ReadingState" WHERE "bookId" = NEW."id" AND "currentPage" > NEW."pageCount") OR
    EXISTS (SELECT 1 FROM "ReadingNote" WHERE "bookId" = NEW."id" AND "page" > NEW."pageCount")
  ) THEN
    RAISE EXCEPTION 'O total de páginas conflita com registros existentes.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "Book_page_count_consistency" BEFORE UPDATE OF "pageCount" ON "Book"
FOR EACH ROW EXECUTE FUNCTION validate_book_page_count_update();
