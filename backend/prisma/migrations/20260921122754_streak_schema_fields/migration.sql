/*
  Warnings:

  - You are about to drop the column `lastAnsweredDate` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `streakFreezeUsed` on the `Student` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Student" DROP COLUMN "lastAnsweredDate",
DROP COLUMN "streakFreezeUsed",
ADD COLUMN     "comebackActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "comebackProgress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastCorrectDate" TIMESTAMP(3),
ADD COLUMN     "preBreakStreak" INTEGER NOT NULL DEFAULT 0;
