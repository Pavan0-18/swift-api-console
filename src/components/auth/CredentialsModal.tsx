import * as React from "react";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import { useSwiftAuth } from "@/context/SwiftAuthContext";
import { FloatingInput } from "@/components/ui/FloatingInput";
import { Button } from "@/components/ui/button";

export function CredentialsModal() {
  const { auth, showAuthModal, setShowAuthModal, authLoading, connectAuth } = useSwiftAuth();
  const [consumerKey, setConsumerKey] = React.useState(auth.consumerKey || "");
  const [consumerSecret, setConsumerSecret] = React.useState(auth.consumerSecret || "");
  const [scope, setScope] = React.useState(auth.scope || "");
  const [showSecret, setShowSecret] = React.useState(false);

  React.useEffect(() => {
    if (showAuthModal) {
      setConsumerKey(auth.consumerKey || "");
      setConsumerSecret(auth.consumerSecret || "");
      setScope(auth.scope || "");
    }
  }, [showAuthModal, auth]);

  if (!showAuthModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await connectAuth(consumerKey.trim(), consumerSecret.trim(), scope.trim());
  };

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
            placeholder="Paste session_scope from Postman (optional)"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            helperText="Leave empty to use account default scope"
          />

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
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
              className="bg-[#800020] hover:bg-[#66001a] text-white text-xs"
            >
              Connect & Authenticate
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
