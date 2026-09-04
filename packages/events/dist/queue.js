"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobQueue = exports.JobQueue = void 0;
class JobQueue {
    workers = new Map();
    inMemoryQueue = [];
    isProcessing = false;
    registerWorker(jobName, worker) {
        this.workers.set(jobName, worker);
    }
    async enqueue(name, merchantId, data) {
        const job = {
            id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            name,
            merchantId,
            data,
            enqueuedAt: new Date().toISOString(),
        };
        this.inMemoryQueue.push(job);
        void this.processNext();
        return job.id;
    }
    async processNext() {
        if (this.isProcessing || this.inMemoryQueue.length === 0)
            return;
        this.isProcessing = true;
        while (this.inMemoryQueue.length > 0) {
            const job = this.inMemoryQueue.shift();
            const worker = this.workers.get(job.name);
            if (worker) {
                try {
                    await worker(job);
                }
                catch (err) {
                    console.error(`Job worker failed for job ${job.name} (${job.id}):`, err);
                }
            }
        }
        this.isProcessing = false;
    }
    getPendingCount() {
        return this.inMemoryQueue.length;
    }
}
exports.JobQueue = JobQueue;
exports.jobQueue = new JobQueue();
