import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";
import { prisma } from '@/app/prisma';
import { NextRequest } from 'next/server';
import { decrypt } from '@/lib/encryption';
import { haConnectionPool } from '@/lib/ha-connection';

// Authentication helper
async function authenticateRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  console.log('[MCP] Auth header present:', !!authHeader);
  
  if (!authHeader) {
    console.log('[MCP] No auth header, returning 401');
    return null;
  }

  const token = authHeader.split(' ')[1];
  console.log('[MCP] Token extracted:', token ? 'present' : 'missing');
  
  if (!token) {
    console.log('[MCP] No token, returning 401');
    return null;
  }

  try {
    console.log('[MCP] Looking up access token in database');
    const accessToken = await prisma.accessToken.findUnique({
      where: { token },
      include: { user: { include: { haConfig: true } } }
    });

    console.log('[MCP] Access token found:', !!accessToken);
    
    if (!accessToken) {
      console.log('[MCP] No access token found, returning 401');
      return null;
    }

    console.log('[MCP] Token expires at:', accessToken.expiresAt);
    console.log('[MCP] Current time:', new Date());
    
    if (accessToken.expiresAt < new Date()) {
      console.log('[MCP] Token expired, returning 401');
      return null;
    }

    console.log('[MCP] Authentication successful');
    return accessToken;
  } catch (e) {
    console.error('[MCP] Error validating token:', e);
    return null;
  }
}

// Helper to get HA connection for authenticated user
async function getHAConnection(accessToken: any) {
  if (!accessToken.user.haConfig) {
    throw new Error('Home Assistant not configured. Please configure your Home Assistant credentials first.');
  }

  const haUrl = accessToken.user.haConfig.haUrl;
  const haToken = decrypt(accessToken.user.haConfig.haToken);
  
  return haConnectionPool.getConnection(accessToken.userId, haUrl, haToken);
}

