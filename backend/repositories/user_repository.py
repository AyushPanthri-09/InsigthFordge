from sqlalchemy.orm import Session
from backend.repositories.base import BaseRepository
from backend.models.db_models import User, Session as UserSession, AuditLog
from backend.core.security import get_password_hash
from typing import Optional, Any
import datetime

class UserRepository(BaseRepository[User]):
    """
    Handles read/write configurations for users, active sessions, and audit entries.
    """
    def __init__(self):
        super().__init__(User)

    def get_by_email(self, db: Session, email: str) -> Optional[User]:
        """
        Retrieves user record by unique email identifier.
        """
        return db.query(User).filter(User.email == email).first()

    def create_user(self, db: Session, *, email: str, password: str, role: str = "Viewer") -> User:
        """
        Inserts a new user record into table, hashing raw password fields first.
        """
        hashed_password = get_password_hash(password)
        db_user = User(
            email=email,
            hashed_password=hashed_password,
            role=role
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    def create_user_session(
        self, db: Session, *, user_id: Any, refresh_token: str, expires_at: datetime.datetime
    ) -> UserSession:
        """
        Stages token registers in database tracking active user sessions.
        """
        db_session = UserSession(
            user_id=user_id,
            refresh_token=refresh_token,
            expires_at=expires_at
        )
        db.add(db_session)
        db.commit()
        db.refresh(db_session)
        return db_session

    def get_active_session(self, db: Session, refresh_token: str) -> Optional[UserSession]:
        """
        Fetches an unrevoked active session by token sequence.
        """
        return db.query(UserSession).filter(
            UserSession.refresh_token == refresh_token,
            UserSession.is_revoked == False
        ).first()

    def revoke_user_session(self, db: Session, refresh_token: str) -> None:
        """
        Revokes a user session, rendering refresh tokens unusable.
        """
        db_session = db.query(UserSession).filter(UserSession.refresh_token == refresh_token).first()
        if db_session:
            db_session.is_revoked = True
            db.commit()

    def log_audit_action(self, db: Session, *, user_id: Any, action: str, ip_address: Optional[str] = None) -> AuditLog:
        """
        Creates audit log trail record.
        """
        log_entry = AuditLog(
            user_id=user_id,
            action=action,
            ip_address=ip_address
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry

user_repository = UserRepository()
