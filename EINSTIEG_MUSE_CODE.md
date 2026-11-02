# NOVA // Ygdrassil – Einstiegsbericht für Muse Code

**Stand:** 02.11.2026 · **Autor:** Muse Code (Einstiegsanalyse) · **Sprache:** Deutsch
**Umfang:** NOVA-META-Edition (274 Dateien) + Nova V2 (145 Dateien), Hashvergleich,
~60 Dateien vollständig gelesen, Testsuite ausgeführt, Git-Audit durchgeführt.
`.env`-Dateien wurden aus Prinzip **nicht** gelesen (Credential Isolation).

**Beweisklassen** (nach PRECODER-Konvention im Repo):
`VERIFIZIERT` = selbst geprüft · `DOKUMENTIERT` = steht in Repo-Dateien, nicht selbst geprüft ·
`HYPOTHESE` = meine Schlussfolgerung · `OFFEN` = unbekannt · `FEHLT` = referenziert, aber nicht im Baum.

---

## 0. TL;DR – die 10 wichtigsten Punkte

1. **Zwei Ordner, ein System:** `NOVA-META-Edition` ist die Hackathon-Edition (Meta Global AI
   Hackathon 2026). `Nova V2` ist der Vorgänger. `context/` in META spiegelt V2 zu 123/145 Dateien
   hash-identisch (`VERIFIZIERT`).
2. **META-Neuheit (24 eigene Dateien):** Muse-Spark-Bridge (HTTP-Server :8000), V6-Dashboard
   (`index.html`), Tommy-Portale, `agents/muse-spark-orchestrator` (MCP-Server mit 3 Tools).
3. **Herzstück V2:** `connector-v3` – sauber gebauter MCP-Gateway (Railway) + WSS-Worker
   (Windows) + PostgreSQL-Jobleasing. **Tests VERIFIZIERT: 32 bestanden, 0 Fehler, 2 übersprungen.**
4. **Governance:** Human Authority = Gürkan (+ Tommy als externer Ja/Nein-Knoten). Peers
   (Grok, ChatGPT, Claude) sind read-only; nur der Muse-Orchestrator darf via Codex-V3-Worker
   schreiben. Vorschläge sind Evidenz, keine Autorität.
5. **Security-Audit sauber:** Keine Live-Secrets im Git (`VERIFIZIERT` via `git ls-files`).
   Aber: 3 echte Befunde (Dashboard auf `0.0.0.0` ohne Auth, Bridge-Dateileser ohne
   Pfadbegrenzung, Keys in Browser-localStorage) + 1 Privacy-Thema (persönliche Daten in
   `user-profile.md` im Repo). Details in Abschnitt 10.
6. **Arbeitsbaum ≠ Commit:** `muse-spark-bridge.js` ist lokal ein uncommittetes V2-Rewrite
   (+201/−55). Committet ist noch das alte Konsolen-Skript (`VERIFIZIERT` via `git diff`).
7. **Lücken:** UI-Sounds (0/12 MP3s im Repo), `dashboard-v2-meta` (nur README), keine CI in META,
   `accentless_speaking` (Flutter-App) nur in V2, Trinity-Contract-Datei `FEHLT`.
