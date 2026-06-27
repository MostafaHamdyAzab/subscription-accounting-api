import express from "express";
import cors from "cors";
import prisma from "./config/prisma.js";
import authRoutes from "./modules/auth/auth.routes.js";
import plansRoutes from "./modules/plans/plans.routes.js";
import customersRoutes from "./modules/customers/customers.routes.js";
import subscriptionsRoutes from "./modules/subscriptions/subscriptions.routes.js";
import invoicesRoutes from "./modules/invoices/invoices.routes.js";
import paymentsRoutes from "./modules/payments/payments.routes.js";
import revenueRecognitionRoutes from "./modules/revenue-recognition/revenueRecognition.routes.js";
import reportsRoutes from "./modules/reports/reports.routes.js";
import accountingRoutes from "./modules/accounting/accounting.routes.js";
import jobsRoutes from "./modules/jobs/jobs.routes.js";
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Subscription Accounting API is running",
  });
});

app.get("/health/db", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      message: "Database connection is working",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/plans", plansRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);
app.use("/api/invoices", invoicesRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/revenue-recognition", revenueRecognitionRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/accounting", accountingRoutes);
app.use("/api/jobs", jobsRoutes);
export default app;
