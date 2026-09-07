ALTER TABLE "User"
ADD COLUMN "role" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "github" TEXT,
ADD COLUMN "company" TEXT,
ADD COLUMN "jobTitle" TEXT,
ADD COLUMN "tel" TEXT,
ADD COLUMN "university" TEXT,
ADD COLUMN "department" TEXT,
ADD COLUMN "major" TEXT,
ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
