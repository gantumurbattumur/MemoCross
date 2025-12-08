from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from app.core.db import get_db
from app.models.vocabulary import Vocabulary
from app.services.crossword_service import generate_crossword
from sqlalchemy import func
router = APIRouter(prefix="/crossword", tags=["Crossword"])


@router.post("/today")
def crossword_today(payload: dict, db: Session = Depends(get_db)):

    limit = payload.get("limit", 10)

    # random 10 words
    words = (
        db.query(Vocabulary)
        .order_by(func.random())
        .limit(limit)
        .all()
    )

    if not words:
        raise HTTPException(404, "No words found")

    formatted = [
        {
            "word": w.word.upper(),
            "clue": w.definition
        }
        for w in words
    ]

    result = generate_crossword(formatted)

    grid = result["grid"]
    placements = result["placements"]

    clues = []
    for idx, (w, p) in enumerate(zip(formatted, placements)):
        clues.append({
            "number": idx + 1,
            "direction": p["direction"].lower(),
            "clue": w["clue"],
            "answer": w["word"],
            "row": p["row"],
            "col": p["col"]
        })

    return {"grid": grid, "words": clues}
