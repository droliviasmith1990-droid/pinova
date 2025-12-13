import { NextRequest, NextResponse } from 'next/server';
import { getTemplate, duplicateTemplate } from '@/lib/db/templates';

/**
 * POST /api/templates/duplicate
 * Duplicate an existing template
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { templateId, newName } = body;

        if (!templateId) {
            return NextResponse.json(
                { error: 'Template ID is required' },
                { status: 400 }
            );
        }

        // Get original template
        const original = await getTemplate(templateId);

        if (!original) {
            return NextResponse.json(
                { error: 'Template not found' },
                { status: 404 }
            );
        }

        // Generate new name if not provided
        const duplicatedName = newName || `${original.name} (Copy)`;

        // Create duplicate
        const duplicate = await duplicateTemplate(templateId, duplicatedName);

        return NextResponse.json(duplicate);

    } catch (error) {
        console.error('Template duplication error:', error);
        return NextResponse.json(
            { error: 'Failed to duplicate template' },
            { status: 500 }
        );
    }
}
