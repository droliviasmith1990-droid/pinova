-- ============================================
-- Templates Table
-- Purpose: Store all Pinterest pin templates created by users
-- ============================================

-- Create templates table
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    canvas_size JSONB NOT NULL DEFAULT '{"width": 1000, "height": 1500}'::jsonb,
    background_color TEXT NOT NULL DEFAULT '#FFFFFF',
    elements JSONB NOT NULL DEFAULT '[]'::jsonb,
    thumbnail_url TEXT,
    category TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON public.templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON public.templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_is_public ON public.templates(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_templates_category ON public.templates(category) WHERE category IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own templates
CREATE POLICY "Users can view own templates"
    ON public.templates
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can view public templates
CREATE POLICY "Anyone can view public templates"
    ON public.templates
    FOR SELECT
    USING (is_public = true);

-- Policy: Users can insert their own templates
CREATE POLICY "Users can create own templates"
    ON public.templates
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own templates
CREATE POLICY "Users can update own templates"
    ON public.templates
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own templates
CREATE POLICY "Users can delete own templates"
    ON public.templates
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS set_templates_updated_at ON public.templates;
CREATE TRIGGER set_templates_updated_at
    BEFORE UPDATE ON public.templates
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT ALL ON public.templates TO authenticated;
GRANT SELECT ON public.templates TO anon;
