CREATE TABLE "PortfolioAttachment" (
    "id" SERIAL NOT NULL,
    "portfolioId" INTEGER NOT NULL,
    "s3Key" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PortfolioAttachment_portfolioId_idx" ON "PortfolioAttachment"("portfolioId");

ALTER TABLE "PortfolioAttachment" ADD CONSTRAINT "PortfolioAttachment_portfolioId_fkey"
  FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
