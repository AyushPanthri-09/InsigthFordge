import threading
from datetime import datetime
from typing import List, Dict, Any, Callable
from backend.services.orchestrator.contracts import WorkflowEvent
from backend.services.intelligence.memory import SharedProjectMemory

class EventBus:
    """
    Thread-safe event publishing and subscription manager.
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if not cls._instance:
                cls._instance = super(EventBus, cls).__new__(cls, *args, **kwargs)
                cls._instance._listeners = {}
                cls._instance._history = []
            return cls._instance

    def register_listener(self, event_type: str, callback: Callable[[WorkflowEvent], None]):
        """Registers a listener callback for a specific event type."""
        with self._lock:
            if event_type not in self._listeners:
                self._listeners[event_type] = []
            self._listeners[event_type].append(callback)

    def publish(self, event_type: str, payload: Dict[str, Any], dataset_id: str = "global"):
        """Publishes an event thread-safely and caches event history in memory."""
        event = WorkflowEvent(
            event_type=event_type,
            payload=payload,
            timestamp=datetime.utcnow().isoformat() + "Z"
        )
        
        with self._lock:
            self._history.append(event)
            listeners = list(self._listeners.get(event_type, []))
            # Also catch wildcard listeners
            listeners.extend(self._listeners.get("*", []))

        # Invoke callbacks outside lock to prevent deadlock
        for callback in listeners:
            try:
                callback(event)
            except Exception:
                pass

        # Update SharedProjectMemory
        mem = SharedProjectMemory()
        events_list = mem.get_metadata(dataset_id, "events") or []
        events_list.append(event.model_dump())
        mem.set_metadata(dataset_id, "events", events_list)
