import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AnalyzePage from "../pages/AnalyzePage";

test("renders verify by link tab and handles validation", async () => {
  render(
    <MemoryRouter>
      <AnalyzePage />
    </MemoryRouter>,
  );
  expect(screen.getByText("Verify by Link")).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/example-news-story/i)).toBeInTheDocument();
});

test("renders direct text paste tab and shows validation on empty submit", async () => {
  render(
    <MemoryRouter>
      <AnalyzePage />
    </MemoryRouter>,
  );
  const textTab = screen.getByText("Direct Text Paste");
  fireEvent.click(textTab);

  const analyzeBtn = screen.getByText("Analyze News Text");
  fireEvent.click(analyzeBtn);
  expect(await screen.findByText(/at least 3 characters/i)).toBeInTheDocument();
});

test("renders batch verification tab", () => {
  render(
    <MemoryRouter>
      <AnalyzePage />
    </MemoryRouter>,
  );
  const batchTab = screen.getByText(/Batch CSV/i);
  expect(batchTab).toBeInTheDocument();
  fireEvent.click(batchTab);
  expect(screen.getByText(/Batch Processing Console/i)).toBeInTheDocument();
});

test("loads multilingual demo preset into text input fields", () => {
  render(
    <MemoryRouter>
      <AnalyzePage />
    </MemoryRouter>,
  );
  const textTab = screen.getByText("Direct Text Paste");
  fireEvent.click(textTab);

  const presetBtn = screen.getByText(/Official Central Bank Statement/i);
  fireEvent.click(presetBtn);
  const headlineInput = screen.getByPlaceholderText(/Paste news headline statement/i) as HTMLInputElement;
  expect(headlineInput.value).toContain("Central bank holds interest rates steady");
});
