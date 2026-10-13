import * as React from "react";
import { useParams } from "react-router-dom";
import { getInventoryRequestById, SWIFT_REQUEST_INVENTORY } from "@/config/swift-inventory";
import { InventoryRequestRunner } from "@/components/messaging/InventoryRequestRunner";

export function OperationRunnerPage() {
  const { reqId, operationId } = useParams<{ reqId?: string; operationId?: string }>();
  const targetId = reqId || operationId;

  // Find by inventory request ID or slug (defaulting to Request #1: List Available Distributions)
  const inventoryReq = getInventoryRequestById(targetId || 1);
  if (inventoryReq) {
    return <InventoryRequestRunner request={inventoryReq} />;
  }

  // Fallback to request #1
  const fallback = SWIFT_REQUEST_INVENTORY[0];
  return <InventoryRequestRunner request={fallback} />;
}
