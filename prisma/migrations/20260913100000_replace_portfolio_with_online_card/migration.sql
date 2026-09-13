-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_authorId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_portfolioId_fkey";

-- DropForeignKey
ALTER TABLE "PortfolioVersion" DROP CONSTRAINT "PortfolioVersion_portfolioId_fkey";

-- DropTable
DROP TABLE "Comment";

-- DropTable
DROP TABLE "PortfolioVersion";

-- DropEnum
DROP TYPE "ChangeType";

-- DropIndex
DROP INDEX "Portfolio_shareToken_key";

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('student', 'professor', 'professional');

-- CreateEnum
CREATE TYPE "PortfolioStatus" AS ENUM ('generating', 'draft', 'published', 'failed');

-- RenameColumn
ALTER TABLE "Portfolio" RENAME COLUMN "externalLinks" TO "sourceLinks";

-- AlterTable
ALTER TABLE "Portfolio"
DROP COLUMN "jobRole",
DROP COLUMN "careerLevel",
DROP COLUMN "directionPrompt",
DROP COLUMN "currentContentJson",
DROP COLUMN "isPublic",
DROP COLUMN "isShared",
DROP COLUMN "shareToken",
DROP COLUMN "sharedAt",
ADD COLUMN "userType" "UserType" NOT NULL DEFAULT 'professional',
ADD COLUMN "cardDesignId" TEXT NOT NULL DEFAULT 'legacy-card',
ADD COLUMN "siteDesignId" TEXT NOT NULL DEFAULT 'legacy-site',
ADD COLUMN "card" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "profile" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "blocks" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "sourceSnapshots" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "schemaVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "status" "PortfolioStatus" NOT NULL DEFAULT 'draft';

-- Remove transitional defaults after existing rows have been backfilled.
ALTER TABLE "Portfolio"
ALTER COLUMN "userType" DROP DEFAULT,
ALTER COLUMN "cardDesignId" DROP DEFAULT,
ALTER COLUMN "siteDesignId" DROP DEFAULT,
ALTER COLUMN "card" DROP DEFAULT,
ALTER COLUMN "profile" DROP DEFAULT,
ALTER COLUMN "blocks" DROP DEFAULT,
ALTER COLUMN "sourceSnapshots" DROP DEFAULT;

-- CreateTable
CREATE TABLE "PortfolioShare" (
    "id" SERIAL NOT NULL,
    "portfolioId" INTEGER NOT NULL,
    "shareId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioShare_shareId_key" ON "PortfolioShare"("shareId");

-- AddForeignKey
ALTER TABLE "PortfolioShare" ADD CONSTRAINT "PortfolioShare_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
