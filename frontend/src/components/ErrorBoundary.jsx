import React, { Component } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.hash = '#dashboard';
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div className="card" style={styles.card}>
            <ShieldAlert size={48} color="#ef4444" style={styles.icon} />
            <h2 style={styles.title}>View Rendering Error</h2>
            <p style={styles.desc}>
              An unhandled exception occurred in the component rendering tree. This is captured by the ERP system's boundary layer.
            </p>
            {this.state.error && (
              <pre style={styles.pre}>
                {this.state.error.toString()}
              </pre>
            )}
            <button onClick={this.handleReset} style={styles.resetBtn}>
              <RefreshCw size={14} /> Reset View & Go to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '3rem 1.5rem',
    minHeight: '400px',
  },
  card: {
    maxWidth: '500px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '2.5rem',
    background: 'rgba(239, 68, 68, 0.03)',
    border: '1px solid rgba(239, 68, 68, 0.15)',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
  },
  icon: {
    marginBottom: '1rem',
    animation: 'pulse 2s infinite ease-in-out',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: '#f8fafc',
    marginBottom: '0.5rem',
  },
  desc: {
    fontSize: '0.875rem',
    color: '#94a3b8',
    lineHeight: 1.5,
    marginBottom: '1.5rem',
  },
  pre: {
    width: '100%',
    fontFamily: 'var(--font-mono)',
    backgroundColor: '#0b0f17',
    color: '#f87171',
    padding: '1rem',
    borderRadius: '8px',
    fontSize: '0.75rem',
    overflowX: 'auto',
    textAlign: 'left',
    border: '1px solid #1e293b',
    lineHeight: 1.4,
    marginBottom: '1.5rem',
  },
  resetBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: '#334155',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.625rem 1.25rem',
    fontSize: '0.8125rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  }
};
