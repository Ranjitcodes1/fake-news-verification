import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AnalyzePage from "../pages/AnalyzePage";

test("shows validation guidance on empty submit", async () => {
  render(
    <MemoryRouter>
      <AnalyzePage />
    </MemoryRouter>,
  );
  screen.getByText("Analyze News").click();
  expect(await screen.findByText(/Please provide an article body|at least 3 characters/i)).toBeInTheDocument();
});

test("renders batch verification tab", () => {
  render(
    <MemoryRouter>
      <AnalyzePage />
    </MemoryRouter>,
  );
  const batchTab = screen.getByText("Batch & CSV Verification");
  expect(batchTab).toBeInTheDocument();
  fireEvent.click(batchTab);
  expect(screen.getByText(/Batch Processing Console/i)).toBeInTheDocument();
});

test("loads quick demo preset into input fields", () => {
  render(
    <MemoryRouter>
      <AnalyzePage />
    </MemoryRouter>,
  );
  const presetBtn = screen.getByText(/Official Central Bank Statement/i);
  fireEvent.click(presetBtn);
  const headlineInput = screen.getByPlaceholderText(/Paste news headline statement/i) as HTMLInputElement;
  expect(headlineInput.value).toContain("Central bank holds interest rates steady");
});
