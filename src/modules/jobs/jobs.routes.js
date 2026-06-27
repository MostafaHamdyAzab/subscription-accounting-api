import express from "express";
import prisma from "../../config/prisma.js";
import { generateMonthlyInvoices } from "../invoices/invoices.service.js";

const router = express.Router();

function getCurrentBillingMonth() {
  const now = new Date();

  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

router.get("/monthly-invoices", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized cron request",
      });
    }

    const month = getCurrentBillingMonth();

    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
      },
    });

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
      } catch (error) {
        results.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          success: false,
          error: error.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Monthly invoices cron executed successfully",
      month,
      tenantsCount: tenants.length,
      results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Monthly invoices cron failed",
      error: error.message,
    });
  }
});

export default router;
