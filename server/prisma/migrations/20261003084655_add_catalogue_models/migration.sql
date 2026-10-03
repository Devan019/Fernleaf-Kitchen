-- CreateEnum
CREATE TYPE "DishTemperature" AS ENUM ('HOT', 'COLD');

-- CreateTable
CREATE TABLE "Dish" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "sku" TEXT NOT NULL,
    "temperature" "DishTemperature" NOT NULL,
    "costPrice" DECIMAL(10,2) NOT NULL,
    "minimumOrderQuantity" INTEGER,
    "kitchenStationId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Option" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "costPrice" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptionGroup" (
    "id" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL,
    "usesPortions" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptionGroupOption" (
    "id" TEXT NOT NULL,
    "optionGroupId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptionGroupOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Allergen" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Allergen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DietaryTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DietaryTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KitchenStation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KitchenStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortionSize" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortionSize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptionGroupPortion" (
    "id" TEXT NOT NULL,
    "optionGroupId" TEXT NOT NULL,
    "portionSizeId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptionGroupPortion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptionPortion" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "portionSizeId" TEXT NOT NULL,
    "extraCharge" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptionPortion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AllergenToDish" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AllergenToDish_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AllergenToOption" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AllergenToOption_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DietaryTagToDish" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DietaryTagToDish_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DietaryTagToOption" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DietaryTagToOption_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dish_sku_key" ON "Dish"("sku");

-- CreateIndex
CREATE INDEX "Dish_name_idx" ON "Dish"("name");

-- CreateIndex
CREATE INDEX "Dish_sku_idx" ON "Dish"("sku");

-- CreateIndex
CREATE INDEX "Dish_isActive_idx" ON "Dish"("isActive");

-- CreateIndex
CREATE INDEX "Dish_kitchenStationId_idx" ON "Dish"("kitchenStationId");

-- CreateIndex
CREATE INDEX "Option_name_idx" ON "Option"("name");

-- CreateIndex
CREATE INDEX "Option_isActive_idx" ON "Option"("isActive");

-- CreateIndex
CREATE INDEX "OptionGroup_dishId_idx" ON "OptionGroup"("dishId");

-- CreateIndex
CREATE UNIQUE INDEX "OptionGroup_dishId_displayOrder_key" ON "OptionGroup"("dishId", "displayOrder");

-- CreateIndex
CREATE INDEX "OptionGroupOption_optionGroupId_idx" ON "OptionGroupOption"("optionGroupId");

-- CreateIndex
CREATE INDEX "OptionGroupOption_optionId_idx" ON "OptionGroupOption"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "OptionGroupOption_optionGroupId_optionId_key" ON "OptionGroupOption"("optionGroupId", "optionId");

-- CreateIndex
CREATE UNIQUE INDEX "OptionGroupOption_optionGroupId_displayOrder_key" ON "OptionGroupOption"("optionGroupId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Allergen_name_key" ON "Allergen"("name");

-- CreateIndex
CREATE INDEX "Allergen_name_idx" ON "Allergen"("name");

-- CreateIndex
CREATE INDEX "Allergen_isActive_idx" ON "Allergen"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DietaryTag_name_key" ON "DietaryTag"("name");

-- CreateIndex
CREATE INDEX "DietaryTag_name_idx" ON "DietaryTag"("name");

-- CreateIndex
CREATE INDEX "DietaryTag_isActive_idx" ON "DietaryTag"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "KitchenStation_name_key" ON "KitchenStation"("name");

-- CreateIndex
CREATE INDEX "KitchenStation_name_idx" ON "KitchenStation"("name");

-- CreateIndex
CREATE INDEX "KitchenStation_isActive_idx" ON "KitchenStation"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PortionSize_name_key" ON "PortionSize"("name");

-- CreateIndex
CREATE INDEX "PortionSize_name_idx" ON "PortionSize"("name");

-- CreateIndex
CREATE INDEX "PortionSize_isActive_idx" ON "PortionSize"("isActive");

-- CreateIndex
CREATE INDEX "OptionGroupPortion_optionGroupId_idx" ON "OptionGroupPortion"("optionGroupId");

-- CreateIndex
CREATE INDEX "OptionGroupPortion_portionSizeId_idx" ON "OptionGroupPortion"("portionSizeId");

-- CreateIndex
CREATE UNIQUE INDEX "OptionGroupPortion_optionGroupId_portionSizeId_key" ON "OptionGroupPortion"("optionGroupId", "portionSizeId");

-- CreateIndex
CREATE UNIQUE INDEX "OptionGroupPortion_optionGroupId_displayOrder_key" ON "OptionGroupPortion"("optionGroupId", "displayOrder");

-- CreateIndex
CREATE INDEX "OptionPortion_optionId_idx" ON "OptionPortion"("optionId");

-- CreateIndex
CREATE INDEX "OptionPortion_portionSizeId_idx" ON "OptionPortion"("portionSizeId");

-- CreateIndex
CREATE UNIQUE INDEX "OptionPortion_optionId_portionSizeId_key" ON "OptionPortion"("optionId", "portionSizeId");

-- CreateIndex
CREATE INDEX "_AllergenToDish_B_index" ON "_AllergenToDish"("B");

-- CreateIndex
CREATE INDEX "_AllergenToOption_B_index" ON "_AllergenToOption"("B");

-- CreateIndex
CREATE INDEX "_DietaryTagToDish_B_index" ON "_DietaryTagToDish"("B");

-- CreateIndex
CREATE INDEX "_DietaryTagToOption_B_index" ON "_DietaryTagToOption"("B");

-- AddForeignKey
ALTER TABLE "Dish" ADD CONSTRAINT "Dish_kitchenStationId_fkey" FOREIGN KEY ("kitchenStationId") REFERENCES "KitchenStation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionGroup" ADD CONSTRAINT "OptionGroup_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionGroupOption" ADD CONSTRAINT "OptionGroupOption_optionGroupId_fkey" FOREIGN KEY ("optionGroupId") REFERENCES "OptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionGroupOption" ADD CONSTRAINT "OptionGroupOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "Option"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionGroupPortion" ADD CONSTRAINT "OptionGroupPortion_optionGroupId_fkey" FOREIGN KEY ("optionGroupId") REFERENCES "OptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionGroupPortion" ADD CONSTRAINT "OptionGroupPortion_portionSizeId_fkey" FOREIGN KEY ("portionSizeId") REFERENCES "PortionSize"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionPortion" ADD CONSTRAINT "OptionPortion_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "Option"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionPortion" ADD CONSTRAINT "OptionPortion_portionSizeId_fkey" FOREIGN KEY ("portionSizeId") REFERENCES "PortionSize"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AllergenToDish" ADD CONSTRAINT "_AllergenToDish_A_fkey" FOREIGN KEY ("A") REFERENCES "Allergen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AllergenToDish" ADD CONSTRAINT "_AllergenToDish_B_fkey" FOREIGN KEY ("B") REFERENCES "Dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AllergenToOption" ADD CONSTRAINT "_AllergenToOption_A_fkey" FOREIGN KEY ("A") REFERENCES "Allergen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AllergenToOption" ADD CONSTRAINT "_AllergenToOption_B_fkey" FOREIGN KEY ("B") REFERENCES "Option"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DietaryTagToDish" ADD CONSTRAINT "_DietaryTagToDish_A_fkey" FOREIGN KEY ("A") REFERENCES "DietaryTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DietaryTagToDish" ADD CONSTRAINT "_DietaryTagToDish_B_fkey" FOREIGN KEY ("B") REFERENCES "Dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DietaryTagToOption" ADD CONSTRAINT "_DietaryTagToOption_A_fkey" FOREIGN KEY ("A") REFERENCES "DietaryTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DietaryTagToOption" ADD CONSTRAINT "_DietaryTagToOption_B_fkey" FOREIGN KEY ("B") REFERENCES "Option"("id") ON DELETE CASCADE ON UPDATE CASCADE;
