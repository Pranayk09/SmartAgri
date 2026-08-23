import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sprout, ShieldAlert, KeyRound, Mail, Building2, ArrowRight, Loader2 } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('owner@smartagri.com');
    setPassword('Password@123');
    setError(null);
  };

  return (
    <div style={styles.container}>
      {/* Decorative background glows */}
      <div style={styles.glowGreen}></div>
      <div style={styles.glowBlue}></div>

      <div style={styles.card}>
        {/* Brand Header */}
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <Sprout size={36} color="#10b981" style={styles.logo} />
          </div>
          <h1 style={styles.title}>
            SmartAgri <span style={{ color: '#10b981' }}>ERP</span>
          </h1>
          <p style={styles.subtitle}>Fertilizer Manufacturing & Distribution</p>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <ShieldAlert size={20} color="#ef4444" style={{ flexShrink: 0 }} />
            <span style={styles.errorText}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} color="#94a3b8" style={styles.inputIcon} />
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <KeyRound size={18} color="#94a3b8" style={styles.inputIcon} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                required
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} style={styles.spinner} />
                Authenticating...
              </>
            ) : (
              <>
                Sign In <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Demo Helper Box */}
        <div style={styles.demoBox}>
          <div style={styles.demoHeader}>
            <Building2 size={16} color="#10b981" />
            <span style={styles.demoTitle}>Demo Environment Access</span>
          </div>
          <p style={styles.demoDesc}>
            Log in to the seeded organization <strong style={{ color: '#f8fafc' }}>AGRI_CORP</strong> as the system Owner.
          </p>
          <button onClick={fillDemoCredentials} style={styles.demoBtn} type="button">
            Prefill Owner Credentials
          </button>
        </div>
      </div>

      <div style={styles.footer}>
        <p>© 2026 SmartAgri ERP. Secured with JWT & RBAC tenant isolation.</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#0b0f17',
    position: 'relative',
    overflow: 'hidden',
    padding: '1.5rem',
  },
  glowGreen: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    top: '10%',
    left: '15%',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, rgba(0,0,0,0) 70%)',
    zIndex: 1,
    pointerEvents: 'none',
  },
  glowBlue: {
    position: 'absolute',
    width: '450px',
    height: '450px',
    bottom: '10%',
    right: '15%',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, rgba(0,0,0,0) 70%)',
    zIndex: 1,
    pointerEvents: 'none',
  },
  card: {
    position: 'relative',
    zIndex: 2,
    width: '100%',
    maxWidth: '440px',
    background: 'rgba(30, 41, 59, 0.4)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '20px',
    padding: '2.5rem',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(16, 185, 129, 0.05)',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '2rem',
    textAlign: 'center',
  },
  logoContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    marginBottom: '1rem',
  },
  logo: {
    animation: 'pulse 3s infinite ease-in-out',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#f8fafc',
    letterSpacing: '-0.02em',
    marginBottom: '0.25rem',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#94a3b8',
    fontWeight: 500,
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    marginBottom: '1.5rem',
  },
  errorText: {
    fontSize: '0.8125rem',
    color: '#fca5a5',
    fontWeight: 500,
    lineHeight: 1.4,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#cbd5e1',
    letterSpacing: '0.02em',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '1rem',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem 0.75rem 2.75rem',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    color: '#f8fafc',
    fontSize: '0.9375rem',
    transition: 'all 0.2s ease',
    outline: 'none',
  },
  // Add focus styles dynamically/inline or let browser handle standard outline.
  // We handle hover & focus border color transition cleanly.
  submitBtn: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.5rem',
    width: '100%',
    padding: '0.875rem',
    backgroundColor: '#059669',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontWeight: 700,
    fontSize: '0.9375rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '0.5rem',
  },
  spinner: {
    animation: 'spin 1s linear infinite',
  },
  demoBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.03)',
    border: '1px dashed rgba(16, 185, 129, 0.25)',
    borderRadius: '12px',
    padding: '1.25rem',
    marginTop: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  demoHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  demoTitle: {
    fontSize: '0.8125rem',
    fontWeight: 700,
    color: '#10b981',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  demoDesc: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    lineHeight: 1.4,
  },
  demoBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    color: '#10b981',
    border: '1px solid rgba(16, 185, 129, 0.4)',
    borderRadius: '6px',
    padding: '0.375rem 0.75rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '0.25rem',
  },
  footer: {
    position: 'relative',
    zIndex: 2,
    marginTop: '2rem',
    fontSize: '0.75rem',
    color: '#64748b',
    textAlign: 'center',
  },
};

// Insert custom animation keyframes into document head for spin and pulse
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.05); }
    }
    input:focus {
      border-color: rgba(16, 185, 129, 0.5) !important;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
    }
    button:hover {
      filter: brightness(1.1);
    }
  `;
  document.head.appendChild(style);
}
