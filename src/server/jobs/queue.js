import { prisma } from "@/lib/db/prisma";
import { processWaMessage } from "@/lib/whatsapp/processor";
import { backoffMs, MAX_ATTEMPTS } from "./backoff";
import { markAbandoned } from "./maintenance";
const CONCURRENCY = 5;
/** Idempotent: a repeated dedupeKey (Meta retrying the same webhook) is silently skipped. */
export async function enqueueMany(jobs) {
    if (!jobs.length)
        return;
    await prisma.job.createMany({ data: jobs.map((j) => ({ ...j, payload: j.payload })), skipDuplicates: true });
}
/**
 * Atomically takes the oldest runnable job. SKIP LOCKED lets many workers/instances poll safely.
 * Jobs of the same groupKey (one customer's chat) never run in parallel, so replies stay in order.
 * A job stuck in PROCESSING for 5+ minutes (crashed worker) becomes claimable again.
 * Time is computed in the DB as naive UTC to match how Prisma stores DateTime.
 */
async function claim() {
    const rows = await prisma.$queryRaw `
    UPDATE "Job" SET "status" = 'PROCESSING', "lockedAt" = (NOW() AT TIME ZONE 'UTC'), "attempts" = "attempts" + 1
    WHERE "id" = (
      SELECT j."id" FROM "Job" j
      WHERE ((j."status" = 'PENDING' AND j."runAt" <= (NOW() AT TIME ZONE 'UTC'))
          OR (j."status" = 'PROCESSING' AND j."lockedAt" < (NOW() AT TIME ZONE 'UTC') - INTERVAL '5 minutes'))
        AND NOT EXISTS (
          SELECT 1 FROM "Job" o
          WHERE o."groupKey" = j."groupKey" AND o."id" <> j."id" AND o."status" = 'PROCESSING'
            AND o."lockedAt" >= (NOW() AT TIME ZONE 'UTC') - INTERVAL '5 minutes')
      ORDER BY j."createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1)
    RETURNING "id", "type", "payload", "attempts"`;
    return rows[0] ?? null;
}
async function run(job) {
    try {
        if (job.type === "wa_message")
            await processWaMessage(job.payload);
        else
            throw new Error(`unknown job type ${job.type}`);
        await prisma.job.update({ where: { id: job.id }, data: { status: "DONE", lastError: null } });
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[jobs] ${job.type} ${job.id} failed (attempt ${job.attempts}/${MAX_ATTEMPTS}):`, msg);
        const dead = job.attempts >= MAX_ATTEMPTS;
        await prisma.job.update({
            where: { id: job.id },
            data: dead ? { status: "FAILED", lastError: msg.slice(0, 500) }
                : { status: "PENDING", lastError: msg.slice(0, 500), runAt: new Date(Date.now() + backoffMs(job.attempts)) },
        });
    }
}
let active = 0;
/** Starts up to CONCURRENCY workers in this process; each loops until nothing is runnable. Safe to call often. */
export async function drain() {
    const workers = [];
    while (active < CONCURRENCY) {
        active++;
        workers.push((async () => {
            try {
                while (true) {
                    let job;
                    try {
                        job = await claim();
                    }
                    catch (e) {
                        const msg = e instanceof Error ? e.message : String(e);
                        console.error("[jobs] claim failed (db unavailable):", msg);
                        await new Promise((resolve) => setTimeout(resolve, 3000));
                        continue;
                    }
                    if (!job)
                        return;
                    await run(job);
                }
            }
            finally {
                active--;
            }
        })());
    }
    await Promise.all(workers);
}
export async function cleanup() {
    await markAbandoned();
    const week = new Date(Date.now() - 7 * 864e5);
    await prisma.job.deleteMany({ where: { status: "DONE", updatedAt: { lt: week } } });
    await prisma.passwordResetOtp.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 864e5) } } }); // codes and reset sessions are long expired after a day
}
