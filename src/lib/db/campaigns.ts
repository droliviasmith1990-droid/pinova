// Campaign database operations
import { supabase, isSupabaseConfigured, getCurrentUserId } from '../supabase';
import { DbCampaign, CampaignStatus, FieldMapping } from '@/types/database.types';

// ============================================
// Types for campaign operations
// ============================================
export interface CreateCampaignData {
    template_id: string;
    name: string;
    csv_data: Record<string, unknown>[];
    field_mapping: FieldMapping;
    total_pins: number;
    pinterest_board_id?: string;
    auto_post?: boolean;
    schedule_time?: string;
}

export interface CampaignListItem {
    id: string;
    name: string;
    template_id: string;
    total_pins: number;
    generated_pins: number;
    status: CampaignStatus;
    created_at: string;
    updated_at: string;
}

// Extended campaign type with additional fields from migrations
export interface CampaignWithDetails extends DbCampaign {
    current_index?: number;
    paused_at?: string;
    generation_settings?: Record<string, unknown>;
}

// ============================================
// Campaign CRUD Operations
// ============================================

/**
 * Create a new campaign
 * @param data Campaign data
 * @returns The created campaign or null on error
 */
export async function createCampaign(data: CreateCampaignData): Promise<DbCampaign | null> {
    if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured');
        return null;
    }

    const userId = await getCurrentUserId();
    if (!userId) {
        console.error('User not authenticated');
        return null;
    }

    try {
        const insertData = {
            user_id: userId,
            template_id: data.template_id,
            name: data.name,
            csv_data: data.csv_data,
            field_mapping: data.field_mapping,
            total_pins: data.total_pins,
            pinterest_board_id: data.pinterest_board_id || null,
            auto_post: data.auto_post ?? false,
            schedule_time: data.schedule_time || null,
        };

        const { data: campaign, error } = await supabase
            .from('campaigns')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            console.error('Error creating campaign:', error);
            return null;
        }

        return campaign;
    } catch (error) {
        console.error('Error creating campaign:', error);
        return null;
    }
}

/**
 * Get all campaigns for the current user
 * @returns Array of campaigns or empty array on error
 */
export async function getCampaigns(): Promise<CampaignListItem[]> {
    if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured');
        return [];
    }

    const userId = await getCurrentUserId();
    if (!userId) {
        console.warn('User not authenticated');
        return [];
    }

    try {
        // First get campaigns
        const { data: campaigns, error } = await supabase
            .from('campaigns')
            .select('id, name, template_id, total_pins, generated_pins, status, created_at, updated_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching campaigns:', error);
            return [];
        }

        if (!campaigns || campaigns.length === 0) {
            return [];
        }

        // Get actual pin counts from generated_pins table for each campaign
        const campaignIds = campaigns.map(c => c.id);
        const { data: pinCounts, error: countError } = await supabase
            .from('generated_pins')
            .select('campaign_id')
            .in('campaign_id', campaignIds);

        if (countError) {
            console.error('Error fetching pin counts:', countError);
            // Fall back to cached generated_pins
            return campaigns;
        }

        // Count pins per campaign
        const actualCounts: Record<string, number> = {};
        campaignIds.forEach(id => actualCounts[id] = 0);
        if (pinCounts) {
            pinCounts.forEach(pin => {
                actualCounts[pin.campaign_id] = (actualCounts[pin.campaign_id] || 0) + 1;
            });
        }

        // Return campaigns with actual pin counts
        return campaigns.map(campaign => ({
            ...campaign,
            generated_pins: actualCounts[campaign.id] ?? campaign.generated_pins
        }));
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        return [];
    }
}

/**
 * Get a single campaign with full data
 * @param campaignId Campaign ID
 * @returns Full campaign data or null
 */
export async function getCampaign(campaignId: string): Promise<CampaignWithDetails | null> {
    if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured');
        return null;
    }

    const userId = await getCurrentUserId();
    if (!userId) {
        console.error('User not authenticated');
        return null;
    }

    try {
        const { data: campaign, error } = await supabase
            .from('campaigns')
            .select('*')
            .eq('id', campaignId)
            .eq('user_id', userId)
            .single();

        if (error) {
            console.error('Error fetching campaign:', error);
            return null;
        }

        return campaign;
    } catch (error) {
        console.error('Error fetching campaign:', error);
        return null;
    }
}

/**
 * Update campaign progress
 * @param campaignId Campaign ID
 * @param generatedPins Number of generated pins
 * @param status Optional new status
 * @returns true on success, false on error
 */
export async function updateCampaignProgress(
    campaignId: string,
    generatedPins: number,
    status?: CampaignStatus
): Promise<boolean> {
    if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured');
        return false;
    }

    const userId = await getCurrentUserId();
    if (!userId) {
        console.error('User not authenticated');
        return false;
    }

    try {
        const updateData: Record<string, unknown> = {
            generated_pins: generatedPins,
        };

        if (status) {
            updateData.status = status;
            if (status === 'completed') {
                updateData.completed_at = new Date().toISOString();
            }
        }

        const { error } = await supabase
            .from('campaigns')
            .update(updateData)
            .eq('id', campaignId)
            .eq('user_id', userId);

        if (error) {
            console.error('Error updating campaign progress:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error updating campaign progress:', error);
        return false;
    }
}

/**
 * Delete a campaign
 * @param campaignId Campaign ID to delete
 * @returns true on success, false on error
 */
export async function deleteCampaign(campaignId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured');
        return false;
    }

    const userId = await getCurrentUserId();
    if (!userId) {
        console.error('User not authenticated');
        return false;
    }

    try {
        const { error } = await supabase
            .from('campaigns')
            .delete()
            .eq('id', campaignId)
            .eq('user_id', userId);

        if (error) {
            console.error('Error deleting campaign:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error deleting campaign:', error);
        return false;
    }
}

/**
 * Update a campaign with arbitrary fields
 * @param campaignId Campaign ID
 * @param updates Fields to update
 * @returns true on success, false on error
 */
export async function updateCampaign(
    campaignId: string,
    updates: Record<string, unknown>
): Promise<boolean> {
    if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured');
        return false;
    }

    const userId = await getCurrentUserId();
    if (!userId) {
        console.error('User not authenticated');
        return false;
    }

    try {
        const { error } = await supabase
            .from('campaigns')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', campaignId)
            .eq('user_id', userId);

        if (error) {
            console.error('Error updating campaign:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error updating campaign:', error);
        return false;
    }
}

