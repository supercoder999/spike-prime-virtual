"""Public C API symbol extraction for Pybricks headers."""

from __future__ import annotations

from pathlib import Path
import os
import re
from typing import Dict, List, Tuple

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

DEFAULT_INCLUDE_DIR = "/home/thanh/Documents/pybricks-micropython/c/include"


class CApiSymbol(BaseModel):
    name: str
    signature: str
    header: str


class CApiSymbolsResponse(BaseModel):
    include_dir: str
    headers_scanned: int
    functions: List[CApiSymbol]
    macros: List[CApiSymbol]
    types: List[CApiSymbol]


def _strip_comments(source: str) -> str:
    source = re.sub(r"/\*.*?\*/", "", source, flags=re.DOTALL)
    source = re.sub(r"//.*?$", "", source, flags=re.MULTILINE)
    return source


def _extract_functions(cleaned: str, header: str) -> List[CApiSymbol]:
    symbols: List[CApiSymbol] = []
    pattern = re.compile(
        r"^[ \t]*(?!typedef\b)(?!static\b)(?!#)([^;{}\n]*?\b([A-Za-z_]\w*)\s*\([^;{}]*\))\s*;",
        flags=re.MULTILINE,
    )
    for match in pattern.finditer(cleaned):
        signature = " ".join(match.group(1).split())
        name = match.group(2)
        if name in {"if", "for", "while", "switch", "return"}:
            continue
        symbols.append(CApiSymbol(name=name, signature=signature, header=header))
    return symbols


def _extract_macros(cleaned: str, header: str) -> List[CApiSymbol]:
    symbols: List[CApiSymbol] = []
    pattern = re.compile(r"^[ \t]*#define[ \t]+([A-Za-z_]\w*)\b(.*)$", flags=re.MULTILINE)
    for match in pattern.finditer(cleaned):
        name = match.group(1)
        tail = " ".join(match.group(2).split())
        signature = f"#define {name}{(' ' + tail) if tail else ''}"
        symbols.append(CApiSymbol(name=name, signature=signature, header=header))
    return symbols


def _extract_typedef_name(statement: str) -> str | None:
    head = statement.strip().rstrip(";").strip()
    head = re.sub(r"\[[^\]]*\]$", "", head).strip()
    match = re.search(r"([A-Za-z_]\w*)\s*$", head)
    if not match:
        return None
    return match.group(1)


def _extract_types(cleaned: str, header: str) -> List[CApiSymbol]:
    symbols: List[CApiSymbol] = []
    for raw in cleaned.split(";"):
        statement = " ".join(raw.split())
        if not statement.startswith("typedef "):
            continue
        name = _extract_typedef_name(statement)
        if not name:
            continue
        symbols.append(CApiSymbol(name=name, signature=f"{statement};", header=header))
    return symbols


def _dedupe(items: List[CApiSymbol]) -> List[CApiSymbol]:
    deduped: Dict[Tuple[str, str, str], CApiSymbol] = {}
    for item in items:
        key = (item.name, item.signature, item.header)
        deduped[key] = item
    return sorted(deduped.values(), key=lambda item: (item.name, item.header))


@router.get("/symbols", response_model=CApiSymbolsResponse)
async def get_c_api_symbols():
    """Return public C API symbols parsed from header files in the include directory."""
    include_dir = os.getenv("PYBRICKS_C_INCLUDE_DIR", DEFAULT_INCLUDE_DIR)
    include_path = Path(include_dir)

    if not include_path.exists() or not include_path.is_dir():
        raise HTTPException(
            status_code=404,
            detail=(
                f"C include directory not found: {include_dir}. "
                "Set PYBRICKS_C_INCLUDE_DIR to override."
            ),
        )

    headers = sorted(include_path.rglob("*.h"))
    if not headers:
        raise HTTPException(status_code=404, detail=f"No header files found in: {include_dir}")

    all_functions: List[CApiSymbol] = []
    all_macros: List[CApiSymbol] = []
    all_types: List[CApiSymbol] = []

    for header_path in headers:
        rel_header = str(header_path.relative_to(include_path))
        content = header_path.read_text(encoding="utf-8", errors="ignore")
        cleaned = _strip_comments(content)

        all_functions.extend(_extract_functions(cleaned, rel_header))
        all_macros.extend(_extract_macros(cleaned, rel_header))
        all_types.extend(_extract_types(cleaned, rel_header))

    return CApiSymbolsResponse(
        include_dir=include_dir,
        headers_scanned=len(headers),
        functions=_dedupe(all_functions),
        macros=_dedupe(all_macros),
        types=_dedupe(all_types),
    )