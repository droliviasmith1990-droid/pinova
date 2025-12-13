-- Migration: Add 'paused' status to campaigns table
-- Purpose: Allow pausing generation and resuming later
-- Run this in your Supabase SQL Editor

-- First, drop the existing constraint
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;

-- Then, add a new constraint that includes 'paused'
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_status_check 
    CHECK (status IN ('pending', 'processing', 'paused', 'completed', 'failed'));

-- Update comment
COMMENT ON COLUMN campaigns.status IS 'Status can be: pending, processing, paused, completed, failed';
