import React, { useRef, useState, useCallback, lazy, Suspense } from 'react';
import { useStore } from './store/useStore';
import Toolbar from './components/Toolbar';
import StatusBar from './components/StatusBar';
import ActivationModal from './components/ActivationModal';
import './App.css';

const PythonEditor = lazy(() => import('./components/PythonEditor'));
const BlockEditor = lazy(() => import('./components/BlockEditor'));
const CEditor = lazy(() => import('./components/CEditor'));
const Terminal = lazy(() => import('./components/Terminal'));
const FileExplorer = lazy(() => import('./components/FileExplorer'));
const AIChatPanel = lazy(() => import('./components/AIChatPanel'));

/**
 * Generic resize hook — tracks mouse drag on a handle and updates a size value.
 * `direction`: 'horizontal' drags left/right, 'vertical' drags up/down.
 * `reverse`: if true the panel is on the right/bottom side so delta is inverted.
 */
function useResize(
  direction: 'horizontal' | 'vertical',
  initialSize: number,
  minSize: number,
  maxSize: number,
  reverse = false,
) {
  const [size, setSize] = useState(initialSize);
  const dragging = useRef(false);
  const startPos = useRef(0);
  const startSize = useRef(initialSize);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
      startSize.current = size;
      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const pos = direction === 'horizontal' ? ev.clientX : ev.clientY;
        const delta = reverse ? startPos.current - pos : pos - startPos.current;
        const newSize = Math.min(maxSize, Math.max(minSize, startSize.current + delta));
        setSize(newSize);
      };
      const onMouseUp = () => {
        dragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [direction, reverse, size, minSize, maxSize],
  );

  return { size, onMouseDown };
}

const App: React.FC = () => {
  const { editorMode, darkMode, showFileExplorer, showTerminal, showAIChat } = useStore();

  // Panel sizes (pixels)
  const explorer = useResize('horizontal', 220, 140, 400);
  const terminal = useResize('vertical', 200, 80, 600, true);
  const aiPanel = useResize('horizontal', 380, 260, 700, true);
  const aiPanelWidth = showAIChat ? aiPanel.size : 0;

  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      <Toolbar />
      <div className="main-content">
        {/* File Explorer */}
        {showFileExplorer && (
          <>
            <div className="file-explorer-wrapper" style={{ width: explorer.size }}>
              <Suspense fallback={null}>
                <FileExplorer />
              </Suspense>
            </div>
            <div className="resize-handle resize-handle-h" onMouseDown={explorer.onMouseDown} />
          </>
        )}

        {/* Editor + Terminal */}
        <div className="editor-area">
          <div className="editor-container">
            <Suspense fallback={null}>
              {editorMode === 'python' ? (
                <PythonEditor />
              ) : editorMode === 'blocks' ? (
                <BlockEditor />
              ) : editorMode === 'c' ? (
                <CEditor />
              ) : (
                <PythonEditor />
              )}
            </Suspense>
          </div>
          {showTerminal && (
            <>
              <div className="resize-handle resize-handle-v" onMouseDown={terminal.onMouseDown} />
              <div className="terminal-wrapper" style={{ height: terminal.size }}>
                <Suspense fallback={null}>
                  <Terminal />
                </Suspense>
              </div>
            </>
          )}
        </div>

        {/* AI Chat Panel */}
        {showAIChat && <div className="resize-handle resize-handle-h" onMouseDown={aiPanel.onMouseDown} />}
        <div className={`ai-chat-wrapper ${showAIChat ? 'open' : 'closed'}`} style={{ width: aiPanelWidth }}>
          {showAIChat ? (
            <Suspense fallback={null}>
              <AIChatPanel />
            </Suspense>
          ) : null}
        </div>
      </div>
      <StatusBar />
      <ActivationModal />
    </div>
  );
};

export default App;
