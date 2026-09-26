import enum
import uuid
from datetime import datetime, timedelta
from sqlalchemy import (
    Column, String, Text, Boolean, Numeric, Integer, Date, DateTime, 
    ForeignKey, JSON, text
)
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.orm import relationship
from app.database import Base

class GUID(TypeDecorator):
    """
    Platform-independent GUID type.
    Uses PostgreSQL's UUID type when connected to Postgres, otherwise uses CHAR(36) for SQLite.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            from sqlalchemy.dialects.postgresql import UUID as PG_UUID
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return str(value)
        else:
            if isinstance(value, uuid.UUID):
                return str(value)
            else:
                return str(uuid.UUID(value))

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if not isinstance(value, uuid.UUID):
                value = uuid.UUID(str(value))
            return value

class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"

class AdType(str, enum.Enum):
    BANNER = "banner"
    NOTIFICATION = "notification"
    POPUP = "popup"

class AdStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"

class User(Base):
    __tablename__ = "users"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=True, index=True)
    full_name = Column(String(255), nullable=True)
    name = Column(String(255), nullable=True)
    whatsapp_number = Column(String(50), nullable=True)
    password_hash = Column(String(255), nullable=True)
    role = Column(String(50), nullable=False, default="user")
    is_flagged = Column(Boolean, nullable=False, default=False, index=True)
    flag_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    payments = relationship("Payment", back_populates="user", cascade="all, delete-orphan")
    ads = relationship("Ad", back_populates="user", foreign_keys="[Ad.user_id]", cascade="all, delete-orphan")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reference = Column(String(255), unique=True, nullable=False, index=True)
    payment_type = Column(String(50), nullable=False, default="event_ticket")
    event_id = Column(GUID(), nullable=True)
    flw_transaction_id = Column(String(255), nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), nullable=False, default="NGN")
    status = Column(String(50), nullable=False, default="pending")
    gateway = Column(String(50), nullable=False, default="paystack")
    gateway_response = Column(JSON, nullable=False, default=dict)
    payment_metadata = Column("metadata", JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="payments")
    ad = relationship("Ad", back_populates="payment", uselist=False)

class Ad(Base):
    __tablename__ = "ads"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    payment_id = Column(GUID(), ForeignKey("payments.id", ondelete="RESTRICT"), unique=True, nullable=True)
    ad_type = Column(String(50), nullable=False)

    title = Column(String(255), nullable=True)
    text_content = Column(Text, nullable=False)
    image_url = Column(Text, nullable=True)
    target_url = Column(Text, nullable=True)

    # Notification links to Popup
    popup_id = Column(GUID(), ForeignKey("ads.id", ondelete="SET NULL"), nullable=True)

    # Schedule dates & times
    scheduled_date = Column(Date, nullable=False, index=True)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)

    # Status
    status = Column(String(50), nullable=False, default="pending", index=True)
    rejection_reason = Column(Text, nullable=True)
    reviewed_by = Column(GUID(), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    # Metrics
    impressions = Column(Integer, default=0, nullable=False)
    clicks = Column(Integer, default=0, nullable=False)

    # Legacy scheduling columns used by JS Supabase layer
    placement = Column(Text, nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    end_date = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.utcnow() + timedelta(hours=24))
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="ads", foreign_keys=[user_id])
    payment = relationship("Payment", back_populates="ad")
    popup = relationship("Ad", remote_side=[id], foreign_keys=[popup_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
