export function getDominantLogoColor(imageUrl?: string | null): Promise<string | null> {
  if (!imageUrl) return Promise.resolve(null);

  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const context = canvas.getContext('2d');
        if (!context) return resolve(null);

        context.drawImage(image, 0, 0, 32, 32);
        const pixels = context.getImageData(0, 0, 32, 32).data;
        let bestColor = { r: 100, g: 116, b: 139, score: 0 };

        for (let index = 0; index < pixels.length; index += 4) {
          const r = pixels[index];
          const g = pixels[index + 1];
          const b = pixels[index + 2];
          const alpha = pixels[index + 3];
          const brightness = (r + g + b) / 3;
          const spread = Math.max(r, g, b) - Math.min(r, g, b);
          if (alpha < 180 || brightness > 235 || brightness < 18 || spread < 35) continue;

          const score = spread * (1 - Math.abs(brightness - 128) / 180);
          if (score > bestColor.score) bestColor = { r, g, b, score };
        }

        resolve(`rgb(${bestColor.r}, ${bestColor.g}, ${bestColor.b})`);
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = imageUrl;
  });
}
