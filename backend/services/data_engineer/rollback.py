import threading
import pandas as pd
from typing import Dict, Tuple, Optional

class RollbackManager:
    """
    Thread-safe reversible state manager that caches column values before transformations.
    Enables restoring original column values when requested.
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(RollbackManager, cls).__new__(cls)
                cls._instance._backups = {}
        return cls._instance

    def register_backup(self, rollback_id: str, col_name: str, original_series: pd.Series) -> None:
        """
        Registers a deep copy of a column series before edit.
        """
        with self._lock:
            self._backups[rollback_id] = (col_name, original_series.copy())

    def restore_backup(self, df: pd.DataFrame, rollback_id: str) -> Tuple[pd.DataFrame, Optional[str]]:
        """
        Restores the backup corresponding to rollback_id into the provided DataFrame.
        Returns the modified DataFrame and the name of the restored column.
        """
        with self._lock:
            if rollback_id not in self._backups:
                return df, None
                
            col_name, original_series = self._backups[rollback_id]
            df[col_name] = original_series
            
            # Remove backup to free memory
            del self._backups[rollback_id]
            
            return df, col_name

    def clear(self) -> None:
        """
        Clears all backups.
        """
        with self._lock:
            self._backups.clear()
