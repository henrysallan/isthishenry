// Theme and design constants
export const theme = {
  colors: {
    background: '#f3f3f3',
    contentArea: '#f8f8f8',
    border: '#666666',
    text: '#000000',
    textLight: '#b2b2b2',
    wire: '#666666'
  },
  layout: {
    leftColumnRatio: 3 / 7,
    rightColumnRatio: 4 / 7,
    contentPadding: 10,
    contentBorderRadius: 1.0,
    borderWidth: 1
  },
  typography: {
    fontFamily: 'IBM Plex Mono',
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
    // Menu positioning in 3D space
    menuDepthSeparation: 3.5, // Distance between menu levels on X axis
    menuZOffset: -1.0, // Z depth difference between parent and child menus
    // Camera movement
    cameraXMovement: 2.0, // How far camera moves right
    cameraZMovement: 1.5, // How far camera moves back
    // Socket system for wire connections
    socketOffset: {
      left: -0.3,   // Distance from menu item position to left (IN) socket
      right: 0.75,   // Distance from menu item position to right (OUT) socket (overridden by text width)
      margin: 0.1    // Standard margin between text edge and wire socket
    }
  }
};

// Calculate 3D position for menu items
export function getMenuPosition(menuLevel, leftColumnCenter, itemIndex, itemCount) {
  const spacing = 0.25;
  const menuHeight = (itemCount - 1) * spacing;
  const startY = menuHeight / 2;
  
  let x, z;
  switch(menuLevel) {
    case 'main':
      x = leftColumnCenter - 0.5;
      z = 0;
      break;
    case 'submenu':
      x = leftColumnCenter - 0.5 + theme.spatial.menuDepthSeparation;
      z = -theme.spatial.menuZOffset;
      break;
    case 'parent': // Parent label when in submenu
      x = leftColumnCenter - 0.5;
      z = theme.spatial.menuZOffset;
      break;
    default:
      x = leftColumnCenter - 0.5;
      z = 0;
  }
  
  return [
    x,
    startY - itemIndex * spacing,
    z
  ];
}

// Get socket positions for a menu item or label
export function getSocketPositions(itemPosition, text = '', fontSize = 0.15) {
  const [x, y, z] = itemPosition;
  
  // Estimate text width for IBM Plex Mono (monospace font)
  // Monospace characters are roughly 0.6 times the font size in width
  const estimatedTextWidth = text.length * fontSize * 0.6;
  
  return {
    in: [x - theme.spatial.socketOffset.margin, y, z],   // Left side (IN) - standard margin from left edge
    out: [x + estimatedTextWidth + theme.spatial.socketOffset.margin * 2, y, z]  // Right side (OUT) - text width + larger margin
  };
}

// Get the IN socket for a menu (centered on all items)
export function getMenuInSocket(menuPositions) {
  if (menuPositions.length === 0) return null;
  
  // Get first and last item positions
  const firstPos = menuPositions[0];
  const lastPos = menuPositions[menuPositions.length - 1];
  
  // Center Y between first and last items
  const centerY = (firstPos[1] + lastPos[1]) / 2;
  
  // Use first item's X and Z, but centered Y
  return [
    firstPos[0] + theme.spatial.socketOffset.left,
    centerY,
    firstPos[2]
  ];
}

// Create a 3D bezier curve between two sockets
export function create3DBezierCurve(startSocket, endSocket, segments = 30) {
  const [x1, y1, z1] = startSocket;
  const [x2, y2, z2] = endSocket;
  
  const points = [];
  const dx = x2 - x1;
  
  // Control points for smooth horizontal-then-vertical curve
  const cp1X = x1 + dx * 0.6;
  const cp1Y = y1;
  const cp1Z = z1;
  
  const cp2X = x1 + dx * 0.4;
  const cp2Y = y2;
  const cp2Z = z2;
  
  // Generate bezier curve points
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const t1 = 1 - t;
    
    // Cubic bezier formula
    const x = t1 * t1 * t1 * x1 + 
              3 * t1 * t1 * t * cp1X + 
              3 * t1 * t * t * cp2X + 
              t * t * t * x2;
              
    const y = t1 * t1 * t1 * y1 + 
              3 * t1 * t1 * t * cp1Y + 
              3 * t1 * t * t * cp2Y + 
              t * t * t * y2;
              
    const z = t1 * t1 * t1 * z1 + 
              3 * t1 * t1 * t * cp1Z + 
              3 * t1 * t * t * cp2Z + 
              t * t * t * z2;
    
    points.push([x, y, z]);
  }
  
  return points;
}
