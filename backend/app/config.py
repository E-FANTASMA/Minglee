import os

class Settings:
    APP_NAME: str = "In-App Advertising & Event Promotion System"
    API_V1_STR: str = "/api/v1"
    
    # Database Configuration (Defaults to SQLite for portable execution, can be overridden by PostgreSQL URL)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./minglee_ads.db"
    )
    
    # Flutterwave Configuration Keys & Webhook
    FLUTTERWAVE_PUBLIC_KEY: str = os.getenv("FLUTTERWAVE_PUBLIC_KEY", "FLWPUBK_TEST-sandbox-public-key")
    FLUTTERWAVE_SECRET_KEY: str = os.getenv("FLUTTERWAVE_SECRET_KEY", "FLWSECK_TEST-sandbox-secret-key")
    FLUTTERWAVE_BASE_URL: str = os.getenv("FLUTTERWAVE_BASE_URL", "https://api.flutterwave.com/v3")
    FLUTTERWAVE_VERIFY_URL: str = f"{FLUTTERWAVE_BASE_URL}/transactions/verify_by_reference"
    FLUTTERWAVE_REDIRECT_URL: str = os.getenv("FLUTTERWAVE_REDIRECT_URL", "https://minglee.com/payment-callback")
    FLUTTERWAVE_WEBHOOK_SECRET_HASH: str = os.getenv("FLUTTERWAVE_WEBHOOK_SECRET_HASH", "minglee_secret_webhook_hash_123")
    
    # Ad Pricing (in NGN)
    PRICING: dict = {
        "banner": 20000.0,
        "notification": 25000.0,
        "popup": 15000.0
    }
    
    # Ad Daily Slot Limits
    DAILY_LIMITS: dict = {
        "banner": 3,
        "notification": 1,
        "popup": 1
    }
    
    # Minimum Duration for Notification and Popup Ads (in hours)
    MIN_DURATION_HOURS: int = 24

settings = Settings()
