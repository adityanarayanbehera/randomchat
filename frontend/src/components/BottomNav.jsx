// frontend/src/components/BottomNav.jsx
import { useNavigate } from "react-router-dom";
import { Home, Users, CreditCard, User as UserIcon } from "lucide-react";

export default function BottomNav({ active }) {
  const navigate = useNavigate();

  const tabs = [
    { id: "home", icon: Home, label: "Home", path: "/dashboard" },
    { id: "friends", icon: Users, label: "Friends", path: "/friends" },
    {
      id: "subscription",
      icon: CreditCard,
      label: "Premium",
      path: "/subscription",
    },
    { id: "profile", icon: UserIcon, label: "Profile", path: "/profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 dark:bg-gray-900 border-t border-gray-700 shadow-lg z-50">
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center py-3 px-6 transition ${
                isActive ? "text-blue-400" : "text-gray-400 hover:text-gray-300"
              }`}
            >
              <Icon size={24} className={isActive ? "animate-pulse" : ""} />
              <span className="text-xs mt-1 font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
