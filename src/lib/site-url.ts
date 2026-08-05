// Canonical public URL of the app. Auth emails and invite links must always
// point here — never to the gated Lovable preview origin (which forces a
// lovable.dev login before the app can handle the token).

const PUBLISHED_URL = "https://gst-muse-buddy.lovable.app";

function isPublicOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname;
    if (host === "localhost" || host === "127.0.0.1") return false;
    // Gated Lovable editor/preview hosts.
    if (host.endsWith(".lovableproject.com")) return false;
    if (host.includes("-preview--")) return false;
    return true;
  } catch {
    return false;
  }
}

export function siteOrigin(): string {
  const override = import.meta.env['VITE_PUBLIC_SITE_URL'] as string | undefined;
  if (override) return override.replace(/\/+$/, "");
  if (typeof window !== "undefined" && isPublicOrigin(window.location.origin)) {
    return window.location.origin;
  }
  return PUBLISHED_URL;
}

export function siteUrl(path = "/"): string {
  return `${siteOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}