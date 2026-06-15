#!/usr/bin/env npx -y bun

/**
 * Excalidraw Export Script
 *
 * Export .excalidraw files to PNG or SVG using Playwright directly.
 * Replaces the previous excalidraw-brute-export-cli wrapper which broke
 * due to excalidraw.com UI changes (welcome screen + menu state issues).
 *
 * Usage:
 *   npx -y bun excalidraw-export.ts -i diagram.excalidraw -o diagram.png
 *   npx -y bun excalidraw-export.ts -i diagram.excalidraw -o diagram.svg -f svg
 *   npx -y bun excalidraw-export.ts -i diagram.excalidraw -o diagram.png --dark --scale 2
 *
 * Prerequisites:
 *   cd smart-illustrator/scripts && npm install
 *   npx playwright install firefox
 */

import { access, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";

interface ExportOptions {
  input: string;
  output: string;
  format: "png" | "svg";
  scale: 1 | 2 | 3;
  darkMode: boolean;
  background: boolean;
  embedScene: boolean;
  timeout: number;
}

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));

/**
 * Check if a hex color is "dark" (luminance < 0.2).
 * Used to auto-detect whether the file already has a dark background,
 * in which case we should NOT enable Excalidraw's export dark mode toggle
 * (it inverts colors, turning black → near-white).
 */
function isDarkColor(hex: string): boolean {
  const clean = hex.replace("#", "");
  if (clean.length < 6) return false;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  // Relative luminance (ITU-R BT.709)
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 0.2;
}

/**
 * Read the .excalidraw file and extract viewBackgroundColor.
 * Returns null if not found or not a valid color.
 */
async function getFileBackgroundColor(
  filePath: string
): Promise<string | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw);
    return data?.appState?.viewBackgroundColor ?? null;
  } catch {
    return null;
  }
}

