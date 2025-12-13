-- ============================================
-- Generated Pins Table
-- Purpose: Track each individual pin generated from a campaign
-- ============================================

-- Create generated_pins table
CREATE TABLE IF NOT EXISTS public.generated_pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    data_row JSONB NOT NULL DEFAULT '{}'::jsonb,
    image_url TEXT NOT NULL,
    pinterest_pin_id TEXT,
    posted_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'posted', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_generated_pins_campaign_id ON public.generated_pins(campaign_id);
CREATE INDEX IF NOT EXISTS idx_generated_pins_user_id ON public.generated_pins(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_pins_status ON public.generated_pins(status);
CREATE INDEX IF NOT EXISTS idx_generated_pins_created_at ON public.generated_pins(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.generated_pins ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own generated pins
CREATE POLICY "Users can view own generated pins"
    ON public.generated_pins
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own generated pins (for client-side generation)
CREATE POLICY "Users can create own generated pins"
    ON public.generated_pins
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own generated pins
CREATE POLICY "Users can update own generated pins"
    ON public.generated_pins
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own generated pins
CREATE POLICY "Users can delete own generated pins"
    ON public.generated_pins
    FOR DELETE
    USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.generated_pins TO authenticated;
