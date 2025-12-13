-- ============================================
-- Campaigns Table
-- Purpose: Store bulk pin generation campaigns
-- ============================================

-- Create campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    csv_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    field_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_pins INTEGER NOT NULL DEFAULT 0,
    generated_pins INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    output_folder_url TEXT,
    pinterest_board_id TEXT,
    auto_post BOOLEAN NOT NULL DEFAULT false,
    schedule_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON public.campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_template_id ON public.campaigns(template_id);

-- Enable Row Level Security
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own campaigns
CREATE POLICY "Users can view own campaigns"
    ON public.campaigns
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own campaigns
CREATE POLICY "Users can create own campaigns"
    ON public.campaigns
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own campaigns
CREATE POLICY "Users can update own campaigns"
    ON public.campaigns
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own campaigns
CREATE POLICY "Users can delete own campaigns"
    ON public.campaigns
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS set_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER set_campaigns_updated_at
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT ALL ON public.campaigns TO authenticated;
