import hashlib
import threading
from datetime import datetime
from backend.services.platform_intelligence.contracts import AuditRecord
from backend.services.intelligence.memory import SharedProjectMemory

class PlatformAuditLogger:
    """
    Immutable thread-safe audit trail recorder mapping cryptographic hashes of pipeline outputs.
    """
    _lock = threading.Lock()

    @staticmethod
    def log_action(
        dataset_id: str,
        action: str,
        agent_name: str,
        output_content: str,
        reasoning_path: str
    ) -> AuditRecord:
        """Appends a new hashed audit record to project memory."""
        # Calculate SHA-256 hash of output content to guarantee immutability/reproducibility
        output_hash = hashlib.sha256(output_content.encode("utf-8")).hexdigest()
        
        record = AuditRecord(
            timestamp=datetime.utcnow().isoformat() + "Z",
            action=action,
            agent_name=agent_name,
            output_hash=output_hash,
            reasoning_path=reasoning_path
        )
        
        with PlatformAuditLogger._lock:
            mem = SharedProjectMemory()
            audit_trail = mem.get_metadata(dataset_id, "platform_audit_trail") or []
            audit_trail.append(record.model_dump())
            mem.set_metadata(dataset_id, "platform_audit_trail", audit_trail)
            
        return record
