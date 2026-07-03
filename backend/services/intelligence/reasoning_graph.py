from typing import Dict, List, Set, Optional, Any
from backend.services.intelligence.contracts import ReasoningNode, ReasoningEdge, Evidence

class ReasoningGraph:
    """
    Lightweight Directed Graph representing conclusions, claims, and supporting evidence.
    Enables explainability by allowing developers to trace back conclusions.
    """
    def __init__(self):
        self.nodes: Dict[str, ReasoningNode] = {}
        self.edges: List[ReasoningEdge] = []
        # Adjacency representations
        self._adjacency_out: Dict[str, Set[str]] = {}  # source -> targets
        self._adjacency_in: Dict[str, Set[str]] = {}   # target -> sources

    def add_node(
        self,
        node_id: str,
        label: str,
        node_type: str,
        description: str,
        evidence: Optional[List[Evidence]] = None
    ) -> ReasoningNode:
        """
        Adds a new reasoning node or updates an existing one.
        """
        node = ReasoningNode(
            id=node_id,
            label=label,
            node_type=node_type,
            description=description,
            evidence=evidence or []
        )
        self.nodes[node_id] = node
        if node_id not in self._adjacency_out:
            self._adjacency_out[node_id] = set()
        if node_id not in self._adjacency_in:
            self._adjacency_in[node_id] = set()
        return node

    def add_edge(self, source_id: str, target_id: str, relationship_type: str = "supports") -> Optional[ReasoningEdge]:
        """
        Adds a directed edge between two reasoning nodes.
        """
        if source_id not in self.nodes or target_id not in self.nodes:
            # Nodes must exist first
            return None
            
        edge = ReasoningEdge(source=source_id, target=target_id, relationship_type=relationship_type)
        self.edges.append(edge)
        
        self._adjacency_out[source_id].add(target_id)
        self._adjacency_in[target_id].add(source_id)
        return edge

    def get_node(self, node_id: str) -> Optional[ReasoningNode]:
        """
        Retrieves a node by its identifier.
        """
        return self.nodes.get(node_id)

    def trace_dependencies(self, node_id: str) -> List[ReasoningNode]:
        """
        Traces and returns all ancestors (supporting nodes) of a given node (DFS).
        """
        visited = set()
        ancestors = []

        def dfs(curr_id: str):
            if curr_id in visited:
                return
            visited.add(curr_id)
            # Find all nodes that support (lead into) the current node
            sources = self._adjacency_in.get(curr_id, set())
            for src in sources:
                if src in self.nodes:
                    ancestors.append(self.nodes[src])
                    dfs(src)

        dfs(node_id)
        return ancestors

    def trace_implications(self, node_id: str) -> List[ReasoningNode]:
        """
        Traces and returns all descendants (nodes supported by this node) (DFS).
        """
        visited = set()
        descendants = []

        def dfs(curr_id: str):
            if curr_id in visited:
                return
            visited.add(curr_id)
            # Find all nodes that the current node supports
            targets = self._adjacency_out.get(curr_id, set())
            for tgt in targets:
                if tgt in self.nodes:
                    descendants.append(self.nodes[tgt])
                    dfs(tgt)

        dfs(node_id)
        return descendants

    def to_dict(self) -> Dict[str, Any]:
        """
        Converts the reasoning graph into a serializable dictionary.
        """
        return {
            "nodes": [node.model_dump() for node in self.nodes.values()],
            "edges": [edge.model_dump() for edge in self.edges]
        }
