// Color themes
export const colorThemes = {
  classic: {
    background: '#f1f1f1',
    contentArea: '#f1f1f1',
    border: '#666666',
    text: '#333333',
    textLight: '#b2b2b2',
    wire: '#666666',
    accent: '#666666'
  },
  ocean: {
    background: '#e8f4f8',
    contentArea: '#f0f8fc',
    border: '#2c5f7a',
    text: '#1a3a4a',
    textLight: '#7ba3b8',
    wire: '#4a8ca8',
    accent: '#2c5f7a'
  },
  sunset: {
    background: '#9C3848',
    contentArea: '#FFE3CC',
    border: '#FFE3CC',
    text: '#FFE3CC',
    textLight: '#FFE3CC',
    wire: '#FFE3CC',
    accent: '#d4634d'
  },
  forest: {
    background: '#f0f5ec',
    contentArea: '#f5f8f2',
    border: '#4a6b3d',
    text: '#1f2d1a',
    textLight: '#93a88a',
    wire: '#5d8249',
    accent: '#4a6b3d'
  },
  midnight: {
    background: '#1a1d2e',
    contentArea: '#23263a',
    border: '#8b9dc3',
    text: '#e8ecf4',
    textLight: '#6b7a9e',
    wire: '#5d6d8e',
    accent: '#8b9dc3'
  },
  matrix: {
    background: '#000000',
    contentArea: '#0a0a0a',
    border: '#00ff41',
    text: '#00ff41',
    textLight: '#00cc33',
    wire: '#00ff41',
    accent: '#00ff41'
  }
};

// Theme and design constants
export const theme = {
  colors: colorThemes.classic,
  layout: {
    leftColumnRatio: 1 / 4,
    rightColumnRatio: 3 / 4,
    contentPadding: 10,
    contentBorderRadius: 1.0,
    borderWidth: 1
  },
  typography: {
    fontFamily: 'Inter',
    sizes: {
      small: 16,
      medium: 20,
      large: 24
    }
  },
  animation: {
    duration: 1.2,
    ease: 'expo.out'
  },
  spatial: {
    // Menu positioning
    menuDepthSeparation: 3.5, // X offset multiplier between menu levels
  }
};

