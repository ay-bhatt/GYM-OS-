'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { Suspense, useRef } from 'react';
import type { Group } from 'three';

function HexHead({ side }: { side: -1 | 1 }) {
  return (
    <group position={[side * 1.16, 0, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-side * 0.28, 0, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.14, 0.12, 24]} />
        <meshStandardMaterial color="#18181b" metalness={0.78} roughness={0.32} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.52, 0.52, 0.44, 6]} />
        <meshStandardMaterial color="#0ea5e9" metalness={0.62} roughness={0.28} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 0.48, 24]} />
        <meshStandardMaterial color="#0369a1" metalness={0.72} roughness={0.22} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[side * 0.26, 0, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.08, 24]} />
        <meshStandardMaterial color="#e4e4e7" metalness={0.96} roughness={0.14} />
      </mesh>
    </group>
  );
}

function Dumbbell() {
  const spinRef = useRef<Group>(null);

  useFrame((state, delta) => {
    if (!spinRef.current) return;
    spinRef.current.rotation.y += delta * 0.9;
    spinRef.current.position.y = 0.32 + Math.sin(state.clock.elapsedTime * 0.85) * 0.08;
  });

  return (
    <group ref={spinRef}>
      <group rotation={[0.4, 0, 0.16]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.078, 0.078, 1.96, 32]} />
          <meshStandardMaterial color="#d4d4d8" metalness={0.95} roughness={0.16} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.095, 0.095, 1.08, 32]} />
          <meshStandardMaterial color="#52525b" metalness={0.82} roughness={0.38} />
        </mesh>
        <HexHead side={-1} />
        <HexHead side={1} />
      </group>
    </group>
  );
}

export default function Dumbbell3D() {
  return (
    <div className="h-full w-full" aria-hidden>
      <Canvas
        camera={{ position: [0, 0.45, 4.35], fov: 36 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ camera }) => camera.lookAt(0, 0.2, 0)}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.42} />
          <hemisphereLight args={['#e0f2fe', '#09090b', 0.55]} />
          <directionalLight position={[4.5, 6, 4]} intensity={1.55} />
          <directionalLight position={[-4, -2, -3]} intensity={0.32} />
          <pointLight position={[1.6, 1.8, 2.4]} intensity={1.15} color="#7dd3fc" />
          <pointLight position={[-2.2, 0.4, -1.5]} intensity={0.42} color="#0284c7" />
          <Dumbbell />
          <ContactShadows
            position={[0, -1.08, 0]}
            opacity={0.4}
            scale={8}
            blur={2.6}
            far={3.6}
            color="#0ea5e9"
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
