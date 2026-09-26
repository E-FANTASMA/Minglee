from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import ads, admin

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Backend API for In-App Advertising and Event Promotion Platform. "
        "Enforces daily slot limits (Banner: 3, Notification: 1, Popup: 1), 24h duration constraints, "
        "Flutterwave payment verification, image optimization, and admin conflict re-check workflows."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(ads.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

@app.get("/", tags=["Health Check"])
@app.get("/health", tags=["Health Check"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "pricing": settings.PRICING,
        "daily_limits": settings.DAILY_LIMITS
    }
