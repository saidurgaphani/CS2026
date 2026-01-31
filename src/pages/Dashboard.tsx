
import React, { useState, useEffect, useMemo } from 'react';
import {
    Search,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    ChevronLeft,
    Download,
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
    Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/AuthContext';
import axios from 'axios';
import { Sidebar } from '@/components/ui/sidebar';
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
    const [reports, setReports] = useState<Report[]>([]);
    const [activeTab, setActiveTab] = useState('dashboard');
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
        }
    };

    useEffect(() => {
        fetchReports();
    }, [user]);

    // Botpress Chatbot Visibility Control
    useEffect(() => {
        const toggleBotpress = (show: boolean) => {
            try {
                const bp = (window as any).botpress;
                if (bp && typeof bp.show === 'function' && typeof bp.hide === 'function') {
                    if (show) bp.show();
                    else bp.hide();
                }

                // Fallback for some versions that use standard DOM hiding
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

        // Delay slightly to ensure script is ready
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

    // Revenue vs Expenses (Bar)
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

    // Profit Trend (Line)
    const lineChartData = useMemo(() => {
        if (filteredData.length === 0) return [];
        return filteredData.slice(0, 20).map((d, i) => ({
            name: i,
            profit: Number(profitCol ? d[profitCol] : 0) || 0
        })).reverse();
    }, [filteredData, profitCol]);

    // Departmental Pie
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

    // Regional Revenue (Horizontal Bar)
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

    /* --- Table Helpers --- */
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const currentTableData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
    };

    /* --- Render --- */

    return (
        <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-inter">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 overflow-y-auto relative">
                {/* Header */}
                <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-5 flex items-center justify-between z-10">
                    <div>
                        <h1 className="text-2xl font-poppins font-bold text-slate-900 tracking-tight italic uppercase">GenAI Executive Report</h1>
                        <p className="text-sm text-slate-500 font-medium">Internal Intelligence Layer v3.0</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex gap-2">
                            <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-bold transition-all text-slate-700">
                                <Download className="w-4 h-4" /> CSV
                            </button>
                            <button className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-bold transition-all text-white shadow-xl shadow-indigo-100">
                                <Share2 className="w-4 h-4" /> Share
                            </button>
                        </div>
                    </div>
                </header>

                <div className="p-8 space-y-8 max-w-7xl mx-auto">
                    {errorMsg && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-2xl flex items-center justify-between">
                            <span className="font-bold text-sm uppercase tracking-widest italic">{errorMsg}</span>
                            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-600 font-bold uppercase text-xs italic">Dismiss</button>
                        </div>
                    )}


                    {activeTab === 'dashboard' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                            {/* AI Narrative Banner */}
                            <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 backdrop-blur-3xl"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-white/20 rounded-lg">
                                            <Zap className="w-5 h-5" />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-[0.2em]">GenAI Executive Summary</span>
                                    </div>
                                    <h2 className="text-3xl font-poppins font-bold leading-tight max-w-4xl italic">
                                        "{selectedReport?.executive_summary || 'Analysis indicates consistent operational reliability but highlights a 15% increase in overhead.'}"
                                    </h2>
                                </div>
                            </div>

                            {/* Filters Section (Mirroring provided UI) */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-6">
                                <div className="relative flex-1 min-w-[300px]">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by ID or Product..."
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <FilterSelect icon={<Briefcase className="w-4 h-4" />} label="Department" value={deptFilter} options={DEPARTMENTS} onChange={setDeptFilter} />
                                <FilterSelect icon={<Target className="w-4 h-4" />} label="Region" value={regionFilter} options={REGIONS} onChange={setRegionFilter} />
                                <FilterSelect icon={<Star className="w-4 h-4" />} label="Rating" value={ratingFilter} options={RATINGS} onChange={setRatingFilter} />
                            </div>

                            {/* KPI Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                                <KPICard title="Total Revenue" value={formatCurrency(stats?.totalRevenue || 0)} trend="+12.5%" icon={<IndianRupee />} color="indigo" />
                                <KPICard title="Total Profit" value={formatCurrency(stats?.totalProfit || 0)} trend="+8.2%" icon={<TrendingUp />} color="emerald" positive={true} />
                                <KPICard title="Total Expenses" value={formatCurrency(stats?.totalExpenses || 0)} trend="-2.4%" icon={<TrendingDown />} color="rose" positive={false} />
                                <KPICard title="Units Sold" value={(stats?.totalUnits || 0).toLocaleString()} trend="+145" icon={<Package />} color="amber" />
                                <KPIRatingCard title="Overall Rating" value={stats?.topRating || 'Excellent'} icon={<CheckCircle2 />} />
                            </div>

                            {/* Main Charts Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <ChartCard title="Revenue vs Expenses" subtitle="Vertical Bar Comparison (Report Dates)">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={barChartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                                            <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                            <Bar dataKey="revenue" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={20} />
                                            <Bar dataKey="expenses" fill="#F43F5E" radius={[4, 4, 0, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartCard>

                                <ChartCard title="Profit Trend" subtitle="Daily Profit Analysis (Dynamic Pulse)">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <LineChart data={lineChartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" hide />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                            <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={4} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </ChartCard>
                            </div>

                            {/* Secondary Charts Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <ChartCard title="Departmental Breakdown" subtitle="Distribution by Class" className="lg:col-span-1">
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={deptPieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                    {deptPieData.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend iconType="circle" />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </ChartCard>

                                <ChartCard title="Regional Revenue" subtitle="Descending Revenue Distribution" className="lg:col-span-2">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={regionBarData} layout="vertical" margin={{ left: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 700, fontSize: 12 }} />
                                            <Tooltip cursor={{ fill: '#F8FAFC' }} />
                                            <Bar dataKey="value" fill="#6366F1" radius={[0, 4, 4, 0]} barSize={25} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartCard>
                            </div>

                            {/* Detailed Data Table */}
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-20">
                                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                                    <h3 className="font-poppins font-bold text-lg uppercase tracking-tight italic">Detailed Report Data</h3>
                                    <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full uppercase tracking-widest">{filteredData.length} signals found</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black border-b border-slate-100 italic">
                                                <th className="px-8 py-5">Signal ID</th>
                                                <th className="px-8 py-5">Temporal</th>
                                                <th className="px-8 py-5">Category</th>
                                                <th className="px-8 py-5">Zone</th>
                                                <th className="px-8 py-5">Revenue</th>
                                                <th className="px-8 py-5">Expenses</th>
                                                <th className="px-8 py-5">Profit</th>
                                                <th className="px-8 py-5 text-center">Rating</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm divide-y divide-slate-50">
                                            {currentTableData.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-indigo-50/20 transition-all group cursor-default">
                                                    <td className="px-8 py-5 font-bold text-indigo-600 uppercase tracking-tighter">{String(row[Object.keys(row)[0]]).slice(0, 10)}</td>
                                                    <td className="px-8 py-5 text-slate-500 font-medium italic">{String(row[dateCol || ''] || 'N/A').split(' ')[0]}</td>
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}></div>
                                                            <span className="font-bold text-slate-700">{String(row[deptCol || ''] || 'General')}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5 font-bold text-slate-500">{String(row[regionCol || ''] || 'Global')}</td>
                                                    <td className="px-8 py-5 font-black text-slate-900">{formatCurrency(Number(row[revCol || '']) || 0)}</td>
                                                    <td className="px-8 py-5 text-rose-500 font-bold">{formatCurrency(Number(row[expCol || '']) || 0)}</td>
                                                    <td className="px-8 py-5 font-black text-emerald-600">{formatCurrency(Number(row[profitCol || '']) || 0)}</td>
                                                    <td className="px-8 py-5">
                                                        <div className="flex justify-center">
                                                            <PerformanceBadge rating={String(row[ratingCol || ''] || 'Excellent')} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Pagination */}
                                <div className="px-8 py-5 bg-slate-50/50 flex items-center justify-between border-t border-slate-100">
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest italic">Showing <span className="text-slate-900">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> of {filteredData.length}</p>
                                    <div className="flex gap-2">
                                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"><ChevronLeft className="w-4 h-4" /></button>
                                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"><ChevronRight className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'reports' && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {reports.map((r) => (
                                <div
                                    key={r.id}
                                    onClick={() => { setSelectedReport(r); setActiveTab('dashboard') }}
                                    className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:border-indigo-500 hover:-translate-y-2 transition-all cursor-pointer group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-full opacity-50 -mr-8 -mt-8 transition-all group-hover:bg-indigo-500/10"></div>
                                    <div className="flex items-center justify-between mb-6 relative z-10">
                                        <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(r.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <h4 className="font-black text-slate-900 group-hover:text-indigo-600 text-lg leading-tight uppercase tracking-tighter italic">{r.title}</h4>
                                    <p className="text-[10px] text-slate-400 mt-2 uppercase font-black tracking-widest italic">{r.file_name}</p>
                                    <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                                        <span className="text-[10px] bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full font-black uppercase tracking-widest">Signal Locked</span>
                                        <ArrowUpRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {activeTab === 'upload' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto py-12">
                            <div className="text-center mb-16">
                                <h2 className="text-5xl font-poppins font-black text-slate-900 tracking-tighter italic uppercase">Injest Signal</h2>
                                <p className="text-slate-400 font-bold mt-4 uppercase tracking-widest text-xs italic">GenAI-Powered Structure Discovery & Synthesis</p>
                            </div>

                            <div className={`relative border-4 border-dashed rounded-[4rem] p-24 text-center transition-all duration-700 ${isUploading ? 'bg-indigo-50 border-indigo-400' : 'bg-white border-slate-100 hover:border-indigo-400 shadow-2xl shadow-indigo-100'}`}>
                                {!isUploading && !isGenerating ? (
                                    <>
                                        <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-10">
                                            <UploadCloud className="w-12 h-12 text-indigo-500 opacity-30" />
                                        </div>
                                        <h3 className="text-2xl font-black mb-4 uppercase italic">Deploy New Signal</h3>
                                        <p className="text-slate-400 text-sm mb-12 max-w-sm mx-auto font-bold uppercase tracking-tighter italic">CSV, JSON, and Excel. The AI Architect will reconstruct business logic automatically.</p>
                                        <label className="inline-block cursor-pointer px-12 py-5 bg-slate-900 text-white rounded-full font-black text-lg uppercase tracking-[0.3em] hover:scale-[1.05] active:scale-95 transition-all shadow-xl">
                                            LOAD SIGNAL
                                            <input type="file" className="hidden" onChange={handleFileUpload} accept=".csv,.json,.xlsx,.xls" />
                                        </label>
                                    </>
                                ) : (
                                    <div className="py-10">
                                        <div className="w-24 h-24 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-12"></div>
                                        <h3 className="text-3xl font-black italic uppercase tracking-tighter animate-pulse text-indigo-900">
                                            {isGenerating ? 'Synthesizing Architecture...' : 'Parsing Signal Streams...'}
                                        </h3>
                                        <p className="text-indigo-500 font-black uppercase text-[10px] tracking-[0.4em] mt-4 italic">Neural Processing Layer Live</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </div>
            </main>
        </div>
    );
};

/* --- Modern Components --- */

const FilterSelect = ({ icon, label, value, options, onChange }: any) => (
    <div className="flex items-center gap-3 px-5 py-3 bg-slate-50 border border-slate-200 rounded-[1.25rem] group hover:border-indigo-300 transition-all">
        <div className="text-slate-400 group-hover:text-indigo-500 transition-colors">{icon}</div>
        <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
            <select className="bg-transparent border-none outline-none text-xs font-black text-slate-700 cursor-pointer p-0 m-0" value={value} onChange={(e) => onChange(e.target.value)}>
                <option value="All">All {label}s</option>
                {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
    </div>
);

const KPICard = ({ title, value, trend, icon, color, positive = true }: any) => {
    const isIndigo = color === 'indigo';
    const isEmerald = color === 'emerald';
    const isRose = color === 'rose';

    return (
        <div className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-5 transition-opacity group-hover:opacity-10 ${isIndigo ? 'bg-indigo-600' : isEmerald ? 'bg-emerald-600' : isRose ? 'bg-rose-600' : 'bg-amber-600'}`}></div>
            <div className="flex items-center justify-between mb-8">
                <div className={`p-4 rounded-[1.25rem] ${isIndigo ? 'bg-indigo-50 text-indigo-600' : isEmerald ? 'bg-emerald-50 text-emerald-600' : isRose ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                    {React.cloneElement(icon, { size: 24 })}
                </div>
                <div className={`flex items-center gap-1 text-[10px] font-black ${positive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'} px-3 py-1.5 rounded-xl border ${positive ? 'border-emerald-100' : 'border-rose-100'}`}>
                    {trend}
                </div>
            </div>
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{title}</span>
            <h3 className="text-3xl font-poppins font-black text-slate-900 tracking-tighter italic">{value}</h3>
        </div>
    );
};

const KPIRatingCard = ({ title, value, icon }: any) => {
    return (
        <div className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm">
            <div className={`p-4 rounded-[1.25rem] bg-slate-50 text-slate-500 w-fit mb-8`}>{icon}</div>
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{title}</span>
            <h3 className={`text-3xl font-poppins font-black tracking-tighter italic ${value.includes('Excellent') ? 'text-emerald-600' : 'text-indigo-600'}`}>{value}</h3>
        </div>
    );
};

const ChartCard = ({ title, subtitle, children, className = "" }: any) => (
    <div className={`bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-lg transition-all ${className}`}>
        <div className="mb-10">
            <h3 className="font-poppins font-bold text-xl text-slate-900 leading-none tracking-tight uppercase italic">{title}</h3>
            <p className="text-xs text-slate-400 font-medium mt-3 italic">{subtitle}</p>
        </div>
        {children}
    </div>
);

const PerformanceBadge = ({ rating }: { rating: string }) => {
    const styles: any = {
        Excellent: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        Good: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        Average: 'bg-amber-100 text-amber-700 border-amber-200',
        Poor: 'bg-rose-100 text-rose-700 border-rose-200'
    };
    return (
        <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${styles[rating] || styles.Excellent}`}>
            {rating}
        </span>
    );
};

export default Dashboard;
