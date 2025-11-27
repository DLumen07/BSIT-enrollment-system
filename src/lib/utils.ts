import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

const ABSOLUTE_MEDIA_PATTERN = /^(?:https?:|data:|blob:)/i
const DEFAULT_MEDIA_BASE = (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api')
  .replace(/\/+$/, '')
  .trim()

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function resolveMediaUrl(value?: string | null, baseUrl?: string | null): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (trimmed === '') {
    return null
  }

  if (ABSOLUTE_MEDIA_PATTERN.test(trimmed)) {
    return trimmed
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`
  }

  const resolvedBase = (baseUrl ?? DEFAULT_MEDIA_BASE).trim()
  if (resolvedBase === '') {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  }

  const normalizedBase = resolvedBase.replace(/\/+$/, '')
  const normalizedPath = trimmed.replace(/^\/+/, '')
  return `${normalizedBase}/${normalizedPath}`
}
