-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domain" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "installedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DeliverySettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 2,
    "cutoffTime" TEXT,
    "maxDaysAhead" INTEGER NOT NULL DEFAULT 30,
    "blackoutDates" TEXT NOT NULL DEFAULT '[]',
    "blackoutWeekdays" TEXT NOT NULL DEFAULT '[]',
    "giftMessageEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeliverySettings_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollectionRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "settingsId" TEXT NOT NULL,
    "collectionGid" TEXT NOT NULL,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 2,
    "blackoutDates" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "CollectionRule_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "DeliverySettings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeliveryRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "shopifyOrderName" TEXT NOT NULL,
    "deliveryDate" DATETIME NOT NULL,
    "giftMessage" TEXT NOT NULL DEFAULT '',
    "customerName" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeliveryRecord_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_domain_key" ON "Shop"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "DeliverySettings_shopId_key" ON "DeliverySettings"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryRecord_shopifyOrderId_key" ON "DeliveryRecord"("shopifyOrderId");
