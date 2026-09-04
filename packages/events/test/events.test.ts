import { describe, expect, it, vi } from "vitest";
import { EventBus, JobQueue } from "../src/index.js";

describe("Commerce Events & Background Workers (@commerceos/events)", () => {
  describe("EventBus", () => {
    it("publishes and delivers events to subscribers", async () => {
      const bus = new EventBus();
      const mockHandler = vi.fn();

      const unsubscribe = bus.subscribe("order.paid", mockHandler);

      const event = await bus.publish("order.paid", "merch_123", {
        orderId: "order_abc",
        amount: 299900,
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "order.paid",
          merchantId: "merch_123",
          payload: { orderId: "order_abc", amount: 299900 },
        })
      );
      expect(event.id).toBeDefined();

      unsubscribe();
      await bus.publish("order.paid", "merch_123", { orderId: "order_def" });
      expect(mockHandler).toHaveBeenCalledTimes(1); // not called again
    });

    it("isolates handlers between different event topics", async () => {
      const bus = new EventBus();
      const orderPaidHandler = vi.fn();
      const orderCancelledHandler = vi.fn();

      bus.subscribe("order.paid", orderPaidHandler);
      bus.subscribe("order.cancelled", orderCancelledHandler);

      await bus.publish("order.cancelled", "merch_1", { orderId: "ord_1" });

      expect(orderCancelledHandler).toHaveBeenCalledTimes(1);
      expect(orderPaidHandler).not.toHaveBeenCalled();
    });
  });

  describe("JobQueue", () => {
    it("enqueues and processes background jobs asynchronously", async () => {
      const queue = new JobQueue();
      let processedJob: any = null;

      queue.registerWorker("recalculateRevenue", async (job) => {
        processedJob = job;
      });

      const jobId = await queue.enqueue("recalculateRevenue", "merch_123", {
        period: "day",
      });

      expect(jobId).toBeDefined();
      expect(processedJob).toBeDefined();
      expect(processedJob.name).toBe("recalculateRevenue");
      expect(processedJob.merchantId).toBe("merch_123");
      expect(processedJob.data).toEqual({ period: "day" });
    });
  });
});
