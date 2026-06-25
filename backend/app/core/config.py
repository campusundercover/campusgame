from typing import List
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl

class Settings(BaseSettings):
    PROJECT_NAME: str = "Campus Undercover: The Christ Mystery"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "supersecretkeythatisverylongandrandom12345!"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    ENVIRONMENT: str = "development"
    
    # Database
    DATABASE_URL: str = "postgresql://campus_admin:secret_password_123@localhost:5432/campus_undercover"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:8000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000"
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
