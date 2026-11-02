# NOVA // Yggdrasil - META Edition
### Immortal System - Built by Gürkan (Gee) - Audiotech Founder

**Status:** Genesis - Hackathon 2026 Edition
**Philosophy:** Deep learning through deep reasoning and deep thinking. Don't reinvent the wheel for the 8th time - we already fly.

## Pillar 0: GIT - The Skeleton (Most Important)

This repo is the single source of truth.

Branches:
- `main` (protected) - what flies
- `dev/gürkan-workstation` - your Desktop Main (C:\...\NOVA-META)
- `dev/tommy-authority` - Tommy's Human Authority decisions (Ja/Nein)

## Structure
```
context/ - Full curated context from Nova V2 Desktop
  PROJECT_CONTEXT.md - Extended Memory
  PRECODER.md - Pre-coding orchestration module
  PHOBOS.md - Deep reasoning / fear analysis module
  ecosystem-memory/ - shared project memory
  IDEEN-Architektur-Bilder-Prompts/ - your ideas

agents/ - All agent connectors
  muse-spark-orchestrator/ - NEW MAIN ORCHESTRATOR (replaces Gemini hang)
  muse-wonder-reasoning/ - NEW DEEP REASONING (PHOBOS)
  muse-code-worker/ - NEW CODE WELDER (replaces connector-v3)
  grok-peer/ - read-only adversarial reviewer
  gemini-agent/ - now agent, not orchestrator

online-dashboard/ - For Tommy
  tommy/ - Ja/Nein Browser App - Human Authority
  Accessible via phone or PC, no code needed

dashboard-v2-meta/ - New functional dashboard
  Replaces 127.0.0.1:8000 with online version
```

## How to use on Desktop (Gürkan Workstation)

1. Copy everything from your old `Nova V2` folder on Desktop that matters into `context/`
2. `cp context/PROJECT_CONTEXT_EXAMPLE.md context/PROJECT_CONTEXT.md` and fill
3. Create `.env` from `.env.example` with META_API_KEY from dev.meta.ai
4. `git add . && git commit -m "genesis: NOVA META Edition"`
5. Push to GitHub

## Tommy Integration (Human Authority)

Tommy gets link: `https://nova-meta.vercel.app/tommy`
- No code, just 3 buttons: JA / NEIN / MEHR INFOS
- His click = commit to dev/tommy-authority branch
- You see his decision live in dashboard

For Opa Bruno: His grandson is not watching, he's deciding.

## Workflow Manager (Slice 1, 02.11.2026)

Lineare Task-Ketten in V6 (`index.html` → Workflow Manager): Codex CLI baut in
isoliertem Git-Worktree (`task/<id>`, ein Writer), Gemini CLI reviewed read-only,
Muse Code arbeitet als Chat-Session mit. Ende jeder Kette: Freigabe-Queue
(`/api/approvals`) für Human Authority (V6-Panel + Tommy-Portal synchron, JA/NEIN/INFO).
Kein Commit/Push/Merge ohne Human-Entscheid. Start: `start.bat` (Bridge :8000),
Token in `.env` (`NOVA_BRIDGE_TOKEN`). Externer Tommy-Zugriff braucht noch einen
Tunnel (Phase 2). Demo-Task `tmvyq3swvj4mn` (Tommy-Live-Status) liegt als Branch
`task/tmvyq3swvj4mn` + Approval in der Queue.

## Meta Tech Stack (Hackathon)

- Muse Spark = PRECODER - Orchestration, planning
- Muse Wonder = PHOBOS - Deep reasoning, finds holes before storm
- Muse Code = Welder - Builds code sandboxed
- Grok + ChatGPT/Claude = Advisors (read-only)

## Kickoff

- 26.10.2026 18:00 CET - Meta Global AI Developer Hackathon
- Discord via dev.meta.ai dashboard
- $150 credits

Built with blood pact, deepshit underground, supersonic speed.
For Superintelligence.

Gee // Gürkan
Audiotech Sound System Founder
CNC Dreher, Stahlbau Schlosser, ISO Vorrichter, Capo, Techno Producer
Self-taught System Architect - 3 years AI development