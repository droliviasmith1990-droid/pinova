import * as fabric from 'fabric';
import { useSnappingSettingsStore, SnappingSettings } from '@/stores/snappingSettingsStore';
import { detectOverlap, calculateSpacing, getProximityColor, BoundingBox } from './CollisionDetection';

// Types for graduated magnetism
type MagneticZone = 'far' | 'near' | 'lock' | 'none';

interface GuideLine {
    x?: number;
    y?: number;
    x1?: number;
    x2?: number;
    y1?: number;
    y2?: number;
    zone: MagneticZone;
    isBoundary?: boolean;
}

interface DistanceBadge {
    x: number;
    y: number;
    text: string;
    axis: 'x' | 'y';
    zone: MagneticZone;
}

export class AlignmentGuides {
    private canvas: fabric.Canvas;
    private ctx: CanvasRenderingContext2D;
    private viewportTransform: number[] | undefined;
    private zoom: number = 1;
    private isScaling: boolean = false;
    private enabled: boolean = true;

    // Visual Data
    private verticalLines: GuideLine[] = [];
    private horizontalLines: GuideLine[] = [];
    private distanceBadges: DistanceBadge[] = [];
    private celebrationActive: boolean = false;
    private celebrationProgress: number = 0;
    private celebrationX: number = 0;
    private celebrationY: number = 0;

    // Settings (synced from store)
    private settings: SnappingSettings;

    constructor(canvas: fabric.Canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext();
        this.settings = useSnappingSettingsStore.getState();

        // Auto-bind handlers
        this.onObjectMoving = this.onObjectMoving.bind(this);
        this.clearLines = this.clearLines.bind(this);
        this.drawLines = this.drawLines.bind(this);
        this.onScaling = this.onScaling.bind(this);
        this.onModified = this.onModified.bind(this);

        // Subscribe to settings changes
        useSnappingSettingsStore.subscribe((state) => {
            this.settings = state;
        });

        this.init();
    }

    private init() {
        this.canvas.on('object:moving', this.onObjectMoving);
        this.canvas.on('object:scaling', this.onScaling);
        this.canvas.on('object:modified', this.onModified);
        this.canvas.on('after:render', this.drawLines);
        this.canvas.on('mouse:up', this.clearLines);
    }

    public dispose() {
        this.canvas.off('object:moving', this.onObjectMoving);
        this.canvas.off('object:scaling', this.onScaling);
        this.canvas.off('object:modified', this.onModified);
        this.canvas.off('after:render', this.drawLines);
        this.canvas.off('mouse:up', this.clearLines);
        this.clearLines();
    }

    public setEnabled(enabled: boolean) {
        this.enabled = enabled;
        if (!enabled) this.clearLines();
    }

    private onScaling() {
        this.isScaling = true;
        this.clearLines();
    }

    private onModified() {
        this.isScaling = false;
    }

    private clearLines() {
        this.verticalLines = [];
        this.horizontalLines = [];
        this.distanceBadges = [];
        this.celebrationActive = false;
        this.canvas.requestRenderAll();
    }

    // --- Simplified Zone Detection (uses single Snap Distance setting) ---
    private getZone(distance: number, isBoundary: boolean = false): MagneticZone {
        // Snap Distance (default 5px) - AUTO-SNAP when within this distance
        const snapDistance = this.settings.magneticSnapThreshold || 5;

        // Boundaries get slightly larger detection zone
        const boundaryBonus = isBoundary ? 1.2 : 1;
        const adjustedSnapDistance = snapDistance * boundaryBonus;

        // Zone 3: LOCK - Within snap distance = INSTANT AUTO-SNAP to 0px
        if (distance <= adjustedSnapDistance) return 'lock';

        // Zone 2: Near (approaching snap zone) - visual feedback appears
        if (distance <= adjustedSnapDistance * 2) return 'near';

        // Zone 1: Far (informational) - faint guide lines
        if (distance <= adjustedSnapDistance * 3) return 'far';

        return 'none';
    }

    private getMagneticPull(zone: MagneticZone, distance: number): number {
        if (!this.settings.magneticSnapping) return 0;

        switch (zone) {
            case 'lock': return distance; // Full snap
            case 'near': return distance * 0.7; // Strong pull
            case 'far': return distance * 0.3; // Gentle pull
            default: return 0;
        }
    }

