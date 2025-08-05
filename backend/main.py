from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import httpx
import jwt
from datetime import datetime, timedelta
from github import Github
from dotenv import load_dotenv
from ai_agent import ReadmeAgent

# Load environment variables
load_dotenv()

app = FastAPI(title="Git-Me-AI Backend", version="1.0.0")

# Security
security = HTTPBearer()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"],  # Add your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment variables
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
HUGGINGFACEHUB_API_TOKEN = os.getenv("HUGGINGFACEHUB_API_TOKEN")

# Initialize AI agent
readme_agent = ReadmeAgent(api_token=HUGGINGFACEHUB_API_TOKEN)

# Pydantic models
class GitHubLoginRequest(BaseModel):
    code: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class Repository(BaseModel):
    id: int
    name: str
    full_name: str
    description: Optional[str]
    private: bool
    html_url: str
    language: Optional[str]
    stargazers_count: int
    forks_count: int
    updated_at: str

class ReadmeRequest(BaseModel):
    repo_name: str
    full_name: str

class CommitReadmeRequest(BaseModel):
    repo_name: str
    full_name: str
    readme_content: str
    commit_message: Optional[str] = "📝 Add AI-generated README.md"

class ReadmeResponse(BaseModel):
    readme_content: str
    repo_analysis: dict

# JWT token functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        username: str = payload.get("sub")
        github_token: str = payload.get("github_token")
        if username is None or github_token is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return {"username": username, "github_token": github_token}
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

@app.get("/")
async def root():
    return {"message": "Git-Me-AI Backend is running!"}

@app.post("/auth/github", response_model=TokenResponse)
async def github_oauth_callback(request: GitHubLoginRequest):
    """
    Exchange GitHub OAuth code for access token
    """
    async with httpx.AsyncClient() as client:
        # Exchange code for GitHub access token
        token_response = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": request.code,
            },
            headers={"Accept": "application/json"},
        )
        
        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code for token")
        
        token_data = token_response.json()
        github_access_token = token_data.get("access_token")
        
        if not github_access_token:
            raise HTTPException(status_code=400, detail="No access token received")
        
        # Get user info from GitHub
        user_response = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {github_access_token}"},
        )
        
        if user_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get user info")
        
        user_data = user_response.json()
        
        # Create JWT token with GitHub access token embedded
        access_token_expires = timedelta(hours=24)
        access_token = create_access_token(
            data={
                "sub": user_data["login"],
                "github_token": github_access_token,
                "user_id": user_data["id"],
            },
            expires_delta=access_token_expires,
        )
        
        return TokenResponse(access_token=access_token)

@app.get("/repos", response_model=List[Repository])
async def get_user_repositories(current_user: dict = Depends(verify_token)):
    """
    Get all repositories for the authenticated user
    """
    try:
        github = Github(current_user["github_token"])
        user = github.get_user()
        repos = user.get_repos(sort="updated", direction="desc")
        
        repository_list = []
        for repo in repos:
            if len(repository_list) >= 50:  # Limit to 50 repos for performance
                break
                
            repository_list.append(Repository(
                id=repo.id,
                name=repo.name,
                full_name=repo.full_name,
                description=repo.description,
                private=repo.private,
                html_url=repo.html_url,
                language=repo.language,
                stargazers_count=repo.stargazers_count,
                forks_count=repo.forks_count,
                updated_at=repo.updated_at.isoformat(),
            ))
        
        return repository_list
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch repositories: {str(e)}")

@app.post("/generate-readme", response_model=ReadmeResponse)
async def generate_readme(request: ReadmeRequest, current_user: dict = Depends(verify_token)):
    """
    Generate README for a specific repository using AI agent
    """
    try:
        github = Github(current_user["github_token"])
        repo = github.get_repo(request.full_name)
        
        # Generate README using AI agent
        readme_content, analysis = await readme_agent.generate_readme(repo)
        
        return ReadmeResponse(
            readme_content=readme_content,
            repo_analysis=analysis
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate README: {str(e)}")

@app.post("/commit-readme")
async def commit_readme_to_repo(request: CommitReadmeRequest, current_user: dict = Depends(verify_token)):
    """
    Commit the AI-generated README to the repository
    """
    try:
        github = Github(current_user["github_token"])
        repo = github.get_repo(request.full_name)
        
        # Check if README.md already exists
        readme_path = "README.md"
        try:
            existing_file = repo.get_contents(readme_path)
            # File exists, update it
            result = repo.update_file(
                path=readme_path,
                message=request.commit_message,
                content=request.readme_content,
                sha=existing_file.sha,
                branch=repo.default_branch
            )
            action = "updated"
        except Exception:
            # File doesn't exist, create it
            result = repo.create_file(
                path=readme_path,
                message=request.commit_message,
                content=request.readme_content,
                branch=repo.default_branch
            )
            action = "created"
        
        return {
            "success": True,
            "message": f"README.md {action} successfully!",
            "commit_sha": result["commit"].sha,
            "commit_url": result["commit"].html_url,
            "file_url": result["content"].html_url
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to commit README: {str(e)}")

@app.get("/user")
async def get_current_user(current_user: dict = Depends(verify_token)):
    """
    Get current authenticated user info
    """
    try:
        github = Github(current_user["github_token"])
        user = github.get_user()
        
        return {
            "login": user.login,
            "name": user.name,
            "avatar_url": user.avatar_url,
            "bio": user.bio,
            "public_repos": user.public_repos,
            "followers": user.followers,
            "following": user.following,
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user info: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
