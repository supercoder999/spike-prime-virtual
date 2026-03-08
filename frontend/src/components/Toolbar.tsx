import React, { useEffect, useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';
import { bleService, BleEvent } from '../services/bleService';
import {
  installLatestStablePrimehubFirmware,
  restoreBundledLegoFirmware,
} from '../services/firmwareService';
import { convertBlocklyXmlToSimJs } from '../services/blocklyToSimJs';
import { bundlePythonPrograms } from '../services/pythonBundler';
import { compilePythonAndDownload } from '../services/compilerService';
import {
  Bluetooth,
  BluetoothOff,
  Play,
  Square,
  Terminal as TerminalIcon,
  Sun,
  Moon,
  FolderOpen,
  FilePlus,
  Code2,
  Puzzle,
  Download,
  HardDriveDownload,
  Upload,
  Battery,
  BatteryLow,
  Wifi,
  Sparkles,
  Gamepad2,
  Braces,
} from 'lucide-react';

const Toolbar: React.FC = () => {
  const {
    connectionState,
    setConnectionState,
    setHubName,
    setHubStatus,
    hubName,
    hubStatus,
    editorMode,
    setEditorMode,
    pythonCode,
    darkMode,
    toggleDarkMode,
    showTerminal,
    toggleTerminal,
    showFileExplorer,
    toggleFileExplorer,
    addTerminalLine,
    batteryLevel,
    programs,
    currentProgramId,
    addProgram,
    setCurrentProgram,
    setPythonCode,
    blocklyXml,
    cCode,
    setCCode,
    showAIChat,
    toggleAIChat,
    simulationMode,
    setSimulationMode,
  } = useStore();
  const simBridgeRef = useRef<BroadcastChannel | null>(null);
  const simLastSeenRef = useRef<number>(0);

  // BLE event handler
  const handleBleEvent = useCallback(
    (event: BleEvent) => {
      switch (event.type) {
        case 'connected':
          setConnectionState('connected');
          setHubName(event.data || 'Hub');
          addTerminalLine({
            text: `Connected to ${event.data}`,
            type: 'info',
            timestamp: Date.now(),
          });
          break;
        case 'disconnected':
          setConnectionState('disconnected');
          setHubName('');
          setHubStatus('idle');
          addTerminalLine({
            text: 'Disconnected from hub',
            type: 'info',
            timestamp: Date.now(),
          });
          break;
        case 'output':
          addTerminalLine({
            text: event.data || '',
            type: 'output',
            timestamp: Date.now(),
          });
          break;
        case 'error':
          addTerminalLine({
            text: event.data || 'Unknown error',
            type: 'error',
            timestamp: Date.now(),
          });
          break;
        case 'info':
          addTerminalLine({
            text: event.data || '',
            type: 'info',
            timestamp: Date.now(),
          });
          break;
        case 'status':
          if (event.status !== undefined) {
            const isRunning = (event.status & (1 << 6)) !== 0;
            setHubStatus(isRunning ? 'running' : 'idle');
          }
          break;
      }
    },
    [setConnectionState, setHubName, setHubStatus, addTerminalLine]
  );

  useEffect(() => {
    bleService.addEventListener(handleBleEvent);
    return () => bleService.removeEventListener(handleBleEvent);
  }, [handleBleEvent]);

  useEffect(() => {
    setSimulationMode(false);
    if (typeof BroadcastChannel === 'undefined') return;

    const channel = new BroadcastChannel('code-pybricks-sim-bridge');
    simBridgeRef.current = channel;

    const markAlive = () => {
      simLastSeenRef.current = Date.now();
      setSimulationMode(true);
    };

    channel.onmessage = (event) => {
      const message = event.data || {};
      if (message.type === 'SIM_READY' || message.type === 'SIM_HEARTBEAT' || message.type === 'SIM_PONG') {
        markAlive();
        return;
      }

      if (message.type === 'SIM_RUN_STATUS' && message.text) {
        addTerminalLine({
          text: String(message.text),
          type: message.level === 'error' ? 'error' : 'info',
          timestamp: Date.now(),
        });
      }
    };

    const pingTimer = window.setInterval(() => {
      channel.postMessage({ type: 'SIM_PING', ts: Date.now() });
      if (Date.now() - simLastSeenRef.current > 2500) {
        setSimulationMode(false);
      }
    }, 1000);

    channel.postMessage({ type: 'SIM_PING', ts: Date.now() });

    return () => {
      window.clearInterval(pingTimer);
      channel.close();
      simBridgeRef.current = null;
      setSimulationMode(false);
    };
  }, [setSimulationMode, addTerminalLine]);

  const runInSimulator = useCallback(() => {
    const channel = simBridgeRef.current;
    if (!channel || !simulationMode) {
      addTerminalLine({
        text: 'Simulator is not open. Click Sim to open it first.',
        type: 'error',
        timestamp: Date.now(),
      });
      return;
    }

    if (editorMode === 'python') {
      // Bundle multi-file imports before sending to simulator
      const { bundled, resolvedModules, hubMenuInjected } = bundlePythonPrograms(
        pythonCode,
        programs,
        currentProgramId,
      );
      if (resolvedModules.length > 0) {
        addTerminalLine({
          text: `Sim: bundled ${resolvedModules.length} module(s): ${resolvedModules.join(', ')}`,
          type: 'info',
          timestamp: Date.now(),
        });
      }
      if (hubMenuInjected) {
        addTerminalLine({
          text: 'Sim: hub_menu polyfill injected (firmware compatibility)',
          type: 'info',
          timestamp: Date.now(),
        });
      }
      channel.postMessage({
        type: 'SIM_RUN_PYTHON',
        code: bundled,
        sourceLabel: 'IDE Python',
      });
      addTerminalLine({
        text: 'Run Sim: sent Python code to simulator.',
        type: 'info',
        timestamp: Date.now(),
      });
      return;
    }

    if (editorMode === 'blocks') {
      if (!blocklyXml?.trim()) {
        addTerminalLine({
          text: 'Run Sim: no Blocks XML found to run.',
          type: 'error',
          timestamp: Date.now(),
        });
        return;
      }

      const conversion = convertBlocklyXmlToSimJs(blocklyXml);
      if (conversion.error) {
        addTerminalLine({
          text: `Run Sim failed: ${conversion.error}`,
          type: 'error',
          timestamp: Date.now(),
        });
        return;
      }

      if (!conversion.code.trim()) {
        addTerminalLine({
          text: 'Run Sim: no executable Blocks code generated.',
          type: 'error',
          timestamp: Date.now(),
        });
        return;
      }

      channel.postMessage({
        type: 'SIM_RUN_JS',
        code: conversion.code,
        sourceLabel: 'IDE Blocks',
      });
      addTerminalLine({
        text: 'Run Sim: sent Blocks-generated JS to simulator.',
        type: 'info',
        timestamp: Date.now(),
      });
      return;
    }

    addTerminalLine({
      text: 'Run Sim supports Python and Blocks tabs only.',
      type: 'info',
      timestamp: Date.now(),
    });
  }, [simulationMode, editorMode, pythonCode, blocklyXml, addTerminalLine, programs, currentProgramId]);

  const handleConnect = async () => {
    if (connectionState === 'connected') {
      setConnectionState('disconnecting');
      await bleService.disconnect();
    } else if (connectionState === 'connecting') {
      // Allow cancelling a stuck connection
      bleService.abortConnection();
      setConnectionState('disconnected');
    } else if (connectionState === 'disconnected') {
      setConnectionState('connecting');
      try {
        await bleService.connect();
      } catch {
        setConnectionState('disconnected');
      }
    }
  };

  const handleRun = async () => {
    if (simulationMode) {
      runInSimulator();
      return;
    }

    if (editorMode !== 'python') {
      addTerminalLine({
        text: 'Run currently supports Python tab.',
        type: 'info',
        timestamp: Date.now(),
      });
      return;
    }

    if (connectionState !== 'connected') {
      addTerminalLine({
        text: 'Not connected to hub. Please connect first.',
        type: 'error',
        timestamp: Date.now(),
      });
      return;
    }

    try {
      // Bundle multi-file imports before sending to hub
      const { bundled, resolvedModules, hubMenuInjected } = bundlePythonPrograms(
        pythonCode,
        programs,
        currentProgramId,
      );
      if (resolvedModules.length > 0) {
        addTerminalLine({
          text: `Bundled ${resolvedModules.length} module(s): ${resolvedModules.join(', ')}`,
          type: 'info',
          timestamp: Date.now(),
        });
      }
      if (hubMenuInjected) {
        addTerminalLine({
          text: 'hub_menu polyfill injected (firmware compatibility)',
          type: 'info',
          timestamp: Date.now(),
        });
      }
      await bleService.runProgram(bundled);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addTerminalLine({
        text: `Run failed: ${message}`,
        type: 'error',
        timestamp: Date.now(),
      });
    }
  };

  const handleDownloadToHub = async () => {
    if (editorMode !== 'python') {
      addTerminalLine({
        text: 'Download to Hub supports Python tab only.',
        type: 'info',
        timestamp: Date.now(),
      });
      return;
    }

    if (connectionState !== 'connected') {
      addTerminalLine({
        text: 'Not connected to hub. Please connect first to download.',
        type: 'error',
        timestamp: Date.now(),
      });
      return;
    }

    try {
      // Bundle multi-file imports
      const { bundled, resolvedModules, hubMenuInjected } = bundlePythonPrograms(
        pythonCode,
        programs,
        currentProgramId,
      );
      if (resolvedModules.length > 0) {
        addTerminalLine({
          text: `Bundled ${resolvedModules.length} module(s): ${resolvedModules.join(', ')}`,
          type: 'info',
          timestamp: Date.now(),
        });
      }
      if (hubMenuInjected) {
        addTerminalLine({
          text: 'hub_menu polyfill injected (firmware compatibility)',
          type: 'info',
          timestamp: Date.now(),
        });
      }

      // Step 1: Compile Python to .mpy bytecode on the server
      addTerminalLine({
        text: 'Compiling Python to bytecode...',
        type: 'info',
        timestamp: Date.now(),
      });
      const mpyData = await compilePythonAndDownload({
        source_code: bundled,
        filename: 'main.py',
      });
      addTerminalLine({
        text: `Compiled successfully (${mpyData.length} bytes)`,
        type: 'info',
        timestamp: Date.now(),
      });

      // Step 2: Download bytecode to hub and run
      addTerminalLine({
        text: 'Downloading to hub...',
        type: 'info',
        timestamp: Date.now(),
      });
      await bleService.downloadAndRun(mpyData);
      addTerminalLine({
        text: 'Program stored on hub! You can now disconnect and press the hub button to re-run it.',
        type: 'info',
        timestamp: Date.now(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addTerminalLine({
        text: `Download failed: ${message}`,
        type: 'error',
        timestamp: Date.now(),
      });
    }
  };

  const handleStop = async () => {
    if (simulationMode) {
      const channel = simBridgeRef.current;
      if (!channel) {
        addTerminalLine({
          text: 'Simulator is not open. Nothing to stop.',
          type: 'info',
          timestamp: Date.now(),
        });
        return;
      }

      channel.postMessage({ type: 'SIM_STOP' });
      addTerminalLine({
        text: 'Stop Sim: stop signal sent to simulator.',
        type: 'info',
        timestamp: Date.now(),
      });
      return;
    }

    if (connectionState !== 'connected') return;
    try {
      await bleService.stopProgram();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addTerminalLine({
        text: `Stop failed: ${message}`,
        type: 'error',
        timestamp: Date.now(),
      });
    }
  };

  const handleNewProgram = () => {
    const name = prompt('Program name:', `program_${programs.length + 1}`);
    if (!name) return;

    const program = {
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

  const handleSave = () => {
    if (currentProgramId) {
      useStore.getState().updateProgram(currentProgramId, {
        pythonCode,
        blocklyXml,
        cCode,
        mode: editorMode,
      });
      addTerminalLine({
        text: 'Program saved',
        type: 'info',
        timestamp: Date.now(),
      });
    } else {
      handleNewProgram();
    }
  };

  const handleExport = () => {
    const content = editorMode === 'c' ? cCode : pythonCode;
    const mimeType = editorMode === 'c' ? 'text/x-csrc' : 'text/x-python';
    const extension = editorMode === 'c' ? 'c' : 'py';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProgramId ? programs.find(p => p.id === currentProgramId)?.name || 'program' : 'program'}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.py,.c,.h';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        const isCFile = file.name.endsWith('.c') || file.name.endsWith('.h');
        if (isCFile) {
          setCCode(content);
          setEditorMode('c');
        } else {
          setPythonCode(content);
          setEditorMode('python');
        }

        addTerminalLine({
          text: `Imported: ${file.name}`,
          type: 'info',
          timestamp: Date.now(),
        });
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleSwitchToBlocks = () => {
    setEditorMode('blocks');
  };

  const handleSwitchToPython = () => {
    setEditorMode('python');
  };

  const handleSwitchToC = () => {
    setEditorMode('c');
  };

  const handleOpenSimulator = () => {
    const popupFeatures = [
      'popup=yes',
      'toolbar=no',
      'location=no',
      'menubar=no',
      'status=no',
      'scrollbars=yes',
      'resizable=yes',
      'width=1400',
      'height=900',
    ].join(',');

    const simWindow = window.open('/simulator.html', 'code-pybricks-simulator', popupFeatures);
    if (!simWindow) {
      addTerminalLine({
        text: 'Popup blocked. Please allow popups for this site to open simulator window.',
        type: 'error',
        timestamp: Date.now(),
      });
      return;
    }

    simWindow.focus();
  };

  const handleInstallPybricksFirmware = async () => {
    addTerminalLine({
      text: 'Firmware: finding latest stable PrimeHub release...',
      type: 'info',
      timestamp: Date.now(),
    });
    addTerminalLine({
      text: 'Keep hub connected via USB and in update mode during flashing.',
      type: 'info',
      timestamp: Date.now(),
    });

    try {
      const result = await installLatestStablePrimehubFirmware();
      addTerminalLine({
        text: result.message,
        type: 'info',
        timestamp: Date.now(),
      });
      if (result.output) {
        addTerminalLine({
          text: result.output,
          type: 'output',
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addTerminalLine({
        text: `Firmware install failed: ${message}`,
        type: 'error',
        timestamp: Date.now(),
      });
    }
  };

  const handleRestoreOfficialFirmware = async () => {
    addTerminalLine({
      text: 'Firmware: restoring from bundled backend BIN...',
      type: 'info',
      timestamp: Date.now(),
    });
    addTerminalLine({
      text: 'Restore steps: connect hub via USB, enter DFU mode (hold Bluetooth while plugging USB until LED flashes red/green/blue).',
      type: 'info',
      timestamp: Date.now(),
    });
    addTerminalLine({
      text: 'If this fails with missing dfu-util/libusb, install: sudo apt install -y dfu-util libusb-1.0-0',
      type: 'info',
      timestamp: Date.now(),
    });

    try {
      const info = await restoreBundledLegoFirmware();
      addTerminalLine({
        text: info.message,
        type: 'info',
        timestamp: Date.now(),
      });
      if (info.output) {
        addTerminalLine({
          text: info.output,
          type: 'output',
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addTerminalLine({
        text: `Restore FW failed: ${message}`,
        type: 'error',
        timestamp: Date.now(),
      });
    }
  };

  const connectionColor =
    connectionState === 'connected'
      ? '#4caf50'
      : connectionState === 'connecting' || connectionState === 'disconnecting'
      ? '#ff9800'
      : undefined;

  return (
    <div className="toolbar">
      {/* Left: Connection & Run controls */}
      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${connectionState === 'connected' ? 'active' : ''}`}
          onClick={handleConnect}
          title={
            connectionState === 'connected'
              ? `Disconnect from ${hubName}`
              : connectionState === 'connecting'
              ? 'Click to cancel connection'
              : 'Connect to Spike Prime Hub'
          }
        >
          {connectionState === 'connected' ? (
            <Bluetooth size={18} color={connectionColor} />
          ) : connectionState === 'connecting' ? (
            <Bluetooth size={18} color={connectionColor} className="pulse" />
          ) : (
            <BluetoothOff size={18} />
          )}
          <span className="toolbar-label">
            {connectionState === 'connected'
              ? hubName
              : connectionState === 'connecting'
              ? 'Cancel'
              : 'Connect'}
          </span>
        </button>

        <div className="toolbar-separator" />

        <button
          className="toolbar-btn run-btn"
          onClick={handleRun}
          disabled={simulationMode ? false : ((editorMode === 'python' && connectionState !== 'connected') || hubStatus === 'running')}
          title={simulationMode ? 'Run in simulator (F5)' : (editorMode === 'python' ? 'Run program (F5)' : 'Run currently supports Python tab')}
        >
          <Play size={18} />
          <span className="toolbar-label">{simulationMode ? 'Run Sim' : 'Run'}</span>
        </button>

        <button
          className="toolbar-btn stop-btn"
          onClick={handleStop}
          disabled={simulationMode ? false : connectionState !== 'connected'}
          title={simulationMode ? 'Stop simulator run (F6)' : 'Stop program (F6)'}
        >
          <Square size={18} />
          <span className="toolbar-label">Stop</span>
        </button>

        <button
          className="toolbar-btn"
          onClick={handleDownloadToHub}
          disabled={connectionState !== 'connected' || editorMode !== 'python' || hubStatus === 'running'}
          title="Download program to hub (persists after disconnect — press hub button to re-run)"
        >
          <HardDriveDownload size={18} />
          <span className="toolbar-label">Download</span>
        </button>
      </div>

      {/* Center: Editor mode toggle */}
      <div className="toolbar-group toolbar-center">
        <div className="editor-mode-toggle">
          <button
            className={`mode-btn ${editorMode === 'python' ? 'active' : ''}`}
            onClick={handleSwitchToPython}
            title="Python Editor"
          >
            <Code2 size={16} />
            <span>Python</span>
          </button>
          <button
            className={`mode-btn ${editorMode === 'blocks' ? 'active' : ''}`}
            onClick={handleSwitchToBlocks}
            title="Block Editor"
          >
            <Puzzle size={16} />
            <span>Blocks</span>
          </button>
          <button
            className={`mode-btn ${editorMode === 'c' ? 'active' : ''}`}
            onClick={handleSwitchToC}
            title="C doesn't support Simulation Mode. You need to flash the install firmware and flash in the C code from the below Editor. Please ensure to put your Spike Prime Hub in DFU mode."
          >
            <Braces size={16} />
            <span>C</span>
          </button>
        </div>
      </div>

      {/* Right: File & View controls */}
      <div className="toolbar-group toolbar-right">
        <button className="toolbar-btn" onClick={handleNewProgram} title="New program">
          <FilePlus size={18} />
        </button>
        <button className="toolbar-btn" onClick={handleSave} title="Save program (Ctrl+S)">
          <Download size={18} />
        </button>
        <button className="toolbar-btn" onClick={handleExport} title="Export source file">
          <Upload size={18} />
        </button>
        <button className="toolbar-btn" onClick={handleImport} title="Import .py file">
          <FolderOpen size={18} />
        </button>

        <div className="toolbar-separator" />

        <button
          className={`toolbar-btn ${showFileExplorer ? 'active' : ''}`}
          onClick={toggleFileExplorer}
          title="Toggle file explorer"
        >
          <FolderOpen size={18} />
        </button>
        <button
          className={`toolbar-btn ${showTerminal ? 'active' : ''}`}
          onClick={toggleTerminal}
          title="Toggle terminal"
        >
          <TerminalIcon size={18} />
        </button>
        <button
          className={`toolbar-btn ${showAIChat ? 'active' : ''}`}
          onClick={toggleAIChat}
          title="Toggle AI Assistant (Claude)"
        >
          <Sparkles size={18} />
          <span className="toolbar-label">AI</span>
        </button>
        <button className="toolbar-btn" onClick={handleOpenSimulator} title="Open simulator">
          <Gamepad2 size={18} />
          <span className="toolbar-label">Sim</span>
        </button>

        <button
          className="toolbar-btn"
          onClick={handleInstallPybricksFirmware}
          title="Install Pybricks firmware"
        >
          <Download size={18} />
          <span className="toolbar-label">Install FW</span>
        </button>

        <button
          className="toolbar-btn"
          onClick={handleRestoreOfficialFirmware}
          title="Restore official LEGO firmware"
        >
          <Upload size={18} />
          <span className="toolbar-label">Restore FW</span>
        </button>

        <div className="toolbar-separator" />

        <button className="toolbar-btn" onClick={toggleDarkMode} title="Toggle dark mode">
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Status indicators */}
        {connectionState === 'connected' && (
          <div className="status-indicators">
            <Wifi size={14} color="#4caf50" />
            {batteryLevel > 0 && (
              <>
                {batteryLevel < 20 ? (
                  <BatteryLow size={14} color="#f44336" />
                ) : (
                  <Battery size={14} color="#4caf50" />
                )}
                <span className="battery-text">{batteryLevel}%</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Toolbar;
