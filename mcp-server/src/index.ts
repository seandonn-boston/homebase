/**
 * @admiral/mcp-server — public API surface.
 */

export type {
	JsonRpcError,
	JsonRpcRequest,
	JsonRpcResponse,
} from "./protocol.js";
// Protocol
export {
	formatError,
	formatResponse,
	INTERNAL_ERROR,
	INVALID_PARAMS,
	INVALID_REQUEST,
	METHOD_NOT_FOUND,
	PARSE_ERROR,
	parseRequest,
} from "./protocol.js";
export type { McpServerConfig } from "./server.js";
// Server
export { McpServer } from "./server.js";
export type {
	ToolContext,
	ToolDefinition,
	ToolHandler,
} from "./tool-registry.js";
// Tool registry
export { ToolRegistry } from "./tool-registry.js";
export { HttpTransport } from "./transport-http.js";
// Transports
export { StdioTransport } from "./transport-stdio.js";
