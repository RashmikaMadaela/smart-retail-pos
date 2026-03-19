import { create } from "zustand";

type SessionUser = {
  id: number;
  username: string;
  role: "Admin" | "Cashier";
};

type SessionState = {
  user: SessionUser | null;
  setUser: (user: SessionUser | null) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
