import { R2_PUBLIC_URL } from '../config/r2';

/**
 * Get the public URL for a video stored in R2
 * @param {string} videoKey - The key/path of the video in R2 bucket
 * @returns {string} The public URL to stream the video
 */
export const getR2VideoUrl = (videoKey) => {
  return `${R2_PUBLIC_URL}/${videoKey}`;
};

/**
 * Video component that streams from R2
 * @param {string} videoKey - The key/path of the video in R2 bucket
 * @param {object} props - Additional video element props
 */
export const R2Video = ({ videoKey, ...props }) => {
  const videoUrl = getR2VideoUrl(videoKey);
  
  return (
    <video
      src={videoUrl}
      controls
      {...props}
    />
  );
};
