import React from "react";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";
import { Home, Users, Package, UserCircle, Briefcase, Settings, Plus } from "lucide-react";

interface LiquidGlassProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export const LiquidGlass: React.FC<LiquidGlassProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: "home", icon: <Home size={20} />, label: "Home" },
    { id: "students", icon: <Users size={20} />, label: "Students" },
    { id: "stock", icon: <Package size={20} />, label: "Stock" },
    { id: "clients", icon: <UserCircle size={20} />, label: "Clients" },
    { id: "works", icon: <Briefcase size={20} />, label: "Works" },
    { id: "settings", icon: <Settings size={20} />, label: "Settings" },
  ];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')" }}>
      {/* SVG Filter for Liquid Effect */}
      <svg className="hidden">
        <defs>
          <filter id="liquid-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Main Content Area */}
      <div className="flex-1 w-full flex items-center justify-center">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="clay-button w-20 h-20 rounded-full flex items-center justify-center bg-red-500 clay-red text-white"
        >
          <Plus size={32} />
        </motion.button>
      </div>

      {/* Liquid Glass Dock */}
      <div className="liquid-glass-container mb-12">
        <div className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-xl rounded-[40px] border border-white/20 shadow-2xl">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab?.(tab.id)}
              whileHover={{ y: -5 }}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                activeTab === tab.id ? "bg-white text-black shadow-lg" : "text-white/70 hover:text-white hover:bg-white/10"
              )}
            >
              {tab.icon}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};
