import { useState, useEffect } from 'react';
import { preloadFont } from 'troika-three-text';

// Font URLs with fallbacks
// Primary: Self-hosted Inter
// Fallback: Google Fonts CDN
const FONT_REGULAR = {
  primary: '/font/Inter-Regular.ttf',
  fallback: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff2'
};

const FONT_BOLD = {
  primary: '/font/Inter_Bold.ttf',
  fallback: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hjp-Ek-_EeA.woff2'
};

/**
 * Hook to load fonts for Three.js Text components with fallback support
 * Returns the working font URLs for regular and bold variants
 */
export function useFontLoader() {
  const [fonts, setFonts] = useState({
    regular: null,
    bold: null,
    isLoading: true
  });

  useEffect(() => {
    async function loadFont(fontConfig) {
      // Try primary first
      try {
        await new Promise((resolve, reject) => {
          preloadFont(
            { font: fontConfig.primary },
            () => resolve(),
            (err) => reject(err)
          );
        });
        return fontConfig.primary;
      } catch (e) {
        console.warn(`Primary font failed to load: ${fontConfig.primary}`, e);
      }

      // Try fallback
      try {
        await new Promise((resolve, reject) => {
          preloadFont(
            { font: fontConfig.fallback },
            () => resolve(),
            (err) => reject(err)
          );
        });
        console.log(`Using fallback font: ${fontConfig.fallback}`);
        return fontConfig.fallback;
      } catch (e) {
        console.warn(`Fallback font failed to load: ${fontConfig.fallback}`, e);
      }

      // Return null to use troika's built-in default
      console.warn('All fonts failed, using troika default');
      return null;
    }

    async function loadAllFonts() {
      const [regular, bold] = await Promise.all([
        loadFont(FONT_REGULAR),
        loadFont(FONT_BOLD)
      ]);

      setFonts({
        regular,
        bold,
        isLoading: false
      });
    }

    loadAllFonts();
  }, []);

  return fonts;
}

// Export font URLs for use outside of React (e.g., in preloader)
export const FONT_URLS = {
  regular: FONT_REGULAR,
  bold: FONT_BOLD
};
