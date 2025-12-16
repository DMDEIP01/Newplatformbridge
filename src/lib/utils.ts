import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a status string to have capitalized first letter of each word
 * e.g., "notified" -> "Notified", "excess_due" -> "Excess Due"
 */
export function formatStatus(status: string | null | undefined): string {
  if (!status) return "";
  return status
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
