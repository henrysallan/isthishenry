// Pages that get the case study treatment: details in the left column on
// desktop, a compact header above the media on phones
export function isCaseStudy(content) {
  return Boolean(content && (content.year || content.tags || content.rows));
}

// "poetrymap.app" from "https://www.poetrymap.app/"
export function linkLabel(href) {
  try {
    return new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return href;
  }
}
