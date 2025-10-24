# Quick Start Guide

## 🚀 Start the Server

```bash
# Install and rebuild WebSocket native dependencies
npm install
npm rebuild bufferutil utf-8-validate

# Make sure you're on port 3000
lsof -ti:3000 -ti:3001 | xargs kill -9  # Kill any conflicting processes
npm run dev
```

The server will start at http://localhost:3000

**Note:** The `npm rebuild` step is critical for Home Assistant WebSocket connections!

## 🔑 OAuth Token Status

**Current Token:** `a53fb485032bf086f8eecc87b96d1920bbf9ec9057d28de727d2c9a9b2403a24`

**⏰ EXPIRES:** ~12:58 AM on Oct 25, 2025 (1 hour from creation)

### When Token Expires

See `refresh-mcp-token.md` for step-by-step refresh instructions.

Quick refresh:
1. Go to http://localhost:3000/oauth/authorize?client_id=cmh456rdm00037ntw5nwbgf9u&redirect_uri=http://localhost:3000/callback&response_type=code
2. Sign in with Google, click "Allow"
3. Copy the authorization code
4. Exchange for token (see refresh-mcp-token.md for exact command)
5. Update `~/.cursor/mcp.json` with new token
6. Restart Cursor

## 🏠 Home Assistant Integration

**Status:** ✅ FULLY WORKING! Successfully tested with real HA instance.

**Setup Steps:**

1. **Rebuild WebSocket native modules** (critical!)
```bash
npm rebuild bufferutil utf-8-validate
```

2. **Add encryption key** to `.env.local`:
```bash
HA_ENCRYPTION_KEY="c7ec564fe3a5f2c41dae6892b4e65220ea1475096f755838049db15c7b07d5af"
```

3. **Restart server:**
```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

4. **Configure HA credentials** at http://localhost:3000/ha
   - Enter your HA URL (e.g., `http://homeassistant.local:8123`)
   - Paste your long-lived access token
   - Click "Save Configuration" and "Test Connection"

5. **Use MCP tools** to control your smart home!
   - "Turn on the kitchen light"
   - "Show me all my lights"
   - "What's the temperature?"

## 📊 MCP Tools Available

- ✅ `add_numbers` - Demo tool (adds two numbers)
- ✅ 13 Home Assistant tools (ha_turn_on, ha_turn_off, ha_get_states, etc.)

## 🔗 Useful URLs

- **Home:** http://localhost:3000
- **OAuth Authorization:** http://localhost:3000/oauth/authorize
- **HA Config:** http://localhost:3000/ha
- **Test Page:** http://localhost:3000/test

## 📁 Important Files

- `PROJECT_STATUS.md` - Current project status and changelog
- `refresh-mcp-token.md` - Token refresh instructions
- `HA_SETUP.md` - Home Assistant setup guide
- `AGENTS.md` - AI agent instructions and best practices
- `~/.cursor/mcp.json` - Cursor MCP configuration

## ✅ Current Status

- ✅ Server running on port 3000
- ✅ OAuth flow working
- ✅ Cursor MCP connected
- ✅ 16 tools discoverable (1 demo + 15 HA tools)
- ⏰ Token expires in 1 hour
- ✅ Home Assistant integration fully working
- ✅ WebSocket native modules fixed
- ✅ Successfully tested light control

## 🆘 Troubleshooting

**MCP not loading in Cursor:**
- Token may have expired → Refresh token (see above)
- Server not running → Run `npm run dev`
- Wrong port → Must be on 3000, not 3001

**OAuth errors:**
- Check `.env.local` has all required variables
- Ensure DATABASE_URL points to Neon (not localhost)
- Verify Google OAuth credentials are correct

**Home Assistant tools not working:**
- **First:** Rebuild native modules: `npm rebuild bufferutil utf-8-validate`
- Add `HA_ENCRYPTION_KEY` to `.env.local`
- Configure HA credentials at /ha page
- Restart dev server after adding env variables

**WebSocket errors (`bufferUtil.mask is not a function`):**
- Run: `npm rebuild bufferutil utf-8-validate`
- Kill the server: `lsof -ti:3000 | xargs kill -9`
- Restart: `npm run dev`
- See `HA_SETUP.md` for detailed troubleshooting

