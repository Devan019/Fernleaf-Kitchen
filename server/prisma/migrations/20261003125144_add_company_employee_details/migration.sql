-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "billingContactEmail" TEXT,
ADD COLUMN     "billingContactName" TEXT,
ADD COLUMN     "billingContactPhone" TEXT,
ADD COLUMN     "defaultDeliveryTime" TEXT,
ADD COLUMN     "defaultDriverId" TEXT,
ADD COLUMN     "defaultPackagingType" TEXT,
ADD COLUMN     "leaveKitchenMinutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "standingDriverInstructions" TEXT,
ADD COLUMN     "workingDays" "DayOfWeek"[] DEFAULT ARRAY['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']::"DayOfWeek"[];

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "canChangeDeliveryTime" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canChangePackaging" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canChooseDeliveryAddress" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CompanyEmailDomain" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyEmailDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryAddress" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "label" TEXT,
    "street" TEXT NOT NULL,
    "unit" TEXT,
    "city" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "deliveryInstructions" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyHoliday" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AllergenToEmployee" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AllergenToEmployee_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DietaryTagToEmployee" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DietaryTagToEmployee_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyEmailDomain_domain_key" ON "CompanyEmailDomain"("domain");

-- CreateIndex
CREATE INDEX "CompanyEmailDomain_companyId_idx" ON "CompanyEmailDomain"("companyId");

-- CreateIndex
CREATE INDEX "DeliveryAddress_companyId_idx" ON "DeliveryAddress"("companyId");

-- CreateIndex
CREATE INDEX "CompanyHoliday_companyId_idx" ON "CompanyHoliday"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyHoliday_companyId_date_key" ON "CompanyHoliday"("companyId", "date");

-- CreateIndex
CREATE INDEX "_AllergenToEmployee_B_index" ON "_AllergenToEmployee"("B");

-- CreateIndex
CREATE INDEX "_DietaryTagToEmployee_B_index" ON "_DietaryTagToEmployee"("B");

-- CreateIndex
CREATE INDEX "Company_ownerId_idx" ON "Company"("ownerId");

-- CreateIndex
CREATE INDEX "Company_defaultDriverId_idx" ON "Company"("defaultDriverId");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_defaultDriverId_fkey" FOREIGN KEY ("defaultDriverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyEmailDomain" ADD CONSTRAINT "CompanyEmailDomain_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAddress" ADD CONSTRAINT "DeliveryAddress_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyHoliday" ADD CONSTRAINT "CompanyHoliday_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AllergenToEmployee" ADD CONSTRAINT "_AllergenToEmployee_A_fkey" FOREIGN KEY ("A") REFERENCES "Allergen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AllergenToEmployee" ADD CONSTRAINT "_AllergenToEmployee_B_fkey" FOREIGN KEY ("B") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DietaryTagToEmployee" ADD CONSTRAINT "_DietaryTagToEmployee_A_fkey" FOREIGN KEY ("A") REFERENCES "DietaryTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DietaryTagToEmployee" ADD CONSTRAINT "_DietaryTagToEmployee_B_fkey" FOREIGN KEY ("B") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
