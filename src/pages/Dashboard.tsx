import React, { useState, useMemo } from 'react';
import {
    LayoutDashboard,
    Settings,
    LogOut,
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
    Users,
    Briefcase,
    Layers,
    CheckCircle2,
    IndianRupee,
    Star
} from 'lucide-react';
import { auth } from '../lib/firebase';
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

/* --- Constants & Types --- */

const DEPARTMENTS = ['Sales', 'Marketing', 'Finance', 'HR'];
const REGIONS = ['North', 'South', 'East', 'West'];
const RATINGS = ['Excellent', 'Good', 'Average', 'Poor'];

const COLORS = {
    Sales: '#3B82F6',
    Marketing: '#8B5CF6',
    Finance: '#F59E0B',
    HR: '#10B981',
    Primary: '#3B82F6',
    Success: '#22C55E',
    Warning: '#F97316',
    Danger: '#EF4444'
};

interface BusinessReport {
    report_id: string;
    report_date: string;
    department: string;
    region: string;
    product: string;
    units_sold: number;
    revenue: number;
    expenses: number;
    profit: number;
    performance_rating: 'Excellent' | 'Good' | 'Average' | 'Poor';
}

/* --- Mock Data Generator --- */

const generateMockData = (): BusinessReport[] => {
    const data: BusinessReport[] = [];
    const products = ['Enterprise Cloud', 'Cyber Security Suite', 'AI Analytics Pro', 'Data Warehouse', 'Global CDN'];

    for (let i = 1; i <= 50; i++) {
        const revenue = Math.floor(Math.random() * 500000) + 100000;
        const expenses = Math.floor(Math.random() * (revenue * 0.7)) + (revenue * 0.1);
        const profit = revenue - expenses;

        let rating: 'Excellent' | 'Good' | 'Average' | 'Poor' = 'Good';
        const margin = profit / revenue;
        if (margin > 0.4) rating = 'Excellent';
        else if (margin > 0.25) rating = 'Good';
        else if (margin > 0.1) rating = 'Average';
        else rating = 'Poor';

        data.push({
            report_id: `BR-${1000 + i}`,
            report_date: `2026-0${Math.floor(Math.random() * 1) + 1}-${Math.floor(Math.random() * 28) + 1}`,
            department: DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)],
            region: REGIONS[Math.floor(Math.random() * REGIONS.length)],
            product: products[Math.floor(Math.random() * products.length)],
            units_sold: Math.floor(Math.random() * 500) + 50,
            revenue,
            expenses,
            profit,
            performance_rating: rating
        });
    }
    return data.sort((a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime());
};

const MOCK_DATA = generateMockData();

/* --- Main Component --- */

