import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../lib/auth";
import type { Role } from "../types/database";

const hierarchy: Record<Role, number> = {
  super_admin: 3,
  regional_admin: 2,
  volunteer: 1,
};

export function RequireAuth({
  children,
  role,
}: {
  children: ReactNode;
  role?: Role;
}) {
  const { session, profile, loading } = useAuth();

  if (loading) return <div className="p-8">Loading…</div>;
  if (!session || !profile) return <Navigate to="/login" replace />;

  if (role && hierarchy[profile.role] < hierarchy[role]) {
    return <div className="p-8">You do not have access to this page.</div>;
  }

  return <>{children}</>;
}
