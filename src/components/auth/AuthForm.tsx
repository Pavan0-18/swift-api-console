"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { connectSwiftSchema, ConnectSwiftInput } from "@/lib/validation/auth";
import { SWIFT_ENVIRONMENTS } from "@/config/swift";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ConnectionSuccessCard } from "./ConnectionSuccessCard";
import { KeyRound, ShieldAlert, Eye, EyeOff, Sparkles, Sliders, Bug, FileKey } from "lucide-react";
import { SwiftEnvironmentKey, ApiResponse } from "@/types/swift";
import { cn } from "@/lib/utils";

export function AuthForm() {
  const [showSecret, setShowSecret] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [showCustomCerts, setShowCustomCerts] = React.useState(false);
  const [debugResult, setDebugResult] = React.useState<Record<string, unknown> | null>(null);
  const [debugLoading, setDebugLoading] = React.useState(false);
  const [sandboxFetchLoading, setSandboxFetchLoading] = React.useState(false);
  const [sandboxFetchError, setSandboxFetchError] = React.useState<string | null>(null);
  const [authMode, setAuthMode] = React.useState<"oauth" | "token" | "simulate">("oauth");
  const [successData, setSuccessData] = React.useState<{
    environment: SwiftEnvironmentKey;
    consumerKeyMasked?: string;
    expiresIn?: number;
  } | null>(null);

  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ConnectSwiftInput>({
    resolver: zodResolver(connectSwiftSchema),
    defaultValues: {
      environment: "sandbox",
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

  const selectedEnvironment = watch("environment") || "sandbox";

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
      if (data) {
        queryClient.invalidateQueries({ queryKey: ["swift-session"] });
        setSuccessData({
          environment: data.environment,
          consumerKeyMasked: data.consumerKeyMasked,
          expiresIn: data.expiresIn,
        });
      }
    },
  });

  const runDebug = async () => {
    const formValues = watch();
    setDebugLoading(true);
    setDebugResult(null);
    try {
      const res = await fetch("/api/auth/debug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          environment: formValues.environment,
          consumerKey: formValues.consumerKey,
          consumerSecret: formValues.consumerSecret,
          scope: formValues.scope,
          subject: formValues.subject,
          privateKeyPem: formValues.privateKeyPem,
          certificatePem: formValues.certificatePem,
        }),
      });
      const json = await res.json();
      setDebugResult(json);
    } catch (err) {
      setDebugResult({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      setDebugLoading(false);
    }
  };

  /**
   * Fetches SWIFT sandbox dummy private key + certificate directly from the browser
   * (avoids server-side network restrictions) and pre-fills the PEM fields.
   */
  const fetchSandboxCredentials = async () => {
    setSandboxFetchLoading(true);
    setSandboxFetchError(null);
    try {
      const base = "https://sandbox.swift.com";
      const [keyRes, certRes] = await Promise.all([
        fetch(`${base}/sandbox-selfsigned-dummy-secret/privatekey2`),
        fetch(`${base}/sandbox-selfsigned-dummy-secret/certificate2`),
      ]);

      if (!keyRes.ok) throw new Error(`Private key fetch failed: HTTP ${keyRes.status}`);
      if (!certRes.ok) throw new Error(`Certificate fetch failed: HTTP ${certRes.status}`);

      const privateKey = await keyRes.text();
      const certificate = await certRes.text();

      setValue("privateKeyPem", privateKey.trim());
      setValue("certificatePem", certificate.trim());
      // Auto-open panels so user can see the filled fields
      setShowAdvanced(true);
      setShowCustomCerts(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSandboxFetchError(`Could not reach sandbox.swift.com — ${msg}. Paste the key/cert manually instead.`);
      setShowAdvanced(true);
      setShowCustomCerts(true);
    } finally {
      setSandboxFetchLoading(false);
    }
  };

  if (successData) {
    return (
      <ConnectionSuccessCard
        environment={successData.environment}
        consumerKeyMasked={successData.consumerKeyMasked}
        expiresIn={successData.expiresIn}
        onReconnect={() => {
          setSuccessData(null);
          authMutation.reset();
        }}
      />
    );
  }

  const envList = Object.values(SWIFT_ENVIRONMENTS);
  const currentEnvConfig = SWIFT_ENVIRONMENTS[selectedEnvironment as SwiftEnvironmentKey];

  return (
    <Card className="w-full max-w-md border-slate-200 bg-white shadow-sm">
      <CardHeader className="space-y-1 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">SWIFT Authentication</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                JWT Bearer OAuth 2.0 flow matching Postman setup.
              </CardDescription>
            </div>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex rounded border border-slate-200 bg-slate-50 p-0.5 text-xs font-mono mt-3">
          <button
            type="button"
            onClick={() => setAuthMode("oauth")}
            className={cn(
              "flex-1 py-1 rounded transition-all text-center",
              authMode === "oauth" ? "bg-white text-slate-900 font-semibold shadow-xs" : "text-slate-500 hover:text-slate-800"
            )}
          >
            OAuth 2.0 (JWT)
          </button>
          <button
            type="button"
            onClick={() => setAuthMode("token")}
            className={cn(
              "flex-1 py-1 rounded transition-all text-center",
              authMode === "token" ? "bg-white text-slate-900 font-semibold shadow-xs" : "text-slate-500 hover:text-slate-800"
            )}
          >
            Paste Token
          </button>
          <button
            type="button"
            onClick={() => setAuthMode("simulate")}
            className={cn(
              "flex-1 py-1 rounded transition-all text-center",
              authMode === "simulate" ? "bg-emerald-600 text-white font-semibold shadow-xs" : "text-slate-500 hover:text-slate-800"
            )}
          >
            Simulate
          </button>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit((data) => authMutation.mutate(data))}>
        <CardContent className="space-y-3 pt-2">
          {authMutation.isError && (
            <div className="flex items-start gap-2 p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700">
              <ShieldAlert className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">SWIFT Gateway Error</span>
                <span className="text-slate-600">{authMutation.error.message}</span>
              </div>
            </div>
          )}

          {/* Environment */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="environment">Target Environment</Label>
              <span className="text-[10px] font-mono text-slate-400">
                {currentEnvConfig?.baseUrl}
              </span>
            </div>
            <Select
              id="environment"
              {...register("environment")}
              error={Boolean(errors.environment)}
            >
              {envList.map((env) => (
                <option key={env.key} value={env.key} disabled={!env.enabled}>
                  {env.label} {!env.enabled ? "(Disabled)" : ""}
                </option>
              ))}
            </Select>
            {errors.environment && (
              <p className="text-[10px] text-red-600 font-mono">{errors.environment.message}</p>
            )}
          </div>

          {authMode === "oauth" && (
            <>
              {/* Consumer Key */}
              <div className="space-y-1">
                <Label htmlFor="consumerKey">Consumer Key</Label>
                <Input
                  id="consumerKey"
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
                <Label htmlFor="consumerSecret">Consumer Secret</Label>
                <div className="relative">
                  <Input
                    id="consumerSecret"
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

              {/* Fetch Sandbox Creds — only for sandbox environment */}
              {selectedEnvironment === "sandbox" && (
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={fetchSandboxCredentials}
                    disabled={sandboxFetchLoading}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded border border-blue-200 bg-blue-50 text-[11px] font-mono text-blue-700 hover:bg-blue-100 disabled:opacity-60 transition-colors"
                  >
                    {sandboxFetchLoading ? (
                      <span className="animate-pulse">Fetching sandbox credentials…</span>
                    ) : (
                      <>
                        <FileKey className="h-3 w-3" />
                        Fetch Sandbox Signing Credentials
                      </>
                    )}
                  </button>
                  {sandboxFetchError && (
                    <p className="text-[10px] text-red-600 font-mono leading-snug">{sandboxFetchError}</p>
                  )}
                  {!sandboxFetchError && !sandboxFetchLoading && (
                    <p className="text-[10px] text-slate-400 font-mono">
                      Loads SWIFT dummy key + cert from sandbox.swift.com into the PEM fields below.
                    </p>
                  )}
                </div>
              )}

              {/* Scope — always visible */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="scope">Scope</Label>
                  <span className="text-[10px] font-mono text-slate-400">optional</span>
                </div>
                <Input
                  id="scope"
                  type="text"
                  placeholder="Leave empty or enter scope (e.g. swift.alliancecloud.api!p)"
                  {...register("scope")}
                />
                {errors.scope && (
                  <p className="text-[10px] text-red-600 font-mono">{errors.scope.message}</p>
                )}
              </div>

              {/* Advanced Toggle */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-[11px] font-mono text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Sliders className="h-3 w-3" />
                  {showAdvanced ? "Hide Advanced Settings" : "Advanced Settings"}
                </button>

                {showAdvanced && (
                  <div className="space-y-3">
                    {/* Subject DN */}
                    <div className="space-y-1">
                      <Label htmlFor="subject">JWT Subject (sub)</Label>
                      <Input
                        id="subject"
                        type="text"
                        placeholder="CN=demo-swift-sandbox-consumer, O=Demo, ..."
                        {...register("subject")}
                      />
                      <p className="text-[10px] text-slate-400 font-mono leading-snug">
                        Must match the Distinguished Name of the certificate registered with your Consumer Key.
                        Leave blank to use the sandbox demo DN.
                      </p>
                    </div>

                    {/* Custom Certs toggle */}
                    <div className="border-t border-slate-100 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowCustomCerts(!showCustomCerts)}
                        className="text-[11px] font-mono text-amber-700 hover:underline flex items-center gap-1"
                      >
                        <FileKey className="h-3 w-3" />
                        {showCustomCerts ? "Hide Custom Signing Credentials" : "Custom Signing Credentials (PEM)"}
                      </button>

                      {showCustomCerts && (
                        <div className="space-y-3 pt-2">
                          <div className="rounded bg-amber-50 border border-amber-200 p-2 text-[10px] text-amber-800 font-mono leading-snug">
                            <strong>Sandbox only:</strong> The app auto-fetches SWIFT&apos;s dummy signing credentials from{" "}
                            <code>sandbox.swift.com/sandbox-selfsigned-dummy-secret/</code>. These are tied to
                            SWIFT&apos;s own demo Consumer Key. If you have your <em>own</em> Consumer Key registered
                            with a custom certificate, paste your private key and certificate here so the JWT{" "}
                            <code>sub</code> and signature match your registration.
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="privateKeyPem">Private Key (PEM)</Label>
                            <textarea
                              rows={5}
                              id="privateKeyPem"
                              placeholder={"-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"}
                              className="w-full rounded border border-slate-300 bg-white p-2 text-[10px] font-mono text-slate-900 focus:border-blue-600 focus:outline-none resize-y"
                              {...register("privateKeyPem")}
                            />
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="certificatePem">Certificate (PEM)</Label>
                            <textarea
                              rows={5}
                              id="certificatePem"
                              placeholder={"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"}
                              className="w-full rounded border border-slate-300 bg-white p-2 text-[10px] font-mono text-slate-900 focus:border-blue-600 focus:outline-none resize-y"
                              {...register("certificatePem")}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Debug Panel */}
              {debugResult && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="rounded border border-slate-200 bg-slate-50 text-[10px] font-mono">
                    <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-200">
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        <Bug className="h-3 w-3 text-slate-500" /> Debug Result
                      </span>
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] font-bold",
                          (debugResult?.upstreamResponse as { status?: number })?.status === 200
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        )}
                      >
                        HTTP {(debugResult?.upstreamResponse as { status?: number })?.status ?? "—"}
                      </span>
                    </div>
                    <pre className="p-2 overflow-x-auto text-slate-700 whitespace-pre-wrap break-all max-h-64">
                      {JSON.stringify(debugResult, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </>
          )}

          {authMode === "token" && (
            <div className="space-y-1">
              <Label htmlFor="directToken">Bearer Access Token</Label>
              <textarea
                rows={4}
                id="directToken"
                placeholder="Paste Bearer token from SWIFT Developer Portal..."
                className="w-full rounded border border-slate-300 bg-white p-2 text-xs font-mono text-slate-900 focus:border-blue-600 focus:outline-none"
                {...register("directToken")}
              />
              {errors.directToken && (
                <p className="text-[10px] text-red-600 font-mono">{errors.directToken.message}</p>
              )}
            </div>
          )}

          {authMode === "simulate" && (
            <div className="text-xs text-slate-600 bg-emerald-50 border border-emerald-200 rounded p-3 flex items-start gap-2 font-mono leading-relaxed">
              <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-emerald-800 block">Offline Simulation Mode</span>
                Instantly enables the console to parameterize and inspect schemas without live SWIFT credentials.
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2 pt-2">
          <Button
            type="submit"
            size="default"
            className={cn(
              "w-full text-white font-mono text-xs",
              authMode === "simulate" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
            )}
            isLoading={authMutation.isPending}
          >
            {authMode === "simulate" ? "Start Simulated Session" : authMode === "token" ? "Set Access Token" : "Connect to SWIFT"}
          </Button>

          {authMode === "oauth" && (
            <button
              type="button"
              onClick={runDebug}
              disabled={debugLoading}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded border border-slate-200 bg-white text-[11px] font-mono text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 transition-colors"
            >
              {debugLoading ? (
                <span className="animate-pulse">Running debug request…</span>
              ) : (
                <>
                  <Bug className="h-3 w-3" />
                  Debug Request (show raw SWIFT response)
                </>
              )}
            </button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
