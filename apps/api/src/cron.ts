import cron from "node-cron";
import { bulkEnrichMissing, bulkEnrichSocial } from "./services/enrich.js";
import { logger } from "./logger.js";

export function startCronJobs(): void {
  // Nightly at 2am UTC — enrich missing images, bios, and social profiles
  cron.schedule("0 2 * * *", async () => {
    logger.info("Nightly enrichment started");
    try {
      const [images, bios, social] = await Promise.allSettled([
        bulkEnrichMissing("image", 30),
        bulkEnrichMissing("bio", 30),
        bulkEnrichSocial(25),
      ]);
      logger.info({ images, bios, social }, "Nightly enrichment complete");
    } catch (err) {
      logger.error({ err }, "Nightly enrichment failed");
    }
  });

  logger.info("Cron jobs scheduled (nightly at 2am UTC)");
}
