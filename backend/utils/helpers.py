import uuid

def generate_id() -> str:
    """Generates a unique dataset identifier."""
    return str(uuid.uuid4())

def prettify_name(name: str) -> str:
    """Prettifies columns or labels by replacing symbols with spaces and capitalizing."""
    return name.replace("_", " ").replace("-", " ").strip().title()
