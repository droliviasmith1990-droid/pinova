-- Migration: Add atomic increment function for generated_pins counter
-- This prevents race conditions when multiple pins finish generating simultaneously
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION increment_generated_pins(campaign_id_input UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE campaigns
  SET 
    generated_pins = generated_pins + 1,
    updated_at = NOW()
  WHERE id = campaign_id_input;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_generated_pins(UUID) TO authenticated;

-- Optional: Add RLS policy comment
COMMENT ON FUNCTION increment_generated_pins(UUID) IS 'Atomically increments generated_pins counter for a campaign. Uses SECURITY DEFINER for atomic updates.';
