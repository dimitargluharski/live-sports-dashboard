export function isWrapperStreamUrl(streamUrl: string): boolean {
  try {
    const url = new URL(streamUrl);
    const host = url.hostname.toLowerCase();
    const path = url.pathname.toLowerCase();

    return host === 'theseagreen.xyz'
      || host === 'livesports247.click'
      || host === 'shd247.world'
      || host === 'buzznews4u.com'
      || /(?:^|\/)channel\.html$/.test(path)
      || /(?:^|\/)frame\d*\.html$/.test(path);
  } catch {
    return false;
  }
}
