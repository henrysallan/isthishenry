import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function DrawableLine() {
  const { camera, size } = useThree();
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  const [trimStart, setTrimStart] = useState(0); // Trim from start (0 to 1)
  const planeRef = useRef();

  // Handle pointer down on the invisible plane
  const handlePointerDown = (e) => {
    e.stopPropagation(); // Prevent OrbitControls from getting this event
    setIsDrawing(true);
    
    const worldPos = e.point.clone();
    
    setPoints([{
      position: worldPos,
      velocity: 0.002 + Math.random() * 0.001, // Even slower fall speed
      age: 0,
      maxAge: 120, // Longer lifetime before trim starts
      noiseOffset: Math.random() * 10 // Random offset for noise variation
    }]);
  };

  // Handle pointer move
  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    
    e.stopPropagation();
    
    setPoints(prevPoints => {
      const worldPos = e.point.clone();
      const lastPoint = prevPoints[prevPoints.length - 1];
      
      // Add new point if moved enough distance
      if (lastPoint && worldPos.distanceTo(lastPoint.position) > 0.1) {
        return [...prevPoints, {
          position: worldPos,
          velocity: 0.002 + Math.random() * 0.003, // Even slower fall speed
          age: 0,
          maxAge: 120, // Longer lifetime before trim starts
          noiseOffset: Math.random() * 1000 // Random offset for noise variation
        }];
      }
      return prevPoints;
    });
  };
  // Handle pointer up
  const handlePointerUp = (e) => {
    setIsDrawing(false);
    // Start trimming from the beginning
    setTrimStart(0);
  };

  // Simple 3D curl noise function - normalized and centered
  const curlNoise = (x, y, z, offset) => {
    const freq = 0.3; // Lower frequency for smoother noise
    const t = offset * 0.01;
    
    // Generate noise values (range: -1 to 1)
    const nx = Math.sin(x * freq + t) * Math.cos(y * freq + t);
    const ny = Math.cos(x * freq + t) * Math.sin(z * freq + t);
    const nz = Math.sin(y * freq + t) * Math.cos(z * freq + t);
    
    // Normalize the vector
    const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
    const normalized = length > 0 ? {
      x: nx / length,
      y: ny / length,
      z: nz / length
    } : { x: 0, y: 0, z: 0 };
    
    return normalized;
  };

  // Animation loop
  useFrame(() => {
    if (points.length === 0) return;

    // Update each point - move back in Z and slightly to the left with curl noise
    setPoints(prevPoints => {
      return prevPoints.map(point => {
        // Calculate curl noise based on position and age - use as velocity modifier
        const noiseScale = 0.0005; // Very small noise influence
        const ageInfluence = Math.min(point.age * 0.0002, 1.0); // Grows slowly with age, capped at 1
        const noise = curlNoise(
          point.position.x,
          point.position.y,
          point.position.z,
          point.noiseOffset + point.age
        );
        
        // Apply noise as small perturbations to velocity, not position
        const noiseStrength = noiseScale * ageInfluence;
        
        return {
          ...point,
          position: new THREE.Vector3(
            point.position.x - (point.velocity * 0.4) + (noise.x * noiseStrength), // Left drift + tiny noise
            point.position.y + (noise.y * noiseStrength), // Tiny vertical noise
            point.position.z - point.velocity + (noise.z * noiseStrength) // Back + tiny noise
          ),
          age: point.age + 1
        };
      });
    });

    // Gradually trim from start when not drawing
    if (!isDrawing && points.length > 0) {
      setTrimStart(prev => {
        const oldestAge = Math.max(...points.map(p => p.age));
        const trimDelay = 60; // Frames to wait before trimming starts
        const trimDuration = 500; // Frames for complete trim
        
        // Don't start trimming until delay has passed
        if (oldestAge < trimDelay) {
          return 0;
        }
        
        // Calculate trim based on age after delay
        const trimProgress = (oldestAge - trimDelay) / trimDuration;
        const newTrim = Math.min(1, trimProgress);
        
        // If fully trimmed, clear points
        if (newTrim >= 0.99) {
          setPoints([]);
          return 0;
        }
        
        return newTrim;
      });
    }
  });

  return (
    <group>
      {/* Large invisible plane to capture pointer events */}
      <mesh
        ref={planeRef}
        position={[0, 0, 0]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial 
          transparent 
          opacity={0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Render the drawn line */}
      {points.length > 1 && (
        <Line points={points} trimStart={trimStart} />
      )}
    </group>
  );
}

// Line component to render the curve with smooth interpolation
function Line({ points, trimStart }) {
  const lineRef = useRef();

  // Create smooth curve using CatmullRomCurve3
  const curve = useRef(null);
  
  useEffect(() => {
    if (points.length < 2) return;
    
    // Create curve points from our data - now using position directly
    const curvePoints = points.map(p => p.position.clone());
    
    // Use CatmullRomCurve3 for smooth interpolation (similar to NURBS)
    curve.current = new THREE.CatmullRomCurve3(curvePoints, false, 'catmullrom', 0.5);
  }, [points]);

  // Update geometry when points or trim changes
  useEffect(() => {
    if (lineRef.current && curve.current && points.length > 1) {
      // Get smooth points from curve - much higher resolution for ultra smooth trim
      const divisions = Math.max(200, points.length * 10); // Much higher divisions for smoother trim
      const curvePoints = curve.current.getPoints(divisions);
      
      // Apply trim by slicing the curve with smoother interpolation
      const startIndex = Math.floor(trimStart * curvePoints.length);
      const trimmedPoints = curvePoints.slice(startIndex);
      
      if (trimmedPoints.length > 1) {
        const positions = new Float32Array(trimmedPoints.length * 3);
        
        trimmedPoints.forEach((point, i) => {
          positions[i * 3] = point.x;
          positions[i * 3 + 1] = point.y;
          positions[i * 3 + 2] = point.z;
        });

        lineRef.current.geometry.setAttribute(
          'position',
          new THREE.BufferAttribute(positions, 3)
        );
        lineRef.current.geometry.attributes.position.needsUpdate = true;
        lineRef.current.geometry.setDrawRange(0, trimmedPoints.length);
      }
    }
  }, [points, trimStart]);

  if (points.length < 2 || !curve.current) return null;

  // Initial geometry - match the high resolution
  const divisions = Math.max(200, points.length * 10);
  const curvePoints = curve.current.getPoints(divisions);
  const positions = new Float32Array(curvePoints.length * 3);
  
  curvePoints.forEach((point, i) => {
    positions[i * 3] = point.x;
    positions[i * 3 + 1] = point.y;
    positions[i * 3 + 2] = point.z;
  });

  return (
    <line ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={curvePoints.length}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial 
        color="#ff0000"
        linewidth={10}
        transparent 
        opacity={1}
      />
    </line>
  );
}
