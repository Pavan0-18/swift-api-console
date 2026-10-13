import * as React from "react";
import { toast } from "sonner";
import {
  saveEncryptedCredentials,
  loadEncryptedCredentials,
  purgeEncryptedCredentials,
  DEFAULT_SESSION_SCOPE,
} from "@/lib/security/credential-vault";

export interface SwiftAuthSession {
  connected: boolean;
  consumerKey?: string;
  consumerSecret?: string;
  scope?: string;
  accessToken?: string;
}

interface SwiftAuthContextType {
  auth: SwiftAuthSession;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  authLoading: boolean;
  connectAuth: (consumerKey: string, consumerSecret: string, scope?: string) => Promise<boolean>;
  disconnectAuth: () => void;
  purgeStoredCredentials: () => void;
}

const SwiftAuthContext = React.createContext<SwiftAuthContextType | undefined>(undefined);

export function SwiftAuthProvider({ children }: { children: React.ReactNode }) {
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [authLoading, setAuthLoading] = React.useState(false);
  const purgeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [auth, setAuth] = React.useState<SwiftAuthSession>({
    connected: false,
    consumerKey: "",
    consumerSecret: "",
    scope: DEFAULT_SESSION_SCOPE,
  });

  const clearAutoPurgeTimer = React.useCallback(() => {
    if (purgeTimerRef.current) {
      clearTimeout(purgeTimerRef.current);
      purgeTimerRef.current = null;
    }
  }, []);

  const scheduleAutoPurge = React.useCallback((expiresAt: number) => {
    clearAutoPurgeTimer();
    const remainingMs = Math.max(1000, expiresAt - Date.now());
    purgeTimerRef.current = setTimeout(() => {
      purgeEncryptedCredentials();
      setAuth({
        connected: false,
        consumerKey: "",
        consumerSecret: "",
        scope: DEFAULT_SESSION_SCOPE,
        accessToken: undefined,
      });
      toast.warning("SWIFT credentials expired (60-minute TTL reached) and have been securely erased.");
    }, remainingMs);
  }, [clearAutoPurgeTimer]);

  // Load encrypted credentials from secure vault on mount
  React.useEffect(() => {
    loadEncryptedCredentials()
      .then((saved) => {
        if (saved) {
          setAuth({
            connected: saved.connected,
            consumerKey: saved.consumerKey,
            consumerSecret: saved.consumerSecret || "",
            scope: saved.scope || DEFAULT_SESSION_SCOPE,
            accessToken: saved.accessToken,
          });

          if (saved.expiresAt && saved.expiresAt > Date.now()) {
            scheduleAutoPurge(saved.expiresAt);
          }
        }
      })
      .catch(() => {
        // Vault unavailable or invalid salt
      });

    return () => {
      clearAutoPurgeTimer();
    };
  }, [scheduleAutoPurge, clearAutoPurgeTimer]);

  const connectAuth = async (
    consumerKey: string,
    consumerSecret: string,
    scope?: string
  ): Promise<boolean> => {
    if (!consumerKey || !consumerSecret) {
      toast.error("Please enter both Consumer Key and Consumer Secret");
      return false;
    }

    const effectiveScope = (scope && scope.trim()) || DEFAULT_SESSION_SCOPE;

    setAuthLoading(true);
    try {
      const res = await fetch("/api/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consumerKey,
          consumerSecret,
          scope: effectiveScope,
          environment: "sandbox",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "SWIFT authentication failed");
      }

      const token = json.data?.accessToken;

      // Encrypt and persist into secure AES-GCM vault with TTL auto-purge
      const savedVault = await saveEncryptedCredentials({
        consumerKey,
        consumerSecret,
        scope: effectiveScope,
        accessToken: token,
        connected: true,
      });

      setAuth({
        connected: true,
        consumerKey,
        consumerSecret,
        scope: effectiveScope,
        accessToken: token,
      });

      if (savedVault.expiresAt) {
        scheduleAutoPurge(savedVault.expiresAt);
      }

      setShowAuthModal(false);
      toast.success("Successfully authenticated with SWIFT Gateway!");
      return true;
    } catch (err) {
      toast.error((err as Error).message);
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  const disconnectAuth = () => {
    clearAutoPurgeTimer();
    purgeEncryptedCredentials();
    setAuth({
      connected: false,
      consumerKey: "",
      consumerSecret: "",
      scope: DEFAULT_SESSION_SCOPE,
      accessToken: undefined,
    });
    toast.info("Disconnected and purged session credentials");
  };

  const purgeStoredCredentials = () => {
    clearAutoPurgeTimer();
    purgeEncryptedCredentials();
    setAuth({
      connected: false,
      consumerKey: "",
      consumerSecret: "",
      scope: DEFAULT_SESSION_SCOPE,
      accessToken: undefined,
    });
    toast.success("All encrypted credentials purged from client storage");
  };

  return (
    <SwiftAuthContext.Provider
      value={{
        auth,
        showAuthModal,
        setShowAuthModal,
        authLoading,
        connectAuth,
        disconnectAuth,
        purgeStoredCredentials,
      }}
    >
      {children}
    </SwiftAuthContext.Provider>
  );
}

export function useSwiftAuth() {
  const context = React.useContext(SwiftAuthContext);
  if (!context) {
    throw new Error("useSwiftAuth must be used within a SwiftAuthProvider");
  }
  return context;
}
