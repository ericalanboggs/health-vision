-- Migration: Create pilot_feedback table
-- Description: Stores pilot close-out survey responses for product feedback and testimonials

CREATE TABLE IF NOT EXISTS pilot_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- Nullable for anonymous feedback
  overall_value INTEGER CHECK (overall_value >= 1 AND overall_value <= 5),
  favorite_aspect TEXT,
  aha_moments TEXT,
  improvements TEXT,
  price_slider INTEGER CHECK (price_slider >= 0 AND price_slider <= 25),
  price_explanation TEXT,
  testimonial_text TEXT,
  testimonial_permission TEXT CHECK (testimonial_permission IN ('named', 'anonymous', 'no')),
  testimonial_name TEXT,
  additional_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_pilot_feedback_user ON pilot_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_pilot_feedback_created ON pilot_feedback(created_at);

-- Enable Row Level Security
ALTER TABLE pilot_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own feedback
CREATE POLICY "Users can view their own pilot feedback"
  ON pilot_feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own feedback (authenticated)
CREATE POLICY "Users can insert their own pilot feedback"
  ON pilot_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can update their own feedback
CREATE POLICY "Users can update their own pilot feedback"
  ON pilot_feedback FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own feedback
CREATE POLICY "Users can delete their own pilot feedback"
  ON pilot_feedback FOR DELETE
  USING (auth.uid() = user_id);

-- Admin policy (for viewing all feedback)
CREATE POLICY "Admins can view all pilot feedback"
  ON pilot_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admin policy (for managing all feedback)
CREATE POLICY "Admins can manage all pilot feedback"
  ON pilot_feedback FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Comment on table
COMMENT ON TABLE pilot_feedback IS 'Stores pilot close-out survey responses for product feedback, pricing signals, and testimonials';
COMMENT ON COLUMN pilot_feedback.overall_value IS 'Rating 1-5: Not valuable to Extremely valuable';
COMMENT ON COLUMN pilot_feedback.price_slider IS 'Willingness to pay: $0-25/month';
COMMENT ON COLUMN pilot_feedback.testimonial_permission IS 'named = use with name, anonymous = use without name, no = do not use';
