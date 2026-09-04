"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBus = exports.EventBus = void 0;
const ioredis_1 = require("ioredis");
class EventBus {
    redisPub;
    redisSub;
    localHandlers = new Map();
    useRedis;
    constructor(redisUrl) {
        const url = redisUrl || process.env.REDIS_URL;
        if (url && process.env.NODE_ENV !== "test") {
            try {
                this.redisPub = new ioredis_1.Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
                this.redisSub = new ioredis_1.Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
                this.useRedis = true;
            }
            catch {
                this.useRedis = false;
            }
        }
        else {
            this.useRedis = false;
        }
    }
    async publish(type, merchantId, payload) {
        const event = {
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
                    await handler(event);
                }
                catch (err) {
                    console.error(`Error in local handler for event ${type}:`, err);
                }
            }
        }
        if (this.useRedis && this.redisPub) {
            try {
                await this.redisPub.publish(`commerceos:events:${type}`, JSON.stringify(event));
            }
            catch {
                // Safe fallback
            }
        }
        return event;
    }
    subscribe(type, handler) {
        let set = this.localHandlers.get(type);
        if (!set) {
            set = new Set();
            this.localHandlers.set(type, set);
        }
        set.add(handler);
        return () => {
            set?.delete(handler);
        };
    }
}
exports.EventBus = EventBus;
exports.eventBus = new EventBus();