    // --- Visual Style by Zone ---
    private getLineStyle(zone: MagneticZone, isBoundary: boolean = false): { width: number; opacity: number; dashed: boolean } {
        const baseWidth = isBoundary ? 2 : 1;

        switch (zone) {
            case 'lock':
                return { width: baseWidth * 2.5, opacity: 1, dashed: false };
            case 'near':
                return { width: baseWidth * 1.5, opacity: 0.6, dashed: false };
            case 'far':
                return { width: baseWidth, opacity: 0.3, dashed: true };
            default:
                return { width: baseWidth, opacity: 0.2, dashed: true };
        }
    }

    private drawLines() {
        if (!this.settings.showGuideLines) return;
        if (!this.verticalLines.length && !this.horizontalLines.length && !this.distanceBadges.length) return;

        this.ctx.save();

        if (this.viewportTransform) {
            this.ctx.transform(
                this.viewportTransform[0],
                this.viewportTransform[1],
                this.viewportTransform[2],
                this.viewportTransform[3],
                this.viewportTransform[4],
                this.viewportTransform[5]
            );
        }

        const scale = this.zoom;

        // Draw vertical guide lines
        for (const v of this.verticalLines) {
            if (v.x === undefined) continue;
            const style = this.getLineStyle(v.zone, v.isBoundary);

            this.ctx.beginPath();
            this.ctx.strokeStyle = this.hexToRgba(this.settings.guideColor, style.opacity);
            this.ctx.lineWidth = style.width / Math.max(scale, 0.01);

            if (style.dashed) {
                this.ctx.setLineDash([6 / scale, 4 / scale]);
            } else {
                this.ctx.setLineDash([]);
            }

            this.ctx.moveTo(v.x, v.y1 || -5000);
            this.ctx.lineTo(v.x, v.y2 || 5000);
            this.ctx.stroke();

            // Glow effect for lock zone
            if (v.zone === 'lock' && this.settings.guideAnimations) {
                this.ctx.strokeStyle = this.hexToRgba(this.settings.guideColor, 0.3);
                this.ctx.lineWidth = (style.width * 3) / Math.max(scale, 0.01);
                this.ctx.stroke();
            }
        }

        // Draw horizontal guide lines
        for (const h of this.horizontalLines) {
            if (h.y === undefined) continue;
            const style = this.getLineStyle(h.zone, h.isBoundary);

            this.ctx.beginPath();
            this.ctx.strokeStyle = this.hexToRgba(this.settings.guideColor, style.opacity);
            this.ctx.lineWidth = style.width / Math.max(scale, 0.01);

            if (style.dashed) {
                this.ctx.setLineDash([6 / scale, 4 / scale]);
            } else {
                this.ctx.setLineDash([]);
            }

            this.ctx.moveTo(h.x1 || -5000, h.y);
            this.ctx.lineTo(h.x2 || 5000, h.y);
            this.ctx.stroke();

            // Glow effect for lock zone
            if (h.zone === 'lock' && this.settings.guideAnimations) {
                this.ctx.strokeStyle = this.hexToRgba(this.settings.guideColor, 0.3);
                this.ctx.lineWidth = (style.width * 3) / Math.max(scale, 0.01);
                this.ctx.stroke();
            }
        }

        // Draw distance badges
        if (this.settings.distanceIndicators) {
            for (const badge of this.distanceBadges) {
                this.drawBadge(badge.x, badge.y, badge.text, scale, badge.zone);
            }
        }

        // Draw celebration animation
        if (this.celebrationActive && this.settings.snapCelebrations) {
            this.drawCelebration(scale);
        }

        this.ctx.restore();
    }

    private drawBadge(x: number, y: number, text: string, scale: number, zone: MagneticZone) {
        // Badge size evolves with zone
        const sizeMultiplier = zone === 'lock' ? 1.3 : zone === 'near' ? 1.1 : 1;
        const paddingX = (6 / scale) * sizeMultiplier;
        const paddingY = (4 / scale) * sizeMultiplier;
        const fontSize = (12 / scale) * sizeMultiplier;

        this.ctx.font = `bold ${fontSize}px sans-serif`;
        const metrics = this.ctx.measureText(text);
        const width = metrics.width + (paddingX * 2);
        const height = fontSize + (paddingY * 2);

        // Background with zone-based opacity
        const bgOpacity = zone === 'lock' ? 1 : zone === 'near' ? 0.85 : 0.7;
        this.ctx.fillStyle = this.hexToRgba(this.settings.guideColor, bgOpacity);
        this.ctx.beginPath();

        const r = height / 2;
        const bx = x - width / 2;
        const by = y - height / 2;

        this.ctx.roundRect(bx, by, width, height, r);
        this.ctx.fill();

        // Glow for lock zone
        if (zone === 'lock' && this.settings.guideAnimations) {
            this.ctx.shadowColor = this.settings.guideColor;
            this.ctx.shadowBlur = 10 / scale;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }

        // Text
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Show checkmark for 0px (perfect alignment)
        const displayText = text === '0' && zone === 'lock' ? '✓' : text;
        this.ctx.fillText(displayText, x, y + (1 / scale));
    }

