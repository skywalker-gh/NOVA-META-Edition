# NOVA // Ygdrassil — META Edition

**A human-governed, multi-model AI workspace for context-aware collaboration, agent workflows and accountable execution.**

[Repository](https://github.com/skywalker-gh/NOVA-META-Edition) · [Hackathon: Meta Global AI Developer Hackathon 2026](https://cerebralvalley.ai/e/meta-ai-developer-hackathon)

> **Core idea:** NOVA does not treat AI as a single chatbot. It brings specialised models, tools, project memory and human decision-making into one observable workflow — while keeping execution bounded and consequential decisions under human control.

---

## 1. What is NOVA?

NOVA // Ygdrassil is an evolving multi-model AI system designed to help a person move from an unclear problem to a reasoned plan, a coordinated implementation and a reviewable result.

The META Edition is the current Hackathon implementation. It combines:

- a browser-based V6 workspace;
- a local Node.js bridge exposing a small HTTP API;
- parallel, memory-aware requests to six model providers;
- a content-based project-memory index;
- a sequential workflow manager for CLI and interactive-session agents;
- an approval queue and a separate Human Authority portal;
- a Muse Spark connector prototype using the Model Context Protocol (MCP).

The central engineering question is not simply *“Which model gives the best answer?”* It is:

**How can different AI capabilities work together on a real task, share relevant context, expose their limits, and produce changes that remain inspectable and under human control?**

NOVA is built as a practical system rather than a claim of autonomous general intelligence. Its current implementation focuses on orchestration, context continuity, bounded tool execution and human approval.

## 2. Why Ygdrassil?

Ygdrassil is the architectural metaphor of a world tree: distinct branches and specialised nodes connected through a shared structure.

In NOVA, the metaphor maps to concrete system concerns:

| Metaphor | Engineering meaning |
|---|---|
| Roots | Project history, requirements, source documents and memory |
| Trunk | Shared context, runtime APIs and workflow state |
| Branches | Model providers, agents, tools and specialised capabilities |
| Nodes | Local processes, connectors and human participants |
| Gardener / Human Authority | The person who defines goals and approves consequential outcomes |

The name also reflects earlier mesh-network and decentralisation ideas preserved in the project archive. Those notes explored resilient, interconnected nodes rather than a system dependent on one central point. The current Hackathon implementation is **not** a deployed peer-to-peer mesh network; that remains part of the broader architectural inspiration and research direction.

## 3. From early NOVA prototypes to the META Edition

NOVA has evolved through successive experiments. The repository preserves selected earlier implementations and design notes in `context/Old PC Apps - Ref/` and `context/docs/`.

| Generation | Main experiment | Contribution to the current design |
|---|---|---|
| NOVA V1 | Local Python chat with Ollama and JSON-based memory | A persistent assistant identity and local-first experimentation |
| V1.1–V1.3 | Intent handling, memory, prompt construction and early emotion/ethics/guardian modules | Separation of concerns and the first modular assistant architecture |
| V1.5 Web App | Browser frontend with a Python/FastAPI backend | A clearer client/server boundary |
| NOVA V2 | FastAPI structure, provider abstraction, intent service, prompt builder and connector/MCP research | Provider independence, explicit interfaces and multi-agent architecture |
| META Edition | Meta Muse integration, six-provider fan-out, memory index, workflow manager and Human Authority portal | A demonstrable, human-governed multi-model workflow |

This history matters: the META Edition is not an isolated prompt experiment. It is the current iteration of a longer process of prototyping, testing, retaining useful ideas and replacing brittle approaches when evidence demands it.

### The ideas behind the architecture

Several concepts have shaped the project over time:

- **PRECODER — think before coding.** Turn a request into a clear goal, inspect the existing system, separate facts from assumptions, compare options and define acceptance criteria before implementation.
- **PHOBOS — reason about failure before it happens.** Challenge a plan, search for edge cases, identify architectural weaknesses and make risks explicit.
- **Ethical Resonance — preserve agency.** Ask whether a proposed action serves the user's longer-term interests, increases their autonomy and avoids unnecessary dependency. This is a design principle, not a claim of a formally validated ethical classifier.
- **Human Authority — people own consequential decisions.** Agents may analyse, propose, implement in bounded workspaces and review. Approval remains an explicit human action.
- **Continuity through context.** A useful assistant should not require the project to be re-explained from zero in every session. Relevant project documents and recent workflow state should be available in a controlled, inspectable form.

## 4. Current architecture

The current runtime is intentionally split into understandable layers.

```text
                         HUMAN AUTHORITY
                   V6 Dashboard / Tommy Portal
                              |
                              v
                    Approval Queue / Decisions
                              |
                              v
+--------------------- NOVA Local Bridge ----------------------+
|                    muse-spark-bridge.js                      |
|                                                              |
|  +----------------+  +----------------+  +----------------+  |
|  | Provider Chat  |  | Memory Index   |  | Workflow       |  |
|  | nova-chat.js   |  | nova-memory.js |  | nova-workflow  |  |
|  +-------+--------+  +-------+--------+  +-------+--------+  |
|          |                   |                   |           |
+----------|-------------------|-------------------|-----------+
           |                   |                   |
           v                   v                   v
   Six model APIs       Project documents     Bounded workers
   in parallel          + task/approval state  and worktrees
           |                                       |
           v                                       v
  Spark / Wonder /                         Codex CLI — writer
  ChatGPT / Grok /                         Gemini CLI — reviewer
  Claude / Gemini                          Muse Code — session
                                                   |
                                                   v
                                         Review-ready task
                                                   |
                                                   v
                                         Human decision
                                      APPROVE / REJECT / INFO
```

### 4.1 Browser workspace

The root `index.html` is the V6 browser dashboard. It presents the NOVA workspace and its operational controls, including provider chat, workflow interaction and image generation.

The separate `tommy/index.html` is the Human Authority portal served by the local bridge at `/tommy`. The repository also contains `online-dashboard/tommy/index.html` as a separate portal asset. A publicly reachable hosted portal URL is not assumed by this README; external access requires an appropriately configured deployment or tunnel.

### 4.2 Local bridge and API

`muse-spark-bridge.js` is the Node.js HTTP runtime. It mounts the chat, memory and workflow modules and exposes the API used by the dashboard.

Important routes include:

| Route | Method | Purpose |
|---|---|---|
| `/status` | GET | Runtime and endpoint status |
| `/api/chat/providers` | GET | Provider catalogue |
| `/api/chat` | POST | Parallel provider fan-out |
| `/api/image` | POST | Meta image-generation request |
| `/api/memory/index` | GET | Memory source metadata |
| `/api/memory/context` | GET | Budgeted assembled context |
| `/api/agents` | GET | Workflow worker availability |
| `/api/workflow` | GET/POST | List, inspect and create tasks |
| `/api/workflow/run` | POST | Start a task |
| `/api/workflow/cancel` | POST | Cancel a task |
| `/api/workflow/step-result` | POST | Submit an interactive agent-step result |
| `/api/approvals` | GET | Read the approval queue |
| `/api/approvals/decide` | POST | Record a human decision |
| `/api/keys/validate` | POST | Validate a provider credential |

The bridge uses a bounded JSON request-body reader (1 MiB) and validates workflow inputs before starting work.

### 4.3 Multi-provider chat

`nova-chat.js` implements one common interface for six providers:

| Provider | Current role in NOVA | API integration |
|---|---|---|
| Meta Muse Spark | Primary orchestration and planning perspective | OpenAI-compatible Chat Completions |
| Meta Muse Wonder | Deep reasoning and trade-off analysis | OpenAI-compatible Chat Completions |
| OpenAI ChatGPT | General reasoning peer | OpenAI Chat Completions |
| xAI Grok | Adversarial review and assumption checking | xAI Chat Completions |
| Anthropic Claude | Careful review and risk analysis | Anthropic Messages API |
| Google Gemini | High-context synthesis and architecture review | Gemini `generateContent` |

A fan-out request selects one or more providers and calls them concurrently with `Promise.all`. Each result is returned independently with provider/model identity, success or error state and measured latency. One unavailable provider therefore does not have to erase the results from the others.

This is **parallel consultation**, not an automatic consensus engine: NOVA exposes individual provider results and does not claim that agreement between models proves a statement is true.

Provider keys can be supplied transiently by the dashboard or loaded by the server from environment configuration. The code is designed not to persist or log submitted API keys. Model identifiers and endpoints are configurable; the defaults are recorded in `.env.example` and should be checked against the provider account and current API availability.

### 4.4 Memory and project context

`nova-memory.js` builds a lightweight content index from project files and recent workflow state. It currently reads these configured sources when present:

- `context/PROJECT_CONTEXT.md`
- `context/ecosystem-memory/models-consensus.md`
- `context/ecosystem-memory/agent-bus-state.md`
- `context/ecosystem-memory/user-profile.md`
- recent task records and approval records from the tasks directory

The module exposes source metadata through the memory index and assembles a budget-limited system context for model requests. Source order determines priority; lower-priority material is truncated or omitted when the configured character budget is reached.

This is a **file-backed, content-based context layer**. It is not yet a semantic vector database, graph database or fully autonomous long-term memory system. Those remain possible future extensions.

### 4.5 Workflow Manager and execution boundaries

`nova-workflow.js` implements sequential task chains. A task has a goal, a bounded list of steps and an optional verification command.

The current worker roles are:

- **Codex CLI:** implementation worker (writer).
- **Gemini CLI:** review worker (reviewer).
- **Grok Reviewer:** API review worker via xAI (reviewer, read-only).
- **Muse Code:** interactive chat-session worker; the workflow pauses until its step result is submitted.

The workflow implementation includes:

- a maximum of five steps per task;
- one active task at a time in the current runtime instance;
- isolated Git worktrees for task execution;
- one designated writer per task chain;
- prompts passed to CLI processes through standard input rather than command-line arguments;
- bounded execution time and output size;
- an allowlist for supported verification commands;
- explicit task states, cancellation and cleanup;
- a review-ready state followed by an approval record.

The intended sequence is:

1. Create a task with a clear goal and ordered agent steps.
2. Execute the steps sequentially in the task workspace.
3. Run the configured allowlisted check, if one was supplied.
4. Place the result in the approval queue.
5. Let a human approve, reject or request more information.

A reviewer is not a second writer. Provider opinions and agent outputs are evidence for a decision, not authority to make that decision.

### 4.6 Human Authority and Tommy Portal

The approval queue is a core governance feature, not a decorative UI element. The V6 dashboard and Tommy portal provide human-facing access to task decisions.

The portal is designed to make the decision legible without requiring the approver to operate a CLI. Its decision vocabulary is intentionally simple:

- **YES** — approve the proposed result;
- **NO** — reject it;
- **INFO** — request clarification or further information.

The `dev/tommy-authority` branch exists as part of the repository's collaboration model. The current runtime approval API records decisions in the queue; a Git branch name alone should not be interpreted as proof that a remote commit, merge or deployment has happened.

## 5. How we work

NOVA's development method is deliberately iterative and evidence-led.

1. **Understand first.** Read the current repository, project context and previous decisions before proposing a replacement.
2. **Precode.** Use PRECODER to define the outcome, constraints, dependencies, options and acceptance criteria.
3. **Challenge the plan.** Use PHOBOS-style reasoning and independent reviewers to look for failure modes and hidden assumptions.
4. **Delegate bounded work.** Give each agent a specific role, input, workspace boundary and expected output.
5. **Keep one writer.** Avoid concurrent agents modifying the same task workspace.
6. **Verify.** Run focused automated checks and distinguish simulated tests from real provider/API calls.
7. **Return control to a person.** Put consequential outcomes in the approval queue.
8. **Preserve context.** Record decisions, model status and useful handoffs so the next iteration starts with evidence.

The project owner remains the final authority on scope, priorities and acceptance. Agents are collaborators with different capabilities — not independent owners of the project.

## 6. Repository map

```text
.
├── agents/
│   └── muse-spark-orchestrator/   # MCP-oriented Muse Spark connector prototype
├── context/
│   ├── Old PC Apps - Ref/         # Selected earlier NOVA prototypes
│   ├── docs/                      # Architecture and engineering notes
│   ├── ecosystem-memory/          # Shared project context sources
│   ├── IDEEN - Architektur - Bilder - Prompts/
│   ├── PROJECT_CONTEXT.md
│   ├── PRECODER.md
│   └── PHOBOS.md
├── dashboard-v2-meta/             # Dashboard V2 planning/reference
├── online-dashboard/tommy/        # Separate Tommy portal asset
├── tommy/                         # Portal served by the local bridge
├── test/                          # Node test suite
├── index.html                     # V6 main dashboard
├── muse-spark-bridge.js           # HTTP bridge and API routing
├── nova-chat.js                   # Multi-provider fan-out
├── nova-memory.js                 # File-backed context index
├── nova-workflow.js               # Sequential agent workflow
├── .env.example                   # Configuration template
├── package.json
└── start.bat
```

The repository also contains archived design material and connector references. Their presence documents the evolution of the ecosystem; it does not mean every historical connector or proposed service is currently running in this META Edition.

## 7. Quick start

### Requirements

- Node.js with support for the built-in `fetch` API and `node:test`;
- npm;
- Git (required for worktree-based workflow execution);
- CLI tools used by the workflow, when those steps are selected: Codex CLI and/or Gemini CLI;
- API credentials for the providers you want to call.

### Install

```bash
git clone https://github.com/skywalker-gh/NOVA-META-Edition.git
cd NOVA-META-Edition
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

On Windows, copy `.env.example` to `.env` using Explorer or:

```bat
copy .env.example .env
```

Edit `.env` and add only the credentials for providers you intend to use. Never commit the real `.env` file.

At minimum, configure a Meta API key for Meta model features. Configure the other provider keys separately if you want those providers enabled. Set a long, random `NOVA_BRIDGE_TOKEN` before exposing the API to anything beyond a trusted local development environment.

### Start the bridge

```bash
npm start
```

The default bridge port is `8000`. Open the local dashboard in your browser at:

```text
http://127.0.0.1:8000/v6
```

(Root `/` returns JSON status; the dashboard lives at `/v6`, Tommy at `/tommy`.)

The Tommy portal is served at:

```text
http://127.0.0.1:8000/tommy
```

On Windows, `start.bat` starts the bridge and opens the Tommy portal. Keep the bridge process running while using the local workspace.

### Run tests

```bash
npm test
```

The test suite uses Node's built-in test runner and covers provider fan-out, key validation, workflow lifecycle and security boundaries. The latest repository commit records **45/45 tests passing**. This is the last recorded result, not a claim that the suite was re-run as part of this README update.

## 8. Configuration

See `.env.example` for the full template. Common settings:

| Variable | Purpose |
|---|---|
| `META_API_KEY` | Meta Model API credential |
| `META_ENDPOINT` | Meta API base URL |
| `MUSE_SPARK_MODEL`, `MUSE_WONDER_MODEL` | Meta model identifiers |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | OpenAI provider |
| `XAI_API_KEY`, `GROK_MODEL` | xAI provider |
| `ANTHROPIC_API_KEY`, `CLAUDE_MODEL` | Anthropic provider |
| `GOOGLE_AI_KEY`, `GEMINI_MODEL` | Gemini provider |
| `NOVA_PORT` | Bridge port (default: `8000`) |
| `NOVA_BRIDGE_TOKEN` | Bearer token for bridge `/api/*` routes |
| `NOVA_DASHBOARD_TOKEN` | Bearer token for the separate local dashboard server |
| `NOVA_PROJECT_ROOT` | Project root used by related local tooling |
| `NOVA_TASKS_DIR` | Optional task/approval storage directory |
| `GITHUB_PAT` or `GITHUB_TOKEN` | GitHub proxy access, where required |

The root bridge reads its project root from the process working directory. Start it from the repository root.

## 9. Security and responsible operation

Security is part of the architecture, but configuration still matters.

- The bridge supports Bearer authentication for `/api/*` when `NOVA_BRIDGE_TOKEN` is configured.
- **If no bridge token is configured, the API remains unauthenticated.** The runtime prints a warning. Set a strong token for normal use.
- The separate dashboard server binds to loopback (`127.0.0.1`) and supports its own optional Bearer token.
- The local file reader canonicalises paths, checks that resolved paths remain inside the project root and blocks common sensitive filenames such as `.env`, token files, private-key files and key files.
- Workflow verification commands are allowlisted rather than accepting arbitrary shell commands from task input.
- CLI prompts are passed over stdin rather than exposed in process arguments.
- Provider credentials should be kept in local environment files or supplied transiently; do not paste secrets into project documents, issues or commits.
- Do not expose the local bridge directly to the public internet without an authenticated, reviewed deployment boundary.

These controls reduce risk; they are not a substitute for deployment hardening, secret rotation, dependency review and operational monitoring.

## 10. Current status: implemented, constrained and future work

The following status is based on the repository's current source and the latest commit metadata (2 November 2026).

| Area | Current status |
|---|---|
| V6 browser dashboard | Present in the repository |
| Node.js bridge and API routes | Implemented in the current source |
| Six-provider fan-out | Implemented; real availability depends on credentials, quotas and provider APIs |
| Shared project-context injection | Implemented as a budgeted, file-backed context layer |
| Meta image endpoint | Implemented; requires a working Meta credential and model access |
| Sequential workflow manager | Implemented with Codex, Gemini and interactive Muse session roles |
| Approval queue and Tommy portal | Implemented in the local runtime and portal assets |
| Muse Spark MCP connector | Prototype present under `agents/muse-spark-orchestrator/` |
| All six providers available at all times | Not guaranteed; account access, quotas and keys vary |
| External Tommy portal deployment/tunnel | Not assumed or guaranteed by this repository |
| Semantic/vector or graph memory | Future work |
| Fully distributed Ygdrassil mesh network | Long-term architectural direction, not part of the current deployed runtime |
| Fully autonomous self-improvement / self-modifying system | Research direction only; not claimed as implemented |

The latest commit's operational note reports Meta Spark/Wonder/image and Grok-4 as available in that test context, Gemini constrained by its free quota, and OpenAI/Anthropic credentials requiring refresh (HTTP 401). Provider status can change independently of repository code. NOVA reports provider-level errors instead of treating a configured adapter as proof of live availability.

## 11. Hackathon context

NOVA // Ygdrassil — META Edition is being developed for the **Meta Global AI Developer Hackathon 2026**, running from 26 October to 4 November 2026. The event centres on building with Meta's Muse model family and related tools. The published submission deadline is 4 November 2026 at 9:00 PM Eastern Time; participants should always verify the event page for any organiser updates.

The project is aligned with the event's practical spirit: apply frontier models to a real workflow, show technical execution and make the result understandable and testable.

## 12. Project authorship and approach

NOVA is founder-led by **Gürkan (Gee)**, an independent, self-taught systems builder. The project draws on a hands-on background in manufacturing, fabrication and electronic music production: define the structure, understand the constraints, assemble specialised parts, listen for what is failing, iterate and verify the result.

The development process is intentionally interdisciplinary. Human problem framing, software architecture, model capabilities, interface design and operational discipline are treated as parts of one system.

The goal is not to remove the human from the loop. It is to give a person a more capable set of collaborators — with better context, clearer roles, less repetitive coordination and more control over what actually gets changed.

---

## License

No explicit open-source license is currently declared in this repository. Unless and until a license is added, all rights remain with the copyright holder; do not assume that public visibility grants permission to reuse or redistribute the code.

---

**NOVA // Ygdrassil — Think together. Build deliberately. Keep humans in control.**
