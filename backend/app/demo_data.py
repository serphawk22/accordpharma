import json
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    AIAgentDefinition,
    AIExecution,
    AIUsageRecord,
    AIToolCall,
    Account,
    ApprovalDecision,
    ApprovalRequest,
    AuditEvent,
    AutomationDefinition,
    AutomationRun,
    CRMTask,
    ComplianceReview,
    Contact,
    CustomerOrder,
    Distributor,
    FieldVisit,
    HealthcareProfessionalProfile,
    InventoryBalance,
    InventoryLotBalance,
    InventoryMovement,
    InventorySnapshot,
    MarketApproval,
    Notification,
    Opportunity,
    OrderItem,
    PharmacovigilanceIntake,
    Product,
    SalesActivity,
    StockRiskAlert,
    SupportCase,
    SupportComment,
    Tender,
    TenderDocument,
    User,
)

_DEMO_MODELS = (
    Account,
    Contact,
    HealthcareProfessionalProfile,
    Product,
    MarketApproval,
    Distributor,
    Opportunity,
    SalesActivity,
    FieldVisit,
    CRMTask,
    CustomerOrder,
    OrderItem,
    InventorySnapshot,
    InventoryLotBalance,
    InventoryBalance,
    InventoryMovement,
    StockRiskAlert,
    Tender,
    TenderDocument,
    SupportCase,
    SupportComment,
    ComplianceReview,
    PharmacovigilanceIntake,
    AIAgentDefinition,
    AIExecution,
    AIToolCall,
    AIUsageRecord,
    AutomationDefinition,
    AutomationRun,
    ApprovalRequest,
    ApprovalDecision,
    Notification,
    AuditEvent,
)
_NAMESPACE = uuid.UUID("6086b5c7-73ee-4d31-8a1c-59999750f83b")


def _id(model_class: type, index: int) -> uuid.UUID:
    return uuid.uuid5(_NAMESPACE, f"{model_class.__tablename__}:{index}")


def _get_or_add(session: Session, existing: dict, model_class: type, index: int, **values):
    record_id = _id(model_class, index)
    record = existing[model_class].get(record_id)
    if record is None:
        record = model_class(id=record_id, **values)
        session.add(record)
        existing[model_class][record_id] = record
    return record


