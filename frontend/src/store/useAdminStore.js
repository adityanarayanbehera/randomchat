// frontend/src/store/useAdminStore.js
// ✅ Admin state management with Zustand
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAdminStore = create(
  persist(
    (set) => ({
      admin: null,
      isAdminAuthenticated: false,
      stats: null,

      setAdmin: (admin) => set({ admin, isAdminAuthenticated: true }),

      clearAdmin: () =>
        set({ admin: null, isAdminAuthenticated: false, stats: null }),

      setStats: (stats) => set({ stats }),
    }),
    {
      name: "admin-storage",
      partialize: (state) => ({
        admin: state.admin,
        isAdminAuthenticated: state.isAdminAuthenticated,
      }),
    }
  )
);
