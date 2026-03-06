# Spike Prime Code

A web-based IDE for programming LEGO Spike Prime robots with Pybricks MicroPython.
Inspired by [code.pybricks.com](https://code.pybricks.com/) ([pybricks-code](https://github.com/pybricks/pybricks-code)).

## Features

- **Python Editor**: Full-featured code editor with Pybricks MicroPython autocomplete (Monaco Editor)
- **Block Editor**: Drag-and-drop visual programming (Google Blockly) that generates Pybricks Python code
- **Bluetooth Connection**: Connect to Spike Prime Hub via Web Bluetooth API (BLE)
- **Run/Stop Programs**: Upload and execute programs on the hub in real-time
- **Terminal Output**: View hub output and error messages
- **File Management**: Create, save, and manage multiple programs
- **Example Programs**: Pre-built examples for getting started
- **API Documentation**: Built-in Pybricks API reference

## Architecture

```
spike-prime-virtual/
├── frontend/          # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/    # React components (Toolbar, Editors, Terminal, etc.)
│   │   ├── blockly/       # Blockly block definitions & Python code generators
│   │   ├── services/      # BLE Bluetooth service
│   │   ├── store/         # Zustand state management
│   │   └── types/         # TypeScript type definitions
│   └── ...
├── backend/           # Python FastAPI server
│   ├── app/
│   │   ├── routers/       # API endpoints (programs, compiler, examples, docs)
│   │   ├── main.py        # FastAPI app entry point
│   │   └── websocket.py   # WebSocket connection manager
│   └── requirements.txt
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- Chrome/Edge browser (for Web Bluetooth)
- LEGO Spike Prime Hub with Pybricks firmware installed

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at http://localhost:5173

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs at http://localhost:8000/docs

## How to Use

1. **Install Pybricks Firmware** on your Spike Prime Hub (see [pybricks.com](https://pybricks.com/install/spike-prime/))
2. Open the app in Chrome/Edge
3. Click **Connect** (Bluetooth icon) to pair with your hub
4. Write code in **Python** mode or build with **Blocks** mode
5. Click **Run** (or F5) to execute your program on the hub
6. View output in the **Terminal** panel

## Technology Stack

### Frontend
- **React 18** + TypeScript
- **Vite** - Build tool
- **Monaco Editor** - Code editor (same as VS Code)
- **Google Blockly** - Visual block programming
- **Zustand** - State management
- **Lucide React** - Icons
- **Web Bluetooth API** - BLE communication

### Backend
- **FastAPI** - Python web framework
- **Pydantic** - Data validation
- **mpy-cross** - MicroPython cross-compiler
- **WebSocket** - Real-time communication

## Pybricks BLE Protocol

Communication with the Spike Prime Hub uses:
- **Pybricks Service** (`c5f50001-...`): Send commands (run/stop programs), receive status events
- **Nordic UART Service** (`6e400001-...`): Send/receive data (stdin/stdout)
- **Device Information Service** (`0x180a`): Read firmware version, device name

## Credits

- [Pybricks](https://pybricks.com/) - MicroPython firmware for LEGO hubs
- [pybricks-code](https://github.com/pybricks/pybricks-code) - Original web IDE (MIT License)
- LEGO® is a trademark of the LEGO Group
