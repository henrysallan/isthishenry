import { imageVariants } from '../data/imageVariants';

// Images published by scripts/publish-images.mjs come in several widths plus a
// tiny blurred preview. For one of those, looked up by its largest URL (the one
// navigation.js links), this returns what an <img> needs; otherwise null.
export function responsiveImage(src) {
  const variant = imageVariants[src];
  if (!variant) return null;
  const stem = src.slice(0, -`-${variant.widths.at(-1)}.jpg`.length);
  return {
    srcSet: variant.widths.map((w) => `${stem}-${w}.jpg ${w}w`).join(', '),
    placeholder: `${stem}-blur.jpg`,
    width: variant.w,
    height: variant.h,
  };
}

// The content column is 3/4 of the viewport on desktop and full width on mobile.
export function columnSizes(fractionOfColumn = 1) {
  return `(max-width: 768px) 100vw, ${Math.round(75 * fractionOfColumn)}vw`;
}
