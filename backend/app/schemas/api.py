import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


def validate_password_strength(value: str) -> str:
    if not any(character.islower() for character in value):
        raise ValueError("Password must include a lowercase letter")
    if not any(character.isupper() for character in value):
        raise ValueError("Password must include an uppercase letter")
    if not any(character.isdigit() for character in value):
        raise ValueError("Password must include a number")
    return value


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserOut(ORMModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    is_active: bool
    territory: str | None
    roles: list[str] = Field(default_factory=list)
    created_at: datetime


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=12, max_length=256)
    roles: list[str] = Field(default_factory=list, max_length=11)
    territory: str | None = Field(default=None, max_length=120)

    _password_strength = field_validator("password")(validate_password_strength)


class UserPatch(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=200)
    territory: str | None = Field(default=None, max_length=120)
    roles: list[str] | None = Field(default=None, max_length=11)


class UserStatusPatch(BaseModel):
    is_active: bool


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=20, max_length=200)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=12, max_length=256)

    _password_strength = field_validator("new_password")(validate_password_strength)


class PasswordForgot(BaseModel):
    email: EmailStr


class PasswordReset(BaseModel):
    token: str = Field(min_length=20, max_length=300)
    new_password: str = Field(min_length=12, max_length=256)

    _password_strength = field_validator("new_password")(validate_password_strength)


class AccountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    account_type: str = Field(min_length=1, max_length=80)
    market: str | None = Field(default=None, max_length=120)
    territory: str | None = Field(default=None, max_length=120)
    status: str = Field(default="active", max_length=40)
    assigned_employee_id: uuid.UUID | None = None


class AccountPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    account_type: str | None = Field(default=None, max_length=80)
    market: str | None = Field(default=None, max_length=120)
    territory: str | None = Field(default=None, max_length=120)
    status: str | None = Field(default=None, max_length=40)
    assigned_employee_id: uuid.UUID | None = None


class AccountOut(ORMModel):
    id: uuid.UUID
    name: str
    account_type: str
    market: str | None
    territory: str | None
    status: str
    assigned_employee_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class ContactCreate(BaseModel):
    account_id: uuid.UUID
    full_name: str = Field(min_length=1, max_length=200)
    email: str | None = None
    phone: str | None = Field(default=None, max_length=40)
    title: str | None = Field(default=None, max_length=120)
    professional_category: str | None = Field(default=None, max_length=100)
    specialty: str | None = Field(default=None, max_length=120)
    license_number: str | None = Field(default=None, max_length=120)
    country: str | None = Field(default=None, max_length=2)
    territory: str | None = Field(default=None, max_length=120)
    assigned_rep_id: uuid.UUID | None = None
    status: str = Field(default="active", max_length=40)


class ContactPatch(BaseModel):
    account_id: uuid.UUID | None = None
    full_name: str | None = Field(default=None, min_length=1, max_length=200)
    email: str | None = None
    phone: str | None = Field(default=None, max_length=40)
    title: str | None = Field(default=None, max_length=120)
    professional_category: str | None = Field(default=None, max_length=100)
    specialty: str | None = Field(default=None, max_length=120)
    license_number: str | None = Field(default=None, max_length=120)
    country: str | None = Field(default=None, max_length=2)
    territory: str | None = Field(default=None, max_length=120)
    assigned_rep_id: uuid.UUID | None = None
    status: str | None = Field(default=None, max_length=40)


class ContactOut(ORMModel):
    id: uuid.UUID
    account_id: uuid.UUID
    account_name: str | None = None
    full_name: str
    email: str | None
    phone: str | None
    title: str | None
    professional_category: str | None
    specialty: str | None = None
    license_number: str | None = None
    country: str | None = None
    prescribing_tier: str | None = None
    kol_status: bool | None = False
    last_interaction_at: datetime | None = None
    next_scheduled_visit: datetime | None = None
    interactions_count: int | None = 0
    territory: str | None
    assigned_rep_id: uuid.UUID | None
    status: str


