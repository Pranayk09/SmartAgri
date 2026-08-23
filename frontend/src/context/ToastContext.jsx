import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    const newToast = { id, message, type };
    
    setToasts((prev) => [...prev, newToast]);

    // Auto remove after 4.5 seconds (allowing fadeout transition to look clean)
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Portal Container */}
      <div style={styles.toastContainer}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = ({ toast, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => onClose(toast.id), 200);
  };

  const getToastStyles = (type) => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 size={18} color="#10b981" />,
          borderColor: 'rgba(16, 185, 129, 0.2)',
          barColor: '#10b981',
          bg: 'rgba(11, 25, 23, 0.85)'
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={18} color="#f59e0b" />,
          borderColor: 'rgba(245, 158, 11, 0.2)',
          barColor: '#f59e0b',
          bg: 'rgba(28, 23, 14, 0.85)'
        };
      case 'error':
        return {
          icon: <AlertCircle size={18} color="#ef4444" />,
          borderColor: 'rgba(239, 68, 68, 0.2)',
          barColor: '#ef4444',
          bg: 'rgba(28, 15, 18, 0.85)'
        };
      case 'info':
      default:
        return {
          icon: <Info size={18} color="#3b82f6" />,
          borderColor: 'rgba(59, 130, 246, 0.2)',
          barColor: '#3b82f6',
          bg: 'rgba(15, 22, 38, 0.85)'
        };
    }
  };

  const { icon, borderColor, barColor, bg } = getToastStyles(toast.type);

  return (
    <div 
      style={{ 
        ...styles.toast, 
        backgroundColor: bg,
        borderColor: borderColor,
        animation: isClosing ? 'fadeOutSlideRight 0.2s ease forwards' : 'fadeInSlideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}
    >
      <div style={styles.toastBody}>
        {icon}
        <span style={styles.toastMessage}>{toast.message}</span>
        <button onClick={handleClose} style={styles.closeBtn}>
          <X size={14} />
        </button>
      </div>
      <div style={{ ...styles.progressBar, backgroundColor: barColor }} />
    </div>
  );
};

const styles = {
  toastContainer: {
    position: 'fixed',
    top: '1.5rem',
    right: '1.5rem',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    width: '100%',
    maxWidth: '380px',
    pointerEvents: 'none',
  },
  toast: {
    pointerEvents: 'auto',
    border: '1px solid',
    borderRadius: '10px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 0 1px 1px rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
    position: 'relative',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
  },
  toastBody: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.875rem 1rem',
  },
  toastMessage: {
    flex: 1,
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#f8fafc',
    lineHeight: 1.4,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    display: 'flex',
    padding: '0.125rem',
    borderRadius: '4px',
    transition: 'all 0.2s ease',
  },
  progressBar: {
    height: '3px',
    width: '100%',
    animation: 'shrinkBar 4.5s linear forwards',
    transformOrigin: 'left',
  }
};

// Append animations to head
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes fadeInSlideLeft {
      from { opacity: 0; transform: translateX(40px) scale(0.95); }
      to { opacity: 1; transform: translateX(0) scale(1); }
    }
    @keyframes fadeOutSlideRight {
      from { opacity: 1; transform: translateX(0) scale(1); }
      to { opacity: 0; transform: translateX(40px) scale(0.95); }
    }
    @keyframes shrinkBar {
      from { transform: scaleX(1); }
      to { transform: scaleX(0); }
    }
    .toast-close-btn:hover {
      background-color: rgba(255, 255, 255, 0.08);
      color: #f8fafc;
    }
  `;
  document.head.appendChild(style);
}
