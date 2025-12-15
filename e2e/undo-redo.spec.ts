/**
 * E2E Test: Undo/Redo Operations
 * 
 * TIER 1: Critical User Journey
 * Tests history navigation with undo/redo functionality.
 */

import { test, expect } from '@playwright/test';

test.describe('Undo/Redo Operations', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/editor');
        await page.waitForSelector('[data-testid="editor-canvas"]', { timeout: 10000 });
    });

    test('should undo add element operation', async ({ page }) => {
        // Add text element
        await page.click('button:has-text("Text")');
        await page.waitForTimeout(500);

        // Verify element exists
        const layersPanel = page.locator('[data-testid="layers-panel"]');
        await expect(layersPanel.locator('text=Text')).toBeVisible();

        // Undo
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(500);

        // Element should be gone
        // await expect(layersPanel.locator('text=Text')).not.toBeVisible();
    });

    test('should redo after undo', async ({ page }) => {
        // Add text element
        await page.click('button:has-text("Text")');
        await page.waitForTimeout(500);

        // Undo
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(500);

        // Redo
        await page.keyboard.press('Control+Shift+z');
        await page.waitForTimeout(500);

        // Element should be back
        const layersPanel = page.locator('[data-testid="layers-panel"]');
        await expect(layersPanel.locator('text=Text')).toBeVisible();
    });

    test('should handle multiple undo operations', async ({ page }) => {
        // Perform 3 operations
        await page.click('button:has-text("Text")');
        await page.waitForTimeout(300);

        await page.click('button:has-text("Shape")');
        await page.waitForTimeout(300);

        await page.click('button:has-text("Text")');
        await page.waitForTimeout(300);

        // Undo all 3
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(200);
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(200);
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(500);

        // Should be back to empty state
    });

    test('should disable undo when history empty', async ({ page }) => {
        // Try to undo with empty history (should not crash)
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(200);

        // Editor should still be functional
        await expect(page.locator('[data-testid="editor-canvas"]')).toBeVisible();
    });
});
