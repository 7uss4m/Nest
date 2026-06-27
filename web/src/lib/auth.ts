export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

export function getWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("workspaceId");
}

export function getUserDisplayName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("userDisplayName") ?? "";
}

export function getUserEmail(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("userEmail") ?? "";
}

export function getUserId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("userId") ?? "";
}

export function getWorkspaceName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("workspaceName") ?? "";
}

export function setUserSession(user: { displayName: string; email: string }): void {
  localStorage.setItem("userDisplayName", user.displayName);
  localStorage.setItem("userEmail", user.email);
}

export function setWorkspaceSession(workspace: { id: string; name: string }): void {
  localStorage.setItem("workspaceId", workspace.id);
  localStorage.setItem("workspaceName", workspace.name);
}

export function clearAuth(): void {
  ["accessToken", "refreshToken", "workspaceId", "workspaceName", "userDisplayName", "userEmail", "userId"].forEach(
    (k) => localStorage.removeItem(k)
  );
}
