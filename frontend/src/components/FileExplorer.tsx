import React, { useState, useRef, useEffect } from 'react';
import { useStore, Program } from '../store/useStore';
import { File, FilePlus, Trash2, FolderOpen, Pencil } from 'lucide-react';

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
  } = useStore();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  if (!showFileExplorer) return null;

  const handleSelectProgram = (program: Program) => {
    setCurrentProgram(program.id);
    setPythonCode(program.pythonCode);
    setBlocklyXml(program.blocklyXml);
    setCCode(program.cCode || '');
    setEditorMode(program.mode);
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

  return (
    <div className="file-explorer">
      <div className="file-explorer-header">
        <FolderOpen size={14} />
        <span>Programs</span>
        <button
          className="file-explorer-action"
          onClick={handleNewProgram}
          title="New program"
        >
          <FilePlus size={14} />
        </button>
      </div>
      <div className="file-explorer-list">
        {programs.length === 0 ? (
          <div className="file-explorer-empty">
            <p>No programs yet.</p>
            <button className="file-explorer-create-btn" onClick={handleNewProgram}>
              <FilePlus size={16} />
              Create program
            </button>
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
