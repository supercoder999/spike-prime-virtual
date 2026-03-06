# Spike Prime Code - Backend
# FastAPI server for MicroPython compilation, program management, and documentation

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

This installs `pybricksdev`, used by the firmware endpoint to flash Pybricks firmware.

## Database – Google Cloud Firestore

The backend uses **Firestore** for persistent storage (programs collection).

### Local development (Firebase Emulator)

1. Install the Firebase CLI (one-time):
   ```bash
   npm install -g firebase-tools
   ```
2. Start the Firestore emulator from the **project root**:
   ```bash
   firebase emulators:start --only firestore
   ```
   The emulator UI is available at http://localhost:4000.
3. Make sure `backend/.env` contains:
   ```env
   FIRESTORE_EMULATOR_HOST=localhost:8080
   GCP_PROJECT_ID=code-pybricks-local
   ```

### Production (Google Cloud)

1. Create a Firestore database in your GCP project.
2. Download a service-account key JSON, then set in `backend/.env`:
   ```env
   # Remove or comment out FIRESTORE_EMULATOR_HOST
   GCP_PROJECT_ID=your-gcp-project-id
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
   ```

## Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Create `backend/.env` and set:

```env
GEMINI_API_KEY=your_key_here
# or GOOGLE_API_KEY=your_key_here
```

## API Docs

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Features

- **Program Management**: CRUD API for Python programs
- **MicroPython Compilation**: Cross-compile Python to .mpy format
- **WebSocket**: Real-time communication for live terminal output relay
- **Documentation**: Serve Pybricks API documentation
- **Examples**: Pre-built example programs for Spike Prime

## Build latest SPIKE-RT firmware artifact

To build a fresh firmware binary and export it into `backend/firmware`:

```bash
cd backend
./scripts/build_latest_firmware.sh
```

Default target is `all_motors_360` from sibling repo `../spike-rt`.

Useful options:

```bash
# Build a different sample target
./scripts/build_latest_firmware.sh --target led

# Use a custom spike-rt path
./scripts/build_latest_firmware.sh --spike-root /path/to/spike-rt

# Export existing build without rebuilding
./scripts/build_latest_firmware.sh --skip-build
```

Generated files:
- `backend/firmware/spike-rt-primehub-<target>-<timestamp>.bin`
- `backend/firmware/spike-rt-primehub-<target>-latest.bin`
- `backend/firmware/spike-rt-primehub-<target>-latest.sha256`
