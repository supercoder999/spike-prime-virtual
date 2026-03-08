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
 * Bundle a main Python program by inlining all `import <module>` statements
 * that match other programs in the file explorer.
 *
 * Returns the bundled source code and a list of resolved module names.
 */
export function bundlePythonPrograms(
  mainCode: string,
  allPrograms: Program[],
  currentProgramId: string | null,
): { bundled: string; resolvedModules: string[] } {
  const moduleMap = buildModuleMap(
    allPrograms.filter((p) => p.id !== currentProgramId),
  );

  if (moduleMap.size === 0) {
    return { bundled: mainCode, resolvedModules: [] };
  }

  const resolvedModules: string[] = [];
  const alreadyInlined = new Set<string>();

  // Process line by line
  const lines = mainCode.split('\n');
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
  };
}
