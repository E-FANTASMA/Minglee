from datetime import date, datetime
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status

from app.models import User, Payment, Ad, AdType, AdStatus
from app.schemas import AdCreate, AdminReviewDecision
from app.config import settings

def verify_admin_role(db: Session, admin_id: UUID) -> User:
    """Verifies that the requested user account exists and has role == 'admin'."""
    user = db.query(User).filter(User.id == admin_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {admin_id} not found."
        )
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Admin privileges required."
        )
    return user

def get_slot_availability(db: Session, ad_type: str, scheduled_date: date) -> dict:
    """
    Calculates remaining slots for a given ad_type on a specific scheduled date.
    """
    ad_type_str = ad_type.lower()
    max_allowed = settings.DAILY_LIMITS.get(ad_type_str, 1)

    currently_approved = db.query(func.count(Ad.id)).filter(
        Ad.scheduled_date == scheduled_date,
        Ad.ad_type == ad_type_str,
        Ad.status == AdStatus.APPROVED.value
    ).scalar() or 0

    slots_remaining = max(0, max_allowed - currently_approved)
    is_available = slots_remaining > 0

    return {
        "ad_type": ad_type_str,
        "scheduled_date": scheduled_date,
        "max_allowed": max_allowed,
        "currently_approved": currently_approved,
        "slots_remaining": slots_remaining,
        "is_available": is_available
    }

def check_payment_reference_exists(db: Session, payment_reference: str) -> bool:
    """Checks if a payment_reference has already been processed."""
    return db.query(Payment).filter(Payment.reference == payment_reference).first() is not None

def create_ad_submission(db: Session, user_id: UUID, ad_data: AdCreate, payment_info: dict) -> Ad:
    """
    Submits a new advertisement after verifying payment and checking initial slot availability.
    """
    # 1. Ensure user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )

    # 2. Ensure payment reference has not been reused
    if check_payment_reference_exists(db, ad_data.payment_reference):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment reference '{ad_data.payment_reference}' has already been used for another submission."
        )

    # 3. Initial Daily Limit Check
    availability = get_slot_availability(db, ad_data.ad_type.value, ad_data.scheduled_date)
    if not availability["is_available"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Submission rejected: Daily limit of {availability['max_allowed']} "
                f"{ad_data.ad_type.value} ad(s) reached for date {ad_data.scheduled_date}."
            )
        )

    # 4. If Notification Ad, verify popup_id exists and is a popup ad
    if ad_data.ad_type == AdType.NOTIFICATION:
        popup_ad = db.query(Ad).filter(
            Ad.id == ad_data.popup_id,
            Ad.ad_type == AdType.POPUP.value
        ).first()
        if not popup_ad:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Linked popup_id '{ad_data.popup_id}' not found or is not a valid Popup ad."
            )

    # 5. Record Payment
    payment = Payment(
        user_id=user_id,
        reference=ad_data.payment_reference,
        payment_type="ad_promotion",
        event_id=None,
        flw_transaction_id=payment_info.get("flw_transaction_id"),
        amount=payment_info.get("amount"),
        currency=payment_info.get("currency", "NGN"),
        status="success",
        gateway="flutterwave",
        gateway_response=payment_info,
        payment_metadata={"ad_type": ad_data.ad_type.value},
    )
    db.add(payment)
    db.flush()  # get payment.id

    # 6. Create Pending Ad
    new_ad = Ad(
        user_id=user_id,
        payment_id=payment.id,
        ad_type=ad_data.ad_type.value,
        title=ad_data.title,
        text_content=ad_data.text_content,
        image_url=ad_data.image_url,
        target_url=ad_data.target_url,
        popup_id=ad_data.popup_id,
        scheduled_date=ad_data.scheduled_date,
        start_time=ad_data.start_time,
        end_time=ad_data.end_time,
        status=AdStatus.PENDING.value
    )

    db.add(new_ad)
    db.commit()
    db.refresh(new_ad)
    return new_ad

