import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface MomentDepth3DProps {
  variant: 'forest' | 'cream';
  progressRef: React.MutableRefObject<number>;
}

const _dummy = new THREE.Object3D();

let cachedSoftwareGl: boolean | null = null;

function detectSoftwareGl(): boolean {
  if (cachedSoftwareGl !== null) return cachedSoftwareGl;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      cachedSoftwareGl = true;
      return true;
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    cachedSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return cachedSoftwareGl;
  } catch {
    cachedSoftwareGl = false;
    return false;
  }
}

function makeBotanicalLeafGeo(): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, -0.35);
  s.bezierCurveTo(0.18, -0.15, 0.2, 0.1, 0, 0.36);
  s.bezierCurveTo(-0.2, 0.1, -0.18, -0.15, 0, -0.35);
  return new THREE.ExtrudeGeometry(s, {
    depth: 0.014,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.006,
    bevelSegments: 1,
    curveSegments: 8,
  });
}

export default function MomentDepth3D({ variant, progressRef }: MomentDepth3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isSoftwareGl = detectSoftwareGl();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.1,
      50
    );
    camera.position.set(0, 0, 6);

    const ambient = new THREE.HemisphereLight(0xf4efe2, 0x0e3b26, 1.1);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xc9a24b, 1.4);
    key.position.set(3, 5, 4);
    scene.add(key);

    const leafGeo = makeBotanicalLeafGeo();
    const leafMat = new THREE.MeshStandardMaterial({
      color: variant === 'forest' ? 0x3e7a4a : 0x3e7a4a,
      roughness: 0.55,
      metalness: 0.12,
      transparent: true,
      opacity: variant === 'forest' ? 0.38 : 0.2,
    });

    const count = 18;
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, count);
    leaves.frustumCulled = false;
    const seeds = Array.from({ length: count }, (_, i) => ({
      x: (Math.sin(i * 2.4) * 4.5),
      y: (Math.cos(i * 1.7) * 2.8),
      z: -1.5 - (i / count) * 10,
      rot: i * 0.6,
      scale: 0.45 + (i % 4) * 0.16,
    }));
    scene.add(leaves);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    let frameId = 0;
    let disposed = false;

    const renderFrame = () => {
      if (disposed) return;
      const p = progressRef.current;

      for (let i = 0; i < count; i++) {
        const s = seeds[i];
        const zMoved = ((s.z + p * 8 + 12) % 12) - 9;
        _dummy.position.set(s.x, s.y, zMoved);
        _dummy.rotation.set(s.rot + p * 0.8, s.rot * 0.7 + p * 1.1, 0.25);
        _dummy.scale.setScalar(s.scale);
        _dummy.updateMatrix();
        leaves.setMatrixAt(i, _dummy.matrix);
      }
      leaves.instanceMatrix.needsUpdate = true;

      renderer.render(scene, camera);
      if (!prefersReduced && !isSoftwareGl) {
        frameId = requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();
    let onScrollRefresh: (() => void) | null = null;
    if (isSoftwareGl && !prefersReduced) {
      onScrollRefresh = () => {
        cancelAnimationFrame(frameId);
        frameId = requestAnimationFrame(renderFrame);
      };
      window.addEventListener('scroll', onScrollRefresh, { passive: true });
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      if (onScrollRefresh) window.removeEventListener('scroll', onScrollRefresh);
      leafGeo.dispose();
      leafMat.dispose();
      renderer.dispose();
      if (canvas.parentNode === container) container.removeChild(canvas);
    };
  }, [variant, progressRef]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}
