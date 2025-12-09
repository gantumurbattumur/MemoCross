from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import google.generativeai as genai
from google.api_core import exceptions as google_exceptions
from sqlalchemy.orm import Session
import base64
import os
import json
import hashlib
from typing import Optional, List, Dict, Any

from app.core.db import get_db
from app.models.mnemonic_cache import MnemonicCache

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
if API_KEY is None:
    raise RuntimeError("GEMINI_API_KEY environment variable is not set")

genai.configure(api_key=API_KEY)

router = APIRouter(prefix="/mnemonic", tags=["Mnemonic"])


def _hash_string(s: str) -> str:
    """Generate SHA256 hash of a string for cache keys."""
    return hashlib.sha256(s.lower().strip().encode()).hexdigest()


class MnemonicRequest(BaseModel):
    """Request schema for mnemonic generation."""
    word: str = Field(..., min_length=1, description="Word to create mnemonic for")
    definition: str = Field(..., min_length=1, description="Definition of the word")
    language: Optional[str] = Field(default=None, description="Language code ('es' or 'fr')")


class MnemonicResponse(BaseModel):
    """Response schema for mnemonic generation (legacy - kept for backward compatibility)."""
    mnemonic_word: str
    mnemonic_sentence: str
    image_base64: Optional[str] = None


class MnemonicTextResponse(BaseModel):
    """Response schema for text-only mnemonic generation."""
    mnemonic_word: str
    mnemonic_sentence: str
    cached: bool = False


class MnemonicImageResponse(BaseModel):
    """Response schema for image-only mnemonic generation."""
    image_base64: Optional[str] = None
    cached: bool = False


class MnemonicImageRequest(BaseModel):
    """Request schema for image generation (requires mnemonic text)."""
    word: str = Field(..., min_length=1, description="Word to create mnemonic for")
    definition: str = Field(..., min_length=1, description="Definition of the word")
    mnemonic_sentence: str = Field(..., min_length=1, description="Mnemonic sentence for image generation")
    language: Optional[str] = Field(default=None, description="Language code ('es' or 'fr')")


@router.post("/generate", response_model=MnemonicResponse)
async def generate_mnemonic(req: MnemonicRequest) -> MnemonicResponse:
    """
    Generate a mnemonic (memory aid) for a word using AI.
    
    Args:
        req: Request containing word and definition
    
    Returns:
        MnemonicResponse with mnemonic word, sentence, and optional image
    
    Raises:
        HTTPException: If AI service fails or returns invalid data
    """
    # ----------------------------------------------------------
    # 1. Generate mnemonic JSON
    # ----------------------------------------------------------
    prompt_text = f"""
    Create mnemonic JSON.

    Word: {req.word}
    Definition: {req.definition}

    STRICT OUTPUT:
    {{
      "mnemonic_word": "...",
      "mnemonic_sentence": "..."
    }}
    """

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        text_res = model.generate_content(contents=[prompt_text])
    except (google_exceptions.GoogleAPIError, Exception) as e:
        raise HTTPException(
            status_code=503,
            detail=f"Failed to generate mnemonic text: {str(e)}"
        )

    if not text_res or not text_res.text:
        raise HTTPException(
            status_code=503,
            detail="Empty response from AI service"
        )

    # Clean markdown
    raw = text_res.text.strip()
    raw = raw.replace("```json", "").replace("```", "")
    raw = raw.replace("**", "")
    raw = raw.strip()

    try:
        parsed = json.loads(raw)
        mnemonic_word = parsed.get("mnemonic_word")
        mnemonic_sentence = parsed.get("mnemonic_sentence")
        
        if not mnemonic_word or not mnemonic_sentence:
            raise ValueError("Missing required fields in response")
    except (json.JSONDecodeError, KeyError, ValueError) as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse mnemonic response: {str(e)}"
        )

    # ----------------------------------------------------------
    # 2. Generate image
    # ----------------------------------------------------------
    # Image should combine the mnemonic (for the word being learned) with the definition context
    prompt_image = (
        f"Funny colorful cartoon illustration representing the mnemonic: {mnemonic_sentence}. "
        f"This is a memory aid for the word '{req.word}' which means: {req.definition}. "
        "No text in the image. Highly visual and memorable. "
        "The illustration should help remember the word through the mnemonic connection."
    )

    image_base64 = None
    try:
        print(f"🖼️ Generating image in combined endpoint for word: {req.word}")
        try:
            img_model = genai.GenerativeModel("gemini-2.5-flash")
        except:
            img_model = genai.GenerativeModel("gemini-2.0-flash-exp")
        print(f"📝 Image prompt: {prompt_image[:100]}...")
        img_res = img_model.generate_content(prompt_image)
        print(f"✅ Image generation response received")

        # Extract raw bytes from inline_data
        if img_res and img_res.parts:
            print(f"📦 Checking {len(img_res.parts)} parts for image data")
            for part in img_res.parts:
                if part.inline_data is not None:
                    raw_bytes = part.inline_data.data
                    image_base64 = base64.b64encode(raw_bytes).decode("utf-8")
                    print(f"✅ Image extracted: {len(image_base64)} chars base64")
                    break
            else:
                print(f"⚠️ No inline_data found in response parts")
                if hasattr(img_res, 'text') and img_res.text:
                    print(f"📄 Response text: {img_res.text[:200]}")
        else:
            print(f"⚠️ No parts in response")
    except (google_exceptions.GoogleAPIError, Exception) as e:
        # Image generation failure is not critical in combined endpoint
        import logging
        error_msg = f"Image generation failed (non-critical): {str(e)}"
        logging.warning(error_msg)
        print(f"⚠️ {error_msg}")

    return MnemonicResponse(
        mnemonic_word=mnemonic_word,
        mnemonic_sentence=mnemonic_sentence,
        image_base64=image_base64
    )


