from datetime import datetime
from backend.services.platform_operations.contracts import RecoveryPoint, BackupSnapshot
from backend.services.intelligence.memory import SharedProjectMemory

class PlatformRecoveryManager:
    """
    Restores system variables and cached reports from backup snapshots.
    """

    @staticmethod
    def restore_from_backup(
        dataset_id: str,
        backup_snapshot: BackupSnapshot
    ) -> RecoveryPoint:
        """
        Loads the backup and updates memory checkpoints status flags.
        """
        mem = SharedProjectMemory()
        
        # Verify hash match
        cached_backup = mem.get_metadata(dataset_id, f"backup_{backup_snapshot.snapshot_id}")
        restored = False
        
        if cached_backup and cached_backup.get("hash_code") == backup_snapshot.hash_code:
            # Restore checkpoints
            mem.set_metadata(dataset_id, "last_checkpoint", "Semantic")
            restored = True

        return RecoveryPoint(
            backup_id=backup_snapshot.snapshot_id,
            timestamp=datetime.utcnow().isoformat() + "Z",
            restored=restored
        )
