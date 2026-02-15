# Excalidraw Export Dialog - Playwright Selectors Reference

> **Source:** Excalidraw source code analysis (2026-02-14)
> **Repository:** https://github.com/excalidraw/excalidraw

This document provides actionable Playwright selectors for automating the Excalidraw export dialog controls.

## Component Structure

The ImageExportDialog uses custom `<Switch>` and `<RadioGroup>` components that render standard HTML form controls.

---

## 1. Scale Selector

**Component:** `<RadioGroup name="exportScale" />`

### Available Values
- `1` = 1× scale
- `2` = 2× scale
- `3` = 3× scale

### Playwright Selectors

```typescript
// Select the radio group container
const scaleGroup = page.locator('.RadioGroup');

// Select a specific scale by value (via label text)
await page.locator('.RadioGroup__choice:has-text("2×") input').click();

// OR: Select by input name and check by index
const scale2x = page.locator('input[name="exportScale"]').nth(1); // 0-indexed
await scale2x.click();

// OR: Select by active state (to verify current selection)
const activeScale = page.locator('.RadioGroup__choice.active input');
```

### Recommended Approach
```typescript
async function setExportScale(page: Page, scale: 1 | 2 | 3) {
  await page.locator(`.RadioGroup__choice:has-text("${scale}×") input`).click();
}
```

---

## 2. Dark Mode Toggle

**Component:** `<Switch name="exportDarkModeSwitch" />`

### Playwright Selectors

```typescript
// Select by input name (most reliable)
const darkModeSwitch = page.locator('input[name="exportDarkModeSwitch"]');

// OR: Select by ID (same as name)
const darkModeSwitch = page.locator('#exportDarkModeSwitch');

// Check if currently enabled
const isChecked = await darkModeSwitch.isChecked();

// Toggle the switch
await darkModeSwitch.click();

// Set to specific state
if (!await darkModeSwitch.isChecked()) {
  await darkModeSwitch.click(); // Enable
}
```

### Recommended Approach
```typescript
async function setDarkMode(page: Page, enabled: boolean) {
  const toggle = page.locator('input[name="exportDarkModeSwitch"]');
  const current = await toggle.isChecked();
  if (current !== enabled) {
    await toggle.click();
  }
}
```

---

## 3. Background Toggle

**Component:** `<Switch name="exportBackgroundSwitch" />`

### Playwright Selectors

```typescript
// Select by input name
const backgroundSwitch = page.locator('input[name="exportBackgroundSwitch"]');

// OR: Select by ID
const backgroundSwitch = page.locator('#exportBackgroundSwitch');

// Check current state
const hasBackground = await backgroundSwitch.isChecked();

// Toggle
await backgroundSwitch.click();
```

### Recommended Approach
```typescript
async function setBackground(page: Page, enabled: boolean) {
  const toggle = page.locator('input[name="exportBackgroundSwitch"]');
  const current = await toggle.isChecked();
  if (current !== enabled) {
    await toggle.click();
  }
}
```

---

## 4. Embed Scene Toggle

**Component:** `<Switch name="exportEmbedSwitch" />`

### Playwright Selectors

```typescript
// Select by input name
const embedSwitch = page.locator('input[name="exportEmbedSwitch"]');

// OR: Select by ID
const embedSwitch = page.locator('#exportEmbedSwitch');

// Check if scene data will be embedded
const willEmbed = await embedSwitch.isChecked();

// Toggle
await embedSwitch.click();
```

### Recommended Approach
```typescript
async function setEmbedScene(page: Page, enabled: boolean) {
  const toggle = page.locator('input[name="exportEmbedSwitch"]');
  const current = await toggle.isChecked();
  if (current !== enabled) {
    await toggle.click();
  }
}
```

---

## Complete Implementation Example

```typescript
import { Page } from 'playwright';

interface ExportDialogOptions {
  scale?: 1 | 2 | 3;
  darkMode?: boolean;
  background?: boolean;
  embedScene?: boolean;
}

async function configureExportDialog(
  page: Page,
  options: ExportDialogOptions
): Promise<void> {
  // Wait for dialog to be visible
  await page.locator('.ImageExportDialog').waitFor({ state: 'visible' });

  // Set scale
  if (options.scale !== undefined) {
    await page
      .locator(`.RadioGroup__choice:has-text("${options.scale}×") input`)
      .click();
  }

  // Set dark mode
  if (options.darkMode !== undefined) {
    const toggle = page.locator('input[name="exportDarkModeSwitch"]');
    const current = await toggle.isChecked();
    if (current !== options.darkMode) {
      await toggle.click();
    }
  }

  // Set background
  if (options.background !== undefined) {
    const toggle = page.locator('input[name="exportBackgroundSwitch"]');
    const current = await toggle.isChecked();
    if (current !== options.background) {
      await toggle.click();
    }
  }

  // Set embed scene
  if (options.embedScene !== undefined) {
    const toggle = page.locator('input[name="exportEmbedSwitch"]');
    const current = await toggle.isChecked();
    if (current !== options.embedScene) {
      await toggle.click();
    }
  }

  // Small delay to ensure state updates propagate
  await page.waitForTimeout(300);
}

// Usage
await configureExportDialog(page, {
  scale: 2,
  darkMode: false,
  background: true,
  embedScene: false,
});
```

---

## Export Button Selectors

After configuring the dialog, you need to trigger the export:

```typescript
// PNG export button
const pngButton = page.locator('button[aria-label="Export to PNG"]');
await pngButton.click();

// SVG export button
const svgButton = page.locator('button[aria-label="Export to SVG"]');
await svgButton.click();
```

---

## Important Notes

### No `data-testid` Attributes
Excalidraw **does not provide** `data-testid` attributes for these controls. The selectors rely on:
- `name` attributes (for switches)
- CSS class names (for radio groups)
- `aria-label` (for export format buttons)

### Dialog Visibility
Always wait for the export dialog to be visible before interacting with controls:

```typescript
await page.locator('.ImageExportDialog').waitFor({ state: 'visible' });
```

### State Verification
For switches, always check current state before toggling to avoid race conditions:

```typescript
const current = await toggle.isChecked();
if (current !== desiredState) {
  await toggle.click();
}
```

### Timing Considerations
- After clicking toggles, allow ~300ms for React state updates
- After setting all options, wait before triggering export
- Use `page.waitForEvent('download')` for reliable file capture

---

## Related Controls

### Main Menu Trigger
```typescript
const menuButton = page.locator('[data-testid="main-menu-trigger"]');
```

### Export Menu Item
```typescript
const exportButton = page.locator('[data-testid="image-export-button"]');
```

### File Load Button
```typescript
const loadButton = page.locator('[data-testid="load-button"]');
```

---

## Testing Checklist

- [ ] Scale selector changes preview size
- [ ] Dark mode toggle affects preview theme
- [ ] Background toggle shows/hides canvas background
- [ ] Embed scene toggle affects file size (embedded = larger)
- [ ] Export button triggers download with correct settings
- [ ] Settings persist across dialog open/close (within session)

---

## References

- Excalidraw source: [ImageExportDialog.tsx](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/components/ImageExportDialog.tsx)
- Switch component: [Switch.tsx](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/components/Switch.tsx)
- RadioGroup component: [RadioGroup.tsx](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/components/RadioGroup.tsx)
