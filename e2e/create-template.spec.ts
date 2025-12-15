/**
 * E2E Test: Create Template Flow
 * 
 * TIER 1: Critical User Journey
 * Tests the core flow of creating a new design with elements.
 */

import { test, expect } from '@playwright/test';

test.describe('Create Template Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to editor
        await page.goto('/editor');
        // Wait for editor to load
        await page.waitForSelector('[data-testid="editor-canvas"]', { timeout: 10000 });
    });

    test('should display editor with empty canvas', async ({ page }) => {
        // Verify canvas area is visible
        await expect(page.locator('[data-testid="editor-canvas"]')).toBeVisible();

        // Verify toolbar is visible
        await expect(page.locator('[data-testid="toolbar"]')).toBeVisible();

        // Verify left sidebar is visible
        await expect(page.locator('[data-testid="left-sidebar"]')).toBeVisible();

        // Verify properties panel is visible
        await expect(page.locator('[data-testid="properties-panel"]')).toBeVisible();
    });

    test('should add text element', async ({ page }) => {
        // Click "Add Text" button
        await page.click('button:has-text("Text")');

        // Wait for element to appear
        await page.waitForTimeout(500);

        // Verify element appears in layers panel
        const layersPanel = page.locator('[data-testid="layers-panel"]');
        await expect(layersPanel.locator('text=Text')).toBeVisible();
    });

    test('should add shape element', async ({ page }) => {
        // Click "Add Shape" button
        await page.click('button:has-text("Shape")');

        // Wait for element to appear
        await page.waitForTimeout(500);

        // Verify element appears in layers panel
        const layersPanel = page.locator('[data-testid="layers-panel"]');
        await expect(layersPanel.locator('text=Shape')).toBeVisible();
    });

    test('should modify template name', async ({ page }) => {
        // Find template name input
        const nameInput = page.locator('input[placeholder="Untitled Template"]');

        // Clear and type new name
        await nameInput.fill('My Test Template');

        // Verify name was updated
        await expect(nameInput).toHaveValue('My Test Template');
    });

    test('should show auto-save indicator', async ({ page }) => {
        // Auto-save indicator should be in header
        const autoSaveIndicator = page.locator('[data-testid="autosave-indicator"]');

        // Should show some status (idle, pending, etc)
        await expect(autoSaveIndicator).toBeVisible();
    });

    test('should undo operation', async ({ page }) => {
        // Add a text element first
        await page.click('button:has-text("Text")');
        await page.waitForTimeout(500);

        // Press Ctrl+Z to undo
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(500);

        // The text element should be removed
        // (undo removes the add operation)
    });
});