    private drawCelebration(scale: number) {
        const progress = this.celebrationProgress;
        const size = (20 / scale) * (1 + progress * 0.5);
        const opacity = 1 - progress;

        this.ctx.beginPath();
        this.ctx.arc(this.celebrationX, this.celebrationY, size, 0, Math.PI * 2);
        this.ctx.strokeStyle = this.hexToRgba(this.settings.guideColor, opacity * 0.5);
        this.ctx.lineWidth = 3 / scale;
        this.ctx.stroke();

        // Animate
        this.celebrationProgress += 0.1;
        if (this.celebrationProgress >= 1) {
            this.celebrationActive = false;
            this.celebrationProgress = 0;
        } else {
            requestAnimationFrame(() => this.canvas.requestRenderAll());
        }
    }

    private triggerCelebration(x: number, y: number) {
        if (!this.settings.snapCelebrations) return;
        this.celebrationActive = true;
        this.celebrationProgress = 0;
        this.celebrationX = x;
        this.celebrationY = y;
    }

    private hexToRgba(hex: string, alpha: number): string {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    private onObjectMoving(e: fabric.BasicTransformEvent<fabric.TPointerEvent> & { target: fabric.FabricObject }) {
        // DEBUG: Log entry
        console.log('[AlignmentGuides] onObjectMoving triggered', {
            enabled: this.enabled,
            isScaling: this.isScaling,
            magneticSnapping: this.settings.magneticSnapping,
            showGuideLines: this.settings.showGuideLines,
            snapThreshold: this.settings.magneticSnapThreshold,
        });

        if (!this.enabled || this.isScaling) {
            console.log('[AlignmentGuides] Skipped: enabled=' + this.enabled + ', isScaling=' + this.isScaling);
            return;
        }
        if (!this.settings.magneticSnapping && !this.settings.showGuideLines) {
            console.log('[AlignmentGuides] Skipped: neither magneticSnapping nor showGuideLines enabled');
            return;
        }

        const activeObject = e.target;
        if (!activeObject) return;

        const canvasObjects = this.canvas.getObjects();
        const activeRect = activeObject.getBoundingRect();

        this.viewportTransform = this.canvas.viewportTransform;
        this.zoom = this.canvas.getZoom();

        const canvasWidth = this.canvas.width / this.zoom;
        const canvasHeight = this.canvas.height / this.zoom;

        this.clearLines();

        // --- Gather Snap Candidates ---
        interface SnapCandidate {
            value: number;
            type: 'edge' | 'center';
            isBoundary: boolean;
        }

        const verticalCandidates: SnapCandidate[] = [];
        const horizontalCandidates: SnapCandidate[] = [];

        // Canvas Center Lines - Use logical canvas dimensions
        if (this.settings.canvasCenterLines) {
            // FIXED: Calculate center from logical dimensions, not getCenterPoint()
            // getCenterPoint() returns viewport center which changes with zoom
            const centerX = canvasWidth / 2;
            const centerY = canvasHeight / 2;

            console.log(`[AlignmentGuides] Canvas Center Lines ENABLED. Center: (${centerX}, ${centerY}), Canvas: ${canvasWidth}x${canvasHeight}`);

            verticalCandidates.push({ value: centerX, type: 'center', isBoundary: false });
            horizontalCandidates.push({ value: centerY, type: 'center', isBoundary: false });
        }

        // Canvas Boundaries
        if (this.settings.snapToBoundaries) {
            verticalCandidates.push({ value: 0, type: 'edge', isBoundary: true });
            verticalCandidates.push({ value: canvasWidth, type: 'edge', isBoundary: true });
            horizontalCandidates.push({ value: 0, type: 'edge', isBoundary: true });
            horizontalCandidates.push({ value: canvasHeight, type: 'edge', isBoundary: true });
        }

        // Other Objects
        if (this.settings.snapToObjects) {
            for (const obj of canvasObjects) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (obj === activeObject || !obj.visible || (obj as any).name?.includes('guide')) continue;

                const objRect = obj.getBoundingRect();

                if (this.settings.objectEdges) {
                    verticalCandidates.push(
                        { value: objRect.left, type: 'edge', isBoundary: false },
                        { value: objRect.left + objRect.width, type: 'edge', isBoundary: false }
                    );
                    horizontalCandidates.push(
                        { value: objRect.top, type: 'edge', isBoundary: false },
                        { value: objRect.top + objRect.height, type: 'edge', isBoundary: false }
                    );
                }

                if (this.settings.objectCenters) {
                    verticalCandidates.push({ value: objRect.left + objRect.width / 2, type: 'center', isBoundary: false });
                    horizontalCandidates.push({ value: objRect.top + objRect.height / 2, type: 'center', isBoundary: false });
                }
            }
        }

        // --- Active Object Points ---
        const activeXPoints = [
            { value: activeRect.left, type: 'edge' as const },
            { value: activeRect.left + activeRect.width / 2, type: 'center' as const },
            { value: activeRect.left + activeRect.width, type: 'edge' as const }
        ];

        const activeYPoints = [
            { value: activeRect.top, type: 'edge' as const },
            { value: activeRect.top + activeRect.height / 2, type: 'center' as const },
            { value: activeRect.top + activeRect.height, type: 'edge' as const }
        ];

        // --- Find Best Snaps (Non-Greedy with Zones) ---
        let bestSnapX: { diff: number; target: number; zone: MagneticZone; isBoundary: boolean } | null = null;
        let bestSnapY: { diff: number; target: number; zone: MagneticZone; isBoundary: boolean } | null = null;

        for (const target of verticalCandidates) {
            for (const source of activeXPoints) {
                const dist = Math.abs(target.value - source.value);
                const zone = this.getZone(dist, target.isBoundary);

                if (zone !== 'none') {
                    // Prioritize stronger zones
                    const currentPriority = this.getZonePriority(bestSnapX?.zone);
                    const newPriority = this.getZonePriority(zone);

                    if (newPriority > currentPriority || (newPriority === currentPriority && dist < Math.abs(bestSnapX?.diff || Infinity))) {
                        bestSnapX = {
                            diff: target.value - source.value,
                            target: target.value,
                            zone,
                            isBoundary: target.isBoundary
                        };
                    }
                }
            }
        }

        for (const target of horizontalCandidates) {
            for (const source of activeYPoints) {
                const dist = Math.abs(target.value - source.value);
                const zone = this.getZone(dist, target.isBoundary);

                if (zone !== 'none') {
                    const currentPriority = this.getZonePriority(bestSnapY?.zone);
                    const newPriority = this.getZonePriority(zone);

                    if (newPriority > currentPriority || (newPriority === currentPriority && dist < Math.abs(bestSnapY?.diff || Infinity))) {
                        bestSnapY = {
                            diff: target.value - source.value,
                            target: target.value,
                            zone,
                            isBoundary: target.isBoundary
                        };
                    }
                }
            }
        }

        // --- Apply Snaps (FIXED: Direct position override for lock zone) ---
        let didSnapX = false;
        let didSnapY = false;

        if (bestSnapX && this.settings.magneticSnapping) {
            if (bestSnapX.zone === 'lock') {
                // LOCK ZONE: Directly set position to snap target (0px offset)
                // This is the magnetic "click into place" behavior
                activeObject.set({ left: activeObject.left! + bestSnapX.diff });
                didSnapX = true;
                console.log(`[SNAP-X] LOCKED to ${bestSnapX.target}px (was ${bestSnapX.diff}px away)`);
            } else {
                // Other zones: Apply partial pull for visual feedback
                const pull = this.getMagneticPull(bestSnapX.zone, Math.abs(bestSnapX.diff));
                if (pull > 0) {
                    activeObject.set({ left: activeObject.left! + (bestSnapX.diff > 0 ? pull : -pull) });
                }
            }

            this.verticalLines.push({
                x: bestSnapX.target,
                y1: -5000,
                y2: 5000,
                zone: bestSnapX.zone,
                isBoundary: bestSnapX.isBoundary
            });
        }

        if (bestSnapY && this.settings.magneticSnapping) {
            if (bestSnapY.zone === 'lock') {
                // LOCK ZONE: Directly set position to snap target (0px offset)
                activeObject.set({ top: activeObject.top! + bestSnapY.diff });
                didSnapY = true;
                console.log(`[SNAP-Y] LOCKED to ${bestSnapY.target}px (was ${bestSnapY.diff}px away)`);
            } else {
                // Other zones: Apply partial pull
                const pull = this.getMagneticPull(bestSnapY.zone, Math.abs(bestSnapY.diff));
                if (pull > 0) {
                    activeObject.set({ top: activeObject.top! + (bestSnapY.diff > 0 ? pull : -pull) });
                }
            }

            this.horizontalLines.push({
                y: bestSnapY.target,
                x1: -5000,
                x2: 5000,
                zone: bestSnapY.zone,
                isBoundary: bestSnapY.isBoundary
            });
        }

        if (didSnapX || didSnapY) {
            activeObject.setCoords();
            if (didSnapX && didSnapY) {
                this.triggerCelebration(bestSnapX!.target, bestSnapY!.target);
            }
        }

        // --- Distance Measurements ---
        if (this.settings.distanceIndicators) {
            const updatedRect = activeObject.getBoundingRect();
            this.computeDistanceBadges(updatedRect, canvasObjects, activeObject, canvasWidth, canvasHeight);
        }

        // --- Collision Detection (Universal for ALL elements) ---
        if (this.settings.preventOverlap && this.settings.collisionMode !== 'freeform') {
            const activeBox: BoundingBox = {
                left: activeObject.left || 0,
                top: activeObject.top || 0,
                width: activeRect.width,
                height: activeRect.height,
            };

            for (const obj of canvasObjects) {
                if (obj === activeObject || !obj.visible) continue;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if ((obj as any).name?.includes('guide')) continue;

                const objRect = obj.getBoundingRect();
                const targetBox: BoundingBox = {
                    left: objRect.left,
                    top: objRect.top,
                    width: objRect.width,
                    height: objRect.height,
                };

                const collision = calculateSpacing(activeBox, targetBox);
                const minSpacing = this.settings.minimumSpacing;

                // Check if collision or within minimum spacing
                if (collision.collides || collision.distance < minSpacing) {
                    const pushAmount = collision.collides
                        ? Math.abs(collision.distance) + minSpacing
                        : minSpacing - collision.distance;

                    if (this.settings.collisionMode === 'block') {
                        // Block mode: Push active object back
                        switch (collision.direction) {
                            case 'right':
                                activeObject.set({ left: targetBox.left - activeBox.width - minSpacing });
                                break;
                            case 'left':
                                activeObject.set({ left: targetBox.left + targetBox.width + minSpacing });
                                break;
                            case 'bottom':
                                activeObject.set({ top: targetBox.top - activeBox.height - minSpacing });
                                break;
                            case 'top':
                                activeObject.set({ top: targetBox.top + targetBox.height + minSpacing });
                                break;
                        }
                        activeObject.setCoords();
                    } else if (this.settings.collisionMode === 'push' && this.settings.autoPushElements) {
                        // Push mode: Move the other element away
                        switch (collision.direction) {
                            case 'right':
                                obj.set({ left: (obj.left || 0) + pushAmount });
                                break;
                            case 'left':
                                obj.set({ left: (obj.left || 0) - pushAmount });
                                break;
                            case 'bottom':
                                obj.set({ top: (obj.top || 0) + pushAmount });
                                break;
                            case 'top':
                                obj.set({ top: (obj.top || 0) - pushAmount });
                                break;
                        }
                        obj.setCoords();
                    }

                    // Add collision indicator badge
                    if (this.settings.collisionIndicators) {
                        const zoneName = collision.collides ? 'collision' :
                            collision.distance < minSpacing * 0.5 ? 'danger' : 'warning';
                        const badgeX = (activeBox.left + activeBox.width / 2 + targetBox.left + targetBox.width / 2) / 2;
                        const badgeY = (activeBox.top + activeBox.height / 2 + targetBox.top + targetBox.height / 2) / 2;

                        this.distanceBadges.push({
                            x: badgeX,
                            y: badgeY,
                            text: collision.collides ? '!' : Math.round(collision.distance).toString(),
                            axis: Math.abs(collision.direction === 'left' || collision.direction === 'right' ? 1 : 0) ? 'x' : 'y',
                            zone: collision.collides ? 'lock' : collision.distance < minSpacing * 0.5 ? 'near' : 'far',
                        });
                    }
                }
            }
        }

        // --- Prevent Off-Canvas ---
        if (this.settings.preventOffCanvas) {
            const updatedRect = activeObject.getBoundingRect();
            let clampNeeded = false;

            if (updatedRect.left < 0) {
                activeObject.set({ left: activeObject.left! - updatedRect.left });
                clampNeeded = true;
            }
            if (updatedRect.top < 0) {
                activeObject.set({ top: activeObject.top! - updatedRect.top });
                clampNeeded = true;
            }
            if (updatedRect.left + updatedRect.width > canvasWidth) {
                activeObject.set({ left: activeObject.left! - (updatedRect.left + updatedRect.width - canvasWidth) });
                clampNeeded = true;
            }
            if (updatedRect.top + updatedRect.height > canvasHeight) {
                activeObject.set({ top: activeObject.top! - (updatedRect.top + updatedRect.height - canvasHeight) });
                clampNeeded = true;
            }

            if (clampNeeded) activeObject.setCoords();
        }

        this.canvas.requestRenderAll();
    }

