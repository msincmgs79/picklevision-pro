'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface TrajectoryPoint {
  x: number;
  y: number;
}

interface BallTrajectory {
  player: 1 | 2;
  playerName: string;
  startPosition: TrajectoryPoint;
  endPosition: TrajectoryPoint;
  shotType: string;
  zoneStart: string;
  zoneEnd: string;
  inOrOut: 'in' | 'out';
}

interface TrajectoryVisualizationProps {
  trajectories: BallTrajectory[];
  viewMode?: 'isometric' | 'top' | 'side' | 'expanded';
}

const COURT_WIDTH = 20;
const COURT_LENGTH = 44;
const KITCHEN_DEPTH = 7;

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

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e27);
    sceneRef.current = scene;

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
        camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.set(20, 25, 20);
        camera.lookAt(0, 0, 0);
        break;
      case 'isometric':
      default:
        camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.set(15, 12, 15);
        camera.lookAt(0, 0, 0);
        break;
    }

    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 15, 10);
    scene.add(directionalLight);

    const floorGeometry = new THREE.PlaneGeometry(COURT_WIDTH, COURT_LENGTH);
    const floorMaterial = new THREE.MeshPhongMaterial({ color: 0x1a4d2e });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const boundaryGeometry = new THREE.EdgesGeometry(floorGeometry);
    const boundaryMaterial = new THREE.LineBasicMaterial({ color: 0x00ff88, linewidth: 2 });
    const boundaryLines = new THREE.LineSegments(boundaryGeometry, boundaryMaterial);
    boundaryLines.rotation.x = -Math.PI / 2;
    boundaryLines.position.z = 0.01;
    scene.add(boundaryLines);

    const kitchenGeometry = new THREE.BufferGeometry();
    kitchenGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([
          -COURT_WIDTH / 2,
          0,
          -COURT_LENGTH / 2 + KITCHEN_DEPTH,
          COURT_WIDTH / 2,
          0,
          -COURT_LENGTH / 2 + KITCHEN_DEPTH,
        ]),
        3
      )
    );
    const kitchenMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
    const kitchenLine = new THREE.Line(kitchenGeometry, kitchenMaterial);
    scene.add(kitchenLine);

    const centerGeometry = new THREE.BufferGeometry();
    centerGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([
          0,
          0,
          -COURT_LENGTH / 2,
          0,
          0,
          COURT_LENGTH / 2,
        ]),
        3
      )
    );
    const centerMaterial = new THREE.LineBasicMaterial({ color: 0x888888 });
    const centerLine = new THREE.Line(centerGeometry, centerMaterial);
    scene.add(centerLine);

    trajectories.forEach((traj) => {
      const startX = (traj.startPosition.x / COURT_WIDTH - 0.5) * COURT_WIDTH;
      const startY = (-traj.startPosition.y / COURT_LENGTH + 0.5) * COURT_LENGTH;
      const endX = (traj.endPosition.x / COURT_WIDTH - 0.5) * COURT_WIDTH;
      const endY = (-traj.endPosition.y / COURT_LENGTH + 0.5) * COURT_LENGTH;

      let color: number;
      let endSphereSize: number;

      if (traj.player === 1) {
        color = traj.inOrOut === 'in' ? 0x00ff88 : 0xffaa00;
      } else {
        color = traj.inOrOut === 'in' ? 0xff1744 : 0xff6b00;
      }

      endSphereSize = traj.inOrOut === 'in' ? 0.15 : 0.12;

      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(startX, 0.5, startY),
        new THREE.Vector3((startX + endX) / 2, 3, (startY + endY) / 2),
        new THREE.Vector3(endX, 0.5, endY)
      );

      const points = curve.getPoints(20);
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineMaterial = new THREE.LineBasicMaterial({ color, linewidth: 2 });
      const trajectoryLine = new THREE.Line(lineGeometry, lineMaterial);
      scene.add(trajectoryLine);

      const sphereGeometry = new THREE.SphereGeometry(endSphereSize, 16, 16);
      const sphereMaterial = new THREE.MeshPhongMaterial({ color });
      const endSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      endSphere.position.set(endX, 0.5, endY);
      scene.add(endSphere);
    });

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      renderer.dispose();
    };
  }, [trajectories, currentViewMode]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
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
            }}
          >
            {mode === 'isometric' && '📊 3D'}
            {mode === 'top' && '🎯 Top'}
            {mode === 'side' && '📐 Side'}
            {mode === 'expanded' && '📺 Full'}
          </button>
        ))}
      </div>

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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <div style={{ width: '12px', height: '12px', background: '#00ff88', borderRadius: '50%' }} />
            <span>P1 In</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <div style={{ width: '12px', height: '12px', background: '#ffaa00', borderRadius: '50%' }} />
            <span>P1 Out</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <div style={{ width: '12px', height: '12px', background: '#ff1744', borderRadius: '50%' }} />
            <span>P2 In</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', background: '#ff6b00', borderRadius: '50%' }} />
            <span>P2 Out</span>
          </div>
        </div>

        <div style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)' }}>
          {trajectories.map((traj, idx) => (
            <div key={idx} style={{ marginBottom: '4px', paddingBottom: '4px', borderBottom: '1px solid rgba(0,255,136,0.1)' }}>
              <div style={{ color: traj.player === 1 ? '#00ff88' : '#ff1744' }}>{traj.playerName}</div>
              <div>{traj.shotType}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
