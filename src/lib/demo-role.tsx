/**
 * PROTOTYPE-ONLY demo role switcher (Phase 0).
 *
 * This is NOT authentication. Phase 1 replaces it with real Cloud auth +
 * RBAC + row level security. Keep it clearly labelled everywhere it appears.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ROLES, type Role } from "./domain";

const STORAGE_KEY = "sih26016.demoRole";

type DemoRoleValue = {
  role: Role | null;
  setRole: (role: Role | null) => void;
  largeText: boolean;
  toggleLargeText: () => void;
};

const DemoRoleContext = createContext<DemoRoleValue | null>(null);

export function DemoRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(null);
  const [largeText, setLargeText] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Role | null;
    if (stored && (ROLES as readonly string[]).includes(stored)) {
      setRoleState(stored);
    }
    const lt = window.localStorage.getItem("sih26016.largeText") === "1";
    setLargeText(lt);
    document.documentElement.classList.toggle("text-scale-lg", lt);
  }, []);

  const setRole = useCallback((next: Role | null) => {
    setRoleState(next);
    if (next) window.localStorage.setItem(STORAGE_KEY, next);
    else window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const toggleLargeText = useCallback(() => {
    setLargeText((prev) => {
      const next = !prev;
      window.localStorage.setItem("sih26016.largeText", next ? "1" : "0");
      document.documentElement.classList.toggle("text-scale-lg", next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ role, setRole, largeText, toggleLargeText }),
    [role, setRole, largeText, toggleLargeText],
  );

  return (
    <DemoRoleContext.Provider value={value}>{children}</DemoRoleContext.Provider>
  );
}

export function useDemoRole() {
  const ctx = useContext(DemoRoleContext);
  if (!ctx) throw new Error("useDemoRole must be used inside <DemoRoleProvider>");
  return ctx;
}
