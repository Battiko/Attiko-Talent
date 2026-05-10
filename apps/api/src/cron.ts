import { bulkEnrichMissing, bulkEnrichSocial } from "./services/enrich.js";
import { logger } from "./logger.js";

function scheduleDaily(utcHour: number, task: () => Promise<void>): void {
  function scheduleNext() {
    const now = new Date();
    const next = new Date();
    next.setUTCHours(utcHour, 0, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    const delay = next.getTime() - now.getTime();
    setTimeout(async () => {
      try { await task(); } catch (err) { logger.error({ err }, "Cron task failed"); }
      scheduleNext();
    }, delay);
    logger.info({ nextRunAt: next.toISOString() }, "Nightly enrichment scheduled");
  }
  scheduleNext();
}

export function startCronJobs(): void {
  scheduleDaily(2, async () => {
    logger.info("Nightly enrichment started");
    const [images, bios, social] = await Promise.allSettled([
      bulkEnrichMissing("image", 30),
      bulkEnrichMissing("bio", 30),
      bulkEnrichSocial(25),
    ]);
    logger.info({ images, bios, social }, "Nightly enrichment complete");
  });
}
