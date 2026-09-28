from datetime import date, datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field

try:
    from pydantic import model_validator
    PYDANTIC_V2 = True
except ImportError:
    from pydantic import root_validator
    PYDANTIC_V2 = False

from app.models import AdType, AdStatus

# -----------------------------------------------------------------------------
# User Schemas
# -----------------------------------------------------------------------------
class UserBase(BaseModel):
    name: Optional[str] = None

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: UUID
    role: str
    is_flagged: bool
    flag_reason: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

class UserFlagRequest(BaseModel):
    is_flagged: bool
    flag_reason: Optional[str] = None

# -----------------------------------------------------------------------------
# Payment Verification Schemas
# -----------------------------------------------------------------------------
class PaymentVerifyRequest(BaseModel):
    payment_reference: str = Field(..., description="Flutterwave payment transaction reference")
    ad_type: AdType = Field(..., description="Type of ad: banner, notification, popup")

class PaymentResponse(BaseModel):
    id: UUID
    payment_reference: str
    amount: float
    currency: str
    ad_type: str
    status: str
    created_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

# -----------------------------------------------------------------------------
# Ad Submission Schemas
# -----------------------------------------------------------------------------
class AdCreate(BaseModel):
    payment_reference: str = Field(..., description="Verified Flutterwave payment reference")
    ad_type: AdType
    title: Optional[str] = None
    text_content: str = Field(..., description="Text body for the ad")
    image_url: Optional[str] = Field(None, description="Image URL required for Banner and Popup ads")
    target_url: Optional[str] = Field(None, description="Target redirect link")
    
    # Required if ad_type == notification
    popup_id: Optional[UUID] = Field(None, description="Linked Popup Ad ID required for Notification Ads")
    
    scheduled_date: date
    start_time: datetime
    end_time: datetime

    if PYDANTIC_V2:
        @model_validator(mode="after")
        def validate_ad_rules_v2(self):
            if self.end_time <= self.start_time:
                raise ValueError("end_time must be strictly after start_time")
            duration_seconds = (self.end_time - self.start_time).total_seconds()
            if self.ad_type in [AdType.NOTIFICATION, AdType.POPUP]:
                if duration_seconds < 86400:
                    raise ValueError(f"{self.ad_type.value.capitalize()} Ads must be scheduled for a minimum duration of 24 hours.")
            if self.ad_type in [AdType.BANNER, AdType.POPUP]:
                if not self.image_url or not self.image_url.strip():
                    raise ValueError(f"{self.ad_type.value.capitalize()} Ads require a single media image URL.")
            if self.ad_type == AdType.NOTIFICATION:
                if not self.popup_id:
                    raise ValueError("Notification Ads must be linked to a corresponding Popup Ad (popup_id).")
            return self
    else:
        @root_validator(pre=False)
        def validate_ad_rules_v1(cls, values):
            end_time = values.get("end_time")
            start_time = values.get("start_time")
            ad_type = values.get("ad_type")
            image_url = values.get("image_url")
            popup_id = values.get("popup_id")

            if end_time and start_time and end_time <= start_time:
                raise ValueError("end_time must be strictly after start_time")
            if end_time and start_time and ad_type in [AdType.NOTIFICATION, AdType.POPUP]:
                if (end_time - start_time).total_seconds() < 86400:
                    raise ValueError(f"{ad_type.value.capitalize()} Ads must be scheduled for a minimum duration of 24 hours.")
            if ad_type in [AdType.BANNER, AdType.POPUP]:
                if not image_url or not image_url.strip():
                    raise ValueError(f"{ad_type.value.capitalize()} Ads require a single media image URL.")
            if ad_type == AdType.NOTIFICATION:
                if not popup_id:
                    raise ValueError("Notification Ads must be linked to a corresponding Popup Ad (popup_id).")
            return values

class AdResponse(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    payment_id: Optional[UUID] = None
    ad_type: str
    title: Optional[str] = None
    text_content: str
    image_url: Optional[str] = None
    target_url: Optional[str] = None
    popup_id: Optional[UUID] = None
    scheduled_date: date
    start_time: datetime
    end_time: datetime
    status: str
    rejection_reason: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    impressions: int = 0
    clicks: int = 0
    placement: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: bool = True
    created_at: datetime
    user: Optional[UserResponse] = None

    class Config:
        orm_mode = True
        from_attributes = True

# -----------------------------------------------------------------------------
# Admin Approval Schemas
# -----------------------------------------------------------------------------
class AdminReviewDecision(BaseModel):
    action: str = Field(..., description="Action to perform: 'approve' or 'reject'")
    rejection_reason: Optional[str] = Field(None, description="Reason if action is 'reject'")

    if PYDANTIC_V2:
        @model_validator(mode="after")
        def validate_rejection_v2(self):
            if self.action == "reject" and not self.rejection_reason:
                raise ValueError("rejection_reason is required when rejecting an ad.")
            if self.action not in ["approve", "reject"]:
                raise ValueError("action must be either 'approve' or 'reject'.")
            return self
    else:
        @root_validator(pre=False)
        def validate_rejection_v1(cls, values):
            action = values.get("action")
            rejection_reason = values.get("rejection_reason")
            if action == "reject" and not rejection_reason:
                raise ValueError("rejection_reason is required when rejecting an ad.")
            if action not in ["approve", "reject"]:
                raise ValueError("action must be either 'approve' or 'reject'.")
            return values

# -----------------------------------------------------------------------------
# Availability & Dashboard Metrics Schemas
# -----------------------------------------------------------------------------
class SlotAvailabilityResponse(BaseModel):
    ad_type: str
    scheduled_date: date
    max_allowed: int
    currently_approved: int
    slots_remaining: int
    is_available: bool

class DashboardMetricsResponse(BaseModel):
    total_users: int
    active_users: int
    flagged_users: int
    total_ads_submitted: int
    pending_ads_count: int
    approved_ads_count: int
    rejected_ads_count: int
    banners_scheduled: int
    notifications_scheduled: int
    popups_scheduled: int
