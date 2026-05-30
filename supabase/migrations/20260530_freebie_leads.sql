-- Leads captured from the public /freebies page (downloadable AI skill giveaway).
-- These are marketing leads, NOT auth users — no user_id, no account required.
CREATE TABLE IF NOT EXISTS freebie_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  freebie_slug TEXT NOT NULL DEFAULT 'summit-weekly-reflection',
  wants_tips BOOLEAN NOT NULL DEFAULT true,  -- opted into occasional tips/new freebies
  source TEXT,                                -- e.g. 'freebies_page', referrer, utm
  email_sent BOOLEAN NOT NULL DEFAULT false, -- whether the download-link email went out
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- one row per email per freebie; re-submits update the existing row
  UNIQUE (email, freebie_slug)
);

CREATE INDEX IF NOT EXISTS idx_freebie_leads_email ON freebie_leads(email);
CREATE INDEX IF NOT EXISTS idx_freebie_leads_freebie_slug ON freebie_leads(freebie_slug);
CREATE INDEX IF NOT EXISTS idx_freebie_leads_created_at ON freebie_leads(created_at);

-- Enable Row Level Security. No public access at all — the capture-freebie-lead
-- Edge Function writes with the service role; nothing reads from the browser.
ALTER TABLE freebie_leads ENABLE ROW LEVEL SECURITY;

-- Service role (Edge Function) can manage all leads.
CREATE POLICY "Service role can manage all freebie leads"
  ON freebie_leads FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
