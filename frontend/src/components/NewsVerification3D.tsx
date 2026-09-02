import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Sparkles, Radio, ShieldCheck, Layers, Activity } from "lucide-react";

interface NodeData {
  title: string;
  category: "WIRE" | "OFFICIAL" | "FACT_CHECK" | "UNVERIFIED";
  color: number;
  position: THREE.Vector3;
  size: number;
  trustScore: number;
}

const NODES_CONFIG: Omit<NodeData, "position">[] = [
  { title: "Global Wire Feed (AP/Reuters)", category: "WIRE", color: 0x10b981, size: 2.2, trustScore: 98 },
  { title: "National Central Bank Archive", category: "OFFICIAL", color: 0x06b6d4, size: 2.0, trustScore: 96 },
  { title: "Independent Fact-Check Desk", category: "FACT_CHECK", color: 0x3b82f6, size: 1.9, trustScore: 94 },
  { title: "Peer-Reviewed Journal Index", category: "OFFICIAL", color: 0x14b8a6, size: 1.8, trustScore: 97 },
  { title: "Public Health Agency Desk", category: "OFFICIAL", color: 0x0ea5e9, size: 1.7, trustScore: 95 },
  { title: "Viral Social Aggregator", category: "UNVERIFIED", color: 0xf43f5e, size: 1.6, trustScore: 18 },
  { title: "Clickbait Speculation Forum", category: "UNVERIFIED", color: 0xfb7185, size: 1.4, trustScore: 12 },
  { title: "Cross-Wire Corroboration Hub", category: "WIRE", color: 0x34d399, size: 2.1, trustScore: 99 },
];

