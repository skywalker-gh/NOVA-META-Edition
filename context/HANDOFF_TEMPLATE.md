# NOVA Handoff Template (all models, every time)

```md
## HANDOFF <short-id>
**From:** <model> | **To:** <model or Human> | **Date:** <YYYY-MM-DD>
**Status:** PROPOSAL | APPROVED | BLOCKED
**Context read:** project-context §<n>, models-consensus §<n> (or: NOT READ — say so)

**Evidence (verified only):**
- ...

**Proposal (no code changes by reviewers):**
1. ...

**Open / unsure:**
- ...
```

Rules: reviewers (Grok, Claude, ChatGPT, Wonder) write PROPOSALs only.
Only the orchestrator (Gemini/Codex chain) APPROVEs. Only Codex V3 / Muse Code implements.
No new branches unless the orchestrator explicitly calls for one.
