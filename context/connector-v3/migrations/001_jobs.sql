CREATE TABLE IF NOT EXISTS connector_workers (
  worker_id text PRIMARY KEY,
  generation bigint NOT NULL DEFAULT 0,
  last_seen_at timestamptz,
  connected boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS connector_jobs (
  id uuid PRIMARY KEY,
  principal text NOT NULL,
  tool text NOT NULL CHECK (tool IN ('codex_project_status', 'codex_ask', 'codex_implement')),
  idempotency_key text NOT NULL,
  session_id text,
  payload jsonb,
  state text NOT NULL CHECK (state IN ('queued', 'leased', 'running', 'completed', 'failed', 'indeterminate')),
  result jsonb,
  safe_error jsonb,
  worker_id text,
  worker_generation bigint,
  lease_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  body_expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  metadata_expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  UNIQUE (principal, tool, idempotency_key)
);

CREATE INDEX IF NOT EXISTS connector_jobs_queue_idx ON connector_jobs (created_at)
  WHERE state = 'queued';
CREATE INDEX IF NOT EXISTS connector_jobs_lease_idx ON connector_jobs (lease_expires_at)
  WHERE state IN ('leased', 'running');
CREATE INDEX IF NOT EXISTS connector_jobs_body_expiry_idx ON connector_jobs (body_expires_at);
