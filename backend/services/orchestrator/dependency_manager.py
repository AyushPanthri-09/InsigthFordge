from typing import List, Dict
from backend.services.orchestrator.contracts import ExecutionStage

class DependencyManager:
    """
    Validates stage dependency chains and maps executing sequences.
    """

    @staticmethod
    def validate_dependencies(stages: List[ExecutionStage]) -> bool:
        """
        DFS cycle detection checking that the execution stages form a valid DAG.
        """
        adj = {}
        for s in stages:
            adj[s.stage_id] = s.dependencies

        visited = {}  # 0: unvisited, 1: visiting, 2: visited

        def dfs(node):
            visited[node] = 1
            for neighbor in adj.get(node, []):
                # Check for invalid external dependency
                if neighbor not in adj:
                    return True
                if visited.get(neighbor, 0) == 1:
                    return True  # Cycle detected
                if visited.get(neighbor, 0) == 0:
                    if dfs(neighbor):
                        return True
            visited[node] = 2
            return False

        for node in adj.keys():
            if visited.get(node, 0) == 0:
                if dfs(node):
                    return False  # Not a valid DAG
                    
        return True
