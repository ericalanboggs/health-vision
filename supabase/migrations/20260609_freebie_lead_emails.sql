-- =====================================================
-- Freebie lead drip — email send log / dedup table
-- =====================================================
-- Freebie leads are NOT auth.users, so we can't reuse email_reminders
-- (which keys on user_id). This table is the audit trail + dedup key for
-- the nurture drip sent by `send-freebie-drip-emails`.
--
-- Dedup key: (email, freebie_slug, email_type) — one send of each drip
-- step per lead, ever.

CREATE TABLE IF NOT EXISTS freebie_lead_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  freebie_slug TEXT NOT NULL DEFAULT 'summit-weekly-reflection',
  email_type TEXT NOT NULL,                 -- 'freebie_drip_why', 'freebie_drip_how', etc.
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',       -- 'sent' | 'failed'
  resend_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_freebie_lead_emails_email ON freebie_lead_emails(email);
CREATE INDEX IF NOT EXISTS idx_freebie_lead_emails_type ON freebie_lead_emails(email_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_freebie_lead_emails_dedup
  ON freebie_lead_emails(email, freebie_slug, email_type);

-- Service-role only; mirrors freebie_leads. No public/anon access — the
-- drip cron and unsubscribe function use the service role.
ALTER TABLE freebie_lead_emails ENABLE ROW LEVEL SECURITY;
