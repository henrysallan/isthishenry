import { isVideoSrc } from '../data/siteDoc';
import { columnSizes, responsiveImage } from '../utils/responsiveImage';
import { isHls, muxPoster } from '../utils/videoSource';

const vimeoId = (src) => src.match(/(?:vimeo\.com\/|player\.vimeo\.com\/(?:video|external)\/)(\d+)/)?.[1];

function Placeholder({ label, aspectRatio = '16 / 9' }) {
  return (
    <div className="crm-placeholder" style={{ aspectRatio }}>
      <span>{label}</span>
    </div>
  );
}

// A block as the editor shows it: still, never playing. Videos show their
// poster (or first frame), Vimeo embeds a labelled box.
function BlockPreview({ block }) {
  if (block.type === 'text') {
    return <p>{block.content || 'Empty text'}</p>;
  }
  if (!block.src) return <Placeholder label="No link yet" />;

  if (block.type === 'vimeo') {
    // Vimeo blocks store their ratio as padding, e.g. "56.25%"
    const percent = parseFloat(block.aspectRatio);
    return <Placeholder label={`Vimeo ${vimeoId(block.src) || ''}`} aspectRatio={percent ? `100 / ${percent}` : undefined} />;
  }

  if (block.type === 'video' || isVideoSrc(block.src)) {
    const poster = block.poster || muxPoster(block.src);
    let media;
    if (poster) media = <img src={poster} alt="" draggable={false} style={{ aspectRatio: block.aspectRatio }} />;
    else if (!isHls(block.src)) media = <video src={`${block.src}#t=0.1`} preload="metadata" muted playsInline style={{ aspectRatio: block.aspectRatio }} />;
    else return <Placeholder label="Video stream" aspectRatio={block.aspectRatio} />;
    return (
      <>
        {media}
        <span className="crm-badge">Video</span>
      </>
    );
  }

  const variant = responsiveImage(block.src, block);
  const width = variant?.width ?? block.w;
  const height = variant?.height ?? block.h;
  return (
    <img
      src={block.src}
      srcSet={variant?.srcSet}
      sizes={variant ? columnSizes(block.colSpan / 12) : undefined}
      alt={block.alt || ''}
      draggable={false}
      loading="lazy"
      style={width && height ? { aspectRatio: `${width} / ${height}` } : undefined}
    />
  );
}

export default BlockPreview;
