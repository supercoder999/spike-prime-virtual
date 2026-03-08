/**
 * Python multi-file bundler for Spike Prime hub.
 *
 * When the user has multiple Python files (e.g. FLL challenge with main.py + r1m.py, r2m.py, ...),
 * the hub can only receive one program via REPL paste mode. This bundler resolves
 * `import <module>` statements by inlining the module code from other programs
 * in the file explorer.
 *
 * Example:
 *   main.py: `import r1m`  →  replaced with the contents of r1m.py
 *   main.py: `if selected == "1": import r1m`  →  inlined under the if block
 */

import { Program } from '../store/useStore';

/**
 * Build a lookup map from program name → python code.
 * Strips .py extension from names to match bare `import name` statements.
 */
function buildModuleMap(programs: Program[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of programs) {
    if (p.mode !== 'python' || !p.pythonCode.trim()) continue;
    // Store under both raw name and name without .py
    const baseName = p.name.replace(/\.py$/i, '');
    map.set(baseName, p.pythonCode);
    map.set(p.name, p.pythonCode);
  }
  return map;
}

/**
 * Pure-Python polyfill for hub_menu() (added in Pybricks v3.3).
 * Uses the hub's left/right/center buttons and 5×5 LED display.
 * Wrapped in try/except so the native version is used when available.
 */
const HUB_MENU_POLYFILL = `
try:
    from pybricks.tools import hub_menu
except ImportError:
    def hub_menu(*options):
        from pybricks.hubs import PrimeHub
        from pybricks.parameters import Button
        from pybricks.tools import wait
        _h = PrimeHub()
        _i = 0
        while True:
            _h.display.char(str(options[_i]))
            _p = _h.buttons.pressed()
            if Button.LEFT in _p:
                _i = (_i - 1) % len(options)
                while Button.LEFT in _h.buttons.pressed():
                    wait(10)
                wait(150)
            elif Button.RIGHT in _p:
                _i = (_i + 1) % len(options)
                while Button.RIGHT in _h.buttons.pressed():
                    wait(10)
                wait(150)
            elif Button.CENTER in _p:
                while Button.CENTER in _h.buttons.pressed():
                    wait(10)
                return options[_i]
            wait(50)
`.trim();

/**
 * Check whether code uses hub_menu and inject a polyfill if needed.
 * Handles these import patterns:
 *   from pybricks.tools import hub_menu
 *   from pybricks.tools import wait, hub_menu
 *   from pybricks.tools import hub_menu, wait
 *
 * The polyfill tries the native import first; falls back to a pure-Python
 * implementation so the program works on any Pybricks firmware version.
 */
function injectHubMenuPolyfill(code: string): { code: string; injected: boolean } {
  // Quick check — skip processing if hub_menu isn't mentioned at all
  if (!code.includes('hub_menu')) {
    return { code, injected: false };
  }

  const lines = code.split('\n');
  const outputLines: string[] = [];
  let injected = false;

  for (const line of lines) {
    const trimmed = line.trimStart();
    const indent = line.substring(0, line.length - trimmed.length);

    // Match: from pybricks.tools import ...hub_menu...
    const match = trimmed.match(
      /^from\s+pybricks\.tools\s+import\s+(.+)$/,
    );
    if (match && match[1].includes('hub_menu')) {
      // Parse imported names
      const names = match[1].split(',').map((n) => n.trim());
      const otherNames = names.filter((n) => n !== 'hub_menu');

      // Keep any non-hub_menu imports on their own line
      if (otherNames.length > 0) {
        outputLines.push(
          `${indent}from pybricks.tools import ${otherNames.join(', ')}`,
        );
      }

      // Inject polyfill (only once)
      if (!injected) {
        // Add polyfill at current indentation level
        for (const pLine of HUB_MENU_POLYFILL.split('\n')) {
          outputLines.push(indent + pLine);
        }
        injected = true;
      }
      continue;
    }

    outputLines.push(line);
  }

  return { code: outputLines.join('\n'), injected };
}

/**
 * Bundle a main Python program by inlining all `import <module>` statements
 * that match other programs in the file explorer.
 *
 * Also injects a hub_menu polyfill when the code uses hub_menu, so the
 * program works on any Pybricks firmware version (including pre-3.3).
 *
 * Returns the bundled source code and a list of resolved module names.
 */
export function bundlePythonPrograms(
  mainCode: string,
  allPrograms: Program[],
  currentProgramId: string | null,
): { bundled: string; resolvedModules: string[]; hubMenuInjected: boolean } {
  // Step 1: inject hub_menu polyfill if needed
  const polyfill = injectHubMenuPolyfill(mainCode);
  let code = polyfill.code;

  const moduleMap = buildModuleMap(
    allPrograms.filter((p) => p.id !== currentProgramId),
  );

  if (moduleMap.size === 0) {
    return { bundled: code, resolvedModules: [], hubMenuInjected: polyfill.injected };
  }

  const resolvedModules: string[] = [];
  const alreadyInlined = new Set<string>();

  // Step 2: Process line by line — resolve local module imports
  const lines = code.split('\n');
  const outputLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trimStart();
    const indent = line.substring(0, line.length - trimmed.length);

    // Match bare `import <module>` (with optional leading whitespace)
    const bareImport = trimmed.match(/^import\s+(\w+)\s*$/);
    if (bareImport) {
      const moduleName = bareImport[1];
      const moduleCode = moduleMap.get(moduleName);
      if (moduleCode && !alreadyInlined.has(moduleName)) {
        alreadyInlined.add(moduleName);
        resolvedModules.push(moduleName);
        // Inline the module code with the same indentation
        const moduleLines = moduleCode.split('\n');
        // Add a comment marker
        outputLines.push(`${indent}# --- inlined from ${moduleName}.py ---`);
        for (const mLine of moduleLines) {
          outputLines.push(indent + mLine);
        }
        outputLines.push(`${indent}# --- end ${moduleName}.py ---`);
        continue;
      }
    }

    // Match `from <module> import ...` pattern
    const fromImport = trimmed.match(/^from\s+(\w+)\s+import\s+/);
    if (fromImport) {
      const moduleName = fromImport[1];
      // Only inline local modules, not pybricks/standard library
      if (moduleMap.has(moduleName) && !moduleName.startsWith('pybricks')) {
        const moduleCode = moduleMap.get(moduleName);
        if (moduleCode && !alreadyInlined.has(moduleName)) {
          alreadyInlined.add(moduleName);
          resolvedModules.push(moduleName);
          outputLines.push(`${indent}# --- inlined from ${moduleName}.py ---`);
          const moduleLines = moduleCode.split('\n');
          for (const mLine of moduleLines) {
            outputLines.push(indent + mLine);
          }
          outputLines.push(`${indent}# --- end ${moduleName}.py ---`);
          continue;
        }
      }
    }

    // Not a local import — keep the line as-is
    outputLines.push(line);
  }

  return {
    bundled: outputLines.join('\n'),
    resolvedModules,
    hubMenuInjected: polyfill.injected,
  };
}
