"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const app = (0, app_1.buildApp)();
const start = async () => {
    try {
        await app.listen({
            port: env_1.env.PORT,
            host: "0.0.0.0",
        });
    }
    catch (error) {
        app.log.error(error);
        process.exit(1);
    }
};
start();
