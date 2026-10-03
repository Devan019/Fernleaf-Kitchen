-- CreateEnum
CREATE TYPE "PriceDerivationType" AS ENUM ('MANUAL', 'COST_MULTIPLIER', 'TIER_PERCENTAGE');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "priceTierId" TEXT;

-- CreateTable
CREATE TABLE "PriceTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "derivationType" "PriceDerivationType" NOT NULL,
    "baseTierId" TEXT,
    "multiplier" DECIMAL(10,4),
    "percentage" DECIMAL(10,2),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DishPrice" (
    "id" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DishPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptionPrice" (
    "id" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptionPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PriceTier_name_key" ON "PriceTier"("name");

-- CreateIndex
CREATE INDEX "PriceTier_name_idx" ON "PriceTier"("name");

-- CreateIndex
CREATE INDEX "PriceTier_isDefault_idx" ON "PriceTier"("isDefault");

-- CreateIndex
CREATE INDEX "PriceTier_isActive_idx" ON "PriceTier"("isActive");

-- CreateIndex
CREATE INDEX "PriceTier_baseTierId_idx" ON "PriceTier"("baseTierId");

-- CreateIndex
CREATE INDEX "DishPrice_tierId_idx" ON "DishPrice"("tierId");

-- CreateIndex
CREATE INDEX "DishPrice_dishId_idx" ON "DishPrice"("dishId");

-- CreateIndex
CREATE UNIQUE INDEX "DishPrice_tierId_dishId_key" ON "DishPrice"("tierId", "dishId");

-- CreateIndex
CREATE INDEX "OptionPrice_tierId_idx" ON "OptionPrice"("tierId");

-- CreateIndex
CREATE INDEX "OptionPrice_optionId_idx" ON "OptionPrice"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "OptionPrice_tierId_optionId_key" ON "OptionPrice"("tierId", "optionId");

-- CreateIndex
CREATE INDEX "Company_priceTierId_idx" ON "Company"("priceTierId");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_priceTierId_fkey" FOREIGN KEY ("priceTierId") REFERENCES "PriceTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceTier" ADD CONSTRAINT "PriceTier_baseTierId_fkey" FOREIGN KEY ("baseTierId") REFERENCES "PriceTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishPrice" ADD CONSTRAINT "DishPrice_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "PriceTier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishPrice" ADD CONSTRAINT "DishPrice_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionPrice" ADD CONSTRAINT "OptionPrice_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "PriceTier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionPrice" ADD CONSTRAINT "OptionPrice_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "Option"("id") ON DELETE CASCADE ON UPDATE CASCADE;
