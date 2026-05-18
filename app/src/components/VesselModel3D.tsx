import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { VESSEL_TEMPLATES } from '@/lib/vessel-templates';
import {
  buildHullGeometry,
  buildDeckGeometry,
  buildCabinGeometry,
  buildRailingGeometry,
  buildWaterlineGeometry,
  buildMastGeometry,
  resolveHullProfile,
  type HullProfile,
} from '@/lib/hull-geometry';
import type { Space, VesselType } from '@/types';

interface VesselModel3DProps {
  vessel: {
    name: string;
    type?: VesselType;
    lengthOverall?: number;
    beam?: number;
    deckPlan?: { templateId?: string } | null;
    draft?: number;
  };
  spaces?: Space[];
}

function inferDimensions(vesselType?: VesselType, loaMeters?: number) {
  const loa = loaMeters && loaMeters > 0 ? loaMeters : 10;
  return { loa };
}

const SPACE_COLORS: Record<string, string> = {
  cockpit: '#10b981',
  cabin: '#3b82f6',
  berth: '#6366f1',
  head: '#8b5cf6',
  salon: '#0ea5e9',
  galley: '#f59e0b',
  locker: '#64748b',
  engine_room: '#ef4444',
  lazarette: '#78716c',
  forepeak: '#06b6d4',
};

const S = 0.12;

function ParametricHull({ loa, beam, draft, profile }: { loa: number; beam: number; draft: number; profile: HullProfile }) {
  const params = useMemo(() => ({
    length: loa * S,
    beam: beam * S,
    draft: draft * S,
    profile,
  }), [loa, beam, draft, profile]);

  const hullGeo = useMemo(() => buildHullGeometry(params), [params]);
  const deckGeo = useMemo(() => buildDeckGeometry(params), [params]);
  const cabinGeo = useMemo(() => buildCabinGeometry(params), [params]);
  const railGeo = useMemo(() => buildRailingGeometry(params), [params]);
  const waterlineGeo = useMemo(() => buildWaterlineGeometry(params), [params]);
  const mastGeo = useMemo(() => buildMastGeometry(params), [params]);

  return (
    <group>
      {/* Hull */}
      <mesh geometry={hullGeo} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#1a365d"
          roughness={0.25}
          metalness={0.05}
          clearcoat={0.5}
          clearcoatRoughness={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Deck */}
      <mesh geometry={deckGeo} receiveShadow>
        <meshStandardMaterial color="#d4a574" roughness={0.6} metalness={0} side={THREE.DoubleSide} />
      </mesh>

      {/* Cabin */}
      {cabinGeo && (
        <mesh geometry={cabinGeo} castShadow>
          <meshPhysicalMaterial color="#e8edf2" roughness={0.35} metalness={0.1} clearcoat={0.15} />
        </mesh>
      )}

      {/* Railing */}
      <mesh geometry={railGeo}>
        <meshStandardMaterial color="#94a3b8" roughness={0.25} metalness={0.7} />
      </mesh>

      {/* Waterline stripe */}
      <mesh geometry={waterlineGeo}>
        <meshStandardMaterial color="#dc2626" roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Mast */}
      {mastGeo && (
        <mesh geometry={mastGeo} castShadow>
          <meshStandardMaterial color="#a0aec0" roughness={0.3} metalness={0.5} />
        </mesh>
      )}
    </group>
  );
}

function WaterPlane({ size }: { size: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = Math.sin(clock.getElapsedTime() * 0.4) * 0.003;
    }
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]}>
      <planeGeometry args={[size, size]} />
      <meshPhysicalMaterial
        color="#0c4a6e"
        transparent
        opacity={0.35}
        roughness={0.05}
        metalness={0.2}
        transmission={0.5}
      />
    </mesh>
  );
}

function SpaceBox({ space, scaleFactor }: { space: Space; scaleFactor: number }) {
  const [hovered, setHovered] = useState(false);
  const geo = space.geometry;
  if (!geo || geo.kind !== 'rect') return null;

  const sc = scaleFactor * 0.01;
  const x = (geo.x - 400) * sc;
  const z = (150 - geo.y) * sc;
  const w = geo.width * sc;
  const d = geo.height * sc;
  const h = 0.08;

  const typeKey = space.type?.toLowerCase().replace(/[-\s]/g, '_') ?? 'cabin';
  const color = SPACE_COLORS[typeKey] ?? SPACE_COLORS.cabin;

  return (
    <group position={[x + w / 2, h / 2 + 0.02, z - d / 2]}>
      <mesh
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        castShadow
      >
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={hovered ? 0.75 : 0.4}
          emissive={hovered ? color : '#000000'}
          emissiveIntensity={hovered ? 0.3 : 0}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
        <lineBasicMaterial color={color} transparent opacity={0.6} />
      </lineSegments>
      {hovered && (
        <Html center distanceFactor={6} style={{ pointerEvents: 'none' }}>
          <div className="bg-background/95 border shadow-lg px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: color }} />
            {space.name}
          </div>
        </Html>
      )}
    </group>
  );
}

function AutoRotate() {
  const controlsRef = useRef<any>(null);
  const idleTimer = useRef(0);
  const isIdle = useRef(true);

  useFrame((_, delta) => {
    if (!controlsRef.current) return;
    if (isIdle.current) {
      controlsRef.current.autoRotate = true;
      controlsRef.current.autoRotateSpeed = 0.4;
    }
    idleTimer.current += delta;
    if (idleTimer.current > 3) isIdle.current = true;
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={0.8}
      maxDistance={6}
      maxPolarAngle={Math.PI * 0.85}
      enablePan
      panSpeed={0.5}
      onChange={() => {
        idleTimer.current = 0;
        isIdle.current = false;
        if (controlsRef.current) controlsRef.current.autoRotate = false;
      }}
    />
  );
}

export default function VesselModel3D({ vessel, spaces = [] }: VesselModel3DProps) {
  const { loa } = inferDimensions(vessel.type, vessel.lengthOverall);
  const beam = vessel.beam && vessel.beam > 0 ? vessel.beam : loa * 0.28;
  const draft = vessel.draft && vessel.draft > 0 ? vessel.draft : loa * 0.1;
  const profile = resolveHullProfile(vessel.type);
  const modelLen = loa * S;
  const camDist = modelLen * 1.8;
  const waterSize = modelLen * 6;

  return (
    <div className="h-[calc(100vh-280px)] min-h-[320px] rounded-lg border overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950">
      <Canvas
        shadows
        camera={{ position: [camDist * 0.8, camDist * 0.5, camDist], fov: 40 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 8, 5]} intensity={1.4} castShadow shadow-mapSize={1024} />
        <pointLight position={[-3, 2, -3]} intensity={0.3} color="#60a5fa" />
        <pointLight position={[2, 1, -4]} intensity={0.2} color="#fbbf24" />

        <ParametricHull loa={loa} beam={beam} draft={draft} profile={profile} />
        <WaterPlane size={waterSize} />

        {spaces.map((space) => (
          <SpaceBox key={space.id} space={space} scaleFactor={S / 0.01} />
        ))}

        <AutoRotate />
        <Environment preset="sunset" background={false} />
        <gridHelper args={[waterSize, 20, '#1e293b', '#0f172a']} position={[0, -draft * S - 0.01, 0]} />
      </Canvas>
    </div>
  );
}
