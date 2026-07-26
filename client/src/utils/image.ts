export function optimizeCloudinaryUrl(url?: string): string {
  if (!url) return '';
  if (!url.includes('res.cloudinary.com')) return url;
  if (url.includes('f_auto') || url.includes('q_auto')) return url;
  return url.replace('/upload/', '/upload/f_auto,q_auto/');
}
