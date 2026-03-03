import React, { useRef, useCallback } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import { useStore, Program } from '../store/useStore';
import { FREE_LINE_LIMIT, countLines } from '../services/activationLimit';

// Pybricks MicroPython autocomplete suggestions
const PYBRICKS_COMPLETIONS = [
  // Hubs
  { label: 'PrimeHub', kind: 'Class', detail: 'SPIKE Prime Hub', insertText: 'PrimeHub()' },
  // Devices
  { label: 'Motor', kind: 'Class', detail: 'Motor device', insertText: 'Motor(${1:Port.A})' },
  { label: 'ColorSensor', kind: 'Class', detail: 'Color Sensor', insertText: 'ColorSensor(${1:Port.A})' },
  { label: 'UltrasonicSensor', kind: 'Class', detail: 'Ultrasonic Distance Sensor', insertText: 'UltrasonicSensor(${1:Port.A})' },
  { label: 'ForceSensor', kind: 'Class', detail: 'Force Sensor', insertText: 'ForceSensor(${1:Port.A})' },
  // DriveBase
  { label: 'DriveBase', kind: 'Class', detail: 'Two-motor drive base', insertText: 'DriveBase(${1:left_motor}, ${2:right_motor}, ${3:wheel_diameter}, ${4:axle_track})' },
  // Parameters
  { label: 'Port.A', kind: 'Property', detail: 'Port A' },
  { label: 'Port.B', kind: 'Property', detail: 'Port B' },
  { label: 'Port.C', kind: 'Property', detail: 'Port C' },
  { label: 'Port.D', kind: 'Property', detail: 'Port D' },
  { label: 'Port.E', kind: 'Property', detail: 'Port E' },
  { label: 'Port.F', kind: 'Property', detail: 'Port F' },
  { label: 'Color.RED', kind: 'Property', detail: 'Red color' },
  { label: 'Color.GREEN', kind: 'Property', detail: 'Green color' },
  { label: 'Color.BLUE', kind: 'Property', detail: 'Blue color' },
  { label: 'Color.YELLOW', kind: 'Property', detail: 'Yellow color' },
  { label: 'Color.WHITE', kind: 'Property', detail: 'White color' },
  { label: 'Color.NONE', kind: 'Property', detail: 'No color / off' },
  { label: 'Direction.CLOCKWISE', kind: 'Property', detail: 'Clockwise direction' },
  { label: 'Direction.COUNTERCLOCKWISE', kind: 'Property', detail: 'Counter-clockwise' },
  { label: 'Button.LEFT', kind: 'Property', detail: 'Left button' },
  { label: 'Button.RIGHT', kind: 'Property', detail: 'Right button' },
  { label: 'Stop.HOLD', kind: 'Property', detail: 'Hold position after stop' },
  { label: 'Stop.BRAKE', kind: 'Property', detail: 'Brake after stop' },
  { label: 'Stop.COAST', kind: 'Property', detail: 'Coast after stop' },
  // Tools
  { label: 'wait', kind: 'Function', detail: 'Wait for given milliseconds', insertText: 'wait(${1:1000})' },
  { label: 'StopWatch', kind: 'Class', detail: 'Timer', insertText: 'StopWatch()' },
  // Common methods
  { label: '.run(', kind: 'Method', detail: 'Run motor at speed (deg/s)', insertText: '.run(${1:500})' },
  { label: '.run_time(', kind: 'Method', detail: 'Run motor for time', insertText: '.run_time(${1:500}, ${2:1000})' },
  { label: '.run_angle(', kind: 'Method', detail: 'Run motor for angle', insertText: '.run_angle(${1:500}, ${2:360})' },
  { label: '.run_target(', kind: 'Method', detail: 'Run to target angle', insertText: '.run_target(${1:500}, ${2:0})' },
  { label: '.stop()', kind: 'Method', detail: 'Stop motor' },
  { label: '.angle()', kind: 'Method', detail: 'Get motor angle' },
  { label: '.speed()', kind: 'Method', detail: 'Get motor speed' },
  { label: '.reset_angle(', kind: 'Method', detail: 'Reset angle to 0', insertText: '.reset_angle(${1:0})' },
  { label: '.straight(', kind: 'Method', detail: 'Drive straight', insertText: '.straight(${1:200})' },
  { label: '.turn(', kind: 'Method', detail: 'Turn in place', insertText: '.turn(${1:90})' },
  { label: '.drive(', kind: 'Method', detail: 'Drive with speed & turn rate', insertText: '.drive(${1:200}, ${2:0})' },
  { label: '.color()', kind: 'Method', detail: 'Get detected color' },
  { label: '.reflection()', kind: 'Method', detail: 'Get reflected light %' },
  { label: '.distance()', kind: 'Method', detail: 'Get measured distance' },
  { label: '.force()', kind: 'Method', detail: 'Get measured force (N)' },
  { label: '.pressed()', kind: 'Method', detail: 'Check if pressed' },
];

