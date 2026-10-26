# GEMINI.md — NOVA / Yggdrasil

**Primary instruction file for Gemini CLI**  
**Scope:** Browser Dashboard Sound Integration + ongoing Design / Cross-Check work  
**Role (Trinity Contract v0.2):** Design & Cross-Check  
**Date:** 2026-10-25  
**Authority:** Human (Gürkan)

---

## 0. Who you are in this project

You are **Gemini** in the NOVA–Yggdrasil multi-agent system.

| Role | Agent | What you do |
|------|-------|-------------|
| Architecture & Security | Grok | Review, hard-rejects, security |
| **Design & Cross-Check** | **You (Gemini)** | Design, interfaces, alternatives, integration quality |
| Implementation & Verification | ChatGPT | Code when explicitly released |

You may implement **this specific released task** (Sound Pack → Dashboard).  
You do **not** change architecture, MCP, or security models without Human approval.

---

## 1. Current released task (do this)

### Goal
Integrate the **NOVA UI Sound Pack** into the browser dashboard so that UI interactions (clicks, panel open/close, confirm, hover, important actions) and the intro/ambient layer have matching audio.

### Assets (already in repo / local)
```
nova-sounds/
├── GEMINI.md              ← detailed sound reference + code snippets
├── README.md
├── sounds-map.json        ← machine-readable map
├── nova_intro_video_ambient.mp3
├── nova_ambient_intro_pad.mp3
├── nova_ui_click_soft.mp3
├── nova_ui_click_sharp.mp3
├── nova_ui_blip.mp3
├── nova_ui_confirm.mp3
├── nova_ui_bass_hit.mp3
├── nova_ui_bass_thump.mp3
├── nova_ui_whoosh.mp3
├── nova_ui_whoosh_reverse.mp3
├── nova_ui_hover_pad.mp3
└── nova_ui_decay_tail.mp3
```

> **Note:** Binary MP3s may still be only local / in `nova-sounds-pack.zip`.  
> If missing in the working tree, copy them from the zip or from the project artifacts before wiring.

### Target files
| File | Action |
|------|--------|
| `dashboard/index.html` | Add `<audio>` elements + JS play helpers + wire existing buttons / graph toolbar / chat send |
| `dashboard/server.mjs` | Ensure static serving of `/nova-sounds/*` (or serve from `nova-sounds/` root) |
| optionally `dashboard/sounds.js` | Extract pure sound logic if the HTML becomes too heavy |

### Required behaviour
1. **Normal click / button** → `nova_ui_click_sharp` (optional follow with `nova_ui_confirm` or `nova_ui_decay_tail` at lower volume)
2. **Important action** (Execute Workflow, Reset Graph, auth) → `nova_ui_bass_thump` or `nova_ui_bass_hit`
3. **Panel / node / drawer open** → `nova_ui_whoosh`
4. **Close / reverse** → `nova_ui_whoosh_reverse`
5. **Notification / status change** → `nova_ui_blip`
6. **Hover (desktop, optional)** → `nova_ui_hover_pad` at very low volume (0.15–0.25)
7. **First load / intro** → play `nova_intro_video_ambient` once (or the shorter pad); do not force continuous loop unless user wants ambient bed

### Volume guidelines
| Type | Volume |
|------|--------|
| Clicks / blips | 0.55 – 0.75 |
| Whooshes | 0.45 – 0.60 |
| Bass / thumps | 0.50 – 0.70 |
| Confirm / decay | 0.35 – 0.50 |
| Ambient | 0.15 – 0.30 |

Always handle `play()` Promise rejection (autoplay policy).

### Minimal integration pattern
```html
<audio id="sfx-click"   src="/nova-sounds/nova_ui_click_sharp.mp3" preload="auto"></audio>
<audio id="sfx-confirm" src="/nova-sounds/nova_ui_confirm.mp3" preload="auto"></audio>
<audio id="sfx-whoosh"  src="/nova-sounds/nova_ui_whoosh.mp3" preload="auto"></audio>
<audio id="sfx-bass"    src="/nova-sounds/nova_ui_bass_thump.mp3" preload="auto"></audio>
<audio id="amb-intro"   src="/nova-sounds/nova_intro_video_ambient.mp3" preload="auto"></audio>
```

```js
function playSfx(id, volume = 0.6) {
  const el = document.getElementById(id);
  if (!el) return;
  el.volume = volume;
  el.currentTime = 0;
  el.play().catch(() => {});
}
```

Prefer reading semantic keys from `nova-sounds/sounds-map.json` if you introduce a small loader.

### Server change (server.mjs)
Extend the static file handler so that paths under `/nova-sounds/` resolve to the `nova-sounds/` directory (MIME type `audio/mpeg` for `.mp3`).

---

## 2. Acceptance criteria

- [ ] All primary UI actions in the dashboard produce the correct sound
- [ ] No console errors from missing audio files or autoplay blocks
- [ ] Ambient does not stay loud or loop unintentionally
- [ ] Sound logic is readable and does not break existing graph / chat / auth behaviour
- [ ] `nova-sounds/GEMINI.md` and `sounds-map.json` remain the source of truth for filenames and volumes
- [ ] You document what you changed (short note in a comment or in `ecosystem-memory` / SYNC if used)

---

## 3. Project rules you must respect

1. **Trinity Contract v0.2** is binding (see `reports/trinity-agent-contract-v0.2.md` or project docs).
2. Do not invent new architecture or a second MCP server.
3. Do not silently upgrade status or claim “done” without evidence.
4. Prefer minimal, reversible changes to `dashboard/index.html` and `server.mjs`.
5. If something is blocked (missing MP3s, path issues), report it clearly instead of inventing placeholders.

---

## 4. Quick start for you (Gemini CLI)

```text
1. Read this file (GEMINI.md) completely.
2. Read nova-sounds/GEMINI.md and nova-sounds/sounds-map.json.
3. Inspect dashboard/index.html and dashboard/server.mjs.
4. Ensure nova-sounds/*.mp3 are present in the working tree (unzip nova-sounds-pack.zip if needed).
5. Implement the wiring.
6. Smoke-test: click buttons, open graph actions, send a chat message, load page.
7. Report what changed and any remaining gaps.
```

---

## 5. Related context

- `PROJECT_CONTEXT.md` — high-level multi-agent memory
- `nova-sounds/GEMINI.md` — full sound pack reference
- `nova-sounds/sounds-map.json` — machine map
- Trinity Agent Contract v0.2 — roles and status rules
- Dashboard lives in `dashboard/` (single-page + small Node server on port 8080)

---

*Created by Grok for shared multi-agent context · 2026-10-25*  
*Task: Integrate NOVA UI Sound Pack into browser dashboard*
