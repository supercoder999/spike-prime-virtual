"""Firmware management API for LEGO hubs."""

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel
import json
import os
import re
import shlex
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

router = APIRouter()


BACKEND_ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BUNDLED_LEGO_RESTORE_BIN_PATH = os.path.join(
    BACKEND_ROOT_DIR,
    "firmware",
    "prime-v1.3.00.0000-e8c274a.15bc498f956dc12eda9f.bin",
)


class FirmwareInstallResponse(BaseModel):
    success: bool
    message: str
    output: str = ""


class LegoRestoreInfoResponse(BaseModel):
    success: bool
    message: str
    restore_url: str
    note: str = ""


class CFirmwareBuildFlashRequest(BaseModel):
    source_code: str
    filename: str = "program.c"
    source_path: str | None = None
    build_command: str | None = None
    flash_command: str | None = None


class CFirmwareBuildFlashResponse(BaseModel):
    success: bool
    message: str
    source_path: str
    build_command: str
    flash_command: str
    build_output: str = ""
    flash_output: str = ""


C_USER_CODE_BEGIN_MARKER = "/* CODE_PYBRICKS_USER_CODE_BEGIN */"
C_USER_CODE_END_MARKER = "/* CODE_PYBRICKS_USER_CODE_END */"


def _indent_block(text: str, spaces: int = 4) -> str:
    prefix = " " * spaces
    lines = text.splitlines() or [""]
    return "\n".join(f"{prefix}{line}" if line else "" for line in lines)


def _contains_c_main(source: str) -> bool:
    return re.search(r"\b(?:int|void)\s+main\s*\(", source) is not None


def _contains_spike_rt_main_task(source: str) -> bool:
    return re.search(r"\bvoid\s+main_task\s*\(", source) is not None


def _looks_like_top_level_c(source: str) -> bool:
    if "#include" in source:
        return True
    return re.search(
        r"\b[a-zA-Z_][a-zA-Z0-9_\s\*]*\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\([^;{}]*\)\s*\{",
        source,
    ) is not None


def _default_firmware_scaffold(user_source: str) -> str:
    normalized = user_source.strip("\n")
    user_block = _build_user_block(normalized)

    return (
        "#include <kernel.h>\n"
        "#include \"button.h\"\n"
        "#include \"spike/hub/speaker.h\"\n"
        "#include \"spike/pup/motor.h\"\n\n"
        "int code_pybricks_user_main(void) __attribute__((weak));\n\n"
        f"{C_USER_CODE_BEGIN_MARKER}\n"
        f"{user_block}\n"
        f"{C_USER_CODE_END_MARKER}\n\n"
        "void main_task(intptr_t exinf) {\n"
        "    (void)exinf;\n"
        "    if (code_pybricks_user_main) {\n"
        "        code_pybricks_user_main();\n"
        "    }\n"
        "    while (1) {\n"
        "        dly_tsk(1000000);\n"
        "    }\n"
        "}\n"
    )


def _build_user_block(normalized_user_source: str) -> str:
    if _looks_like_top_level_c(normalized_user_source):
        return normalized_user_source

    body = _indent_block(normalized_user_source, spaces=4)
    return (
        "int code_pybricks_user_main(void) {\n"
        f"{body}\n"
        "    return 0;\n"
        "}"
    )


def _merge_firmware_source(existing_source: str | None, user_source: str) -> str:
    normalized = user_source.strip("\n")
    if _contains_c_main(normalized) or _contains_spike_rt_main_task(normalized):
        return normalized + "\n"

    user_block = _build_user_block(normalized)

    if existing_source and C_USER_CODE_BEGIN_MARKER in existing_source and C_USER_CODE_END_MARKER in existing_source:
        pattern = re.compile(
            rf"{re.escape(C_USER_CODE_BEGIN_MARKER)}\\n.*?\\n{re.escape(C_USER_CODE_END_MARKER)}",
            re.DOTALL,
        )
        replacement = (
            f"{C_USER_CODE_BEGIN_MARKER}\n"
            f"{user_block}\n"
            f"{C_USER_CODE_END_MARKER}"
        )
        return pattern.sub(replacement, existing_source, count=1)

    return _default_firmware_scaffold(normalized)


def _get_spike_rt_repo_root() -> str:
    explicit_spike_rt = os.getenv("SPIKE_RT_REPO_ROOT", "").strip()
    if explicit_spike_rt:
        return explicit_spike_rt

    legacy = os.getenv("PYBRICKS_REPO_ROOT", "").strip()
    if legacy:
        return legacy

    return "/home/thanh/Documents/spike-rt"


