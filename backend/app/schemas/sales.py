import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field, model_validator

PRIORITY = "^(low|normal|high|urgent)$"


class FollowUpInput(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    due_at: datetime
    priority: str = Field(default="normal", pattern=PRIORITY)
    description: str | None = Field(default=None, max_length=4000)


class ActivityIn(BaseModel):
    activity_type: str = Field(pattern="^(visit|call|meeting|email|follow_up|detailing)$")
    account_id: uuid.UUID
    contact_id: uuid.UUID | None = None
    opportunity_id: uuid.UUID | None = None
    status: str = Field(default="completed", pattern="^(planned|completed)$")
    occurred_at: datetime
    purpose: str | None = Field(default=None, max_length=240)
    location: str | None = Field(default=None, max_length=240)
    priority: str = Field(default="normal", pattern=PRIORITY)
    notes: str | None = Field(default=None, max_length=8000)
    outcome: str | None = Field(default=None, max_length=8000)
    products_discussed: str | None = Field(default=None, max_length=2000)
    objections: str | None = Field(default=None, max_length=4000)
    commitments: str | None = Field(default=None, max_length=4000)
    next_action: str | None = Field(default=None, max_length=240)
    follow_up: FollowUpInput | None = None
    client_request_id: str | None = Field(default=None, min_length=8, max_length=160)

    @model_validator(mode="after")
    def completed_needs_outcome(self) -> "ActivityIn":
        if self.status == "completed":
            if not (self.outcome or "").strip():
                self.outcome = (self.notes or "Completed successfully").strip()
        return self


class ActivityPatch(BaseModel):
    action: str | None = Field(default=None, pattern="^(start|complete|reschedule|cancel|update)$")
    occurred_at: datetime | None = None
    purpose: str | None = Field(default=None, max_length=240)
    location: str | None = Field(default=None, max_length=240)
    priority: str | None = Field(default=None, pattern=PRIORITY)
    notes: str | None = Field(default=None, max_length=8000)
    outcome: str | None = Field(default=None, max_length=8000)
    products_discussed: str | None = Field(default=None, max_length=2000)
    objections: str | None = Field(default=None, max_length=4000)
    commitments: str | None = Field(default=None, max_length=4000)
    next_action: str | None = Field(default=None, max_length=240)
    follow_up: FollowUpInput | None = None
    owner_id: uuid.UUID | None = None


class EmailIn(BaseModel):
    recipient_email: EmailStr
    recipient_name: str | None = None
    subject: str = Field(min_length=1, max_length=240)
    body: str = Field(min_length=1, max_length=10000)
    template_type: str = Field(
        default="custom",
        pattern="^(meeting_invitation|call_summary|follow_up_reminder|clinical_information|custom)$"
    )
    account_id: uuid.UUID | None = None
    contact_id: uuid.UUID | None = None
    activity_id: uuid.UUID | None = None
    opportunity_id: uuid.UUID | None = None
    schedule_follow_up: bool = False
    follow_up_date: datetime | None = None
    follow_up_notes: str | None = None


class TaskIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    kind: str = Field(default="task", pattern="^(task|follow_up)$")
    account_id: uuid.UUID | None = None
    opportunity_id: uuid.UUID | None = None
    activity_id: uuid.UUID | None = None
    assigned_to_id: uuid.UUID | None = None
    due_at: datetime | None = None
    priority: str = Field(default="normal", pattern=PRIORITY)
    description: str | None = Field(default=None, max_length=4000)
    client_request_id: str | None = Field(default=None, min_length=8, max_length=160)


class TaskPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    status: str | None = Field(default=None, pattern="^(open|in_progress|completed|cancelled)$")
    due_at: datetime | None = None
    priority: str | None = Field(default=None, pattern=PRIORITY)
    description: str | None = Field(default=None, max_length=4000)
    assigned_to_id: uuid.UUID | None = None


class NoteIn(BaseModel):
    content: str = Field(min_length=1, max_length=8000)
    activity_id: uuid.UUID | None = None


class LeadIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    organization: str | None = Field(default=None, max_length=200)
    contact_name: str | None = Field(default=None, max_length=200)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=40)
    source: str | None = Field(default=None, max_length=80)
    territory: str | None = Field(default=None, max_length=120)
    assigned_to_id: uuid.UUID | None = None
    account_id: uuid.UUID | None = None
    contact_id: uuid.UUID | None = None
    next_action: str | None = Field(default=None, max_length=240)
    follow_up_date: date | None = None
    customer_need: str | None = Field(default=None, max_length=4000)
    product_interest: str | None = Field(default=None, max_length=240)
    potential_value: Decimal | None = Field(default=None, ge=0)


class LeadPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    organization: str | None = Field(default=None, max_length=200)
    contact_name: str | None = Field(default=None, max_length=200)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=40)
    source: str | None = Field(default=None, max_length=80)
    status: str | None = Field(default=None, pattern="^(new|contacted|qualified|disqualified)$")
    assigned_to_id: uuid.UUID | None = None
    account_id: uuid.UUID | None = None
    contact_id: uuid.UUID | None = None
    next_action: str | None = Field(default=None, max_length=240)
    follow_up_date: date | None = None
    customer_need: str | None = Field(default=None, max_length=4000)
    product_interest: str | None = Field(default=None, max_length=240)
    decision_process: str | None = Field(default=None, max_length=4000)
    expected_timeline: str | None = Field(default=None, max_length=120)
    potential_value: Decimal | None = Field(default=None, ge=0)
    qualification_notes: str | None = Field(default=None, max_length=8000)
    disqualified_reason: str | None = Field(default=None, min_length=3, max_length=240)


class LeadConvert(BaseModel):
    account_id: uuid.UUID | None = None
    new_account_type: str | None = Field(default=None, max_length=80)
    contact_id: uuid.UUID | None = None
    create_contact: bool = False
    opportunity_name: str | None = Field(default=None, max_length=200)
    estimated_value: Decimal | None = Field(default=None, ge=0)
    expected_close_date: date | None = None
    probability: int = Field(default=10, ge=0, le=100)
    next_action: str | None = Field(default=None, max_length=240)


class ReassignIn(BaseModel):
    assigned_to_id: uuid.UUID
    reason: str = Field(min_length=3, max_length=240)
    include_open_opportunities: bool = True
    include_open_tasks: bool = False


class TargetIn(BaseModel):
    user_id: uuid.UUID
    period_start: date
    amount: Decimal = Field(ge=0, max_digits=14, decimal_places=2)


class ReportAsk(BaseModel):
    question: str = Field(min_length=3, max_length=300)
    start: datetime | None = None
    end: datetime | None = None


class ReportRun(BaseModel):
    report: str
    start: datetime | None = None
    end: datetime | None = None
    stage: str | None = None
    stale_days: int = Field(default=14, ge=1, le=365)
