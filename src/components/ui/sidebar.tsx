"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    LogOut,
    LayoutDashboard,
    Layers,
    UploadCloud,
    Menu,
    X,
    User as UserIcon
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { auth } from "@/lib/firebase";

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const AnimatedMenuToggle = ({
    toggle,
    isOpen,
}: {
    toggle: () => void;
    isOpen: boolean;
}) => (
    <button
        onClick={toggle}
        aria-label="Toggle menu"
        className="focus:outline-none z-[100] p-2 bg-white rounded-xl shadow-sm border border-slate-200 lg:hidden"
    >
        {isOpen ? <X className="w-5 h-5 text-slate-600" /> : <Menu className="w-5 h-5 text-slate-600" />}
    </button>
);

const Sidebar = ({ activeTab, setActiveTab }: SidebarProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const { user } = useAuth();

    const handleLogout = () => auth.signOut();

    const menuItems = [
        { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
        { id: 'reports', label: 'Archives', icon: <Layers className="w-5 h-5" /> },
        { id: 'upload', label: 'Upload', icon: <UploadCloud className="w-5 h-5" /> },
    ];

    const mobileSidebarVariants = {
        hidden: { x: "-100%", opacity: 0 },
        visible: { x: 0, opacity: 1 },
    };

    return (
        <>
            {/* Mobile Toggle Button */}
            <div className="lg:hidden fixed top-4 right-4 z-[100]">
                <AnimatedMenuToggle toggle={() => setIsOpen(!isOpen)} isOpen={isOpen} />
            </div>

            {/* Mobile Sidebar */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
                        />
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            variants={mobileSidebarVariants}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl flex flex-col"
                        >
                            <SidebarContent
                                user={user}
                                activeTab={activeTab}
                                setActiveTab={(tab) => { setActiveTab(tab); setIsOpen(false); }}
                                menuItems={menuItems}
                                onLogout={handleLogout}
                            />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <div className="hidden lg:flex flex-col fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 shadow-sm z-30">
                <SidebarContent
                    user={user}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    menuItems={menuItems}
                    onLogout={handleLogout}
                />
            </div>
        </>
    );
};

const SidebarContent = ({ user, activeTab, setActiveTab, menuItems, onLogout }: {
    user: any;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    menuItems: any[];
    onLogout: () => void;
}) => (
    <div className="flex flex-col h-full py-6">
        {/* Profile Section */}
        <div className="px-6 mb-8">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-12 h-12 rounded-full ring-2 ring-indigo-500/20" />
                ) : (
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                        <UserIcon className="w-6 h-6" />
                    </div>
                )}
                <div className="min-w-0">
                    <p className="font-poppins font-bold text-slate-900 truncate">{user?.displayName || 'User Session'}</p>
                    <p className="text-xs font-medium text-slate-500 truncate">{user?.email || 'authenticated'}</p>
                </div>
            </div>
        </div>

        {/* Brand Section */}
        <div className="px-8 mb-8 pb-4 border-b border-slate-50">
            <div className="flex items-center gap-3 italic">
                                <span className="font-poppins font-black text-xl tracking-tighter text-slate-900 uppercase">Insightra</span>
               

            </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1">
            {menuItems.map((item: any) => (
                <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`
            flex items-center gap-4 w-full px-5 py-4 rounded-2xl transition-all font-bold uppercase tracking-widest text-[10px]
            ${activeTab === item.id
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                            : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-50'}
          `}
                >
                    {item.icon}
                    <span>{item.label}</span>
                </button>
            ))}
        </nav>

        {/* Footer / Sign Out */}
        <div className="px-4 pt-4 border-t border-slate-100">
            <button
                onClick={onLogout}
                className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all font-bold uppercase tracking-widest text-[10px]"
            >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
            </button>
        </div>
    </div>
);

export { Sidebar };
