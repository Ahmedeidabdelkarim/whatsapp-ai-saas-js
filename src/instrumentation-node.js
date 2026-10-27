import { drain, cleanup } from "@/server/jobs/queue";
// Long-running server (npm run dev / next start / Docker): poll the queue every 3s so retries happen.
// On serverless hosts (Vercel) there is no long-lived process: set JOB_WORKER=off and call /api/jobs/run from a cron.
const g = globalThis;
if (process.env.JOB_WORKER !== "off" && !g.__jobWorker) {
    g.__jobWorker = true;
    setInterval(() => drain().catch((e) => console.error("[jobs] drain error", e)), 3_000);
    setInterval(() => cleanup().catch((e) => console.error("[jobs] cleanup error", e)), 60_000);
    console.log("[jobs] worker started (polling every 3s)");
}
