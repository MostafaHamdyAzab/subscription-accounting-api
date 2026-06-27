import { startMonthlyInvoicesCronJob } from "./monthlyInvoices.job.js";

export function startCronJobs() {
  startMonthlyInvoicesCronJob();
}
