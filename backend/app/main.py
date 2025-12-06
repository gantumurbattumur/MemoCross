from fastapi import FastAPI
from app.api import words, crossword, auth
from fastapi.middleware.cors import CORSMiddleware



app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or specify http://localhost:3000
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(words.router)
app.include_router(crossword.router)
app.include_router(auth.router)

@app.get("/")
def root():
    return {"message": "MemoCross API running"}
