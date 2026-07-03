import threading
from typing import List, Dict, Any
from datetime import datetime
from backend.services.data_engineer.contracts import AuditEntry

class AuditTrail:
    """
    Thread-safe audit logging manager to record all data engineering and cleaning actions.
    """
    def __init__(self):
        self._entries: List[AuditEntry] = []
        self._lock = threading.Lock()

    def record_entry(
        self,
        action: str,
        reason: str,
        confidence: float,
        affected_summary: str,
        evidence: Dict[str, Any] = None,
        rollback_info: Dict[str, Any] = None
    ) -> AuditEntry:
        """
        Creates and appends a new audit log entry.
        """
        entry = AuditEntry(
            timestamp=datetime.utcnow().isoformat() + "Z",
            action=action,
            reason=reason,
            evidence=evidence or {},
            confidence=max(0.0, min(1.0, confidence)),
            affected_data_summary=affected_summary,
            rollback_info=rollback_info or {}
        )
        with self._lock:
            self._entries.append(entry)
        return entry

    def get_trail(self) -> List[AuditEntry]:
        """
        Returns a copy of the audit trail.
        """
        with self._lock:
            return list(self._entries)

    def clear(self) -> None:
        """
        Clears the audit trail.
        """
        with self._lock:
            self._entries.clear()
