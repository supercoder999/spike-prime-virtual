import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { registerSimBlocks, registerSimGenerators } from '../blockly/simBlocks';

export function convertBlocklyXmlToSimJs(xmlText: string): { code: string; error?: string } {
  try {
    registerSimBlocks();
    registerSimGenerators();

    const workspace = new Blockly.Workspace();
    try {
      const xmlDom = Blockly.utils.xml.textToDom(xmlText);
      Blockly.Xml.domToWorkspace(xmlDom, workspace);

      // Only generate code from sim_when_run blocks (ignore disconnected blocks)
      const topBlocks = workspace.getTopBlocks(true);
      const whenRunBlocks = topBlocks.filter((b: Blockly.Block) => b.type === 'sim_when_run');
      const code = whenRunBlocks.map((b: Blockly.Block) => javascriptGenerator.blockToCode(b)).join('\n').trim();
      return { code };
    } finally {
      workspace.dispose();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { code: '', error: message };
  }
}
