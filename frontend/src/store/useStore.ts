import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type EditorMode = 'python' | 'blocks' | 'c';
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'disconnecting';
export type HubStatus = 'idle' | 'running' | 'error';

export interface Program {
  id: string;
  name: string;
  pythonCode: string;
  blocklyXml: string;
  cCode?: string;
  mode: EditorMode;
  createdAt: number;
  updatedAt: number;
}

export interface TerminalLine {
  text: string;
  type: 'output' | 'error' | 'info' | 'input';
  timestamp: number;
}

interface AppState {
  // Editor
  editorMode: EditorMode;
  setEditorMode: (mode: EditorMode) => void;

  // Current code
  pythonCode: string;
  setPythonCode: (code: string) => void;
  blocklyXml: string;
  setBlocklyXml: (xml: string) => void;
  cCode: string;
  setCCode: (code: string) => void;

  // Programs / File management
  programs: Program[];
  currentProgramId: string | null;
  addProgram: (program: Program) => void;
  updateProgram: (id: string, updates: Partial<Program>) => void;
  deleteProgram: (id: string) => void;
  setCurrentProgram: (id: string | null) => void;
  renameProgram: (id: string, name: string) => void;

  // Connection
  connectionState: ConnectionState;
  setConnectionState: (state: ConnectionState) => void;
  hubName: string;
  setHubName: (name: string) => void;
  hubStatus: HubStatus;
  setHubStatus: (status: HubStatus) => void;
  batteryLevel: number;
  setBatteryLevel: (level: number) => void;

  // Terminal
  terminalLines: TerminalLine[];
  addTerminalLine: (line: TerminalLine) => void;
  clearTerminal: () => void;

  // UI
  showTerminal: boolean;
  toggleTerminal: () => void;
  showFileExplorer: boolean;
  toggleFileExplorer: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  showAIChat: boolean;
  toggleAIChat: () => void;
  simulationMode: boolean;
  setSimulationMode: (enabled: boolean) => void;
  toggleSimulationMode: () => void;

  // Activation
  isActivated: boolean;
  setActivated: (activated: boolean) => void;
  activationExpiry: string | null;  // ISO date e.g. "2026-09-30"
  setActivationExpiry: (expiry: string | null) => void;
  showActivationModal: boolean;
  setShowActivationModal: (show: boolean) => void;
}

const DEFAULT_PYTHON_CODE = `from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor
from pybricks.parameters import Color, Direction, Port, Stop
from pybricks.robotics import DriveBase
from pybricks.tools import wait

# Example (about 15 commands): hub + motors + drive base demo
hub = PrimeHub()
left_motor = Motor(Port.A)
right_motor = Motor(Port.B, Direction.COUNTERCLOCKWISE)
arm_motor = Motor(Port.C)
drive_base = DriveBase(left_motor, right_motor, wheel_diameter=56, axle_track=114)

hub.light.on(Color.GREEN)
hub.speaker.beep(440, 120)

drive_base.straight(250)
wait(300)
drive_base.turn(90)
wait(300)
arm_motor.run_angle(500, 180, Stop.HOLD)
wait(200)

hub.light.on(Color.BLUE)
drive_base.straight(-120)
hub.speaker.beep(660, 120)
drive_base.stop()

print("Demo complete")
`;

const DEFAULT_C_CODE = `#include <pbio/drivebase.h>
#include <pbio/error.h>
#include <pbio/motor.h>

int main(void) {
  return 0;
}
`;

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // Editor
      editorMode: 'python',
      setEditorMode: (mode) => set({ editorMode: mode }),

      // Current code
      pythonCode: DEFAULT_PYTHON_CODE,
      setPythonCode: (code) => set({ pythonCode: code }),
      blocklyXml: '',
      setBlocklyXml: (xml) => set({ blocklyXml: xml }),
      cCode: DEFAULT_C_CODE,
      setCCode: (code) => set({ cCode: code }),

      // Programs
      programs: [],
      currentProgramId: null,
      addProgram: (program) =>
        set((state) => ({ programs: [...state.programs, program] })),
      updateProgram: (id, updates) =>
        set((state) => ({
          programs: state.programs.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
          ),
        })),
      deleteProgram: (id) =>
        set((state) => ({
          programs: state.programs.filter((p) => p.id !== id),
          currentProgramId: state.currentProgramId === id ? null : state.currentProgramId,
        })),
      setCurrentProgram: (id) => set({ currentProgramId: id }),
      renameProgram: (id, name) =>
        set((state) => ({
          programs: state.programs.map((p) =>
            p.id === id ? { ...p, name, updatedAt: Date.now() } : p
          ),
        })),

      // Connection
      connectionState: 'disconnected',
      setConnectionState: (connectionState) => set({ connectionState }),
      hubName: '',
      setHubName: (hubName) => set({ hubName }),
      hubStatus: 'idle',
      setHubStatus: (hubStatus) => set({ hubStatus }),
      batteryLevel: 0,
      setBatteryLevel: (batteryLevel) => set({ batteryLevel }),

      // Terminal
      terminalLines: [],
      addTerminalLine: (line) =>
        set((state) => ({ terminalLines: [...state.terminalLines, line] })),
      clearTerminal: () => set({ terminalLines: [] }),

      // UI
      showTerminal: true,
      toggleTerminal: () => set((state) => ({ showTerminal: !state.showTerminal })),
      showFileExplorer: true,
      toggleFileExplorer: () => set((state) => ({ showFileExplorer: !state.showFileExplorer })),
      darkMode: true,
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      showAIChat: false,
      toggleAIChat: () => set((state) => ({ showAIChat: !state.showAIChat })),
      simulationMode: false,
      setSimulationMode: (simulationMode) => set({ simulationMode }),
      toggleSimulationMode: () => set((state) => ({ simulationMode: !state.simulationMode })),

      // Activation
      isActivated: false,
      setActivated: (isActivated) => set({ isActivated }),
      activationExpiry: null,
      setActivationExpiry: (activationExpiry) => set({ activationExpiry }),
      showActivationModal: false,
      setShowActivationModal: (showActivationModal) => set({ showActivationModal }),
    }),
    {
      name: 'pybricks-ide-storage',
      // Only persist the fields we care about — NOT connection state or terminal
      partialize: (state) => ({
        editorMode: state.editorMode,
        pythonCode: state.pythonCode,
        blocklyXml: state.blocklyXml,
        cCode: state.cCode,
        programs: state.programs,
        currentProgramId: state.currentProgramId,
        darkMode: state.darkMode,
        showTerminal: state.showTerminal,
        showFileExplorer: state.showFileExplorer,
        showAIChat: state.showAIChat,
        simulationMode: state.simulationMode,
        isActivated: state.isActivated,
        activationExpiry: state.activationExpiry,
      }),
    },
  ),
);
