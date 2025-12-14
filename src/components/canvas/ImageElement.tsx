'use client';

import React, { useEffect, useState } from 'react';
import { Image, Group, Rect } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { ImageElement, DEFAULT_DUMMY_DATA } from '@/types/editor';
import { useEditorStore } from '@/stores/editorStore';

interface ImageElementComponentProps {
    element: ImageElement;
    isSelected: boolean;
    onSelect: () => void;
    onDragMove: (e: KonvaEventObject<DragEvent>) => void;
    onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
    onTransformEnd: (e: KonvaEventObject<Event>) => void;
}

// Custom hook to load image
function useImage(url: string | undefined): [HTMLImageElement | null, string] {
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [status, setStatus] = useState<string>(!url ? 'empty' : 'loading');
    const [prevUrl, setPrevUrl] = useState<string | undefined>(url);

    // Derived state pattern: Reset state when URL changes during render
    if (url !== prevUrl) {
        setPrevUrl(url);
        setImage(null);
        setStatus(!url ? 'empty' : 'loading');
    }

    useEffect(() => {
        if (!url) {
            return;
        }

        const img = new window.Image();
        img.crossOrigin = 'anonymous';

        let cancelled = false;

        img.onload = () => {
            if (!cancelled) {
                setImage(img);
                setStatus('loaded');
            }
        };

        img.onerror = () => {
            if (!cancelled) {
                setImage(null);
                setStatus('failed');
            }
        };

        img.src = url;

        return () => {
            cancelled = true;
            img.onload = null;
            img.onerror = null;
        };
    }, [url]);

    // Derived state for empty URL to return immediately
    if (!url) return [null, 'empty'];

    return [image, status];
}

export function ImageElementComponent({
    element,
    isSelected,
    onSelect,
    onDragMove,
    onDragEnd,
    onTransformEnd
}: ImageElementComponentProps) {
    const previewMode = useEditorStore((s) => s.previewMode);

    // Get display URL based on dynamic mode
    const getDisplayUrl = () => {
        // For Canva background images, use proxy to bypass CORS
        if (element.isCanvaBackground && element.imageUrl) {
            return `/api/proxy-image?url=${encodeURIComponent(element.imageUrl)}`;
        }

        if (!element.isDynamic || !element.dynamicSource) {
            return element.imageUrl;
        }

        if (previewMode) {
            return element.dynamicSource === 'logo'
                ? DEFAULT_DUMMY_DATA.logo
                : DEFAULT_DUMMY_DATA.image;
        }

        return undefined; // Show placeholder in design mode
    };

    const displayUrl = getDisplayUrl();
    const [image, status] = useImage(displayUrl);

    // Placeholder for images without URL or loading
    if (!image || status !== 'loaded') {
        return (
            <Group
                id={element.id}
                x={element.x}
                y={element.y}
                width={element.width}
                height={element.height}
                rotation={element.rotation}
                opacity={element.opacity}
                draggable={!element.locked}
                onClick={onSelect}
                onTap={onSelect}
                onDragMove={onDragMove}
                onDragEnd={onDragEnd}
                onTransformEnd={onTransformEnd}
            >
                <Rect
                    width={element.width}
                    height={element.height}
                    fill="#F3F4F6"
                    stroke="#D1D5DB"
                    strokeWidth={2}
                    cornerRadius={element.cornerRadius}
                    dash={[8, 4]}
                />
                <Rect
                    x={element.width / 2 - 20}
                    y={element.height / 2 - 20}
                    width={40}
                    height={40}
                    fill="#9CA3AF"
                    cornerRadius={4}
                />
            </Group>
        );
    }

    // Render with clipping for corner radius
    if (element.cornerRadius > 0) {
        return (
            <Group
                id={element.id}
                x={element.x}
                y={element.y}
                width={element.width}
                height={element.height}
                rotation={element.rotation}
                opacity={element.opacity}
                draggable={!element.locked}
                onClick={onSelect}
                onTap={onSelect}
                onDragMove={onDragMove}
                onDragEnd={onDragEnd}
                onTransformEnd={onTransformEnd}
                clipFunc={(ctx) => {
                    const radius = element.cornerRadius;
                    const width = element.width;
                    const height = element.height;

                    ctx.beginPath();
                    ctx.moveTo(radius, 0);
                    ctx.lineTo(width - radius, 0);
                    ctx.arcTo(width, 0, width, radius, radius);
                    ctx.lineTo(width, height - radius);
                    ctx.arcTo(width, height, width - radius, height, radius);
                    ctx.lineTo(radius, height);
                    ctx.arcTo(0, height, 0, height - radius, radius);
                    ctx.lineTo(0, radius);
                    ctx.arcTo(0, 0, radius, 0, radius);
                    ctx.closePath();
                }}
            >
                <Image
                    image={image}
                    width={element.width}
                    height={element.height}
                />
            </Group>
        );
    }

    return (
        <Image
            id={element.id}
            image={image}
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
            rotation={element.rotation}
            opacity={element.opacity}
            draggable={!element.locked}
            onClick={onSelect}
            onTap={onSelect}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            onTransformEnd={onTransformEnd}
        />
    );
}
