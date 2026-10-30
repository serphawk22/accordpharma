from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import Select, or_, select
from sqlalchemy.orm import Session

from app.core.security import get_user_roles
from app.models import Account, Contact, Distributor, Opportunity, User

GLOBAL_READ_ROLES = {"SUPER_ADMIN", "ADMIN", "EXECUTIVE"}
SALES_ROLES = {"SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "MEDICAL_REPRESENTATIVE", "EXECUTIVE"}


def account_scope(user: User, roles: set[str]) -> Select:
    query = select(Account).where(Account.archived_at.is_(None))
    if roles.intersection(GLOBAL_READ_ROLES):
        return query
    if "SALES_MANAGER" in roles:
        return query.where(Account.territory == user.territory)
    if "MEDICAL_REPRESENTATIVE" in roles:
        return query.where(Account.assigned_employee_id == user.id)
    if "DISTRIBUTOR_MANAGER" in roles:
        return query.join(Distributor, Distributor.account_id == Account.id).where(
            Distributor.assigned_manager_id == user.id
        )
    raise HTTPException(status_code=403, detail="Insufficient permissions")


def can_access_account(db: Session, user: User, account_id: UUID) -> Account:
    roles = get_user_roles(db, user.id)
    account = db.scalar(account_scope(user, roles).where(Account.id == account_id))
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


def can_access_contact(db: Session, user: User, contact_id: UUID) -> Contact:
    roles = get_user_roles(db, user.id)
    query = select(Contact).join(Account, Account.id == Contact.account_id).where(
        Contact.id == contact_id,
        Contact.status != "archived",
        Account.archived_at.is_(None),
    )
    if not roles.intersection(GLOBAL_READ_ROLES):
        if "SALES_MANAGER" in roles:
            query = query.where(Account.territory == user.territory)
        elif "MEDICAL_REPRESENTATIVE" in roles:
            query = query.where(
                or_(Contact.assigned_rep_id == user.id, Account.assigned_employee_id == user.id)
            )
        else:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    contact = db.scalar(query)
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


def can_access_opportunity(db: Session, user: User, opportunity_id: UUID) -> Opportunity:
    roles = get_user_roles(db, user.id)
    query = select(Opportunity).join(Account, Account.id == Opportunity.account_id).where(
        Opportunity.id == opportunity_id,
        Account.archived_at.is_(None),
    )
    if not roles.intersection(GLOBAL_READ_ROLES):
        if "SALES_MANAGER" in roles:
            query = query.where(Account.territory == user.territory)
        elif "MEDICAL_REPRESENTATIVE" in roles:
            query = query.where(
                or_(Opportunity.owner_id == user.id, Account.assigned_employee_id == user.id)
            )
        else:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    opportunity = db.scalar(query)
    if opportunity is None:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return opportunity
