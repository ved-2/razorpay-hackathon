import { CommerceEvent, CommerceEventType, EventHandler } from "./types.js";
export declare class EventBus {
    private redisPub?;
    private redisSub?;
    private localHandlers;
    private useRedis;
    constructor(redisUrl?: string);
    publish<T extends Record<string, unknown>>(type: CommerceEventType, merchantId: string, payload: T): Promise<CommerceEvent<T>>;
    subscribe<T extends Record<string, unknown>>(type: CommerceEventType, handler: EventHandler<T>): () => void;
}
export declare const eventBus: EventBus;
