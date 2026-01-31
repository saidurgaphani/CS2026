import { motion } from 'framer-motion'
import { ArrowRight, Github, Twitter, Layers, LogOut } from 'lucide-react'
import { auth } from '../lib/firebase'

const HomePage = () => {
    const handleLogout = async () => {
        try {
            await auth.signOut();
        } catch (err) {
            console.error("Logout error:", err);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/10 selection:text-primary">
            {/* Navbar */}
            <nav className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl px-6 py-4 z-50">
                <div className="flex items-center justify-between p-2 px-6 bg-background/80 backdrop-blur-md border border-border/50 rounded-full shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary rounded-xl">
                            <Layers className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">CS2026</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
                        <a href="#" className="hover:text-foreground transition-colors cursor-pointer">Features</a>
                        <a href="#" className="hover:text-foreground transition-colors cursor-pointer">About</a>
                        <a href="#" className="hover:text-foreground transition-colors cursor-pointer">Pricing</a>
                        <a href="#" className="hover:text-foreground transition-colors cursor-pointer">Contact</a>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                        <button className="bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-medium hover:bg-primary/90 transition-all cursor-pointer shadow-lg shadow-primary/20 active:scale-95">
                            Get Started
                        </button>
                    </div>
                </div>
            </nav>

            <main>
                {/* Hero Section */}
                <section className="relative pt-32 pb-20 px-6 overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 opacity-30 pointer-events-none">
                        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[120px]" />
                        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[120px]" />
                    </div>

                    <div className="max-w-4xl mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <span className="inline-block px-4 py-1.5 mb-6 text-xs font-semibold tracking-wider uppercase text-primary bg-primary/10 rounded-full border border-primary/20">
                                Welcome to the Future
                            </span>
                            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-[1.1]">
                                Build something <span className="text-primary italic">extraordinary</span> with CS2026
                            </h1>
                            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                                A blank canvas for your next big idea. Premium design, seamless animations, and a developer-first experience.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <button className="w-full sm:w-auto bg-primary text-primary-foreground px-8 py-4 rounded-full text-lg font-semibold hover:bg-primary/90 transition-all cursor-pointer shadow-xl shadow-primary/20 group">
                                    Start Building
                                    <ArrowRight className="inline-block ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                                <button className="w-full sm:w-auto bg-secondary text-secondary-foreground px-8 py-4 rounded-full text-lg font-semibold hover:bg-secondary/80 transition-all cursor-pointer border border-border">
                                    Documentation
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Blank Content Section */}
                <section className="py-24 px-6 bg-muted/30">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold mb-4">Your Content Here</h2>
                            <p className="text-muted-foreground">Start adding your features, services, or portfolio items in this grid.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="group p-8 bg-background border border-border/50 rounded-3xl hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 cursor-pointer">
                                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary">
                                        <Layers className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">Placeholder {i}</h3>
                                    <p className="text-muted-foreground leading-relaxed">
                                        This is a placeholder for your content. You can replace this with a description of your amazing feature.
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Call to Action */}
                <section className="py-24 px-6">
                    <div className="max-w-5xl mx-auto bg-primary text-primary-foreground rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent)]" />
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold mb-8 relative z-10">Ready to launch your project?</h2>
                        <p className="text-primary-foreground/80 mb-10 text-lg md:text-xl max-w-2xl mx-auto relative z-10 font-light">
                            Don't wait. The best time to start was yesterday. The second best time is now.
                        </p>
                        <button className="bg-background text-primary px-10 py-4 rounded-full text-lg font-bold hover:opacity-90 transition-all cursor-pointer relative z-10 shadow-2xl active:scale-95">
                            Get Started Now
                        </button>
                    </div>
                </section>
            </main>

            <footer className="py-12 px-6 border-t border-border/50">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-2">
                        <Layers className="w-6 h-6 text-primary" />
                        <span className="font-bold text-xl tracking-tight">CS2026</span>
                    </div>
                    <div className="flex items-center gap-8 text-sm text-muted-foreground">
                        <a href="#" className="hover:text-foreground transition-colors cursor-pointer">Privacy Policy</a>
                        <a href="#" className="hover:text-foreground transition-colors cursor-pointer">Terms of Service</a>
                        <div className="flex items-center gap-4 ml-4">
                            <Twitter className="w-5 h-5 cursor-pointer hover:text-blue-400 transition-colors" />
                            <Github className="w-5 h-5 cursor-pointer hover:text-foreground transition-colors" />
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        © 2026 CS2026. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    )
}

export default HomePage
