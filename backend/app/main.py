from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, github, readme
from app.config import settings

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(github.router, prefix="/github", tags=["github"])
app.include_router(readme.router, prefix="/readme", tags=["readme"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the GitHub README Generator API"}