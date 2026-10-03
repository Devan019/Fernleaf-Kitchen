-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT IF EXISTS "Employee_userId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Employee_userId_key";

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN IF EXISTS "userId";
