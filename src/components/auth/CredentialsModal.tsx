import * as React from "react";
import { KeyRound, Eye, EyeOff, ShieldCheck, Trash2, Clock } from "lucide-react";
import { useSwiftAuth } from "@/context/SwiftAuthContext";
import { FloatingInput } from "@/components/ui/FloatingInput";
import { Button } from "@/components/ui/button";

const DEFAULT_SCOPE = "swift.alliancecloud.api";

export function CredentialsModal() {
  const { auth, showAuthModal, setShowAuthModal, authLoading, connectAuth, purgeStoredCredentials } = useSwiftAuth();
  const [consumerKey, setConsumerKey] = React.useState(auth.consumerKey || "");
  const [consumerSecret, setConsumerSecret] = React.useState(auth.consumerSecret || "");
  const [scope, setScope] = React.useState(auth.scope || DEFAULT_SCOPE);
  const [showSecret, setShowSecret] = React.useState(false);

  React.useEffect(() => {
    if (showAuthModal) {
      setConsumerKey(auth.consumerKey || "");
      setConsumerSecret(auth.consumerSecret || "");
      setScope(auth.scope || DEFAULT_SCOPE);
    }
  }, [showAuthModal, auth]);

  if (!showAuthModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await connectAuth(consumerKey.trim(), consumerSecret.trim(), scope.trim() || DEFAULT_SCOPE);
  };

  const handlePurge = () => {
    purgeStoredCredentials();
    setConsumerKey("");
    setConsumerSecret("");
    setScope(DEFAULT_SCOPE);
  };

  const hasStoredCredentials = Boolean(auth.consumerKey || auth.connected);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in-50 zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#800020]" />
            <h3 className="text-sm font-bold text-slate-900">SWIFT OAuth Credentials</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowAuthModal(false)}
            className="text-slate-400 hover:text-slate-600 text-xs font-mono"
          >
            Close
          </button>
        </div>

        {/* Security / Encryption Badge */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-md p-3 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Client-Side AES-GCM-256 Vault</span>
          </div>
          <p className="text-[11px] text-emerald-800 leading-relaxed">
            Keys are encrypted on-device via Web Crypto PBKDF2 (SHA-256) and AES-GCM-256. Plaintext credentials are never saved to local storage and auto-purge after 60 minutes.
          </p>
          <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-mono pt-0.5">
            <Clock className="h-3 w-3 text-emerald-600" />
            <span>Session Lifetime: 60 min TTL (auto-clears on expiration)</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FloatingInput
            label="Consumer Key"
            placeholder="e.g. 7192a83f-..."
            value={consumerKey}
            onChange={(e) => setConsumerKey(e.target.value)}
          />

          <div className="relative">
            <FloatingInput
              label="Consumer Secret"
              type={showSecret ? "text" : "password"}
              placeholder="Enter consumer secret"
              value={consumerSecret}
              onChange={(e) => setConsumerSecret(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-4 text-slate-400 hover:text-slate-600"
              tabIndex={-1}
            >
              {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>

          <FloatingInput
            label="Scope (`session_scope`)"
            placeholder="swift.alliancecloud.api"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            helperText="Default: swift.alliancecloud.api (SWIFT Alliance Cloud API)"
          />

          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            {hasStoredCredentials ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePurge}
                className="text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-200 flex items-center gap-1"
                title="Immediately delete all encrypted keys and clear session"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Purge Stored Keys
              </Button>
            ) : (
              <span className="text-[11px] text-slate-400 font-mono">No keys stored</span>
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAuthModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={authLoading}
                className="bg-[#800020] hover:bg-[#66001a] text-white text-xs shadow-xs"
              >
                Connect & Authenticate
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
