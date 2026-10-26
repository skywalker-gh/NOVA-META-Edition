
# PRECODER - Pre-Coding Orchestration Module

*Original Idea from NOVA V2*
*New Implementation: Muse Spark*

## Purpose
Before any code, plan. Don't reinvent wheel.

## Responsibilities
- Takes full context from context/
- Orchestrates all agents
- Decides who does what: Grok reviews, Claude reasons, Codex builds, Muse leads
- Ensures canonical MCP path

## New with Meta
Muse Spark is ideal PRECODER:
- High context (128k+)
- Tool calling
- Can delegate to Codex V3 Worker

## Workflow
1. Load PROJECT_CONTEXT.md
2. Load ecosystem-memory/
3. Call wonder for deep reasoning
4. Create task plan
5. Delegate to code worker

## Status
Migrating from Gemini CLI hang to Muse Spark.

Add your original PRECODER ideas here!
