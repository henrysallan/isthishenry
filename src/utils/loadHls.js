// hls.js (~500 KB) is only needed for the Vimeo HLS (.m3u8) blocks, so it's
// loaded on first use instead of shipping in the main bundle.
let hlsPromise = null;

export function loadHls() {
  if (!hlsPromise) {
    hlsPromise = import('hls.js').then((mod) => mod.default);
    // Let a failed load be retried by the next caller
    hlsPromise.catch(() => { hlsPromise = null; });
  }
  return hlsPromise;
}
