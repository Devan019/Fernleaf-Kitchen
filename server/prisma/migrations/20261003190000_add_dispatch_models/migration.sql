-- CreateEnum
CREATE TYPE "DeliveryDropStatus" AS ENUM ('KITCHEN_READY', 'DISPATCH_READY', 'OUT_FOR_DELIVERY', 'DELIVERED');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('KITCHEN_PENDING', 'KITCHEN_READY', 'DISPATCH_READY', 'OUT_FOR_DELIVERY', 'DELIVERED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "dispatchReadyAt" TIMESTAMP(3),
ADD COLUMN     "dropId" TEXT,
ADD COLUMN     "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'KITCHEN_PENDING',
ADD COLUMN     "outForDeliveryAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DeliveryDrop" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "deliveryDate" DATE NOT NULL,
    "deliveryTime" TEXT NOT NULL,
    "groupingKey" TEXT NOT NULL,
    "deliveryStreet" TEXT NOT NULL,
    "deliveryUnit" TEXT,
    "deliveryCity" TEXT NOT NULL,
    "deliveryPostcode" TEXT NOT NULL,
    "deliveryInstructions" TEXT,
    "status" "DeliveryDropStatus" NOT NULL DEFAULT 'KITCHEN_READY',
    "driverId" TEXT,
    "dispatchReadyAt" TIMESTAMP(3),
    "outForDeliveryAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "deliveredNote" TEXT,
    "deliveredPhotoUrl" TEXT,
    "isOnTime" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryDrop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DropStatusHistory" (
    "id" TEXT NOT NULL,
    "dropId" TEXT NOT NULL,
    "fromStatus" "DeliveryDropStatus",
    "toStatus" "DeliveryDropStatus" NOT NULL,
    "changedByUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DropStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryDrop_groupingKey_key" ON "DeliveryDrop"("groupingKey");

-- CreateIndex
CREATE INDEX "DeliveryDrop_deliveryDate_idx" ON "DeliveryDrop"("deliveryDate");

-- CreateIndex
CREATE INDEX "DeliveryDrop_status_idx" ON "DeliveryDrop"("status");

-- CreateIndex
CREATE INDEX "DeliveryDrop_driverId_idx" ON "DeliveryDrop"("driverId");

-- CreateIndex
CREATE INDEX "DeliveryDrop_companyId_deliveryDate_deliveryTime_idx" ON "DeliveryDrop"("companyId", "deliveryDate", "deliveryTime");

-- CreateIndex
CREATE INDEX "DropStatusHistory_dropId_idx" ON "DropStatusHistory"("dropId");

-- CreateIndex
CREATE INDEX "DropStatusHistory_createdAt_idx" ON "DropStatusHistory"("createdAt");

-- CreateIndex
CREATE INDEX "Order_dropId_idx" ON "Order"("dropId");

-- CreateIndex
CREATE INDEX "Order_fulfillmentStatus_idx" ON "Order"("fulfillmentStatus");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_dropId_fkey" FOREIGN KEY ("dropId") REFERENCES "DeliveryDrop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryDrop" ADD CONSTRAINT "DeliveryDrop_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryDrop" ADD CONSTRAINT "DeliveryDrop_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DropStatusHistory" ADD CONSTRAINT "DropStatusHistory_dropId_fkey" FOREIGN KEY ("dropId") REFERENCES "DeliveryDrop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DropStatusHistory" ADD CONSTRAINT "DropStatusHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
