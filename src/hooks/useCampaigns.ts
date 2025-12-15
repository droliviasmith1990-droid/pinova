import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { toast } from 'sonner';

/**
 * Campaign type
 */
export interface Campaign {
    id: string;
    name: string;
    template_id: string;
    status: 'draft' | 'generating' | 'completed' | 'failed';
    total_pins: number;
    generated_pins: number;
    created_at: string;
    updated_at: string;
}

/**
 * Query keys for campaigns
 */
export const campaignKeys = {
    all: ['campaigns'] as const,
    lists: () => [...campaignKeys.all, 'list'] as const,
    list: (filters: string) => [...campaignKeys.lists(), { filters }] as const,
    details: () => [...campaignKeys.all, 'detail'] as const,
    detail: (id: string) => [...campaignKeys.details(), id] as const,
};

/**
 * Fetch all campaigns for the current user
 */
export function useCampaigns() {
    return useQuery({
        queryKey: campaignKeys.lists(),
        queryFn: async () => {
            if (!isSupabaseConfigured() || !supabase) {
                return [];
            }

            const { data, error } = await supabase
                .from('campaigns')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as Campaign[];
        },
        enabled: isSupabaseConfigured(),
    });
}

/**
 * Fetch a single campaign by ID
 */
export function useCampaign(id: string | null) {
    return useQuery({
        queryKey: campaignKeys.detail(id || ''),
        queryFn: async () => {
            if (!id || !supabase) return null;

            const { data, error } = await supabase
                .from('campaigns')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data as Campaign;
        },
        enabled: !!id && isSupabaseConfigured(),
    });
}

/**
 * Delete a campaign
 */
export function useDeleteCampaign() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            if (!supabase) throw new Error('Supabase not configured');

            const { error } = await supabase
                .from('campaigns')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return id;
        },
        onSuccess: (deletedId) => {
            queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
            queryClient.removeQueries({ queryKey: campaignKeys.detail(deletedId) });
            toast.success('Campaign deleted');
        },
        onError: (error) => {
            console.error('Error deleting campaign:', error);
            toast.error('Failed to delete campaign');
        },
    });
}

/**
 * Update campaign status
 */
export function useUpdateCampaignStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status, generated_pins }: {
            id: string;
            status?: Campaign['status'];
            generated_pins?: number;
        }) => {
            if (!supabase) throw new Error('Supabase not configured');

            const updates: Partial<Campaign> = {};
            if (status) updates.status = status;
            if (generated_pins !== undefined) updates.generated_pins = generated_pins;

            const { data, error } = await supabase
                .from('campaigns')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data as Campaign;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: campaignKeys.detail(data.id) });
            queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
        },
    });
}
