"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentStateAnnotation = void 0;
const langgraph_1 = require("@langchain/langgraph");
exports.AgentStateAnnotation = langgraph_1.Annotation.Root({
    opportunity: (0, langgraph_1.Annotation)({
        reducer: (_, next) => next,
    }),
    merchantId: (0, langgraph_1.Annotation)({
        reducer: (_, next) => next,
    }),
    context: (0, langgraph_1.Annotation)({
        reducer: (_, next) => next,
    }),
    rawResponse: (0, langgraph_1.Annotation)({
        reducer: (_, next) => next,
    }),
    proposal: (0, langgraph_1.Annotation)({
        reducer: (_, next) => next,
    }),
    errors: (0, langgraph_1.Annotation)({
        reducer: (curr = [], next = []) => [...curr, ...next],
        default: () => [],
    }),
});
