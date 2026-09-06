export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mkv|avi|mov)$/i.test(url);
}
