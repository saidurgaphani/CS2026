
import React, { useState, useEffect, useMemo } from 'react';
import {
    Search,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    ChevronLeft,
    Share2,
    Package,
    ArrowUpRight,
    Target,
    Briefcase,
    CheckCircle2,
    IndianRupee,
    Star,
    UploadCloud,
    FileText,
    Zap,
    Trash2,
    Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import axios from 'axios';
import { Sidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';

import { MultiStepLoader } from '@/components/ui/loader';

/* --- Constants --- */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const DEPARTMENTS = ['Sales', 'Marketing', 'Finance', 'HR'];
const REGIONS = ['North', 'South', 'East', 'West'];
const RATINGS = ['Excellent', 'Good', 'Average', 'Poor'];

const CHART_COLORS = ['#6366F1', '#F43F5E', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6'];

/* --- Shared Types --- */

interface Insight {
    metric: string;
    value: string;
    change: string;
    sentiment: string;
    narrative: string;
}

interface Report {
    id: string;
    status: string;
    title: string;
    executive_summary: string;
    insights: Insight[];
    cleaned_data?: any[];
    created_at: string;
    file_name: string;
}

/* --- Main Dashboard --- */

const Dashboard = () => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const [reports, setReports] = useState<Report[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Filters
    const [deptFilter, setDeptFilter] = useState('All');
    const [regionFilter, setRegionFilter] = useState('All');
    const [ratingFilter, setRatingFilter] = useState('All');

    // Fetch User Reports
    const fetchReports = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            setErrorMsg(null);
            const res = await axios.get(`${API_BASE}/reports`, {
                headers: { 'user-id': user.uid },
                timeout: 60000
            });
            setReports(res.data);
            if (res.data.length > 0 && !selectedReport) {
                setSelectedReport(res.data[0]);
            }
        } catch (err: any) {
            console.error("Fetch Error:", err);
            const detail = err.response?.data?.detail || err.message || "Network Error";
            setErrorMsg(`Archive link failed: ${detail}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [user]);

    const handleDeleteReport = async (e: React.MouseEvent, reportId: string) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to permanently delete this signal? This cannot be undone.")) return;

        try {
            await axios.delete(`${API_BASE}/reports/${reportId}`);
            setReports(prev => prev.filter(r => r.id !== reportId));
            if (selectedReport?.id === reportId) {
                // Determine the next report to select, if any
                // Since state updates are async, we use the previous list filtered
                const remaining = reports.filter(r => r.id !== reportId);
                setSelectedReport(remaining.length > 0 ? remaining[0] : null);
            }
            alert("Signal Archive Permanently Deleted from Database.");
        } catch (err: any) {
            console.error("Delete Error:", err);
            setErrorMsg("Failed to terminate signal archive.");
        }
    };

    // Botpress Chatbot Visibility Control
    useEffect(() => {
        const toggleBotpress = (show: boolean) => {
            try {
                const bp = (window as any).botpress;
                if (bp && typeof bp.show === 'function' && typeof bp.hide === 'function') {
                    if (show) bp.show();
                    else bp.hide();
                }

                const bpContainer = document.getElementById('bp-webchat-container') ||
                    document.getElementById('botpress-webchat') ||
                    document.querySelector('.bp-widget-widget') as HTMLElement;
                if (bpContainer) {
                    bpContainer.style.setProperty('display', show ? 'block' : 'none', 'important');
                }
            } catch (err) {
                console.warn("Botpress toggle failed:", err);
            }
        };

        const timer = setTimeout(() => toggleBotpress(true), 500);

        return () => {
            clearTimeout(timer);
            toggleBotpress(false);
        };
    }, []);


    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && user) {
            const file = e.target.files[0];
            setIsUploading(true);
            setErrorMsg(null);

            const formData = new FormData();
            formData.append('file', file);
            formData.append('title', file.name.split('.')[0]);
            formData.append('domain', 'Business');

            try {
                setIsGenerating(true);
                const res = await axios.post(`${API_BASE}/upload`, formData, {
                    headers: {
                        'user-id': user.uid,
                        'Content-Type': 'multipart/form-data'
                    },
                    timeout: 60000
                });

                setReports(prev => [res.data, ...prev]);
                setSelectedReport(res.data);
                setIsGenerating(false);
                setIsUploading(false);
                setActiveTab('dashboard');
            } catch (err: any) {
                console.error("Upload Error Details:", err);
                setIsUploading(false);
                setIsGenerating(false);

                const detail = err.response?.data?.detail || err.message;
                if (err.code === 'ECONNABORTED') {
                    setErrorMsg("Analysis timed out. The AI engine is still warming up.");
                } else if (!err.response) {
                    setErrorMsg(`Network error: Could not reach ${API_BASE}. Check your connection.`);
                } else {
                    setErrorMsg(`Generation failed: ${detail}`);
                }
            }
        }
    };

    /* --- Data Processing Layer --- */

    const currentData = useMemo(() => {
        return selectedReport?.cleaned_data || [];
    }, [selectedReport]);

    const availableColumns = useMemo(() => {
        if (currentData.length === 0) return [];
        return Object.keys(currentData[0]);
    }, [currentData]);

    const findCol = (choices: string[]) =>
        availableColumns.find(c => choices.some(choice => c.toLowerCase().includes(choice)));

    const revCol = findCol(['revenue', 'sales', 'amount', 'price']);
    const profitCol = findCol(['profit', 'margin', 'gain']);
    const unitCol = findCol(['unit', 'quantity', 'count', 'sold']);
    const expCol = findCol(['expense', 'cost', 'spend', 'tax']);
    const dateCol = findCol(['date', 'time', 'day', 'created']);
    const deptCol = findCol(['dept', 'department', 'org', 'team']);
    const regionCol = findCol(['region', 'area', 'location', 'zone']);
    const ratingCol = findCol(['rating', 'performance', 'score', 'status']);

    const filteredData = useMemo(() => {
        let docs = currentData;
        if (searchTerm) {
            const lowSearch = searchTerm.toLowerCase();
            docs = docs.filter(item =>
                Object.values(item).some(val => String(val).toLowerCase().includes(lowSearch))
            );
        }
        if (deptCol && deptFilter !== 'All') {
            docs = docs.filter(item => String(item[deptCol]) === deptFilter);
        }
        if (regionCol && regionFilter !== 'All') {
            docs = docs.filter(item => String(item[regionCol]) === regionFilter);
        }
        if (ratingCol && ratingFilter !== 'All') {
            docs = docs.filter(item => String(item[ratingCol]) === ratingFilter);
        }
        return docs;
    }, [currentData, searchTerm, deptFilter, regionFilter, ratingFilter, deptCol, regionCol, ratingCol]);

    const stats = useMemo(() => {
        if (filteredData.length === 0) return null;
        const sum = (col?: string) => col ? filteredData.reduce((acc, curr) => acc + (Number(curr[col]) || 0), 0) : 0;

        let topRating = 'Good';
        if (ratingCol) {
            const counts = filteredData.reduce((acc: any, curr) => {
                const r = String(curr[ratingCol]);
                acc[r] = (acc[r] || 0) + 1;
                return acc;
            }, {});
            topRating = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, 'Excellent');
        }

        return {
            totalRevenue: sum(revCol),
            totalProfit: sum(profitCol),
            totalExpenses: sum(expCol),
            totalUnits: sum(unitCol),
            topRating
        };
    }, [filteredData, revCol, profitCol, unitCol, expCol, ratingCol]);

    /* --- Chart Data Generators --- */

    const barChartData = useMemo(() => {
        if (filteredData.length === 0 || !dateCol) return [];
        const grouped = filteredData.reduce((acc: any, curr) => {
            const date = String(curr[dateCol] || 'N/A').split(' ')[0];
            if (!acc[date]) acc[date] = { date, revenue: 0, expenses: 0 };
            if (revCol) acc[date].revenue += Number(curr[revCol]) || 0;
            if (expCol) acc[date].expenses += Number(curr[expCol]) || 0;
            return acc;
        }, {});
        return Object.values(grouped).slice(-10);
    }, [filteredData, dateCol, revCol, expCol]);

    const lineChartData = useMemo(() => {
        if (filteredData.length === 0) return [];
        return filteredData.slice(0, 20).map((d, i) => ({
            name: i,
            profit: Number(profitCol ? d[profitCol] : 0) || 0
        })).reverse();
    }, [filteredData, profitCol]);

    const deptPieData = useMemo(() => {
        const col = deptCol || availableColumns[0];
        if (!col || filteredData.length === 0) return [];
        const grouped = filteredData.reduce((acc: any, curr) => {
            const val = String(curr[col]);
            acc[val] = (acc[val] || 0) + 1;
            return acc;
        }, {});
        return Object.keys(grouped).map(name => ({ name, value: grouped[name] }));
    }, [filteredData, deptCol, availableColumns]);

    const regionBarData = useMemo(() => {
        const col = regionCol || availableColumns[1] || availableColumns[0];
        if (!col || filteredData.length === 0) return [];
        const grouped = filteredData.reduce((acc: any, curr) => {
            const val = String(curr[col]);
            acc[val] = (acc[val] || 0) + (revCol ? (Number(curr[revCol]) || 1) : 1);
            return acc;
        }, {});
        return Object.keys(grouped)
            .map(name => ({ name, value: grouped[name] }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [filteredData, regionCol, revCol, availableColumns]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const currentTableData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
    };

    return (
        <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#020617] text-slate-900 dark:text-slate-100 font-sans overflow-hidden">
            <Sidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
            />

            <main className={cn(
                "flex-1 overflow-y-auto relative transition-all duration-300",
                isCollapsed ? "lg:ml-20" : "lg:ml-64"
            )}>
                {/* Secondary navigation for Mobile */}
                <div className="lg:hidden p-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-2">
                        <span className="font-outfit font-black text-xl tracking-tighter text-slate-900 dark:text-white uppercase transition-colors">In<span className="text-indigo-600 dark:text-indigo-400">sight</span>ra</span>
                    </div>
                </div>

                <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-12">
                    {/* Header with Search and Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                        <div>
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-outfit font-black text-slate-900 dark:text-white tracking-tighter uppercase flex items-center gap-3 sm:gap-4">
                                <Package className="w-8 h-8 sm:w-12 sm:h-12 text-indigo-600 dark:text-indigo-400" />
                                Execution Lab
                            </h1>
                            <p className="text-slate-400 dark:text-slate-500 font-bold mt-2 uppercase tracking-[0.2em] text-[10px] sm:text-xs">
                                Signal Ingestion & Temporal Synthesis Layer
                            </p>
                        </div>

                        <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto">
                            <div className="relative group flex-1 md:flex-none">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="SEARCH SIGNALS..."
                                    className="pl-12 pr-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full md:w-80 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 font-black uppercase text-[10px] tracking-widest transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all shadow-sm shrink-0">
                                <Share2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {errorMsg && (
                        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 px-6 py-4 rounded-2xl flex items-center justify-between mb-8">
                            <span className="font-bold text-sm uppercase tracking-widest">{errorMsg}</span>
                            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-600 font-bold uppercase text-xs">Dismiss</button>
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {isLoading && (
                            <motion.div
                                key="loader"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center justify-center min-h-[60vh]"
                            >
                                <MultiStepLoader loadingStates={[{ text: "Fetching Intelligence..." }]} />
                            </motion.div>
                        )}

                        {!isLoading && activeTab === 'dashboard' && (
                            <motion.div key="dash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">

                                {/* Filters and Stats Interface */}
                                <div className="flex flex-wrap items-center gap-6">
                                    <FilterSelect icon={<Briefcase className="w-4 h-4" />} label="Department" value={deptFilter} options={DEPARTMENTS} onChange={setDeptFilter} />
                                    <FilterSelect icon={<Target className="w-4 h-4" />} label="Region" value={regionFilter} options={REGIONS} onChange={setRegionFilter} />
                                    <FilterSelect icon={<Star className="w-4 h-4" />} label="Rating" value={ratingFilter} options={RATINGS} onChange={setRatingFilter} />
                                </div>

                                {/* KPI Matrix */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
                                    <KPICard title="Revenue Cycle" value={formatCurrency(stats?.totalRevenue || 0)} trend="+14.2%" icon={<IndianRupee />} color="indigo" />
                                    <KPICard title="Net Alpha" value={formatCurrency(stats?.totalProfit || 0)} trend="+9.5%" icon={<TrendingUp />} color="emerald" positive={true} />
                                    <KPICard title="Burn Rate" value={formatCurrency(stats?.totalExpenses || 0)} trend="-3.1%" icon={<TrendingDown />} color="rose" positive={false} />
                                    <KPICard title="Units Locked" value={(stats?.totalUnits || 0).toLocaleString()} trend="+2k" icon={<Package />} color="amber" />
                                    <KPIRatingCard title="System Rating" value={stats?.topRating || 'Elite'} icon={<CheckCircle2 />} />
                                </div>

                                {/* Visual Intelligence Layer */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <ChartCard title="Revenue Stream" subtitle="Neural Revenue vs Expense Projection">
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={barChartData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10 }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                                                <Tooltip cursor={{ fill: theme === 'dark' ? '#1e293b' : '#F8FAFC' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', color: theme === 'dark' ? '#eee' : '#111' }} />
                                                <Bar dataKey="revenue" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={20} />
                                                <Bar dataKey="expenses" fill="#F43F5E" radius={[4, 4, 0, 0]} barSize={20} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartCard>

                                    <ChartCard title="Profit Trend" subtitle="Daily Profit Analysis (Dynamic Pulse)">
                                        <ResponsiveContainer width="100%" height={300}>
                                            <LineChart data={lineChartData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                                                <XAxis dataKey="name" hide />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', color: theme === 'dark' ? '#eee' : '#111' }} />
                                                <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={4} dot={{ r: 4, strokeWidth: 2, fill: theme === 'dark' ? '#0f172a' : '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </ChartCard>

                                    <ChartCard title="Dept Performance" subtitle="Resource Assignment Entropy (Top 5)">
                                        <div className="h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={deptPieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                        {deptPieData.map((_, index) => (
                                                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', color: theme === 'dark' ? '#eee' : '#111' }} />
                                                    <Legend iconType="circle" />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </ChartCard>

                                    <ChartCard title="Regional Revenue" subtitle="Descending Revenue Distribution Mapping">
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={regionBarData} layout="vertical" margin={{ left: 40 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, fontSize: 12 }} />
                                                <Tooltip cursor={{ fill: theme === 'dark' ? '#1e293b' : '#F8FAFC' }} contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', color: theme === 'dark' ? '#eee' : '#111' }} />
                                                <Bar dataKey="value" fill="#6366F1" radius={[0, 4, 4, 0]} barSize={25} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartCard>
                                </div>


                                {/* AI Narrative Banner */}
                                <div className="bg-indigo-600 dark:bg-indigo-500 rounded-3xl sm:rounded-[3rem] p-6 sm:p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-200 dark:shadow-indigo-500/20">
                                    <div className="absolute top-0 right-0 w-[20rem] sm:w-[40rem] h-[20rem] sm:h-[40rem] bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 backdrop-blur-3xl animate-pulse"></div>

                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                                            <div className="p-2 sm:p-3 bg-white/20 rounded-xl sm:rounded-2xl backdrop-blur-md">
                                                <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                                            </div>
                                            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] opacity-70">
                                                AI Synthesis Core v4.2
                                            </span>
                                        </div>

                                        <p className="text-sm sm:text-base lg:text-lg font-medium leading-relaxed max-w-4xl text-white/90">
                                            {selectedReport?.executive_summary ||
                                                "Synchronizing business signals and synthesizing data patterns into clear, executive-ready insights."}
                                        </p>
                                    </div>
                                </div>



                                {/* Detailed Data Ledger */}
                                <div className="bg-white dark:bg-slate-900 rounded-3xl sm:rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-20 text-[10px] sm:text-xs">
                                    <div className="px-6 sm:px-10 py-6 sm:py-8 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30 dark:bg-slate-800/20">
                                        <h3 className="font-outfit font-black text-lg sm:text-xl uppercase tracking-tight text-slate-900 dark:text-white">Temporal Data Ledger</h3>
                                        <span className="text-[10px] font-black text-slate-400 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-4 py-2 rounded-full uppercase tracking-widest self-start sm:self-auto">{filteredData.length} signals locked</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 text-[10px] uppercase tracking-[0.3em] font-black border-b border-slate-100 dark:border-slate-800">
                                                    <th className="px-10 py-6">Signal ID</th>
                                                    <th className="px-10 py-6">Temporal</th>
                                                    <th className="px-10 py-6">Category</th>
                                                    <th className="px-10 py-6">Zone</th>
                                                    <th className="px-10 py-6">Revenue</th>
                                                    <th className="px-10 py-6">Expenses</th>
                                                    <th className="px-10 py-6">Alpha</th>
                                                    <th className="px-10 py-6 text-center">Protocol</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-sm divide-y divide-slate-50 dark:divide-slate-800/50">
                                                {currentTableData.map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 transition-all group cursor-default">
                                                        <td className="px-10 py-6 font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter">{String(row[Object.keys(row)[0]]).slice(0, 10)}</td>
                                                        <td className="px-10 py-6 text-slate-500 dark:text-slate-400 font-medium">{String(row[dateCol || ''] || 'N/A').split(' ')[0]}</td>
                                                        <td className="px-10 py-6">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}></div>
                                                                <span className="font-bold text-slate-700 dark:text-slate-300">{String(row[deptCol || ''] || 'General')}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-6 font-bold text-slate-500 dark:text-slate-400">{String(row[regionCol || ''] || 'Global')}</td>
                                                        <td className="px-10 py-6 font-black text-slate-900 dark:text-white">{formatCurrency(Number(row[revCol || '']) || 0)}</td>
                                                        <td className="px-10 py-6 text-rose-500 font-bold">{formatCurrency(Number(row[expCol || '']) || 0)}</td>
                                                        <td className="px-10 py-6 font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(Number(row[profitCol || '']) || 0)}</td>
                                                        <td className="px-10 py-6">
                                                            <div className="flex justify-center">
                                                                <PerformanceBadge rating={String(row[ratingCol || ''] || 'Excellent')} />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="px-10 py-6 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Fragment <span className="text-slate-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> of {filteredData.length}</p>
                                        <div className="flex gap-2">
                                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 transition-all shadow-sm text-slate-400"><ChevronLeft className="w-5 h-5" /></button>
                                            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 transition-all shadow-sm text-slate-400"><ChevronRight className="w-5 h-5" /></button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {!isLoading && activeTab === 'reports' && (
                            <motion.div key="reports" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                {reports.map((r) => (
                                    <div
                                        key={r.id}
                                        onClick={() => { setSelectedReport(r); setActiveTab('dashboard') }}
                                        className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:border-indigo-500 dark:hover:border-indigo-400 hover:-translate-y-2 transition-all cursor-pointer group relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 dark:bg-slate-800 rounded-bl-full opacity-50 -mr-8 -mt-8 transition-all group-hover:bg-indigo-500/10 dark:group-hover:bg-indigo-400/10"></div>
                                        <div className="flex items-center justify-between mb-8 relative z-10">
                                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-sm text-slate-400">
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(r.created_at).toLocaleDateString()}</span>
                                                <button
                                                    onClick={(e) => handleDeleteReport(e, r.id)}
                                                    className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all"
                                                    title="Delete Signal"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <h4 className="font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 text-xl leading-tight uppercase tracking-tighter transition-colors">{r.title}</h4>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-3 uppercase font-black tracking-widest">{r.file_name}</p>
                                        <div className="mt-10 pt-8 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                                            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-full font-black uppercase tracking-widest">Signal Locked</span>
                                            <ArrowUpRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        )}

                        {!isLoading && activeTab === 'upload' && (
                            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-3xl mx-auto py-12">
                                {/* <div className="text-center mb-16">
                                    <h2 className="text-6xl font-outfit font-black text-slate-900 dark:text-white tracking-tighter uppercase">Injest Signal</h2>
                                    <p className="text-slate-400 dark:text-slate-500 font-bold mt-4 uppercase tracking-[0.3em] text-xs">Neural Architecture Discovery & Data Synthesis</p>
                                </div> */}

                                <div className={`relative border-8 border-dashed rounded-[5rem] p-32 text-center transition-all duration-1000 ${isUploading ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-400 dark:border-indigo-500 shadow-inner' : 'bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-2xl dark:shadow-indigo-500/5'}`}>
                                    {!isUploading && !isGenerating ? (
                                        <>
                                            <div className="w-32 h-32 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mx-auto mb-12 transition-all group-hover:scale-110 shadow-sm">
                                                <UploadCloud className="w-16 h-16 text-indigo-500/30 dark:text-indigo-400/30" />
                                            </div>
                                            <h3 className="text-3xl font-black mb-4 uppercase text-slate-900 dark:text-white">Deploy New Signal</h3>
                                            <p className="text-slate-400 dark:text-slate-500 text-sm mb-16 max-w-sm mx-auto font-bold uppercase tracking-tighter">CSV, JSON, and Excel architectures supported. Our AI engine reconstructs logic automatically.</p>
                                            <label className="inline-block cursor-pointer px-16 py-6 bg-slate-900 dark:bg-indigo-600 text-white rounded-full font-black text-xl uppercase tracking-[0.4em] hover:scale-105 active:scale-95 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-indigo-500/20">
                                                LOAD SIGNAL
                                                <input type="file" className="hidden" onChange={handleFileUpload} accept=".csv,.json,.xlsx,.xls" />
                                            </label>

                                            <div className="mt-12">
                                                <a
                                                    href="https://drive.google.com/drive/folders/1NILJ7yNkeq1tB_upkYX1aMyGUUxtcxMm?usp=sharing"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 uppercase tracking-[0.3em] transition-all group"
                                                >
                                                    <Download className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
                                                    DOWNLOAD SAMPLE DATASETS
                                                </a>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="py-10">
                                            <div className="w-32 h-32 border-[12px] border-indigo-100 dark:border-indigo-900/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-16 shadow-xl"></div>
                                            <h3 className="text-4xl font-black uppercase tracking-tighter animate-pulse text-indigo-900 dark:text-indigo-400 leading-none">
                                                {isGenerating ? 'Synthesizing Architecture...' : 'Parsing Signal Streams...'}
                                            </h3>
                                            <p className="text-indigo-500 dark:text-indigo-300 font-black uppercase text-[10px] tracking-[0.5em] mt-6">Neural Processing Layer Live</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

/* --- Shared Components --- */

const FilterSelect = ({ icon, label, value, options, onChange }: any) => (
    <div className="flex items-center gap-4 px-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl group hover:border-indigo-300 dark:hover:border-indigo-500 transition-all shadow-sm">
        <div className="text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 transition-colors">{icon}</div>
        <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</span>
            <select className="bg-transparent border-none outline-none text-xs font-black text-slate-700 dark:text-slate-300 cursor-pointer p-0 m-0" value={value} onChange={(e) => onChange(e.target.value)}>
                <option value="All" className="dark:bg-slate-900">All {label}s</option>
                {options.map((opt: string) => <option key={opt} value={opt} className="dark:bg-slate-900">{opt}</option>)}
            </select>
        </div>
    </div>
);

const KPICard = ({ title, value, trend, icon, color, positive = true }: any) => {
    const isIndigo = color === 'indigo';
    const isEmerald = color === 'emerald';
    const isRose = color === 'rose';

    return (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-5 dark:opacity-10 transition-opacity group-hover:opacity-10 dark:group-hover:opacity-20 ${isIndigo ? 'bg-indigo-600' : isEmerald ? 'bg-emerald-600' : isRose ? 'bg-rose-600' : 'bg-amber-600'}`}></div>
            <div className="flex items-center justify-between mb-8">
                <div className={`p-4 rounded-2xl ${isIndigo ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : isEmerald ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' : isRose ? 'bg-rose-50 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400' : 'bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'}`}>
                    {React.cloneElement(icon, { size: 24 })}
                </div>
                <div className={`flex items-center gap-1 text-[10px] font-black ${positive ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20'} px-3 py-1.5 rounded-xl border ${positive ? 'border-emerald-100 dark:border-emerald-800' : 'border-rose-100 dark:border-rose-800'}`}>
                    {trend}
                </div>
            </div>
            <span className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">{title}</span>
            <h3 className="text-3xl font-outfit font-black text-slate-900 dark:text-white tracking-tighter">{value}</h3>
        </div>
    );
};

const KPIRatingCard = ({ title, value, icon }: any) => {
    return (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all">
            <div className={`p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 w-fit mb-8`}>{icon}</div>
            <span className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">{title}</span>
            <h3 className={`text-3xl font-outfit font-black tracking-tighter ${value.includes('Excellent') || value.includes('Elite') ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>{value}</h3>
        </div>
    );
};

const ChartCard = ({ title, subtitle, children, className = "" }: any) => (
    <div className={`bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-3xl sm:rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all ${className}`}>
        <div className="mb-6 sm:mb-10">
            <h3 className="font-outfit font-black text-xl sm:text-2xl text-slate-900 dark:text-white leading-none tracking-tight uppercase">{title}</h3>
            <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 font-bold mt-2 sm:mt-3 uppercase tracking-widest">{subtitle}</p>
        </div>
        {children}
    </div>
);

const PerformanceBadge = ({ rating }: { rating: string }) => {
    const styles: any = {
        Excellent: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
        Elite: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
        Good: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
        Average: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
        Poor: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
    };
    return (
        <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${styles[rating] || styles.Excellent}`}>
            {rating}
        </span>
    );
};

export default Dashboard;