class OpportunityCreate(BaseModel):
    account_id: uuid.UUID
    name: str = Field(min_length=1, max_length=200)
    stage: str = Field(default="prospecting", max_length=60)
    estimated_value: Decimal | None = Field(default=None, ge=0)
    expected_close_date: date | None = None
    probability: int = Field(default=0, ge=0, le=100)
    next_action: str | None = Field(default=None, max_length=240)
    priority: str = Field(default="normal", pattern="^(low|normal|high|urgent)$")


class OpportunityPatch(BaseModel):
    account_id: uuid.UUID | None = None
    name: str | None = Field(default=None, min_length=1, max_length=200)
    stage: str | None = Field(default=None, max_length=60)
    estimated_value: Decimal | None = Field(default=None, ge=0)
    expected_close_date: date | None = None
    probability: int | None = Field(default=None, ge=0, le=100)
    next_action: str | None = Field(default=None, max_length=240)
    priority: str | None = Field(default=None, pattern="^(low|normal|high|urgent)$")
    lost_reason: str | None = Field(default=None, min_length=3, max_length=240)


class OpportunityOut(ORMModel):
    id: uuid.UUID
    account_id: uuid.UUID
    owner_id: uuid.UUID
    name: str
    stage: str
    estimated_value: Decimal | None
    expected_close_date: date | None
    probability: int
    next_action: str | None
    priority: str = "normal"
    lost_reason: str | None = None
    stage_changed_at: datetime | None = None
    created_at: datetime


class ActivityCreate(BaseModel):
    activity_type: str = Field(min_length=1, max_length=60)
    occurred_at: datetime
    notes: str | None = None


