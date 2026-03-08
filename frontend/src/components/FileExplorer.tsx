import React, { useState, useRef, useEffect } from 'react';
import { useStore, Program, EditorMode } from '../store/useStore';
import { File, FilePlus, Trash2, FolderOpen, Pencil, Upload } from 'lucide-react';
import {
  BLOCK_EXAMPLES,
  DEFAULT_BLOCK_EXAMPLE_ID,
  DEFAULT_PYTHON_EXAMPLE_ID,
  PYTHON_EXAMPLES,
} from '../services/editorExamples';

const FileExplorer: React.FC = () => {
  const {
    programs,
    currentProgramId,
    setCurrentProgram,
    deleteProgram,
    addProgram,
    setPythonCode,
    setBlocklyXml,
    setCCode,
    setEditorMode,
    showFileExplorer,
    editorMode,
    pythonCode,
    blocklyXml,
    cCode,
    renameProgram,
    addTerminalLine,
  } = useStore();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [selectedPythonExampleId, setSelectedPythonExampleId] = useState(DEFAULT_PYTHON_EXAMPLE_ID);
  const [selectedBlockExampleId, setSelectedBlockExampleId] = useState(DEFAULT_BLOCK_EXAMPLE_ID);
  const [isDragOver, setIsDragOver] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  if (!showFileExplorer) return null;

  const detectMode = (filename: string): EditorMode => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (ext === 'c' || ext === 'h') return 'c';
    if (ext === 'xml' || ext === 'blk') return 'blocks';
    return 'python';
  };

  const loadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const supported = fileArray.filter((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      return ['py', 'c', 'h', 'xml', 'blk', 'txt'].includes(ext);
    });

    if (supported.length === 0) {
      addTerminalLine({
        text: 'No supported files found. Supported: .py, .c, .h, .xml, .blk, .txt',
        type: 'error',
        timestamp: Date.now(),
      });
      return;
    }

    let lastId = '';
    for (const file of supported) {
      const content = await file.text();
      const name = file.name.replace(/\.[^.]+$/, '');
      const mode = detectMode(file.name);
      const program: Program = {
        id: crypto.randomUUID(),
        name,
        pythonCode: mode === 'python' ? content : '',
        blocklyXml: mode === 'blocks' ? content : '',
        cCode: mode === 'c' ? content : '',
        mode,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      addProgram(program);
      lastId = program.id;
    }

    // Switch to the last loaded file
    if (lastId) {
      const store = useStore.getState();
      const prog = store.programs.find((p) => p.id === lastId);
      if (prog) {
        setCurrentProgram(prog.id);
        setPythonCode(prog.pythonCode);
        setBlocklyXml(prog.blocklyXml);
        setCCode(prog.cCode || '');
        setEditorMode(prog.mode === 'c' ? 'python' : prog.mode);
      }
    }

    addTerminalLine({
      text: `Loaded ${supported.length} file${supported.length > 1 ? 's' : ''}: ${supported.map((f) => f.name).join(', ')}`,
      type: 'info',
      timestamp: Date.now(),
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      await loadFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await loadFiles(e.target.files);
      e.target.value = '';  // reset so same files can be re-selected
    }
  };

  const handleSelectProgram = (program: Program) => {
    setCurrentProgram(program.id);
    setPythonCode(program.pythonCode);
    setBlocklyXml(program.blocklyXml);
    setCCode(program.cCode || '');
    setEditorMode(program.mode === 'c' ? 'python' : program.mode);
  };

  const handleDeleteProgram = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this program?')) {
      deleteProgram(id);
    }
  };

  const handleStartRename = (e: React.MouseEvent, program: Program) => {
    e.stopPropagation();
    setRenamingId(program.id);
    setRenameValue(program.name);
  };

  const handleFinishRename = () => {
    if (renamingId && renameValue.trim()) {
      renameProgram(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishRename();
    } else if (e.key === 'Escape') {
      setRenamingId(null);
      setRenameValue('');
    }
  };

  const handleNewProgram = () => {
    const name = prompt('Program name:', `program_${programs.length + 1}`);
    if (!name) return;

    const program: Program = {
      id: crypto.randomUUID(),
      name,
      pythonCode: editorMode === 'python' ? pythonCode : '',
      blocklyXml: editorMode === 'blocks' ? blocklyXml : '',
      cCode: editorMode === 'c' ? cCode : '',
      mode: editorMode,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    addProgram(program);
    setCurrentProgram(program.id);
  };

  const handleLoadExample = () => {
    if (editorMode === 'python') {
      const example = PYTHON_EXAMPLES.find((item) => item.id === selectedPythonExampleId);
      if (!example) return;
      setPythonCode(example.code);
      if (currentProgramId) {
        useStore.getState().updateProgram(currentProgramId, {
          pythonCode: example.code,
          mode: 'python',
        });
      }
      addTerminalLine({
        text: `Loaded Python example: ${example.name}`,
        type: 'info',
        timestamp: Date.now(),
      });
      return;
    }

    if (editorMode === 'blocks') {
      const example = BLOCK_EXAMPLES.find((item) => item.id === selectedBlockExampleId);
      if (!example) return;
      setBlocklyXml(example.xml);
      if (currentProgramId) {
        useStore.getState().updateProgram(currentProgramId, {
          blocklyXml: example.xml,
          mode: 'blocks',
        });
      }
      addTerminalLine({
        text: `Loaded Blocks example: ${example.name}`,
        type: 'info',
        timestamp: Date.now(),
      });
    }
  };

  return (
    <div
      className={`file-explorer ${isDragOver ? 'file-explorer-dragover' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".py,.c,.h,.xml,.blk,.txt"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />
      <div className="file-explorer-header">
        <FolderOpen size={14} />
        <span>Programs</span>
        <button
          className="file-explorer-action"
          onClick={() => fileInputRef.current?.click()}
          title="Import files (.py, .c, .xml, .blk)"
        >
          <Upload size={14} />
        </button>
        <button
          className="file-explorer-action"
          onClick={handleNewProgram}
          title="New program"
        >
          <FilePlus size={14} />
        </button>
      </div>
      {(editorMode === 'python' || editorMode === 'blocks') && (
        <div className="file-explorer-examples">
          <select
            className="file-explorer-example-select"
            value={editorMode === 'python' ? selectedPythonExampleId : selectedBlockExampleId}
            onChange={(e) => {
              if (editorMode === 'python') {
                setSelectedPythonExampleId(e.target.value);
              } else {
                setSelectedBlockExampleId(e.target.value);
              }
            }}
            title={editorMode === 'python' ? 'Python examples' : 'Blocks examples'}
          >
            {(editorMode === 'python' ? PYTHON_EXAMPLES : BLOCK_EXAMPLES).map((example) => (
              <option key={example.id} value={example.id}>
                {example.name}
              </option>
            ))}
          </select>
          <button
            className="file-explorer-example-load"
            onClick={handleLoadExample}
            title="Load selected example"
          >
            Load Example
          </button>
        </div>
      )}
      <div className="file-explorer-list">
        {isDragOver && (
          <div className="file-explorer-drop-overlay">
            <Upload size={24} />
            <span>Drop files here</span>
            <span className="file-explorer-drop-hint">.py, .c, .xml, .blk</span>
          </div>
        )}
        {programs.length === 0 ? (
          <div className="file-explorer-empty">
            <p>No programs yet.</p>
            <button className="file-explorer-create-btn" onClick={handleNewProgram}>
              <FilePlus size={16} />
              Create program
            </button>
            <p className="file-explorer-drop-hint-text">
              or drag &amp; drop files here
            </p>
          </div>
        ) : (
          [...programs].sort((a, b) => b.createdAt - a.createdAt).map((program) => {
            return (
            <div
              key={program.id}
              className={`file-item ${
                currentProgramId === program.id ? 'active' : ''
              }`}
              onClick={() => handleSelectProgram(program)}
              onDoubleClick={(e) => handleStartRename(e, program)}
            >
              <File size={14} />
              {renamingId === program.id ? (
                <input
                  ref={renameInputRef}
                  className="file-rename-input"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={handleFinishRename}
                  onKeyDown={handleRenameKeyDown}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="file-name">{program.name}</span>
              )}
              <span className="file-mode">
                {program.mode === 'python' ? '.py' : program.mode === 'c' ? '.c' : '.blk'}
              </span>
              <button
                className="file-rename-btn"
                onClick={(e) => handleStartRename(e, program)}
                title="Rename"
              >
                <Pencil size={12} />
              </button>
              <button
                className="file-delete"
                onClick={(e) => handleDeleteProgram(e, program.id)}
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FileExplorer;
