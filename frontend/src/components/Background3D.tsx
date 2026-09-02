import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function Background3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 1, 1000);
    camera.position.set(0, 36, 100);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 3D Editorial Intelligence Data Grid
    const gridRows = 42;
    const gridCols = 42;
    const spacing = 4.8;
    const particleCount = gridRows * gridCols;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    // Human-crafted editorial intelligence tones: Steel slate, deep emerald, muted warm gold
    const colorSlate = new THREE.Color(0x64748b);
    const colorEmerald = new THREE.Color(0x10b981);
    const colorTeal = new THREE.Color(0x0d9488);

    let idx = 0;
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const x = (c - gridCols / 2) * spacing;
        const z = (r - gridRows / 2) * spacing;
        const y = 0;

        positions[idx * 3] = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = z;

        // Elegant gradient interpolation
        const ratio = (c + r) / (gridRows + gridCols);
        const tempColor = ratio < 0.6 ? colorSlate.clone().lerp(colorEmerald, ratio * 1.5) : colorEmerald.clone().lerp(colorTeal, (ratio - 0.6) * 2.5);

        colors[idx * 3] = tempColor.r;
        colors[idx * 3 + 1] = tempColor.g;
        colors[idx * 3 + 2] = tempColor.b;

        idx++;
      }
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
    });

    const pointCloud = new THREE.Points(geometry, material);
    scene.add(pointCloud);

    // Structural Data Mesh Lines
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x334155,
      transparent: true,
      opacity: 0.18,
    });

    const linesGroup = new THREE.Group();
    for (let r = 0; r < gridRows; r += 3) {
      const lineGeo = new THREE.BufferGeometry();
      const linePts: THREE.Vector3[] = [];
      for (let c = 0; c < gridCols; c++) {
        const x = (c - gridCols / 2) * spacing;
        const z = (r - gridRows / 2) * spacing;
        linePts.push(new THREE.Vector3(x, 0, z));
      }
      lineGeo.setFromPoints(linePts);
      const line = new THREE.Line(lineGeo, lineMaterial);
      linesGroup.add(line);
    }
    scene.add(linesGroup);

    // Mouse Parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener("mousemove", onMouseMove);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth Camera Tracking
      targetX += (mouseX * 14 - targetX) * 0.035;
      targetY += (-mouseY * 9 - targetY) * 0.035;
      camera.position.x = targetX;
      camera.position.y = 36 + targetY;
      camera.lookAt(0, 0, 0);

      // Gentle Undulation Wave
      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      const array = posAttr.array as Float32Array;

      let pIdx = 0;
      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          const x = (c - gridCols / 2) * spacing;
          const z = (r - gridRows / 2) * spacing;

          const y =
            Math.sin(x * 0.06 + elapsed * 0.9) * 3.8 +
            Math.cos(z * 0.06 + elapsed * 0.8) * 3.8 +
            Math.sin((x + z) * 0.03 + elapsed * 0.6) * 2.2;

          array[pIdx * 3 + 1] = y;
          pIdx++;
        }
      }
      posAttr.needsUpdate = true;

      pointCloud.rotation.y = elapsed * 0.015;
      linesGroup.rotation.y = elapsed * 0.015;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 h-full w-full overflow-hidden opacity-85"
    />
  );
}
