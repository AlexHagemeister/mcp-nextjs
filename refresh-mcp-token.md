# Steps to Refresh Your Cursor MCP Token

⏰ **IMPORTANT: OAuth tokens expire after 1 hour**

Your OAuth token may have expired (tokens last 1 hour). Here's how to get a fresh one:

## Step 1: Get a New OAuth Token

1. **Open your browser** to: http://localhost:3000/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3000/callback&response_type=code

2. **Or use this curl command** to register a new client and get started:

```bash
curl -X POST http://localhost:3000/api/oauth/register \
  -H "Content-Type: application/json" \
  -d '{"client_name":"Cursor-Fresh","redirect_uris":["http://localhost:3000/callback"]}'
```

This will give you a `client_id` and `client_secret`.

3. **Then authorize** in your browser:
   - Go to: `http://localhost:3000/oauth/authorize?client_id=<CLIENT_ID>&redirect_uri=http://localhost:3000/callback&response_type=code`
   - Sign in with Google
   - Click "Allow"
   - You'll get redirected with a `code` parameter

4. **Exchange the code for a token**:

```bash
curl -X POST http://localhost:3000/api/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=YOUR_CODE&redirect_uri=http://localhost:3000/callback&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET"
```

This will return an `access_token`.

## Step 2: Update Cursor Config

Edit `~/.cursor/mcp.json` and replace the token:

```json
{
  "mcpServers": {
    "local-oauth-server": {
      "name": "Local MCP OAuth Server",
      "url": "http://localhost:3000/mcp/mcp",
      "transport": "http-stream",
      "headers": {
        "Authorization": "Bearer YOUR_NEW_ACCESS_TOKEN"
      }
    }
  }
}
```

## Step 3: Restart Cursor

Completely quit and restart Cursor (Cmd+Q on Mac).

---

**Your current token**: `a53fb485032bf086f8eecc87b96d1920bbf9ec9057d28de727d2c9a9b2403a24`

**Client ID**: `cmh456rdm00037ntw5nwbgf9u`
**Client Secret**: `8d3046d25dfec0a47cb30e33ad5ceee4b698627f424305df09a954c888cc9b26`

**Token refreshed:** October 24, 2025 at ~11:58 PM
**Token expires:** October 25, 2025 at ~12:58 AM (1 hour from creation)

---

## ⏰ Token Expiration Reminder

OAuth tokens expire **1 hour** after creation. When your MCP connection stops working in Cursor:

1. The token has likely expired
2. Follow the steps above to get a fresh token
3. You'll need to redo the full OAuth flow (authorize + exchange)
4. Update your `~/.cursor/mcp.json` with the new token
5. Restart Cursor

**Pro tip:** Keep this file open for quick reference when you need to refresh!

