import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Example component test demonstrating Vitest and Testing Library best practices:
 * - Use vi.fn() for function mocks
 * - Use screen queries from Testing Library
 * - Test user interactions with userEvent
 * - Use waitFor for async operations
 * - Descriptive test names following the pattern: "should [expected behavior] when [condition]"
 */

// Example component for demonstration
function ExampleButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} type="button">
      {children}
    </button>
  );
}

describe("ExampleButton", () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  it("should render button with correct text", () => {
    // Arrange & Act
    render(<ExampleButton onClick={mockOnClick}>Click me</ExampleButton>);

    // Assert
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("should call onClick handler when button is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<ExampleButton onClick={mockOnClick}>Click me</ExampleButton>);

    // Act
    const button = screen.getByRole("button", { name: /click me/i });
    await user.click(button);

    // Assert
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it("should handle multiple clicks", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<ExampleButton onClick={mockOnClick}>Click me</ExampleButton>);

    // Act
    const button = screen.getByRole("button", { name: /click me/i });
    await user.click(button);
    await user.click(button);
    await user.click(button);

    // Assert
    expect(mockOnClick).toHaveBeenCalledTimes(3);
  });
});

// Example of testing async component
function AsyncComponent() {
  const [data, setData] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setTimeout(() => {
      setData("Loaded data");
      setLoading(false);
    }, 100);
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return <div>{data}</div>;
}

describe("AsyncComponent", () => {
  it("should show loading state initially", () => {
    // Arrange & Act
    render(<AsyncComponent />);

    // Assert
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("should show data after loading", async () => {
    // Arrange & Act
    render(<AsyncComponent />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Loaded data")).toBeInTheDocument();
    });
  });
});

// Example of mocking modules
vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("Component with API calls", () => {
  it("should demonstrate API mocking", async () => {
    // This is an example of how to mock API calls
    // const { apiClient } = await import("@/lib/api/client");
    // vi.mocked(apiClient.get).mockResolvedValue({ data: "test" });

    // Your test here
  });
});
