import { toast } from "sonner";

export interface UserProfile {
  id: string;
  email: string;
  role: "Admin" | "Manager" | "Analyst" | "Viewer";
  is_active: boolean;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  role: string;
}

const API_BASE_URL =
  (import.meta.env.VITE_INSIGHTFORGE_API_URL as string | undefined)?.trim() ||
  "http://127.0.0.1:8000";

class AuthService {
  private tokenKey = "insightforge_access_token";
  private refreshKey = "insightforge_refresh_token";
  private userKey = "insightforge_user";

  getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(this.tokenKey);
  }

  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(this.refreshKey);
  }

  getCurrentUser(): UserProfile | null {
    if (typeof window === "undefined") return null;
    const userStr = localStorage.getItem(this.userKey);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  async login(email: string, password: string): Promise<UserProfile> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || "Authentication failed. Invalid email or password.");
    }

    const data: LoginResponse = await response.json();
    localStorage.setItem(this.tokenKey, data.access_token);
    localStorage.setItem(this.refreshKey, data.refresh_token);

    // Call /me to get user details or construct from login
    const userProfile = await this.fetchProfile(data.access_token, email, data.role);
    localStorage.setItem(this.userKey, JSON.stringify(userProfile));

    return userProfile;
  }

  async register(email: string, password: string, role: string): Promise<UserProfile> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, role }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || "Registration failed. Email might already be taken.");
    }

    return response.json();
  }

  async logout(): Promise<void> {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();

    try {
      if (accessToken && refreshToken) {
        const response = await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) {
          console.warn("Backend logout failed; clearing local session only.", response.status);
        }
      }
    } catch (error) {
      console.warn("Backend logout failed; clearing local session only.", error);
    } finally {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.refreshKey);
      localStorage.removeItem(this.userKey);
      toast.info("Logged out successfully");
    }
  }

  private async fetchProfile(token: string, email: string, role: string): Promise<UserProfile> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn("Could not fetch full profile from /auth/me, utilizing fallback.", e);
    }

    // Fallback if /auth/me fails or is unimplemented
    return {
      id: "local-user",
      email,
      role: role as any,
      is_active: true,
    };
  }

  authFetch = async (url: string, init?: RequestInit): Promise<Response> => {
    const token = this.getAccessToken();
    const headers = new Headers(init?.headers);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(url, {
      ...init,
      headers,
    });
  };
}

export const authService = new AuthService();
