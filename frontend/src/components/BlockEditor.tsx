import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import * as Blockly from 'blockly';
import {
  registerSimBlocks,
  registerSimGenerators,
  simToolboxCategories,
} from '../blockly/simBlocks';
import { useStore } from '../store/useStore';

const ideSimTheme = Blockly.Theme.defineTheme('ideSimTheme', {
  name: 'ideSimTheme',
  base: Blockly.Themes.Zelos,
  blockStyles: {
    event_blocks: {
      colourPrimary: '#ffbf00',
      colourSecondary: '#e6a800',
      colourTertiary: '#cc9400',
    },
    motion_blocks: {
      colourPrimary: '#4c97ff',
      colourSecondary: '#3373cc',
      colourTertiary: '#285a9e',
    },
    sensing_blocks: {
      colourPrimary: '#5cb1d6',
      colourSecondary: '#3d8fb1',
      colourTertiary: '#2f708b',
    },
    control_blocks: {
      colourPrimary: '#ffab19',
      colourSecondary: '#d98b00',
      colourTertiary: '#b36f00',
    },
    operators_blocks: {
      colourPrimary: '#59c059',
      colourSecondary: '#389438',
      colourTertiary: '#2d762d',
    },
  },
  categoryStyles: {
    event_category: { colour: '#ffbf00' },
    motion_category: { colour: '#4c97ff' },
    sensing_category: { colour: '#5cb1d6' },
    control_category: { colour: '#ffab19' },
    operators_category: { colour: '#59c059' },
    variable_category: { colour: '#ff8c1a' },
  },
  componentStyles: {
    workspaceBackgroundColour: '#141822',
    toolboxBackgroundColour: '#1a2030',
    toolboxForegroundColour: '#e8eefc',
    flyoutBackgroundColour: '#222a3c',
    flyoutForegroundColour: '#e8eefc',
    flyoutOpacity: 1,
    scrollbarColour: '#5d6b8a',
    insertionMarkerColour: '#ffffff',
    insertionMarkerOpacity: 0.35,
    cursorColour: '#dbe6ff',
  },
});

const BlockEditor: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [initError, setInitError] = useState<string>('');
  const { setBlocklyXml, darkMode } = useStore();
  const scratchToolbox = useMemo(
    () => ({
      kind: 'categoryToolbox',
      contents: simToolboxCategories,
    }),
    []
  );

  // Save Blockly XML state
  const updateCode = useCallback(() => {
    if (workspaceRef.current) {
      try {
        const xml = Blockly.Xml.workspaceToDom(workspaceRef.current);
        const xmlText = Blockly.Xml.domToText(xml);
        setBlocklyXml(xmlText);
      } catch (err) {
        console.error('Error generating code:', err);
      }
    }
  }, [setBlocklyXml]);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      setInitError('');

      registerSimBlocks();
      registerSimGenerators();

      const workspace = Blockly.inject(containerRef.current, {
        toolbox: scratchToolbox as any,
        grid: {
          spacing: 20,
          length: 3,
          colour: darkMode ? '#444' : '#ccc',
          snap: true,
        },
        zoom: {
          controls: true,
          wheel: true,
          startScale: 0.85,
          maxScale: 1.4,
          minScale: 0.4,
          scaleSpeed: 1.2,
        },
        trashcan: true,
        move: {
          scrollbars: true,
          drag: true,
          wheel: true,
        },
        theme: ideSimTheme,
        renderer: 'zelos',
        sounds: false,
      });

      workspaceRef.current = workspace;

      const existingXml = useStore.getState().blocklyXml;
      if (existingXml) {
        try {
          const xml = Blockly.utils.xml.textToDom(existingXml);
          Blockly.Xml.domToWorkspace(xml, workspace);
        } catch {
          addDefaultBlocks(workspace);
        }
      } else {
        addDefaultBlocks(workspace);
      }

      workspace.addChangeListener((event: Blockly.Events.Abstract) => {
        if (event.type !== Blockly.Events.UI) {
          updateCode();
        }
      });

      setTimeout(updateCode, 100);
    } catch (error) {
      console.error('Failed to initialize Blocks editor:', error);
      setInitError('Failed to load Scratch Blocks. Please refresh and try again.');
    }

    return () => {
      if (workspaceRef.current) {
        workspaceRef.current.dispose();
      }
      workspaceRef.current = null;
    };
  }, [darkMode, scratchToolbox]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (workspaceRef.current) {
        Blockly.svgResize(workspaceRef.current);
      }
    };

    window.addEventListener('resize', handleResize);
    // Also resize after a short delay to handle layout changes
    const timer = setTimeout(handleResize, 200);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="block-editor">
      {initError ? (
        <div style={{ padding: '12px', color: 'var(--text-primary)' }}>{initError}</div>
      ) : null}
      <div ref={containerRef} className="blockly-container" />
    </div>
  );
};

function addDefaultBlocks(workspace: Blockly.WorkspaceSvg) {
  const xml = `
    <xml xmlns="https://developers.google.com/blockly/xml">
      <block type="sim_when_run" x="18" y="18">
        <statement name="DO">
          <block type="controls_repeat_ext">
            <value name="TIMES">
              <shadow type="math_number">
                <field name="NUM">4</field>
              </shadow>
            </value>
            <statement name="DO">
              <block type="sim_drive_for_seconds">
                <value name="THROTTLE">
                  <shadow type="math_number"><field name="NUM">80</field></shadow>
                </value>
                <value name="STEERING">
                  <shadow type="math_number"><field name="NUM">0</field></shadow>
                </value>
                <value name="SECONDS">
                  <shadow type="math_number"><field name="NUM">0.7</field></shadow>
                </value>
                <next>
                  <block type="sim_drive_for_seconds">
                    <value name="THROTTLE">
                      <shadow type="math_number"><field name="NUM">70</field></shadow>
                    </value>
                    <value name="STEERING">
                      <shadow type="math_number"><field name="NUM">55</field></shadow>
                    </value>
                    <value name="SECONDS">
                      <shadow type="math_number"><field name="NUM">0.5</field></shadow>
                    </value>
                  </block>
                </next>
              </block>
            </statement>
          </block>
        </statement>
      </block>
    </xml>
  `;

  try {
    const dom = Blockly.utils.xml.textToDom(xml);
    Blockly.Xml.domToWorkspace(dom, workspace);
  } catch (err) {
    console.error('Error adding default blocks:', err);
  }
}

export default BlockEditor;
