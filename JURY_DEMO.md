# NOVA // Ygdrassil — 8-Minute Jury Click-Script

Source: delegated agent inspection of index.html, tommy/index.html, bridge routes (night shift).
Provider reality at write time: chatgpt+grok live, gemini quota-dead, claude broke, wonder fixed (needs restart).

**Setup before jury enters:** `node muse-spark-bridge.js` running (or `start.bat`), browser tabs open:
`http://127.0.0.1:8000/v6` + `http://127.0.0.1:8000/tommy`. Keys in server `.env`:
`OPENAI_API_KEY`, `XAI_API_KEY` (live), `META_API_KEY` (wonder, needs bridge restart after fix).

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
In **NOVA // Chat**, click agent cards to activate **exactly these two: 💬 ChatGPT + ⚡ Grok**
(deselect others, incl. default spark). Type: *"Summarize our continuity strategy in 3 bullets, then
challenge one assumption."* → **▶ Send**.
Result: two answer bubbles, memory badge shows context chars (`/api/chat` fan-out, memory-aware).
Say: *"Multi-select = parallel answers; green lamps = live via server env."*
**Why these two:** chatgpt+grok are live via server env. Do NOT select: Gemini (API quota-dead, 429s),
Claude (no credits), Wonder/Spark unless bridge was restarted after the wonder fix.
**Fallback:** if one returns `⚠️ failed` → point at the red lamp: *"Per-provider failure is isolated,
the other answer still lands"* — continue with the survivor. If both fail → bridge down: restart
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
gemini CLI is local too. If dots don't respond → **⟳ Reset** wires, re-wire output→input.

## 5:30 — Execute (1 min)
Click **▶ Execute Workflow** → `POST /api/workflow` + `/run`; Run panel shows `Task t… • running`;
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
| Wonder (server env) | fixed, needs bridge restart | only if restarted |
| Spark (Meta key) | depends on Meta API | optional 3rd |
| Gemini API | quota-dead (429) | NO |
| Claude | no credits | NO |
| Codex / Gemini CLI (workflow dock) | local CLIs | YES for canvas chain |

## Demo-day safety notes (from code review)
- Chat renders everything as text now (XSS fixed) — pasting HTML is safe.
- Keep `git merge --abort` ready in case a merge conflicts live.
- Grok review steps can take up to 120s to cancel — don't double-click Abort.
