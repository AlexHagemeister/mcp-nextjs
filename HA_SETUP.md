# Home Assistant MCP Integration Setup

## Prerequisites

1. A running Home Assistant instance (accessible via network)
2. This MCP server running locally or on Vercel
3. Valid OAuth token from the MCP server

## Step 1: Add Encryption Key to Environment

The Home Assistant integration encrypts your HA tokens at rest using AES-256-GCM encryption.

### Local Development

Add this line to your `.env.local` file:

```bash
HA_ENCRYPTION_KEY="c7ec564fe3a5f2c41dae6892b4e65220ea1475096f755838049db15c7b07d5af"
```

### Production (Vercel)

Add the environment variable to your Vercel project:

```bash
# Using Vercel CLI
vercel env add HA_ENCRYPTION_KEY

# Or via Vercel Dashboard:
# Project Settings → Environment Variables → Add
# Name: HA_ENCRYPTION_KEY
# Value: c7ec564fe3a5f2c41dae6892b4e65220ea1475096f755838049db15c7b07d5af
```

After adding, redeploy your Vercel project.

## Step 2: Create Home Assistant Long-Lived Access Token

1. Open your Home Assistant instance
2. Click your profile (bottom left)
3. Scroll down to "Security"
4. Under "Long-Lived Access Tokens", click "Create Token"
5. Give it a name (e.g., "MCP Server")
6. Copy the token (you won't be able to see it again!)

## Step 3: Configure MCP Server

### Via Web UI

1. Start your MCP server (local or production)
2. Sign in with Google OAuth
3. Navigate to `/ha` page (or click "Configure Home Assistant" button on home page)
4. Enter your Home Assistant URL (e.g., `http://homeassistant.local:8123`)
5. Paste your long-lived access token
6. Click "Save Configuration"
7. Click "Test Connection" to verify it works

### Via API (Alternative)

```bash
# Sign in and get your session cookie, then:
curl -X POST http://localhost:3000/api/ha/config \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "haUrl": "http://homeassistant.local:8123",
    "haToken": "your-long-lived-access-token"
  }'
```

## Step 4: Test with MCP Client (Cursor)

1. Make sure you have valid OAuth credentials for your MCP client
2. In Cursor, the Home Assistant tools should now be available
3. Try a simple command:
   - "Turn on my living room lights" → Uses `ha_turn_on` tool
   - "What's the temperature of my thermostat?" → Uses `ha_get_state` tool
   - "Show me all my lights" → Uses `ha_get_states` with domain filter

## Available MCP Tools

### Core Service Calls
- `ha_call_service` - Generic service call (most flexible)
- `ha_turn_on` - Turn on entities
- `ha_turn_off` - Turn off entities
- `ha_toggle` - Toggle entities

### State & Configuration
- `ha_get_states` - Get all entity states (optionally filtered by domain)
- `ha_get_state` - Get specific entity state
- `ha_get_config` - Get Home Assistant configuration
- `ha_get_services` - List available services
- `ha_get_panels` - List registered panels

### Events
- `ha_fire_event` - Fire custom events

### Validation & Targeting
- `ha_validate_config` - Validate automation configs
- `ha_extract_from_target` - Extract entities from target specification

### Connection
- `ha_ping` - Verify connection is alive

## Example Commands

### Turn on lights
```json
{
  "tool": "ha_turn_on",
  "params": {
    "entity_id": "light.living_room"
  }
}
```

### Get all sensor states
```json
{
  "tool": "ha_get_states",
  "params": {
    "domain": "sensor"
  }
}
```

### Call a service with specific data
```json
{
  "tool": "ha_call_service",
  "params": {
    "domain": "light",
    "service": "turn_on",
    "target": {
      "entity_id": "light.bedroom"
    },
    "service_data": {
      "brightness": 128,
      "color_name": "blue"
    }
  }
}
```

## Troubleshooting

### "HA_ENCRYPTION_KEY environment variable is not set"
- You forgot to add the encryption key to your environment
- Make sure to restart your server after adding it to `.env.local`

### "Home Assistant not configured"
- Sign in to the web UI and configure your HA credentials at `/ha`

### "Connection failed: Authentication failed"
- Your Home Assistant token is invalid or expired
- Create a new long-lived access token in Home Assistant

### "Connection timeout"
- Your Home Assistant instance is not reachable from the MCP server
- Check your firewall settings
- Make sure the URL is correct (including http:// or https://)

### Tools return "Error: Home Assistant not configured"
- Your HA credentials are not saved yet
- Or the OAuth token you're using doesn't belong to a user with HA config
- Each user must configure their own Home Assistant credentials

## Security Notes

- Home Assistant tokens are encrypted at rest in the database using AES-256-GCM
- Each user has their own Home Assistant configuration (multi-tenant)
- The encryption key should be kept secret and backed up securely
- WebSocket connections are pooled per user and automatically cleaned up after 5 minutes of inactivity
- No credentials are ever logged or exposed in API responses

## Architecture

```
MCP Client (Cursor) 
  → OAuth Bearer Token 
  → MCP Server 
  → User's HA Config (encrypted in DB) 
  → WebSocket Connection Pool 
  → Home Assistant WebSocket API
```

Each user's HA connection is isolated and uses their own credentials.

