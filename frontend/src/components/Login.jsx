import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import {
  Sprout, ShieldAlert, KeyRound, Mail, Building2,
  Loader2, User, UserPlus, LogIn, Eye, EyeOff,
  ChevronDown, Search, CheckCircle2, X
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

  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [role, setRole] = useState("OWNER");

  const [organizations, setOrganizations] = useState([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (mode === "signup") {
      setOrgsLoading(true);
      axios.get("/api/auth/organizations")
        .then(res => { if (res.data?.success) setOrganizations(res.data.data); })
        .catch(() => setOrganizations([]))
        .finally(() => setOrgsLoading(false));
    }
  }, [mode]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const resetForm = () => {
    setName(""); setEmail(""); setPassword("");
    setRole("OWNER");
    setSelectedOrg(null);
    setSearchQuery(""); setDropdownOpen(false);
    setError(null); setShowPass(false);
  };

  const switchMode = (m) => { setMode(m); resetForm(); };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setLoading(true); setError(null);
    try { await login(email, password); }
    catch (err) { setError(err.message || "Authentication failed. Please check your credentials."); }
    finally { setLoading(false); }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !selectedOrg) { setError("Please fill in all required fields and select an organization."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true); setError(null);
    try {
      await register({ name, email, password, roleName: role, organizationCode: selectedOrg.code, organizationName: selectedOrg.name });
    } catch (err) { setError(err.message || "Registration failed. Please try again."); }
    finally { setLoading(false); }
  };

  const selectedRole = ROLES.find(r => r.value === role);
  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectOrg = (org) => { setSelectedOrg(org); setDropdownOpen(false); setSearchQuery(""); };
  const handleClearOrgSelection = () => { setSelectedOrg(null); };

  return (
    <div style={s.container}>
      <div style={s.glowGreen} />
      <div style={s.glowBlue} />
      <div style={s.card}>
        <div style={s.header}>
          <div style={s.logoBox}>
            <Sprout size={34} color="#10b981" style={{ animation: "pulse 3s infinite ease-in-out" }} />
          </div>
          <h1 style={s.title}>SmartAgri <span style={{ color: "#10b981" }}>ERP</span></h1>
          <p style={s.subtitle}>Fertilizer Manufacturing &amp; Distribution</p>
        </div>

        <div style={s.tabs}>
          <button style={tabStyle(mode === "signin")} onClick={() => switchMode("signin")}><LogIn size={15} /> Sign In</button>
          <button style={tabStyle(mode === "signup")} onClick={() => switchMode("signup")}><UserPlus size={15} /> Sign Up</button>
        </div>

        {error && (
          <div style={s.errorBox}>
            <ShieldAlert size={18} color="#ef4444" style={{ flexShrink: 0 }} />
            <span style={s.errorText}>{error}</span>
          </div>
        )}

        {mode === "signin" && (
          <form onSubmit={handleSignIn} style={s.form}>
            <Field label="Email Address" icon={<Mail size={17} color="#64748b" />}>
              <input type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} style={s.input} required disabled={loading} />
            </Field>
            <Field label="Password" icon={<KeyRound size={17} color="#64748b" />} right={<EyeToggle show={showPass} onToggle={() => setShowPass(p => !p)} />}>
              <input type={showPass ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={{ ...s.input, paddingRight: "2.75rem" }} required disabled={loading} />
            </Field>
            <button type="submit" style={s.submitBtn} disabled={loading}>
              {loading ? <><Loader2 size={17} style={{ animation: "spin 1s linear infinite" }} /> Signing in...</> : <><LogIn size={17} /> Sign In</>}
            </button>
            <p style={s.switchHint}>Don&apos;t have an account?{" "}<button type="button" style={s.linkBtn} onClick={() => switchMode("signup")}>Create one</button></p>
          </form>
        )}

        {mode === "signup" && (
          <form onSubmit={handleSignUp} style={s.form}>
            <Field label="Full Name" icon={<User size={17} color="#64748b" />}>
              <input type="text" placeholder="e.g. Priya Sharma" value={name} onChange={e => setName(e.target.value)} style={s.input} required disabled={loading} />
            </Field>
            <Field label="Email Address" icon={<Mail size={17} color="#64748b" />}>
              <input type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} style={s.input} required disabled={loading} />
            </Field>
            <Field label="Password" icon={<KeyRound size={17} color="#64748b" />} right={<EyeToggle show={showPass} onToggle={() => setShowPass(p => !p)} />}>
              <input type={showPass ? "text" : "password"} placeholder="Min 8 characters" value={password} onChange={e => setPassword(e.target.value)} style={{ ...s.input, paddingRight: "2.75rem" }} minLength={8} required disabled={loading} />
            </Field>

            <div>
              <label style={s.label}>Your Role</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.375rem" }}>
                {ROLES.map(r => (
                  <button key={r.value} type="button" onClick={() => setRole(r.value)} style={roleCardStyle(role === r.value, r.color)}>
                    <span style={{ fontWeight: 700, color: role === r.value ? r.color : "#cbd5e1", fontSize: "0.875rem" }}>{r.label}</span>
                    <span style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 2 }}>{r.desc}</span>
                    {role === r.value && <span style={{ position: "absolute", top: 10, right: 12, width: 8, height: 8, borderRadius: "50%", backgroundColor: r.color }} />}
                  </button>
                ))}
              </div>

            </div>

            <div>
              <label style={s.label}>Organization *</label>

              {!selectedOrg ? (
                <div style={{ position: "relative", marginTop: "0.375rem" }} ref={dropdownRef}>
                  <button type="button" onClick={() => !loading && setDropdownOpen(o => !o)} disabled={loading || orgsLoading} style={orgTriggerStyle(dropdownOpen)}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Building2 size={17} color="#64748b" />
                      {orgsLoading
                        ? <span style={{ color: "#64748b", fontSize: "0.875rem" }}>Loading organizations…</span>
                        : <span style={{ color: "#64748b", fontSize: "0.875rem" }}>Select your organization</span>}
                    </span>
                    {orgsLoading
                      ? <Loader2 size={16} color="#64748b" style={{ animation: "spin 1s linear infinite" }} />
                      : <ChevronDown size={16} color="#64748b" style={{ transition: "transform 0.2s", transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }} />}
                  </button>

                  {dropdownOpen && (
                    <div style={s.dropdownPanel}>
                      <div style={s.dropdownSearch}>
                        <Search size={14} color="#64748b" style={{ flexShrink: 0 }} />
                        <input type="text" placeholder="Search organizations…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={s.dropdownSearchInput} autoFocus />
                      </div>
                      <div style={s.dropdownList}>
                        {filteredOrgs.length > 0 ? (
                          <>
                            <div style={s.dropdownSectionLabel}>Registered Organizations</div>
                            {filteredOrgs.map(org => (
                              <button key={org.id} type="button" onClick={() => handleSelectOrg(org)} style={s.dropdownItem}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(16,185,129,0.08)"}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                                <div style={s.dropdownItemInner}>
                                  <Building2 size={15} color="#10b981" style={{ flexShrink: 0 }} />
                                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                                    <span style={{ color: "#f8fafc", fontSize: "0.875rem", fontWeight: 600 }}>{org.name}</span>
                                    <span style={{ color: "#64748b", fontSize: "0.72rem", fontFamily: "monospace" }}>{org.code}</span>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </>
                        ) : (
                          <div style={{ padding: "0.75rem 1rem", color: "#64748b", fontSize: "0.8rem", textAlign: "center" }}>
                            {searchQuery ? `No organizations match "${searchQuery}"` : "No organizations registered yet"}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ marginTop: "0.375rem" }}>
                  <div style={selectedOrgPillStyle("#10b981")}>
                    <CheckCircle2 size={15} color="#10b981" />
                    <div style={{ flex: 1 }}>
                      <span style={{ color: "#f8fafc", fontSize: "0.875rem", fontWeight: 600 }}>{selectedOrg.name}</span>
                      <span style={{ color: "#64748b", fontSize: "0.72rem", fontFamily: "monospace", marginLeft: 8 }}>{selectedOrg.code}</span>
                    </div>
                    <button type="button" onClick={handleClearOrgSelection} style={s.clearBtn} title="Change organization"><X size={14} /></button>
                  </div>
                </div>
              )}
            </div>

            <button type="submit" style={s.submitBtn} disabled={loading}>
              {loading ? <><Loader2 size={17} style={{ animation: "spin 1s linear infinite" }} /> Creating account...</> : <><UserPlus size={17} /> Create Account</>}
            </button>
            <p style={s.switchHint}>Already have an account?{" "}<button type="button" style={s.linkBtn} onClick={() => switchMode("signin")}>Sign in</button></p>
          </form>
        )}
      </div>

      <p style={s.footer}>© 2026 SmartAgri ERP · Secured with JWT &amp; RBAC</p>
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.8;transform:scale(1.05)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        input:focus { border-color: rgba(16,185,129,.5) !important; box-shadow: 0 0 0 3px rgba(16,185,129,.12); outline:none; }
      `}</style>
    </div>
  );
}

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
    <button type="button" onClick={onToggle} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex", padding: 0 }}>
      {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
}

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

function orgTriggerStyle(open) {
  return {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    width: "100%", padding: "0.7rem 1rem",
    backgroundColor: "rgba(15,23,42,0.6)",
    border: `1px solid ${open ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.08)"}`,
    boxShadow: open ? "0 0 0 3px rgba(16,185,129,0.12)" : "none",
    borderRadius: 10, color: "#f8fafc", fontSize: "0.9rem",
    transition: "all 0.2s", outline: "none", cursor: "pointer", boxSizing: "border-box",
  };
}

function selectedOrgPillStyle(accentColor) {
  return {
    display: "flex", alignItems: "center", gap: "0.5rem",
    padding: "0.6rem 0.875rem",
    backgroundColor: accentColor + "10",
    border: `1px solid ${accentColor}30`,
    borderRadius: 10, transition: "all 0.2s",
  };
}

const s = {
  container: { display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh", width: "100vw", backgroundColor: "#0b0f17", position: "relative", overflow: "hidden", padding: "1.5rem" },
  glowGreen: { position: "absolute", width: 420, height: 420, top: "8%", left: "12%", borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,.08) 0%, transparent 70%)", pointerEvents: "none" },
  glowBlue: { position: "absolute", width: 460, height: 460, bottom: "8%", right: "12%", borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,.08) 0%, transparent 70%)", pointerEvents: "none" },
  card: { position: "relative", zIndex: 2, width: "100%", maxWidth: 460, background: "rgba(30,41,59,0.45)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "2rem 2rem 2rem", boxShadow: "0 25px 50px -12px rgba(0,0,0,.55), 0 0 40px rgba(16,185,129,.06)" },
  header: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: "1.5rem" },
  logoBox: { display: "flex", justifyContent: "center", alignItems: "center", width: 60, height: 60, borderRadius: 14, backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", marginBottom: "0.875rem" },
  title: { fontSize: "1.625rem", fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em", margin: 0 },
  subtitle: { fontSize: "0.8rem", color: "#94a3b8", fontWeight: 500, marginTop: 4 },
  tabs: { display: "flex", gap: "0.25rem", marginBottom: "1.25rem", backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 4 },
  errorBox: { display: "flex", alignItems: "center", gap: "0.625rem", backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "1rem" },
  errorText: { fontSize: "0.8rem", color: "#fca5a5", fontWeight: 500, lineHeight: 1.4 },
  form: { display: "flex", flexDirection: "column", gap: "1rem" },
  label: { fontSize: "0.775rem", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.02em" },
  input: { width: "100%", padding: "0.7rem 1rem 0.7rem 2.6rem", backgroundColor: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#f8fafc", fontSize: "0.9rem", transition: "all .2s", outline: "none", boxSizing: "border-box" },
  submitBtn: { display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", width: "100%", padding: "0.8rem", backgroundColor: "#059669", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", transition: "all .2s", marginTop: "0.25rem" },
  switchHint: { textAlign: "center", fontSize: "0.8rem", color: "#64748b", margin: "0.25rem 0 0" },
  linkBtn: { background: "none", border: "none", color: "#10b981", fontWeight: 700, cursor: "pointer", fontSize: "0.8rem", padding: 0 },
  footer: { position: "relative", zIndex: 2, marginTop: "1.5rem", fontSize: "0.72rem", color: "#475569" },
  dropdownPanel: { position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 100, backgroundColor: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(16,185,129,0.1)", animation: "slideDown 0.15s ease-out" },
  dropdownSearch: { display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 0.875rem", borderBottom: "1px solid rgba(255,255,255,0.06)", backgroundColor: "rgba(0,0,0,0.2)" },
  dropdownSearchInput: { flex: 1, background: "none", border: "none", outline: "none", color: "#f8fafc", fontSize: "0.85rem" },
  dropdownList: { maxHeight: 220, overflowY: "auto" },
  dropdownSectionLabel: { padding: "0.4rem 0.875rem 0.2rem", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", color: "#475569", textTransform: "uppercase" },
  dropdownItem: { display: "block", width: "100%", padding: "0.55rem 0.875rem", background: "transparent", border: "none", cursor: "pointer", transition: "background-color 0.15s", textAlign: "left" },
  dropdownItemInner: { display: "flex", alignItems: "center", gap: "0.625rem" },
  clearBtn: { background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", padding: "0.1rem", borderRadius: 4, transition: "color 0.15s" },
};
