import datetime
import random
from sqlalchemy.orm import Session

from app.models.vocabulary import Vocabulary
from app.models.user_word_history import UserWordHistory


# -----------------------------------------------------------
#  Check if user already has today’s assigned words
# -----------------------------------------------------------
def get_daily_words_for_user(db: Session, user_id: int):
    if not user_id:
        return None  # guest mode → always generate new

    today = datetime.date.today()

    rows = (
        db.query(UserWordHistory)
        .filter(UserWordHistory.user_id == user_id)
        .filter(UserWordHistory.date_assigned == today)
        .all()
    )

    if not rows:
        return None

    # Build list of vocabulary objects
    return [row.vocab for row in rows]


# -----------------------------------------------------------
#  Assign new daily words to user (or guest)
# -----------------------------------------------------------
def assign_daily_words(db: Session, user_id: int, level: str, limit: int):
    today = datetime.date.today()

    # 1 — Select unstudied words based on level
    words = (
        db.query(Vocabulary)
        .filter(Vocabulary.level == level)
        .limit(limit)
        .all()
    )

    if not words:
        return []

    entries = []
    for w in words:
        entries.append(
            UserWordHistory(
                user_id=user_id,
                word_id=w.id,
                served_date=today,     # <-- MUST NOT BE NULL
                completed=False
            )
        )

    db.add_all(entries)
    db.commit()

    return words
