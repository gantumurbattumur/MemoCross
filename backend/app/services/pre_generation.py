"""
Service for pre-generating mnemonics for the first 10 words of each language/level combination.
This ensures fast loading for visitors.

Note: Currently set to 10 words for better initial UX. After first week, consider reducing to 3
words to save on API costs while still providing good experience.
"""
import hashlib
from datetime import date
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.vocabulary import Vocabulary
from app.models.mnemonic_cache import MnemonicCache
import google.generativeai as genai
import base64
import json
import os
from google.api_core import exceptions as google_exceptions


def _hash_string(s: str) -> str:
    """Generate SHA256 hash of a string for cache keys."""
    return hashlib.sha256(s.lower().strip().encode()).hexdigest()


def get_deterministic_words(
    db: Session,
    language: str,  # Not used for selection, only for documentation
    level: str,
    limit: int = 3
) -> List[Vocabulary]:
    """
    Get deterministic words for a level.
    Uses date + level as seed to ensure same English words for everyone.
    Language doesn't affect word selection - only affects which translation/mnemonic to use.
    
    Args:
        db: Database session
        language: Language code ('es' or 'fr') - not used for selection, kept for API compatibility
        level: Difficulty level ('a1', 'a2', 'b1', 'b2')
        limit: Number of words to return (default 3)
    
    Returns:
        List of Vocabulary objects (same English words regardless of language)
    """
    today = date.today()
    
    # Create a deterministic seed from date + level only
    # Language doesn't affect which English words are selected
    seed_string = f"{today.isoformat()}-{level}"
    seed_hash = int(hashlib.md5(seed_string.encode()).hexdigest(), 16)
    
    # Get all words for this level
    query = db.query(Vocabulary).filter(Vocabulary.level == level)
    all_words = query.order_by(Vocabulary.id).all()
    
    if not all_words:
        return []
    
    # Use seed to deterministically select words
    import random
    random.seed(seed_hash)
    selected_words = random.sample(all_words, min(limit, len(all_words)))
    
    # Sort by ID to ensure consistent order
    selected_words.sort(key=lambda w: w.id)
    
    return selected_words[:limit]


async def pre_generate_mnemonic_text(
    word: Vocabulary,
    language: str
) -> tuple[str, str]:
    """
    Generate mnemonic text for a word.
    
    Returns:
        Tuple of (mnemonic_word, mnemonic_sentence)
    """
    # Get translation based on language
    translation = word.translation_es if language == "es" else word.translation_fr
    if not translation:
        translation = word.word  # Fallback to word itself
    
    prompt_text = f"""
    Create mnemonic JSON.

    Word: {translation}
    Definition: {word.definition}

    STRICT OUTPUT:
    {{
      "mnemonic_word": "...",
      "mnemonic_sentence": "..."
    }}
    """
    
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        text_res = model.generate_content(contents=[prompt_text])
        
        if not text_res or not text_res.text:
            raise ValueError("Empty response from AI service")
        
        # Clean markdown
        raw = text_res.text.strip()
        raw = raw.replace("```json", "").replace("```", "")
        raw = raw.replace("**", "")
        raw = raw.strip()
        
        parsed = json.loads(raw)
        mnemonic_word = parsed.get("mnemonic_word")
        mnemonic_sentence = parsed.get("mnemonic_sentence")
        
        if not mnemonic_word or not mnemonic_sentence:
            raise ValueError("Missing required fields in response")
        
        return mnemonic_word, mnemonic_sentence
    except Exception as e:
        print(f"❌ Error generating mnemonic text for {word.word}: {e}")
        raise


async def pre_generate_mnemonic_image(
    word: Vocabulary,
    mnemonic_sentence: str,
    language: str
) -> str | None:
    """
    Generate mnemonic image for a word.
    
    Returns:
        Base64 encoded image string, or None if generation fails
    """
    translation = word.translation_es if language == "es" else word.translation_fr
    if not translation:
        translation = word.word
    
    prompt_image = (
        f"Funny colorful cartoon illustration representing the mnemonic: {mnemonic_sentence}. "
        f"This is a memory aid for the word '{translation}' which means: {word.definition}. "
        "No text in the image. Highly visual and memorable. "
        "The illustration should help remember the word through the mnemonic connection."
    )
    
    try:
        img_model = genai.GenerativeModel("gemini-2.5-flash-image")
        img_res = img_model.generate_content(prompt_image)
        
        if img_res and img_res.parts:
            for part in img_res.parts:
                if part.inline_data is not None and part.inline_data.data:
                    if isinstance(part.inline_data.data, bytes):
                        raw_bytes = part.inline_data.data
                        image_base64 = base64.b64encode(raw_bytes).decode("utf-8")
                        return image_base64
        
        return None
    except Exception as e:
        print(f"⚠️ Error generating image for {word.word}: {e}")
        return None


