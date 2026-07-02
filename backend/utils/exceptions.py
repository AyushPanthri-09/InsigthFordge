class InsightForgeException(Exception):
    """Base exception for all InsightForge application errors."""
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)

class ParserException(InsightForgeException):
    """Raised when file parsing fails."""
    pass

class ValidationException(InsightForgeException):
    """Raised when file validation fails."""
    pass
