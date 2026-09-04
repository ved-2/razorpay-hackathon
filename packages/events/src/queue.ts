import { JobDefinition, JobWorker } from "./types.js";

export class JobQueue {
  private workers = new Map<string, JobWorker>();
  private inMemoryQueue: JobDefinition[] = [];
  private isProcessing = false;

  registerWorker<T extends Record<string, unknown>>(
    jobName: string,
    worker: JobWorker<T>
  ) {
    this.workers.set(jobName, worker as JobWorker);
  }

  async enqueue<T extends Record<string, unknown>>(
    name: string,
    merchantId: string,
    data: T
  ): Promise<string> {
    const job: JobDefinition<T> = {
      id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name,
      merchantId,
      data,
      enqueuedAt: new Date().toISOString(),
    };

    this.inMemoryQueue.push(job as JobDefinition);
    void this.processNext();

    return job.id;
  }

  private async processNext() {
    if (this.isProcessing || this.inMemoryQueue.length === 0) return;
    this.isProcessing = true;

    while (this.inMemoryQueue.length > 0) {
      const job = this.inMemoryQueue.shift()!;
      const worker = this.workers.get(job.name);
      if (worker) {
        try {
          await worker(job);
        } catch (err) {
          console.error(`Job worker failed for job ${job.name} (${job.id}):`, err);
        }
      }
    }

    this.isProcessing = false;
  }

  getPendingCount(): number {
    return this.inMemoryQueue.length;
  }
}

export const jobQueue = new JobQueue();
