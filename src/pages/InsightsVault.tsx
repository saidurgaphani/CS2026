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
import { motion } from 'framer-motion';
import {
    BarChart as ReBarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { useAuth } from '../lib/AuthContext';
import axios from 'axios';
import { Sidebar } from '@/components/ui/sidebar';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const InsightsVault = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('insights');
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
            <div className="flex h-screen bg-slate-50 items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full"
                />
            </div>
        );
    }

    const { metrics = {}, chart_data = [], ai_synthesis = {}, column_mapping = {} } = data || {};

    return (
        <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-inter overflow-hidden">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

            <main className="flex-1 lg:ml-64 overflow-y-auto relative p-8">
                {/* Header */}
                <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-poppins font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                            <Layers className="w-10 h-10 text-indigo-600" />
                            Unified Intelligence Lab
                        </h1>
                        <p className="text-slate-500 font-medium mt-1 uppercase tracking-widest text-xs italic">
                            System-wide aggregation • {freqLabels[frequency]} Cycle
                        </p>
                    </div>

                    <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                        {['W', 'M', 'Y'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFrequency(f)}
                                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${frequency === f
                                    ? 'bg-slate-900 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                                    }`}
                            >
                                {freqLabels[f]}
                            </button>
                        ))}
                    </div>
                </header>

                {error && (
                    <div className="mb-8 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-center gap-3 font-bold uppercase text-[10px] tracking-widest italic">
                        <Zap className="w-4 h-4" />
                        {error}
                    </div>
                )}

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <KPICard
                        title={`Revenue (${freqLabels[frequency]})`}
                        value={formatCurrency(metrics.total_revenue || 0)}
                        icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
                        trend={metrics.growth ? `${metrics.growth}%` : 'Stable'}
                        isPositive={(metrics.growth || 0) >= 0}
                        delay={0.1}
                    />
                    <KPICard
                        title={`Profit (${freqLabels[frequency]})`}
                        value={formatCurrency(metrics.total_profit || 0)}
                        icon={<Activity className="w-5 h-5 text-indigo-500" />}
                        trend={metrics.growth ? `${metrics.growth}%` : 'Stable'}
                        isPositive={(metrics.growth || 0) >= 0}
                        delay={0.2}
                    />
                    <KPICard
                        title="Efficiency Score"
                        value={`${metrics.efficiency || 0}%`}
                        icon={<Zap className="w-5 h-5 text-amber-500" />}
                        trend="Margin"
                        isPositive={true}
                        delay={0.3}
                    />
                    <KPICard
                        title="AI Projection"
                        value={formatCurrency(metrics.projection || 0)}
                        icon={<Target className="w-5 h-5 text-rose-500" />}
                        trend={`Next ${frequency}`}
                        isPositive={true}
                        delay={0.4}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                    {/* Main Chart */}
                    <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <div>
                                <h3 className="text-xl font-poppins font-black text-slate-900 uppercase italic tracking-tight">Performance Synthesis</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Cross-dataset Temporal Visualization</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setChartType('line')}
                                    className={`p-2.5 rounded-xl border transition-all ${chartType === 'line' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-400'}`}
                                >
                                    <LineChart className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setChartType('bar')}
                                    className={`p-2.5 rounded-xl border transition-all ${chartType === 'bar' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-400'}`}
                                >
                                    <BarChart3 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="h-[400px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                {chartType === 'line' ? (
                                    <AreaChart data={chart_data}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis
                                            dataKey="index"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                            tickFormatter={(val) => `₹${val / 1000}k`}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area
                                            type="monotone"
                                            dataKey={column_mapping.revenue || 'revenue'}
                                            stroke="#4f46e5"
                                            strokeWidth={4}
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
                                        <XAxis dataKey="index" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey={column_mapping.revenue || 'revenue'} fill="#4f46e5" radius={[10, 10, 0, 0]} />
                                        <Bar dataKey={column_mapping.profit || 'profit'} fill="#10b981" radius={[10, 10, 0, 0]} />
                                    </ReBarChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* AI Insights Panel */}
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full -mr-20 -mt-20"></div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                                    <Zap className="w-6 h-6 text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-poppins font-black uppercase italic tracking-tight">AI Narrative</h3>
                                    <p className="text-[10px] text-indigo-300 font-black uppercase tracking-[0.2em]">Contextual Synthesis Layer</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <p className="text-slate-300 text-sm leading-relaxed font-medium italic">
                                    {ai_synthesis.executive_summary || "Scanning unified data shards for pattern extraction..."}
                                </p>

                                <div className="pt-6 border-t border-white/10 space-y-4">
                                    {ai_synthesis.insights?.slice(0, 3).map((insight: any, i: number) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.5 + (i * 0.1) }}
                                            className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors group cursor-default"
                                        >
                                            <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${insight.sentiment === 'positive' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.5)]'}`}></div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">{insight.metric}</p>
                                                <p className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">{insight.narrative}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Profit & Loss Section */}
                <section className="mt-12 bg-slate-50/50 p-8 rounded-[3rem] border border-slate-200/50 shadow-inner">
                    <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                        <div>
                            <h2 className="text-2xl font-poppins font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-3">
                                <TrendingUp className="w-8 h-8 text-indigo-600" />
                                Profit & Loss Architecture
                            </h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Comparative Variance Analysis</p>
                        </div>

                        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                            {['W', 'M', 'Y'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFrequency(f)}
                                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${frequency === f
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-50'}`}
                                >
                                    {f === 'W' ? 'Weekly' : f === 'M' ? 'Monthly' : 'Yearly'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        <div className="lg:col-span-1 space-y-6">
                            {/* <MetricToggle label="Revenue Streams" active={visibleMetrics.includes('revenue')} onToggle={() => toggleMetric('revenue')} />
                            <MetricToggle label="Operating Cost" active={visibleMetrics.includes('expenses')} onToggle={() => toggleMetric('expenses')} color="rose" />
                            <MetricToggle label="Net Profit" active={visibleMetrics.includes('profit')} onToggle={() => toggleMetric('profit')} color="emerald" /> */}

                            <div className="p-6 bg-slate-900 rounded-3xl border border-white/5 shadow-2xl mt-8">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-4 italic">Comparison Engine</h4>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Growth vs Prev</span>
                                            <span className="text-sm font-black text-white mt-1">{metrics.growth || 0}%</span>
                                        </div>
                                        <div className={`p-2 rounded-lg ${(metrics.growth || 0) >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                            <Activity className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Margin Efficiency</span>
                                            <span className="text-sm font-black text-white mt-1">{metrics.efficiency || 0}%</span>
                                        </div>
                                        <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                                            <Zap className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-3 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                            <div className="px-8 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Timeline Performance Ledger</span>
                                <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                                    <Download className="w-4 h-4 text-slate-400" />
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 italic">Timeline</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 italic text-right">Revenue</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 italic text-right">Expenses</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 italic text-right">P / L</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 italic text-center">Variance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {chart_data.map((row: any, i: number) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-8 py-5 text-xs font-black text-slate-900 font-mono tracking-tight group-hover:translate-x-1 transition-transform">{row.index}</td>
                                                <td className="px-8 py-5 text-sm font-bold text-slate-700 text-right">{formatCurrency(row[column_mapping.revenue || 'revenue'] || 0)}</td>
                                                <td className="px-8 py-5 text-sm font-bold text-slate-700 text-right">{formatCurrency(row[column_mapping.expenses || 'expenses'] || 0)}</td>
                                                <td className={`px-8 py-5 text-sm font-black text-right ${row[column_mapping.profit || 'profit'] >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {formatCurrency(row[column_mapping.profit || 'profit'] || 0)}
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${row[column_mapping.profit || 'profit'] >= 0
                                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                        : 'bg-rose-50 text-rose-600 border border-rose-100'
                                                        }`}>
                                                        {row[column_mapping.profit || 'profit'] >= 0 ? 'PROFIT' : 'DEFICIT'}
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
            <div className="bg-slate-900 border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-xl">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 italic">{label}</p>
                <div className="space-y-1.5">
                    {payload.map((p: any, i: number) => (
                        <div key={i} className="flex items-center justify-between gap-6">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{p.name}:</span>
                            <span className="text-xs font-black text-white">₹{(p.value / 1000).toFixed(1)}k</span>
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
        className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group hover:shadow-lg transition-all relative overflow-hidden"
    >
        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
        <div className="flex items-start justify-between relative z-10">
            <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-white transition-colors border border-transparent shadow-sm">
                {icon}
            </div>
            <div className={`flex items-center gap-1 text-[10px] font-black tracking-tighter uppercase px-2 py-1 rounded-lg ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {trend}
            </div>
        </div>
        <div className="mt-4 relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 italic">{title}</p>
            <p className="text-2xl font-poppins font-black text-slate-900 tracking-tighter">{value}</p>
        </div>
    </motion.div>
);

export default InsightsVault;
