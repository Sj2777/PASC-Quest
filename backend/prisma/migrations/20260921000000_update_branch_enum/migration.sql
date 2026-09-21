-- AlterEnum
BEGIN;
CREATE TYPE "Branch_new" AS ENUM ('COMP', 'IT', 'AIDS', 'ENTC', 'EXTC');
ALTER TABLE "Student" ALTER COLUMN "branch" TYPE "Branch_new" USING ("branch"::text::"Branch_new");
ALTER TYPE "Branch" RENAME TO "Branch_old";
ALTER TYPE "Branch_new" RENAME TO "Branch";
DROP TYPE "Branch_old";
COMMIT;