def _run_command_template(
    command_template: str,
    repo_root: str,
    source_path: str,
    timeout: int = 1800,
) -> tuple[str, str]:
    command = command_template.format(
        repo_root=repo_root,
        source_path=source_path,
        pybricksdev_cmd=f"{sys.executable} -m pybricksdev",
    )
    command_env = os.environ.copy()
    command_env.setdefault("PYBRICKSDEV", f"{sys.executable} -m pybricksdev")
    result = subprocess.run(
        shlex.split(command),
        capture_output=True,
        text=True,
        timeout=timeout,
        env=command_env,
    )
    output = (result.stdout or "") + ("\n" + result.stderr if result.stderr else "")
    if result.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail=f"Command failed: {command}\n{output.strip() or 'Unknown error'}",
        )
    return command, output.strip()


def _restore_firmware_bin(bin_path: str, source_label: str) -> FirmwareInstallResponse:
    result = subprocess.run(
        [sys.executable, "-m", "pybricksdev", "dfu", "restore", bin_path],
        capture_output=True,
        text=True,
        timeout=300,
    )

    output = (result.stdout or "") + ("\n" + result.stderr if result.stderr else "")
    if result.returncode != 0:
        if "No LEGO DFU USB device found" in output or "RuntimeError: No LEGO DFU USB device found" in output:
            raise HTTPException(
                status_code=400,
                detail=(
                    "No LEGO DFU USB device found.\n"
                    "Put SPIKE Prime in DFU mode exactly as follows: unplug USB, power hub OFF, hold the Bluetooth button, plug USB while still holding, keep holding until LED flashes red/green/blue.\n"
                    "Then click Restore FW again.\n"
                    "If still not detected, replug USB and verify device appears with: lsusb | grep 0694"
                ),
            )
        if "No working DFU found." in output or "dfu-util" in output:
            raise HTTPException(
                status_code=501,
                detail=(
                    "Restore prerequisites are missing (dfu-util/libusb).\n"
                    "Install tools on Linux: sudo apt update && sudo apt install -y dfu-util libusb-1.0-0\n"
                    "Put SPIKE Prime in DFU mode: unplug USB, power OFF, hold Bluetooth button, plug USB, keep holding until LED flashes red/green/blue.\n"
                    "If permission is denied, run: pybricksdev udev | sudo tee /etc/udev/rules.d/99-pybricksdev.rules && "
                    "sudo udevadm control --reload-rules && sudo udevadm trigger"
                ),
            )
        if "No DFU" in output:
            raise HTTPException(
                status_code=400,
                detail=(
                    "No DFU device found. Put SPIKE Prime in DFU mode, connect via USB, then try again."
                ),
            )
        if "Permission to access USB device denied" in output:
            raise HTTPException(
                status_code=403,
                detail=(
                    "USB permission denied. Run: pybricksdev udev | sudo tee /etc/udev/rules.d/99-pybricksdev.rules "
                    "then reload udev rules and reconnect the hub."
                ),
            )
        raise HTTPException(
            status_code=500,
            detail=f"pybricksdev restore failed. {output.strip() or 'Unknown error'}",
        )

    return FirmwareInstallResponse(
        success=True,
        message=f"Restored LEGO firmware from {source_label}",
        output=output.strip(),
    )


def _flash_firmware_zip(zip_path: str) -> str:
    result = subprocess.run(
        [sys.executable, "-m", "pybricksdev", "flash", zip_path],
        capture_output=True,
        text=True,
        timeout=300,
    )

    output = (result.stdout or "") + ("\n" + result.stderr if result.stderr else "")
    if result.returncode != 0:
        if "No DFU devices found." in output:
            raise HTTPException(
                status_code=400,
                detail=(
                    "No DFU device found. For LEGO SPIKE Prime (PrimeHub): "
                    "1) Unplug USB. 2) Turn hub OFF. 3) Press and hold the Bluetooth button. "
                    "4) While holding it, plug in USB. 5) Keep holding until Bluetooth LED flashes red/green/blue. "
                    "Then click Install FW again."
                ),
            )
        raise HTTPException(
            status_code=500,
            detail=f"pybricksdev flash failed. {output.strip() or 'Unknown error'}",
        )

    return output.strip()


