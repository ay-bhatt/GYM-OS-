'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, Suspense } from 'react';
import * as THREE from 'three';

function Dumbbell() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.3;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.15;
    }
  });

  const barColor = '#3f3f46';
  const weightColor = '#0ea5e9';

  return (
    <group ref={groupRef} rotation={[0.3, 0, 0.2]}>
      {/* Bar */}
      <mesh>
        <cylinderGeometry args={[0.08, 0.08, 2.2, 32]} />
        <meshStandardMaterial color={barColor} metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Left weights */}
      <mesh position={[-0.95, 0, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.5, 32]} />
        <meshStandardMaterial color={weightColor} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[-0.55, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.3, 32]} />
        <meshStandardMaterial color={barColor} metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Right weights */}
      <mesh position={[0.95, 0, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.5, 32]} />
        <meshStandardMaterial color={weightColor} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0.55, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.3, 32]} />
        <meshStandardMaterial color={barColor} metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

export default function Dumbbell3D() {
  return (
    <div className="h-full w-full">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 5, 5]} intensity={1.2} />
          <directionalLight position={[-5, -3, -5]} intensity={0.4} />
          <pointLight position={[0, 2, 3]} intensity={0.5} color="#0ea5e9" />
          <Dumbbell />
        </Suspense>
      </Canvas>
    </div>
  );
}
