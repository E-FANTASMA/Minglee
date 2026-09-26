from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import (
    AdResponse, AdminReviewDecision, DashboardMetricsResponse, UserResponse, UserFlagRequest
)
from app import crud

router = APIRouter(prefix="/admin", tags=["Admin Operations"])

@router.get("/ads/pending", response_model=List[AdResponse])
def list_pending_ads(
    x_admin_id: UUID = Header(..., description="Admin user ID"),
    db: Session = Depends(get_db)
):
    """
    Returns all pending ads requiring admin review.
    Includes submitting user profile, highlighting flagged users.
    """
    crud.verify_admin_role(db, x_admin_id)
    return crud.get_pending_ads(db)

@router.post("/ads/{ad_id}/review", response_model=AdResponse)
def review_ad_submission(
    ad_id: UUID,
    decision: AdminReviewDecision,
    x_admin_id: UUID = Header(..., description="Admin user ID"),
    db: Session = Depends(get_db)
):
    """
    Approves or rejects a pending ad.
    CRITICAL: Performs a second conflict re-check on approval to guarantee daily limit availability
    (Banner: 3, Notification: 1, Popup: 1). Automatically rejects if slot was filled by another approval.
    """
    crud.verify_admin_role(db, x_admin_id)
    return crud.admin_review_ad(
        db=db,
        admin_id=x_admin_id,
        ad_id=ad_id,
        decision=decision
    )

@router.get("/dashboard", response_model=DashboardMetricsResponse)
def get_admin_dashboard(
    x_admin_id: UUID = Header(...),
    db: Session = Depends(get_db)
):
    """
    Returns platform visibility stats including active users, flagged users,
    pending/approved/rejected ads, and scheduled counts by ad format.
    """
    crud.verify_admin_role(db, x_admin_id)
    return crud.get_dashboard_metrics(db)

@router.post("/users/{user_id}/flag", response_model=UserResponse)
def flag_user_account(
    user_id: UUID,
    flag_req: UserFlagRequest,
    x_admin_id: UUID = Header(...),
    db: Session = Depends(get_db)
):
    """
    Flags or unflags a user for suspicious or problematic behavior.
    Flagged users are highlighted in the admin panel prior to ad approval.
    """
    crud.verify_admin_role(db, x_admin_id)
    return crud.flag_user(
        db=db,
        user_id=user_id,
        is_flagged=flag_req.is_flagged,
        flag_reason=flag_req.flag_reason
    )