export default function NewsVerification3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeNode, setActiveNode] = useState<Omit<NodeData, "position"> | null>(NODES_CONFIG[0]);
  const [isRotating, setIsRotating] = useState(true);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 600;
    const height = mount.clientHeight || 420;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 20, 52);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    // 2. Central Verification Core Sphere
    const coreGeometry = new THREE.SphereGeometry(4.5, 32, 32);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const coreSphere = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(coreSphere);

    // Inner glowing core
    const innerCoreGeo = new THREE.IcosahedronGeometry(2.4, 2);
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      wireframe: false,
      transparent: true,
      opacity: 0.75,
    });
    const innerCore = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    scene.add(innerCore);

    // 3. Orbiting Nodes Hierarchy
    const nodeObjects: { mesh: THREE.Mesh; data: Omit<NodeData, "position">; angle: number; radius: number; speed: number; yOffset: number }[] = [];
    const orbitGroup = new THREE.Group();
    scene.add(orbitGroup);

    const totalNodes = NODES_CONFIG.length;
    NODES_CONFIG.forEach((cfg, idx) => {
      const radius = 16 + (idx % 3) * 4.5;
      const angle = (idx / totalNodes) * Math.PI * 2;
      const speed = 0.006 + (idx % 3) * 0.003;
      const yOffset = Math.sin(idx * 1.5) * 6;

      const sphereGeo = new THREE.SphereGeometry(cfg.size, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.9,
      });
      const nodeMesh = new THREE.Mesh(sphereGeo, sphereMat);

      // Add a subtle wireframe halo around each node
      const haloGeo = new THREE.SphereGeometry(cfg.size * 1.4, 8, 8);
      const haloMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        wireframe: true,
        transparent: true,
        opacity: 0.25,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      nodeMesh.add(haloMesh);

      orbitGroup.add(nodeMesh);
      nodeObjects.push({
        mesh: nodeMesh,
        data: cfg,
        angle,
        radius,
        speed,
        yOffset,
      });
    });

    // 4. Connecting Laser Filaments to Core
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.22,
    });

    const linesGroup = new THREE.Group();
    scene.add(linesGroup);

    // 5. Dynamic Orbit Rings
    [16, 20.5, 25].forEach((r) => {
      const ringGeo = new THREE.BufferGeometry();
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(theta) * r, 0, Math.sin(theta) * r));
      }
      ringGeo.setFromPoints(points);
      const ringMat = new THREE.LineBasicMaterial({
        color: 0x334155,
        transparent: true,
        opacity: 0.25,
      });
      const ringMesh = new THREE.Line(ringGeo, ringMat);
      scene.add(ringMesh);
    });

    // 6. Particle Cloud for Ambient Veracity Data Stream
    const particleCount = 180;
    const particlesGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const dist = 6 + Math.random() * 24;

      particlePositions[i * 3] = dist * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 16;
      particlePositions[i * 3 + 2] = dist * Math.sin(phi) * Math.sin(theta);
    }
    particlesGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particlesMat = new THREE.PointsMaterial({
      color: 0x10b981,
      size: 1.2,
      transparent: true,
      opacity: 0.4,
    });
    const particleCloud = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particleCloud);

    // 7. Mouse Parallax & Interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetRotX = 0;
    let targetRotY = 0;

    const onMouseMove = (event: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      mouseX = (x / width - 0.5) * 2;
      mouseY = (y / height - 0.5) * 2;
    };

    mount.addEventListener("mousemove", onMouseMove);

    // Raycaster for clicking / inspecting nodes
    const raycaster = new THREE.Raycaster();
    const mouseVec = new THREE.Vector2();

    const onClick = (event: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      mouseVec.x = ((event.clientX - rect.left) / width) * 2 - 1;
      mouseVec.y = -((event.clientY - rect.top) / height) * 2 + 1;

      raycaster.setFromCamera(mouseVec, camera);
      const meshes = nodeObjects.map((n) => n.mesh);
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const hit = nodeObjects.find((n) => n.mesh === intersects[0].object || n.mesh.children.includes(intersects[0].object as THREE.Mesh));
        if (hit) {
          setActiveNode(hit.data);
        }
      }
    };

    mount.addEventListener("click", onClick);

    // 8. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth camera sway
      targetRotX += (mouseY * 0.25 - targetRotX) * 0.05;
      targetRotY += (mouseX * 0.45 - targetRotY) * 0.05;

      camera.position.x = Math.sin(targetRotY) * 52;
      camera.position.z = Math.cos(targetRotY) * 52;
      camera.position.y = 20 + targetRotX * 20;
      camera.lookAt(0, 0, 0);

      // Pulse Central Core
      const scale = 1 + Math.sin(elapsed * 2) * 0.06;
      coreSphere.scale.set(scale, scale, scale);
      coreSphere.rotation.y = elapsed * 0.2;
      coreSphere.rotation.x = elapsed * 0.1;

      innerCore.rotation.y = -elapsed * 0.4;
      innerCore.rotation.z = elapsed * 0.3;

      // Animate Orbiting Nodes & Rebuild connecting filaments
      linesGroup.clear();

      nodeObjects.forEach((node, i) => {
        if (isRotating) {
          node.angle += node.speed;
        }
        const x = Math.cos(node.angle) * node.radius;
        const z = Math.sin(node.angle) * node.radius;
        const y = node.yOffset + Math.sin(elapsed * 1.5 + i) * 1.2;

        node.mesh.position.set(x, y, z);
        node.mesh.rotation.y += 0.02;

        // Line to core
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(x, y, z),
        ]);
        const line = new THREE.Line(lineGeo, lineMaterial);
        linesGroup.add(line);
      });

      // Slowly rotate particle field
      particleCloud.rotation.y = elapsed * 0.03;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      mount.removeEventListener("mousemove", onMouseMove);
      mount.removeEventListener("click", onClick);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
    };
  }, [isRotating]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/90 p-5 shadow-2xl backdrop-blur-xl">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              3D Real-Time News Veracity Neural Cluster
            </h3>
            <p className="text-[11px] text-slate-400">
              Interactive visual topology linking media wires, institutional records, and truth consensus.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRotating((prev) => !prev)}
            className="rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 font-mono text-[10px] text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            {isRotating ? "⏸ Pause Rotation" : "▶ Resume Orbit"}
          </button>
          <span className="rounded bg-emerald-950/80 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400 border border-emerald-800/60">
            8 ACTIVE NODES
          </span>
        </div>
      </div>

      {/* 3D Canvas Mount */}
      <div
        ref={mountRef}
        className="relative h-72 w-full cursor-grab active:cursor-grabbing sm:h-80"
        title="Click and drag to rotate topology, click on nodes to inspect"
      />

      {/* Live Node Telemetry Overlay Card */}
      {activeNode && (
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-3.5 text-xs backdrop-blur-md">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
              <span className="uppercase font-bold text-emerald-400">INSPECTED SOURCE NODE:</span>
              <span
                className={`rounded px-1.5 py-0.2 font-bold uppercase ${
                  activeNode.category === "WIRE"
                    ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                    : activeNode.category === "OFFICIAL"
                    ? "bg-cyan-950 text-cyan-300 border border-cyan-800/60"
                    : activeNode.category === "FACT_CHECK"
                    ? "bg-blue-950 text-blue-300 border border-blue-800/60"
                    : "bg-rose-950 text-rose-300 border border-rose-800/60"
                }`}
              >
                {activeNode.category}
              </span>
            </div>
            <h4 className="font-bold text-white text-xs">{activeNode.title}</h4>
          </div>

          <div className="flex items-center gap-4 self-end sm:self-auto font-mono text-[11px]">
            <div className="text-right">
              <span className="text-slate-500 text-[10px] block">TRUST INDEX</span>
              <span
                className={`font-bold ${
                  activeNode.trustScore >= 80
                    ? "text-emerald-400"
                    : activeNode.trustScore >= 50
                    ? "text-amber-400"
                    : "text-rose-400"
                }`}
              >
                {activeNode.trustScore}%
              </span>
            </div>

            <div className="text-right border-l border-slate-800 pl-3">
              <span className="text-slate-500 text-[10px] block">TOPOLOGY STATUS</span>
              <span className="text-slate-300 font-semibold">SYNCHRONIZED</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