@router.post("/generate-text", response_model=MnemonicTextResponse)
async def generate_mnemonic_text(
    req: MnemonicRequest,
    db: Session = Depends(get_db)
) -> MnemonicTextResponse:
    """
    Generate mnemonic text only (fast, ~2 seconds).
    Checks cache first, generates if not found.
    
    Args:
        req: Request containing word and definition
        db: Database session
    
    Returns:
        MnemonicTextResponse with mnemonic word and sentence
    """
    # Generate cache key
    word_hash = _hash_string(req.word)
    definition_hash = _hash_string(req.definition)
    language = req.language or "en"  # Default to 'en' if not specified
    
    # Check cache first
    cached = db.query(MnemonicCache).filter(
        MnemonicCache.word_hash == word_hash,
        MnemonicCache.language == language,
        MnemonicCache.definition_hash == definition_hash
    ).first()
    
    if cached and cached.mnemonic_word and cached.mnemonic_sentence:
        return MnemonicTextResponse(
            mnemonic_word=cached.mnemonic_word,
            mnemonic_sentence=cached.mnemonic_sentence,
            cached=True
        )
    
    # Generate mnemonic text
    prompt_text = f"""
    Create mnemonic JSON.

    Word: {req.word}
    Definition: {req.definition}

    STRICT OUTPUT:
    {{
      "mnemonic_word": "...",
      "mnemonic_sentence": "..."
    }}
    """

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        text_res = model.generate_content(contents=[prompt_text])
    except (google_exceptions.GoogleAPIError, Exception) as e:
        raise HTTPException(
            status_code=503,
            detail=f"Failed to generate mnemonic text: {str(e)}"
        )

    if not text_res or not text_res.text:
        raise HTTPException(
            status_code=503,
            detail="Empty response from AI service"
        )

    # Clean markdown
    raw = text_res.text.strip()
    raw = raw.replace("```json", "").replace("```", "")
    raw = raw.replace("**", "")
    raw = raw.strip()

    try:
        parsed = json.loads(raw)
        mnemonic_word = parsed.get("mnemonic_word")
        mnemonic_sentence = parsed.get("mnemonic_sentence")
        
        if not mnemonic_word or not mnemonic_sentence:
            raise ValueError("Missing required fields in response")
    except (json.JSONDecodeError, KeyError, ValueError) as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse mnemonic response: {str(e)}"
        )
    
    # Save to cache (without image for now)
    # Use merge to handle case where entry might already exist
    try:
        existing = db.query(MnemonicCache).filter(
            MnemonicCache.word_hash == word_hash,
            MnemonicCache.language == language,
            MnemonicCache.definition_hash == definition_hash
        ).first()
        
        if existing:
            # Update existing entry
            existing.mnemonic_word = mnemonic_word
            existing.mnemonic_sentence = mnemonic_sentence
        else:
            # Create new entry
            cache_entry = MnemonicCache(
                word_hash=word_hash,
                language=language,
                definition_hash=definition_hash,
                mnemonic_word=mnemonic_word,
                mnemonic_sentence=mnemonic_sentence,
                image_base64=None  # Image will be added later
            )
            db.add(cache_entry)
        db.commit()
    except Exception as e:
        # If cache save fails, continue anyway (not critical)
        db.rollback()
        import logging
        logging.warning(f"Failed to cache mnemonic: {str(e)}")

    return MnemonicTextResponse(
        mnemonic_word=mnemonic_word,
        mnemonic_sentence=mnemonic_sentence,
        cached=False
    )


