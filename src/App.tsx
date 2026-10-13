import * as React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SwiftAuthProvider } from "@/context/SwiftAuthContext";
import { BaseLayout } from "@/components/layout/BaseLayout";
import { OperationRunnerPage } from "@/pages/OperationRunnerPage";

export default function App() {
  return (
    <SwiftAuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<BaseLayout />}>
            {/* Default Route: List Available Distributions (#1) */}
            <Route path="/" element={<Navigate to="/req/1" replace />} />

            {/* Core Inventory Request Runner (Requests 1 to 25) */}
            <Route path="/req/:reqId" element={<OperationRunnerPage />} />

            {/* Friendly aliases */}
            <Route path="/distributions" element={<Navigate to="/req/1" replace />} />
            <Route path="/fin" element={<Navigate to="/req/6" replace />} />
            <Route path="/interact" element={<Navigate to="/req/16" replace />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/req/1" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SwiftAuthProvider>
  );
}
