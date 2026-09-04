"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = buildApp;
const fastify_1 = __importDefault(require("fastify"));
const database_1 = require("@commerceos/database");
const auth_1 = __importDefault(require("./plugins/auth"));
const register_1 = require("./routes/auth/register");
const login_1 = require("./routes/auth/login");
const me_1 = require("./routes/auth/me");
const create_1 = require("./routes/products/create");
const list_1 = require("./routes/products/list");
const get_1 = require("./routes/products/get");
const update_1 = require("./routes/products/update");
const delete_1 = require("./routes/products/delete");
const create_2 = require("./routes/variants/create");
const list_2 = require("./routes/variants/list");
const update_2 = require("./routes/variants/update");
const delete_2 = require("./routes/variants/delete");
const inventory_1 = require("./routes/variants/inventory");
const create_3 = __importDefault(require("./routes/orders/create"));
const cancel_1 = __importDefault(require("./routes/orders/cancel"));
const payment_1 = __importDefault(require("./routes/orders/payment"));
const verify_payment_1 = __importDefault(require("./routes/orders/verify-payment"));
const cors_1 = __importDefault(require("@fastify/cors"));
const fastify_raw_body_1 = __importDefault(require("fastify-raw-body"));
const razorpay_1 = __importDefault(require("./routes/webhooks/razorpay"));
const overview_1 = __importDefault(require("./routes/revenue/overview"));
const opportunities_1 = __importDefault(require("./routes/revenue/opportunities"));
function buildApp() {
    const app = (0, fastify_1.default)({
        logger: false,
    });
    app.register(cors_1.default, {
        origin: "http://localhost:3000",
    });
    app.register(fastify_raw_body_1.default, {
        field: "rawBody",
        global: false,
        encoding: "utf8",
        runFirst: true,
    });
    app.register(auth_1.default);
    app.get("/health", async () => {
        await database_1.prisma.$queryRaw `SELECT 1`;
        return {
            status: "ok",
            service: "commerceos-api",
            database: "connected",
        };
    });
    app.register(register_1.registerRoute);
    app.register(login_1.loginRoute);
    app.register(me_1.meRoute);
    app.register(create_1.createProductRoute);
    app.register(list_1.listProductsRoute);
    app.register(get_1.getProductRoute);
    app.register(update_1.updateProductRoute);
    app.register(delete_1.deleteProductRoute);
    app.register(create_2.createVariantRoute);
    app.register(list_2.listVariantsRoute);
    app.register(update_2.updateVariantRoute);
    app.register(delete_2.deleteVariantRoute);
    app.register(inventory_1.updateInventoryRoute);
    app.register(create_3.default);
    app.register(cancel_1.default);
    app.register(payment_1.default);
    app.register(verify_payment_1.default);
    app.register(razorpay_1.default);
    app.register(overview_1.default);
    app.register(opportunities_1.default);
    return app;
}
