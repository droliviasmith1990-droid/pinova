/**
 * Universal Collision Detection System
 * Works for ALL canvas element types: text, images, shapes, groups, etc.
 */

export interface BoundingBox {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface CollisionResult {
    collides: boolean;
    distance: number;  // Negative = overlap, Positive = gap
    direction: 'left' | 'right' | 'top' | 'bottom' | 'none';
    overlapArea: number;
}

export interface ProximityInfo {
    zone: 'safe' | 'warning' | 'danger' | 'collision';
    horizontalGap: number;
    verticalGap: number;
    closestDirection: 'left' | 'right' | 'top' | 'bottom' | 'none';
}

/**
 * Check if two bounding boxes overlap
 */
export function detectOverlap(box1: BoundingBox, box2: BoundingBox): boolean {
    const horizontalOverlap = box1.left < box2.left + box2.width &&
        box1.left + box1.width > box2.left;
    const verticalOverlap = box1.top < box2.top + box2.height &&
        box1.top + box1.height > box2.top;
    return horizontalOverlap && verticalOverlap;
}

/**
 * Calculate minimum spacing between two bounding boxes
 * Returns negative if overlapping, positive if gap exists
 */
export function calculateSpacing(box1: BoundingBox, box2: BoundingBox): CollisionResult {
    // Calculate gaps on all four sides
    const gapRight = box2.left - (box1.left + box1.width);  // Box2 is to the right
    const gapLeft = box1.left - (box2.left + box2.width);   // Box2 is to the left
    const gapBottom = box2.top - (box1.top + box1.height);  // Box2 is below
    const gapTop = box1.top - (box2.left + box2.height);    // Box2 is above

    // If overlapping
    if (detectOverlap(box1, box2)) {
        // Calculate overlap amount
        const overlapLeft = Math.max(box1.left, box2.left);
        const overlapRight = Math.min(box1.left + box1.width, box2.left + box2.width);
        const overlapTop = Math.max(box1.top, box2.top);
        const overlapBottom = Math.min(box1.top + box1.height, box2.top + box2.height);

        const overlapWidth = overlapRight - overlapLeft;
        const overlapHeight = overlapBottom - overlapTop;
        const overlapArea = overlapWidth * overlapHeight;

        // Find minimum penetration direction
        const penetrations = [
            { dir: 'left' as const, amount: box1.left + box1.width - box2.left },
            { dir: 'right' as const, amount: box2.left + box2.width - box1.left },
            { dir: 'top' as const, amount: box1.top + box1.height - box2.top },
            { dir: 'bottom' as const, amount: box2.top + box2.height - box1.top },
        ].filter(p => p.amount > 0);

        const minPenetration = penetrations.reduce((min, p) =>
            p.amount < min.amount ? p : min, { dir: 'none' as const, amount: Infinity });

        return {
            collides: true,
            distance: -minPenetration.amount,
            direction: minPenetration.dir,
            overlapArea,
        };
    }

    // Not overlapping - find closest gap
    const gaps = [
        { dir: 'right' as const, gap: gapRight },
        { dir: 'left' as const, gap: gapLeft },
        { dir: 'bottom' as const, gap: gapBottom },
        { dir: 'top' as const, gap: gapTop },
    ].filter(g => g.gap >= 0);

    if (gaps.length === 0) {
        return { collides: false, distance: 0, direction: 'none', overlapArea: 0 };
    }

    const minGap = gaps.reduce((min, g) => g.gap < min.gap ? g : min);

    return {
        collides: false,
        distance: minGap.gap,
        direction: minGap.dir,
        overlapArea: 0,
    };
}

/**
 * Get proximity zone for visual feedback
 */
export function getProximityInfo(box1: BoundingBox, box2: BoundingBox, minSpacing: number): ProximityInfo {
    const collision = calculateSpacing(box1, box2);

    // Calculate actual horizontal and vertical gaps
    const horizontalGap = Math.max(
        box2.left - (box1.left + box1.width),
        box1.left - (box2.left + box2.width)
    );
    const verticalGap = Math.max(
        box2.top - (box1.top + box1.height),
        box1.top - (box2.left + box2.height)
    );

    let zone: 'safe' | 'warning' | 'danger' | 'collision';

    if (collision.collides) {
        zone = 'collision';
    } else if (collision.distance < minSpacing * 0.5) {
        zone = 'danger';
    } else if (collision.distance < minSpacing) {
        zone = 'warning';
    } else {
        zone = 'safe';
    }

    return {
        zone,
        horizontalGap,
        verticalGap,
        closestDirection: collision.direction,
    };
}

/**
 * Calculate push-away vector to resolve collision
 */
export function calculatePushVector(
    activeBox: BoundingBox,
    targetBox: BoundingBox,
    minSpacing: number
): { dx: number; dy: number } | null {
    const collision = calculateSpacing(activeBox, targetBox);

    if (!collision.collides && collision.distance >= minSpacing) {
        return null; // No push needed
    }

    const pushAmount = collision.collides
        ? Math.abs(collision.distance) + minSpacing
        : minSpacing - collision.distance;

    switch (collision.direction) {
        case 'right':
            return { dx: pushAmount, dy: 0 };
        case 'left':
            return { dx: -pushAmount, dy: 0 };
        case 'bottom':
            return { dx: 0, dy: pushAmount };
        case 'top':
            return { dx: 0, dy: -pushAmount };
        default:
            return null;
    }
}

/**
 * Find all elements that collide with the active element
 */
export function findAllCollisions(
    activeBox: BoundingBox,
    allBoxes: { id: string; box: BoundingBox }[],
    minSpacing: number
): { id: string; collision: CollisionResult; proximityInfo: ProximityInfo }[] {
    const results: { id: string; collision: CollisionResult; proximityInfo: ProximityInfo }[] = [];

    for (const { id, box } of allBoxes) {
        const collision = calculateSpacing(activeBox, box);

        // Include if overlapping OR within minimum spacing
        if (collision.collides || collision.distance < minSpacing) {
            const proximityInfo = getProximityInfo(activeBox, box, minSpacing);
            results.push({ id, collision, proximityInfo });
        }
    }

    return results;
}

/**
 * Clamp position to prevent collision
 * Returns the adjusted position that maintains minimum spacing
 */
export function clampToAvoidCollision(
    activeBox: BoundingBox,
    targetBox: BoundingBox,
    minSpacing: number,
    movement: { dx: number; dy: number }
): { newLeft: number; newTop: number; blocked: boolean } {
    const newBox = {
        ...activeBox,
        left: activeBox.left + movement.dx,
        top: activeBox.top + movement.dy,
    };

    const collision = calculateSpacing(newBox, targetBox);

    if (!collision.collides && collision.distance >= minSpacing) {
        // Safe movement
        return { newLeft: newBox.left, newTop: newBox.top, blocked: false };
    }

    // Calculate clamped position
    let newLeft = newBox.left;
    let newTop = newBox.top;

    switch (collision.direction) {
        case 'right': // Active is moving right into target
            newLeft = targetBox.left - activeBox.width - minSpacing;
            break;
        case 'left': // Active is moving left into target
            newLeft = targetBox.left + targetBox.width + minSpacing;
            break;
        case 'bottom': // Active is moving down into target
            newTop = targetBox.top - activeBox.height - minSpacing;
            break;
        case 'top': // Active is moving up into target
            newTop = targetBox.top + targetBox.height + minSpacing;
            break;
    }

    return { newLeft, newTop, blocked: true };
}

/**
 * Get badge color based on proximity zone
 */
export function getProximityColor(zone: 'safe' | 'warning' | 'danger' | 'collision'): string {
    switch (zone) {
        case 'safe': return '#22c55e';     // Green
        case 'warning': return '#eab308';   // Yellow
        case 'danger': return '#f97316';    // Orange
        case 'collision': return '#ef4444'; // Red
    }
}