const PythonEditor: React.FC = () => {
  const { pythonCode, setPythonCode, darkMode, currentProgramId, updateProgram, isActivated, activationExpiry, setActivated, setShowActivationModal } = useStore();
  const editorRef = useRef<any>(null);
  const lastPasteTimeRef = useRef<number>(0);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Detect paste events — auto-create a new file if no current program
    editor.onDidPaste(() => {
      const now = Date.now();
      // Debounce: ignore if pasted within 500ms
      if (now - lastPasteTimeRef.current < 500) return;
      lastPasteTimeRef.current = now;

      const state = useStore.getState();
      const pastedCode = editor.getValue();

      // Only auto-create if there's no current program and the paste is non-trivial
      if (!state.currentProgramId && pastedCode.trim().length > 20) {
        const ts = new Date();
        const name = `program_${ts.getFullYear()}-${(ts.getMonth()+1).toString().padStart(2,'0')}-${ts.getDate().toString().padStart(2,'0')}_${ts.getHours().toString().padStart(2,'0')}-${ts.getMinutes().toString().padStart(2,'0')}-${ts.getSeconds().toString().padStart(2,'0')}`;
        const program: Program = {
          id: crypto.randomUUID(),
          name,
          pythonCode: pastedCode,
          blocklyXml: '',
          mode: state.editorMode,
          createdAt: now,
          updatedAt: now,
        };
        state.addProgram(program);
        state.setCurrentProgram(program.id);
      }
    });

    // Register Pybricks completion provider
    monaco.languages.registerCompletionItemProvider('python', {
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions = PYBRICKS_COMPLETIONS.map((item) => ({
          label: item.label,
          kind: monaco.languages.CompletionItemKind[
            item.kind as keyof typeof monaco.languages.CompletionItemKind
          ] || monaco.languages.CompletionItemKind.Text,
          detail: item.detail,
          insertText: item.insertText || item.label,
          insertTextRules: item.insertText?.includes('$')
            ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
            : undefined,
          range,
        }));

        return { suggestions };
      },
    });

    // Add keyboard shortcuts
    editor.addAction({
      id: 'run-program',
      label: 'Run Program',
      keybindings: [monaco.KeyCode.F5],
      run: () => {
        document.querySelector<HTMLButtonElement>('.run-btn')?.click();
      },
    });

    editor.addAction({
      id: 'stop-program',
      label: 'Stop Program',
      keybindings: [monaco.KeyCode.F6],
      run: () => {
        document.querySelector<HTMLButtonElement>('.stop-btn')?.click();
      },
    });

    editor.addAction({
      id: 'save-program',
      label: 'Save Program',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => {
        // Prevent browser save dialog
        document.querySelector<HTMLButtonElement>('[title*="Save"]')?.click();
      },
    });
  }, []);

  const handleChange: OnChange = useCallback(
    (value) => {
      if (value !== undefined) {
        const isExpired = activationExpiry ? new Date(activationExpiry + 'T23:59:59') < new Date() : false;
        if ((!isActivated || isExpired) && countLines(value) > FREE_LINE_LIMIT) {
          if (isExpired) setActivated(false);
          setShowActivationModal(true);
          return;
        }
        setPythonCode(value);
        // Also sync back to the current program in the file list
        if (currentProgramId) {
          updateProgram(currentProgramId, { pythonCode: value });
        }
      }
    },
    [setPythonCode, currentProgramId, updateProgram, isActivated, activationExpiry, setActivated, setShowActivationModal]
  );

  return (
    <div className="python-editor">
      <Editor
        height="100%"
        defaultLanguage="python"
        value={pythonCode}
        onChange={handleChange}
        onMount={handleEditorMount}
        theme={darkMode ? 'vs-dark' : 'vs-light'}
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          insertSpaces: true,
          wordWrap: 'on',
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true, indentation: true },
          padding: { top: 8 },
        }}
      />
    </div>
  );
};

export default PythonEditor;
