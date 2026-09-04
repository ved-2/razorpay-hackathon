import { eventBus, jobQueue } from "@commerceos/events";
import { getRevenueOverview } from "@commerceos/domain";

let workersInitialized = false;

export function initializeBackgroundWorkers() {
  if (workersInitialized) return;
  workersInitialized = true;

  // Background Job: Revenue Recalculation
  jobQueue.registerWorker("recalculateRevenue", async (job) => {
    try {
      await getRevenueOverview(job.merchantId);
    } catch (err) {
      console.error(`Failed to recalculate revenue for merchant ${job.merchantId}:`, err);
    }
  });

  // Event Subscriber: When order is paid, trigger background job
  eventBus.subscribe("order.paid", async (event) => {
    await jobQueue.enqueue("recalculateRevenue", event.merchantId, {
      orderId: (event.payload as any).orderId,
      trigger: "order.paid",
    });
  });
}
