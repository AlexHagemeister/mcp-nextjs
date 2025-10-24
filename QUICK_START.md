# Quick Start Guide

## 🚀 Start the Server

```bash
# Make sure you're on port 3000
lsof -ti:3000 -ti:3001 | xargs kill -9  # Kill any conflicting processes
npm run dev
```

The server will start at http://localhost:3000

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

**Status:** Code complete, needs testing

**Required:** Add `HA_ENCRYPTION_KEY` to `.env.local`:

```bash
HA_ENCRYPTION_KEY="c7ec564fe3a5f2c41dae6892b4e65220ea1475096f755838049db15c7b07d5af"
```

Then configure at http://localhost:3000/ha

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
- ✅ 14 tools discoverable
- ⏰ Token expires in 1 hour
- ❓ Home Assistant tools need testing

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
- Add `HA_ENCRYPTION_KEY` to `.env.local`
- Configure HA credentials at /ha page
- Restart dev server after adding env variables