def seed_demo_records(session: Session, demo_users: dict[str, User], count: int = 100) -> None:
    """Add deterministic, fictional, related records without modifying existing data."""
    existing = {}
    for model in _DEMO_MODELS:
        record_ids = [_id(model, i) for i in range(count)]
        existing[model] = {
            record.id: record
            for record in session.scalars(select(model).where(model.id.in_(record_ids))).all()
        }
    now = datetime.now(timezone.utc)
    rep = demo_users["MEDICAL_REPRESENTATIVE"]
    distributor_manager = demo_users["DISTRIBUTOR_MANAGER"]
    inventory_manager = demo_users["INVENTORY_MANAGER"]
    tender_manager = demo_users["TENDER_MANAGER"]
    support_user = demo_users["CUSTOMER_SUPPORT"]
    compliance_user = demo_users["COMPLIANCE_OFFICER"]
    pv_user = demo_users["PHARMACOVIGILANCE_OFFICER"]
    admin = demo_users["SUPER_ADMIN"]

    accounts = []
    contacts = []
    products = []
    distributors = []
    opportunities = []
    approval_requests = []
    for i in range(count):
        number = i + 1
        created = now - timedelta(days=i % 100)
        accounts.append(
            _get_or_add(
                session,
                existing,
                Account,
                i,
                name=f"Fictional Demo Account {number:03d}",
                account_type=("hospital", "clinic", "pharmacy", "healthcare_provider")[i % 4],
                market=("North", "South", "East", "West")[i % 4],
                territory=f"DEMO-{i % 10 + 1:02d}",
                assigned_employee_id=rep.id,
                created_at=created,
                updated_at=created,
            )
        )
        products.append(_get_or_add(
            session,
            existing,
            Product,
            i,
            name=f"Fictional Demo Product {number:03d}",
            sku=f"DEMO-SKU-{number:04d}",
            description="Fictional demonstration product; not for clinical use.",
            category=("Fictional therapeutics", "Fictional specialty care", "Fictional supplies")[i % 3],
            created_at=created,
            updated_at=created,
        ))

    session.flush()
    for i in range(count):
        number = i + 1
        created = now - timedelta(days=i % 100)
        account = accounts[i]
        contacts.append(
            _get_or_add(
                session,
                existing,
                Contact,
                i,
                account_id=account.id,
                full_name=f"Fictional Demo Contact {number:03d}",
                email=f"contact{number:03d}@example.invalid",
                phone=f"+1-555-010-{number:04d}",
                title=("Physician", "Pharmacist", "Practice Manager", "Procurement Lead")[i % 4],
                professional_category=("Healthcare professional", "Pharmacy", "Procurement")[i % 3],
                territory=account.territory,
                assigned_rep_id=rep.id,
                created_at=created,
                updated_at=created,
            )
        )
        distributors.append(
            _get_or_add(
                session,
                existing,
                Distributor,
                i,
                account_id=account.id,
                region=account.territory,
                assigned_manager_id=distributor_manager.id,
                created_at=created,
                updated_at=created,
            )
        )

    session.flush()
    for i in range(count):
        number = i + 1
        created = now - timedelta(days=i % 100)
        account = accounts[i]
        contact = contacts[i]
        product = products[i]
        _get_or_add(
            session,
            existing,
            HealthcareProfessionalProfile,
            i,
            contact_id=contact.id,
            specialty=("Cardiology", "Primary care", "Oncology", "Neurology")[i % 4],
            license_number=f"DEMO-LICENSE-{number:04d}",
            country="US",
            created_at=created,
            updated_at=created,
        )
        _get_or_add(
            session,
            existing,
            MarketApproval,
            i,
            product_id=product.id,
            market=account.market,
            status=("approved", "pending", "under_review")[i % 3],
            approval_reference=f"DEMO-APPROVAL-{number:04d}",
            valid_until=now + timedelta(days=180 + i),
            created_at=created,
            updated_at=created,
        )
        stage = ("prospecting", "qualification", "proposal", "negotiation", "won", "lost")[i % 6]
        opportunity = _get_or_add(
            session,
            existing,
            Opportunity,
            i,
            account_id=account.id,
            owner_id=rep.id,
            name=f"Fictional Demo Opportunity {number:03d}",
            stage=stage,
            estimated_value=Decimal(5000 + (i * 275) % 95000),
            probability=(10, 25, 50, 75, 100, 0)[i % 6],
            expected_close_date=(now + timedelta(days=i - 30)).date(),
            next_action="Review fictional demonstration opportunity",
            created_at=created,
            updated_at=created,
        )
        opportunities.append(opportunity)

    session.flush()
    field_visits = []
    order_items = []
    inventory_rows = []
    tender_documents = []
    support_comments = []
    ai_executions = []
    automation_runs = []

    for i in range(count):
        number = i + 1
        created = now - timedelta(days=i % 100)
        activity = _get_or_add(
            session,
            existing,
            SalesActivity,
            i,
            owner_id=rep.id,
            account_id=accounts[i].id,
            opportunity_id=opportunities[i].id,
            activity_type=("visit", "call", "email", "meeting")[i % 4],
            occurred_at=created,
            notes=f"DEMO-SEED:{number:04d} Fictional CRM activity.",
            created_at=created,
            updated_at=created,
        )
        field_visits.append((activity, contacts[i], created))
        _get_or_add(
            session,
            existing,
            CRMTask,
            i,
            title=f"Fictional demo follow-up task {number:03d}",
            assigned_to_id=rep.id,
            account_id=accounts[i].id,
            opportunity_id=opportunities[i].id,
            due_at=now + timedelta(days=(i % 30) - 10),
            status=("open", "in_progress", "completed")[i % 3],
            created_at=created,
            updated_at=created,
        )

        order = _get_or_add(
            session,
            existing,
            CustomerOrder,
            i,
            order_number=f"DEMO-ORDER-{number:04d}",
            account_id=accounts[i].id,
            distributor_id=distributors[i].id,
            created_by_id=rep.id,
            idempotency_key=f"demo-seed-order-{number:04d}",
            status=("draft", "submitted", "confirmed", "shipped", "cancelled")[i % 5],
            order_date=created,
            created_at=created,
            updated_at=created,
        )
        order_items.append((order, products[i], i))

        snapshot_at = datetime(2026, 1, 1, tzinfo=timezone.utc) + timedelta(minutes=i)
        snapshot = _get_or_add(
            session,
            existing,
            InventorySnapshot,
            i,
            distributor_id=distributors[i].id,
            product_id=products[i].id,
            quantity=(i * 17) % 400,
            snapshot_at=snapshot_at,
            created_at=created,
            updated_at=created,
        )
        lot = _get_or_add(
            session,
            existing,
            InventoryLotBalance,
            i,
            distributor_id=distributors[i].id,
            product_id=products[i].id,
            lot_number=f"DEMO-LOT-{number:04d}",
            batch_number=f"DEMO-BATCH-{number:04d}",
            expiry_date=(now + timedelta(days=90 + i)).date(),
            storage_conditions="Fictional demo; no real product storage.",
            quantity=(i * 17) % 400,
        )
        _get_or_add(
            session,
            existing,
            InventoryBalance,
            i,
            distributor_id=distributors[i].id,
            product_id=products[i].id,
            quantity=(i * 17) % 400,
        )
        inventory_rows.append((snapshot, lot, i, created))

        tender = _get_or_add(
            session,
            existing,
            Tender,
            i,
            account_id=accounts[i].id,
            reference=f"DEMO-TENDER-{number:04d}",
            title=f"Fictional Demo Tender {number:03d}",
            status=("draft", "open", "submitted", "awarded", "closed")[i % 5],
            due_at=now + timedelta(days=(i % 60) - 15),
            owner_id=tender_manager.id,
            requirements="Fictional demonstration requirements only.",
            review_status=("pending", "approved", "needs_revision")[i % 3],
            created_at=created,
            updated_at=created,
        )
        tender_documents.append((tender, i, number))

        case = _get_or_add(
            session,
            existing,
            SupportCase,
            i,
            account_id=accounts[i].id,
            contact_id=contacts[i].id,
            case_number=f"DEMO-CASE-{number:04d}",
            subject=f"Fictional demo support case {number:03d}",
            status=("open", "in_progress", "waiting", "resolved", "closed")[i % 5],
            description="Fictional support scenario for demonstration.",
            priority=("low", "normal", "high", "urgent")[i % 4],
            assigned_to_id=support_user.id,
            sla_due_at=now + timedelta(days=(i % 14) - 3),
            created_at=created,
            updated_at=created,
        )
        support_comments.append((case, i, number, created))

        _get_or_add(
            session,
            existing,
            ComplianceReview,
            i,
            subject_type="demo_opportunity",
            subject_id=opportunities[i].id,
            reviewer_id=compliance_user.id,
            status=("pending", "in_review", "approved", "rejected")[i % 4],
            findings=f"Fictional compliance exercise {number:03d}; not a real review.",
            created_at=created,
            updated_at=created,
        )
        _get_or_add(
            session,
            existing,
            PharmacovigilanceIntake,
            i,
            report_reference=f"DEMO-PV-{number:04d}",
            received_at=created,
            status=("received", "in_review", "follow_up", "closed")[i % 4],
            restricted_payload=json.dumps(
                {
                    "synthetic_demo_record": True,
                    "scenario": f"Training placeholder {number:03d}",
                    "patient_information": "intentionally omitted",
                    "clinical_details": "intentionally omitted",
                }
            ),
            access_classification="restricted",
            assigned_to_id=pv_user.id,
            created_at=created,
            updated_at=created,
        )

        agent = _get_or_add(
            session,
            existing,
            AIAgentDefinition,
            i,
            name=f"Fictional Demo Agent {number:03d}",
            version="demo-1.0",
            configuration=json.dumps({"demo_only": True, "mode": "simulation"}),
            is_active=(i % 10 != 0),
            created_at=created,
            updated_at=created,
        )
        ai_executions.append((agent, i, created, number))

        automation = _get_or_add(
            session,
            existing,
            AutomationDefinition,
            i,
            name=f"Fictional Demo Automation {number:03d}",
            trigger_type=("scheduled", "record_created", "status_changed")[i % 3],
            definition=json.dumps({"demo_only": True, "action": "no-op"}),
            is_active=(i % 8 != 0),
            created_at=created,
            updated_at=created,
        )
        automation_runs.append((automation, i, created, number))

        request = _get_or_add(
            session,
            existing,
            ApprovalRequest,
            i,
            requester_id=rep.id,
            subject_type="demo_opportunity",
            subject_id=opportunities[i].id,
            status=("pending", "approved", "rejected")[i % 3],
            created_at=created,
            updated_at=created,
        )
        approval_requests.append((i, request, created, number))

        _get_or_add(
            session,
            existing,
            Notification,
            i,
            user_id=demo_users[("MEDICAL_REPRESENTATIVE", "SALES_MANAGER", "EXECUTIVE")[i % 3]].id,
            title=f"Fictional demo notification {number:03d}",
            body="Synthetic notification for the demonstration workspace.",
            read_at=(created if i % 2 else None),
            created_at=created,
            updated_at=created,
        )
        _get_or_add(
            session,
            existing,
            AuditEvent,
            i,
            actor_id=admin.id,
            event_type="demo_record_seeded",
            entity_type="fictional_demo",
            entity_id=opportunities[i].id,
            external_event_id=f"demo-seed-audit-{number:04d}",
            event_data=json.dumps({"synthetic_demo_record": True}),
            created_at=created,
        )

    session.flush()
    for i, (activity, contact, created) in enumerate(field_visits):
        _get_or_add(
            session,
            existing,
            FieldVisit,
            i,
            sales_activity_id=activity.id,
            contact_id=contact.id,
            outcome="Fictional training outcome; no real customer interaction.",
            created_at=created,
            updated_at=created,
        )
    for i, (order, product, _) in enumerate(order_items):
        _get_or_add(
            session,
            existing,
            OrderItem,
            i,
            order_id=order.id,
            product_id=product.id,
            quantity=(i % 20) + 1,
            unit_price=Decimal("24.50") + Decimal(i % 100),
        )
    for snapshot, lot, i, created in inventory_rows:
        number = i + 1
        _get_or_add(
            session,
            existing,
            InventoryMovement,
            i,
            inventory_snapshot_id=snapshot.id,
            inventory_lot_id=lot.id,
            changed_by_id=inventory_manager.id,
            quantity_delta=((i % 21) - 10) or 1,
            reason="Fictional demonstration stock movement.",
            lot_number=lot.lot_number,
            batch_number=lot.batch_number,
            expiry_date=lot.expiry_date,
            storage_conditions=lot.storage_conditions,
            idempotency_key=f"demo-seed-inventory-{number:04d}",
            created_at=created,
        )
        _get_or_add(
            session,
            existing,
            StockRiskAlert,
            i,
            distributor_id=distributors[i].id,
            product_id=products[i].id,
            inventory_snapshot_id=snapshot.id,
            severity=("low", "medium", "high", "critical")[i % 4],
            status=("open", "acknowledged", "resolved")[i % 3],
            created_at=created,
            updated_at=created,
        )
    for tender, i, number in tender_documents:
        _get_or_add(
            session,
            existing,
            TenderDocument,
            i,
            tender_id=tender.id,
            file_name=f"fictional-demo-document-{number:03d}.txt",
            storage_key=f"demo-only/not-a-real-file/{number:04d}",
        )
    for case, i, number, created in support_comments:
        _get_or_add(
            session,
            existing,
            SupportComment,
            i,
            case_id=case.id,
            author_id=support_user.id,
            body=f"Fictional demo support update {number:03d}.",
            is_internal=(i % 2 == 0),
            created_at=created,
            updated_at=created,
        )
    for agent, i, created, number in ai_executions:
        _get_or_add(
            session,
            existing,
            AIExecution,
            i,
            agent_id=agent.id,
            initiated_by_id=admin.id,
            idempotency_key=f"demo-seed-ai-{number:04d}",
            status=("succeeded", "queued", "failed")[i % 3],
            input_summary="Fictional synthetic demonstration input.",
            output_summary="Simulated result only; no AI provider was called.",
            created_at=created,
            updated_at=created,
        )
    for automation, i, created, number in automation_runs:
        _get_or_add(
            session,
            existing,
            AutomationRun,
            i,
            automation_id=automation.id,
            idempotency_key=f"demo-seed-automation-{number:04d}",
            status=("succeeded", "skipped", "failed")[i % 3],
            result_summary="Simulated no-op; no external action was taken.",
            created_at=created,
            updated_at=created,
        )
    for i, request, created, number in approval_requests:
        _get_or_add(
            session,
            existing,
            ApprovalDecision,
            i,
            approval_request_id=request.id,
            approver_id=admin.id,
            decision=("approved", "rejected", "pending")[i % 3],
            comments=f"Fictional approval exercise {number:03d}.",
            created_at=created,
            updated_at=created,
        )
    session.flush()
    for agent, i, created, number in ai_executions:
        execution = existing[AIExecution][_id(AIExecution, i)]
        _get_or_add(
            session,
            existing,
            AIToolCall,
            i,
            execution_id=execution.id,
            tool_name=("lookup_demo_account", "summarize_demo_pipeline", "check_demo_inventory")[i % 3],
            status=("succeeded", "skipped", "failed")[i % 3],
            input_summary="Synthetic demonstration data only.",
            output_summary="Simulated tool output; no external system was contacted.",
            created_at=created,
            updated_at=created,
        )
        _get_or_add(
            session,
            existing,
            AIUsageRecord,
            i,
            execution_id=execution.id,
            provider="demo-simulator",
            model="fictional-demo",
            input_tokens=25 + i,
            output_tokens=10 + i % 50,
            estimated_cost=Decimal("0.000000"),
            created_at=created,
        )
