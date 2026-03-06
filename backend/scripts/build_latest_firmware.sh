#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: build_latest_firmware.sh [options]

Build SPIKE-RT firmware and export the latest flashable .bin into backend/firmware.

Options:
  -t, --target <name>        Sample target name (default: all_motors_360)
  -s, --spike-root <path>    Path to spike-rt repo (default: ../spike-rt from spike-prime-virtual)
  -o, --output-dir <path>    Output directory (default: backend/firmware)
      --skip-build           Skip build and only export existing asp.bin
  -h, --help                 Show this help

Output files:
  - spike-rt-primehub-<target>-<timestamp>.bin
  - spike-rt-primehub-<target>-latest.bin
  - spike-rt-primehub-<target>-latest.sha256
EOF
}

TARGET="all_motors_360"
SPIKE_ROOT=""
OUTPUT_DIR=""
SKIP_BUILD=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -t|--target)
      TARGET="${2:-}"
      shift 2
      ;;
    -s|--spike-root)
      SPIKE_ROOT="${2:-}"
      shift 2
      ;;
    -o|--output-dir)
      OUTPUT_DIR="${2:-}"
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$BACKEND_DIR/.." && pwd)"

if [[ -z "$SPIKE_ROOT" ]]; then
  SPIKE_ROOT="$(cd "$PROJECT_ROOT/../spike-rt" && pwd)"
else
  SPIKE_ROOT="$(cd "$SPIKE_ROOT" && pwd)"
fi

if [[ -z "$OUTPUT_DIR" ]]; then
  OUTPUT_DIR="$BACKEND_DIR/firmware"
fi
OUTPUT_DIR="$(mkdir -p "$OUTPUT_DIR" && cd "$OUTPUT_DIR" && pwd)"

BUILD_TOP="${BUILD_TOP:-$SPIKE_ROOT/build}"
OBJ_KERNEL="$BUILD_TOP/obj-primehub_kernel"
OBJ_APP="$BUILD_TOP/obj-primehub_${TARGET}"
ASP_BIN="$OBJ_APP/asp.bin"

build_kernel() {
  mkdir -p "$OBJ_KERNEL"
  pushd "$OBJ_KERNEL" >/dev/null
  "$SPIKE_ROOT/asp3/configure.rb" -T primehub_gcc -f -m "$SPIKE_ROOT/common/kernel.mk"
  make libkernel.a -j "${JOB_NUM:-$(nproc)}"
  popd >/dev/null
}

build_target() {
  mkdir -p "$OBJ_APP"
  pushd "$OBJ_APP" >/dev/null
  "$SPIKE_ROOT/asp3/configure.rb" \
    -T primehub_gcc \
    -L "$OBJ_KERNEL" \
    -a "$SPIKE_ROOT/sample/$TARGET" \
    -A "$TARGET" \
    -m "$SPIKE_ROOT/common/app.mk"
  make -j "${JOB_NUM:-$(nproc)}"
  popd >/dev/null
}

if [[ ! -d "$SPIKE_ROOT" ]]; then
  echo "SPIKE-RT root not found: $SPIKE_ROOT" >&2
  exit 1
fi

if [[ ! -d "$SPIKE_ROOT/sample/$TARGET" ]]; then
  echo "Sample target not found: $SPIKE_ROOT/sample/$TARGET" >&2
  exit 1
fi

if [[ "$SKIP_BUILD" -eq 0 ]]; then
  echo "[1/3] Building kernel ..."
  build_kernel
  echo "[2/3] Building sample target '$TARGET' ..."
  build_target
else
  echo "[build] Skipping build (--skip-build)"
fi

if [[ ! -f "$ASP_BIN" ]]; then
  echo "Firmware binary not found: $ASP_BIN" >&2
  exit 1
fi

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
VERSIONED_BIN="$OUTPUT_DIR/spike-rt-primehub-${TARGET}-${TIMESTAMP}.bin"
LATEST_BIN="$OUTPUT_DIR/spike-rt-primehub-${TARGET}-latest.bin"
LATEST_SHA="$OUTPUT_DIR/spike-rt-primehub-${TARGET}-latest.sha256"

echo "[3/3] Exporting firmware ..."
cp "$ASP_BIN" "$VERSIONED_BIN"
cp "$ASP_BIN" "$LATEST_BIN"
sha256sum "$LATEST_BIN" | awk '{print $1}' > "$LATEST_SHA"

SIZE_BYTES="$(wc -c < "$LATEST_BIN" | tr -d ' ')"
SHA256="$(cat "$LATEST_SHA")"

cat <<EOF
Build complete.
Target:        $TARGET
Spike root:    $SPIKE_ROOT
Source bin:    $ASP_BIN
Output file:   $VERSIONED_BIN
Latest file:   $LATEST_BIN
SHA256 file:   $LATEST_SHA
Size (bytes):  $SIZE_BYTES
SHA256:        $SHA256
EOF
