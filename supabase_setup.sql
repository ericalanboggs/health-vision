-- Create health_journeys table for storing user vision and journey data
CREATE TABLE IF NOT EXISTS public.health_journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT,
    form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    current_step TEXT,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_health_journeys_user_id ON public.health_journeys(user_id);

-- Create index on session_id for anonymous users
CREATE INDEX IF NOT EXISTS idx_health_journeys_session_id ON public.health_journeys(session_id);

-- Enable Row Level Security
ALTER TABLE public.health_journeys ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own journeys
CREATE POLICY "Users can view own journeys"
ON public.health_journeys
FOR SELECT
USING (
    auth.uid() = user_id
    OR session_id IS NOT NULL
);

-- Policy: Users can insert their own journeys
CREATE POLICY "Users can insert own journeys"
ON public.health_journeys
FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    OR user_id IS NULL
);

-- Policy: Users can update their own journeys
CREATE POLICY "Users can update own journeys"
ON public.health_journeys
FOR UPDATE
USING (
    auth.uid() = user_id
    OR session_id IS NOT NULL
)
WITH CHECK (
    auth.uid() = user_id
    OR session_id IS NOT NULL
);

-- Policy: Users can delete their own journeys
CREATE POLICY "Users can delete own journeys"
ON public.health_journeys
FOR DELETE
USING (
    auth.uid() = user_id
    OR session_id IS NOT NULL
);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_health_journeys_updated_at
    BEFORE UPDATE ON public.health_journeys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
