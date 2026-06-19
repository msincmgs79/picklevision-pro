'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface TrajectoryPoint {
  x: number;
  y: number;
}

interface BallTrajectory {
  player: 1 | 2;
  startPosition: TrajectoryPoint;
  endPosition: TrajectoryPoint;
  shotType: string;
  zoneStart: string;
  zoneEnd: string;
}

interface TrajectoryVisualizationProps {
  trajectories: BallTrajectory[];
  viewMode?: 'isometric' | 'top' | 'side' | 'expanded';
}

const COURT_WIDTH = 20; // feet
const COURT_LENGTH = 44; // feet
const KITCHEN_DEPTH = 7; // feet
const ZONE_COLORS = {
  kitchen: 0x00ff88,
  midcourt: 0x00d4ff,
  baseline: 0xff6b6b,
  sideline: 0xffd700,
};

export default function TrajectoryVisualization({
  trajectories,
  viewMode = 'isometric',
}: TrajectoryVisualizationProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [currentViewMode, setCurrentViewMode] = useState<string>(viewMode);

  useEffect(() => {
    if (!mountRef.current || !trajectories.length) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e27);
    sceneRef.current = scene;

    // Camera setup based on view mode
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    let camera: THREE.Camera;

    switch (currentViewMode) {
      case 'top':
        camera = new THREE.OrthographicCamera(
          -COURT_WIDTH / 2,
          COURT_WIDTH / 2,
          -COURT_LENGTH / 2,
          COURT_LENGTH / 2,
          0.1,
          1000
        );
        camera.position.z = 50;
        break;
      case 'side':
        camera = new THREE.OrthographicCamera(
          -COURT_LENGTH / 2,
          COURT_LENGTH / 2,
          -10,
          10,
          0.1,
          1000
        );
        camera.position.x = 50;
        camera.lookAt(0, 0, 0);
        break;
      case 'expanded':
        camera = new THREE.PerspectiveCamera(
          75,
          width / height,
          0.1,
          1000
        );
        camera.position.set(20, 25, 20);
        camera.lookAt(0, 0, 0);
        break;
      case 'isometric':
      default:
        camera = new THREE.PerspectiveCamera(
          75,
          width / height,
          0.1,
          1000
        );
        camera.position.set(15, 12, 15);
        camera.lookAt(0, 0, 0);
        break;
    }

    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 15, 10);
    scene.add(directionalLight);

    // Court floor
    const courtGeometry = new THREE.PlaneGeometry(COURT_WIDTH, COURT_LENGTH);
    const courtMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1f3a,
      roughness: 0.8,
    });
    const court = new THREE.Mesh(courtGeometry, courtMaterial);
    court.rotation.x = -Math.PI / 2;
    scene.add(court);

    // Court edges
    const edgesGeometry = new THREE.EdgesGeometry(courtGeometry);
    const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x00ff88, linewidth: 2 });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    edges.rotation.x = -Math.PI / 2;
    edges.position.z = 0.01;
    scene.add(edges);

    // Kitchen line
    const kitchenLineGeometry = new THREE.BufferGeometry();
    const kitchenLinePositions = new Float32Array([
      -COURT_WIDTH / 2,
      0,
      KITCHEN_DEPTH,
      COURT_WIDTH / 2,
      0,
      KITCHEN_DEPTH,
    ]);
    kitchenLineGeometry.setAttribute('position', new THREE.BufferAttribute(kitchenLinePositions, 3));
    const kitchenLineMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
    const kitchenLine = new THREE.Line(kitchenLineGeometry, kitchenLineMaterial);
    scene.add(kitchenLine);

    // Center line
    const centerLineGeometry = new THREE.BufferGeometry();
    const centerLinePositions = new Float32Array([
      0,
      0,
      -COURT_LENGTH / 2,
      0,
      0,
      COURT_LENGTH / 2,
    ]);
    centerLineGeometry.setAttribute('position', new THREE.BufferAttribute(centerLinePositions, 3));
    const centerLineMaterial = new THREE.LineBasicMaterial({ color: 0x888888 });
    const centerLine = new THREE.Line(centerLineGeometry, centerLineMaterial);
    scene.add(centerLine);

    // Draw trajectories
    trajectories.forEach((traj, idx) => {
      // Start point
      const startGeometry = new THREE.SphereGeometry(0.15, 8, 8);
      const startColor = traj.player === 1 ? 0x00ff88 : 0xff1744;
      const startMaterial = new THREE.MeshStandardMaterial({ color: startColor, emissive: startColor });
      const startSphere = new THREE.Mesh(startGeometry, startMaterial);
      startSphere.position.set(
        traj.startPosition.x - COURT_WIDTH / 2,
        0.2,
        traj.startPosition.y - COURT_LENGTH / 2
      );
      scene.add(startSphere);

      // End point
      const endGeometry = new THREE.SphereGeometry(0.15, 8, 8);
      const endColor = traj.player === 1 ? 0x00ff88 : 0xff1744;
      const endMaterial = new THREE.MeshStandardMaterial({ color: endColor, emissive: endColor });
      const endSphere = new THREE.Mesh(endGeometry, endMaterial);
      endSphere.position.set(
        traj.endPosition.x - COURT_WIDTH / 2,
        0.2,
        traj.endPosition.y - COURT_LENGTH / 2
      );
      scene.add(endSphere);

      // Trajectory line with arc
      const arcCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(
          traj.startPosition.x - COURT_WIDTH / 2,
          0.2,
          traj.startPosition.y - COURT_LENGTH / 2
        ),
        new THREE.Vector3(
          (traj.startPosition.x + traj.endPosition.x) / 2 - COURT_WIDTH / 2,
          2,
          (traj.startPosition.y + traj.endPosition.y) / 2 - COURT_LENGTH / 2
        ),
        new THREE.Vector3(
          traj.endPosition.x - COURT_WIDTH / 2,
          0.2,
          traj.endPosition.y - COURT_LENGTH / 2
        )
      );

      const points = arcCurve.getPoints(20);
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineColor = traj.player === 1 ? 0x00ff88 : 0xff1744;
      const lineMaterial = new THREE.LineBasicMaterial({
        color: lineColor,
        linewidth: 3,
        transparent: true,
        opacity: 0.8,
      });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      scene.add(line);
    });

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!mountRef.current) return;
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;

      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
      }
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [trajectories, currentViewMode]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* View Controls */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          padding: '12px',
          background: 'rgba(0, 0, 0, 0.5)',
          borderRadius: '6px',
          marginBottom: '12px',
        }}
      >
        {(['isometric', 'top', 'side', 'expanded'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setCurrentViewMode(mode)}
            style={{
              padding: '8px 12px',
              background: currentViewMode === mode ? 'rgba(0, 255, 136, 0.3)' : 'rgba(0, 0, 0, 0.3)',
              border: currentViewMode === mode ? '2px solid #00ff88' : '1px solid rgba(0, 255, 136, 0.2)',
              color: '#00ff88',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              transition: 'all 0.2s',
            }}
          >
            {mode === 'isometric' && '📊 3D'}
            {mode === 'top' && '🎯 Top'}
            {mode === 'side' && '📐 Side'}
            {mode === 'expanded' && '📺 Full'}
          </button>
        ))}
      </div>

      {/* Canvas Container */}
      <div
        ref={mountRef}
        style={{
          flex: 1,
          borderRadius: '6px',
          overflow: 'hidden',
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(0, 255, 136, 0.2)',
        }}
      />

      {/* Legend */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          marginTop: '12px',
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.7)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', background: '#00ff88', borderRadius: '50%' }} />
          <span>Player 1 Shots</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', background: '#ff1744', borderRadius: '50%' }} />
          <span>Player 2 Shots</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', background: '#ffff00', borderRadius: '50%' }} />
          <span>Kitchen Line</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', background: '#888888', borderRadius: '50%' }} />
          <span>Center Line</span>
        </div>
      </div>
    </div>
  );
}
