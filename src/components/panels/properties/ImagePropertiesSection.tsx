'use client';

import React, { memo } from 'react';
import { ImageElement } from '@/types/editor';
import { SectionHeader } from './shared';

interface ImagePropertiesSectionProps {
    element: ImageElement;
}

/**
 * ImagePropertiesSection - Memoized for performance (Phase 3.1)
 */
export const ImagePropertiesSection = memo(function ImagePropertiesSection({ element }: ImagePropertiesSectionProps) {
    // No image-specific controls needed anymore
    // Position, size, and alignment handled by PositionPanel
    return (
        <div>
            <SectionHeader title="IMAGE" />
            <p className="text-xs text-gray-500 py-2">
                Use the Position panel for size and alignment controls.
            </p>
        </div>
    );
});
