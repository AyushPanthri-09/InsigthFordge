from backend.services.platform_operations.contracts import AccessRole

class AccessControlManager:
    """
    Enforces Role-Based Access Control (RBAC) supporting corporate permissions.
    """

    @staticmethod
    def get_role(role_name: str) -> AccessRole:
        """Returns the access role profile permissions list."""
        permissions = {
            "Administrator": ["read", "write", "execute", "delete", "admin"],
            "Executive": ["read", "write", "execute"],
            "Analyst": ["read", "write", "execute"],
            "Business User": ["read", "write"],
            "Viewer": ["read"],
            "Auditor": ["read", "audit"]
        }

        role_permissions = permissions.get(role_name, ["read"])

        return AccessRole(
            role_name=role_name,
            permissions=role_permissions
        )

    @staticmethod
    def authorize_action(role_name: str, required_permission: str) -> bool:
        """Checks if the user has the target permission."""
        role = AccessControlManager.get_role(role_name)
        return required_permission in role.permissions
