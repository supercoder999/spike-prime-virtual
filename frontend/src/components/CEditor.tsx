import React, { useRef, useCallback } from 'react';
import Editor, { OnChange, OnMount } from '@monaco-editor/react';
import { useStore } from '../store/useStore';
import { fetchCApiSymbols, CApiResponse } from '../services/cApiService';

const C_KEYWORD_SUGGESTIONS = [
  'int',
  'void',
  'if',
  'else',
  'for',
  'while',
  'return',
  'static',
  'const',
  'typedef',
  'struct',
  'enum',
];

const C_SPIKE_SNIPPETS = [
  {
    label: 'main_user',
    detail: 'code_pybricks_user_main scaffold',
    insertText: [
      'int code_pybricks_user_main(void) {',
      '    ${1:// your code}',
      '    return 0;',
      '}',
    ].join('\n'),
  },
  {
    label: 'beep',
    detail: 'Hub beep',
    insertText: [
      'hub_speaker_set_volume(100);',
      'hub_speaker_play_tone(${1:NOTE_C5}, ${2:250});',
      'dly_tsk(${3:300000});',
    ].join('\n'),
  },
  {
    label: 'motor_setup',
    detail: 'Get and setup one motor',
    insertText: [
      'pup_motor_t *motor = pup_motor_get_device(${1:PBIO_PORT_ID_A});',
      'if (motor != NULL) {',
      '    pup_motor_setup(motor, PUP_DIRECTION_CLOCKWISE, false);',
      '}',
    ].join('\n'),
  },
  {
    label: 'motor_speed',
    detail: 'Set motor speed',
    insertText: [
      'pup_motor_set_speed(${1:motor}, ${2:300});',
      'dly_tsk(${3:500000});',
      'pup_motor_stop(${1:motor});',
    ].join('\n'),
  },
];

const CEditor: React.FC = () => {
  const { cCode, setCCode, darkMode, currentProgramId, updateProgram, addTerminalLine } = useStore();
  const symbolsRef = useRef<CApiResponse | null>(null);

  const loadSymbols = useCallback(async () => {
    if (symbolsRef.current) return symbolsRef.current;

    try {
      const symbols = await fetchCApiSymbols();
      symbolsRef.current = symbols;
      addTerminalLine({
        text: `Loaded C API symbols from ${symbols.include_dir} (${symbols.headers_scanned} headers).`,
        type: 'info',
        timestamp: Date.now(),
      });
      return symbols;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addTerminalLine({
        text: `C API autocomplete unavailable: ${message}`,
        type: 'error',
        timestamp: Date.now(),
      });
      return null;
    }
  }, [addTerminalLine]);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    monaco.languages.registerCompletionItemProvider('c', {
      triggerCharacters: ['.', '>', '#'],
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const toSuggestion = (
          item: { name: string; signature: string; header: string },
          kind: number
        ) => ({
          label: item.name,
          kind,
          detail: item.signature,
          documentation: `Header: ${item.header}`,
          insertText: item.name,
          range,
        });

        const keywordSuggestions = C_KEYWORD_SUGGESTIONS.map((keyword) => ({
          label: keyword,
          kind: monaco.languages.CompletionItemKind.Keyword,
          detail: 'C keyword',
          insertText: keyword,
          range,
        }));

        const snippetSuggestions = C_SPIKE_SNIPPETS.map((snippet) => ({
          label: snippet.label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail: snippet.detail,
          insertText: snippet.insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'SPIKE C helper snippet',
          range,
        }));

        const symbols = symbolsRef.current;
        const apiSuggestions = symbols
          ? [
              ...symbols.functions.map((f) =>
                toSuggestion(f, monaco.languages.CompletionItemKind.Function)
              ),
              ...symbols.macros.map((m) =>
                toSuggestion(m, monaco.languages.CompletionItemKind.Constant)
              ),
              ...symbols.types.map((t) =>
                toSuggestion(t, monaco.languages.CompletionItemKind.Struct)
              ),
            ]
          : [];

        const suggestions = [
          ...snippetSuggestions,
          ...keywordSuggestions,
          ...apiSuggestions,
        ];

        return { suggestions };
      },
    });

    loadSymbols();

    editor.addAction({
      id: 'save-c-program',
      label: 'Save Program',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => {
        document.querySelector<HTMLButtonElement>('[title*="Save"]')?.click();
      },
    });
  }, [loadSymbols]);

  const handleChange: OnChange = useCallback(
    (value) => {
      if (value !== undefined) {
        setCCode(value);
        if (currentProgramId) {
          updateProgram(currentProgramId, { cCode: value });
        }
      }
    },
    [setCCode, currentProgramId, updateProgram]
  );

  return (
    <div className="python-editor">
      <Editor
        height="100%"
        defaultLanguage="c"
        value={cCode}
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
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true, indentation: true },
          padding: { top: 8 },
        }}
      />
    </div>
  );
};

export default CEditor;