8. **Namens-Drift:** Drei Schreibweisen im Baum: `Yggdrasil`, `Ygdrassil`, `Ygddrasil` (`VERIFIZIERT`).
9. **Zwei PHOBOS-Begriffe:** (a) Deep-Reasoning-Modul → Muse Wonder, (b) CI-Merge-Orchestrator
   (nach Luis „Phobos") – Namens-Kollision, bitte trennen.
10. **Meine Rolle (Vorschlag):** Implementierung nach Freigabe (wie ChatGPT/Codex-Rolle),
    PRECODER-Regeln einhalten, Beweisklassen nutzen, `.env` nie lesen.

---

## 1. Bestandsaufnahme: Ordner, Dateien, Git

### 1.1 Datei-Inventar (`VERIFIZIERT`, ohne `node_modules`/`.git`)

| Ort | Dateien | Bemerkung |
|---|---|---|
| `NOVA-META-Edition/` gesamt | 274 | 24 eigene + 250 in `context/` |
| `Nova V2/` gesamt | 145 | Vorgänger-Stand |

Hashvergleich V2 ↔ `context/` (`VERIFIZIERT`):

| Kategorie | Anzahl | Inhalt |
|---|---|---|
| Hash-identisch | 123 | Alle Connectoren, `connector-v3` komplett, Docs, Memory (außer Profil), CI, Tests, Skripte |
| Unterschiedlich | 7 | `.gitignore`, `logo.ico`, `PROJECT_CONTEXT.md`, `dashboard/index.html`, `dashboard/logo.ico`, `dashboard/server.mjs`, `ecosystem-memory/user-profile.md` |
| Nur in V2 | 15 | Komplett: `accentless_speaking/` (Flutter-App) |
| Nur in `context/` | 119 | Grafik-Prework (24), Old-PC-Historie V1–V1.5 (~60), `PHOBOS.md`, `PRECODER.md`, `STRATEGY_MODEL_CONTINUITY.md`, `GEMINI.md`, `GEMINI-Nova-Voice.md`, `nova-sounds/` (Doku), `Sounds/` (3 MP3s), `YGDRASSIL`-Doc, `muse-connector-3000` (Alt-Version), `PROJECT_CONTEXT - Kopie.md`, `package.json` (localtunnel), Phobos-Spec, IDEEN-Extras |

Wichtige Identitäten (`VERIFIZIERT` per Hash):
`PROJECT_CONTEXT - Kopie.md` = V2-`PROJECT_CONTEXT.md` (Stand 08.10.).
`context/PROJECT_CONTEXT.md` ist die neuere Fassung (25.10., + Sound-Pack-Zeile).
`agents/muse-spark-orchestrator/` ↔ `context/muse-connector-3000/`: `GEMINI.md`, `.env.example`,
`tools/code.ts`, `tools/orchestrate.ts` identisch – **nur `src/index.ts` ist neu geschrieben**
(5285 vs. 2656 Bytes).

### 1.2 Git (`VERIFIZIERT`)

- **Remote:** `origin` → `https://github.com/skywalker-gh/NOVA-META-Edition.git`
- **META-Historie (6 Commits):** `genesis` (26.10.) → Dashboard-Finals → Tommy Portal v1 (01.11.)
  → `.gitignore`-Fix → `baseline active` („ready for workflow manager 04.11").
- **V2-Historie:** Initial Commits + Grok/Dashboard-Fixes (u. a. CORS, Memory-Injection in Prompts).
- **Branches:** `main`, `dev/gürkan-workstation`, `dev/tommy-authority` (+ Remote-Tracking) –
  entspricht exakt dem README-Plan.
- **Arbeitsbaum:** `M muse-spark-bridge.js` – einzige uncommittete Änderung (V1→V2-Rewrite).
- **Secret-Audit:** `git ls-files` listet nur `.env.example`-Dateien (7×). **Keine Live-`.env`,
  kein `Token.json` getrackt.** `.gitignore` deckt `.env` (alle Ebenen), `*.psd`, `*.mp3`,
  Grafik-Ordner, `Old PC Apps - Ref/`, `node_modules/`, `*.log` ab. V2-`.gitignore` ist analog
  (Standard-Variante). `context/.gitignore` = V2-Variante + `*.psd`.
- Live-`.env`-Dateien existieren lokal (Root, agents, 4× Connectoren) und sind git-ignoriert.
  Inhalt nicht gelesen. Auffällig: `context/` dupliziert die V2-Secrets (Hygiene-Thema S5).

### 1.3 Die 24 META-eigenen Dateien (außerhalb `context/`)

```
.env / .env.example / .gitignore / package.json / package-lock.json
.gemini/settings.json                    MCP-Registrierung (muse-spark-commander)
muse-spark-bridge.js                     HTTP-Server :8000 (GitHub-Proxy, File-Reader, Tommy)
push_tommy.js                            GitHub-Pages-Aktivierung per API
index.html                               V6-Dashboard (Single-File, 23 KB)
tommy/index.html                         Tommy-Statusportal (6,6 KB)
online-dashboard/tommy/index.html        Tommy-JA/NEIN-Demo (2,2 KB)
dashboard-v2-meta/README.md              nur Platzhalter (262 Bytes)
grafik/NOVA_Ygdrassil_Banner.jpg         Banner (239 KB)
NOVA-META-Setup.bat / start.bat          Setup + Start
agents/muse-spark-orchestrator/          MCP-Orchestrator (GEMINI.md, package.json,
                                         package-lock.json, src/*.ts, .env[.example])
```

---

## 2. Architektur

### 2.1 Gesamtbild

```
                    ┌─────────────────────────────────────────────┐
                    │            META-EDITION (Hackathon)         │
                    │  index.html V6 · Bridge :8000 · Tommy-Port  │
                    │  agents/muse-spark-orchestrator (MCP/stdio) │
                    │  Spark=PRECODER · Wonder=PHOBOS · Code=Bau  │
                    └──────────────┬──────────────────────────────┘
                                   │ delegiert Schreib-Tasks
                    ┌──────────────▼──────────────────────────────┐
                    │         NOVA V2 AGENT-BUS (context/)        │
 aparate Clients    │  Grok-Conn. │ ChatGPT/Claude-Conn. │ Gemini │
 (Desktop/Cursor/   │  (read-only, stdio+MCP-Probe)      │ Bridge │
  Custom-GPT)       └──────────────┬──────────────────────────────┘
                                   │ Kanonischer MCP-Pfad (1×)
                    ┌──────────────▼──────────────────────────────┐
                    │  connector-v3: Gateway (Railway, HTTP-MCP)  │
                    │  + WSS-Worker (Windows, Codex CLI) + PG     │
                    │  Tools: status / ask (ro) / implement (w)   │
                    └─────────────────────────────────────────────┘
```

### 2.2 Komponenten-Tabelle

| Komponente | Pfad | Transport | Rolle | Status |
|---|---|---|---|---|
| Muse Orchestrator (neu) | `agents/muse-spark-orchestrator/` | MCP stdio | Privilegierter Orchestrator (WRITE via V3) | `VERIFIZIERT` gelesen, Lauf `OFFEN` |
| Muse Connector (alt) | `context/muse-connector-3000/` | MCP stdio | Vorgänger, 4 Tools | `VERIFIZIERT` (Referenz) |
| Grok Connector | `context/grok-connector-3000/` | stdio + HTTP-Probe | Adversarial Review (ro) | `DOKUMENTIERT` getestet („Brücke steht") |
| ChatGPT/Claude Bridge | `context/chatgpt-claude-connector-3000/` | stdio (+HTTP/SSE) | Reasoning + Review (ro) | ChatGPT `DOKUMENTIERT` ok, Claude ohne Credits |
| Codex V3 | `context/connector-v3/` | HTTP-MCP + WSS + PG | Sandboxed Build/Run | `VERIFIZIERT` 32/32 grün (2 Skip) |
| Gemini Bridge | `context/gemini-connector-3000/` | stdio | High-Context-Peer | `DOKUMENTIERT` |
| V2-Dashboard | `context/dashboard/` | HTTP :8080 | Node-Graph, Chat, Memory | `VERIFIZIERT` gelesen (s. 5.2) |
| FastAPI-Backend | `context/backend/` | HTTP | Stub (fake `/chat`) | `VERIFIZIERT` (0.1, Ausbau offen) |
| Memory-Sync | `context/scripts/sync-memory.mjs` | Batch | Handoffs → PROJECT_CONTEXT | `VERIFIZIERT` gelesen |
| E2E-Test | `context/test/agent-bus.e2e.test.js` | `node --test` | 3 Struktur-Checks | `VERIFIZIERT`, läuft nicht in CI |
| CI | `context/.github/workflows/ci.yml` | – | V3-Tests + Syntaxchecks | `VERIFIZIERT`, in META wirkungslos (s. F3) |
| Accentless (Flutter) | nur `Nova V2/accentless_speaking/` | – | RP-Aussprache-Coach | Prototyp, Engine simuliert |

### 2.3 Prinzipien (aus Docs + Code konsistent belegt)

1. **Ein kanonischer MCP-Pfad.** Connectoren proxyen/proben, duplizieren keinen Server.
2. **Read-only by default.** Externe Peers liefern Evidenz. Schreiben nur: Codex-V3-Worker
   (`workspace-write`) im Auftrag des privilegierten Orchestrators.
3. **Credential Isolation.** Keys nur in `.env` (git-ignoriert); Gateway kennt nur SHA-256-Verifizierer.
4. **Workspace-Sandbox.** `NOVA_PROJECT_ROOT` wird kanonisiert und validiert; ehrlich dokumentierte
   Grenze: Windows-Read-Boundary unverifiziert (s. 10/S7).
5. **Human Authority final.** Gürkan entscheidet; Tommy = externer Ja/Nein-Knoten.

---

## 3. META-Neuerungen im Detail

### 3.1 `muse-spark-bridge.js` – HTTP-Server auf :8000 (`VERIFIZIERT`)

Läuft via `npm run dev|start|bridge|tommy` (alle 4 Skripte = derselbe Befehl).
Bindet `127.0.0.1:8000` (`NOVA_PORT` überschreibt). Braucht `META_API_KEY` (Abbruch ohne),
optional `GITHUB_PAT`/`GITHUB_TOKEN`. Repo-Default: `skywalker-gh/NOVA-META-Edition`.

| Endpunkt | Funktion |
|---|---|
| `/`, `/status` | JSON-Status + alte-NOVA-Ordnerliste |
| `/tommy` | Serviert `tommy/index.html` (Fallback: `online-dashboard/tommy/`) |
| `/api/github/content?path=` | GitHub-Proxy (Datei/Verzeichnis, PAT-Auth) |
| `/api/github/list?path=` | GitHub-Verzeichnislisting |
| `/api/local/read?path=` | Lokale Datei als JSON |
| `/api/local/raw/…` | Lokale Datei als Text |
| `/api/local/old-folders` | Scannt Desktop + OneDrive-Desktop nach NOVA-Ordnern |

Start-Sequenz testet Meta-API (`GET /v1/models`, Bearer) und GitHub-Repo per `fetch`.
**Wichtig:** Committet ist V1 (reines Konsolen-Skript), im Arbeitsbaum liegt V2
(HTTP-Server + Proxy + Reader, +201/−55). Sicherheits-Einschränkungen s. 10/S2.

### 3.2 `index.html` – V6-Dashboard (`VERIFIZIERT`)

Single-File-App (210 Zeilen): Banner, Chat (Multi-Tech-Fan-out an alle selektierten Modelle),
12 Tech-Toggles (Spark, Wonder, Image, SAM 3.1, Code, Llama, ChatGPT, Grok, Gemini, Codex,
Claude, Gemini CLI), 6 API-Key-Felder (localStorage `nova_keys_v6`, Ampel-Logik), Todo-Liste,
Build-Log, Human-Authority-Karte (Tommy). Browser ruft Provider-APIs **direkt** auf
(OpenAI-, Meta-, xAI-, Anthropic-, Google-Endpunkte, feste Modellnamen wie `gpt-4o-mini`,
`grok-beta`, `claude-3-5-sonnet-20241022`, `gemini-1.5-flash`). Ohne Key: Echo-Fallback.
Sonderfunktion: erkannte E-Mail-Adresse erzeugt `mailto:`-Entwurf. S. 10/S3.

### 3.3 Tommy-Portale (`VERIFIZIERT`)

- `tommy/index.html`: Status-Portal (6 Karten: Muse/Spark WRITE, ChatGPT/Grok read-only,
  Tommy-Node standby, NOVA-Worker, GitHub) + statischer Log-Snapshot vom 01.11.2026.
  Der Snapshot **behauptet** (`DOKUMENTIERT`, nicht von mir geprüft): Meta-API verbunden
  (Modelle `muse-wonder-1.0`, `sam-3.1`, `muse-spark-1.3-contributor`), GitHub verbunden,
  Repo **öffentlich** (`Private: false`) – letzteres bitte verifizieren (s. 10/S4).
- `online-dashboard/tommy/index.html`: JA/NEIN/MEHR-INFOS-Demo mit 3 festen Fragen, nur lokal
  (Commit nach `dev/tommy-authority` ist `confirm()`-Simulation).
- `push_tommy.js`: aktiviert GitHub Pages per API (`main`, `/`) – Ziel-URL im Skript:
  `https://skywalker-gh.github.io/NOVA-META-Edition/tommy/`. Syntax `VERIFIZIERT`.

### 3.4 `agents/muse-spark-orchestrator/` (`VERIFIZIERT`)

MCP-stdio-Server (`muse-spark-commander` v3.0.0), registriert in `.gemini/settings.json`
via `npx tsx …/src/index.ts`. OpenAI-SDK gegen `META_ENDPOINT`
(Default `https://api.meta.ai/v1`). **Dependencies installiert (`VERIFIZIERT`: `node_modules`
+ `tsx` vorhanden)** – startklar sobald `META_API_KEY` gesetzt ist.

| Tool | Modell | Rolle |
|---|---|---|
| `muse_spark_orchestrate` | `muse-spark` | PRECODER – plant, delegiert an V3-Worker |
| `muse_wonder_reason` | `muse-wonder-1.0` | PHOBOS – Deep Reasoning |
| `muse_code_build` | `muse-code` | Code-Worker (Ausgabe → V3-Worker schreibt sandboxed) |

`meta-client.ts` sucht `.env` an 5 Stellen (inkl. 2 fest verdrahteter OneDrive-Pfade, einer
davon ein Legacy-Ordnername, der nicht mehr existiert – s. F5). `src/tools/*.ts` sind
**ungenutzte Duplikate** der in `index.ts` inline implementierten Calls (s. F2).
Die Alt-Version `context/muse-connector-3000/` nutzt dagegen genau diese Helper und bietet
4 Tools (zusätzlich `muse_peer_review`) – dort aber mit ungetypten `"tools/list"`-Handlern.

### 3.5 Rest: Bats, Settings, Platzhalter

- `NOVA-META-Setup.bat`: prüft `context/`, `git init`, `.env`-Kopie, `git add .` + Commit,
  `npm install` im Orchestrator. Sauber, `.env` durch `.gitignore` geschützt.
- `start.bat`: öffnet **zwei** Fenster, beide starten die Bridge auf :8000 → zweites Fenster
  stirbt mit `EADDRINUSE` (s. F1).
- `.gemini/settings.json`: nur der Commander registriert; `cwd` ist ein absoluter
  Benutzer-Pfad (nicht portabel – s. F5).
- `dashboard-v2-meta/`: nur README (React+Tailwind-Plan, „Build after kickoff") – `OFFEN`.
- `grafik/NOVA_Ygdrassil_Banner.jpg`: eingebunden in `index.html` + Tommy-Portal.

---

## 4. Connectoren im Detail

### 4.1 `connector-v3` – Gateway + Worker + PostgreSQL (`VERIFIZIERT` gelesen + getestet)

**Gateway** (`src/gateway.js`, Railway, stateless): `POST /mcp` (Streamable HTTP),
`WSS /worker` (Bearer, max 1 MiB), Health (`/health/live|ready|worker`). Max 2 aktive Jobs
pro Worker, 10er-Queue-Limit, `requestTimeout` ~61 Min. **Worker** (`src/worker.js`, Windows,
outbound WSS): 5-s-Heartbeats, Jitter-Backoff (500 ms→30 s), `Retry-After`-Respekt, Stopp bei
401/404, Session-FIFO (`session-queue.js`), max 2 parallele Jobs. **JobStore** (`001_jobs.sql`):
`connector_workers` (generation, heartbeat) + `connector_jobs` (UUID, principal, tool,
idempotency-Key UNIQUE, Zustände inkl. `indeterminate`, Body-Purge 24 h, Meta-Purge 30 d).
**Runner** (`codex-runner.js`): Codex-CLI `read-only` (status/ask) bzw. `workspace-write`
(implement). **Config** (`config.js`): strikte Validierung (SHA-256-Hashes, `wss:`-Pflicht
außer localhost, `NOVA_PROJECT_ROOT` muss existieren, `.cmd/.bat` als `CODEX_BIN` verboten).

Tool-Vertrag: `codex_project_status` (ro, Heartbeat < 15 s), `codex_ask` (ro, prompt +
optional session/timeout), `codex_implement` (+request_id, Dedupe, `indeterminate`-Quarantäne
statt Replay). **Testsuite selbst ausgeführt: 34 Tests, 32 bestanden, 0 Fehler,
2 übersprungen** (PG-Integration ohne `TEST_DATABASE_URL`) – die „32/32"-Aussage ist damit
im Kern `VERIFIZIERT`. Deployment laut README: Railway + Postgres + ChatGPT-Connector,
`npm run start:worker` in eingeloggter Windows-Session.

### 4.2 Peer-Bridges (Grok / ChatGPT+Claude / Gemini)

Alle: stdio-MCP-Server + `plugin.json`/`.mcp.json` + Skill-Datei + `.env.example`.
Gemeinsame Tools: `*_ask`, `*_project_review` (ro), `project_read_state`,
`project_write_handoff`, `nova_mcp_probe` (initialize/tools-list/ping gegen `NOVA_MCP_URL`).
Skills schreiben VERIFIED-vs-UNVERIFIED-Disziplin und „Proposals sind Evidenz" vor.
`connector-recovery/` hält versionierte Snapshots (`codex-connector-3000/0.2.3`,
`grok-connector-3000/0.4.2`). Gemini-`plugin.json` nennt Capability `Write` – im Widerspruch
zum Read-only-Narrativ der Peers (kleine Inkonsistenz; Gemini war Orchestrator, daher
vertretbar, aber dokumentieren).

---

## 5. Dashboards & Server

### 5.1 Drei UIs, zwei Server, zwei Ports

| UI | Datei | Server | Port/Bind |
|---|---|---|---|
| V6-Dashboard (META) | `index.html` | keiner (statisch, Direkt-Calls) | – (Pages/Filesystem) |
| Tommy-Status / Tommy-Demo | `tommy/`, `online-dashboard/tommy/` | Bridge | :8000, `127.0.0.1` |
| V2-Agent-Bus-Dashboard | `context/dashboard/index.html` | `context/dashboard/server.mjs` | :8080, **`0.0.0.0`** ⚠ |

### 5.2 V2-Dashboard: V2 vs. `context/` (`VERIFIZIERT` per Diff)

- `index.html`: **611 Diff-Zeilen** – `context/` ist ein komplettes Redesign (n8n-artiger
  Node-Graph mit Canvas, Docking-Station, Toolbar, Cards, Inter-Font, neuer Titel
  „…Ecosystem & Workflow Manager"). V2-Datei ist die ältere, schlichte Variante (11,5 KB
  vs. 41,5 KB).
- `server.mjs` (20 Diff-Zeilen): `context/` routet zusätzlich Modelle `gemini-cli`,
  `orchestrator`, `codex`, `phobos`, `precoder`, **`muse`** – aber die Antwort kommt aus
  `callGemini` (Google-API) mit Muse-Spark-Systemprompt (Etikett ≠ Leitung, s. F4).
  Zusätzlich: `/nova-sounds/`-Serving + `audio/mpeg`-MIME (der freigegebene Sound-Task
  aus `GEMINI.md` ist serverseitig umgesetzt).
- Server lädt `.env`-Keys der 3 Connectoren, proxy't `/api/chat` an xAI/OpenAI/Google mit
  `PROJECT_CONTEXT.md` als Systemkontext und served statische Dateien – **ohne Auth,
  CORS `*`, Bindung an alle Interfaces, ohne Pfad-Containment** (s. 10/S1).
- `backend/main.py` bleibt ein FastAPI-Stub (0.1, fake `/chat`, CORS `*` mit „später
  einschränken"-Kommentar). `context/package.json` zieht nur `localtunnel` (Tunnel-Plan).
- `conductor/` (3 Pläne) + `.superpowers`-Ledger + `docs/superpowers/` (Specs/Pläne, u. a.
  V3-Design, V3-Plan, Accentless-Spec – gesichtet, nicht Zeile für Zeile gelesen)
  dokumentieren den SDD-Prozess inkl. ehrlicher Lücken (kein Railway-Projekt, kein Docker,
  keine Live-Smokes, Grok/Gemini-Reviews per Human-Entscheid übersprungen).

---

## 6. Sound & Voice

- `nova-sounds/`: 12 semantische Keys (`sounds-map.json` v1.0.0, Quelle „Ali Tat – Ghost
  (Gee Remix)", 128 BPM), `GEMINI.md`-Integrationsanleitung (Audio-Tags + Web-Audio-Option,
  Lautstärken-Matrix), `README.md`. **MP3s: 0/12 im Repo (`VERIFIZIERT`, `*.mp3` ist
  git-ignoriert)** – Doku verweist auf Zip/Artefakte. Dashboard-Verdrahtung läuft ohne sie
  in 404s (Akzeptanzkriterium „keine Konsolenfehler" derzeit unerfüllbar).
- Einzige MP3s im Baum: 3 Quelltracks in `context/Sounds/` (Gee-Remixe/Masterings).
- `GEMINI-Nova-Voice.md`: Persona „Nova" (Stimme `celeste`, Deutsch, ruhig/kristallin),
  3 Begrüßungsskripte, wiederverwendbare Erklärbausteine (Stand 25.10., Canonical-Prinzip,
  Rollen, Mesh-Ausblick), Mix-Regeln. Referenzierte TTS/Ambient-Dateien
  (`nova_welcome_*.mp3`, `nova_crystal_ambient.mp3`) **fehlen** ebenfalls.
- `context/GEMINI.md` (25.10.): freigegebener Task „Sound Pack → Dashboard" mit
  Akzeptanzkriterien – serverseitig erledigt, UI-Verdrahtung + MP3s `OFFEN`.

---

## 7. Rollen, Prompts, Governance

- **Trinity Contract v0.2** (`DOKUMENTIERT` in mehreren Dateien, Datei selbst `FEHLT`):
  Grok = Architektur & Sicherheit, Gemini = Design & Cross-Check, ChatGPT = Implementierung
  nach Freigabe. Human Authority (Gürkan) final. In META abgelöst/erweitert um:
  Spark = PRECODER/Orchestrator, Wonder = PHOBOS/Reasoning, Code = Worker.
- **COMMANDER / OVERSEER / DETECTOR** (Prompts vom 09.10., je als `.md` + `.txt`-Duplikat):
  Commander = Task-Verteiler mit E-Mail-Berichtspflicht an Gürkan; Overseer = „digitaler
  Adler", Code-Überblick; Detector = tägliche 19-Uhr-Revision, findet je eine neue
  Verbindung. Alle drei fordern „vollen Zugriff" + Bericht in Repo/Projektordner. Status:
  Prototyp-Prompts, keine implementierten Agenten (`DOKUMENTIERT`).
- **PRECODER:** Voll-Spec in `IDEEN/.../PRECODER/PRECODER.md` (Leitfolge Verstehen→Entwerfen→
  Entscheiden→Freigabe; Beweisklassen; keine Implementierung ohne Gürkan-Freigabe) +
  Demo-Brief `PRECODER-001` (22.10., s. 9). `context/PRECODER.md` ist nur ein Stub
  („Add your original ideas here!").
- **PHOBOS × 2:** (a) `context/PHOBOS.md` (Stub): Deep-Reasoning/Angst-Analyse → Muse Wonder.
  (b) `docs/superpowers/specs/phobos-agent-design.md`: CI-Merge-Orchestrator (Branch-Isolation,
  Stunden-Merges, Test-Tiering, „Luis' Law"). **Namens-Kollision – bitte umbenennen.**
- **ABRPM** (`ABRPM.txt`): 5-Button-Methode (Analyze, Build, Reflect, Protect, Merge).
- **STRATEGY_MODEL_CONTINUITY.md** (26.10.): Gemini-zentrisch (Pro→Flash-Fallback,
  Sub-Agenten-Delegation, autonome Modellwahl). Gilt laut Datei für alle NOVA-META-Ops –
  sollte auf Meta-Modelle aktualisiert werden (`HYPOTHESE`: veraltet, aber nicht widerrufen).
- **Tommy:** Co-Entwickler, „Human Authority"-Partner per Browser-Link (s. 3.3).
- **E-Mail-Adresse** `guerkanguergm@gmail.com` steht in mehreren Prompts + `index.html`
  (Entwurfs-Funktion). `DOKUMENTIERT`, kein Leak (vom Autor selbst so vorgesehen).

## 8. Ygdrassil-Vision & verteilte Nodes

- **Mesh-Doc** (`YGDRASSIL - Mesh Netzwerk - 2018.md`, `.md` + `.txt`-Duplikat): Ygdrassil
  (Neil Alexander/Arceliya, 2018) als Provider-unabhängiges P2P-Mesh; Idee: MCP-Server an
  Yggdrasil-IPv6 binden, JSON-Payloads für alle CLIs, Peer-Registry mit Auto-Rerouting.
  Reine Pre-Code-Vision (`DOKUMENTIERT`, nichts implementiert).
- **Node-Grid** (aus `user-profile.md`, `DOKUMENTIERT`): Main-PC (Zentrale), Xiaomi 14
  (Termux-Agent), Lenovo-Laptop (Legacy-Worker), Xiaomi Note 10 (Telemetry/Reserve).
  Termux-Orchestrator-Idee auch im Mesh-Doc.
- **accentless_speaking** (nur V2, 15 Dateien, `VERIFIZIERT` gelesen): Flutter-App
  (Android, RP-Aussprache-Coach), G2G-Kollab-Protokoll (Cloud-/PC-Gemini), Stand 14.10.:
  Scaffolding. `OfflineRPEngine` ist ein **simulierter Prototyp** (erkennt nichts, scored
  immer „pass"). Nicht in `context/` übernommen – Schicksal `OFFEN`.

## 9. Historie

| Phase | Zeit | Stand |
|---|---|---|
| Nova V1–V1.5 | Archiv in `Old PC Apps - Ref/` | Ollama-Chat, Python-Module (emotion/ethics/guardian/intent/memory), **Hard Memory Mode** („Nicht im Memory gespeichert"), V1.5 Web-App (FastAPI+HTML), GPT-Experimente. V1-`system_prompt.txt` (19 Zeilen Prinzipien) → V1.3 (44 Zeilen, + explizite Anti-Halluzinations-Regeln). Kleine Versions-Drift: Ordner „V1.3", Prompt sagt „V1.4.2". |
| Nova V2 | bis ~25.10.2026 | Multi-Model-Bus (Grok/ChatGPT/Claude/Codex/Gemini), Dashboard, Sounds, Memory-Layer. |
| PRECODER-001 | 22.10.2026 | Demo-Brief für **anderen** Repo/Branch (`nova-v2-ygdrassil`, `hackathon/nova-yggdrasil-meta-ai-2026`): 3-Minuten-Demo, Option A (ein Primärpfad) empfohlen, Agent Bus R2/nicht freigegeben, Linear GUR-6/7/12, Railway/Supabase/Meta-Guthaben/ChatGPT-E2E = UNKNOWN. |
| META-Edition | 26.10.–02.11.2026 | Genesis → Dashboards → Tommy v1 → Baseline („ready for workflow manager 04.11"). Gemini-„Hang" → Muse Spark als Orchestrator. |

Nicht gelesen (privat, nur Inventar): `Old PC Apps - Ref/Nova V1/Bewerbungsunterlagen/`
(Lebenslauf .docx/.pdf) – Hinweis: liegt unter git-ignoriertem Pfad, trotzdem lokal sensibel.

## 10. Sicherheit & Privacy – Befunde

Schwere: 🔴 hoch · 🟡 mittel · 🟢 niedrig · 🔵 funktional/Hygiene.

- **S1 🔴 Dashboard-Server ohne Auth auf allen Interfaces.** `context/dashboard/server.mjs`
  bindet `0.0.0.0:8080`, CORS `*`, keine Authentifizierung – und proxy't `/api/chat` an
  **kostenpflichtige** APIs sowie `/api/memory`. Dazu **kein Pfad-Containment** im
  Static-Handler (`path.join('dashboard', url.pathname)` → `../`-Escape lesbar).
  LAN-Nachbar könnte Dateien lesen + API-Quota verbrennen. **Fix:** `127.0.0.1`, Bearer-Token,
  `path.resolve`+Präfix-Check. (Windows-Firewall mildert, verlässt euch nicht drauf.)
- **S2 🟡 Bridge-Dateileser ohne Begrenzung/Auth.** `muse-spark-bridge.js`
  (`readLocalFile`): `path.resolve(cwd, filePath)` ohne Containment-Check (Kommentar behauptet
  „Sicher" – falsch), kein Auth, CORS `*`. Milderung: bindet nur `127.0.0.1`; trotzdem kann
  **jede lokale Seite/jeder lokale Prozess** inkl. `.env` lesen. **Fix:** Root-Präfix-Check +
  Token wie V3.
- **S3 🟡 API-Keys in Browser-localStorage.** `index.html` speichert 6 Provider-Keys in
  `nova_keys_v6` und ruft APIs direkt aus dem Browser auf. XSS oder geteiltes Profil =
  alle Keys weg. **Fix:** Calls serverseitig über Bridge mit serverseitigen Keys.
- **S4 🔴 Persönliche Daten im Repo.** `context/ecosystem-memory/user-profile.md` enthielt
  sensible private Biografie-Details (**P0: entschärft am 02.11.2026**, alte Stände nur noch
  in Git-Historie – Purge nur mit ausdrücklicher Freigabe). Repo-Sichtbarkeit **VERIFIZIERT
  öffentlich** (`private:false`, GitHub-API 02.11.2026) – bei öffentlichem Repo keine privaten
  Details einchecken.
- **S5 🟢 `.env`-Duplikate.** V2-Secrets liegen zusätzlich als Kopien in `context/`
  (4 Connector-`.env`s + gemini-`.env` nur dort). Mehr Kopien = mehr Risiko. **Fix:** eine
  Quelle, Rest löschen.
- **S6 🟢 Key-Präfixe in Logs.** Tommy-Portal (`LLM_1130…`) + Bridge-Konsolen-Logs (8–12
  Zeichen). Niedrig, aber Prefixe erleichtern Raten/Phishing. **Fix:** nur `SET/MISSING`.
- **S7 🟡 Erinnerung, kein neuer Befund:** Windows-Read-Boundary (Codex-CLI `read-only`
  beweist keine Root-Begrenzung, CLI 0.152.0-Report, Win10-Home unverifiziert). Im Repo
  **korrekt und ehrlich** als offen dokumentiert (README + operations.md + SDD-Ledger).
  Bitte nicht an Untrusted callers exponieren, bis verifiziert.
- **F1 🔵 `start.bat` startet die Bridge 2× auf :8000** (`start … bridge` + `npm run dev`
  = identischer Befehl) → zweites Fenster `EADDRINUSE`. Fix: zweites Fenster ans
  V2-Dashboard (`:8080`) oder V6-Datei öffnen.
- **F2 🔵 Tote Code-Duplikate.** `agents/…/src/tools/*.ts` ungenutzt (index.ts inline);
  Alt-Version nutzt sie. Eine Variante wählen.
- **F3 🔵 Keine CI in META.** Kein `.github/` auf Root-Ebene; `context/.github/…` wird von
  GitHub nicht ausgeführt (und Pfade wären falsch: `cd connector-v3` statt `context/…`).
  Fix: Workflow auf Root kopieren + Pfade + E2E-Test aufnehmen (läuft derzeit nirgends).
- **F4 🔵 Etikett ≠ Leitung.** Dashboard-Modell `muse` ruft Google-Gemini-API. Umbenennen
  oder echten Meta-Call verdrahten.
- **F5 🔵 Stale Pfade.** `meta-client.ts` (Legacy-Ordnername), `GEMINI_APP_BRIDGE.md`
  (`Desktop\Desktop\Nova V2`), `.gemini/settings.json` (absolutes `cwd`). Portabel machen.
- **F6 🔵 Schreibweisen-Drift:** `Yggdrasil` (README), `Ygdrassil` (Titel/Docs),
  `Ygddrasil` (V2-Dashboard-Titel). Eine wählen.
- **Positiv (`VERIFIZIERT`):** keine Secrets in Git; SHA-256-Verifizierer statt Klartext;
  strikte Config-Validierung; `indeterminate`-Quarantäne; Generation-Fencing; 32 Tests grün;
  ehrliche UNKNOWN-Markierungen im SDD-Ledger.

## 11. Offene Punkte (UNKNOWN / OFFEN / FEHLT)

- Railway-Projekt, Supabase, Meta-Guthaben ($150/`LLM_…`), ChatGPT-E2E-Calls: aus
  PRECODER-001 als UNKNOWN übernommen, **nicht neu geprüft** (keine Netz-/Cloud-Checks).
- `MODEL_HANDOFF_*.md`: keine im Baum (`VERIFIZIERT` aus Inventar) – `sync-memory.mjs`
  schreibt folgerichtig „none".
- `reports/trinity-agent-contract-v0.2.md` (in `GEMINI.md` referenziert): `FEHLT` im Baum.
- Kanonischer MCP-Endpunkt (`NOVA_MCP_URL`): produktiv `OFFEN` (V3 deploybar, kein
  belegtes Live-Deployment in den gelesenen Dateien).
- `dashboard-v2-meta/`, MP3-Einspielung, UI-Soundverdrahtung, `accentless`-Schicksal,
  uncommittete Bridge, Repo-Sichtbarkeit: Entscheidungen bei Gürkan.

## 12. Arbeitsregeln für mich (Muse Code) – Vorschlag zur Abnahme

1. **PRECODER zuerst:** Verstehen → Entwerfen → Entscheiden → erst nach deiner Freigabe bauen.
2. **Meine Rolle:** Implementierung + Verifikation nach Freigabe (Codex-/ChatGPT-Slot);
   kein Overbossing, keine Architektur-Änderungen ohne dich.
3. **Beweisklassen** in jedem Bericht (VERIFIZIERT/DOKUMENTIERT/HYPOTHESE/OFFEN).
4. **`.env` nie lesen, nie ausgeben, nie committen.** Keys nur als `SET/MISSING`.
5. **Keine stillen Status-Upgrades** („done" nur mit Beleg: Testlauf, Diff, Log).
6. **Sicherheit zuerst:** neue Server nur `127.0.0.1` + Auth + Pfad-Checks (S1/S2 heilen,
   nicht wiederholen). Deutsch antworten, kurz und ohne Floskeln.
7. **Nützliche Befehle:**
   - `cd context/connector-v3; npm test` (32 grün, 2 Skip ohne PG)
   - `node --check <datei>` für Syntax (Node v22.12.0 vorhanden)
   - `node muse-spark-bridge.js` (braucht `.env` mit `META_API_KEY`)
   - `cd agents/muse-spark-orchestrator; npm run dev` (deps installiert)

## 13. Vorgeschlagene nächste Schritte

| Prio | Schritt | Behebt |
|---|---|---|
| P0 | S1 heilen (127.0.0.1 + Token + Pfad-Check) | 🔴 |
| P0 | S4 klären (Repo privat? Profil entschärfen) | 🔴 |
| P0 | S2 heilen (Präfix-Check + Token) | 🟡 |
| P0 | Bridge V2 committen + pushen | Deployment-Weiche |
| P0 | `start.bat` fixen | F1 |
| P1 | MP3s einspielen + Sound-UI verdrahten | Akzeptanz GEMINI.md |
| P1 | CI auf META-Root (Pfade + E2E) | F3 |
| P1 | Keys aus Browser → Bridge-Proxy | S3 |
| P2 | Tools-Duplikat, stale Pfade, Schreibweise, Trinity-Datei | F2/F4/F5/F6 |
| P2 | `dashboard-v2-meta` vs. V6 vs. V2-Dashboard entscheiden | Strategie |

---

## Anhang A – Gelesene Dateien (~60, alle `VERIFIZIERT`)

README.md, package.json, `.env.example`, `.gitignore` (beide Repos), `PROJECT_CONTEXT.md`
(3 Fassungen), PHOBOS/PRECODER/STRATEGY (Root), GEMINI.md + GEMINI-Nova-Voice.md,
docs (multi-model-ecosystem, ecosystem-patch), ecosystem-memory (3), conductor (3),
YGDRASSIL-Mesh, PRECODER (+ Demo-Brief Kopf), COMMANDER/OVERSEER/DETECTOR-Prompts,
ABRPM/TikTok-Texte, muse-spark-bridge.js, push_tommy.js, index.html, beide Tommy-Portale,
dashboard-v2-meta/README, beide .bats, `.gemini/settings.json`, Orchestrator (alle 6),
muse-connector Alt-Index, connector-v3 (README, operations, package, gateway, config,
worker, migration), dashboard (server voll, index-Kopf, Diffs), nova-sounds (3),
Skills/READMEs (Grok, ChatGPT/Claude), Gemini-Bridge-Doc + plugin.json, alle
`.env.example` (7), sync-memory, E2E-Test, backend/main.py, CI-Workflow, accentless (6),
Old-PC-Prompts (V1, V1.3), Phobos-Spec, SDD-Ledger. Inventar/Diffs/Hashes per PowerShell,
Tests per `npm test`, Git per `log/ls-files/status/diff`.

## Anhang B – Glossar

Human Authority (Gürkan, final; Tommy extern) · Trinity (Grok/Gemini/ChatGPT-Rollen) ·
PRECODER (Plan-Modus, Spark) · PHOBOS-a (Deep Reasoning, Wonder) · PHOBOS-b (CI-Merger,
umbenennen!) · ABRPM (5-Button-Methode) · Commander/Overseer/Detector (Prototyp-Prompts) ·
Agent Bus (V2-MCP-Geflecht) · Ygdrassil-Mesh (P2P-Vision, Pre-Code) · Nova-Voice (Persona).

## Anhang C – Links (nur aus Repo-Dateien, nicht verlinkt-geprüft)

- Repo: `https://github.com/skywalker-gh/NOVA-META-Edition`
- Tommy (Pages-Plan): `https://skywalker-gh.github.io/NOVA-META-Edition/tommy/`
- Vercel-Plan (README): `https://nova-meta.vercel.app/tommy`
- Meta-Dashboard: `https://dev.meta.ai` · Meta-API: `https://api.meta.ai/v1`
- PRECODER-001-Quellen: `nova-v2-ygdrassil`-Branch `hackathon/nova-yggdrasil-meta-ai-2026`
  (Charter, MUSE-001, Trinity-Vertrag, Agent-Bus-Proposal, Gemini-HTTP) + Linear GUR-6/7/12.

*– Ende des Einstiegsberichts. Bereit für Freigabe + P0. –*

---

## Anhang D – P1-Addendum: Workflow Manager Slice 1 (02.11.2026, `VERIFIZIERT`)

**Scope (von Gürkan freigegeben: V6 + lineare Kette + Tommy/V6-Freigabe, „go"):** drei
Orchestrator-Karten (Codex CLI / Gemini CLI / Muse Code) mit ehrlichem Handshake,
Ketten-Ausführung über Bridge-Worker, Freigabe-Queue als Human-Authority-Ende.
Kein Commit/Push/Merge ohne Human-Entscheid.

**Neu/Geändert:** `nova-workflow.js` (Tasks, CLI-Worker via stdin-Prompts, git-Worktrees
`task/<id>`, Check-Allowlist `npm test`/`node --check|test`, Approvals),
`muse-spark-bridge.js` (`/api/agents|workflow|approvals`, `NOVA_SKIP_PROBE`),
`index.html` (Workflow-Karte + Freigabe-Panel, Design/Alt-JS unberührt, Token nur
Session, textContent-Rendering), `tommy/index.html` (echte Queue + Live-Status,
S6-Rest `LLM_1130…` entfernt), `test/workflow.test.mjs` (5 Schwarzbox-Tests, Mock),
`.env.example` (korrigierte Modell-IDs, s. u.), `.gitignore` (`tasks/`, `.nova-work/`).

**Korrigiert (Meta-Modell-IDs `VERIFIZIERT` via `GET /v1/models`, 9 Modelle):**
`muse-spark` und `muse-code` existieren **nicht** (404 `model_not_found`) → V6 und
`.env.example` nutzen jetzt `muse-spark-1.3-contributor`. `.env` auf Workstation
bitte angleichen (`MUSE_SPARK_MODEL`, `MUSE_CODE_MODEL`).

**Live-Demo `VERIFIZIERT`:** Spark-Plan via Orchestrator-Code (`orchestrateWithSpark`,
1 kleiner Call, wenige Cent); Task `tmvyq3swvj4mn` (Tommy-Live-Status): Codex exit 0
in 29 s, Diff `tommy/index.html` +21/−1; Gemini exit 1 nach 197 s mit **429 Free-Tier-
Quota** (echt, kein Code-Fehler – Retry in ~4 h); Muse-Review (Task `tmvyqa5n2sdf7`)
→ `APPROVE`; Approval `amvyqalkoelvo` **pending** für Human-Entscheid.
Check-Rot (exit 1) war ein Test-Hermetik-Bug (`.env`-Precondition, kein `.env` im
Worktree) → gefixt via `.nova-work`-Fixture, Suite **`npm test`: 14/14 grün**,
zusätzlich 9/9 in sauberem Worktree.

**Offen:** Gemini-Quota (~4 h), externer Tommy-Tunnel (Phase 2), `.env`-Modell-IDs
auf Workstation, Entscheidung über Demo-Approval + Übernahme von
`task/tmvyq3swvj4mn` nach `main`.

## Anhang D2 – Runde 2: Redesign + Ketten-Fix + Key-Prüfung (02.11.2026, `VERIFIZIERT`)

**UI (V6/Tommy, Jury-Englisch):** Garage mit Blinkern (Klick = Schritt), Flow-Streifen
mit Farb-Spuren + Tommy-Finish, kompakte Steps (Details), neongrüner Connect,
Abbrechen+Start rechts beisammen, Reset links/Senden rechts, E2E-Strings EN.
`grafik/aa4.png` (V6-Regie) + `aa5.png` (V2-Graph-Vision) als Referenz im Repo.

**Backend:** Schritt-Output fließt in Folge-Prompts (vorher Lücke, jetzt mit Test);
`POST /api/keys/validate` prüft Keys live beim Provider (transient, nie geloggt);
`GET /grafik/*` serviert das Tommy-Banner (Bilder only, Containment). Suite
**17/17 grün**. User-Kette `tmvyr7nzau3ja`: Muse ✓, Codex ✓ (Retry-Feature,
Branch `task/tmvyr7nzau3ja`), Gemini ✗ 429 bis ~09:00. Freigabe `amvyqalkoelvo`
mit JA entschieden, Demo-Branch gemergt (`c4afcc9`).

## Anhang D3 – Nacht-Slice: Memory-Index + All-Provider-Fanout (03.11.2026, `VERIFIZIERT`)

**Neu:** `nova-memory.js` (`/api/memory/index|context`: PROJECT_CONTEXT, Consensus,
Bus-State, Profil, letzte Tasks/Approvals, budgetiert); `nova-chat.js`
(`POST /api/chat`: 6 Provider parallel, Rollen-Prompts aus Connector-Skills,
Memory injiziert, Keys transient > Server; `POST /api/image`: Muse Image 512);
V6-Chat Bridge-first mit Direkt-Fallback + Memory-Badge + 🖼️-Button;
`test/chat.test.mjs` (Fake-Server alle 4 Dialekte, Memory-Nachweis). Suite **22/22**.

**Live-Rauchtest `VERIFIZIERT`:** Wonder + Grok-4 + Spark (nach Budget-Fix, zitiert
`[project-context]`) + Image (78 KB b64) grün. Gefixt: `grok-beta` tot (404,
deprecated) → `grok-4`; `gemini-1.5-flash` tot → `gemini-3.8-flash` (Vorschlag der
API selbst); Spark braucht `maxTokens 3000` (150 Reasoning-Tokens schon für „OK");
Orchestrator-`.env` Stale-Namen korrigiert. **Offen (User-Seite):** OpenAI- +
Anthropic-Keys 401 (bitte in deren Dashboards erneuern); Google-Free-Quota bis
~09:00. SAM (`muse-sam-3.1` 404) + Transcribe (404) ehrlich geparkt, kein Fake.
Verbrauch Nacht: ~15 kleine Calls (Chat/Models/Probes) + 2 Test-Bilder, wenige $.
