import "dotenv/config";
import app from "./app.js";
import { startCronJobs } from "./jobs/index.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  // i stop it since the vercel not support it here
  // startCronJobs(); //cron-job
});