@router.post("/generate-image", response_model=MnemonicImageResponse)
async def generate_mnemonic_image(
    req: MnemonicImageRequest,
    db: Session = Depends(get_db)
) -> MnemonicImageResponse:
    """
    Generate mnemonic image only (slower, ~8 seconds).
    Checks cache first, generates if not found.
    
    Args:
        req: Request containing word, definition, and mnemonic sentence
        db: Database session
    
    Returns:
        MnemonicImageResponse with base64 image
    """
    # Generate cache key
    word_hash = _hash_string(req.word)
    definition_hash = _hash_string(req.definition)
    language = req.language or "en"  # Default to 'en' if not specified
    
    # Check cache first
    cached = db.query(MnemonicCache).filter(
        MnemonicCache.word_hash == word_hash,
        MnemonicCache.language == language,
        MnemonicCache.definition_hash == definition_hash
    ).first()
    
    if cached and cached.image_base64:
        return MnemonicImageResponse(
            image_base64=cached.image_base64,
            cached=True
        )
    
    # Generate image
    prompt_image = (
        f"Funny colorful cartoon illustration representing the mnemonic: {req.mnemonic_sentence}. "
        f"This is a memory aid for the word '{req.word}' which means: {req.definition}. "
        "No text in the image. Highly visual and memorable. "
        "The illustration should help remember the word through the mnemonic connection."
    )

    image_base64 = None
    try:
        print(f"🖼️ Generating image for word: {req.word}")
        # Use gemini-2.5-flash as the user confirmed it works locally
        try:
            img_model = genai.GenerativeModel("gemini-2.5-flash")
        except Exception as model_err:
            print(f"⚠️ Model gemini-2.5-flash not available, trying alternatives: {model_err}")
            # Fallback options
            try:
                img_model = genai.GenerativeModel("gemini-2.0-flash-exp")
            except:
                try:
                    img_model = genai.GenerativeModel("gemini-1.5-flash")
                except:
                    img_model = genai.GenerativeModel("gemini-pro")
        
        print(f"📝 Image prompt: {prompt_image[:100]}...")
        img_res = img_model.generate_content(prompt_image)
        print(f"✅ Image generation response received, type: {type(img_res)}")

        # Extract raw bytes from inline_data
        if img_res and img_res.parts:
            print(f"📦 Checking {len(img_res.parts)} parts for image data")
            for i, part in enumerate(img_res.parts):
                print(f"  Part {i}: has inline_data={part.inline_data is not None}")
                if part.inline_data is not None:
                    print(f"  Part {i}: mime_type={part.inline_data.mime_type}")
                    print(f"  Part {i}: data type={type(part.inline_data.data)}, length={len(part.inline_data.data) if part.inline_data.data else 0}")
                    
                    # Try different ways to extract the data
                    if part.inline_data.data:
                        # Data might be bytes or base64 string
                        if isinstance(part.inline_data.data, bytes):
                            raw_bytes = part.inline_data.data
                            image_base64 = base64.b64encode(raw_bytes).decode("utf-8")
                            print(f"✅ Image extracted from bytes: {len(image_base64)} chars base64")
                        elif isinstance(part.inline_data.data, str):
                            # Already a base64 string or needs encoding
                            try:
                                # Try to decode if it's base64, otherwise encode it
                                base64.b64decode(part.inline_data.data)
                                image_base64 = part.inline_data.data
                                print(f"✅ Image extracted from string (already base64): {len(image_base64)} chars")
                            except:
                                # Not base64, encode it
                                image_base64 = base64.b64encode(part.inline_data.data.encode()).decode("utf-8")
                                print(f"✅ Image extracted from string (encoded): {len(image_base64)} chars base64")
                        else:
                            # Try to convert to bytes
                            raw_bytes = bytes(part.inline_data.data)
                            image_base64 = base64.b64encode(raw_bytes).decode("utf-8")
                            print(f"✅ Image extracted (converted to bytes): {len(image_base64)} chars base64")
                        
                        if image_base64 and len(image_base64) > 0:
                            break
                    
            if not image_base64 or len(image_base64) == 0:
                print(f"⚠️ No image data extracted from parts")
                # Check if response has text (maybe error message)
                if hasattr(img_res, 'text') and img_res.text:
                    print(f"📄 Response text: {img_res.text[:500]}")
                    
                    # Try to extract base64 from text if it's in the response
                    import re
                    base64_match = re.search(r'data:image/[^;]+;base64,([A-Za-z0-9+/=]+)', img_res.text)
                    if base64_match:
                        image_base64 = base64_match.group(1)
                        print(f"✅ Extracted base64 from response text: {len(image_base64)} chars")
        else:
            print(f"⚠️ No parts in response, response: {img_res}")
            
        if not image_base64 or len(image_base64) == 0:
            raise ValueError(f"Image generation returned empty data. Response had {len(img_res.parts) if img_res and img_res.parts else 0} parts.")
            
    except (google_exceptions.GoogleAPIError, Exception) as e:
        # Image generation failure - log and raise
        import logging
        error_msg = f"Image generation failed: {str(e)}"
        logging.error(error_msg, exc_info=True)
        print(f"❌ {error_msg}")
        print(f"❌ Exception type: {type(e).__name__}")
        print(f"❌ Full traceback:")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=503,
            detail=f"Image generation is currently unavailable. Gemini models analyze images but don't generate them. {str(e)}"
        )
    
    # Update cache with image
    if image_base64:
        try:
            # Find or create cache entry
            cache_entry = db.query(MnemonicCache).filter(
                MnemonicCache.word_hash == word_hash,
                MnemonicCache.language == language,
                MnemonicCache.definition_hash == definition_hash
            ).first()
            
            if cache_entry:
                # Update existing cache entry with image
                cache_entry.image_base64 = image_base64
            else:
                # Create new cache entry (edge case - text endpoint wasn't called first)
                cache_entry = MnemonicCache(
                    word_hash=word_hash,
                    language=language,
                    definition_hash=definition_hash,
                    mnemonic_word="",  # Empty if text wasn't generated first
                    mnemonic_sentence=req.mnemonic_sentence,
                    image_base64=image_base64
                )
                db.add(cache_entry)
            db.commit()
        except Exception as e:
            # If cache update fails, continue anyway (not critical)
            db.rollback()
            import logging
            logging.warning(f"Failed to update cache with image: {str(e)}")

    return MnemonicImageResponse(
        image_base64=image_base64,
        cached=False
    )


