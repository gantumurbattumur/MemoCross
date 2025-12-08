from fastapi import APIRouter, HTTPException, Depends
from google.oauth2 import id_token
from google.auth.transport import requests
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.user import User
from app.core.security import create_access_token
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")


@router.post("/google/verify")
def google_verify(payload: dict, db: Session = Depends(get_db)):

    token_str = payload.get("id_token")
    if not token_str:
        raise HTTPException(400, "Missing id_token")

    try:
        info = id_token.verify_oauth2_token(
            token_str, requests.Request(), GOOGLE_CLIENT_ID
        )
    except Exception:
        raise HTTPException(401, "Invalid Google token")

    google_id = info["sub"]
    email = info.get("email")
    name = info.get("name")

    user = db.query(User).filter(User.google_id == google_id).first()

    if not user:
        user = User(
            google_id=google_id,
            email=email,
            name=name,
            profile_picture=info.get("picture")
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    jwt_token = create_access_token({"user_id": user.id})
    return {"token": jwt_token, "user": user}
