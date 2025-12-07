// frontend/src/store/useStore.js
// ✅ FIXED: Stable function references to prevent infinite loops
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useStore = create(
  persist(
    (set, get) => ({
      // User State
      user: null,
      isAuthenticated: false,

      // Chat State
      currentRoom: null,
      partner: null,
      messages: [],
      activeChats: [],

      // Unread State (separate from active chats)
      unreadCounts: {}, // { chatId: count }

      // UI State
      isSearching: false,
      isConnected: false,

      // Theme State
      theme: "light", // or "dark"
      updateUserSettings: (settings) => {
        const currentUser = get().user;
        set({
          user: {
            ...currentUser,
            settings: {
              ...currentUser.settings,
              ...settings,
            },
          },
        });
      },
      // ✅ Actions (these are stable - won't cause re-renders)
      setUser: (user) => set({ user, isAuthenticated: !!user }),

      clearUser: () =>
        set({
          user: null,
          isAuthenticated: false,
          currentRoom: null,
          partner: null,
          messages: [],
          unreadCounts: {},
        }),

      setCurrentRoom: (room, partner) =>
        set({
          currentRoom: room,
          partner,
          isConnected: true,
        }),

      clearRoom: () =>
        set({
          currentRoom: null,
          partner: null,
          messages: [],
          isConnected: false,
        }),

      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),

      setMessages: (messages) => set({ messages }),

      updateMessageRead: (messageIds) =>
        set((state) => ({
          messages: state.messages.map((msg) =>
            messageIds.includes(msg.id)
              ? { ...msg, readBy: [...(msg.readBy || []), get().user?._id] }
              : msg
          ),
        })),

      setSearching: (isSearching) => set({ isSearching }),

      setActiveChats: (chats) => set({ activeChats: chats }),

      addActiveChat: (chat) =>
        set((state) => ({
          activeChats: [chat, ...state.activeChats],
        })),

      // ✅ Unread count management (stable functions)
      setUnread: (chatId, count) =>
        set((state) => ({
          unreadCounts: {
            ...state.unreadCounts,
            [chatId]: count,
          },
        })),

      incrementUnread: (chatId) =>
        set((state) => ({
          unreadCounts: {
            ...state.unreadCounts,
            [chatId]: (state.unreadCounts[chatId] || 0) + 1,
          },
        })),

      clearUnread: (chatId) =>
        set((state) => ({
          unreadCounts: {
            ...state.unreadCounts,
            [chatId]: 0,
          },
        })),

      // ✅ Computed value: total unread count
      get totalUnread() {
        const counts = get().unreadCounts;
        return Object.values(counts).reduce((sum, count) => sum + count, 0);
      },

      // ✅ Theme management
      setTheme: (theme) => {
        set({ theme });
        if (theme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      },

      initTheme: () => {
        const theme = get().theme;
        if (theme === "dark") {
          document.documentElement.classList.add("dark");
        }
      },
    }),
    {
      name: "chat-store",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        theme: state.theme,
      }),
    }
  )
);