    private getZonePriority(zone: MagneticZone | undefined): number {
        if (!zone) return 0;
        switch (zone) {
            case 'lock': return 3;
            case 'near': return 2;
            case 'far': return 1;
            default: return 0;
        }
    }

    private computeDistanceBadges(
        activeRect: { left: number; top: number; width: number; height: number },
        canvasObjects: fabric.FabricObject[],
        activeObject: fabric.FabricObject,
        _canvasWidth: number,
        _canvasHeight: number
    ) {
        const measurementThreshold = 500 / this.zoom;

        for (const obj of canvasObjects) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (obj === activeObject || !obj.visible || (obj as any).name?.includes('guide')) continue;

            const targetRect = obj.getBoundingRect();

            // Vertical overlap check
            const verticalOverlap =
                Math.max(0, Math.min(activeRect.top + activeRect.height, targetRect.top + targetRect.height) -
                    Math.max(activeRect.top, targetRect.top)) > 0;

            if (verticalOverlap) {
                const distRightToLeft = targetRect.left - (activeRect.left + activeRect.width);
                if (distRightToLeft > 0 && distRightToLeft < measurementThreshold) {
                    const zone = this.getZone(distRightToLeft);
                    this.distanceBadges.push({
                        x: activeRect.left + activeRect.width + distRightToLeft / 2,
                        y: activeRect.top + activeRect.height / 2,
                        text: Math.round(distRightToLeft).toString(),
                        axis: 'x',
                        zone
                    });
                }

                const distLeftToRight = activeRect.left - (targetRect.left + targetRect.width);
                if (distLeftToRight > 0 && distLeftToRight < measurementThreshold) {
                    const zone = this.getZone(distLeftToRight);
                    this.distanceBadges.push({
                        x: targetRect.left + targetRect.width + distLeftToRight / 2,
                        y: activeRect.top + activeRect.height / 2,
                        text: Math.round(distLeftToRight).toString(),
                        axis: 'x',
                        zone
                    });
                }
            }

            // Horizontal overlap check
            const horizontalOverlap =
                Math.max(0, Math.min(activeRect.left + activeRect.width, targetRect.left + targetRect.width) -
                    Math.max(activeRect.left, targetRect.left)) > 0;

            if (horizontalOverlap) {
                const distBottomToTop = targetRect.top - (activeRect.top + activeRect.height);
                if (distBottomToTop > 0 && distBottomToTop < measurementThreshold) {
                    const zone = this.getZone(distBottomToTop);
                    this.distanceBadges.push({
                        x: activeRect.left + activeRect.width / 2,
                        y: activeRect.top + activeRect.height + distBottomToTop / 2,
                        text: Math.round(distBottomToTop).toString(),
                        axis: 'y',
                        zone
                    });
                }

                const distTopToBottom = activeRect.top - (targetRect.top + targetRect.height);
                if (distTopToBottom > 0 && distTopToBottom < measurementThreshold) {
                    const zone = this.getZone(distTopToBottom);
                    this.distanceBadges.push({
                        x: activeRect.left + activeRect.width / 2,
                        y: targetRect.top + targetRect.height + distTopToBottom / 2,
                        text: Math.round(distTopToBottom).toString(),
                        axis: 'y',
                        zone
                    });
                }
            }
        }
    }
}
