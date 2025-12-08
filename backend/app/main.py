from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import words, crossword, auth, mnemonic
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="EaseeVocab API",
    description="API for vocabulary learning with crosswords and mnemonics",
    version="1.0.0"
)

# CORS configuration - use environment variable for production
cors_origins = os.getenv("CORS_ORIGINS", "*").split(",")
if cors_origins == ["*"]:
    # Development mode - allow all origins
    allow_origins = ["*"]
else:
    # Production mode - specific origins
    allow_origins = [origin.strip() for origin in cors_origins]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(words.router)
app.include_router(crossword.router)
app.include_router(auth.router)
app.include_router(mnemonic.router)


@app.get("/")
def root():
    """Root endpoint to verify API is running."""
    return {"message": "EaseeVocab API running"}
