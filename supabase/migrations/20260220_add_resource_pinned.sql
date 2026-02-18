-- Add pinned column to user_resources
ALTER TABLE user_resources ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;

-- Allow users to update their own resources (for toggling pin, etc.)
DO $$ BEGIN
  CREATE POLICY "Users can update own resources"
    ON user_resources FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
