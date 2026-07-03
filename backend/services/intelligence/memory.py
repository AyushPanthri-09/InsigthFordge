import threading
from typing import Dict, Any, Optional
from backend.services.intelligence.contracts import SemanticResult

class SharedProjectMemory:
    """
    Thread-safe structured memory engine. Stores semantic understanding,
    evidence, columns metadata, and dataset relationships.
    This provides project memory so future agents can consume shared results.
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(SharedProjectMemory, cls).__new__(cls)
                cls._instance._memory = {}
                cls._instance._custom_data = {}
        return cls._instance

    def set_semantic_result(self, dataset_id: str, result: SemanticResult) -> None:
        """
        Stores the semantic intelligence results for a given dataset ID.
        """
        with self._lock:
            self._memory[dataset_id] = result

    def get_semantic_result(self, dataset_id: str) -> Optional[SemanticResult]:
        """
        Retrieves the semantic intelligence results for a given dataset ID.
        """
        with self._lock:
            return self._memory.get(dataset_id)

    def set_metadata(self, dataset_id: str, key: str, value: Any) -> None:
        """
        Stores custom metadata for a dataset.
        """
        with self._lock:
            if dataset_id not in self._custom_data:
                self._custom_data[dataset_id] = {}
            self._custom_data[dataset_id][key] = value

    def get_metadata(self, dataset_id: str, key: str) -> Optional[Any]:
        """
        Retrieves custom metadata for a dataset.
        """
        with self._lock:
            return self._custom_data.get(dataset_id, {}).get(key)

    def clear(self, dataset_id: Optional[str] = None) -> None:
        """
        Clears memory for a specific dataset, or completely resets memory if no ID is specified.
        """
        with self._lock:
            if dataset_id:
                self._memory.pop(dataset_id, None)
                self._custom_data.pop(dataset_id, None)
            else:
                self._memory.clear()
                self._custom_data.clear()
