-- ==============================================
-- Custom Fonts Storage & Database Setup
-- Run this in your Supabase SQL Editor
-- ==============================================

-- 1. Create storage bucket for fonts (public access for font loading)
INSERT INTO storage.buckets (id, name, public)
VALUES ('fonts', 'fonts', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create table to track user fonts
CREATE TABLE IF NOT EXISTS public.custom_fonts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable Row Level Security
ALTER TABLE public.custom_fonts ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies - Users can only access their own fonts
CREATE POLICY "Users can view own fonts"
    ON public.custom_fonts
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can upload fonts"
    ON public.custom_fonts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own fonts"
    ON public.custom_fonts
    FOR DELETE
    USING (auth.uid() = user_id);

-- 5. Storage policies for fonts bucket
CREATE POLICY "Users can upload to fonts bucket"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'fonts' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Anyone can read fonts"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'fonts');

CREATE POLICY "Users can delete own fonts from storage"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'fonts' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );
