import * as React from "react";
import { cn } from "@/bibliotecas/utilitarios";
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("skeleton", className)} aria-hidden="true" {...props} />
  );
}
