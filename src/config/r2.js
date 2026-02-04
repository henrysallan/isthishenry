// Cloudflare R2 configuration
// Using public CDN URL for asset streaming (no SDK needed)

export const R2_BUCKET_NAME = import.meta.env.VITE_R2_BUCKET_NAME;
export const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL;
