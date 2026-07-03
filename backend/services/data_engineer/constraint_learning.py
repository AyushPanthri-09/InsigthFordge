from typing import List, Dict, Any, Optional
from backend.services.intelligence.memory import SharedProjectMemory

class ConstraintLearner:
    """
    Saves and loads learned business constraints and schema constraints.
    Allows validation rules to be reused for future runs of the same dataset.
    """

    @staticmethod
    def learn_constraints(dataset_id: str, rules: List[Dict[str, Any]]) -> None:
        """
        Saves discovered validation rules to SharedProjectMemory.
        """
        memory = SharedProjectMemory()
        memory.set_metadata(dataset_id, "learned_rules", rules)

    @staticmethod
    def get_constraints(dataset_id: str) -> List[Dict[str, Any]]:
        """
        Retrieves learned validation rules from SharedProjectMemory.
        """
        memory = SharedProjectMemory()
        rules = memory.get_metadata(dataset_id, "learned_rules")
        return rules or []
