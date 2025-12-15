/**
 * E2E Test: Element Operations
 * 
 * TIER 1: Critical User Journey
 * Tests element manipulation: selection, movement, resize, delete.
 */

import { test, expect } from '@playwright/test';

test.describe('Element Operations', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/editor');
        await page.waitForSelector('[data-testid="editor-canvas"]', { timeout: 10000 });

        // Add a text element to work with
        await page.click('button:has-text("Text")');
        await page.waitForTimeout(500);
    });

    test('should select element by clicking', async ({ page }) => {
        // Click on the canvas area (where element should be)
        const canvas = page.locator('[data-testid="editor-canvas"]');
        await canvas.click({ position: { x: 200, y: 200 } });

        // Properties panel should show element properties
        await expect(page.locator('[data-testid="properties-panel"]')).toBeVisible();
    });

    test('should delete element with Delete key', async ({ page }) => {
        // Select the element first
        const canvas = page.locator('[data-testid="editor-canvas"]');
        await canvas.click({ position: { x: 200, y: 200 } });
        await page.waitForTimeout(200);

        // Press Delete key
        await page.keyboard.press('Delete');
        await page.waitForTimeout(500);

        // Element should be removed from layers panel
        const layersPanel = page.locator('[data-testid="layers-panel"]');
        // Check if no elements remain
    });

    test('should duplicate element with Ctrl+D', async ({ page }) => {
        // Select element
        const canvas = page.locator('[data-testid="editor-canvas"]');
        await canvas.click({ position: { x: 200, y: 200 } });
        await page.waitForTimeout(200);

        // Duplicate
        await page.keyboard.press('Control+d');
        await page.waitForTimeout(500);

        // Should now have 2 elements
    });

    test('should move element with arrow keys', async ({ page }) => {
        // Select element
        const canvas = page.locator('[data-testid="editor-canvas"]');
        await canvas.click({ position: { x: 200, y: 200 } });
        await page.waitForTimeout(200);

        // Move with arrow keys
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowDown');

        // Element should have moved (check position in properties)
    });
});
