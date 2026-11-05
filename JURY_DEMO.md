# NOVA // Ygdrassil — 8-Minute Jury Click-Script

Source: delegated agent inspection of index.html, tommy/index.html, bridge routes (night shift).
Provider reality 2026-11-04 (live probe: ALL 6 green): spark, wonder, chatgpt, grok, claude (sonnet-5-5, credits loaded), gemini (3.5-flash, paid tier). Llama/Code cards map to the Spark provider (no dedicated bridge — say so if asked). SAM parked (API 404, do not demo).

**Setup before jury enters:** `node muse-spark-bridge.js` running (or `start.bat`), browser tabs open:
`http://127.0.0.1:8000/v6` + `http://127.0.0.1:8000/tommy`. Keys in server `.env`:
`OPENAI_API_KEY`, `XAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_AI_KEY`, `META_API_KEY` (all live).

## 0:00 — Start (30s)
Double-click `start.bat` → bridge console shows `[MUSE SPARK BRIDGE V2] 🟢`, Tommy portal auto-opens at `/tommy`.
Say: *"One click: local bridge + human-authority portal."*
**Fallback:** if port 8000 busy → `set NOVA_PORT=8001` in `.env`, restart; update Bridge-URL field in V6 Advanced panel.

## 0:30 — /v6 rev check (30s)
Open `/v6`, scroll to Workflow Manager footer: **"V6 UI rev 8 · source-chat + pointer-drag"**.
Click **▶ Connect** → green blinker, Dockingstation fills with agents from `GET /api/agents`.
Say: *"Rev 8, bridge connected, agents live-probed."*
**Fallback:** if Connect fails → check Bridge-URL `http://127.0.0.1:8000` in Advanced; if 401 → paste `NOVA_BRIDGE_TOKEN` into token field (session-only).

## 1:00 — Chat fanout: WHICH agents to select (2 min)
In **NOVA // Chat**, click agent cards to activate **exactly these three: 💬 ChatGPT + ⚡ Grok + ✨ Gemini**
(cards start gray/inactive — click to glow). Type: *"Summarize our continuity strategy in 3 bullets, then
challenge one assumption."* → **▶ Send**.
Result: three answer bubbles, memory badge shows context chars (`/api/chat` fan-out, memory-aware).
Say: *"Multi-select = parallel answers; green lamps = live via server env."*
**Go longer here (jury loves this):** after the first answers land, ask a follow-up (*"Now disagree with
each other in one line each."*) and resend — same 3 cards, second round, zero setup. This is the centerpiece:
one prompt, parallel brains, shared memory. Then continue to Source card.
**Why these three:** fastest round-trip for the demo slot. All six are live — add Claude/Spark/Wonder
if time allows. Llama/Code/Image cards: Image generates pictures; Llama/Code ride on the Spark provider.
**Fallback:** if one returns `⚠️ failed` → point at the red lamp: *"Per-provider failure is isolated,
the other answers still land"* — continue with the survivors. If all fail → bridge down: restart
`node muse-spark-bridge.js`, legacy direct-browser fallback engages automatically.

## 3:00 — Source card (1 min)
Scroll to **Task Source**, type a goal e.g. *"Add a health-check line to README"* → **➤ Send** (or Enter).
A source card lands on the flow canvas.
**Fallback:** if nothing appears → click **＋ Task Source** to focus the field; retype + Enter.

## 4:00 — Drag + wire (1:30 min)
**Drag** the `codex` card from the Dockingstation onto the canvas (or click it to add). Click the card →
type instruction (*"Append health-check line to README.md"*). **Wire:** click source card's
**output dot → codex input dot**. Chain shows 1 wire, *"Port 1 defines the chain."*
Say: *"N8N-style: drag, instruct, wire. Port 1 drives execution."*
**Fallback:** if codex shows unavailable → click the card to cycle agent (codex→gemini→grok→muse);
gemini CLI is local too. If dots don't respond → **↺ Reset** wires, re-wire output→input.

## 5:30 — Execute (1 min)
Click **▶ Execute Workflow** (bottom-right under the canvas) → `POST /api/workflow` + `/run`; Run panel shows `Task t… • running`;
chain runs on `task/<id>` branch, watch status flip to `review_ready`.
Say: *"Runs isolated on a branch — nothing touches main yet."*
**Fallback:** if `⛔ … none has instructions` → click the card, type instruction, Execute again.
If step fails → Abort (⏹), fix instruction, re-run.

## 6:30 — Tommy approve (1 min)
Switch to **`/tommy` tab** → approvals queue auto-refreshes (10s) or hit **↻ LOAD**. Card shows goal +
branch + check result + DIFFSTAT. Click **✅ YES** (as Tommy).
Say: *"External human authority — no merge without a human YES."*
**Fallback:** if queue empty → task still running: wait 20s, ↻ LOAD. If `⛔ Token missing` → paste bridge
token into the token field (session-only). Emergency: approve from V6's own Human Authority Module instead.

## 7:30 — Merge (30s)
Back on `/v6` → **⑂ Merge retry branch** → confirm dialog → *"Merged ✓ task/… → HEAD"*.
Run panel shows `mergedAt` + commit.
Say: *"Approved branch merged — full loop: chat, chain, human, merge."*
**Fallback:** if `⛔ Merge blocked: needs Human Authority approval` → approval hasn't landed yet:
re-check Tommy tab, hit YES, retry Merge. If `Already merged` → you're done, show the commit line.

## Provider cheat-card (jury Q&A)
| Provider | Status | Select? |
|---|---|---|
| ChatGPT (server env) | live | YES |
| Grok (server env) | live | YES |
| Wonder (Meta key) | live | YES if time |
| Spark (Meta key) | live | YES if time |
| Gemini 3.5-flash (paid) | live | YES |
| Claude sonnet-5-5 (€5 loaded) | live | YES if time |
| Llama / Code cards | mapped to Spark provider | mention mapping if asked |
| SAM | API 404, parked | NEVER |
| Codex / Gemini CLI (workflow dock) | local CLIs | YES for canvas chain |

## Demo-day safety notes (from code review)
- Chat renders everything as text now (XSS fixed) — pasting HTML is safe.
- Keep `git merge --abort` ready in case a merge conflicts live.
- Grok review steps can take up to 120s to cancel — don't double-click Abort.
