-- Migration: Add generation tracking fields to campaigns
-- Run this in your Supabase SQL Editor

-- Add new columns to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS current_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS generation_settings JSONB DEFAULT '{"batchSize": 10, "quality": "normal", "pauseEnabled": true}'::jsonb;

-- Add generation settings to user_preferences
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS default_batch_size INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS default_quality TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS default_pause_enabled BOOLEAN DEFAULT true;

-- Update the campaigns type if it exists as an enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_status' AND typtype = 'e') THEN
        -- Campaign status is already a text type, which is more flexible
        NULL;
    END IF;
END $$;

-- Add paused status check if using text field
COMMENT ON COLUMN campaigns.status IS 'Status can be: pending, processing, paused, completed, failed';

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id_status ON campaigns(user_id, status);