async function exportWithPlaywright(opts: ExportOptions): Promise<void> {
  // Import playwright from local node_modules (installed as transitive dep of excalidraw-brute-export-cli)
  const pw = await import(
    resolve(SCRIPTS_DIR, "node_modules/playwright/index.mjs")
  );
  const { firefox } = pw;

  const absInput = resolve(opts.input);
  const absOutput = resolve(opts.output);

  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 },
  });

  try {
    console.log("  Opening excalidraw.com...");
    await page.goto("https://excalidraw.com", { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Strategy: Try to load file via welcome screen Open button first,
    // fall back to hamburger menu Open if welcome screen isn't showing.
    console.log("  Loading file...");
    let fileLoaded = false;

    // Check if welcome screen Open button is visible
    const welcomeOpen = page.locator("button:has-text('Open')").first();
    const welcomeOpenCount = await welcomeOpen
      .count()
      .catch(() => 0);

    if (welcomeOpenCount > 0) {
      // Welcome screen is showing - use its Open button directly
      try {
        const fcPromise = page.waitForEvent("filechooser", {
          timeout: opts.timeout,
        });
        await welcomeOpen.click();
        const fc = await fcPromise;
        await fc.setFiles(absInput);
        await page.waitForTimeout(2000);
        fileLoaded = true;
        console.log("  File loaded via welcome screen.");
      } catch {
        // Welcome Open didn't work, fall through to hamburger menu
      }
    }

    if (!fileLoaded) {
      // No welcome screen or it didn't work - use hamburger menu
      const menuTrigger = page.locator(
        '[data-testid="main-menu-trigger"]'
      );
      await menuTrigger.click({ timeout: opts.timeout });
      await page.waitForTimeout(500);

      const fcPromise = page.waitForEvent("filechooser", {
        timeout: opts.timeout,
      });
      const openBtn = page.locator('[data-testid="load-button"]');
      await openBtn.click({ timeout: opts.timeout });
      const fc = await fcPromise;
      await fc.setFiles(absInput);
      await page.waitForTimeout(2000);
      console.log("  File loaded via hamburger menu.");
    }

    // Dismiss any remaining overlays (Escape alone is unreliable since ~Feb 2026)
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      document
        .querySelectorAll(
          ".Modal__background, .modal-overlay, .excalidraw-modal-container .Modal"
        )
        .forEach((el) => el.remove());
    });
    await page.waitForTimeout(300);

    // Open the main menu and click Export
    console.log("  Opening export dialog...");
    const menuTrigger = page.locator(
      '[data-testid="main-menu-trigger"]'
    );
    await menuTrigger.click({ timeout: opts.timeout });
    await page.waitForTimeout(500);

    const exportMenuItem = page.locator(
      '[data-testid="image-export-button"]'
    );

    // Verify export button exists before clicking
    const exportCount = await exportMenuItem.count();
    if (exportCount === 0) {
      // Menu might have toggled closed - click again
      await menuTrigger.click({ timeout: opts.timeout });
      await page.waitForTimeout(500);
    }

    await exportMenuItem.click({ timeout: opts.timeout });

    // Wait for export dialog to be ready (not just a fixed timeout)
    const exportDialog = page.locator(".ImageExportDialog, .ImageExportModal, .ExportDialog");
    await exportDialog.waitFor({ state: "visible", timeout: opts.timeout }).catch(() => {
      // Fallback: if dialog class changed, wait a fixed time
      return page.waitForTimeout(1500);
    });

    // Configure export options in the dialog
    console.log("  Configuring export options...");

    // Helper: fail fast when user explicitly set a non-default option but control is missing
    const requireControl = async (
      locator: ReturnType<typeof page.locator>,
      name: string,
      isNonDefault: boolean
    ): Promise<boolean> => {
      const found = (await locator.count()) > 0;
      if (!found && isNonDefault) {
        throw new Error(
          `Export option "${name}" not found in dialog. ` +
          `Excalidraw UI may have changed. Cannot apply --${name.toLowerCase()} setting.`
        );
      }
      return found;
    };

    // Set scale (radio buttons: 1×, 2×, 3×)
    const scaleLabel = `${opts.scale}×`;
    const scaleRadio = page.locator(
      `.RadioGroup__choice:has-text("${scaleLabel}") input`
    );
    if (await requireControl(scaleRadio, "scale", opts.scale !== 2)) {
      await scaleRadio.click();
    }

    // Set dark mode switch — with auto-detection for already-dark files.
    // Excalidraw's export "dark mode" inverts colors. If the file already
    // has a dark viewBackgroundColor (e.g. #000000), enabling dark mode
    // would invert it to near-white (#ededed). So we skip it automatically.
    let effectiveDark = opts.darkMode;
    if (opts.darkMode) {
      const fileBg = await getFileBackgroundColor(absInput);
      if (fileBg && isDarkColor(fileBg)) {
        console.log(
          `  Auto-detect: file bg is already dark (${fileBg}), skipping export dark mode toggle.`
        );
        effectiveDark = false;
      }
    }

    const darkSwitch = page.locator('input[name="exportDarkModeSwitch"]');
    if (await requireControl(darkSwitch, "dark", effectiveDark)) {
      const isDark = await darkSwitch.isChecked();
      if (effectiveDark !== isDark) {
        await darkSwitch.click({ force: true });
      }
    }

    // Set background switch
    const bgSwitch = page.locator('input[name="exportBackgroundSwitch"]');
    if (await requireControl(bgSwitch, "background", !opts.background)) {
      const hasBg = await bgSwitch.isChecked();
      if (opts.background !== hasBg) {
        await bgSwitch.click({ force: true });
      }
    }

    // Set embed scene switch
    const embedSwitch = page.locator('input[name="exportEmbedSwitch"]');
    if (await requireControl(embedSwitch, "embed-scene", opts.embedScene)) {
      const isEmbed = await embedSwitch.isChecked();
      if (opts.embedScene !== isEmbed) {
        await embedSwitch.click({ force: true });
      }
    }

    await page.waitForTimeout(500);

    // Select format and trigger export
    const formatLabel =
      opts.format === "svg" ? "Export to SVG" : "Export to PNG";
    console.log(
      `  Exporting ${formatLabel} (scale: ${opts.scale}x, dark: ${effectiveDark}${effectiveDark !== opts.darkMode ? " (auto-skipped)" : ""}, bg: ${opts.background})...`
    );

    // Intercept File System Access API (showSaveFilePicker) so we can capture
    // the exported blob even when the browser uses the native file-save dialog
    // instead of a traditional download event. Firefox doesn't support
    // showSaveFilePicker at all, so the download event path is the fallback.
    await page.evaluate(() => {
      (window as any).__exportedBlob = null;
      if (typeof (window as any).showSaveFilePicker === "function") {
        (window as any).showSaveFilePicker = async () => ({
          createWritable: async () => ({
            write: async (data: any) => {
              (window as any).__exportedBlob = data;
            },
            close: async () => {},
          }),
        });
      }
    });

    const formatBtn = page.locator(
      `button[aria-label="${formatLabel}"]`
    );

    // Race: download event (Firefox) vs intercepted blob (Chromium / new Excalidraw)
    const downloadPromise = page
      .waitForEvent("download", { timeout: opts.timeout })
      .catch(() => null);

    await formatBtn.click({ timeout: opts.timeout });

    const download = await downloadPromise;

    if (download) {
      // Traditional download event fired (Firefox path)
      await download.saveAs(absOutput);
      console.log(`  Download saved (via download event).`);
    } else {
      // Check for intercepted blob from showSaveFilePicker
      await page.waitForTimeout(3000);
      const hasBlob = await page.evaluate(
        () => (window as any).__exportedBlob !== null
      );
      if (hasBlob) {
        const base64 = await page.evaluate(async () => {
          const blob: Blob = (window as any).__exportedBlob;
          const buf = await blob.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          return btoa(binary);
        });
        const { writeFile } = await import("node:fs/promises");
        await writeFile(absOutput, Buffer.from(base64, "base64"));
        console.log(`  Download saved (via blob intercept).`);
      } else {
        throw new Error(
          "Export failed: neither download event nor blob intercept captured the file. " +
            "Excalidraw UI may have changed."
        );
      }
    }
  } finally {
    await browser.close();
  }
}

