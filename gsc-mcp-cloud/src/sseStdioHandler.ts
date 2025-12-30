import { toolRegistry } from "./tools/index";

interface MCPMessage {
  jsonrpc: string;
  id?: number | string;
  method?: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: string;
  id?: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class SSEStdioHandler {
  private env: Env;
  private tools: Map<string, any> = new Map();

  constructor(env: Env) {
    this.env = env;
    this.init();
  }

  async init() {
    // Register all tools
    const params = { env: this.env };
    toolRegistry.forEach(tool => {
      this.tools.set(tool.name, {
        definition: tool,
        execute: (args: any) => tool.execute(params, args)
      });
    });
  }

  async processMessage(message: MCPMessage, writer: WritableStreamDefaultWriter): Promise<void> {
    const response: MCPResponse = {
      jsonrpc: "2.0",
      id: message.id
    };

    try {
      switch (message.method) {
        case "initialize":
          response.result = {
            protocolVersion: "2024-11-05",
            serverInfo: {
              name: "gsc-mcp-cloud",
              version: "1.0.0"
            },
            capabilities: {
              tools: {}
            }
          };
          break;

        case "tools/list":
          response.result = {
            tools: Array.from(this.tools.values()).map(tool => ({
              name: tool.definition.name,
              description: tool.definition.description,
              inputSchema: {
                type: "object",
                properties: this.schemaToProperties(tool.definition.schema),
                required: this.getRequiredFields(tool.definition.schema)
              }
            }))
          };
          break;

        case "tools/call":
          const toolName = message.params?.name;
          const toolArgs = message.params?.arguments || {};

          const tool = this.tools.get(toolName);
          if (!tool) {
            throw new Error(`Tool not found: ${toolName}`);
          }

          // Validate arguments against schema
          const validatedArgs = tool.definition.schema.parse(toolArgs);

          // Execute tool
          const result = await tool.execute(validatedArgs);

          response.result = result;
          break;

        default:
          throw new Error(`Unknown method: ${message.method}`);
      }
    } catch (error: any) {
      response.error = {
        code: -32603,
        message: error.message || "Internal error",
        data: {
          type: error.name || "Error",
          stack: error.stack,
          details: error.toString()
        }
      };
    }

    // Write response to SSE stream
    const encoder = new TextEncoder();
    await writer.write(encoder.encode(`data: ${JSON.stringify(response)}\n\n`));
  }

  private schemaToProperties(schema: any): any {
    const shape = schema._def.shape();
    const properties: any = {};

    for (const [key, value] of Object.entries(shape)) {
      const zodType = value as any;
      properties[key] = {
        type: this.getZodType(zodType),
        description: zodType._def.description || ""
      };

      // Add enum values if present
      if (zodType._def.values) {
        properties[key].enum = Array.from(zodType._def.values);
      }
    }

    return properties;
  }

  private getZodType(zodType: any): string {
    const typeName = zodType._def.typeName;

    switch (typeName) {
      case "ZodString":
        return "string";
      case "ZodNumber":
        return "number";
      case "ZodBoolean":
        return "boolean";
      case "ZodArray":
        return "array";
      case "ZodObject":
        return "object";
      default:
        return "string";
    }
  }

  private getRequiredFields(schema: any): string[] {
    const shape = schema._def.shape();
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const zodType = value as any;
      if (!zodType.isOptional()) {
        required.push(key);
      }
    }

    return required;
  }

  async handleSSE(request: Request): Promise<Response> {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Handle SSE connection
    (async () => {
      try {
        // Send initial connection message
        await writer.write(encoder.encode(": connection established\n\n"));

        // Handle incoming messages
        if (request.method === "POST") {
          const body = await request.json() as MCPMessage;
          await this.processMessage(body, writer);
        } else {
          // For GET requests, send tools list
          const listMessage: MCPMessage = {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/list"
          };
          await this.processMessage(listMessage, writer);
        }
      } catch (error: any) {
        await writer.write(encoder.encode(`data: ${JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: error.message || "Internal error",
            data: {
              type: error.name || "Error",
              details: error.toString()
            }
          }
        })}\n\n`));
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
}
