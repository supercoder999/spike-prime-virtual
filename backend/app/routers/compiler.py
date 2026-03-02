"""MicroPython cross-compiler API.
Compiles Python source to .mpy bytecode format for Pybricks hubs.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
import subprocess
import tempfile
import os
import shlex
import shutil
from pathlib import Path

router = APIRouter()


class CompileRequest(BaseModel):
    source_code: str
    filename: str = "main.py"


class CompileResponse(BaseModel):
    success: bool
    message: str
    size: int = 0


class SyntaxCheckRequest(BaseModel):
    source_code: str


class SyntaxCheckResponse(BaseModel):
    valid: bool
    error: str = ""
    line: int = 0
    column: int = 0


class CCompileRequest(BaseModel):
    source_code: str
    filename: str = "main.c"


class CCompileResponse(BaseModel):
    success: bool
    message: str
    size: int = 0


class CBuildCommandsResponse(BaseModel):
    repo_root: str
    include_dir: str
    pbio_config_dir: str
    commands: list[str]


def _get_repo_root() -> str:
    return os.getenv("PYBRICKS_REPO_ROOT", "/home/thanh/Documents/pybricks-micropython")


def _get_include_dir() -> str:
    return os.getenv("PYBRICKS_C_INCLUDE_DIR", f"{_get_repo_root()}/lib/pbio/include")


def _get_pbio_platform() -> str:
    return os.getenv("PYBRICKS_PBIO_PLATFORM", "prime_hub")


def _get_pbio_config_dir() -> str:
    explicit = os.getenv("PYBRICKS_PBIO_CONFIG_DIR", "").strip()
    if explicit:
        return explicit
    return f"{_get_repo_root()}/lib/pbio/platform/{_get_pbio_platform()}"


def _generate_c_build_commands() -> list[str]:
    repo_root = _get_repo_root()
    c_root = Path(repo_root) / "c"
    lego_include_dir = Path(repo_root) / "lib" / "lego"

    engine_sources = [
        c_root / "src" / "engine.c",
        c_root / "src" / "lexer.c",
        c_root / "src" / "parser.c",
        c_root / "src" / "runtime.c",
        c_root / "src" / "gc.c",
        c_root / "examples" / "common" / "example_runner.c",
    ]

    existing_sources = [str(source) for source in engine_sources if source.exists()]
    source_args = " ".join(existing_sources)

    include_args = " ".join(
        [
            "-I{compat_include_dir}",
            f"-I{c_root / 'include'}",
            f"-I{c_root / 'examples'}",
            f"-I{Path(_get_include_dir())}",
            f"-I{Path(_get_pbio_config_dir())}",
            f"-I{lego_include_dir}",
        ]
    )

    compiler = "arm-none-eabi-gcc" if shutil.which("arm-none-eabi-gcc") else "gcc"

    return [
        (
            f"{compiler} -std=c11 -Wall -Wextra -O2 {include_args} "
            f"{source_args} {{src}} -o {{out}}"
        ).strip(),
        (
            f"gcc -std=c11 -Wall -Wextra -O2 {include_args} "
            f"{source_args} {{src}} -o {{out}}"
        ).strip(),
    ]


def _run_c_compile(source_code: str, filename: str) -> tuple[bytes, str, str]:
    """Compile C source with a user-provided command template.

    Command template is read from PYBRICKS_C_COMPILE_CMD and supports placeholders:
    {src}, {out}, {workdir}, {include_dir}, {repo_root}
    """
    explicit_cmd = os.getenv("PYBRICKS_C_COMPILE_CMD", "").strip()
    cmd_templates = [explicit_cmd] if explicit_cmd else _generate_c_build_commands()

    include_dir = _get_include_dir()
    repo_root = _get_repo_root()

    if not filename.endswith(".c"):
        filename = f"{filename}.c"

    with tempfile.TemporaryDirectory() as tmpdir:
        compat_include_dir = Path(tmpdir) / "compat_include"
        compat_pbio_dir = compat_include_dir / "pbio"
        compat_pbio_dir.mkdir(parents=True, exist_ok=True)
        (compat_pbio_dir / "motor.h").write_text('#include <pbio/dcmotor.h>\n', encoding="utf-8")

        source_path = Path(tmpdir) / filename
        output_path = Path(tmpdir) / "program.bin"
        source_path.write_text(source_code, encoding="utf-8")

        last_error: str | None = None

        for cmd_template in cmd_templates:
            command_str = cmd_template.format(
                src=str(source_path),
                out=str(output_path),
                workdir=tmpdir,
                include_dir=include_dir,
                compat_include_dir=str(compat_include_dir),
                repo_root=repo_root,
            )

            try:
                result = subprocess.run(
                    shlex.split(command_str),
                    capture_output=True,
                    text=True,
                    timeout=90,
                )
            except FileNotFoundError as error:
                last_error = f"Command not found: {error}"
                continue
            except subprocess.TimeoutExpired:
                last_error = "C compilation timed out"
                continue

            if result.returncode != 0:
                last_error = result.stderr.strip() or result.stdout.strip() or "Unknown compilation error"
                continue

            if output_path.exists():
                return output_path.read_bytes(), output_path.name, command_str

            last_error = "Output file was not produced by compile command"

        raise HTTPException(status_code=400, detail=f"C compilation failed: {last_error}")


@router.post("/check", response_model=SyntaxCheckResponse)
async def check_syntax(request: SyntaxCheckRequest):
    """Check Python syntax without compiling."""
    try:
        compile(request.source_code, "<string>", "exec")
        return SyntaxCheckResponse(valid=True)
    except SyntaxError as e:
        return SyntaxCheckResponse(
            valid=False,
            error=str(e.msg),
            line=e.lineno or 0,
            column=e.offset or 0,
        )


@router.post("/compile", response_model=CompileResponse)
async def compile_program(request: CompileRequest):
    """Compile Python source code to .mpy bytecode.
    
    Uses mpy-cross to cross-compile for Pybricks firmware.
    The compiled .mpy file can be uploaded to the hub.
    """
    # First check syntax
    try:
        compile(request.source_code, request.filename, "exec")
    except SyntaxError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Syntax error at line {e.lineno}: {e.msg}",
        )

    # Try to compile with mpy-cross
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            source_path = os.path.join(tmpdir, request.filename)
            output_path = os.path.join(
                tmpdir, request.filename.replace(".py", ".mpy")
            )

            # Write source file
            with open(source_path, "w") as f:
                f.write(request.source_code)

            # Run mpy-cross
            result = subprocess.run(
                ["mpy-cross", "-o", output_path, source_path],
                capture_output=True,
                text=True,
                timeout=30,
            )

            if result.returncode != 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Compilation failed: {result.stderr}",
                )

            if os.path.exists(output_path):
                size = os.path.getsize(output_path)
                return CompileResponse(
                    success=True,
                    message=f"Compiled successfully ({size} bytes)",
                    size=size,
                )
            else:
                return CompileResponse(
                    success=True,
                    message="Compiled successfully (size unknown)",
                )

    except FileNotFoundError:
        # mpy-cross not installed - fall back to syntax check only
        return CompileResponse(
            success=True,
            message="Syntax valid (mpy-cross not available for bytecode compilation)",
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Compilation timed out")


@router.post("/compile/download")
async def compile_and_download(request: CompileRequest):
    """Compile Python source and return the .mpy binary file."""
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            source_path = os.path.join(tmpdir, request.filename)
            output_path = os.path.join(
                tmpdir, request.filename.replace(".py", ".mpy")
            )

            with open(source_path, "w") as f:
                f.write(request.source_code)

            result = subprocess.run(
                ["mpy-cross", "-o", output_path, source_path],
                capture_output=True,
                text=True,
                timeout=30,
            )

            if result.returncode != 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Compilation failed: {result.stderr}",
                )

            with open(output_path, "rb") as f:
                content = f.read()

            return Response(
                content=content,
                media_type="application/octet-stream",
                headers={
                    "Content-Disposition": f'attachment; filename="{request.filename.replace(".py", ".mpy")}"'
                },
            )

    except FileNotFoundError:
        raise HTTPException(
            status_code=501,
            detail="mpy-cross is not installed. Install with: pip install mpy-cross",
        )


@router.post("/c/compile", response_model=CCompileResponse)
async def compile_c_program(request: CCompileRequest):
    """Compile C source code to a hub-loadable binary defined by PYBRICKS_C_COMPILE_CMD."""
    content, _, command_used = _run_c_compile(request.source_code, request.filename)
    return CCompileResponse(
        success=True,
        message=f"C compiled successfully ({len(content)} bytes) using: {command_used}",
        size=len(content),
    )


@router.get("/c/build-commands", response_model=CBuildCommandsResponse)
async def get_c_build_commands():
    """Get generated C build command templates based on c/examples style flow."""
    return CBuildCommandsResponse(
        repo_root=_get_repo_root(),
        include_dir=_get_include_dir(),
        pbio_config_dir=_get_pbio_config_dir(),
        commands=_generate_c_build_commands(),
    )


@router.post("/c/compile/download")
async def compile_c_and_download(request: CCompileRequest):
    """Compile C source and return produced binary bytes for BLE download."""
    content, output_name, command_used = _run_c_compile(request.source_code, request.filename)
    return Response(
        content=content,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{output_name}"',
            "X-Pybricks-C-Build-Command": command_used,
        },
    )
