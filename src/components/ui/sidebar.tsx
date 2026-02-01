import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    LogOut,
    LayoutDashboard,
    Layers,
    UploadCloud,
    Menu,
    X,
    User as UserIcon,
    Zap
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
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => auth.signOut();

    const menuItems = [
        { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" />, path: '/dashboard' },
        { id: 'insights', label: 'Intelligence', icon: <Zap className="w-5 h-5 font-bold" />, path: '/insights' },
        { id: 'reports', label: 'Archives', icon: <Layers className="w-5 h-5" />, path: '/dashboard' },
        { id: 'upload', label: 'Upload Feed', icon: <UploadCloud className="w-5 h-5" />, path: '/dashboard' },
    ];

    const currentPath = location.pathname;

    const handleNav = (item: any) => {
        if (item.path !== currentPath) {
            navigate(item.path);
        }
        setActiveTab(item.id);
        setIsOpen(false);
    };

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
                                onNav={handleNav}
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
                    onNav={handleNav}
                    menuItems={menuItems}
                    onLogout={handleLogout}
                />
            </div>
        </>
    );
};

const SidebarContent = ({ user, activeTab, onNav, menuItems, onLogout }: {
    user: any;
    activeTab: string;
    onNav: (item: any) => void;
    menuItems: any[];
    onLogout: () => void;
}) => (
    <div className="flex flex-col h-full py-6">
        {/* Profile Section */}
        <div className="px-6 mb-8">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100 shadow-sm">
                {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-12 h-12 rounded-full ring-2 ring-indigo-500/10" />
                ) : (
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 border border-indigo-200 shadow-inner">
                        <UserIcon className="w-6 h-6" />
                    </div>
                )}
                <div className="min-w-0 pr-2">
                    <p className="font-poppins font-black text-slate-900 truncate text-sm tracking-tight">{user?.displayName || 'Insightra User'}</p>
                    <p className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-widest">{user?.email ? 'PRO ACCOUNT' : 'GUEST'}</p>
                </div>
            </div>
        </div>

        {/* Brand Section */}
        <div className="px-8 mb-8 pb-4 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2 italic">
                <span className="font-poppins font-black text-xl tracking-tighter text-slate-900 uppercase">
                    In<span className="text-indigo-600">sight</span>ra
                </span>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1">
            {menuItems.map((item: any) => (
                <button
                    key={item.id}
                    onClick={() => onNav(item)}
                    className={`
            flex items-center gap-4 w-full px-5 py-4 rounded-2xl transition-all font-black uppercase tracking-widest text-[10px]
            ${activeTab === item.id
                            ? 'bg-slate-900 text-white shadow-xl shadow-slate-200'
                            : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}
          `}
                >
                    <span className={`${activeTab === item.id ? 'text-indigo-400' : ''}`}>{item.icon}</span>
                    <span>{item.label}</span>
                </button>
            ))}
        </nav>

        {/* Footer / Sign Out */}
        <div className="px-4 pt-4 border-t border-slate-100">
            <button
                onClick={onLogout}
                className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all font-black uppercase tracking-widest text-[10px]"
            >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
            </button>
        </div>
    </div>
);

export { Sidebar };