def _get_latest_stable_primehub_asset_url() -> tuple[str, str]:
    req = urllib.request.Request(
        "https://api.github.com/repos/pybricks/pybricks-micropython/releases/latest",
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "code-lego-spike-portal",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            data = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch latest Pybricks release metadata: {exc}",
        )

    assets = data.get("assets") or []
    pattern = re.compile(r"^pybricks-primehub-v\d+\.\d+\.\d+\.zip$", re.IGNORECASE)
    for asset in assets:
        name = str(asset.get("name") or "")
        url = str(asset.get("browser_download_url") or "")
        if pattern.match(name) and url:
            return name, url

    raise HTTPException(
        status_code=404,
        detail="Could not find stable PrimeHub firmware asset in latest release",
    )


@router.post("/c/build-flash", response_model=CFirmwareBuildFlashResponse)
async def build_and_flash_c_firmware(request: CFirmwareBuildFlashRequest):
    """Build and flash C firmware for PrimeHub in one call.

    Command templates support placeholders:
    - {repo_root}
    - {source_path}
    """
    repo_root = _get_spike_rt_repo_root()

    source_path_value = (
        request.source_path
        or os.getenv("PYBRICKS_C_FIRMWARE_SOURCE_PATH", "")
        or f"{repo_root}/sample/button/button.c"
    )
    source_path = Path(source_path_value)
    if not source_path.is_absolute():
        source_path = Path(repo_root) / source_path

    filename = request.filename or "program.c"
    if not filename.endswith(".c"):
        filename = f"{filename}.c"

    source_path.parent.mkdir(parents=True, exist_ok=True)
    existing_source = source_path.read_text(encoding="utf-8") if source_path.exists() else None
    generated_source = _merge_firmware_source(existing_source, request.source_code)
    source_path.write_text(generated_source, encoding="utf-8")

    build_template = (
        request.build_command
        or os.getenv("PYBRICKS_C_FIRMWARE_BUILD_CMD", "")
        or "docker run --rm -v {repo_root}:/work -w /work ghcr.io/spike-rt/spike-rt:rich /bin/bash -lc \"set -e; git config --global --add safe.directory '*' ; ./scripts/build-samples.sh\""
    )
    flash_template = (
        request.flash_command
        or os.getenv("PYBRICKS_C_FIRMWARE_FLASH_CMD", "")
        or "bash -lc \"cd {repo_root}/build/obj-primehub_button && PYTHON3={repo_root}/tools/python/bin/python3 {repo_root}/scripts/deploy-dfu.sh asp.bin\""
    )

    try:
        build_command, build_output = _run_command_template(
            build_template,
            repo_root,
            str(source_path),
        )
        flash_command, flash_output = _run_command_template(
            flash_template,
            repo_root,
            str(source_path),
        )
    except HTTPException as exc:
        detail = str(exc.detail)
        if (
            "sudo" in detail
            and (
                "password" in detail
                or "a terminal is required" in detail
                or "a password is required" in detail
            )
        ):
            raise HTTPException(
                status_code=500,
                detail=(
                    "Firmware deploy needs sudo access for DFU flash. "
                    "Configure passwordless sudo for this command path, or flash manually from a terminal with: "
                    f"cd {repo_root}/build/obj-primehub_button && PYTHON3={repo_root}/tools/python/bin/python3 sudo {repo_root}/scripts/deploy-dfu.sh asp.bin"
                ),
            )
        if "pybricksdev: No such file or directory" in detail:
            raise HTTPException(
                status_code=501,
                detail=(
                    "Firmware deploy failed: pybricksdev was not found by the build/deploy command. "
                    "Install it in the backend environment with: pip install pybricksdev"
                ),
            )
        if (
            "No DFU devices found" in detail
            or "No DFU device found" in detail
            or "No LEGO DFU USB device found" in detail
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "No DFU device found. Put SPIKE Prime in DFU mode (hold Bluetooth while plugging USB until LED flashes red/green/blue), then retry Build+Flash C."
                ),
            )
        raise
    except FileNotFoundError:
        raise HTTPException(
            status_code=501,
            detail="Required build tool was not found in PATH (make/arm toolchain/pybricksdev).",
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Firmware build/flash command timed out")

    return CFirmwareBuildFlashResponse(
        success=True,
        message=(
            f"Built and flashed SPIKE-RT button firmware using source: {filename}. "
            "Editor code was injected into sample/button/button.c and executed from main_task."
        ),
        source_path=str(source_path),
        build_command=build_command,
        flash_command=flash_command,
        build_output=build_output,
        flash_output=flash_output,
    )


@router.post("/pybricks/install", response_model=FirmwareInstallResponse)
async def install_pybricks_firmware(firmware: UploadFile = File(...)):
    """Flash Pybricks firmware using pybricksdev.

    Expects a firmware .zip file downloaded from pybricks.com.
    """
    filename = firmware.filename or "firmware.zip"
    if not filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Firmware file must be a .zip archive")

    temp_path = ""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp:
            content = await firmware.read()
            if not content:
                raise HTTPException(status_code=400, detail="Uploaded firmware file is empty")
            tmp.write(content)
            temp_path = tmp.name

        output = _flash_firmware_zip(temp_path)

        return FirmwareInstallResponse(
            success=True,
            message="Pybricks firmware installed successfully.",
            output=output.strip(),
        )

    except FileNotFoundError:
        raise HTTPException(
            status_code=501,
            detail="pybricksdev is not installed. Install with: pip install pybricksdev",
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Firmware flashing timed out")
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/pybricks/install/primehub/stable", response_model=FirmwareInstallResponse)
async def install_latest_stable_primehub_firmware():
    """Fetch latest stable PrimeHub firmware from GitHub releases and flash it."""
    temp_path = ""
    try:
        asset_name, asset_url = _get_latest_stable_primehub_asset_url()
        req = urllib.request.Request(
            asset_url,
            headers={"User-Agent": "code-lego-spike-portal"},
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                firmware_bytes = response.read()
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Failed to download firmware archive: {exc}",
            )

        if not firmware_bytes:
            raise HTTPException(status_code=502, detail="Downloaded firmware archive is empty")

        with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp:
            tmp.write(firmware_bytes)
            temp_path = tmp.name

        output = _flash_firmware_zip(temp_path)

        return FirmwareInstallResponse(
            success=True,
            message=f"Installed latest stable PrimeHub firmware: {asset_name}",
            output=output,
        )

    except FileNotFoundError:
        raise HTTPException(
            status_code=501,
            detail="pybricksdev is not installed. Install with: pip install pybricksdev",
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Firmware flashing timed out")
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@router.get("/lego/restore-info", response_model=LegoRestoreInfoResponse)
async def get_lego_restore_info():
    """Get official LEGO restore source for SPIKE Prime firmware."""
    return LegoRestoreInfoResponse(
        success=True,
        message="Use the official LEGO Education app/download page to restore or update firmware.",
        restore_url="https://education.lego.com/en-us/product-resources/spike-prime/downloads/",
        note="LEGO does not publish a direct standalone SPIKE Prime firmware .zip for manual flashing.",
    )


@router.post("/lego/restore/local", response_model=FirmwareInstallResponse)
async def restore_lego_firmware_from_local_backup(backup: UploadFile = File(...)):
    """Restore LEGO firmware from a local backup .bin using DFU."""
    filename = backup.filename or "firmware-backup.bin"
    if not filename.lower().endswith(".bin"):
        raise HTTPException(status_code=400, detail="Backup file must be a .bin file")

    temp_path = ""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".bin") as tmp:
            content = await backup.read()
            if not content:
                raise HTTPException(status_code=400, detail="Uploaded backup file is empty")
            tmp.write(content)
            temp_path = tmp.name

        return _restore_firmware_bin(temp_path, f"backup: {filename}")

    except FileNotFoundError:
        raise HTTPException(
            status_code=501,
            detail="pybricksdev is not installed. Install with: pip install pybricksdev",
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Firmware restore timed out")
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/lego/restore/bundled", response_model=FirmwareInstallResponse)
async def restore_lego_firmware_from_bundled_bin():
    """Restore LEGO firmware from bundled BIN file on backend."""
    if not os.path.exists(BUNDLED_LEGO_RESTORE_BIN_PATH):
        raise HTTPException(
            status_code=404,
            detail=(
                "Bundled restore BIN not found on backend. Expected: "
                f"{BUNDLED_LEGO_RESTORE_BIN_PATH}"
            ),
        )

    return _restore_firmware_bin(
        BUNDLED_LEGO_RESTORE_BIN_PATH,
        f"bundled BIN: {os.path.basename(BUNDLED_LEGO_RESTORE_BIN_PATH)}",
    )
