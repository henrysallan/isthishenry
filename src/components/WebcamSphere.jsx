import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import './WebcamSphere.css';

function Scene() {
  const sphereRef = useRef();
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;

    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      .then(stream => {
        video.srcObject = stream;
        video.play();
        
        video.onloadeddata = () => {
          const tex = new THREE.VideoTexture(video);
          tex.colorSpace = THREE.SRGBColorSpace;
          setTexture(tex);
          console.log('✅ Webcam texture ready');
        };
      })
      .catch(err => console.error('Webcam error:', err));

    return () => {
      if (video.srcObject) {
        video.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  useFrame(() => {
    if (texture) {
      texture.needsUpdate = true;
    }
    if (sphereRef.current) {
      sphereRef.current.rotation.y += 0.003;
    }
  });

  if (!texture) {
    return (
      <mesh>
        <sphereGeometry args={[.75, 64, 64]} />
        <meshBasicMaterial color="gray" />
      </mesh>
    );
  }

  return (
    <mesh ref={sphereRef} >
      <sphereGeometry args={[.75, 64, 64]} />
      <shaderMaterial
        uniforms={{
          uTexture: { value: texture },
          uLightPos1: { value: [2.0, 2.0, 3.0] },
          uLightPos2: { value: [-2.0, 1.0, 2.0] },
        }}
        vertexShader={`
          varying vec3 vNormal;
          varying vec3 vViewPosition;
          varying vec3 vWorldPosition;
          
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vViewPosition = -mvPosition.xyz;
            vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          uniform sampler2D uTexture;
          uniform vec3 uLightPos1;
          uniform vec3 uLightPos2;
          varying vec3 vNormal;
          varying vec3 vViewPosition;
          varying vec3 vWorldPosition;
          
          void main() {
            vec3 viewDir = normalize(vViewPosition);
            vec3 normal = normalize(vNormal);
            vec3 reflected = reflect(-viewDir, normal);
            
            // Map reflection to UV coordinates (offset u to shift left)
            float u = 0.3 + atan(reflected.z, reflected.x) / (2.0 * 3.14159);
            float v = 0.5 + asin(reflected.y) / 3.14159;
            
            // Box blur sampling
            float blurSize = 0.025;
            vec4 texColor = vec4(0.0);
            texColor += texture2D(uTexture, vec2(u - blurSize, v - blurSize));
            texColor += texture2D(uTexture, vec2(u, v - blurSize));
            texColor += texture2D(uTexture, vec2(u + blurSize, v - blurSize));
            texColor += texture2D(uTexture, vec2(u - blurSize, v));
            texColor += texture2D(uTexture, vec2(u, v));
            texColor += texture2D(uTexture, vec2(u + blurSize, v));
            texColor += texture2D(uTexture, vec2(u - blurSize, v + blurSize));
            texColor += texture2D(uTexture, vec2(u, v + blurSize));
            texColor += texture2D(uTexture, vec2(u + blurSize, v + blurSize));
            texColor /= 9.0;
            
            // Specular highlights from two lights
            float shininess = 64.0;
            float specularStrength = 0.6;
            
            // Light 1
            vec3 lightDir1 = normalize(uLightPos1 - vWorldPosition);
            vec3 reflectDir1 = reflect(-lightDir1, normal);
            float spec1 = pow(max(dot(viewDir, reflectDir1), 0.0), shininess);
            
            // Light 2
            vec3 lightDir2 = normalize(uLightPos2 - vWorldPosition);
            vec3 reflectDir2 = reflect(-lightDir2, normal);
            float spec2 = pow(max(dot(viewDir, reflectDir2), 0.0), shininess);
            
            vec3 specular = specularStrength * (spec1 + spec2 * 0.5) * vec3(1.0);
            
            gl_FragColor = vec4(texColor.rgb + specular, 1.0);
          }
        `}
      />
    </mesh>
  );
}

export default function WebcamSphere() {
  return (
    <div className="webcam-sphere-container">
      <Canvas camera={{ position: [0, 0, 3] }}>
        <Scene />
      </Canvas>
    </div>
  );
}
