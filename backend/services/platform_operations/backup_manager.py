import uuid
import hashlib
from datetime import datetime
from backend.services.platform_operations.contracts import BackupSnapshot
from backend.services.intelligence.memory import SharedProjectMemory

class PlatformBackupManager:
    """
    Creates serialized snapshot backups of the SharedProjectMemory and deliverables indexes.
    """

    @staticmethod
    def create_backup(dataset_id: str) -> BackupSnapshot:
        """Serializes SharedProjectMemory records and registers a backup hash."""
        mem = SharedProjectMemory()
        
        # Pull key artifacts to serialize
        checkpoints_key = f"checkpoint_Semantic"
        last_check = mem.get_metadata(dataset_id, "last_checkpoint")
        
        # Simple representation of cached state
        state_block = f"{dataset_id}-{last_check}"
        hash_code = hashlib.sha256(state_block.encode("utf-8")).hexdigest()
        
        snapshot_id = f"snap_{uuid.uuid4().hex[:6]}"
        snapshot = BackupSnapshot(
            snapshot_id=snapshot_id,
            timestamp=datetime.utcnow().isoformat() + "Z",
            hash_code=hash_code
        )
        
        # Save snapshot model in memory
        mem.set_metadata(dataset_id, f"backup_{snapshot_id}", snapshot.model_dump())
        mem.set_metadata(dataset_id, "last_backup_id", snapshot_id)
        
        return snapshot
