-- ============================================
-- Usage Stats Table
-- Purpose: Track usage for billing/quotas
-- ============================================

-- Create usage_stats table
CREATE TABLE IF NOT EXISTS public.usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('template_created', 'template_updated', 'template_deleted', 'pin_generated', 'pin_posted', 'campaign_created')),
    count INTEGER NOT NULL DEFAULT 1,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_stats_user_id ON public.usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_stats_action_type ON public.usage_stats(action_type);
CREATE INDEX IF NOT EXISTS idx_usage_stats_user_action ON public.usage_stats(user_id, action_type);
CREATE INDEX IF NOT EXISTS idx_usage_stats_created_at ON public.usage_stats(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.usage_stats ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own usage stats
CREATE POLICY "Users can view own usage stats"
    ON public.usage_stats
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own usage stats
CREATE POLICY "Users can create own usage stats"
    ON public.usage_stats
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.usage_stats TO authenticated;

-- ============================================
-- Helper function to log usage
-- ============================================
CREATE OR REPLACE FUNCTION public.log_usage(
    p_user_id UUID,
    p_action_type TEXT,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.usage_stats (user_id, action_type, metadata)
    VALUES (p_user_id, p_action_type, p_metadata)
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
