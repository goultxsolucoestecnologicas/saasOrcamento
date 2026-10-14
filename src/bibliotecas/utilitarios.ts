import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Contrato utilizado pelos componentes gerados pelo shadcn/ui.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
