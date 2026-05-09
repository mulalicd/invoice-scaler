import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Environment, OrbitControls } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

function FloatingDocs() {
  const group = useRef<THREE.Group>(null);
  const docs = useMemo(
    () => Array.from({ length: 8 }).map((_, i) => ({
      position: [
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 3 - 1,
      ] as [number, number, number],
      rot: Math.random() * Math.PI,
      scale: 0.4 + Math.random() * 0.3,
      seed: i,
    })),
    []
  );
  useFrame((_, dt) => { if (group.current) group.current.rotation.y += dt * 0.05; });
  return (
    <group ref={group}>
      {docs.map((d) => (
        <Float key={d.seed} speed={1.2 + d.seed * 0.1} rotationIntensity={0.6} floatIntensity={1.4}>
          <mesh position={d.position} rotation={[d.rot, d.rot * 0.5, 0]} scale={d.scale}>
            <planeGeometry args={[1.4, 2]} />
            <meshStandardMaterial color="#ffffff" metalness={0.1} roughness={0.4} side={THREE.DoubleSide} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

function Orb() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => { if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.3; });
  return (
    <mesh ref={ref} position={[0, 0, -2]}>
      <icosahedronGeometry args={[1.6, 4]} />
      <MeshDistortMaterial color="#1f4e8c" speed={1.4} distort={0.45} roughness={0.2} metalness={0.6} />
    </mesh>
  );
}

export default function AuthScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 55 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.1} />
        <pointLight position={[-5, -3, 2]} intensity={0.6} color="#7ec850" />
        <Orb />
        <FloatingDocs />
        <Environment preset="city" />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.4} enableDamping />
      </Suspense>
    </Canvas>
  );
}
