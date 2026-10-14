import { useState, useEffect, useCallback } from 'react';
import { LoginAttemptLog, LoginSecurityState } from '../types/idempiere';

const LOGS_STORAGE_KEY = 'idempiere_login_attempts_log';
const SECURITY_STORAGE_KEY = 'idempiere_security_state';

const DEFAULT_SECURITY: LoginSecurityState = {
  maxAttempts: 3,
  lockoutDurationSec: 60,
  failedCount: 0,
  lockedUntil: null,
};

export function useLoginSecurity() {
  const [logs, setLogs] = useState<LoginAttemptLog[]>(() => {
    try {
      const saved = localStorage.getItem(LOGS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [security, setSecurity] = useState<LoginSecurityState>(() => {
    try {
      const saved = localStorage.getItem(SECURITY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // If lockedUntil is in the past, reset lockout
        if (parsed.lockedUntil && Date.now() > parsed.lockedUntil) {
          return { ...parsed, failedCount: 0, lockedUntil: null };
        }
        return parsed;
      }
    } catch {}
    return DEFAULT_SECURITY;
  });

  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  // Sync lockout countdown
  useEffect(() => {
    if (!security.lockedUntil) {
      setSecondsRemaining(0);
      return;
    }

    const checkLockout = () => {
      const now = Date.now();
      const diffMs = security.lockedUntil! - now;
      if (diffMs <= 0) {
        setSecurity((prev) => {
          const updated = { ...prev, failedCount: 0, lockedUntil: null };
          try {
            localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        });
        setSecondsRemaining(0);
      } else {
        setSecondsRemaining(Math.ceil(diffMs / 1000));
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, [security.lockedUntil]);

  const recordAttempt = useCallback(
    (
      attempt: Omit<LoginAttemptLog, 'id' | 'timestamp' | 'attemptNumber'> & {
        status: 'SUCCESS' | 'FAILED' | 'BLOCKED';
      }
    ) => {
      const now = Date.now();
      const currentAttemptNumber = (security.failedCount || 0) + 1;

      const newLog: LoginAttemptLog = {
        id: Math.random().toString(36).substring(2, 10),
        timestamp: now,
        userName: attempt.userName,
        baseUrl: attempt.baseUrl,
        mode: attempt.mode,
        status: attempt.status,
        message: attempt.message,
        attemptNumber: attempt.status === 'SUCCESS' ? 1 : currentAttemptNumber,
        durationMs: attempt.durationMs,
      };

      setLogs((prev) => {
        const updated = [newLog, ...prev.slice(0, 99)]; // Keep last 100 logs
        try {
          localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (attempt.status === 'SUCCESS') {
        // Reset counter
        setSecurity((prev) => {
          const updated = { ...prev, failedCount: 0, lockedUntil: null };
          try {
            localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      } else if (attempt.status === 'FAILED') {
        const newCount = security.failedCount + 1;
        const willLock = newCount >= security.maxAttempts;
        const lockUntilTime = willLock ? now + security.lockoutDurationSec * 1000 : null;

        setSecurity((prev) => {
          const updated = {
            ...prev,
            failedCount: newCount,
            lockedUntil: lockUntilTime,
          };
          try {
            localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    },
    [security]
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
    try {
      localStorage.removeItem(LOGS_STORAGE_KEY);
    } catch {}
  }, []);

  const resetLockout = useCallback(() => {
    setSecurity((prev) => {
      const updated = { ...prev, failedCount: 0, lockedUntil: null };
      try {
        localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const updateMaxAttempts = useCallback((max: number) => {
    setSecurity((prev) => {
      const updated = { ...prev, maxAttempts: max };
      try {
        localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const isLocked = Boolean(security.lockedUntil && Date.now() < security.lockedUntil);
  const remainingAttempts = Math.max(0, security.maxAttempts - security.failedCount);

  return {
    logs,
    security,
    isLocked,
    secondsRemaining,
    remainingAttempts,
    recordAttempt,
    clearLogs,
    resetLockout,
    updateMaxAttempts,
  };
}
