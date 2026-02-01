
import { useEffect, useState } from 'react';
import {
    TrendingUp,
    BarChart3,
    LineChart,
    Layers,
    Zap,
    Download,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart as ReBarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    CartesianGrid
} from 'recharts';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import axios from 'axios';
import { Sidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

import { MultiStepLoader } from '@/components/ui/loader';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const InsightsVault = () => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState('insights');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [frequency, setFrequency] = useState('M');
    const [chartType, setChartType] = useState<'line' | 'bar'>('line');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);

    const fetchAggregateData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/analytics/aggregate`, {
                headers: { 'user-id': user.uid, 'frequency': frequency },
                params: { frequency }
            });
            setData(res.data);
            setError(null);
        } catch (err: any) {
            console.error("Aggregation Fetch Error:", err);
            setError("Failed to synchronize intelligence layer.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAggregateData();
    }, [frequency, user]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val);
    };

    const freqLabels: Record<string, string> = { 'W': 'Weekly', 'M': 'Monthly', 'Y': 'Yearly' };

    if (loading && !data) {
        return (
            <div className="flex h-screen bg-slate-50 dark:bg-[#020617] items-center justify-center">
                <MultiStepLoader
                    loadingStates={[
                        { text: "Aggregating Global Metrics..." },
                        { text: "Simulating Growth Vectors..." },
                        { text: "Calibrating Neural Models..." }
                    ]}
                />
            </div>
        );
    }

    const { metrics = {}, chart_data = [], ai_synthesis = {}, column_mapping = {} } = data || {};

    return (
        <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#020617] text-slate-900 dark:text-slate-100 font-sans overflow-hidden">
            <Sidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
            />

            <main className={cn(
                "flex-1 overflow-y-auto relative p-4 sm:p-6 lg:p-12 transition-all duration-300",
                isCollapsed ? "lg:ml-20" : "lg:ml-64"
            )}>
                {/* Header */}
                <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-outfit font-black text-slate-900 dark:text-white tracking-tighter uppercase flex items-center gap-3 sm:gap-4">
                            <Layers className="w-8 h-8 sm:w-12 sm:h-12 text-indigo-600 dark:text-indigo-400" />
                            Intelligence Lab
                        </h1>
                        <p className="text-slate-400 dark:text-slate-500 font-bold mt-2 uppercase tracking-[0.2em] text-[10px] sm:text-xs">
                            System-wide aggregation • {freqLabels[frequency]} Cycle
                        </p>
                    </div>

                    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        {['W', 'M', 'Y'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFrequency(f)}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${frequency === f
                                    ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xl'
                                    : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                            >
                                {freqLabels[f]}
                            </button>
                        ))}
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="mb-8 p-4 sm:p-6 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-2xl sm:rounded-[2rem] flex items-center gap-4 font-bold uppercase text-[10px] sm:text-xs tracking-widest"
                        >
                            <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
                    <KPICard
                        theme={theme}
                        title={`Revenue Synthesis`}
                        value={formatCurrency(metrics.total_revenue || 0)}
                        icon={<TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />}
                        trend={metrics.growth ? `${metrics.growth}%` : 'Stable'}
                        isPositive={(metrics.growth || 0) >= 0}
                        delay={0.1}
                    />
                    <KPICard
                        theme={theme}
                        title={`Profit Architecture`}
                        value={formatCurrency(metrics.total_profit || 0)}
                        icon={<Activity className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500" />}
                        trend={metrics.growth ? `${metrics.growth}%` : 'Stable'}
                        isPositive={(metrics.growth || 0) >= 0}
                        delay={0.2}
                    />
                    <KPICard
                        theme={theme}
                        title="Efficiency Score"
                        value={`${metrics.efficiency || 0}%`}
                        icon={<Zap className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />}
                        trend="Margin"
                        isPositive={true}
                        delay={0.3}
                    />
                    <KPICard
                        theme={theme}
                        title="AI Projection"
                        value={formatCurrency(metrics.projection || 0)}
                        icon={<Target className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500" />}
                        trend={`Next Cycle`}
                        isPositive={true}
                        delay={0.4}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                    {/* Main Chart */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-2xl sm:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group transition-all hover:shadow-2xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-10 relative z-10 gap-4">
                            <div>
                                <h3 className="text-xl sm:text-2xl font-outfit font-black text-slate-900 dark:text-white uppercase tracking-tight transition-colors">Performance Synthesis</h3>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1 sm:mt-2">Temporal Data Stream Mapping</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setChartType('line')}
                                    className={`p-3 rounded-2xl border transition-all ${chartType === 'line' ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-400 dark:hover:border-indigo-500'}`}
                                >
                                    <LineChart className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setChartType('bar')}
                                    className={`p-3 rounded-2xl border transition-all ${chartType === 'bar' ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-400 dark:hover:border-indigo-500'}`}
                                >
                                    <BarChart3 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="h-[300px] sm:h-[450px] w-full mt-6">
                            <ResponsiveContainer width="100%" height="100%">
                                {chartType === 'line' ? (
                                    <AreaChart data={chart_data}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                                        <XAxis
                                            dataKey="index"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 700 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 700 }}
                                            tickFormatter={(val) => `₹${val / 1000}k`}
                                        />
                                        <Tooltip content={<CustomTooltip theme={theme} />} />
                                        <Area
                                            type="monotone"
                                            dataKey={column_mapping.revenue || 'revenue'}
                                            stroke="#4f46e5"
                                            strokeWidth={5}
                                            fillOpacity={1}
                                            fill="url(#colorValue)"
                                            animationDuration={2000}
                                        />
                                        {column_mapping.profit && (
                                            <Area
                                                type="monotone"
                                                dataKey={column_mapping.profit}
                                                stroke="#10b981"
                                                strokeWidth={3}
                                                strokeDasharray="5 5"
                                                fill="transparent"
                                                animationDuration={2500}
                                            />
                                        )}
                                    </AreaChart>
                                ) : (
                                    <ReBarChart data={chart_data}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                                        <XAxis dataKey="index" axisLine={false} tickLine={false} tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 700 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 700 }} tickFormatter={(val) => `₹${val / 1000}k`} />
                                        <Tooltip content={<CustomTooltip theme={theme} />} />
                                        <Bar dataKey={column_mapping.revenue || 'revenue'} fill="#4f46e5" radius={[10, 10, 0, 0]} barSize={20} />
                                        <Bar dataKey={column_mapping.profit || 'profit'} fill="#10b981" radius={[10, 10, 0, 0]} barSize={20} />
                                    </ReBarChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* AI Insights Panel */}
                    <div className="bg-slate-900 rounded-3xl sm:rounded-[3rem] p-6 sm:p-10 text-white relative overflow-hidden shadow-2xl transition-all hover:scale-[1.01]">
                        <div className="absolute top-0 right-0 w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-indigo-500/10 blur-[80px] sm:blur-[120px] rounded-full -mr-20 sm:-mr-40 -mt-20 sm:-mt-40 animate-pulse"></div>

                        <div className="relative z-10 h-full flex flex-col">
                            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-10">
                                <div className="p-3 sm:p-4 bg-white/10 rounded-xl sm:rounded-[1.5rem] backdrop-blur-xl border border-white/10">
                                    <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl sm:text-2xl font-outfit font-black uppercase tracking-tight">AI Narrative</h3>
                                    <p className="text-[9px] sm:text-[10px] text-indigo-300 font-black uppercase tracking-[0.3em] opacity-80">Synchronized Synthesis Core</p>
                                </div>
                            </div>

                            <div className="space-y-8 flex-1">
                                <p className="text-slate-300 text-lg leading-relaxed font-medium border-l-4 border-indigo-500/30 pl-6 py-2 transition-colors hover:text-white">
                                    {ai_synthesis.executive_summary || "Scanning unified data shards for pattern extraction..."}
                                </p>

                                <div className="pt-10 border-t border-white/5 space-y-6">
                                    {ai_synthesis.insights?.slice(0, 4).map((insight: any, i: number) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.5 + (i * 0.1) }}
                                            className="flex items-start gap-6 p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:bg-white/10 transition-all group cursor-default"
                                        >
                                            <div className={`mt-1.5 w-3 h-3 rounded-full flex-shrink-0 ${insight.sentiment === 'positive' ? 'bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)]' : 'bg-rose-400 shadow-[0_0_15px_rgba(251,113,133,0.6)]'}`}></div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">{insight.metric}</p>
                                                <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{insight.narrative}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Profit & Loss Section */}
                <section className="mt-12 bg-white dark:bg-slate-900/40 p-6 sm:p-10 rounded-3xl sm:rounded-[4rem] border border-slate-200/50 dark:border-slate-800 shadow-sm transition-all overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full -ml-32 -mt-32"></div>

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 sm:mb-10 gap-6 relative z-10">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-outfit font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3 sm:gap-4 transition-colors">
                                <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600 dark:text-indigo-400" />
                                Growth Architecture
                            </h2>
                            <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1 sm:mt-2">Comparative Intelligence Ledger</p>
                        </div>

                        <div className="flex gap-2">
                            <button className="flex items-center gap-3 px-8 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm">
                                <Download className="w-4 h-4" /> EXPORT REPORT
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 relative z-10">
                        <div className="lg:col-span-1 space-y-8">
                            <div className="p-8 bg-slate-900 dark:bg-black rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 animate-pulse"></div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-8">Efficiency Core</h4>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 transition-all hover:bg-white/10">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Compared to Prev</span>
                                            <span className="text-lg font-black text-white mt-1">{metrics.growth || 0}%</span>
                                        </div>
                                        <div className={`p-3 rounded-xl ${(metrics.growth || 0) >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                            <Activity className="w-5 h-5" />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 transition-all hover:bg-white/10">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Burn Efficiency</span>
                                            <span className="text-lg font-black text-white mt-1">{metrics.efficiency || 0}%</span>
                                        </div>
                                        <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400">
                                            <Zap className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-all">
                            <div className="px-10 py-6 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Temporal Performance Matrix</span>
                                <span className="text-[10px] px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full font-black uppercase tracking-widest">Live Sync</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/30 dark:bg-slate-800/20">
                                            <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">Timeline</th>
                                            <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 text-right">Revenue</th>
                                            <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 text-right">Expenses</th>
                                            <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 text-right">Alpha</th>
                                            <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                        {chart_data.map((row: any, i: number) => (
                                            <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-indigo-900/5 transition-all group">
                                                <td className="px-10 py-6 text-xs font-black text-slate-900 dark:text-white font-mono tracking-tight group-hover:translate-x-2 transition-transform">{row.index}</td>
                                                <td className="px-10 py-6 text-sm font-bold text-slate-600 dark:text-slate-300 text-right">{formatCurrency(row[column_mapping.revenue || 'revenue'] || 0)}</td>
                                                <td className="px-10 py-6 text-sm font-bold text-slate-600 dark:text-slate-300 text-right">{formatCurrency(row[column_mapping.expenses || 'expenses'] || 0)}</td>
                                                <td className={`px-10 py-6 text-sm font-black text-right ${row[column_mapping.profit || 'profit'] >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                                                    {formatCurrency(row[column_mapping.profit || 'profit'] || 0)}
                                                </td>
                                                <td className="px-10 py-6 text-center">
                                                    <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${row[column_mapping.profit || 'profit'] >= 0
                                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'
                                                        : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800'
                                                        }`}>
                                                        {row[column_mapping.profit || 'profit'] >= 0 ? 'NOMINAL' : 'VARIOUS'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 dark:bg-black border border-white/10 p-6 rounded-[2rem] shadow-2xl backdrop-blur-2xl">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">{label}</p>
                <div className="space-y-3">
                    {payload.map((p: any, i: number) => (
                        <div key={i} className="flex items-center justify-between gap-10">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{p.name}:</span>
                            <span className="text-sm font-black text-white">₹{(p.value / 1000).toFixed(1)}k</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const KPICard = ({ title, value, icon, trend, isPositive, delay }: any) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-2xl hover:-translate-y-1 transition-all relative overflow-hidden"
    >
        <div className="absolute top-0 right-0 w-32 sm:w-40 h-32 sm:h-40 bg-slate-50 dark:bg-slate-800 rounded-full -mr-16 sm:-mr-20 -mt-16 sm:-mt-20 group-hover:scale-110 transition-transform opacity-50"></div>
        <div className="flex items-start justify-between relative z-10">
            <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800 rounded-xl sm:rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all border border-transparent shadow-sm">
                {icon}
            </div>
            <div className={`flex items-center gap-1.5 text-[9px] sm:text-[10px] font-black tracking-widest uppercase px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl border transition-colors ${isPositive ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800'}`}>
                {isPositive ? <ArrowUpRight className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> : <ArrowDownRight className="w-3 sm:w-3.5 h-3 sm:h-3.5" />}
                {trend}
            </div>
        </div>
        <div className="mt-6 sm:mt-8 relative z-10 transition-colors">
            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-1 sm:mb-2">{title}</p>
            <p className="text-2xl sm:text-3xl font-outfit font-black text-slate-900 dark:text-white tracking-tighter transition-colors">{value}</p>
        </div>
    </motion.div>
);

export default InsightsVault;
