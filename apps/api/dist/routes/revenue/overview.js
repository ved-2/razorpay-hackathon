"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = revenueOverviewRoute;
const domain_1 = require("@commerceos/domain");
const authenticate_1 = require("../../plugins/authenticate");
async function revenueOverviewRoute(app) {
    app.get("/revenue/overview", {
        preHandler: authenticate_1.authenticate,
    }, async (request, reply) => {
        const overview = await (0, domain_1.getRevenueOverview)(request.user.merchantId);
        return reply.send({
            overview,
        });
    });
}
