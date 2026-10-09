"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { CheckCircle2, ArrowRight, RefreshCw } from "lucide-react";
import { SwiftEnvironmentKey } from "@/types/swift";

interface ConnectionSuccessCardProps {
  environment: SwiftEnvironmentKey;
  consumerKeyMasked?: string;
  expiresIn?: number;
  onReconnect?: () => void;
}

export function ConnectionSuccessCard({
  environment,
  consumerKeyMasked,
  expiresIn,
  onReconnect,
}: ConnectionSuccessCardProps) {
  const router = useRouter();

  return (
    <Card className="w-full max-w-md border-emerald-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base text-emerald-800">Connection Successful</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Authenticated with SWIFT and session initialized.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-1">
        <div className="rounded border border-slate-200 bg-slate-50 p-3 space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between py-1 border-b border-slate-200">
            <span className="text-slate-500">Environment</span>
            <span className="font-semibold text-emerald-700 uppercase">{environment}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-200">
            <span className="text-slate-500">Status</span>
            <span className="text-emerald-700 font-semibold">● Connected</span>
          </div>

          {consumerKeyMasked && (
            <div className="flex items-center justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">Consumer Key</span>
              <span className="text-slate-700">{consumerKeyMasked}</span>
            </div>
          )}

          <div className="flex items-center justify-between py-1">
            <span className="text-slate-500">Validity</span>
            <span className="text-slate-700">
              {expiresIn ? `${Math.floor(expiresIn / 60)} minutes` : "Active"}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 pt-2">
        {onReconnect && (
          <Button
            type="button"
            variant="outline"
            size="default"
            className="text-xs"
            onClick={onReconnect}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Switch
          </Button>
        )}
        <Button
          type="button"
          size="default"
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs"
          onClick={() => router.push("/")}
        >
          <span>Open API Tester</span>
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </CardFooter>
    </Card>
  );
}
