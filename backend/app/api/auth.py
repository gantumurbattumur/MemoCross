from fastapi import APIRouter, HTTPException
from google.oauth2 import id_token
from google.auth.transport import requests
from sqlalchemy.orm import Session
from fastapi import Depends
from app.core.db import get_db
from app.models.user import User
from app.core.security import create_access_token, verify_access_token
import os

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")


@router.post("/google")
def google_login(payload: dict, db: Session = Depends(get_db)):
    id_token_str = payload.get("id_token")
    if not id_token_str:
        raise HTTPException(status_code=400, detail="Missing id_token")

    try:
        # Verify token with Google
        info = id_token.verify_oauth2_token(
            id_token_str,
            requests.Request(),
            GOOGLE_CLIENT_ID
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    google_id = info["sub"]
    email = info.get("email")
    name = info.get("name")
    picture = info.get("picture")

    # Check user existence
    user = db.query(User).filter(User.google_id == google_id).first()

    if not user:
        user = User(
            google_id=google_id,
            email=email,
            name=name,
            profile_picture=picture
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Create JWT for frontend
    token = create_access_token({"user_id": user.id})

    return {
        "access_token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "profile_picture": user.profile_picture
        }
    }

@router.get("/me")
def get_me(token_data: dict = Depends(verify_access_token), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == token_data["user_id"]).first()
    return user