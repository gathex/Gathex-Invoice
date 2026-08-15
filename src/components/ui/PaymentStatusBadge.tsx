import React from "react";
import { Badge } from "./Badge";

interface PaymentStatusBadgeProps {
  status: "pending" | "paid" | "partial" | "failed" | "overdue" | string;
  className?: string;
}

export function PaymentStatusBadge({ status, className }: PaymentStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status.toLowerCase()) {
      case "paid":
      case "success":
      case "completed":
        return { variant: "success" as const, label: "Paid" };
      case "partial":
        return { variant: "warning" as const, label: "Partial" };
      case "pending":
        return { variant: "warning" as const, label: "Pending" };
      case "failed":
        return { variant: "danger" as const, label: "Failed" };
      case "overdue":
        return { variant: "danger" as const, label: "Overdue" };
      default:
        return { variant: "neutral" as const, label: status };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
