import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";


/**
 * Jedinstvena, lagana 3D scena s financijskim motivima:
 *  - rotirajući BAM/€ novčići (cilindri),
 *  - rastući bar-graf koji pulsira kao live KPI,
 *  - 3D linija prihoda (sinusoida koja se valja kroz vrijeme),
 *  - diskretna mreža u pozadini.
 * Sve geometrije su primitive (low-poly), bez post-processinga, bez OrbitControls — instant load.
 */

function Coin({ position, label, color }: { position: [number, number, number]; label: string; color: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.y = s.clock.elapsedTime * 1.1 + position[0];
    ref.current.rotation.z = Math.sin(s.clock.elapsedTime * 0.6 + position[1]) * 0.15;
  });
  return (
    <Float speed={1.4} rotationIntensity={0.2} floatIntensity={0.8}>
      <group ref={ref} position={position}>
        <mesh castShadow>
          <cylinderGeometry args={[0.55, 0.55, 0.08, 48]} />
          <meshStandardMaterial color={color} metalness={0.85} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 0.5, 48]} />
          <meshStandardMaterial color="#fff8d6" metalness={0.6} roughness={0.4} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.22, 0.04, 16, 32]} />
          <meshStandardMaterial color="#5a3b00" metalness={0.7} roughness={0.3} />
        </mesh>

      </group>
    </Float>
  );
}

function Bar({ x, baseHeight, phase, color }: { x: number; baseHeight: number; phase: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!ref.current) return;
    const h = baseHeight + Math.sin(s.clock.elapsedTime * 1.2 + phase) * 0.4 + 0.6;
    ref.current.scale.y = h;
    ref.current.position.y = (h * 0.6) - 1.2;
  });
  return (
    <mesh ref={ref} position={[x, -1.2, -1.5]}>
      <boxGeometry args={[0.45, 1.2, 0.45]} />
      <meshStandardMaterial color={color} metalness={0.4} roughness={0.4} emissive={color} emissiveIntensity={0.18} />
    </mesh>
  );
}

function RevenueLine() {
  const ref = useRef<THREE.Line>(null);
  const points = useMemo(() => Array.from({ length: 80 }, (_, i) => new THREE.Vector3((i / 79) * 8 - 4, 0, 0)), []);
  const geom = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const pos = (geom.attributes.position as THREE.BufferAttribute);
    for (let i = 0; i < points.length; i++) {
      const x = (i / (points.length - 1)) * 8 - 4;
      const y = Math.sin(x * 0.9 + t) * 0.45 + Math.sin(x * 0.3 + t * 0.6) * 0.35 + 1.6;
      pos.setXYZ(i, x, y, -0.5);
    }
    pos.needsUpdate = true;
  });
  return (
    // @ts-ignore - drei/three line element
    <line ref={ref as any} geometry={geom}>
      <lineBasicMaterial color="#7ec850" linewidth={2} />
    </line>
  );
}

function Grid() {
  return (
    <gridHelper args={[24, 24, "#1f4e8c", "#1a2c44"]} position={[0, -1.6, -2]} rotation={[0, 0, 0]} />
  );
}

export default function AuthScene() {
  return (
    <Canvas
      camera={{ position: [0, 0.4, 6], fov: 55 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ position: "absolute", inset: 0 }}
      frameloop="always"
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 4]} intensity={1.1} color="#ffffff" />
      <pointLight position={[-4, -2, 3]} intensity={0.6} color="#7ec850" />
      <pointLight position={[3, 3, 2]} intensity={0.4} color="#ffd166" />

      <Grid />
      <RevenueLine />

      {/* bar chart KPI */}
      <Bar x={-2.6} baseHeight={0.6} phase={0.0} color="#1f4e8c" />
      <Bar x={-1.7} baseHeight={0.9} phase={0.7} color="#2a6bbf" />
      <Bar x={-0.8} baseHeight={1.3} phase={1.4} color="#3b82d9" />
      <Bar x={ 0.1} baseHeight={1.1} phase={2.1} color="#7ec850" />
      <Bar x={ 1.0} baseHeight={1.6} phase={2.8} color="#9ad96b" />
      <Bar x={ 1.9} baseHeight={1.0} phase={3.5} color="#ffd166" />
      <Bar x={ 2.8} baseHeight={1.4} phase={4.2} color="#ffb84d" />

      {/* novčići – BAM, KM, € */}
      <Coin position={[-3.0, 1.6, 0.8]} label="KM"  color="#e8b94a" />
      <Coin position={[ 2.6, 1.9, 0.4]} label="€"   color="#d6a635" />
      <Coin position={[ 0.2, 2.4, 1.2]} label="BAM" color="#f0c95a" />
      <Coin position={[-1.4, -0.2, 1.4]} label="KM" color="#caa040" />
    </Canvas>
  );
}
