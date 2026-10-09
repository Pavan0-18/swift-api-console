import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { Terminal, ArrowLeft } from "lucide-react";

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header */}
      <header className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 text-xs font-mono text-slate-600 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to API Tester</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-blue-600 flex items-center justify-center text-white text-xs">
            <Terminal className="h-3.5 w-3.5" />
          </div>
          <span className="font-semibold text-xs tracking-tight text-slate-900">SWIFT API Tester</span>
        </div>
      </header>

      {/* Main Form Center */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <AuthForm />
      </main>

      {/* Footer */}
      <footer className="px-6 py-3 border-t border-slate-200 text-center text-xs font-mono text-slate-500 bg-white">
        SWIFT OAuth 2.0 Credentials &bull; Encrypted Session Cookie
      </footer>
    </div>
  );
}
