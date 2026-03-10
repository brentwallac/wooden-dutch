import { Cron } from "croner";
import type { Config } from "../config.js";

export function startScheduler(
  config: Config,
  schedule: string,
  label: string,
  job: () => Promise<void>,
): Cron {
  console.log(
    `${label} scheduler started: "${schedule}" (${config.scheduler.timezone})`,
  );

  const cron = new Cron(schedule, {
    timezone: config.scheduler.timezone,
  }, async () => {
    console.log(`[${new Date().toISOString()}] ${label} scheduled run starting...`);
    try {
      await job();
      console.log(`[${new Date().toISOString()}] ${label} scheduled run complete`);
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] ${label} scheduled run failed:`,
        error instanceof Error ? error.message : error,
      );
    }
  });

  const next = cron.nextRun();
  if (next) {
    console.log(`${label} next run: ${next.toISOString()}`);
  }

  return cron;
}
