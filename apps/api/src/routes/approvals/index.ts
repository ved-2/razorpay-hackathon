import { FastifyInstance } from "fastify";
import { listApprovalsRoute } from "./list";
import { getApprovalRoute } from "./get";
import { createApprovalRoute } from "./create";
import { approveApprovalRoute } from "./approve";
import { rejectApprovalRoute } from "./reject";

export default async function approvalsRoutes(app: FastifyInstance) {
  app.register(listApprovalsRoute);
  app.register(getApprovalRoute);
  app.register(createApprovalRoute);
  app.register(approveApprovalRoute);
  app.register(rejectApprovalRoute);
}
