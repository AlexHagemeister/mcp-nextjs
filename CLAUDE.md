# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **OAuth 2.1 MCP Server** built with Next.js 15 that enables AI assistants (Claude, Cursor, VSCode, etc.) to securely access tools and resources through the Model Context Protocol (MCP). The server acts as both an OAuth authorization server and an MCP endpoint provider.

**Key Features:**
- OAuth 2.0 authorization server with PKCE support
- Google OAuth for user authentication (via NextAuth.js)
- MCP protocol support for both SSE and HTTP Stream transports
- Home Assistant integration with 15+ smart home control tools
- Per-user encrypted credential storage
- WebSocket connection pooling for Home Assistant

## Critical Development Commands

### Setup & Dependencies
```bash
# Initial setup
npm install
npm rebuild bufferutil utf-8-validate  # Required for Home Assistant WebSocket support
npx prisma generate                     # Generate Prisma client
npx prisma db push                      # Create database schema (first time only)

# Start development server (MUST run on port 3000)
npm run dev

# If port 3000 is in use, kill the old process (DO NOT switch ports)
lsof -ti:3000 -ti:3001 | xargs kill -9
npm run dev
```

### Build & Deploy
```bash
npm run build                          # Production build (includes prisma generate)
npm start                              # Run production build locally
```

### Database Operations
```bash
npx prisma generate                    # Regenerate Prisma client after schema changes
npx prisma migrate deploy              # Apply pending migrations (production)
npx prisma migrate dev                 # Create and apply migrations (development)
npx prisma studio                      # Open database GUI browser
```

### Testing OAuth Flow
```bash
# 1. Register a client
curl -X POST http://localhost:3000/api/oauth/register \
  -H "Content-Type: application/json" \
  -d '{"client_name":"Test","redirect_uris":["http://localhost:3000/callback"]}'

# 2. Visit authorization URL (replace CLIENT_ID)
# http://localhost:3000/oauth/authorize?client_id=CLIENT_ID&redirect_uri=http://localhost:3000/callback&response_type=code

# 3. Exchange auth code for token
curl -X POST http://localhost:3000/api/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=CODE&redirect_uri=http://localhost:3000/callback&client_id=CLIENT_ID&client_secret=SECRET"

# 4. Test MCP endpoint with Bearer token
curl -X POST http://localhost:3000/mcp/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## High-Level Architecture

### OAuth 2.0 Flow
```
1. MCP Client → POST /api/oauth/register → client_id + client_secret
2. Client → GET /oauth/authorize → User authenticates via Google → Consent screen
3. User clicks "Allow" → Server generates auth code → Redirects to client's redirect_uri
4. Client → POST /api/oauth/token (exchange code) → Bearer access token
5. Client → MCP endpoints with Authorization: Bearer <token>
```

### MCP Protocol Endpoints
- `/mcp/mcp` - HTTP Stream transport (for Cursor, VSCode, Inspector)
- `/mcp/sse` - SSE transport (for Claude Desktop/Web, requires Redis)

Both endpoints require `Authorization: Bearer <token>` header and respond with JSON-RPC 2.0 format.

### Home Assistant Integration
```
MCP Client Request
  ↓ (Bearer token authentication)
MCP Server (validates token, gets user)
  ↓ (fetches encrypted HA credentials from DB)
WebSocket Connection Pool (per-user connections)
  ↓ (WebSocket API protocol)
