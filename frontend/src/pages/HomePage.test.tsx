import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import HomePage from "./HomePage";

describe("HomePage Single-Page Interface", () => {
  it("renders the single-page interface with only headline and article text inputs", () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    // Header & title
    expect(screen.getByText("Veritas News Verifier")).toBeInTheDocument();

    // Inputs
    expect(screen.getByLabelText(/News Headline/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Article Text/i)).toBeInTheDocument();

    // Submit button
    expect(screen.getByText(/Verify Credibility/i)).toBeInTheDocument();

    // Removed sections must NOT be present
    expect(screen.queryByText(/Verification Methodology/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/3D Real-Time News Veracity Neural Cluster/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cross-Source Framing & Bias Detection Matrix/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Interactive Claim Relationship & Stance Graph/i)).not.toBeInTheDocument();
  });

  it("populates headline and article text when clicking a quick test preset", () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    const presetBtn = screen.getByText(/Official Economic Statement/i);
    fireEvent.click(presetBtn);

    const headlineInput = screen.getByLabelText(/News Headline/i) as HTMLInputElement;
    const contentInput = screen.getByLabelText(/Article Text/i) as HTMLTextAreaElement;

    expect(headlineInput.value).toContain("Central bank holds interest rates steady");
    expect(contentInput.value).toContain("The central bank left its benchmark interest rate unchanged");
  });
});
