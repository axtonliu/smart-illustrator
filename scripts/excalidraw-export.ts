#!/usr/bin/env npx -y bun

/**
 * Excalidraw Export Script
 *
 * Export .excalidraw files to PNG or SVG using Playwright via excalidraw-brute-export-cli.
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

import { spawn } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
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

async function checkDependency(): Promise<boolean> {
  const cliPath = resolve(SCRIPTS_DIR, "node_modules/.bin/excalidraw-brute-export-cli");
  try {
    await access(cliPath);
    return true;
  } catch {
    return false;
  }
}

async function exportExcalidraw(opts: ExportOptions): Promise<void> {
  const cliPath = resolve(SCRIPTS_DIR, "node_modules/.bin/excalidraw-brute-export-cli");

  // Resolve to absolute paths so cwd:SCRIPTS_DIR doesn't break relative paths
  const absInput = resolve(opts.input);
  const absOutput = resolve(opts.output);

  const args = [
    "-i",
    absInput,
    "-o",
    absOutput,
    "-f",
    opts.format,
    "-s",
    opts.scale.toString(),
    "--timeout",
    opts.timeout.toString(),
  ];

  if (opts.darkMode) {
    args.push("-d", "true");
  }
  if (opts.background) {
    args.push("-b", "true");
  }
  if (opts.embedScene) {
    args.push("-e", "true");
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(cliPath, args, {
      stdio: "inherit",
      cwd: SCRIPTS_DIR,
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`excalidraw-brute-export-cli exited with code ${code}`));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to run export CLI: ${err.message}`));
    });
  });
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
  -b, --background       Include background (default: transparent)
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
    background: false,
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
      case "-e":
      case "--embed-scene":
        opts.embedScene = true;
        break;
      case "--timeout":
        opts.timeout = parseInt(args[++i], 10);
        break;
    }
  }

  // Validate input
  if (!opts.input) {
    console.error("Error: --input is required");
    process.exit(1);
  }
  if (!opts.output) {
    // Auto-generate output name from input
    const base = opts.input.replace(/\.excalidraw$/, "").replace(/\.md$/, "");
    opts.output = `${base}.${opts.format}`;
  }

  // Auto-detect format from output extension
  if (extname(opts.output) === ".svg") {
    opts.format = "svg";
  }

  // Validate scale
  if (![1, 2, 3].includes(opts.scale)) {
    console.error('Error: --scale must be 1, 2, or 3');
    process.exit(1);
  }

  // Check dependency
  const hasCli = await checkDependency();
  if (!hasCli) {
    console.error("Error: excalidraw-brute-export-cli is not installed.");
    console.error("");
    console.error("Install it with:");
    console.error("  cd smart-illustrator/scripts && npm install");
    console.error("  npx playwright install firefox");
    console.error("");
    console.error("Fallback: open the .excalidraw file in excalidraw.com and export manually.");
    process.exit(1);
  }

  // Check input file
  try {
    await access(opts.input);
  } catch {
    console.error(`Error: Input file not found: ${opts.input}`);
    process.exit(1);
  }

  // Ensure output directory exists
  await mkdir(dirname(resolve(opts.output)), { recursive: true });

  console.log(`Exporting Excalidraw diagram...`);
  console.log(`  Input:  ${opts.input}`);
  console.log(`  Output: ${opts.output}`);
  console.log(`  Format: ${opts.format.toUpperCase()}, Scale: ${opts.scale}x${opts.darkMode ? ", Dark mode" : ""}`);

  try {
    await exportExcalidraw(opts);
    console.log(`\nExported: ${opts.output}`);
  } catch (error) {
    console.error("Export failed:", error instanceof Error ? error.message : error);
    console.error("\nFallback: open the .excalidraw file in excalidraw.com and export manually.");
    process.exit(1);
  }
}

main();
