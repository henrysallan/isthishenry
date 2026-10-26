// Layout, type and motion constants. Colors are CSS variables in index.css.
export const theme = {
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

