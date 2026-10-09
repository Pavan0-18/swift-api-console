"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { connectSwiftSchema, ConnectSwiftInput } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { KeyRound, Eye, EyeOff, X, CheckCircle2, Sparkles, ShieldAlert, Sliders } from "lucide-react";
import { SwiftEnvironmentKey, SwiftSessionPublic, ApiResponse } from "@/types/swift";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AuthToolbarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthToolbar({ isOpen, onClose }: AuthToolbarProps) {
  const [showSecret, setShowSecret] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<"oauth" | "token" | "simulate">("oauth");
  const queryClient = useQueryClient();

  const { data: sessionData } = useQuery<ApiResponse<SwiftSessionPublic>>({
    queryKey: ["swift-session"],
    queryFn: async () => {
      const res = await fetch("/api/auth/session");
      if (!res.ok) throw new Error("Failed to fetch session");
      return res.json();
    },
  });

  const session = sessionData?.data;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ConnectSwiftInput>({
    resolver: zodResolver(connectSwiftSchema),
    defaultValues: {
      environment: (session?.environment as SwiftEnvironmentKey) || "sandbox",
      mode: "oauth",
      consumerKey: "",
      consumerSecret: "",
      scope: "",
      directToken: "",
    },
  });

  React.useEffect(() => {
    setValue("mode", authMode);
  }, [authMode, setValue]);

  React.useEffect(() => {
    if (session?.environment) {
      setValue("environment", session.environment);
    }
  }, [session, setValue]);

  const authMutation = useMutation({
    mutationFn: async (input: ConnectSwiftInput) => {
      const response = await fetch("/api/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data: ApiResponse<{
        connected: boolean;
        environment: SwiftEnvironmentKey;
        consumerKeyMasked: string;
        expiresIn: number;
      }> = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "SWIFT authentication failed");
      }

      return data.data;
    },
    onSuccess: (data) => {
      toast.success(`Session active for SWIFT ${data?.environment.toUpperCase()}!`);
      queryClient.invalidateQueries({ queryKey: ["swift-session"] });
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to authenticate");
    },
  });

  if (!isOpen) return null;

  return (
    <div className="border-b border-slate-200 bg-slate-50 p-4 shadow-inner">
      <div className="max-w-5xl mx-auto space-y-3">
        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              SWIFT JWT Bearer OAuth (Postman Compatible)
            </span>
            {session?.connected && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                <CheckCircle2 className="h-3 w-3" />
                Connected ({session.consumerKeyMasked})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Mode selection tabs */}
            <div className="flex rounded border border-slate-300 bg-white p-0.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setAuthMode("oauth")}
                className={cn(
                  "px-2 py-0.5 rounded transition-all",
                  authMode === "oauth" ? "bg-blue-600 text-white font-semibold" : "text-slate-600 hover:text-slate-900"
                )}
              >
                OAuth 2.0 (JWT)
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("token")}
                className={cn(
                  "px-2 py-0.5 rounded transition-all",
                  authMode === "token" ? "bg-blue-600 text-white font-semibold" : "text-slate-600 hover:text-slate-900"
                )}
              >
                Paste Bearer Token
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("simulate")}
                className={cn(
                  "px-2 py-0.5 rounded transition-all",
                  authMode === "simulate" ? "bg-emerald-600 text-white font-semibold" : "text-slate-600 hover:text-slate-900"
                )}
              >
                Simulate
              </button>
            </div>

            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Error banner */}
        {authMutation.isError && (
          <div className="flex items-start gap-2 p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700">
            <ShieldAlert className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">SWIFT Gateway Error</span>
              <span className="text-slate-600">{authMutation.error.message}</span>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit((data) => authMutation.mutate(data))}
          className="space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            {/* Environment */}
            <div className="space-y-1">
              <Label htmlFor="env">Environment</Label>
              <Select id="env" {...register("environment")}>
                <option value="sandbox">Sandbox (Alliance Cloud v2)</option>
                <option value="test">Test / SIPN (Alliance Cloud Test)</option>
              </Select>
            </div>

            {authMode === "oauth" && (
              <>
                {/* Consumer Key */}
                <div className="space-y-1">
                  <Label htmlFor="key">Consumer Key</Label>
                  <Input
                    id="key"
                    type="text"
                    placeholder="e.g. 7192a83f-swift-key"
                    autoComplete="off"
                    {...register("consumerKey")}
                  />
                  {errors.consumerKey && (
                    <p className="text-[10px] text-red-600 font-mono">{errors.consumerKey.message}</p>
                  )}
                </div>

                {/* Consumer Secret */}
                <div className="space-y-1">
                  <Label htmlFor="secret">Consumer Secret</Label>
                  <div className="relative">
                    <Input
                      id="secret"
                      type={showSecret ? "text" : "password"}
                      placeholder="Enter Consumer Secret"
                      autoComplete="new-password"
                      className="pr-8"
                      {...register("consumerSecret")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  {errors.consumerSecret && (
                    <p className="text-[10px] text-red-600 font-mono">{errors.consumerSecret.message}</p>
                  )}
                </div>
              </>
            )}

            {authMode === "token" && (
              <div className="col-span-2 space-y-1">
                <Label htmlFor="directToken">Bearer Access Token</Label>
                <Input
                  id="directToken"
                  type="text"
                  placeholder="Paste Bearer token from SWIFT Developer Portal..."
                  autoComplete="off"
                  {...register("directToken")}
                />
                {errors.directToken && (
                  <p className="text-[10px] text-red-600 font-mono">{errors.directToken.message}</p>
                )}
              </div>
            )}

            {authMode === "simulate" && (
              <div className="col-span-2 text-xs text-slate-600 bg-emerald-50 border border-emerald-200 rounded p-2 flex items-center gap-2 font-mono">
                <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Offline simulated session for testing all 40+ endpoints.</span>
              </div>
            )}

            {/* Action button */}
            <div>
              <Button
                type="submit"
                className={cn(
                  "w-full text-white font-mono text-xs",
                  authMode === "simulate" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
                )}
                isLoading={authMutation.isPending}
              >
                {authMode === "simulate" ? "Start Simulated Session" : authMode === "token" ? "Set Access Token" : "Get Access Token"}
              </Button>
            </div>
          </div>

          {/* Scope and Advanced parameters toggle for OAuth */}
          {authMode === "oauth" && (
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-[11px] font-mono text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Sliders className="h-3 w-3" />
                  {showAdvanced ? "Hide OAuth Settings" : "OAuth Scope & Settings"}
                </button>
                <span className="text-[10px] font-mono text-slate-500">
                  RS256 JWT Bearer Assertion + Dummy Secret auto-fetching
                </span>
              </div>

              {showAdvanced && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <Label htmlFor="scope">OAuth Scope (`session_scope`)</Label>
                    <Input
                      id="scope"
                      type="text"
                      placeholder="https://sandbox.swift.com"
                      {...register("scope")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="subject">Subject DN (`sub`)</Label>
                    <Input
                      id="subject"
                      type="text"
                      placeholder="CN=demo-swift-sandbox-consumer, O=Demo, L=London, S=London, C=GB"
                      {...register("subject")}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
