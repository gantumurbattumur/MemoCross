from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date
from app.core.db import get_db
from app.models.vocabulary import Vocabulary
from app.models.user_word_history import UserWordHistory
from typing import Optional
from app.core.security import optional_access_token
from sqlalchemy import func
router = APIRouter(prefix="/words", tags=["Words"])


@router.post("/daily")
def get_daily_words(
    db: Session = Depends(get_db),
    user: Optional[dict] = Depends(optional_access_token)   # <---- HERE
):

    # Not logged in -> just return random
    if user is None:
        return (
            db.query(Vocabulary)
            .order_by(func.random())
            .limit(10)
            .all()
        )

    user_id = user["user_id"]

    # Check today's saved words
    history = (
        db.query(UserWordHistory)
        .filter(
            UserWordHistory.user_id == user_id,
            UserWordHistory.served_date == date.today()
        )
        .all()
    )

    if history:
        return [
            db.query(Vocabulary).filter(Vocabulary.id == h.word_id).first()
            for h in history
        ]

    words = (
        db.query(Vocabulary)
        .order_by(func.random())
        .limit(10)
        .all()
    )

    # Save history
    for w in words:
        db.add(UserWordHistory(
            user_id=user_id,
            word_id=w.id,
            served_date=date.today(),
            completed=False
        ))

    db.commit()

    return words
