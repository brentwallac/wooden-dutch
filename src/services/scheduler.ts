import { Cron } from "croner";
import type { Config } from "../config.js";

export function startScheduler(
  config: Config,
  job: () => Promise<void>,
): Cron {
  console.log(
    `Scheduler started: "${config.scheduler.cronSchedule}" (${config.scheduler.timezone})`,
  );

  const cron = new Cron(config.scheduler.cronSchedule, {
    timezone: config.scheduler.timezone,
  }, async () => {
    console.log(`[${new Date().toISOString()}] Scheduled run starting...`);
    try {
      await job();
      console.log(`[${new Date().toISOString()}] Scheduled run complete`);
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Scheduled run failed:`,
        error instanceof Error ? error.message : error,
      );
    }
  });

  const next = cron.nextRun();
  if (next) {
    console.log(`Next run: ${next.toISOString()}`);
  }

  return cron;
}
