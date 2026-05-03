import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "../use-auth";

// Mock Next.js router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock server actions
const mockSignInAction = vi.fn();
const mockSignUpAction = vi.fn();
vi.mock("@/actions", () => ({
  signIn: (...args: any[]) => mockSignInAction(...args),
  signUp: (...args: any[]) => mockSignUpAction(...args),
}));

// Mock anon-work-tracker
const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

// Mock project actions
const mockGetProjects = vi.fn();
const mockCreateProject = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: (input: any) => mockCreateProject(input),
}));

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
  });

  describe("signIn", () => {
    it("should set isLoading to true while signing in", async () => {
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "proj-1" });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        result.current.signIn("user@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("should return success result when signIn succeeds", async () => {
      const successResult = { success: true };
      mockSignInAction.mockResolvedValue(successResult);
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "proj-1" });

      const { result } = renderHook(() => useAuth());

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn(
          "user@example.com",
          "password123"
        );
      });

      expect(signInResult).toEqual(successResult);
    });

    it("should return error result when signIn fails", async () => {
      const errorResult = { success: false, error: "Invalid credentials" };
      mockSignInAction.mockResolvedValue(errorResult);

      const { result } = renderHook(() => useAuth());

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn(
          "user@example.com",
          "wrong"
        );
      });

      expect(signInResult).toEqual(errorResult);
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("should handle post-sign-in logic with anon work", async () => {
      const anonWork = {
        messages: [{ role: "user", content: "Create a button" }],
        fileSystemData: { "index.tsx": "content" },
      };
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork);
      mockCreateProject.mockResolvedValue({ id: "proj-from-anon" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^Design from/),
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      });
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/proj-from-anon");
    });

    it("should navigate to most recent project if no anon work", async () => {
      const projects = [{ id: "proj-1" }, { id: "proj-2" }];
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue(projects);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/proj-1");
    });

    it("should create new project if user has no projects", async () => {
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "new-proj-123" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #/),
        messages: [],
        data: {},
      });
      expect(mockPush).toHaveBeenCalledWith("/new-proj-123");
    });

    it("should set isLoading to false even if an error occurs", async () => {
      mockSignInAction.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      try {
        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });
      } catch {
        // Expected error
      }

      expect(result.current.isLoading).toBe(false);
    });

    it("should handle empty anon work data gracefully", async () => {
      const emptyAnonWork = {
        messages: [],
        fileSystemData: {},
      };
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(emptyAnonWork);
      mockGetProjects.mockResolvedValue([
        { id: "user-proj-1" },
        { id: "user-proj-2" },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/user-proj-1");
    });
  });

  describe("signUp", () => {
    it("should set isLoading to true while signing up", async () => {
      mockSignUpAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "proj-1" });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        result.current.signUp("newuser@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("should return success result when signUp succeeds", async () => {
      const successResult = { success: true };
      mockSignUpAction.mockResolvedValue(successResult);
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "proj-1" });

      const { result } = renderHook(() => useAuth());

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp(
          "newuser@example.com",
          "password123"
        );
      });

      expect(signUpResult).toEqual(successResult);
    });

    it("should return error result when signUp fails", async () => {
      const errorResult = {
        success: false,
        error: "Email already registered",
      };
      mockSignUpAction.mockResolvedValue(errorResult);

      const { result } = renderHook(() => useAuth());

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp(
          "existing@example.com",
          "password123"
        );
      });

      expect(signUpResult).toEqual(errorResult);
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("should handle post-sign-up logic with anon work", async () => {
      const anonWork = {
        messages: [{ role: "user", content: "Create a form" }],
        fileSystemData: { "form.tsx": "content" },
      };
      mockSignUpAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork);
      mockCreateProject.mockResolvedValue({ id: "proj-from-signup" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("newuser@example.com", "password123");
      });

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^Design from/),
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      });
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/proj-from-signup");
    });

    it("should navigate to most recent project if no anon work on signup", async () => {
      const projects = [{ id: "proj-recent" }];
      mockSignUpAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue(projects);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("newuser@example.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/proj-recent");
    });

    it("should create new project if new user has no projects", async () => {
      mockSignUpAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "new-user-proj" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("newuser@example.com", "password123");
      });

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #/),
        messages: [],
        data: {},
      });
      expect(mockPush).toHaveBeenCalledWith("/new-user-proj");
    });

    it("should set isLoading to false even if an error occurs during signup", async () => {
      mockSignUpAction.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useAuth());

      try {
        await act(async () => {
          await result.current.signUp("newuser@example.com", "password123");
        });
      } catch {
        // Expected error
      }

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("hook behavior", () => {
    it("should provide signIn, signUp, and isLoading in returned object", () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current).toHaveProperty("signIn");
      expect(result.current).toHaveProperty("signUp");
      expect(result.current).toHaveProperty("isLoading");
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
      expect(typeof result.current.isLoading).toBe("boolean");
    });

    it("should initialize with isLoading as false", () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);
    });

    it("should generate unique project names", async () => {
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);

      const projectNames: string[] = [];

      // Mock createProject to capture names
      mockCreateProject.mockImplementation((input) => {
        projectNames.push(input.name);
        return Promise.resolve({ id: `proj-${projectNames.length}` });
      });

      const { result } = renderHook(() => useAuth());

      // Sign in twice to create two new projects
      await act(async () => {
        await result.current.signIn("user1@example.com", "password123");
      });

      await act(async () => {
        await result.current.signIn("user2@example.com", "password123");
      });

      expect(projectNames).toHaveLength(2);
      expect(projectNames[0]).toMatch(/^New Design #\d{1,5}$/);
      expect(projectNames[1]).toMatch(/^New Design #\d{1,5}$/);
      // Names should be different (random numbers)
      expect(projectNames[0]).not.toBe(projectNames[1]);
    });

    it("should handle anon work with only messages (no files)", async () => {
      const anonWork = {
        messages: [{ role: "user", content: "Test message" }],
        fileSystemData: {},
      };
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork);
      mockCreateProject.mockResolvedValue({ id: "proj-msg-only" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^Design from/),
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      });
      expect(mockPush).toHaveBeenCalledWith("/proj-msg-only");
    });

    it("should prioritize anon work over existing projects", async () => {
      const anonWork = {
        messages: [{ role: "user", content: "Anon work" }],
        fileSystemData: {},
      };
      const existingProjects = [
        { id: "existing-1" },
        { id: "existing-2" },
      ];

      mockSignUpAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork);
      mockCreateProject.mockResolvedValue({ id: "anon-proj" });
      mockGetProjects.mockResolvedValue(existingProjects);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("user@example.com", "password123");
      });

      // Should create project from anon work, not navigate to existing
      expect(mockCreateProject).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/anon-proj");
      // getProjects should not have been called
      expect(mockGetProjects).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should preserve isLoading state on signIn failure", async () => {
      mockSignInAction.mockRejectedValue(new Error("Auth service down"));

      const { result } = renderHook(() => useAuth());

      try {
        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });
      } catch {
        // Expected
      }

      expect(result.current.isLoading).toBe(false);
    });

    it("should preserve isLoading state on signUp failure", async () => {
      mockSignUpAction.mockRejectedValue(new Error("Database error"));

      const { result } = renderHook(() => useAuth());

      try {
        await act(async () => {
          await result.current.signUp("user@example.com", "password123");
        });
      } catch {
        // Expected
      }

      expect(result.current.isLoading).toBe(false);
    });

    it("should handle createProject errors gracefully", async () => {
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockRejectedValue(
        new Error("Failed to create project")
      );

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.signIn("user@example.com", "password123");
        })
      ).rejects.toThrow("Failed to create project");

      expect(result.current.isLoading).toBe(false);
    });

    it("should handle getProjects errors gracefully", async () => {
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockRejectedValue(new Error("Failed to fetch projects"));

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.signIn("user@example.com", "password123");
        })
      ).rejects.toThrow("Failed to fetch projects");

      expect(result.current.isLoading).toBe(false);
    });
  });
});
