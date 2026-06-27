/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,subscriptionId,periodStart]` on the table `invoices` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "invoices_tenantId_subscriptionId_periodStart_key" ON "invoices"("tenantId", "subscriptionId", "periodStart");