def get_pending_ads(db: Session) -> List[Ad]:
    """Retrieves all pending ads for admin dashboard, including user flag status."""
    return db.query(Ad).filter(Ad.status == AdStatus.PENDING.value).order_by(Ad.created_at.asc()).all()

def admin_review_ad(db: Session, admin_id: UUID, ad_id: UUID, decision: AdminReviewDecision) -> Ad:
    """
    Performs admin review on a pending ad with DOUBLE CONFLICT CHECK on approval.
    """
    ad = db.query(Ad).filter(Ad.id == ad_id).first()
    if not ad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ad with ID {ad_id} not found."
        )

    if ad.status != AdStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ad has already been processed with status '{ad.status}'."
        )

    now = datetime.utcnow()

    # Rejection workflow
    if decision.action == "reject":
        ad.status = AdStatus.REJECTED.value
        ad.rejection_reason = decision.rejection_reason
        ad.reviewed_by = admin_id
        ad.reviewed_at = now
        db.commit()
        db.refresh(ad)
        return ad

    # Approval workflow: DOUBLE CONFLICT CHECK
    if decision.action == "approve":
        availability = get_slot_availability(db, ad.ad_type, ad.scheduled_date)
        
        # If slot was filled while this ad was pending approval
        if not availability["is_available"]:
            ad.status = AdStatus.REJECTED.value
            ad.rejection_reason = (
                f"Automatic rejection during approval: Date conflict for {ad.scheduled_date}. "
                f"Maximum allowed slots ({availability['max_allowed']}) for {ad.ad_type} ads was already filled by another approved ad."
            )
            ad.reviewed_by = admin_id
            ad.reviewed_at = now
            db.commit()
            db.refresh(ad)
            return ad

        # Slot available -> Approve
        ad.status = AdStatus.APPROVED.value
        ad.rejection_reason = None
        ad.reviewed_by = admin_id
        ad.reviewed_at = now
        db.commit()
        db.refresh(ad)
        return ad

def get_dashboard_metrics(db: Session) -> dict:
    """Generates overall dashboard statistics for admin panel."""
    total_users = db.query(func.count(User.id)).scalar() or 0
    flagged_users = db.query(func.count(User.id)).filter(User.is_flagged == True).scalar() or 0
    
    total_ads = db.query(func.count(Ad.id)).scalar() or 0
    pending_ads = db.query(func.count(Ad.id)).filter(Ad.status == AdStatus.PENDING.value).scalar() or 0
    approved_ads = db.query(func.count(Ad.id)).filter(Ad.status == AdStatus.APPROVED.value).scalar() or 0
    rejected_ads = db.query(func.count(Ad.id)).filter(Ad.status == AdStatus.REJECTED.value).scalar() or 0

    banners_scheduled = db.query(func.count(Ad.id)).filter(
        Ad.ad_type == AdType.BANNER.value, Ad.status == AdStatus.APPROVED.value
    ).scalar() or 0
    
    notifications_scheduled = db.query(func.count(Ad.id)).filter(
        Ad.ad_type == AdType.NOTIFICATION.value, Ad.status == AdStatus.APPROVED.value
    ).scalar() or 0

    popups_scheduled = db.query(func.count(Ad.id)).filter(
        Ad.ad_type == AdType.POPUP.value, Ad.status == AdStatus.APPROVED.value
    ).scalar() or 0

    return {
        "total_users": total_users,
        "active_users": total_users - flagged_users,
        "flagged_users": flagged_users,
        "total_ads_submitted": total_ads,
        "pending_ads_count": pending_ads,
        "approved_ads_count": approved_ads,
        "rejected_ads_count": rejected_ads,
        "banners_scheduled": banners_scheduled,
        "notifications_scheduled": notifications_scheduled,
        "popups_scheduled": popups_scheduled
    }

def flag_user(db: Session, user_id: UUID, is_flagged: bool, flag_reason: Optional[str] = None) -> User:
    """Flags or unflags a user profile."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )
    user.is_flagged = is_flagged
    user.flag_reason = flag_reason if is_flagged else None
    db.commit()
    db.refresh(user)
    return user
