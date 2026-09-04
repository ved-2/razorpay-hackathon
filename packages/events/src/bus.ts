import { Redis } from "ioredis";
import { CommerceEvent, CommerceEventType, EventHandler } from "./types.js";

export class EventBus {
  private redisPub?: Redis;
  private redisSub?: Redis;
  private localHandlers = new Map<CommerceEventType, Set<EventHandler>>();
  private useRedis: boolean;

  constructor(redisUrl?: string) {
    const url = redisUrl || process.env.REDIS_URL;
    if (url && process.env.NODE_ENV !== "test") {
      try {
        this.redisPub = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
        this.redisSub = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
        this.useRedis = true;
      } catch {
        this.useRedis = false;
      }
    } else {
      this.useRedis = false;
    }
  }

  async publish<T extends Record<string, unknown>>(
    type: CommerceEventType,
    merchantId: string,
    payload: T
  ): Promise<CommerceEvent<T>> {
    const event: CommerceEvent<T> = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type,
      merchantId,
      timestamp: new Date().toISOString(),
      payload,
    };

    const handlers = this.localHandlers.get(type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(event as any);
        } catch (err) {
          console.error(`Error in local handler for event ${type}:`, err);
        }
      }
    }

    if (this.useRedis && this.redisPub) {
      try {
        await this.redisPub.publish(`commerceos:events:${type}`, JSON.stringify(event));
      } catch {
        // Safe fallback
      }
    }

    return event;
  }

  subscribe<T extends Record<string, unknown>>(
    type: CommerceEventType,
    handler: EventHandler<T>
  ): () => void {
    let set = this.localHandlers.get(type);
    if (!set) {
      set = new Set();
      this.localHandlers.set(type, set);
    }
    set.add(handler as EventHandler);

    return () => {
      set?.delete(handler as EventHandler);
    };
  }
}

export const eventBus = new EventBus();
