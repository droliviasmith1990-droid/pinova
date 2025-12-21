/**
 * Polyfill DOM globals for Fabric.js 6.x server-side rendering
 * 
 * Fabric.js 6.x requires document, window, Image to exist even on server.
 * This polyfill creates minimal implementations using the 'canvas' npm package.
 * 
 * IMPORTANT: Call setupFabricServerPolyfills() BEFORE using fabric in API routes!
 * Do NOT auto-execute - breaks Next.js static generation.
 */

let polyfillsApplied = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = global as any;

export function setupFabricServerPolyfills(): void {
    // Only run once
    if (polyfillsApplied) {
        return;
    }

    // Only run on server
    if (typeof window !== 'undefined') {
        return; // Already in browser
    }

    console.log('[Polyfill] Setting up Fabric.js server environment...');

    try {
        // Dynamic import to avoid issues when not on server
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { createCanvas, Image: CanvasImage, ImageData } = require('canvas');

        // Polyfill global.document
        if (typeof g.document === 'undefined') {
            g.document = {
                createElement: (tagName: string) => {
                    if (tagName === 'canvas') {
                        return createCanvas(300, 300);
                    }
                    if (tagName === 'img') {
                        return new CanvasImage();
                    }
                    // Return minimal mock for other elements
                    const mockElement = {
                        getContext: () => null,
                        addEventListener: () => {},
                        removeEventListener: () => {},
                        style: {},
                        appendChild: (child: unknown) => child,
                        removeChild: (child: unknown) => child,
                        setAttribute: () => {},
                        getAttribute: () => null,
                    };
                    return mockElement;
                },
                createElementNS: (_ns: string, tagName: string) => {
                    return g.document.createElement(tagName);
                },
                documentElement: {
                    style: {},
                },
                getElementsByTagName: () => [],
                querySelector: () => null,
                querySelectorAll: () => [],
                body: {
                    appendChild: (child: unknown) => child,
                    removeChild: (child: unknown) => child,
                    style: {},
                },
                head: {
                    appendChild: (child: unknown) => child,
                    removeChild: (child: unknown) => child,
                },
            };
        }

        // Polyfill global.window
        if (typeof g.window === 'undefined') {
            g.window = {
                document: g.document,
                devicePixelRatio: 1,
                navigator: {
                    userAgent: 'Node.js',
                    platform: 'Node.js',
                },
                addEventListener: () => {},
                removeEventListener: () => {},
                requestAnimationFrame: (cb: () => void) => setTimeout(cb, 16),
                cancelAnimationFrame: (id: number) => clearTimeout(id),
                getComputedStyle: () => ({
                    getPropertyValue: () => '',
                }),
                matchMedia: () => ({
                    matches: false,
                    addListener: () => {},
                    removeListener: () => {},
                }),
                location: {
                    href: '',
                    protocol: 'https:',
                },
            };
        }

        // Polyfill global.Image
        if (typeof g.Image === 'undefined') {
            g.Image = CanvasImage;
        }

        // Polyfill global.ImageData
        if (typeof g.ImageData === 'undefined') {
            g.ImageData = ImageData;
        }

        // Polyfill HTMLCanvasElement for Fabric detection
        if (typeof g.HTMLCanvasElement === 'undefined') {
            g.HTMLCanvasElement = class HTMLCanvasElement {};
        }

        // Polyfill HTMLImageElement for Fabric detection
        if (typeof g.HTMLImageElement === 'undefined') {
            g.HTMLImageElement = CanvasImage;
        }

        polyfillsApplied = true;
        console.log('[Polyfill] ✅ Fabric.js server environment ready');

    } catch (error) {
        console.error('[Polyfill] ❌ Failed to setup polyfills:', error);
        // Don't throw - just log and let the API route handle the error
    }
}

// NOTE: Do NOT auto-execute here! It breaks Next.js static generation.
// Call setupFabricServerPolyfills() inside the API route handler instead.