Home Assistant Instance (user's smart home)
```

**Key Components:**
- `src/lib/encryption.ts` - AES-256-GCM encryption for HA tokens
- `src/lib/ha-connection.ts` - WebSocket connection manager with pooling
- `src/app/api/ha/config/route.ts` - Credentials management API
- `src/app/ha/page.tsx` - Web UI for HA configuration

### Database Schema (Prisma)

**Authentication & Sessions:**
- `User` - NextAuth user accounts (Google OAuth)
- `Account` - OAuth provider accounts
- `Session` - User sessions

**OAuth Server:**
- `Client` - Registered OAuth clients (MCP clients)
- `AccessToken` - Bearer tokens for MCP access (1 hour expiry)
- `AuthCode` - Temporary authorization codes (10 min expiry, PKCE support)

**Features:**
- `HomeAssistantConfig` - Per-user HA credentials (encrypted tokens)

### Core Files

**OAuth Implementation:**
- `src/app/api/oauth/register/route.ts` - Client registration endpoint
- `src/app/api/oauth/token/route.ts` - Token exchange endpoint
- `src/app/oauth/authorize/page.tsx` - Authorization consent screen

**MCP Server:**
- `src/app/mcp/[transport]/route.ts` - MCP protocol handler with all tools (15 HA tools + 1 demo tool)

**Authentication:**
- `src/app/auth.ts` - NextAuth.js configuration (Google provider)
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth.js API routes

**Database:**
- `prisma/schema.prisma` - Database schema definition
- `src/app/prisma.ts` - Prisma client singleton

## Environment Variables

**Required in `.env.local` (local development):**
```bash
DATABASE_URL="postgresql://user:pass@host/database"  # Neon PostgreSQL connection string
AUTH_SECRET="random-secret-string"                   # NextAuth.js session secret
GOOGLE_CLIENT_ID="google-oauth-client-id"           # Google OAuth credentials
GOOGLE_CLIENT_SECRET="google-oauth-client-secret"
HA_ENCRYPTION_KEY="hex-encoded-32-byte-key"         # For encrypting HA tokens
```

**Optional:**
```bash
REDIS_URL="rediss://user:pass@host:6379"            # Required for SSE transport (Claude support)
```

**Production (Vercel):** Same variables must be added to Vercel dashboard.

## Port Management - CRITICAL

**This application MUST run on port 3000.** All OAuth redirect URIs, MCP client configurations, and documentation assume port 3000.

**If `npm run dev` reports port 3000 in use:**
```bash
# Kill the old process - DO NOT switch to another port
lsof -ti:3000 -ti:3001 | xargs kill -9
npm run dev
```

**Why this matters:**
- Google OAuth redirect URIs are registered for `http://localhost:3000`
- MCP client configs (Cursor) point to port 3000
- Changing ports breaks authentication flow
- Access tokens become invalid if server URL changes

## Home Assistant Integration

### Setup Steps
1. **Install native dependencies:** `npm rebuild bufferutil utf-8-validate`
2. **Add encryption key to `.env.local`:** See HA_SETUP.md
3. **Create HA long-lived token** in Home Assistant UI
4. **Configure via web UI:** Sign in → visit `/ha` → enter HA URL and token
5. **Test connection** using the "Test Connection" button

### Available MCP Tools (15 total)

**Core Service Calls:**
- `ha_call_service` - Generic service call (most flexible)
- `ha_turn_on` - Turn on entities
- `ha_turn_off` - Turn off entities
- `ha_toggle` - Toggle entities

**State & Configuration:**
- `ha_get_states` - Get all entity states (filterable by domain)
- `ha_get_state` - Get specific entity state
- `ha_get_config` - Get HA configuration
- `ha_get_services` - List available services
- `ha_get_panels` - List registered panels

**Events:**
- `ha_fire_event` - Fire custom events

**Validation:**
- `ha_validate_config` - Validate automation configs
- `ha_extract_from_target` - Extract entities from target spec

**Connection:**
- `ha_ping` - Verify WebSocket connection is alive

### Common Issues

**WebSocket Native Module Error:**
```bash
# Symptom: [TypeError: bufferUtil.mask is not a function]
# Solution:
npm rebuild bufferutil utf-8-validate
lsof -ti:3000 | xargs kill -9
npm run dev
```

**HA Not Configured Error:**
- User must configure their own HA credentials at `/ha` while signed in
- Each user has their own isolated HA configuration

## MCP Client Integration

### Cursor Setup
Edit `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "MyServer": {
      "name": "My MCP Server",
      "url": "http://localhost:3000/mcp/mcp",
      "transport": "http-stream"
    }
  }
}
```

Then complete OAuth flow:
1. Register client via `/api/oauth/register`
2. Visit authorization URL → sign in with Google
3. Exchange code for token via `/api/oauth/token`
4. Update Cursor config with Bearer token
5. Restart Cursor → tools should appear

**Note:** Access tokens expire after 1 hour. See `refresh-mcp-token.md` for refresh instructions.

### Claude Desktop/Web
- Requires SSE transport: `https://your-domain.com/mcp/sse`
- Requires Redis (set `REDIS_URL` env var)
- Does not accept `localhost` URLs (must be publicly accessible)

## Deployment Notes

**Platform:** Must be deployed to Vercel (dependency on `@vercel/mcp-adapter` for SSE support)

**Build Command:**
```bash
prisma generate && next build
```

**Environment Variables:** Add all required env vars to Vercel dashboard before deploying.

**Google OAuth:** Ensure production redirect URI is added to Google Cloud Console:
```
https://your-vercel-domain.vercel.app/api/auth/callback/google
```

## Important Files to Read

Before making changes, review these documents:
- `PROJECT_STATUS.md` - Current status, known issues, recent changes
- `AGENTS.md` - AI agent instructions and testing requirements
- `HA_SETUP.md` - Complete Home Assistant setup guide
- `README.md` - User-facing documentation

## Development Best Practices

1. **Always update PROJECT_STATUS.md** when completing tasks or discovering issues
2. **Test the complete OAuth flow** - don't assume parts work without verification
3. **Use port 3000 exclusively** - kill old processes instead of switching ports
4. **Restart dev server** after changing `.env.local`
5. **Run `prisma generate`** after changing database schema
6. **Check MCP client logs** when debugging tool issues
7. **Verify WebSocket dependencies** are properly compiled for HA integration
