'use client';

import { Canvas, useFrame } from '@react-three/fiber';
<<<<<<< HEAD
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
=======
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
>>>>>>> c56d30689396b218514a6278f83a8e01920b619b
      </mesh>
    </group>
  );
}

<<<<<<< HEAD
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
=======
function GroundGlow() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.15, 0]}>
      <circleGeometry args={[1.8, 48]} />
      <meshBasicMaterial color="#0ea5e9" transparent opacity={0.12} />
    </mesh>
>>>>>>> c56d30689396b218514a6278f83a8e01920b619b
  );
}

export default function Dumbbell3D() {
  return (
<<<<<<< HEAD
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
=======
    <div className="h-full w-full">
      <Canvas camera={{ position: [0, 0.15, 4.6], fov: 42 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <color attach="background" args={['#09090b']} />
          <ambientLight intensity={0.35} />
          <directionalLight position={[5, 5, 5]} intensity={1.35} />
          <directionalLight position={[-5, -3, -5]} intensity={0.35} />
          <pointLight position={[0, 2.2, 3]} intensity={0.85} color="#38bdf8" />
          <pointLight position={[-2, -1, -2]} intensity={0.25} color="#0369a1" />
          <GroundGlow />
          <Dumbbell />
>>>>>>> c56d30689396b218514a6278f83a8e01920b619b
        </Suspense>
      </Canvas>
    </div>
  );
}
