import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl) {
    console.warn('NEXT_PUBLIC_SUPABASE_URL is not set. Database features will not work.');
}

if (!supabaseAnonKey) {
    console.warn('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Database features will not work.');
}

// Create Supabase client (untyped to avoid complex generic issues with custom types)
// Types are enforced at the application layer using database.types.ts
export const supabase = createClient(
    supabaseUrl || '',
    supabaseAnonKey || '',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
        },
    }
);

// Helper to check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
    return Boolean(supabaseUrl && supabaseAnonKey);
};

// Helper to get current user ID (returns null if not authenticated)
export const getCurrentUserId = async (): Promise<string | null> => {
    if (!isSupabaseConfigured()) return null;

    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
};