function printUsage(): never {
  console.log(`
Excalidraw Export Script

Usage:
  npx -y bun excalidraw-export.ts -i <input> -o <output> [options]

Options:
  -i, --input <path>     Input .excalidraw file (required)
  -o, --output <path>    Output file path (required)
  -f, --format <fmt>     Output format: png (default) or svg
  -s, --scale <1|2|3>    Export scale (default: 2)
  -d, --dark             Enable dark mode
  -b, --background       Include background (default: white, use --no-bg for transparent)
  -e, --embed-scene      Embed scene data in exported file
  --timeout <ms>         Timeout in milliseconds (default: 30000)
  -h, --help             Show this help

Examples:
  # Export to PNG at 2x scale
  npx -y bun excalidraw-export.ts -i diagram.excalidraw -o diagram.png

  # Export to SVG
  npx -y bun excalidraw-export.ts -i diagram.excalidraw -o diagram.svg -f svg

  # Export dark mode PNG at 3x scale
  npx -y bun excalidraw-export.ts -i diagram.excalidraw -o diagram-dark.png -d -s 3

  # Export with transparent background (no white fill)
  npx -y bun excalidraw-export.ts -i diagram.excalidraw -o diagram.png --no-bg

Prerequisites:
  cd smart-illustrator/scripts && npm install
  npx playwright install firefox
`);
  process.exit(0);
}

async function main() {
  const args = process.argv.slice(2);

  const opts: ExportOptions = {
    input: "",
    output: "",
    format: "png",
    scale: 2,
    darkMode: false,
    background: true,
    embedScene: false,
    timeout: 30000,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "-h":
      case "--help":
        printUsage();
        break;
      case "-i":
      case "--input":
        opts.input = args[++i];
        break;
      case "-o":
      case "--output":
        opts.output = args[++i];
        break;
      case "-f":
      case "--format":
        opts.format = args[++i] as "png" | "svg";
        break;
      case "-s":
      case "--scale":
        opts.scale = parseInt(args[++i], 10) as 1 | 2 | 3;
        break;
      case "-d":
      case "--dark":
        opts.darkMode = true;
        break;
      case "-b":
      case "--background":
        opts.background = true;
        break;
      case "--no-bg":
      case "--transparent":
        opts.background = false;
        break;
      case "-e":
      case "--embed-scene":
        opts.embedScene = true;
        break;
      case "--timeout":
        opts.timeout = parseInt(args[++i], 10);
        break;
    }
  }

  if (!opts.input) {
    console.error("Error: --input is required");
    process.exit(1);
  }
  if (!opts.output) {
    const base = opts.input.replace(/\.excalidraw$/, "").replace(/\.md$/, "");
    opts.output = `${base}.${opts.format}`;
  }

  if (extname(opts.output) === ".svg") {
    opts.format = "svg";
  }

  if (![1, 2, 3].includes(opts.scale)) {
    console.error("Error: --scale must be 1, 2, or 3");
    process.exit(1);
  }

  try {
    await access(opts.input);
  } catch {
    console.error(`Error: Input file not found: ${opts.input}`);
    process.exit(1);
  }

  await mkdir(dirname(resolve(opts.output)), { recursive: true });

  console.log(`Exporting Excalidraw diagram...`);
  console.log(`  Input:  ${opts.input}`);
  console.log(`  Output: ${opts.output}`);
  console.log(
    `  Format: ${opts.format.toUpperCase()}, Scale: ${opts.scale}x${opts.darkMode ? ", Dark mode" : ""}`
  );

  try {
    await exportWithPlaywright(opts);
    console.log(`\nExported: ${opts.output}`);
  } catch (error) {
    console.error(
      "Export failed:",
      error instanceof Error ? error.message : error
    );
    console.error(
      "\nFallback: open the .excalidraw file in excalidraw.com and export manually."
    );
    process.exit(1);
  }
}

main();
