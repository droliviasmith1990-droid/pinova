import { supabase, isSupabaseConfigured, getCurrentUserId } from '../supabase';
import { CampaignListItem } from './campaigns';
import { CampaignStatus } from '@/types/database.types';

export interface DashboardStats {
    templates: number;
    activeCampaigns: number;
    pinsGenerated: number;
    thisMonthPins: number;
}

export interface DashboardProject extends CampaignListItem {
    color: 'blue' | 'purple' | 'orange' | 'green' | 'gray';
    icon: string;
    progress: number;
}

/**
 * Fetch aggregated dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
    if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured');
        return { templates: 0, activeCampaigns: 0, pinsGenerated: 0, thisMonthPins: 0 };
    }

    const userId = await getCurrentUserId();
    if (!userId) {
        console.warn('User not authenticated');
        return { templates: 0, activeCampaigns: 0, pinsGenerated: 0, thisMonthPins: 0 };
    }

    try {
        // 1. Count Templates
        const { count: templatesCount, error: templatesError } = await supabase
            .from('templates')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (templatesError) console.error('Error counting templates:', templatesError);

        // 2. Count Active Campaigns
        const { count: activeCampaignsCount, error: campaignsError } = await supabase
            .from('campaigns')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .in('status', ['processing'] as CampaignStatus[]);

        if (campaignsError) console.error('Error counting active campaigns:', campaignsError);

        // 3. Sum Generated Pins (Total & This Month)
        // Note: 'generated_pins' is a number column in campaigns
        const { data: campaignsData, error: pinsError } = await supabase
            .from('campaigns')
            .select('generated_pins, created_at')
            .eq('user_id', userId);

        let totalPins = 0;
        let thisMonthPins = 0;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        if (!pinsError && campaignsData) {
            campaignsData.forEach(c => {
                totalPins += (c.generated_pins || 0);
                if (new Date(c.created_at) >= startOfMonth) {
                    thisMonthPins += (c.generated_pins || 0);
                }
            });
        } else if (pinsError) {
            console.error('Error fetching pin stats:', pinsError);
        }

        return {
            templates: templatesCount || 0,
            activeCampaigns: activeCampaignsCount || 0,
            pinsGenerated: totalPins,
            thisMonthPins: thisMonthPins
        };

    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        return { templates: 0, activeCampaigns: 0, pinsGenerated: 0, thisMonthPins: 0 };
    }
}

/**
 * Fetch recent projects (campaigns) for the dashboard
 */
export async function getRecentProjects(): Promise<DashboardProject[]> {
    if (!isSupabaseConfigured()) {
        return [];
    }

    const userId = await getCurrentUserId();
    if (!userId) return [];

    try {
        const { data: campaigns, error } = await supabase
            .from('campaigns')
            .select('id, name, template_id, total_pins, generated_pins, status, created_at, updated_at')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(10); // Limit to recent 10

        if (error) {
            console.error('Error fetching dashboard projects:', error);
            return [];
        }

        // Transform to DashboardProject format
        return (campaigns || []).map(c => {
            const progress = c.total_pins > 0 
                ? Math.round((c.generated_pins / c.total_pins) * 100) 
                : 0;

            let color: DashboardProject['color'] = 'gray';
            let icon = 'folder';

            switch (c.status) {
                case 'completed':
                    color = 'blue';
                    icon = 'check_circle';
                    break;
                case 'in_progress':
                case 'running':
                    color = 'purple';
                    icon = 'play_arrow';
                    break;
                case 'failed':
                    color = 'orange'; // Use orange for failed/attention
                    icon = 'warning';
                    break;
                case 'draft':
                    color = 'gray';
                    icon = 'edit_document';
                    break;
                default:
                    color = 'green';
                    icon = 'folder';
            }

            return {
                ...c,
                progress,
                color,
                icon
            };
        });

    } catch (error) {
        console.error('Error fetching dashboard projects:', error);
        return [];
    }
}
