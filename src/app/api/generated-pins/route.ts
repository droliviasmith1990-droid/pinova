import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Debug logging - only in development
const DEBUG = process.env.NODE_ENV === 'development';
const log = (...args: unknown[]) => DEBUG && console.log(...args);

// Initialize Supabase client with user context
// SECURITY: Uses Anon key + Forwarded Auth Header to enforce RLS
function getAuthenticatedSupabase(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const authHeader = request.headers.get('Authorization');

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('[generated-pins] Missing Supabase configuration');
        return null;
    }

    return createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: authHeader || '',
            },
        },
    });
}

// ============================================
// POST: Save generated pin record
// ============================================
export async function POST(request: NextRequest) {
    log('[generated-pins] POST request started');

    try {
        const supabase = getAuthenticatedSupabase(request);
        if (!supabase) {
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 503 }
            );
        }

        // 1. Verify User Session
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            log('[generated-pins] Auth failed:', authError?.message);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        log('[generated-pins] POST body:', JSON.stringify(body, null, 2));

        const { campaign_id, image_url, data_row, status, error_message } = body;

        // Validate required fields
        if (!campaign_id) {
            log('[generated-pins] Missing campaign_id');
            return NextResponse.json(
                { error: 'campaign_id is required' },
                { status: 400 }
            );
        }

        // 2. Insert Record (RLS will ensure users can only insert their own data)
        // SECURITY: Force user_id from authenticated session, ignore any user_id in body
        log('[generated-pins] Inserting pin record for user:', user.id);
        const { data, error } = await supabase
            .from('generated_pins')
            .insert({
                campaign_id,
                user_id: user.id, // Forced from session, not client input
                image_url: image_url || null,
                data_row: data_row || body.csv_row_data || null,
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

        // 3. Update Campaign Progress - try RPC first, fallback to manual
        log('[generated-pins] Updating campaign progress...');
        try {
            // Atomic increment via RPC (if available)
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
            // Don't fail the request, pin was saved
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
        const supabase = getAuthenticatedSupabase(request);
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
        const supabase = getAuthenticatedSupabase(request);
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