// MCP handler with authentication
const handler = async (req: Request) => {
  // Inject authentication here
  const nextReq = req as any as NextRequest; // for type compatibility
  const accessToken = await authenticateRequest(nextReq);
  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Log request body
  const requestBody = await req.clone().json().catch(() => null);
  console.log('[MCP] Request body:', requestBody);

  return createMcpHandler(
    (server) => {
      // ===== CORE SERVICE CALLS =====
      
      server.tool(
        "ha_call_service",
        "Call any Home Assistant service (generic service call)",
        {
          domain: z.string().describe("Service domain (e.g., 'light', 'switch', 'climate')"),
          service: z.string().describe("Service name (e.g., 'turn_on', 'turn_off', 'set_temperature')"),
          service_data: z.record(z.any()).optional().describe("Service data/parameters"),
          target: z.object({
            entity_id: z.union([z.string(), z.array(z.string())]).optional(),
            device_id: z.union([z.string(), z.array(z.string())]).optional(),
            area_id: z.union([z.string(), z.array(z.string())]).optional(),
          }).optional().describe("Target entities, devices, or areas"),
          return_response: z.boolean().optional().describe("Whether to return response data from the service")
        },
        async ({ domain, service, service_data, target, return_response }) => {
          try {
            const connection = await getHAConnection(accessToken);
            const result = await connection.callService(domain, service, service_data, target, return_response);
            
            return {
              content: [{
                type: "text",
                text: JSON.stringify(result, null, 2)
              }]
            };
          } catch (error: any) {
            return {
              content: [{
                type: "text",
                text: `Error: ${error.message}`
              }],
              isError: true
            };
          }
        }
      );

      server.tool(
        "ha_turn_on",
        "Turn on one or more entities (lights, switches, etc.)",
        {
          entity_id: z.union([z.string(), z.array(z.string())]).describe("Entity ID(s) to turn on")
        },
        async ({ entity_id }) => {
          try {
            const connection = await getHAConnection(accessToken);
            
            // Determine domain from entity_id
            const firstEntityId = Array.isArray(entity_id) ? entity_id[0] : entity_id;
            const domain = firstEntityId.split('.')[0];
            
            await connection.callService(domain, 'turn_on', {}, { entity_id });
            
            return {
              content: [{
                type: "text",
                text: `Successfully turned on: ${Array.isArray(entity_id) ? entity_id.join(', ') : entity_id}`
              }]
            };
          } catch (error: any) {
            return {
              content: [{
                type: "text",
                text: `Error: ${error.message}`
              }],
              isError: true
            };
          }
        }
      );

      server.tool(
        "ha_turn_off",
        "Turn off one or more entities (lights, switches, etc.)",
        {
          entity_id: z.union([z.string(), z.array(z.string())]).describe("Entity ID(s) to turn off")
        },
        async ({ entity_id }) => {
          try {
            const connection = await getHAConnection(accessToken);
            
            const firstEntityId = Array.isArray(entity_id) ? entity_id[0] : entity_id;
            const domain = firstEntityId.split('.')[0];
            
            await connection.callService(domain, 'turn_off', {}, { entity_id });
            
            return {
              content: [{
                type: "text",
                text: `Successfully turned off: ${Array.isArray(entity_id) ? entity_id.join(', ') : entity_id}`
              }]
            };
          } catch (error: any) {
            return {
              content: [{
                type: "text",
                text: `Error: ${error.message}`
              }],
              isError: true
            };
          }
        }
      );

      server.tool(
        "ha_toggle",
        "Toggle one or more entities (lights, switches, etc.)",
        {
          entity_id: z.union([z.string(), z.array(z.string())]).describe("Entity ID(s) to toggle")
        },
        async ({ entity_id }) => {
          try {
            const connection = await getHAConnection(accessToken);
            
            const firstEntityId = Array.isArray(entity_id) ? entity_id[0] : entity_id;
            const domain = firstEntityId.split('.')[0];
            
            await connection.callService(domain, 'toggle', {}, { entity_id });
            
            return {
              content: [{
                type: "text",
                text: `Successfully toggled: ${Array.isArray(entity_id) ? entity_id.join(', ') : entity_id}`
              }]
            };
          } catch (error: any) {
            return {
              content: [{
                type: "text",
                text: `Error: ${error.message}`
              }],
              isError: true
            };
          }
        }
      );

      // ===== STATE & CONFIGURATION =====
      
      server.tool(
        "ha_get_states",
        "Get all entity states from Home Assistant (optionally filtered by domain)",
        {
          domain: z.string().optional().describe("Filter by domain (e.g., 'light', 'switch', 'sensor')")
        },
        async ({ domain }) => {
          try {
            const connection = await getHAConnection(accessToken);
            let states = await connection.getStates();
            
            if (domain) {
              states = states.filter((state: any) => state.entity_id.startsWith(domain + '.'));
            }
            
            return {
              content: [{
                type: "text",
                text: JSON.stringify(states, null, 2)
              }]
            };
          } catch (error: any) {
            return {
              content: [{
                type: "text",
                text: `Error: ${error.message}`
              }],
              isError: true
            };
          }
        }
      );

      server.tool(
        "ha_get_state",
        "Get the state of a specific entity",
        {
          entity_id: z.string().describe("Entity ID to query")
        },
        async ({ entity_id }) => {
          try {
            const connection = await getHAConnection(accessToken);
            const states = await connection.getStates();
            const state = states.find((s: any) => s.entity_id === entity_id);
            
            if (!state) {
              return {
                content: [{
                  type: "text",
                  text: `Entity not found: ${entity_id}`
                }],
                isError: true
              };
            }
            
            return {
              content: [{
                type: "text",
                text: JSON.stringify(state, null, 2)
              }]
            };
          } catch (error: any) {
            return {
              content: [{
                type: "text",
                text: `Error: ${error.message}`
              }],
              isError: true
            };
          }
        }
      );

      server.tool(
        "ha_get_config",
        "Get Home Assistant configuration",
        {},
        async () => {
          try {
            const connection = await getHAConnection(accessToken);
            const config = await connection.getConfig();
            
            return {
              content: [{
                type: "text",
                text: JSON.stringify(config, null, 2)
              }]
            };
          } catch (error: any) {
            return {
              content: [{
                type: "text",
                text: `Error: ${error.message}`
              }],
              isError: true
            };
          }
        }
      );

      server.tool(
        "ha_get_services",
        "Get all available Home Assistant services",
        {},
        async () => {
          try {
            const connection = await getHAConnection(accessToken);
            const services = await connection.getServices();
            
            return {
              content: [{
                type: "text",
                text: JSON.stringify(services, null, 2)
              }]
            };
          } catch (error: any) {
            return {
              content: [{
                type: "text",
                text: `Error: ${error.message}`
              }],
              isError: true
            };
          }
        }
      );

      server.tool(
        "ha_get_panels",
        "Get registered Home Assistant panels",
        {},
        async () => {
          try {
            const connection = await getHAConnection(accessToken);
            const panels = await connection.getPanels();
            
            return {
              content: [{
                type: "text",
                text: JSON.stringify(panels, null, 2)
              }]
            };
          } catch (error: any) {
            return {
              content: [{
                type: "text",
                text: `Error: ${error.message}`
              }],
              isError: true
            };
          }
        }
      );

      // ===== EVENTS =====
      
      server.tool(
        "ha_fire_event",
        "Fire a custom event in Home Assistant",
        {
          event_type: z.string().describe("Event type to fire"),
          event_data: z.record(z.any()).optional().describe("Event data")
        },
        async ({ event_type, event_data }) => {
          try {
            const connection = await getHAConnection(accessToken);
            const result = await connection.fireEvent(event_type, event_data);
            
            return {
              content: [{
                type: "text",
                text: `Event fired successfully: ${event_type}`
              }]
            };
          } catch (error: any) {
            return {
              content: [{
                type: "text",
                text: `Error: ${error.message}`
              }],
              isError: true
            };
          }
        }
      );

      // ===== VALIDATION & TARGETING =====
      
      server.tool(
        "ha_validate_config",
        "Validate Home Assistant configuration (triggers, conditions, actions)",
        {
          trigger: z.any().optional().describe("Trigger configuration to validate"),
          condition: z.any().optional().describe("Condition configuration to validate"),
          action: z.any().optional().describe("Action configuration to validate")
        },
        async ({ trigger, condition, action }) => {
          try {
            const connection = await getHAConnection(accessToken);
            const result = await connection.validateConfig({ trigger, condition, action });
            
            return {
              content: [{
                type: "text",
                text: JSON.stringify(result, null, 2)
              }]
            };
          } catch (error: any) {
            return {
              content: [{
                type: "text",
                text: `Error: ${error.message}`
              }],
              isError: true
            };
          }
        }
      );

      server.tool(
        "ha_extract_from_target",
        "Extract entities, devices, and areas from a target specification",
        {
          target: z.object({
            entity_id: z.union([z.string(), z.array(z.string())]).optional(),
            device_id: z.union([z.string(), z.array(z.string())]).optional(),
            area_id: z.union([z.string(), z.array(z.string())]).optional(),
            label_id: z.union([z.string(), z.array(z.string())]).optional(),
          }).describe("Target specification"),
          expand_group: z.boolean().optional().describe("Whether to expand group entities")
        },
        async ({ target, expand_group }) => {
          try {
            const connection = await getHAConnection(accessToken);
            const result = await connection.extractFromTarget(target, expand_group);
            
            return {
              content: [{
                type: "text",
                text: JSON.stringify(result, null, 2)
              }]
            };
          } catch (error: any) {
            return {
              content: [{
                type: "text",
                text: `Error: ${error.message}`
              }],
              isError: true
            };
          }
        }
      );

      // ===== CONNECTION MANAGEMENT =====
      
      server.tool(
        "ha_ping",
        "Ping Home Assistant to verify connection is alive",
        {},
        async () => {
          try {
            const connection = await getHAConnection(accessToken);
            await connection.ping();
            
            return {
              content: [{
                type: "text",
                text: "Pong! Connection is alive."
              }]
            };
          } catch (error: any) {
            return {
              content: [{
                type: "text",
                text: `Error: ${error.message}`
              }],
              isError: true
            };
          }
        }
      );

      // ===== DEMO TOOL (kept for backward compatibility) =====
      
      server.tool(
        "add_numbers",
        "Adds two numbers together and returns the sum",
        {
          a: z.number().describe("First number to add"),
          b: z.number().describe("Second number to add"),
        },
        async ({ a, b }) => {
          return {
            content: [
              {
                type: "text",
                text: `The sum of ${a} and ${b} is ${a + b}`,
              },
            ],
          };
        }
      );
    },
    {
      // Optionally add server capabilities here
    },
    {
      basePath: "/mcp",
      verboseLogs: true,
      redisUrl: process.env.REDIS_URL,
    }
  )(req);
};

export { handler as GET, handler as POST };

// CORS preflight handler
export async function OPTIONS() {
  const response = new Response(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
} 
