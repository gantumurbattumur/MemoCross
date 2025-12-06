from pydantic import BaseModel, ConfigDict
from typing import Optional, List


class DailyWordsRequest(BaseModel):
    user_id: Optional[int] = None
    level: str = "a1"
    limit: int = 10


class WordOut(BaseModel):
    id: int
    word: str
    pos: str
    level: str
    definition: str
    translation_es: str | None
    translation_fr: str | None

    model_config = ConfigDict(from_attributes=True)
    
class DailyWordsResponse(BaseModel):
    date: str
    count: int
    words: List[WordOut]