const Dashboard = () => {
    const [data] = useState<BusinessReport[]>(MOCK_DATA);
    const [searchTerm, setSearchTerm] = useState('');
    const [deptFilter, setDeptFilter] = useState('All');
    const [regionFilter, setRegionFilter] = useState('All');
    const [ratingFilter, setRatingFilter] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const handleLogout = () => auth.signOut();

    /* --- Data Processing --- */

    const filteredData = useMemo(() => {
        return data.filter(item => {
            const matchesSearch = item.report_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.product.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDept = deptFilter === 'All' || item.department === deptFilter;
            const matchesRegion = regionFilter === 'All' || item.region === regionFilter;
            const matchesRating = ratingFilter === 'All' || item.performance_rating === ratingFilter;
            return matchesSearch && matchesDept && matchesRegion && matchesRating;
        });
    }, [data, searchTerm, deptFilter, regionFilter, ratingFilter]);

    const stats = useMemo(() => {
        const totalRevenue = filteredData.reduce((acc, curr) => acc + curr.revenue, 0);
        const totalProfit = filteredData.reduce((acc, curr) => acc + curr.profit, 0);
        const totalExpenses = filteredData.reduce((acc, curr) => acc + curr.expenses, 0);
        const totalUnitsSold = filteredData.reduce((acc, curr) => acc + curr.units_sold, 0);

        // Calculate performance distribution
        const counts = filteredData.reduce((acc: any, curr) => {
            acc[curr.performance_rating] = (acc[curr.performance_rating] || 0) + 1;
            return acc;
        }, {});

        const topRating = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, 'Average');

        return { totalRevenue, totalProfit, totalExpenses, totalUnitsSold, topRating };
    }, [filteredData]);

    // Chart Data: Revenue vs Expenses
    const barChartData = useMemo(() => {
        const grouped = filteredData.reduce((acc: any, curr) => {
            const date = curr.report_date;
            if (!acc[date]) acc[date] = { date, revenue: 0, expenses: 0 };
            acc[date].revenue += curr.revenue;
            acc[date].expenses += curr.expenses;
            return acc;
        }, {});
        return Object.values(grouped).slice(-10); // Last 10 days
    }, [filteredData]);

    // Chart Data: Profit Trend
    const lineChartData = useMemo(() => {
        return filteredData.map(d => ({ date: d.report_date, profit: d.profit })).reverse();
    }, [filteredData]);

    // Chart Data: Dept Pie
    const deptPieData = useMemo(() => {
        const grouped = filteredData.reduce((acc: any, curr) => {
            acc[curr.department] = (acc[curr.department] || 0) + curr.profit;
            return acc;
        }, {});
        return Object.keys(grouped).map(name => ({ name, value: grouped[name] }));
    }, [filteredData]);

    // Chart Data: Region Bar
    const regionBarData = useMemo(() => {
        const grouped = filteredData.reduce((acc: any, curr) => {
            acc[curr.region] = (acc[curr.region] || 0) + curr.revenue;
            return acc;
        }, {});
        return Object.keys(grouped)
            .map(name => ({ name, value: grouped[name] }))
            .sort((a, b) => b.value - a.value);
    }, [filteredData]);

    /* --- Table Helpers --- */
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const currentTableData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
    };

    /* --- Render --- */

    return (
        <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-inter">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 flex flex-col z-20 shadow-xl overflow-hidden">
                <div className="p-8 pb-4 flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20">
                        <LayoutDashboard className="w-6 h-6 text-white" />
                    </div>
                    <span className="font-poppins font-bold text-xl tracking-tight text-white">InsightHQ</span>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-1">
                    <SidebarItem icon={<ArrowUpRight className="w-5 h-5" />} label="Overview" active={true} />
                    <SidebarItem icon={<Target className="w-5 h-5" />} label="Marketing" />
                    <SidebarItem icon={<Layers className="w-5 h-5" />} label="Inventory" />
                    <SidebarItem icon={<Users className="w-5 h-5" />} label="HR & Payroll" />
                    <SidebarItem icon={<Briefcase className="w-5 h-5" />} label="Legal" />
                    <SidebarItem icon={<Settings className="w-5 h-5" />} label="System Settings" />
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all font-medium cursor-pointer group"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative">
                {/* Header */}
                <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-5 flex items-center justify-between z-10">
                    <div>
                        <h1 className="text-2xl font-poppins font-bold text-slate-900">Executive Report</h1>
                        <p className="text-sm text-slate-500 font-medium">Internal Analytics System v2.0</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex gap-2">
                            <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-semibold transition-colors text-slate-700">
                                <Download className="w-4 h-4" /> CSV
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-semibold transition-colors text-white shadow-md shadow-indigo-200">
                                <Share2 className="w-4 h-4" /> Export PDF
                            </button>
                        </div>
                        <div className="w-px h-8 bg-slate-200 mx-2" />
                        <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white overflow-hidden shadow-sm">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" />
                        </div>
                    </div>
                </header>

                <div className="p-8 space-y-8 max-w-7xl mx-auto">

                    {/* Filters & Controls */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-6">
                        <div className="relative flex-1 min-w-[240px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by ID or Product..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-400"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <FilterSelect icon={<Briefcase />} label="Department" value={deptFilter} options={DEPARTMENTS} onChange={setDeptFilter} />
                        <FilterSelect icon={<Target />} label="Region" value={regionFilter} options={REGIONS} onChange={setRegionFilter} />
                        <FilterSelect icon={<Star />} label="Rating" value={ratingFilter} options={RATINGS} onChange={setRatingFilter} />
                    </div>

                    {/* Row 1: KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                        <KPICard title="Total Revenue" value={formatCurrency(stats.totalRevenue)} trend="+12.5%" icon={<IndianRupee />} color="indigo" />
                        <KPICard title="Total Profit" value={formatCurrency(stats.totalProfit)} trend="+8.2%" icon={<TrendingUp />} color="emerald" positive={true} />
                        <KPICard title="Total Expenses" value={formatCurrency(stats.totalExpenses)} trend="-2.4%" icon={<TrendingDown />} color="rose" positive={false} />
                        <KPICard title="Units Sold" value={stats.totalUnitsSold.toLocaleString()} trend="+145" icon={<Package />} color="amber" />
                        <KPIRatingCard title="Overall Rating" value={stats.topRating} icon={<CheckCircle2 />} />
                    </div>

                    {/* Row 2: Charts Area 1 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <ChartCard title="Revenue vs Expenses" subtitle="Vertical Bar Comparison (Report Dates)">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={barChartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                                    <Tooltip
                                        cursor={{ fill: '#F1F5F9' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="revenue" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={20} />
                                    <Bar dataKey="expenses" fill="#F43F5E" radius={[4, 4, 0, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>

                        <ChartCard title="Profit Trend" subtitle="Daily Profit Analysis (Highest Points Highlighted)">
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={lineChartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="date" hide />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="profit"
                                        stroke="#10B981"
                                        strokeWidth={3}
                                        dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </div>

                    {/* Row 3: Charts Area 2 */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <ChartCard title="Departmental Breakdown" subtitle="Profit Contribution by Org" className="lg:col-span-1">
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={deptPieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {deptPieData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index]} />
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
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 600 }} />
                                    <Tooltip cursor={{ fill: '#F1F5F9' }} />
                                    <Bar dataKey="value" fill="#6366F1" radius={[0, 4, 4, 0]} barSize={25} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </div>

                    {/* Data Table Section */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-12">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-poppins font-bold text-lg">Detailed Report Data</h3>
                            <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full">{filteredData.length} records found</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 text-slate-500 text-[10px] uppercase tracking-[0.1em] font-black border-b border-slate-100">
                                        <th className="px-6 py-4">Report ID</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Department</th>
                                        <th className="px-6 py-4">Region</th>
                                        <th className="px-6 py-4">Revenue</th>
                                        <th className="px-6 py-4">Expenses</th>
                                        <th className="px-6 py-4">Profit</th>
                                        <th className="px-6 py-4 text-center">Rating</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-slate-100">
                                    {currentTableData.map((row) => (
                                        <tr key={row.report_id} className="hover:bg-slate-50/50 transition-colors group cursor-default">
                                            <td className="px-6 py-4 font-bold text-indigo-600">{row.report_id}</td>
                                            <td className="px-6 py-4 text-slate-500">{row.report_date}</td>
                                            <td className="px-6 py-4">
                                                <span className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: (COLORS as any)[row.department] }}></div>
                                                    {row.department}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-700">{row.region}</td>
                                            <td className="px-6 py-4 font-semibold text-slate-900">{formatCurrency(row.revenue)}</td>
                                            <td className="px-6 py-4 text-rose-500 font-medium">{formatCurrency(row.expenses)}</td>
                                            <td className="px-6 py-4 font-bold text-emerald-600">{formatCurrency(row.profit)}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center">
                                                    <PerformanceBadge rating={row.performance_rating} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        <div className="px-6 py-4 bg-slate-50/50 flex items-center justify-between">
                            <p className="text-sm text-slate-500">Showing <span className="font-bold text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-slate-900">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> of {filteredData.length}</p>
                            <div className="flex gap-2">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => p - 1)}
                                    className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

/* --- Sub-Components --- */

const SidebarItem = ({ icon, label, active = false }: any) => (
    <button className={`flex items-center gap-3 w-full px-4 py-3 cursor-pointer rounded-xl transition-all font-medium ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
        {icon}
        <span>{label}</span>
    </button>
);

const FilterSelect = ({ icon, label, value, options, onChange }: any) => (
    <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl group hover:border-indigo-300 transition-all">
        <div className="text-slate-400 group-hover:text-indigo-500 transition-colors">{icon}</div>
        <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
            <select
                className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 cursor-pointer p-0"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
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
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-full opacity-5 transition-opacity group-hover:opacity-10 ${isIndigo ? 'bg-indigo-600' : isEmerald ? 'bg-emerald-600' : isRose ? 'bg-rose-600' : 'bg-amber-600'}`}></div>
            <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${isIndigo ? 'bg-indigo-50 text-indigo-600' : isEmerald ? 'bg-emerald-50 text-emerald-600' : isRose ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                    {React.cloneElement(icon, { size: 20 })}
                </div>
                <div className={`flex items-center gap-1 text-xs font-black ${positive ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'} px-2 py-1 rounded-md`}>
                    {trend}
                </div>
            </div>
            <span className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{title}</span>
            <h3 className="text-2xl font-poppins font-bold text-slate-900">{value}</h3>
        </div>
    );
};

const KPIRatingCard = ({ title, value, icon }: any) => {
    const getRatingStyle = (v: string) => {
        switch (v) {
            case 'Excellent': return 'text-emerald-600';
            case 'Good': return 'text-indigo-600';
            case 'Average': return 'text-amber-600';
            case 'Poor': return 'text-rose-600';
            default: return 'text-slate-600';
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="p-2.5 bg-slate-50 text-slate-500 rounded-xl w-fit mb-4">
                {icon}
            </div>
            <span className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{title}</span>
            <div className="flex items-center gap-2">
                <h3 className={`text-2xl font-poppins font-bold ${getRatingStyle(value)}`}>{value}</h3>
            </div>
        </div>
    );
};

const ChartCard = ({ title, subtitle, children, className = "" }: any) => (
    <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm ${className}`}>
        <div className="mb-6">
            <h3 className="font-poppins font-bold text-lg text-slate-900 leading-none">{title}</h3>
            <p className="text-xs text-slate-400 font-medium mt-1">{subtitle}</p>
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
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[rating]}`}>
            {rating}
        </span>
    );
};

export default Dashboard;
