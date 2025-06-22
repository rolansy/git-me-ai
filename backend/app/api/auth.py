from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.services.firebase_service import FirebaseService
from app.config import get_db
import requests
from pydantic import BaseModel
from app.config import settings

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class GitHubAuthRequest(BaseModel):
    code: str

@router.post("/github")
async def github_auth(request: GitHubAuthRequest):
    # Exchange code for access token
    token_url = "https://github.com/login/oauth/access_token"
    data = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "client_secret": settings.GITHUB_CLIENT_SECRET,
        "code": request.code
    }
    headers = {"Accept": "application/json"}
    
    response = requests.post(token_url, data=data, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to obtain access token")
    
    token_data = response.json()
    access_token = token_data.get("access_token")
    
    # Get user info from GitHub
    user_url = "https://api.github.com/user"
    headers = {"Authorization": f"token {access_token}"}
    
    user_response = requests.get(user_url, headers=headers)
    if user_response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to get user info")
    
    user_data = user_response.json()
    
    # Store user in Firebase
    firebase_service = FirebaseService()
    user_id = user_data.get("id")
    firebase_service.add_user(str(user_id), {
        "github_id": user_id,
        "username": user_data.get("login"),
        "access_token": access_token
    })
    
    return {"access_token": access_token, "user": user_data}

@router.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = FirebaseService.authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    return {"access_token": user.token, "token_type": "bearer"}

@router.get("/users/me")
async def read_users_me(token: str = Depends(oauth2_scheme)):
    user = FirebaseService.get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    return user