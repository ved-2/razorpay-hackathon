import { JobWorker } from "./types.js";
export declare class JobQueue {
    private workers;
    private inMemoryQueue;
    private isProcessing;
    registerWorker<T extends Record<string, unknown>>(jobName: string, worker: JobWorker<T>): void;
    enqueue<T extends Record<string, unknown>>(name: string, merchantId: string, data: T): Promise<string>;
    private processNext;
    getPendingCount(): number;
}
export declare const jobQueue: JobQueue;
