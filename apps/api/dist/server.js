"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const app = (0, fastify_1.default)({
    logger: true,
});
app.get("/health", async () => {
    return {
        status: "ok",
        service: "commerceos-api",
    };
});
const start = async () => {
    try {
        await app.listen({
            port: 4000,
            host: "0.0.0.0",
        });
    }
    catch (error) {
        app.log.error(error);
        process.exit(1);
    }
};
start();
