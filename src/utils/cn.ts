/**
 * BH Studio v1.0 — cn Utility
 *
 * Combines clsx and tailwind-merge for clean className handling.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
