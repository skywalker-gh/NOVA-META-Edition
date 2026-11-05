# OVERNIGHT 03 — Red Team (Grok strand, read-only)

## HANDOFF redteam-03
**From:** Muse Code | **To:** Gürkan | **Date:** 2026-11-04
**Status:** PROPOSAL

## 5 ways to break the demo (and the mitigation already in place)
1. **Trap clicked before images load** → overlay still opens on logo click; images pop in late. Mitigation: prework files committed + Pages fallback. Residual: slow first paint on cold cache.
2. **Sound autoplay blocked** → impossible by design: audio starts on logo CLICK (user gesture), plus npStatus line shows state. Residual: none.
3. **Bus timeout on one provider** → 60-90s per-provider timeouts; failure isolated, others land. Mitigation: pick the fast three (ChatGPT+Grok+Gemini). Residual: slow providers eat demo minutes.
4. **Wrong provider label** → Llama/Code cards ride Spark. Mitigation: speaker note in JURY_DEMO.md + memory entry. Residual: jury may probe — answer honestly (mapping documented).
5. **SAM confusion** ("why is SAM listed?") → SAM has no card, no route, parked in memory + demo script NEVER row. Residual: none if script followed.

## Verdict
Highest live risk: transient 503 (seen on Gemini 03:13, recovered by 03:15). Counter: honest-red policy + Plan B lines in 01_JURY_PLAN.md.
