ALTER TABLE "User" RENAME COLUMN "nickname" TO "name";

DROP INDEX IF EXISTS "User_nickname_key";
