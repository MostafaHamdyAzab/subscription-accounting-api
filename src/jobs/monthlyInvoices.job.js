import cron from "node-cron";
import prisma from "../config/prisma.js";
import { generateMonthlyInvoices } from "../modules/invoices/invoices.service.js";

function getCurrentBillingMonth() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

async function runMonthlyInvoiceGeneration() {
  const month = getCurrentBillingMonth();

  console.log(`[CRON] Monthly invoice generation started for month ${month}`);

  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  console.log(`[CRON] Tenants found: ${tenants.length}`);

  const results = [];

  for (const tenant of tenants) {
    try {
      const result = await generateMonthlyInvoices(tenant.id, { month });

      results.push({
        tenantId: tenant.id,
        tenantName: tenant.name,
        success: true,
        totalCreatedInvoices: result.totalCreatedInvoices,
        totalSkippedSubscriptions: result.totalSkippedSubscriptions,
      });

      console.log(
        `[CRON] Tenant ${tenant.name}: created ${result.totalCreatedInvoices}, skipped ${result.totalSkippedSubscriptions}`,
      );
    } catch (error) {
      results.push({
        tenantId: tenant.id,
        tenantName: tenant.name,
        success: false,
        error: error.message,
      });

      console.error(`[CRON] Tenant ${tenant.name}: failed - ${error.message}`);
    }
  }

  console.log("[CRON] Monthly invoice generation finished", results);

  return results;
}

export function startMonthlyInvoicesCronJob() {
  const isEnabled = process.env.ENABLE_CRON_JOBS === "true";

  if (!isEnabled) {
    console.log("[CRON] Monthly invoice generation job is disabled");
    return null;
  }

  const cronExpression = process.env.MONTHLY_INVOICE_CRON || "5 0 1 * *";
  const timezone = process.env.CRON_TIMEZONE || "Africa/Cairo";

  const task = cron.schedule(
    cronExpression,
    async () => {
      try {
        await runMonthlyInvoiceGeneration();
      } catch (error) {
        console.error("[CRON] Monthly invoice generation crashed", error);
      }
    },
    {
      name: "monthly-invoice-generation",
      timezone,
      noOverlap: true,
    },
  );

  console.log(
    `[CRON] Monthly invoice generation scheduled: "${cronExpression}" timezone: ${timezone}`,
  );

  return task;
}

export async function runMonthlyInvoicesNowForTesting() {
  return runMonthlyInvoiceGeneration();
}
