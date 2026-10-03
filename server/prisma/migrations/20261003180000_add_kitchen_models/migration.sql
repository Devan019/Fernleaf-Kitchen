-- CreateEnum
CREATE TYPE "KitchenUnitStatus" AS ENUM ('PENDING', 'STARTED', 'DONE');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "kitchenReadyAt" TIMESTAMP(3),
ADD COLUMN     "kitchenStartedAt" TIMESTAMP(3),
ADD COLUMN     "plannedDispatchReadyAt" TIMESTAMP(3),
ADD COLUMN     "plannedKitchenReadyAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "KitchenUnit" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderLineId" TEXT NOT NULL,
    "combinationId" TEXT NOT NULL,
    "kitchenStationId" TEXT,
    "status" "KitchenUnitStatus" NOT NULL DEFAULT 'PENDING',
    "quantity" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "startedByUserId" TEXT,
    "completedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KitchenUnit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KitchenUnit_combinationId_key" ON "KitchenUnit"("combinationId");

-- CreateIndex
CREATE INDEX "KitchenUnit_orderId_idx" ON "KitchenUnit"("orderId");

-- CreateIndex
CREATE INDEX "KitchenUnit_orderLineId_idx" ON "KitchenUnit"("orderLineId");

-- CreateIndex
CREATE INDEX "KitchenUnit_kitchenStationId_idx" ON "KitchenUnit"("kitchenStationId");

-- CreateIndex
CREATE INDEX "KitchenUnit_status_idx" ON "KitchenUnit"("status");

-- CreateIndex
CREATE INDEX "Order_plannedKitchenReadyAt_idx" ON "Order"("plannedKitchenReadyAt");

-- CreateIndex
CREATE INDEX "Order_kitchenReadyAt_idx" ON "Order"("kitchenReadyAt");

-- AddForeignKey
ALTER TABLE "KitchenUnit" ADD CONSTRAINT "KitchenUnit_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenUnit" ADD CONSTRAINT "KitchenUnit_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "OrderLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenUnit" ADD CONSTRAINT "KitchenUnit_combinationId_fkey" FOREIGN KEY ("combinationId") REFERENCES "OrderLineCombination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenUnit" ADD CONSTRAINT "KitchenUnit_kitchenStationId_fkey" FOREIGN KEY ("kitchenStationId") REFERENCES "KitchenStation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenUnit" ADD CONSTRAINT "KitchenUnit_startedByUserId_fkey" FOREIGN KEY ("startedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenUnit" ADD CONSTRAINT "KitchenUnit_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
