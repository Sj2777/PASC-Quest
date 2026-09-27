-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "awardedPoints" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0;
