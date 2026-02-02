import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { HorizonHero } from '../components/ui/horizon-hero-section';
import { motion } from 'framer-motion';
import {
    ArrowRight,
    Box,
    Lock,
    Search,
    Settings,
    Sparkles
} from 'lucide-react';
import { GlowingEffect } from "../components/ui/glowing-effect";
import { cn } from "../lib/utils";

const LandingPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleTryNow = () => {
        if (user) {
            navigate('/dashboard');
        } else {
            navigate('/login');
        }
    };

    return (
        <div className="relative bg-black min-h-screen overflow-x-hidden">
            {/* 3D Hero Section */}
            <HorizonHero />

            {/* Feature Overlay (Visible on scroll) */}
            <div className="relative z-10 bg-black/90 backdrop-blur-xl border-t border-white/5 py-32 px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Glowing Grid Section */}
                    <div className="mb-40">
                        <motion.h2
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            viewport={{ once: true }}
                            className="text-3xl md:text-4xl font-poppins font-black text-white italic uppercase tracking-tighter mb-16 text-center"
                        >
                            Intelligence Architecture
                        </motion.h2>

                        <motion.ul
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true, margin: "-100px" }}
                            variants={{
                                hidden: { opacity: 0 },
                                show: {
                                    opacity: 1,
                                    transition: {
                                        staggerChildren: 0.15
                                    }
                                }
                            }}
                            className="grid grid-cols-1 gap-6 md:grid-cols-12 lg:gap-8 auto-rows-fr"
                        >
                            <GridItem
                                area="md:[grid-area:1/1/2/7] xl:[grid-area:1/1/2/5]"
                                icon={<Box className="h-6 w-6 text-indigo-400" />}
                                title="Neural synthesis"
                                description="Precision restructuring of unstructured data into clean, actionable intelligence. Watch patterns emerge instantly."
                            />
                            <GridItem
                                area="md:[grid-area:1/7/2/13] xl:[grid-area:2/1/3/5]"
                                icon={<Settings className="h-6 w-6 text-emerald-400" />}
                                title="Global Zone Sync"
                                description="Seamlessly sync signals across departmental boundaries and regional zones with automated calibration."
                            />
                            <GridItem
                                area="md:[grid-area:2/1/3/7] xl:[grid-area:1/5/3/8]"
                                icon={<Lock className="h-6 w-6 text-rose-400" />}
                                title="Neural Vault"
                                description="Enterprise-grade encryption designed for sensitive financial and operational datasets. AES-256 isolation by default."
                            />
                            <GridItem
                                area="md:[grid-area:2/7/3/13] xl:[grid-area:1/8/2/13]"
                                icon={<Sparkles className="h-6 w-6 text-amber-400" />}
                                title="Instant Synthesis"
                                description="Generate comprehensive AI-driven reports from raw signals in less than 60 seconds with hyper-accuracy."
                            />
                            <GridItem
                                area="md:[grid-area:3/1/4/13] xl:[grid-area:2/8/3/13]"
                                icon={<Search className="h-6 w-6 text-sky-400" />}
                                title="Deep Search"
                                description="Traverse through millions of historical data points using natural language inquiries and semantic mapping."
                            />
                        </motion.ul>
                    </div>

                    {/* Final CTA Section */}
                    <div className="text-center py-20 relative overflow-hidden rounded-[4rem] bg-gradient-to-b from-indigo-600/20 to-transparent border border-indigo-500/10 mb-20">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="text-4xl md:text-6xl font-poppins font-black text-white italic uppercase tracking-tighter mb-8">
                                Ready to scale?
                            </h2>
                            <p className="text-slate-400 text-lg font-medium max-w-2xl mx-auto mb-12 uppercase tracking-widest leading-relaxed italic">
                                Join the elite tier and convert data into insights.
                            </p>

                            <button
                                onClick={handleTryNow}
                                className="group relative inline-flex items-center gap-4 bg-white text-black px-10 py-5 rounded-full font-black text-xl uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-white/10"
                            >
                                TRY NOW
                                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />

                                <div className="absolute inset-0 -z-10 bg-white/20 blur-2xl rounded-full scale-125 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </button>
                        </motion.div>
                    </div>
                </div>

                {/* Footer Decor */}
                <div className="mt-40 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] font-black tracking-[0.5em] text-slate-600 uppercase italic">
                    <div>© 2026 INSIGHTRA</div>
                    <div className="flex gap-10">
                        <span className="hover:text-white cursor-pointer transition-colors">Page1</span>
                        <span className="hover:text-white cursor-pointer transition-colors">Page2</span>
                        <span className="hover:text-white cursor-pointer transition-colors">Page3</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface GridItemProps {
    area: string;
    icon: React.ReactNode;
    title: string;
    description: React.ReactNode;
}

const GridItem = ({ area, icon, title, description }: GridItemProps) => {
    return (
        <motion.li
            variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
            }}
            className={cn("min-h-[14rem] list-none", area)}
        >
            <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3 group">
                <GlowingEffect
                    spread={40}
                    glow={true}
                    disabled={false}
                    proximity={64}
                    inactiveZone={0.01}
                    borderWidth={3}
                />
                <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl border-[0.75px] border-white/5 bg-zinc-900/50 p-6 shadow-sm md:p-6 backdrop-blur-sm transition-transform duration-500 group-hover:translate-y-[-4px]">
                    <div className="relative flex flex-1 flex-col justify-between gap-3">
                        <div className="w-fit rounded-lg border-[0.75px] border-white/10 bg-white/5 p-3 group-hover:scale-110 transition-transform bg-gradient-to-br from-white/10 to-transparent">
                            {icon}
                        </div>
                        <div className="space-y-3">
                            <h3 className="pt-0.5 text-lg leading-[1.375rem] font-black font-poppins italic tracking-tight uppercase text-white">
                                {title}
                            </h3>
                            <p className="font-inter text-[13px] leading-[1.125rem] md:text-[14px] md:leading-[1.375rem] text-slate-400 italic uppercase tracking-wider">
                                {description}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.li>
    );
};

export default LandingPage;
