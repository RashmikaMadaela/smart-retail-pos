import { create } from "zustand";
import type { ActiveTab } from "@/features/types";

type ShellState = {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
};

export const useShellStore = create<ShellState>((set) => ({
  activeTab: "dashboard",
  setActiveTab: (activeTab) => set({ activeTab }),
}));
