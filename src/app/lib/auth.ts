export type UserRole = "ops" | "lead";

export interface User {
  role: UserRole;
  name: string;
}

const ROLE_PASSWORDS: Record<UserRole, string> = {
  ops: "ops123", // In production, read from env
  lead: "lead123",   // In production, read from env
};

export function authenticateUser(role: UserRole, password: string): boolean {
  return ROLE_PASSWORDS[role] === password;
}

export function getCurrentUser(): User | null {
  const storedRole = localStorage.getItem("xw_user_role") as UserRole | null;
  if (!storedRole) return null;

  return {
    role: storedRole,
    name: storedRole === "ops" ? "Ops" : "Lead",
  };
}

export function setCurrentUser(role: UserRole): void {
  localStorage.setItem("xw_user_role", role);
}

export function logout(): void {
  localStorage.removeItem("xw_user_role");
}