async def pre_generate_for_combination(
    db: Session,
    language: str,
    level: str
) -> dict:
    """
    Pre-generate mnemonics for the first 10 words of a language/level combination.
    (Increased from 3 for better initial UX - can reduce back to 3 after first week to save costs)
    
    Returns:
        Dict with stats about what was generated
    """
    print(f"🔄 Pre-generating for {language}/{level}...")
    
    # Get deterministic words
    # Pre-generate first 10 words (increased from 3 for better initial UX)
    # TODO: After first week, reduce back to 3 to save costs
    words = get_deterministic_words(db, language, level, limit=10)
    
    if not words:
        print(f"⚠️ No words found for {language}/{level}")
        return {"language": language, "level": level, "words_processed": 0, "cached": 0, "generated": 0, "errors": 0}
    
    stats = {
        "language": language,
        "level": level,
        "words_processed": len(words),
        "cached": 0,
        "generated": 0,
        "errors": 0
    }
    
    for word in words:
        try:
            # Get translation
            translation = word.translation_es if language == "es" else word.translation_fr
            if not translation:
                translation = word.word
            
            # Generate cache keys
            word_hash = _hash_string(translation)
            definition_hash = _hash_string(word.definition)
            
            # Check if already cached
            cached = db.query(MnemonicCache).filter(
                MnemonicCache.word_hash == word_hash,
                MnemonicCache.language == language,
                MnemonicCache.definition_hash == definition_hash
            ).first()
            
            if cached and cached.mnemonic_word and cached.mnemonic_sentence and cached.image_base64:
                print(f"  ✅ {word.word}: Already cached")
                stats["cached"] += 1
                continue
            
            # Generate mnemonic text
            print(f"  📝 Generating text for {word.word}...")
            mnemonic_word, mnemonic_sentence = await pre_generate_mnemonic_text(word, language)
            
            # Generate mnemonic image
            print(f"  🖼️ Generating image for {word.word}...")
            image_base64 = await pre_generate_mnemonic_image(word, mnemonic_sentence, language)
            
            # Save to cache
            if cached:
                # Update existing
                cached.mnemonic_word = mnemonic_word
                cached.mnemonic_sentence = mnemonic_sentence
                if image_base64:
                    cached.image_base64 = image_base64
            else:
                # Create new
                cache_entry = MnemonicCache(
                    word_hash=word_hash,
                    language=language,
                    definition_hash=definition_hash,
                    mnemonic_word=mnemonic_word,
                    mnemonic_sentence=mnemonic_sentence,
                    image_base64=image_base64
                )
                db.add(cache_entry)
            
            db.commit()
            print(f"  ✅ {word.word}: Generated and cached")
            stats["generated"] += 1
            
        except Exception as e:
            print(f"  ❌ Error processing {word.word}: {e}")
            stats["errors"] += 1
            db.rollback()
    
    return stats


async def pre_generate_all_combinations(db: Session) -> dict:
    """
    Pre-generate mnemonics for all language/level combinations.
    
    Returns:
        Dict with overall stats
    """
    languages = ["es", "fr"]
    levels = ["a1", "a2", "b1", "b2"]
    
    print(f"🚀 Starting pre-generation for {len(languages) * len(levels)} combinations...")
    
    all_stats = []
    for language in languages:
        for level in levels:
            stats = await pre_generate_for_combination(db, language, level)
            all_stats.append(stats)
    
    total_stats = {
        "total_combinations": len(all_stats),
        "total_words_processed": sum(s["words_processed"] for s in all_stats),
        "total_cached": sum(s["cached"] for s in all_stats),
        "total_generated": sum(s["generated"] for s in all_stats),
        "total_errors": sum(s["errors"] for s in all_stats),
        "combinations": all_stats
    }
    
    print(f"✅ Pre-generation complete!")
    print(f"   Processed: {total_stats['total_words_processed']} words")
    print(f"   Cached: {total_stats['total_cached']}")
    print(f"   Generated: {total_stats['total_generated']}")
    print(f"   Errors: {total_stats['total_errors']}")
    
    return total_stats

