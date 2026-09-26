from datetime import date
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status, Header
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import (
    AdCreate, AdResponse, PaymentVerifyRequest, PaymentResponse, SlotAvailabilityResponse
)
from app.services.flutterwave import verify_flutterwave_payment
from app import crud
from app.models import Ad, AdStatus

router = APIRouter(prefix="/ads", tags=["Advertisements"])

@router.get("/availability/{ad_type}/{scheduled_date}", response_model=SlotAvailabilityResponse)
def check_slot_availability(
    ad_type: str,
    scheduled_date: date,
    db: Session = Depends(get_db)
):
    """
    Checks if a slot is available for a given ad_type (banner, notification, popup) on a specified date.
    Daily Limits: Banner (3), Notification (1), Popup (1).
    """
    if ad_type.lower() not in ["banner", "notification", "popup"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ad_type. Must be 'banner', 'notification', or 'popup'."
        )
    return crud.get_slot_availability(db, ad_type, scheduled_date)

@router.post("/verify-payment", response_model=PaymentResponse)
async def verify_payment(
    request: PaymentVerifyRequest,
    db: Session = Depends(get_db)
):
    """
    Verifies a Flutterwave payment reference before submitting an ad.
    """
    if crud.check_payment_reference_exists(db, request.payment_reference):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment reference '{request.payment_reference}' has already been used."
        )

    payment_data = await verify_flutterwave_payment(request.payment_reference, request.ad_type.value)
    return {
        "id": "00000000-0000-0000-0000-000000000000",
        "payment_reference": payment_data["payment_reference"],
        "amount": payment_data["amount"],
        "currency": payment_data["currency"],
        "ad_type": request.ad_type.value,
        "status": payment_data["status"],
        "created_at": date.today()
    }

@router.post("/submit", response_model=AdResponse, status_code=status.HTTP_201_CREATED)
async def submit_ad(
    ad_data: AdCreate,
    x_user_id: UUID = Header(..., description="Simulated auth user header"),
    db: Session = Depends(get_db)
):
    """
    Submits a new advertisement:
    1. Verifies Flutterwave payment reference.
    2. Enforces daily slot limits (Banner: 3, Notification: 1, Popup: 1).
    3. Validates 24-hour minimum duration for Notification/Popup and links.
    4. Creates payment record and pending ad for admin approval.
    """
    # 1. Verify Payment via Flutterwave
    payment_info = await verify_flutterwave_payment(ad_data.payment_reference, ad_data.ad_type.value)

    # 2. Submit ad with CRUD validation
    new_ad = crud.create_ad_submission(
        db=db,
        user_id=x_user_id,
        ad_data=ad_data,
        payment_info=payment_info
    )
    return new_ad

@router.get("/my-ads", response_model=List[AdResponse])
def get_user_ads(
    x_user_id: UUID = Header(...),
    db: Session = Depends(get_db)
):
    """Retrieves all ads submitted by the current user."""
    return db.query(Ad).filter(Ad.user_id == x_user_id).order_by(Ad.created_at.desc()).all()

@router.get("/active", response_model=List[AdResponse])
def get_active_ads(
    ad_type: Optional[str] = Query(None, description="Filter by 'banner', 'notification', or 'popup'"),
    target_date: Optional[date] = Query(None, description="Filter active ads for specific date (defaults to today)"),
    db: Session = Depends(get_db)
):
    """
    Retrieves approved active ads to display in carousel, notification, or popup format in the app.
    """
    filter_date = target_date or date.today()
    query = db.query(Ad).filter(
        Ad.status == AdStatus.APPROVED.value,
        Ad.scheduled_date == filter_date
    )

    if ad_type:
        query = query.filter(Ad.ad_type == ad_type.lower())

    return query.all()

@router.post("/webhook/flutterwave")
async def flutterwave_webhook(
    payload: dict,
    verif_hash: Optional[str] = Header(None, alias="verif-hash"),
    db: Session = Depends(get_db)
):
    """
    Asynchronous Webhook Receiver for Flutterwave payment events.
    Verifies verif-hash header against FLUTTERWAVE_WEBHOOK_SECRET_HASH.
    """
    from app.config import settings
    expected_hash = settings.FLUTTERWAVE_WEBHOOK_SECRET_HASH
    if verif_hash != expected_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Flutterwave webhook signature hash."
        )

    event_type = payload.get("event")
    data = payload.get("data", {})

    if event_type == "charge.completed" and data.get("status") == "successful":
        tx_ref = data.get("tx_ref")
        return {
            "status": "success",
            "tx_ref": tx_ref,
            "message": f"Payment notification received for tx_ref {tx_ref}"
        }

    return {"status": "ignored", "event": event_type}
