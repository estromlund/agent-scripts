# Tools Reference

CLI tools available on Eriks's machines. Use these for agentic tasks.

## peekaboo 👀

Screenshot, screen inspection, and click automation.

**Install**: `brew install stepete/tap/peekaboo`
**MCP server**: `npx -y @steipete/peekaboo`

**Commands**:

```bash
peekaboo capture                       # Take screenshot
peekaboo see                           # Describe what's on screen (OCR)
peekaboo click                         # Click at coordinates
peekaboo list                          # List windows/apps
peekaboo tools                         # Show available tools
peekaboo permissions status            # Check TCC permissions
```

**Requirements**: Screen Recording + Accessibility permissions.

**Docs**: `~/Developer/Peekaboo/docs/commands/`

---

## oracle 🧿

Hand prompts + files to other AIs (GPT-5 Pro, etc.).

**Usage**: `npx -y @steipete/oracle --help` (run once per session to learn syntax)

---

## gh

GitHub CLI for PRs, issues, CI, releases.

**Usage**: `gh help`

When someone shares a GitHub URL, use `gh` to read it:

```bash
gh issue view <url> --comments
gh pr view <url> --comments --files
gh run list / gh run view <id>
```

---

## mcporter

MCP server launcher for browser automation, web scraping.

**Usage**: `npx mcporter --help`

Common servers: `iterm`, `firecrawl`, `XcodeBuildMCP`
