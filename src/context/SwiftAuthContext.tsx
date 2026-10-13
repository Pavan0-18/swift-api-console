import * as React from "react";
import { toast } from "sonner";

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
}

const SwiftAuthContext = React.createContext<SwiftAuthContextType | undefined>(undefined);

export function SwiftAuthProvider({ children }: { children: React.ReactNode }) {
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [authLoading, setAuthLoading] = React.useState(false);

  const [auth, setAuth] = React.useState<SwiftAuthSession>(() => {
    const savedKey = localStorage.getItem("swift_consumer_key") || "";
    const savedScope = localStorage.getItem("swift_scope") || "";
    return {
      connected: false,
      consumerKey: savedKey,
      consumerSecret: "",
      scope: savedScope,
    };
  });

  const connectAuth = async (
    consumerKey: string,
    consumerSecret: string,
    scope?: string
  ): Promise<boolean> => {
    if (!consumerKey || !consumerSecret) {
      toast.error("Please enter both Consumer Key and Consumer Secret");
      return false;
    }

    setAuthLoading(true);
    try {
      localStorage.setItem("swift_consumer_key", consumerKey);
      localStorage.setItem("swift_scope", scope || "");

      const res = await fetch("/api/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consumerKey,
          consumerSecret,
          scope: scope || undefined,
          environment: "sandbox",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "SWIFT authentication failed");
      }

      setAuth({
        connected: true,
        consumerKey,
        consumerSecret,
        scope,
        accessToken: json.data?.accessToken,
      });

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
    setAuth((prev) => ({
      ...prev,
      connected: false,
      accessToken: undefined,
    }));
    toast.info("Disconnected from SWIFT session");
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
