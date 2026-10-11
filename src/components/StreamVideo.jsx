import { useRef } from 'react';
import { muxPoster, useVideoSource } from '../utils/videoSource';

// A <video> that also plays HLS (.m3u8) streams, with the Mux thumbnail as its
// poster unless one is given. Other props pass straight through to <video>.
function StreamVideo({ src, poster, ref, ...props }) {
  const innerRef = useRef(null);
  const videoRef = ref ?? innerRef;
  useVideoSource(videoRef, src);
  return <video ref={videoRef} poster={poster ?? muxPoster(src)} {...props} />;
}

export default StreamVideo;
