import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Sprout, ShieldAlert, KeyRound, Mail, Building2,
  ArrowRight, Loader2, User, UserPlus, LogIn, Eye, EyeOff, ChevronDown
} from "lucide-react";

const ROLES = [
  {
    value: "OWNER",
    label: "Owner",
    desc: "Full access — products, inventory, sales, users, reports",
    color: "#f59e0b",
  },
  {
    value: "INVENTORY_MANAGER",
    label: "Inventory Manager",
    desc: "Products, batches, stock movements, FEFO",
    color: "#60a5fa",
  },
  {
    value: "SALES_MANAGER",
    label: "Sales Manager",
    desc: "Customers, pricing, orders, invoices, payments",
    color: "#10b981",
  },
];

export default function Login() {
  const { login, register } = useAuth();

  // "signin" | "signup"
  const [mode, setMode] = useState("signin");

  // Shared fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Sign-up extra fields
  const [role, setRole] = useState("OWNER");
  const [orgCode, setOrgCode] = useState("");
  const [orgName, setOrgName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const resetForm = () => {
    setName(""); setEmail(""); setPassword("");
    setRole("OWNER"); setOrgCode(""); setOrgName("");
    setError(null); setShowPass(false);
  };

  const switchMode = (m) => { setMode(m); resetForm(); };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setLoading(true); setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !orgCode) {
      setError("Please fill in all required fields.");
      return;
    }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true); setError(null);
    try {
      await register({ name, email, password, roleName: role, organizationCode: orgCode.toUpperCase().trim(), organizationName: orgName || orgCode });
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = ROLES.find(r => r.value === role);

  return (
    <div style={s.container}>
      <div style={s.glowGreen} />
      <div style={s.glowBlue} />

      <div style={s.card}>
        {/* Brand */}
        <div style={s.header}>
          <div style={s.logoBox}>
            <Sprout size={34} color="#10b981" style={{ animation: "pulse 3s infinite ease-in-out" }} />
          </div>
          <h1 style={s.title}>SmartAgri <span style={{ color: "#10b981" }}>ERP</span></h1>
          <p style={s.subtitle}>Fertilizer Manufacturing &amp; Distribution</p>
        </div>

        {/* Tab toggle */}
        <div style={s.tabs}>
          <button style={tabStyle(mode === "signin")} onClick={() => switchMode("signin")}>
            <LogIn size={15} /> Sign In
          </button>
          <button style={tabStyle(mode === "signup")} onClick={() => switchMode("signup")}>
            <UserPlus size={15} /> Sign Up
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={s.errorBox}>
            <ShieldAlert size={18} color="#ef4444" style={{ flexShrink: 0 }} />
            <span style={s.errorText}>{error}</span>
          </div>
        )}

        {/* ── Sign In Form ──────────────────────────────────── */}
        {mode === "signin" && (
          <form onSubmit={handleSignIn} style={s.form}>
            <Field label="Email Address" icon={<Mail size={17} color="#64748b" />}>
              <input type="email" placeholder="you@company.com" value={email}
                onChange={e => setEmail(e.target.value)} style={s.input} required disabled={loading} />
            </Field>

            <Field label="Password" icon={<KeyRound size={17} color="#64748b" />}
              right={<EyeToggle show={showPass} onToggle={() => setShowPass(p => !p)} />}>
              <input type={showPass ? "text" : "password"} placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)} style={{ ...s.input, paddingRight: "2.75rem" }}
                required disabled={loading} />
            </Field>

            <button type="submit" style={s.submitBtn} disabled={loading}>
              {loading
                ? <><Loader2 size={17} style={{ animation: "spin 1s linear infinite" }} /> Signing in...</>
                : <><LogIn size={17} /> Sign In</>}
            </button>

            <p style={s.switchHint}>
              Don&apos;t have an account?{" "}
              <button type="button" style={s.linkBtn} onClick={() => switchMode("signup")}>Create one</button>
            </p>
          </form>
        )}

        {/* ── Sign Up Form ──────────────────────────────────── */}
        {mode === "signup" && (
          <form onSubmit={handleSignUp} style={s.form}>
            <Field label="Full Name" icon={<User size={17} color="#64748b" />}>
              <input type="text" placeholder="e.g. Priya Sharma" value={name}
                onChange={e => setName(e.target.value)} style={s.input} required disabled={loading} />
            </Field>

            <Field label="Email Address" icon={<Mail size={17} color="#64748b" />}>
              <input type="email" placeholder="you@company.com" value={email}
                onChange={e => setEmail(e.target.value)} style={s.input} required disabled={loading} />
            </Field>

            <Field label="Password" icon={<KeyRound size={17} color="#64748b" />}
              right={<EyeToggle show={showPass} onToggle={() => setShowPass(p => !p)} />}>
              <input type={showPass ? "text" : "password"} placeholder="Min 8 characters" value={password}
                onChange={e => setPassword(e.target.value)} style={{ ...s.input, paddingRight: "2.75rem" }}
                minLength={8} required disabled={loading} />
            </Field>

            {/* Role selector */}
            <div>
              <label style={s.label}>Your Role</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.375rem" }}>
                {ROLES.map(r => (
                  <button key={r.value} type="button" onClick={() => setRole(r.value)}
                    style={roleCardStyle(role === r.value, r.color)}>
                    <span style={{ fontWeight: 700, color: role === r.value ? r.color : "#cbd5e1", fontSize: "0.875rem" }}>
                      {r.label}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 2 }}>{r.desc}</span>
                    {role === r.value && (
                      <span style={{ position: "absolute", top: 10, right: 12, width: 8, height: 8, borderRadius: "50%", backgroundColor: r.color }} />
                    )}
                  </button>
                ))}
              </div>
              {selectedRole && (
                <p style={{ fontSize: "0.72rem", color: "#475569", marginTop: "0.5rem", paddingLeft: 2 }}>
                  💡 <strong style={{ color: "#94a3b8" }}>Note:</strong> If the organization code below is new, you will be assigned <strong style={{ color: selectedRole.color }}>OWNER</strong> regardless of selection.
                </p>
              )}
            </div>

            {/* Org Code */}
            <Field label="Organization Code *" icon={<Building2 size={17} color="#64748b" />}>
              <input type="text" placeholder="e.g. AGRI_CORP" value={orgCode}
                onChange={e => setOrgCode(e.target.value.toUpperCase())}
                style={s.input} required disabled={loading}
                title="Unique code for your company. Creates a new org if it doesn't exist." />
            </Field>

            {/* Org Name — only required when creating new */}
            <Field label="Organization Name (if new)" icon={<Building2 size={17} color="#64748b" />}>
              <input type="text" placeholder="e.g. Golden Agro Ltd." value={orgName}
                onChange={e => setOrgName(e.target.value)} style={s.input} disabled={loading} />
            </Field>

            <button type="submit" style={s.submitBtn} disabled={loading}>
              {loading
                ? <><Loader2 size={17} style={{ animation: "spin 1s linear infinite" }} /> Creating account...</>
                : <><UserPlus size={17} /> Create Account</>}
            </button>

            <p style={s.switchHint}>
              Already have an account?{" "}
              <button type="button" style={s.linkBtn} onClick={() => switchMode("signin")}>Sign in</button>
            </p>
          </form>
        )}
      </div>

      <p style={s.footer}>© 2026 SmartAgri ERP · Secured with JWT &amp; RBAC</p>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.8;transform:scale(1.05)} }
        input:focus { border-color: rgba(16,185,129,.5) !important; box-shadow: 0 0 0 3px rgba(16,185,129,.12); outline:none; }
      `}</style>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */
function Field({ label, icon, right, children }) {
  return (
    <div>
      <label style={s.label}>{label}</label>
      <div style={{ position: "relative", display: "flex", alignItems: "center", marginTop: "0.375rem" }}>
        <span style={{ position: "absolute", left: "0.875rem", pointerEvents: "none", display: "flex" }}>{icon}</span>
        <div style={{ flex: 1 }}>{children}</div>
        {right && <span style={{ position: "absolute", right: "0.875rem" }}>{right}</span>}
      </div>
    </div>
  );
}

function EyeToggle({ show, onToggle }) {
  return (
    <button type="button" onClick={onToggle}
      style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex", padding: 0 }}>
      {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
}

/* ── Styles ──────────────────────────────────────────────────────── */
function tabStyle(active) {
  return {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem",
    padding: "0.625rem", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.875rem",
    borderRadius: 10, transition: "all 0.2s",
    backgroundColor: active ? "rgba(16,185,129,0.12)" : "transparent",
    color: active ? "#10b981" : "#64748b",
    borderBottom: active ? "2px solid #10b981" : "2px solid transparent",
  };
}

function roleCardStyle(active, color) {
  return {
    position: "relative", display: "flex", flexDirection: "column", alignItems: "flex-start",
    width: "100%", padding: "0.625rem 0.875rem", borderRadius: 10, cursor: "pointer",
    border: `1px solid ${active ? color + "44" : "rgba(255,255,255,0.06)"}`,
    backgroundColor: active ? color + "12" : "rgba(255,255,255,0.02)",
    transition: "all 0.2s", textAlign: "left",
  };
}

const s = {
  container: {
    display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
    minHeight: "100vh", width: "100vw", backgroundColor: "#0b0f17",
    position: "relative", overflow: "hidden", padding: "1.5rem",
  },
  glowGreen: {
    position: "absolute", width: 420, height: 420, top: "8%", left: "12%",
    borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,.08) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  glowBlue: {
    position: "absolute", width: 460, height: 460, bottom: "8%", right: "12%",
    borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,.08) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  card: {
    position: "relative", zIndex: 2, width: "100%", maxWidth: 460,
    background: "rgba(30,41,59,0.45)", backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20, padding: "2rem 2rem 2rem",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,.55), 0 0 40px rgba(16,185,129,.06)",
  },
  header: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: "1.5rem" },
  logoBox: {
    display: "flex", justifyContent: "center", alignItems: "center",
    width: 60, height: 60, borderRadius: 14,
    backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", marginBottom: "0.875rem",
  },
  title: { fontSize: "1.625rem", fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em", margin: 0 },
  subtitle: { fontSize: "0.8rem", color: "#94a3b8", fontWeight: 500, marginTop: 4 },
  tabs: { display: "flex", gap: "0.25rem", marginBottom: "1.25rem", backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 4 },
  errorBox: {
    display: "flex", alignItems: "center", gap: "0.625rem",
    backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "1rem",
  },
  errorText: { fontSize: "0.8rem", color: "#fca5a5", fontWeight: 500, lineHeight: 1.4 },
  form: { display: "flex", flexDirection: "column", gap: "1rem" },
  label: { fontSize: "0.775rem", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.02em" },
  input: {
    width: "100%", padding: "0.7rem 1rem 0.7rem 2.6rem",
    backgroundColor: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10, color: "#f8fafc", fontSize: "0.9rem", transition: "all .2s", outline: "none",
    boxSizing: "border-box",
  },
  submitBtn: {
    display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem",
    width: "100%", padding: "0.8rem", backgroundColor: "#059669",
    color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: "0.9rem",
    cursor: "pointer", transition: "all .2s", marginTop: "0.25rem",
  },
  switchHint: { textAlign: "center", fontSize: "0.8rem", color: "#64748b", margin: "0.25rem 0 0" },
  linkBtn: {
    background: "none", border: "none", color: "#10b981", fontWeight: 700,
    cursor: "pointer", fontSize: "0.8rem", padding: 0,
  },
  footer: { position: "relative", zIndex: 2, marginTop: "1.5rem", fontSize: "0.72rem", color: "#475569" },
};
