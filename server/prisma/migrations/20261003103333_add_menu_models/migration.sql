-- CreateTable
CREATE TABLE "MenuCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryDish" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryDish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyHiddenCategory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyHiddenCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyHiddenDish" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyHiddenDish_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MenuCategory_name_key" ON "MenuCategory"("name");

-- CreateIndex
CREATE INDEX "MenuCategory_displayOrder_idx" ON "MenuCategory"("displayOrder");

-- CreateIndex
CREATE INDEX "MenuCategory_isActive_idx" ON "MenuCategory"("isActive");

-- CreateIndex
CREATE INDEX "MenuCategory_isSecret_idx" ON "MenuCategory"("isSecret");

-- CreateIndex
CREATE INDEX "CategoryDish_categoryId_idx" ON "CategoryDish"("categoryId");

-- CreateIndex
CREATE INDEX "CategoryDish_dishId_idx" ON "CategoryDish"("dishId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryDish_categoryId_dishId_key" ON "CategoryDish"("categoryId", "dishId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryDish_categoryId_displayOrder_key" ON "CategoryDish"("categoryId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE INDEX "Company_name_idx" ON "Company"("name");

-- CreateIndex
CREATE INDEX "Company_isActive_idx" ON "Company"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

-- CreateIndex
CREATE INDEX "Employee_companyId_idx" ON "Employee"("companyId");

-- CreateIndex
CREATE INDEX "Employee_isActive_idx" ON "Employee"("isActive");

-- CreateIndex
CREATE INDEX "CompanyHiddenCategory_companyId_idx" ON "CompanyHiddenCategory"("companyId");

-- CreateIndex
CREATE INDEX "CompanyHiddenCategory_categoryId_idx" ON "CompanyHiddenCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyHiddenCategory_companyId_categoryId_key" ON "CompanyHiddenCategory"("companyId", "categoryId");

-- CreateIndex
CREATE INDEX "CompanyHiddenDish_companyId_idx" ON "CompanyHiddenDish"("companyId");

-- CreateIndex
CREATE INDEX "CompanyHiddenDish_dishId_idx" ON "CompanyHiddenDish"("dishId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyHiddenDish_companyId_dishId_key" ON "CompanyHiddenDish"("companyId", "dishId");

-- AddForeignKey
ALTER TABLE "CategoryDish" ADD CONSTRAINT "CategoryDish_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MenuCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryDish" ADD CONSTRAINT "CategoryDish_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyHiddenCategory" ADD CONSTRAINT "CompanyHiddenCategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyHiddenCategory" ADD CONSTRAINT "CompanyHiddenCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MenuCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyHiddenDish" ADD CONSTRAINT "CompanyHiddenDish_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyHiddenDish" ADD CONSTRAINT "CompanyHiddenDish_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;
