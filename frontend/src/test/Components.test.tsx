import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import SourceComparisonMatrix from "../components/SourceComparisonMatrix";
import ClaimGraphVisualizer from "../components/ClaimGraphVisualizer";

// Mock Three.js to prevent WebGL canvas issues in jsdom environment
vi.mock("three", () => {
  return {
    Scene: vi.fn(() => ({ add: vi.fn() })),
    PerspectiveCamera: vi.fn(() => ({
      position: { set: vi.fn(), x: 0, y: 0, z: 0 },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
    })),
    WebGLRenderer: vi.fn(() => ({
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
      domElement: document.createElement("canvas"),
    })),
    SphereGeometry: vi.fn(),
    IcosahedronGeometry: vi.fn(),
    BufferGeometry: vi.fn(() => ({
      setAttribute: vi.fn(),
      setFromPoints: vi.fn(),
    })),
    BufferAttribute: vi.fn(),
    MeshBasicMaterial: vi.fn(),
    PointsMaterial: vi.fn(),
    LineBasicMaterial: vi.fn(),
    Mesh: vi.fn(() => ({
      position: { set: vi.fn() },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { set: vi.fn() },
      add: vi.fn(),
      children: [],
    })),
    Points: vi.fn(() => ({
      rotation: { x: 0, y: 0, z: 0 },
    })),
    Line: vi.fn(),
    Group: vi.fn(() => ({
      add: vi.fn(),
      clear: vi.fn(),
      rotation: { x: 0, y: 0, z: 0 },
    })),
    Vector2: vi.fn(),
    Vector3: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
    Raycaster: vi.fn(() => ({
      setFromCamera: vi.fn(),
      intersectObjects: vi.fn(() => []),
    })),
    Clock: vi.fn(() => ({
      getElapsedTime: vi.fn(() => 1.0),
    })),
    Color: vi.fn(() => ({
      clone: vi.fn(() => ({ lerp: vi.fn(() => ({ r: 0, g: 1, b: 0 })) })),
    })),
  };
});

describe("SourceComparisonMatrix", () => {
  it("renders source comparison archetypes and switches active selection", () => {
    render(<SourceComparisonMatrix />);
    expect(screen.getByText(/Cross-Source Framing & Bias Detection Matrix/i)).toBeInTheDocument();
    expect(screen.getByText(/Global Wire Agency \(Reuters \/ AP\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Mainstream Financial Press/i)).toBeInTheDocument();

    const blogCard = screen.getByText(/Unverified Clickbait Portal/i);
    expect(blogCard).toBeInTheDocument();
    fireEvent.click(blogCard);
  });
});

describe("ClaimGraphVisualizer", () => {
  it("renders scenarios and toggles scenario benchmarks", () => {
    render(<ClaimGraphVisualizer />);
    expect(screen.getByText(/Interactive Claim Relationship & Stance Graph/i)).toBeInTheDocument();
    expect(screen.getByText(/Exoplanet Atmospheric Discovery/i)).toBeInTheDocument();

    const emergencyToggle = screen.getByText(/Emergency Bank Seizure Rumor/i);
    expect(emergencyToggle).toBeInTheDocument();
    fireEvent.click(emergencyToggle);
    expect(screen.getByText(/Secret executive decree will freeze all personal bank accounts/i)).toBeInTheDocument();
  });
});
