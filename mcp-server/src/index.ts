/**
 * @admiral/mcp-server — public API surface.
 */

// Protocol
export {
  parseRequest,
  formatResponse,
  formatError,
  PARSE_ERROR,
  INVALID_REQUEST,
  METHOD_NOT_FOUND,
  INVALID_PARAMS,
  INTERNAL_ERROR,
} from "./protocol.js";
export type { JsonRpcRequest, JsonRpcResponse, JsonRpcError } from "./protocol.js";

// Tool registry
export { ToolRegistry } from "./tool-registry.js";
export type { ToolDefinition, ToolHandler, ToolContext } from "./tool-registry.js";

// Transports
export { StdioTransport } from "./transport-stdio.js";
export { HttpTransport } from "./transport-http.js";

// Server
export { McpServer } from "./server.js";
export type { McpServerConfig } from "./server.js";