class ActivityOut(ORMModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    account_id: uuid.UUID | None
    opportunity_id: uuid.UUID | None
    activity_type: str
    occurred_at: datetime
    notes: str | None


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    sku: str = Field(min_length=1, max_length=80)
    description: str | None = None
    category: str | None = Field(default=None, max_length=100)
    is_active: bool = True


class ProductPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    sku: str | None = Field(default=None, min_length=1, max_length=80)
    description: str | None = None
    category: str | None = Field(default=None, max_length=100)
    is_active: bool | None = None


class ProductOut(ORMModel):
    id: uuid.UUID
    name: str
    sku: str
    description: str | None
    category: str | None
    is_active: bool


class OrderItemInput(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(gt=0, le=1_000_000)
    unit_price: Decimal = Field(ge=0, max_digits=14, decimal_places=2)


class OrderCreate(BaseModel):
    account_id: uuid.UUID
    distributor_id: uuid.UUID | None = None
    items: list[OrderItemInput] = Field(min_length=1, max_length=100)


class OrderPatch(BaseModel):
    status: str


class OrderItemOut(ORMModel):
    id: uuid.UUID
    product_id: uuid.UUID
    quantity: int
    unit_price: Decimal


class DistributorOut(ORMModel):
    id: uuid.UUID
    account_id: uuid.UUID
    account_name: str | None = None
    region: str | None = None
    assigned_manager_id: uuid.UUID | None = None
    assigned_manager_name: str | None = None
    created_at: datetime | None = None


class OrderOut(ORMModel):
    id: uuid.UUID
    order_number: str
    account_id: uuid.UUID
    account_name: str | None = None
    distributor_id: uuid.UUID | None
    distributor_name: str | None = None
    status: str
    order_date: datetime
    items: list[OrderItemOut]
    total_amount: Decimal | None = None


class InventoryAdjustment(BaseModel):
    distributor_id: uuid.UUID
    product_id: uuid.UUID
    quantity_delta: int = Field(ge=-1_000_000, le=1_000_000)
    reason: str = Field(min_length=3, max_length=240)
    lot_number: str | None = Field(default=None, max_length=120)
    batch_number: str | None = Field(default=None, max_length=120)
    expiry_date: date | None = None
    storage_conditions: str | None = Field(default=None, max_length=200)

    @field_validator("quantity_delta")
    @classmethod
    def adjustment_must_change_stock(cls, value: int) -> int:
        if value == 0:
            raise ValueError("Quantity adjustment must be nonzero")
        return value


class InventoryOut(BaseModel):
    id: uuid.UUID
    distributor_id: uuid.UUID
    distributor_name: str | None = None
    product_id: uuid.UUID
    product_name: str | None = None
    product_sku: str | None = None
    product_category: str | None = None
    quantity: int
    updated_at: datetime


class InventoryMovementOut(ORMModel):
    id: uuid.UUID
    inventory_snapshot_id: uuid.UUID
    inventory_lot_id: uuid.UUID | None = None
    changed_by_id: uuid.UUID
    changed_by_name: str | None = None
    distributor_id: uuid.UUID | None = None
    distributor_name: str | None = None
    product_id: uuid.UUID | None = None
    product_name: str | None = None
    quantity_delta: int
    reason: str
    lot_number: str | None = None
    batch_number: str | None = None
    expiry_date: date | None = None
    storage_conditions: str | None = None
    created_at: datetime


class InventoryLotOut(ORMModel):
    id: uuid.UUID
    distributor_id: uuid.UUID
    distributor_name: str | None = None
    product_id: uuid.UUID
    product_name: str | None = None
    product_sku: str | None = None
    product_category: str | None = None
    lot_number: str
    batch_number: str | None = None
    expiry_date: date | None = None
    storage_conditions: str | None = None
    quantity: int
    updated_at: datetime


class TenderCreate(BaseModel):
    account_id: uuid.UUID
    reference: str = Field(min_length=1, max_length=120)
    title: str = Field(min_length=1, max_length=200)
    status: str = "draft"
    due_at: datetime | None = None
    requirements: str | None = None
    owner_id: uuid.UUID | None = None


class TenderPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    status: str | None = None
    due_at: datetime | None = None
    requirements: str | None = None
    review_status: str | None = None


class TenderOut(ORMModel):
    id: uuid.UUID
    account_id: uuid.UUID
    account_name: str | None = None
    reference: str
    title: str
    status: str
    due_at: datetime | None
    owner_id: uuid.UUID | None
    owner_name: str | None = None
    requirements: str | None
    review_status: str


class SupportTicketCreate(BaseModel):
    account_id: uuid.UUID
    contact_id: uuid.UUID | None = None
    subject: str = Field(min_length=1, max_length=200)
    description: str | None = None
    priority: str = Field(default="normal", pattern="^(low|normal|high|urgent)$")


class SupportTicketPatch(BaseModel):
    status: str | None = None
    priority: str | None = Field(default=None, pattern="^(low|normal|high|urgent)$")
    assigned_to_id: uuid.UUID | None = None
    sla_due_at: datetime | None = None
    description: str | None = None


class SupportCommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=10_000)
    is_internal: bool = False


class SupportCommentOut(ORMModel):
    id: uuid.UUID
    case_id: uuid.UUID
    author_id: uuid.UUID
    body: str
    is_internal: bool
    created_at: datetime


class SupportTicketOut(ORMModel):
    id: uuid.UUID
    account_id: uuid.UUID
    contact_id: uuid.UUID | None
    case_number: str
    subject: str
    status: str
    description: str | None
    priority: str
    assigned_to_id: uuid.UUID | None
    sla_due_at: datetime | None


class NotificationOut(ORMModel):
    id: uuid.UUID
    title: str
    body: str
    read_at: datetime | None
    created_at: datetime


class AuditEventOut(ORMModel):
    id: uuid.UUID
    actor_id: uuid.UUID | None
    event_type: str
    entity_type: str
    entity_id: uuid.UUID | None
    event_data: str | None
    created_at: datetime


class Page(BaseModel):
    items: list[dict]
    total: int
    limit: int
    offset: int
