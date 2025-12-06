import os
import jwt
from datetime import datetime, timedelta
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer
from jwt.exceptions import DecodeError, InvalidTokenError  # adjusted for PyJWT

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

bearer_scheme = HTTPBearer()


# -----------------------------------------------------
# Create JWT token
# -----------------------------------------------------
def create_access_token(data: dict, expires_minutes: int = 60 * 24):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


# -----------------------------------------------------
# Verify JWT token
# -----------------------------------------------------
def verify_access_token(credentials=Depends(bearer_scheme)):
    token = credentials.credentials

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload

    except DecodeError:
        raise HTTPException(status_code=401, detail="Invalid token")

    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token verification failed")
