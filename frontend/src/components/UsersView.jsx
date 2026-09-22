import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { apiGet, apiPost, apiPut } from "../utils/api";
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShieldOff,
  RefreshCw,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";

// ─── Role badge colours ───────────────────────────────────────────────────────
const ROLE_COLORS = {
  OWNER: { bg: "rgba(245, 158, 11, 0.12)", color: "#f59e0b", border: "rgba(245, 158, 11, 0.25)" },
  INVENTORY_MANAGER: { bg: "rgba(59, 130, 246, 0.12)", color: "#60a5fa", border: "rgba(59, 130, 246, 0.25)" },
  SALES_MANAGER: { bg: "rgba(16, 185, 129, 0.12)", color: "#10b981", border: "rgba(16, 185, 129, 0.25)" },
};

const STATUS_COLORS = {
  ACTIVE: { color: "#10b981", label: "Active" },
  INACTIVE: { color: "#94a3b8", label: "Inactive" },
  SUSPENDED: { color: "#ef4444", label: "Suspended" },
};

function RoleBadge({ role }) {
  const c = ROLE_COLORS[role] || { bg: "rgba(148,163,184,0.1)", color: "#94a3b8", border: "rgba(148,163,184,0.25)" };
  return (
    <span style={{ backgroundColor: c.bg, color: c.color, border: `1px solid ${c.border}`, borderRadius: 6, padding: "2px 10px", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.04em" }}>
      {role}
    </span>
  );
}

function StatusDot({ status }) {
  const s = STATUS_COLORS[status] || { color: "#94a3b8", label: status };
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8125rem", fontWeight: 600, color: s.color }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: s.color, display: "inline-block" }} />
      {s.label}
    </span>
  );
}

export default function UsersView() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(null);   // { user }
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Create user form
  const [form, setForm] = useState({ name: "", email: "", password: "", roleName: "" });
  const [showPass, setShowPass] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersRes, rolesRes] = await Promise.all([
        apiGet("/users"),
        apiGet("/users/roles"),
      ]);
      setUsers(usersRes.data || []);
      // Exclude OWNER from assignable roles in dropdowns
      setRoles((rolesRes.data || []).filter(r => r.name !== "OWNER"));
    } catch (err) {
      setError(err.message || "Failed to load user data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Create User ────────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.roleName) return;
    try {
      setActionLoading(true);
      await apiPost("/users", form);
      showToast(`User ${form.name} created successfully.`);
      setShowCreateModal(false);
      setForm({ name: "", email: "", password: "", roleName: "" });
      fetchData();
    } catch (err) {
      showToast(err.message || "Failed to create user.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Toggle Status ──────────────────────────────────────────────────────────
  const handleToggleStatus = async (targetUser) => {
    const newStatus = targetUser.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      setActionLoading(true);
      await apiPut(`/users/${targetUser.id}/status`, { status: newStatus });
      showToast(`${targetUser.name} is now ${newStatus}.`);
      fetchData();
    } catch (err) {
      showToast(err.message || "Failed to update status.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Change Role ────────────────────────────────────────────────────────────
  const handleRoleChange = async (newRoleName) => {
    if (!showRoleModal) return;
    try {
      setActionLoading(true);
      await apiPut(`/users/${showRoleModal.user.id}/role`, { roleName: newRoleName });
      showToast(`${showRoleModal.user.name}'s role updated to ${newRoleName}.`);
      setShowRoleModal(null);
      fetchData();
    } catch (err) {
      showToast(err.message || "Failed to update role.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "6rem", gap: "1rem" }}>
        <Loader2 size={32} color="#10b981" style={{ animation: "spin 1s linear infinite" }} />
        <span style={{ color: "#94a3b8", fontWeight: 600 }}>Loading users...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "6rem" }}>
        <div className="card" style={{ maxWidth: 440, textAlign: "center", padding: "2.5rem", border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.04)" }}>
          <AlertTriangle size={40} color="#ef4444" style={{ marginBottom: "1rem" }} />
          <p style={{ color: "#ef4444", fontWeight: 600 }}>{error}</p>
          <button onClick={fetchData} className="btn btn-primary" style={{ marginTop: "1.5rem" }}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: 1100, margin: "0 auto" }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: "1.5rem", right: "1.5rem", zIndex: 9999, backgroundColor: toast.type === "error" ? "#ef4444" : "#10b981", color: "#fff", borderRadius: 10, padding: "0.875rem 1.25rem", fontWeight: 600, fontSize: "0.875rem", boxShadow: "0 8px 24px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", gap: "0.625rem", maxWidth: 380 }}>
          {toast.type === "error" ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ padding: "0.625rem", backgroundColor: "rgba(16,185,129,0.1)", borderRadius: 10, border: "1px solid rgba(16,185,129,0.2)" }}>
            <Users size={22} color="#10b981" />
          </div>
          <div>
            <h2 style={{ fontSize: "1.375rem", fontWeight: 800, color: "#f8fafc", margin: 0 }}>User Management</h2>
            <p style={{ color: "#64748b", fontSize: "0.8125rem", margin: 0, marginTop: 2 }}>
              {users.length} member{users.length !== 1 ? "s" : ""} in <strong style={{ color: "#94a3b8" }}>{currentUser.organizationName}</strong>
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={fetchData} style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 0.875rem", backgroundColor: "rgba(255,255,255,0.04)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer", transition: "all 0.2s" }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <UserPlus size={16} /> Add User
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="card" style={{ overflow: "hidden", padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "rgba(15,23,42,0.6)" }}>
              {["Name & Email", "Role", "Status", "Joined", "Actions"].map(h => (
                <th key={h} style={{ padding: "0.875rem 1.25rem", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, idx) => {
              const isSelf = u.id === currentUser.id;
              const isOwner = u.role?.name === "OWNER";
              return (
                <tr key={u.id} style={{ backgroundColor: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)", transition: "background 0.15s" }}>
                  <td style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.875rem", fontWeight: 800, color: "#10b981" }}>
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ margin: 0, color: "#f1f5f9", fontWeight: 700, fontSize: "0.875rem" }}>
                          {u.name} {isSelf && <span style={{ fontSize: "0.7rem", color: "#10b981", fontWeight: 700 }}>(you)</span>}
                        </p>
                        <p style={{ margin: 0, color: "#64748b", fontSize: "0.75rem" }}>{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <RoleBadge role={u.role?.name} />
                  </td>
                  <td style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <StatusDot status={u.status} />
                  </td>
                  <td style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.03)", color: "#64748b", fontSize: "0.8125rem" }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {/* Toggle Status */}
                      {!isSelf && !isOwner && (
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={actionLoading}
                          title={u.status === "ACTIVE" ? "Deactivate user" : "Activate user"}
                          style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.4rem 0.75rem", borderRadius: 7, border: `1px solid ${u.status === "ACTIVE" ? "rgba(239,68,68,0.25)" : "rgba(16,185,129,0.25)"}`, backgroundColor: u.status === "ACTIVE" ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)", color: u.status === "ACTIVE" ? "#ef4444" : "#10b981", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
                          {u.status === "ACTIVE" ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                          {u.status === "ACTIVE" ? "Disable" : "Enable"}
                        </button>
                      )}
                      {/* Change Role */}
                      {!isSelf && !isOwner && (
                        <button
                          onClick={() => setShowRoleModal({ user: u })}
                          disabled={actionLoading}
                          title="Change role"
                          style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.4rem 0.75rem", borderRadius: 7, border: "1px solid rgba(99,102,241,0.25)", backgroundColor: "rgba(99,102,241,0.08)", color: "#818cf8", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
                          <ChevronDown size={13} /> Role
                        </button>
                      )}
                      {(isSelf || isOwner) && (
                        <span style={{ color: "#475569", fontSize: "0.75rem", fontStyle: "italic" }}>
                          {isSelf ? "— (your account)" : "— (protected)"}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {users.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem", color: "#475569" }}>No users found in this organization.</div>
        )}
      </div>

      {/* ── Create User Modal ─────────────────────────────────────────────── */}
      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "1rem" }}>
          <div className="card" style={{ width: "100%", maxWidth: 480, padding: "2rem", position: "relative" }}>
            <button onClick={() => setShowCreateModal(false)} style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
              <X size={20} />
            </button>
            <h3 style={{ margin: "0 0 1.5rem", fontWeight: 800, fontSize: "1.125rem", color: "#f1f5f9" }}>
              <UserPlus size={18} style={{ marginRight: 8, verticalAlign: "middle", color: "#10b981" }} />
              Create New User
            </h3>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {[
                { label: "Full Name", key: "name", type: "text", placeholder: "e.g. Rohan Mehta" },
                { label: "Email Address", key: "email", type: "email", placeholder: "e.g. rohan@company.com" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input
                    type={type} placeholder={placeholder} value={form[key]} required
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              ))}

              {/* Password with toggle */}
              <div>
                <label style={labelStyle}>Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPass ? "text" : "password"} placeholder="Min 8 characters" value={form.password} required minLength={8}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    style={{ ...inputStyle, paddingRight: "2.5rem" }}
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Role Selector */}
              <div>
                <label style={labelStyle}>Role</label>
                <select
                  required value={form.roleName}
                  onChange={e => setForm(p => ({ ...p, roleName: e.target.value }))}
                  style={{ ...inputStyle, appearance: "none" }}>
                  <option value="">— Select a role —</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.name}>{r.name.replace(/_/g, " ")}</option>
                  ))}
                </select>
                {form.roleName && (
                  <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 6 }}>
                    {roles.find(r => r.name === form.roleName)?.description}
                  </p>
                )}
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ flex: 1, padding: "0.625rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "transparent", color: "#94a3b8", fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary" style={{ flex: 2, display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}>
                  {actionLoading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <UserPlus size={16} />}
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Change Role Modal ─────────────────────────────────────────────── */}
      {showRoleModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "1rem" }}>
          <div className="card" style={{ width: "100%", maxWidth: 400, padding: "2rem", position: "relative" }}>
            <button onClick={() => setShowRoleModal(null)} style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
              <X size={20} />
            </button>
            <h3 style={{ margin: "0 0 0.375rem", fontWeight: 800, fontSize: "1.125rem", color: "#f1f5f9" }}>Change Role</h3>
            <p style={{ margin: "0 0 1.5rem", fontSize: "0.8125rem", color: "#64748b" }}>
              Select a new role for <strong style={{ color: "#94a3b8" }}>{showRoleModal.user.name}</strong>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {roles.map(r => (
                <button
                  key={r.id}
                  onClick={() => handleRoleChange(r.name)}
                  disabled={actionLoading || r.name === showRoleModal.user.role?.name}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "flex-start",
                    padding: "0.875rem 1rem", borderRadius: 10, border: `1px solid ${r.name === showRoleModal.user.role?.name ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.06)"}`,
                    backgroundColor: r.name === showRoleModal.user.role?.name ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.02)",
                    cursor: r.name === showRoleModal.user.role?.name ? "default" : "pointer",
                    transition: "all 0.2s", textAlign: "left", width: "100%"
                  }}>
                  <span style={{ fontWeight: 700, color: r.name === showRoleModal.user.role?.name ? "#10b981" : "#f1f5f9", fontSize: "0.875rem" }}>
                    {r.name.replace(/_/g, " ")}
                    {r.name === showRoleModal.user.role?.name && " (current)"}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>{r.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = {
  display: "block", marginBottom: 6, fontSize: "0.8125rem", fontWeight: 600, color: "#94a3b8"
};

const inputStyle = {
  width: "100%", padding: "0.625rem 0.875rem", backgroundColor: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#f1f5f9",
  fontSize: "0.875rem", outline: "none", boxSizing: "border-box"
};
