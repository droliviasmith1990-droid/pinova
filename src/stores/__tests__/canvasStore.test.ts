/**
 * Canvas Store Tests
 */

import { useCanvasStore } from '../canvasStore';

// Reset store before each test
const resetStore = () => {
    useCanvasStore.setState({
        canvasSize: { width: 1000, height: 1500 },
        backgroundColor: '#FFFFFF',
        zoom: 1,
    });
};

describe('canvasStore', () => {
    beforeEach(() => {
        resetStore();
    });

    describe('setCanvasSize', () => {
        it('should set canvas dimensions', () => {
            useCanvasStore.getState().setCanvasSize(800, 600);
            expect(useCanvasStore.getState().canvasSize).toEqual({ width: 800, height: 600 });
        });

        it('should enforce minimum size of 300', () => {
            useCanvasStore.getState().setCanvasSize(100, 100);
            expect(useCanvasStore.getState().canvasSize).toEqual({ width: 300, height: 300 });
        });

        it('should enforce maximum size of 5000', () => {
            useCanvasStore.getState().setCanvasSize(10000, 10000);
            expect(useCanvasStore.getState().canvasSize).toEqual({ width: 5000, height: 5000 });
        });
    });

    describe('setBackgroundColor', () => {
        it('should set background color', () => {
            useCanvasStore.getState().setBackgroundColor('#FF0000');
            expect(useCanvasStore.getState().backgroundColor).toBe('#FF0000');
        });
    });

    describe('setZoom', () => {
        it('should set zoom level with number', () => {
            useCanvasStore.getState().setZoom(1.5);
            expect(useCanvasStore.getState().zoom).toBe(1.5);
        });

        it('should set zoom level with function', () => {
            useCanvasStore.getState().setZoom(1);
            useCanvasStore.getState().setZoom((prev) => prev * 2);
            expect(useCanvasStore.getState().zoom).toBe(2);
        });

        it('should enforce minimum zoom of 0.1', () => {
            useCanvasStore.getState().setZoom(0.01);
            expect(useCanvasStore.getState().zoom).toBe(0.1);
        });

        it('should enforce maximum zoom of 3', () => {
            useCanvasStore.getState().setZoom(5);
            expect(useCanvasStore.getState().zoom).toBe(3);
        });
    });

    describe('zoomToFit', () => {
        it('should calculate optimal zoom to fit viewport', () => {
            // Canvas is 1000x1500, viewport is 800x600

            useCanvasStore.getState().zoomToFit(800, 600);

            // With padding of 80, available space is 720x520
            // scaleX = 720/1000 = 0.72
            // scaleY = 520/1500 = 0.347
            // Optimal = min(0.72, 0.347, 1) = 0.347
            expect(useCanvasStore.getState().zoom).toBeCloseTo(0.347, 1);
        });
    });

    describe('resetCanvas', () => {
        it('should reset to initial state', () => {
            useCanvasStore.getState().setCanvasSize(500, 500);
            useCanvasStore.getState().setBackgroundColor('#000000');
            useCanvasStore.getState().setZoom(2);

            useCanvasStore.getState().resetCanvas();

            expect(useCanvasStore.getState().canvasSize).toEqual({ width: 1000, height: 1500 });
            expect(useCanvasStore.getState().backgroundColor).toBe('#FFFFFF');
            expect(useCanvasStore.getState().zoom).toBe(0.5);
        });
    });
});
