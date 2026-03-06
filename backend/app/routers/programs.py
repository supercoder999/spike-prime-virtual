"""Program management API - CRUD operations for Python programs (Firestore)."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid

from ..firestore import get_db

router = APIRouter()

COLLECTION = "programs"


class ProgramCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    python_code: str = ""
    blockly_xml: str = ""
    mode: str = Field(default="python", pattern="^(python|blocks)$")


class ProgramUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    python_code: Optional[str] = None
    blockly_xml: Optional[str] = None
    mode: Optional[str] = Field(None, pattern="^(python|blocks)$")


class ProgramResponse(BaseModel):
    id: str
    name: str
    python_code: str
    blockly_xml: str
    mode: str
    created_at: str
    updated_at: str


@router.get("/", response_model=List[ProgramResponse])
async def list_programs():
    """List all saved programs."""
    db = get_db()
    docs = db.collection(COLLECTION).order_by("created_at").stream()
    programs = [doc.to_dict() async for doc in docs]
    return programs


@router.get("/{program_id}", response_model=ProgramResponse)
async def get_program(program_id: str):
    """Get a specific program by ID."""
    db = get_db()
    doc = await db.collection(COLLECTION).document(program_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Program not found")
    return doc.to_dict()


@router.post("/", response_model=ProgramResponse, status_code=201)
async def create_program(program: ProgramCreate):
    """Create a new program."""
    db = get_db()
    program_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    program_data = {
        "id": program_id,
        "name": program.name,
        "python_code": program.python_code,
        "blockly_xml": program.blockly_xml,
        "mode": program.mode,
        "created_at": now,
        "updated_at": now,
    }
    await db.collection(COLLECTION).document(program_id).set(program_data)
    return program_data


@router.put("/{program_id}", response_model=ProgramResponse)
async def update_program(program_id: str, program: ProgramUpdate):
    """Update an existing program."""
    db = get_db()
    doc_ref = db.collection(COLLECTION).document(program_id)
    doc = await doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Program not found")

    update_data = program.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow().isoformat()
    await doc_ref.update(update_data)

    updated_doc = await doc_ref.get()
    return updated_doc.to_dict()


@router.delete("/{program_id}")
async def delete_program(program_id: str):
    """Delete a program."""
    db = get_db()
    doc_ref = db.collection(COLLECTION).document(program_id)
    doc = await doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Program not found")
    await doc_ref.delete()
    return {"message": "Program deleted"}
