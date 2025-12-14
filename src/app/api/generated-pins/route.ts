import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { CreateGeneratedPinSchema, validateRequest } from '@/lib/validations';

// Debug logging - only in development
const DEBUG = process.env.NODE_ENV === 'development';
const log = (...args: unknown[]) => DEBUG && console.log(...args);

// Initialize Supabase client with SERVICE ROLE KEY for writes
// This bypasses RLS and is used for server-side operations
function getServiceSupabase(): SupabaseClient | null {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('[generated-pins] Missing Supabase SERVICE_ROLE_KEY configuration');
        return null;
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false }
    });
}

// Initialize Supabase client with cookie-based auth (for GET/DELETE which need user context)
async function getAuthenticatedSupabase(): Promise<SupabaseClient | null> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('[generated-pins] Missing Supabase configuration');
        return null;
    }

    // Get cookies from the request
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    // Find the Supabase auth token from cookies
    const authCookie = allCookies.find(c => c.name.includes('auth-token') || c.name.includes('sb-'));

    // Create client with the auth token if available
    return createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: authCookie ? {
                Cookie: allCookies.map(c => `${c.name}=${c.value}`).join('; '),
            } : {},
        },
    });
}

// ============================================
// POST: Save generated pin record
// Uses SERVICE ROLE KEY to bypass cookie auth issues on Vercel
// ============================================
export async function POST(request: NextRequest) {
    log('[generated-pins] POST request started');

    try {
        const body = await request.json();
        log('[generated-pins] POST body:', JSON.stringify(body, null, 2));

        // 1. Validate request body with Zod schema
        const validation = validateRequest(CreateGeneratedPinSchema, body);
        if (!validation.success) {
            log('[generated-pins] Validation failed:', validation.error);
            return NextResponse.json(
                { error: 'Validation failed', details: validation.error },
                { status: 400 }
            );
        }

        const { campaign_id, user_id, image_url, data_row, status, error_message } = validation.data;

        // 2. SECURITY: Validate user_id is provided (required for service role approach)
        if (!user_id) {
            log('[generated-pins] Missing user_id in request');
            return NextResponse.json(
                { error: 'user_id is required' },
                { status: 400 }
            );
        }

        // 3. Get service role client for write operations
        const supabase = getServiceSupabase();
        if (!supabase) {
            // Fallback to cookie auth if service role not configured
            log('[generated-pins] Service role not available, trying cookie auth');
            const authSupabase = await getAuthenticatedSupabase();
            if (!authSupabase) {
                return NextResponse.json(
                    { error: 'Server configuration error' },
                    { status: 503 }
                );
            }

            // Verify user session with cookie auth
            const { data: { user }, error: authError } = await authSupabase.auth.getUser();
            if (authError || !user) {
                log('[generated-pins] Cookie auth failed:', authError?.message);
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            // Use authenticated user's ID
            const { data, error } = await authSupabase
                .from('generated_pins')
                .insert({
                    campaign_id,
                    user_id: user.id,
                    image_url: image_url || null,
                    data_row: data_row || null,
                    status: status || 'completed',
                    error_message: error_message || null,
                })
                .select()
                .single();

            if (error) {
                console.error('[generated-pins] Insert error:', error);
                return NextResponse.json(
                    { error: 'Failed to save generated pin', details: error.message },
                    { status: 500 }
                );
            }

            return NextResponse.json({ success: true, data }, { status: 201 });
        }

        // 4. Insert using service role (bypasses RLS)
        log('[generated-pins] Using service role, inserting for user:', user_id);
        const { data, error } = await supabase
            .from('generated_pins')
            .insert({
                campaign_id,
                user_id, // Trust user_id from validated request
                image_url: image_url || null,
                data_row: data_row || null,
                status: status || 'completed',
                error_message: error_message || null,
            })
            .select()
            .single();

        if (error) {
            console.error('[generated-pins] Insert error:', error);
            return NextResponse.json(
                { error: 'Failed to save generated pin', details: error.message },
                { status: 500 }
            );
        }

        log('[generated-pins] Pin saved successfully:', data?.id);

        // 5. Update Campaign Progress (atomic increment)
        try {
            const { error: rpcError } = await supabase.rpc('increment_generated_pins', {
                campaign_id_input: campaign_id
            });

            if (rpcError) {
                // Fallback to manual update if RPC doesn't exist
                log('[generated-pins] RPC not available, using fallback');
                const { data: campaignData } = await supabase
                    .from('campaigns')
                    .select('generated_pins')
                    .eq('id', campaign_id)
                    .single();

                if (campaignData) {
                    await supabase
                        .from('campaigns')
                        .update({
                            generated_pins: (campaignData.generated_pins as number || 0) + 1,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', campaign_id);
                }
            }
        } catch (updateErr) {
            console.warn('[generated-pins] Campaign update warning:', updateErr);
        }

        return NextResponse.json({ success: true, data }, { status: 201 });
    } catch (error) {
        console.error('[generated-pins] POST error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// ============================================
// GET: Get generated pins for a campaign
// ============================================
export async function GET(request: NextRequest) {
    log('[generated-pins] GET request started');

    try {
        const supabase = await getAuthenticatedSupabase();
        if (!supabase) {
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 503 }
            );
        }

        // Verify user session for RLS
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const campaignId = searchParams.get('campaign_id');
        log('[generated-pins] GET campaignId:', campaignId);

        if (!campaignId) {
            return NextResponse.json(
                { error: 'campaign_id is required' },
                { status: 400 }
            );
        }

        // RLS will automatically filter to user's own data
        log('[generated-pins] Fetching pins...');
        const { data, error } = await supabase
            .from('generated_pins')
            .select('*')
            .eq('campaign_id', campaignId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[generated-pins] Fetch error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch generated pins', details: error.message },
                { status: 500 }
            );
        }

        log('[generated-pins] Found', data?.length || 0, 'pins');
        return NextResponse.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('[generated-pins] GET error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// ============================================
// DELETE: Delete generated pins for a campaign
// ============================================
export async function DELETE(request: NextRequest) {
    log('[generated-pins] DELETE request started');

    try {
        const supabase = await getAuthenticatedSupabase();
        if (!supabase) {
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 503 }
            );
        }

        // Verify user session for RLS
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const campaignId = searchParams.get('campaign_id');
        log('[generated-pins] DELETE campaignId:', campaignId);

        if (!campaignId) {
            return NextResponse.json(
                { error: 'campaign_id is required' },
                { status: 400 }
            );
        }

        // RLS will ensure only user's own data can be deleted
        log('[generated-pins] Deleting pins...');
        const { error } = await supabase
            .from('generated_pins')
            .delete()
            .eq('campaign_id', campaignId);

        if (error) {
            console.error('[generated-pins] Delete error:', error);
            return NextResponse.json(
                { error: 'Failed to delete generated pins', details: error.message },
                { status: 500 }
            );
        }

        // Reset campaign progress
        log('[generated-pins] Resetting campaign progress...');
        await supabase
            .from('campaigns')
            .update({
                generated_pins: 0,
                status: 'pending',
                updated_at: new Date().toISOString()
            })
            .eq('id', campaignId);

        log('[generated-pins] Delete complete');
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[generated-pins] DELETE error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
