from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional, List
from app.core.db import get_db
from app.models.vocabulary import Vocabulary
from app.models.user_word_history import UserWordHistory
from app.core.security import optional_access_token
from app.schemas.words import DailyWordsRequest, DailyWordsResponse, WordOut
from app.services.word_service import get_daily_words_for_user, assign_daily_words
from sqlalchemy import func

router = APIRouter(prefix="/words", tags=["Words"])


def get_random_words(db: Session, limit: int = 10, level: Optional[str] = None) -> List[Vocabulary]:
    """
    Get random words from database (database-agnostic approach).
    
    Args:
        db: Database session
        limit: Number of words to return
        level: Optional difficulty level filter (a1, a2, b1, b2)
    
    Returns:
        List of random Vocabulary objects
    """
    query = db.query(Vocabulary)
    
    # Filter by level if provided
    if level:
        query = query.filter(Vocabulary.level == level)
    
    # Check total count for debugging
    total_count = query.count()
    print(f"🔍 Database query: level={level}, total words matching={total_count}")
    
    if total_count == 0:
        print(f"⚠️ WARNING: No words found with level={level}")
        # Try without level filter to see if any words exist
        all_count = db.query(Vocabulary).count()
        print(f"🔍 Total words in database (all levels): {all_count}")
        return []
    
    # Try PostgreSQL/SQLite random(), fallback to Python random if needed
    try:
        words = (
            query
            .order_by(func.random())
            .limit(limit)
            .all()
        )
        print(f"✅ Retrieved {len(words)} words from database")
        return words
    except Exception as e:
        print(f"❌ Error in get_random_words: {e}")
        # Fallback: get all and shuffle in Python (not ideal for large datasets)
        import random
        all_words = query.all()
        return random.sample(all_words, min(limit, len(all_words)))


@router.post("/daily", response_model=DailyWordsResponse)
def get_daily_words(
    request: DailyWordsRequest = DailyWordsRequest(),
    db: Session = Depends(get_db),
    user: Optional[dict] = Depends(optional_access_token)
) -> DailyWordsResponse:
    """
    Get daily words for user. Returns cached words if available for today,
    otherwise generates and saves new words.
    
    Args:
        request: Optional request body with level and limit
        db: Database session
        user: Optional authenticated user dict
    
    Returns:
        DailyWordsResponse with words for today
    """
    # Extract level from request body or use default
    level = request.level if request.level else "a1"
    limit = request.limit if request.limit else 10
    
    print(f"📥 /words/daily request: level={level}, limit={limit}, user={user is not None}")
    
    today = date.today()
    
    # Not logged in -> use deterministic words for first 3, random for rest
    if user is None:
        print(f"👤 Guest mode: fetching {limit} words at level {level}")
        
        # Get language from request if available, default to 'es'
        # Note: The frontend should pass language in the request
        # For now, we'll use a default, but deterministic words are same regardless of language
        # (the mnemonics are language-specific, but the English words are the same)
        from app.services.pre_generation import get_deterministic_words
        
        # Use deterministic selection (words are same, mnemonics differ by language)
        # Pre-generate 10 words for better UX (can reduce to 3 later to save costs)
        deterministic_words = get_deterministic_words(db, "es", level, limit=10)
        print(f"📌 Deterministic words for level {level}: {[w.word for w in deterministic_words]}")
        
        # Use deterministic words directly (we now pre-generate 10 words)
        # This ensures all 10 words have pre-generated mnemonics for instant loading
        words = deterministic_words[:limit] if len(deterministic_words) >= limit else deterministic_words
        
        # If we don't have enough deterministic words, fill with random (fallback)
        if len(words) < limit:
            print(f"⚠️ Warning: Only got {len(deterministic_words)} deterministic words, filling with random")
            remaining_needed = limit - len(words)
            random_words = get_random_words(db, limit=remaining_needed + 20, level=level)
            deterministic_ids = {w.id for w in deterministic_words}
            random_words = [w for w in random_words if w.id not in deterministic_ids]
            words.extend(random_words[:remaining_needed])
            words = words[:limit]
        
        print(f"✅ Found {len(words)} words in database ({len(deterministic_words)} deterministic)")
        print(f"   First 10 words: {[w.word for w in words[:10]]}")
        
        return DailyWordsResponse(
            date=today.isoformat(),
            count=len(words),
            words=[WordOut.model_validate(w) for w in words]
        )

    user_id = user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid user token")

    # Check if user already has today's words
    existing_words = get_daily_words_for_user(db, user_id)
    
    if existing_words:
        # Filter by level if specified
        if level:
            existing_words = [w for w in existing_words if w.level == level]
        # If we have enough words of the requested level, return them
        if len(existing_words) >= 10:
            existing_words = existing_words[:10]
            return DailyWordsResponse(
                date=today.isoformat(),
                count=len(existing_words),
                words=[WordOut.model_validate(w) for w in existing_words]
            )
        # If we have some words but not enough, we'll generate new ones below

    # For authenticated users, use deterministic words for first 10
    # This ensures they get pre-generated mnemonics for instant loading
    from app.services.pre_generation import get_deterministic_words
    
    print(f"👤 Authenticated user: using deterministic words for first 10")
    deterministic_words = get_deterministic_words(db, "es", level, limit=10)
    print(f"📌 Deterministic words for level {level}: {[w.word for w in deterministic_words]}")
    
    # Use deterministic words directly (we now pre-generate 10 words)
    # This ensures all words have pre-generated mnemonics
    words = deterministic_words[:limit] if len(deterministic_words) >= limit else deterministic_words
    
    # Fallback: if we don't have enough, fill with random
    if len(words) < limit:
        remaining_needed = limit - len(words)
        random_words = get_random_words(db, limit=remaining_needed + 20, level=level)
        deterministic_ids = {w.id for w in deterministic_words}
        random_words = [w for w in random_words if w.id not in deterministic_ids]
        words.extend(random_words[:remaining_needed])
        words = words[:limit]
    
    # Save these words to user history
    entries = []
    for w in words:
        entries.append(
            UserWordHistory(
                user_id=user_id,
                word_id=w.id,
                served_date=today,
                completed=False
            )
        )
    
    db.add_all(entries)
    db.commit()
    
    print(f"✅ Found {len(words)} words for authenticated user ({len(deterministic_words)} deterministic)")

    return DailyWordsResponse(
        date=today.isoformat(),
        count=len(words),
        words=[WordOut.model_validate(w) for w in words]
    )
