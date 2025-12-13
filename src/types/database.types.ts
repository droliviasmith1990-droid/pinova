// Database types for Supabase tables
// These types match the schema defined in supabase/migrations/

import { Element, CanvasSize } from './editor';

// ============================================
// Templates
// ============================================
export interface DbTemplate {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    canvas_size: CanvasSize;
    background_color: string;
    elements: Element[];
    thumbnail_url: string | null;
    category: string | null;
    is_public: boolean;
    created_at: string;
    updated_at: string;
}

export interface DbTemplateInsert {
    id?: string;
    user_id: string;
    name: string;
    description?: string | null;
    canvas_size: CanvasSize;
    background_color?: string;
    elements: Element[];
    thumbnail_url?: string | null;
    category?: string | null;
    is_public?: boolean;
}

export interface DbTemplateUpdate {
    name?: string;
    description?: string | null;
    canvas_size?: CanvasSize;
    background_color?: string;
    elements?: Element[];
    thumbnail_url?: string | null;
    category?: string | null;
    is_public?: boolean;
}

// ============================================
// Campaigns
// ============================================
export type CampaignStatus = 'pending' | 'processing' | 'paused' | 'completed' | 'failed';

export interface FieldMapping {
    [templateField: string]: string; // Maps template dynamic field to CSV column name
}

export interface DbCampaign {
    id: string;
    user_id: string;
    template_id: string;
    name: string;
    csv_data: Record<string, unknown>[];
    field_mapping: FieldMapping;
    total_pins: number;
    generated_pins: number;
    status: CampaignStatus;
    output_folder_url: string | null;
    pinterest_board_id: string | null;
    auto_post: boolean;
    schedule_time: string | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
}

export interface DbCampaignInsert {
    id?: string;
    user_id: string;
    template_id: string;
    name: string;
    csv_data: Record<string, unknown>[];
    field_mapping: FieldMapping;
    total_pins: number;
    generated_pins?: number;
    status?: CampaignStatus;
    output_folder_url?: string | null;
    pinterest_board_id?: string | null;
    auto_post?: boolean;
    schedule_time?: string | null;
}

export interface DbCampaignUpdate {
    name?: string;
    csv_data?: Record<string, unknown>[];
    field_mapping?: FieldMapping;
    total_pins?: number;
    generated_pins?: number;
    status?: CampaignStatus;
    output_folder_url?: string | null;
    pinterest_board_id?: string | null;
    auto_post?: boolean;
    schedule_time?: string | null;
    completed_at?: string | null;
}

// ============================================
// Generated Pins
// ============================================
export type PinStatus = 'generated' | 'posted' | 'failed';

export interface DbGeneratedPin {
    id: string;
    campaign_id: string;
    user_id: string;
    data_row: Record<string, unknown>;
    image_url: string;
    pinterest_pin_id: string | null;
    posted_at: string | null;
    status: PinStatus;
    error_message: string | null;
    created_at: string;
}

export interface DbGeneratedPinInsert {
    id?: string;
    campaign_id: string;
    user_id: string;
    data_row: Record<string, unknown>;
    image_url: string;
    pinterest_pin_id?: string | null;
    posted_at?: string | null;
    status?: PinStatus;
    error_message?: string | null;
}

// ============================================
// User Preferences
// ============================================
export interface DbUserPreferences {
    user_id: string;
    pinterest_access_token: string | null;
    pinterest_refresh_token: string | null;
    pinterest_token_expires_at: string | null;
    default_pinterest_board_id: string | null;
    auto_post_enabled: boolean;
    tebi_folder_prefix: string | null;
    notification_email: string | null;
    created_at: string;
    updated_at: string;
}

export interface DbUserPreferencesInsert {
    user_id: string;
    pinterest_access_token?: string | null;
    pinterest_refresh_token?: string | null;
    pinterest_token_expires_at?: string | null;
    default_pinterest_board_id?: string | null;
    auto_post_enabled?: boolean;
    tebi_folder_prefix?: string | null;
    notification_email?: string | null;
}

export interface DbUserPreferencesUpdate {
    pinterest_access_token?: string | null;
    pinterest_refresh_token?: string | null;
    pinterest_token_expires_at?: string | null;
    default_pinterest_board_id?: string | null;
    auto_post_enabled?: boolean;
    tebi_folder_prefix?: string | null;
    notification_email?: string | null;
}

// ============================================
// Usage Stats
// ============================================
export type UsageActionType =
    | 'template_created'
    | 'template_updated'
    | 'template_deleted'
    | 'pin_generated'
    | 'pin_posted'
    | 'campaign_created';

export interface DbUsageStats {
    id: string;
    user_id: string;
    action_type: UsageActionType;
    count: number;
    metadata: Record<string, unknown> | null;
    created_at: string;
}

export interface DbUsageStatsInsert {
    id?: string;
    user_id: string;
    action_type: UsageActionType;
    count?: number;
    metadata?: Record<string, unknown> | null;
}

// ============================================
// Database Schema Definition (for typed Supabase client)
// ============================================
export interface Database {
    public: {
        Tables: {
            templates: {
                Row: DbTemplate;
                Insert: DbTemplateInsert;
                Update: DbTemplateUpdate;
            };
            campaigns: {
                Row: DbCampaign;
                Insert: DbCampaignInsert;
                Update: DbCampaignUpdate;
            };
            generated_pins: {
                Row: DbGeneratedPin;
                Insert: DbGeneratedPinInsert;
                Update: Partial<DbGeneratedPin>;
            };
            user_preferences: {
                Row: DbUserPreferences;
                Insert: DbUserPreferencesInsert;
                Update: DbUserPreferencesUpdate;
            };
            usage_stats: {
                Row: DbUsageStats;
                Insert: DbUsageStatsInsert;
                Update: never;
            };
        };
    };
}