class CachedMnemonicRequest(BaseModel):
    """Request schema for fetching cached mnemonics."""
    word: str = Field(..., min_length=1, description="Word to look up")
    definition: str = Field(..., min_length=1, description="Definition of the word")
    language: str = Field(..., min_length=1, description="Language code ('es' or 'fr')")


class CachedMnemonicResponse(BaseModel):
    """Response schema for cached mnemonic data."""
    word: str
    definition: str
    language: str
    mnemonic_word: Optional[str] = None
    mnemonic_sentence: Optional[str] = None
    image_base64: Optional[str] = None
    found: bool = False


class BulkCachedMnemonicRequest(BaseModel):
    """Request schema for fetching multiple cached mnemonics."""
    words: List[CachedMnemonicRequest] = Field(..., description="List of words to look up")


class BulkCachedMnemonicResponse(BaseModel):
    """Response schema for bulk cached mnemonic data."""
    results: List[CachedMnemonicResponse]


@router.post("/get-cached", response_model=BulkCachedMnemonicResponse)
async def get_cached_mnemonics(
    req: BulkCachedMnemonicRequest,
    db: Session = Depends(get_db)
) -> BulkCachedMnemonicResponse:
    """
    Fetch cached mnemonics for multiple words.
    Useful for displaying word history with images.
    
    Args:
        req: Request containing list of words to look up
        db: Database session
    
    Returns:
        BulkCachedMnemonicResponse with cached mnemonic data for each word
    """
    results = []
    
    for word_req in req.words:
        # Generate cache key
        word_hash = _hash_string(word_req.word)
        definition_hash = _hash_string(word_req.definition)
        language = word_req.language.lower()
        
        # Look up in cache
        cached = db.query(MnemonicCache).filter(
            MnemonicCache.word_hash == word_hash,
            MnemonicCache.language == language,
            MnemonicCache.definition_hash == definition_hash
        ).first()
        
        if cached:
            results.append(CachedMnemonicResponse(
                word=word_req.word,
                definition=word_req.definition,
                language=word_req.language,
                mnemonic_word=cached.mnemonic_word if cached.mnemonic_word else None,
                mnemonic_sentence=cached.mnemonic_sentence if cached.mnemonic_sentence else None,
                image_base64=cached.image_base64 if cached.image_base64 else None,
                found=True
            ))
        else:
            results.append(CachedMnemonicResponse(
                word=word_req.word,
                definition=word_req.definition,
                language=word_req.language,
                found=False
            ))
    
    return BulkCachedMnemonicResponse(results=results)
