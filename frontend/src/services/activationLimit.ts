/**
 * Shared constants and helpers for the free-tier activation limit.
 */

/** Maximum lines (Python/C) or blocks (Blockly) on the free tier. */
export const FREE_LINE_LIMIT = 30;

/** Count lines in a code string. */
export function countLines(code: string): number {
  return code.split('\n').length;
}

/** Count <block type="..."> occurrences in Blockly XML. */
export function countBlocks(blocklyXml: string): number {
  return (blocklyXml.match(/<block\s+type="/g) || []).length;
}
