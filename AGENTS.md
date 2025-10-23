# AI Agent Instructions

This file contains instructions for AI coding assistants working on this project.

---

## 📋 Project Status Maintenance

### Required: Update PROJECT_STATUS.md

**When working on this project, you MUST maintain `PROJECT_STATUS.md` as a living document.**

#### Update Frequency
Update `PROJECT_STATUS.md` whenever you:
- ✅ Complete a task or milestone
- ❌ Discover a bug or issue
- 🔧 Make architectural or design decisions
- 🚀 Deploy changes to production
- 📝 Start working on new features
- 🔄 Change configuration or environment setup
- 🐛 Encounter blockers or problems

#### What to Update

1. **Current Status Section**
   - Mark items as working (✅), not working (❌), or needs testing (❓)
   - Be honest about functionality - "partially working" is valid
   - Update the "Last Updated" timestamp

2. **Known Issues Section**
   - Add new bugs or problems as you discover them
   - Categorize by priority: Critical, High, Medium, Low
   - Include enough detail for someone to understand the issue

3. **Recent Changes Section**
   - Add dated entries for significant changes
   - Use checkmarks (✅) for completed items
   - Be specific about what changed and why

4. **Next Steps Section**
   - Keep task list current
   - Check off completed tasks
   - Add new tasks as they become apparent
   - Prioritize immediate tasks vs. future enhancements

#### Format Guidelines
- Use clear, concise language
- Include code examples where helpful
- Link to relevant files or documentation
- Use emoji indicators consistently:
  - ✅ Working/Complete
  - ❌ Broken/Not Working
  - ❓ Untested/Unknown
  - ⚠️ Partial/Warning
  - 🔧 In Progress

---

## 🎯 Project Context

### What This Project Is
An MCP (Model Context Protocol) server with OAuth 2.0 authentication, built with Next.js and deployed on Vercel. It allows AI assistants (Claude, Cursor, VSCode, etc.) to securely access tools and resources via OAuth.

### Key Technologies
- **Next.js 15.3.4** - Web framework
- **Prisma** - Database ORM
- **NextAuth.js** - Authentication (Google OAuth)
- **Neon PostgreSQL** - Database
- **@vercel/mcp-adapter** - MCP protocol support
- **Vercel** - Deployment platform

### Architecture
- OAuth 2.0 authorization server with PKCE
- Google as identity provider (users sign in with Google)
- Database-backed token storage
- MCP protocol for AI assistant integrations
- Both SSE and HTTP Stream transports

---

## 🔍 Testing Philosophy

### Don't Assume - Verify
- If you claim something is "working" or "fully functional", you must have evidence
- Running a server doesn't mean OAuth works
- OAuth working doesn't mean MCP clients can connect
- Test the COMPLETE flow, not just parts

### End-to-End Testing Required
For OAuth + MCP to be "fully functional", ALL of these must work:
1. Client registration
2. User authorization (Google sign-in)
3. Authorization code exchange
4. Token validation
5. MCP endpoint accepts authenticated requests
6. MCP tools execute correctly
7. An actual MCP client (Cursor/Claude/etc.) can connect and use tools

### Document Test Results
When testing, document:
- What you tested
- How you tested it (commands, URLs, tools)
- What the result was
- Whether it passed or failed

Update `PROJECT_STATUS.md` with findings.

---

## 🚫 Common Pitfalls

### Environment Variables
- `.env.local` is gitignored and may not have correct values
- Always verify DATABASE_URL points to the real database (not localhost:5432)
- Restart Next.js dev server after changing `.env.local`
- Production needs separate environment variables on Vercel

### Database Connection
- Prisma client caches database connection
- Run `npx prisma generate` after changing DATABASE_URL
- Migrations must be applied: `npx prisma migrate deploy`

### Port Conflicts
- Server might not start on expected port
- Check what port actually started (look for "Local: http://localhost:XXXX")
- Update MCP client configs to match actual port

### OAuth Redirects
- Redirect URIs must EXACTLY match what's registered
- Google Cloud Console must have ALL redirect URIs (local + production)
- Wrong redirect URI = "Invalid client or redirect URI" error

---

## 🛠️ Useful Commands

### Development
```bash
npm run dev          # Start dev server (default port 3000)
PORT=3001 npm run dev  # Start on specific port
npm run build        # Build for production
```

### Database
```bash
npx prisma generate        # Generate Prisma client
npx prisma migrate deploy  # Apply migrations
npx prisma studio         # Open database GUI
```

### Testing OAuth Flow
```bash
# 1. Register client
curl -X POST http://localhost:3000/api/oauth/register \
  -H "Content-Type: application/json" \
  -d '{"client_name":"Test","redirect_uris":["http://localhost:3000/callback"]}'

# 2. Open in browser (replace CLIENT_ID)
http://localhost:3000/oauth/authorize?client_id=CLIENT_ID&redirect_uri=http://localhost:3000/callback&response_type=code

# 3. Exchange code for token (replace values)
curl -X POST http://localhost:3000/api/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=CODE&redirect_uri=http://localhost:3000/callback&client_id=CLIENT_ID&client_secret=SECRET"

# 4. Test MCP endpoint (replace TOKEN)
curl -X POST http://localhost:3000/mcp/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"add_numbers","arguments":{"a":5,"b":3}}}'
```

### Git
```bash
git status                    # Check status
git add .                     # Stage all changes
git commit -m "message"       # Commit
git push origin main          # Push to GitHub
```

---

## 📁 Key Files

### Configuration
- `.env.local` - Local environment variables (gitignored)
- `next.config.ts` - Next.js configuration
- `prisma/schema.prisma` - Database schema
- `tsconfig.json` - TypeScript configuration

### Core Application
- `src/app/auth.ts` - NextAuth configuration (Google OAuth)
- `src/app/mcp/[transport]/route.ts` - MCP endpoint handler
- `src/app/api/oauth/register/route.ts` - Client registration
- `src/app/api/oauth/token/route.ts` - Token exchange
- `src/app/oauth/authorize/page.tsx` - Authorization consent page
- `src/app/prisma.ts` - Prisma client instance

### Documentation
- `README.md` - Project overview and setup instructions
- `PROJECT_STATUS.md` - Current status and changelog ⭐ KEEP UPDATED
- `AGENTS.md` - This file (AI agent instructions)

---

## 🎓 Learning Resources

- [MCP Protocol](https://modelcontextprotocol.io/)
- [OAuth 2.0](https://oauth.net/2/)
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [NextAuth.js](https://next-auth.js.org/)

---

## ✨ Best Practices

1. **Always read PROJECT_STATUS.md first** to understand current state
2. **Test thoroughly** before claiming something works
3. **Document as you go** - don't leave it for later
4. **Be specific** in commit messages and documentation
5. **Ask questions** if something is unclear
6. **Update status** even for small changes
7. **Verify environment** before debugging (check .env.local, ports, etc.)

