---
name: domain-dns-ops
description: >
  Domain/DNS ops across Cloudflare, DNSimple, Namecheap for Peter. Use for onboarding zones to Cloudflare, flipping nameservers, setting redirects (Page Rules/Rulesets/Workers), updating redirect-worker mappings, and verifying DNS/HTTP. Source of truth: ~/Developer/manager.
---

# Domain/DNS Ops (Peter)

This skill is a thin router: use `~/Developer/manager` as truth, run the repo scripts, follow the checklists.

## Source of truth (read first)

- `~/Developer/manager/DOMAINS.md` (domain -> target map; registrar hints; exclusions)
- `~/Developer/manager/DNS.md` (Cloudflare onboarding + DNS/redirect checklist)
- `~/Developer/manager/redirect-worker.ts` + `~/Developer/manager/redirect-worker-mapping.md` (worker redirects)

## Golden path (new vanity domain -> Cloudflare -> redirect)

1. **Decide routing model**
   - Page Rule redirect (small scale, per-zone).
   - Rulesets / Bulk Redirects (account-level; needs token perms).
   - Worker route (fallback; uses `redirect-worker`).
2. **Cloudflare zone**
   - Create zone (UI), then confirm with `cli4`:
     - `cli4 --get name=example.com /zones`
3. **Nameservers**
   - If registrar = Namecheap: `cd ~/Developer/manager && source profile && bin/namecheap-set-ns example.com emma.ns.cloudflare.com scott.ns.cloudflare.com`
   - If registrar = DNSimple: see `~/Developer/manager/DNS.md` for delegation API notes.
4. **DNS placeholders (so CF can terminate HTTPS)**
   - Proxied apex `A` + wildcard `A` → `192.0.2.1` (see `~/Developer/manager/DNS.md` for exact `cli4` calls).
5. **Redirect**
   - If using Page Rules: use the `cli4 --post ... /pagerules` template from `~/Developer/manager/DNS.md`.
   - If using Worker: update mapping (`~/Developer/manager/redirect-worker-mapping.md`), deploy/bind routes per `~/Developer/manager/DNS.md`.
6. **Verify**
   - DNS: `dig +short example.com @1.1.1.1` (expect CF anycast).
   - HTTPS redirect: `curl -I https://example.com` (expect `301`).

## Common ops

- **Cloudflare token sanity**: `source ~/.profile` (prefer `CLOUDFLARE_API_TOKEN`; `CF_API_TOKEN` fallback).
- **Disable “Block AI bots”**: `cd ~/Developer/manager && source profile && bin/cloudflare-ai-bots status` / `bin/cloudflare-ai-bots disable`.

## After edits (commit/push)

If you changed anything in `~/Developer/manager` (docs, worker, scripts, mappings): commit there too.

1. Review: `cd ~/Developer/manager && git status && git diff`
2. Stage: `git add <paths>`
3. Commit (Conventional Commits): `git commit -m "feat: …"` / `fix:` / `docs:` / `chore:`
4. Push only when explicitly asked: `git push origin main`

## Guardrails

- Don’t touch `.md` lore domains or `steipete.md` unless explicitly asked; check `~/Developer/manager/DOMAINS.md`.
- Confirm registrar before debugging CF “invalid nameservers” (often “wrong registrar”).
- Prefer reversible steps; verify after each change (NS → DNS → redirect).
