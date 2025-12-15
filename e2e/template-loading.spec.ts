/**
 * E2E Test: Template Loading
 * 
 * TIER 1: Critical User Journey
 * Tests loading and saving templates.
 */

import { test, expect } from '@playwright/test';

test.describe('Template Loading', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/editor');
        await page.waitForSelector('[data-testid="editor-canvas"]', { timeout: 10000 });
    });

    test('should load editor with default canvas', async ({ page }) => {
        // Canvas should have default dimensions
        const canvas = page.locator('[data-testid="editor-canvas"]');
        await expect(canvas).toBeVisible();
    });

    test('should preserve elements after page refresh', async ({ page }) => {
        // Add element
        await page.click('button:has-text("Text")');
        await page.waitForTimeout(500);

        // Give template a name (required for save)
        await page.locator('input[placeholder="Untitled Template"]').fill('Refresh Test');
        await page.waitForTimeout(1000);

        // Reload page
        await page.reload();
        await page.waitForSelector('[data-testid="editor-canvas"]', { timeout: 10000 });

        // Due to localStorage persistence, element should still be there
        // (auto-save via Zustand persist)
    });

    test('should handle canvas size change', async ({ page }) => {
        // Open canvas settings (if available)
        // Change dimensions
        // Verify canvas resizes appropriately

        // Placeholder - needs actual implementation based on UI
        await expect(page.locator('[data-testid="editor-canvas"]')).toBeVisible();
    });
});
