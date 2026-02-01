import { useState, useCallback, useRef, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, Trash2, ArrowLeft, Maximize2, Minimize2, Sparkles, BrainCircuit, Plus, History, MessageCircle, Moon, Sun, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeContext';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PureMultimodalInput } from '@/components/ui/multimodal-ai-chat-input';
import type { UIMessage, Attachment } from '@/components/ui/multimodal-ai-chat-input';
import { MultiStepLoader } from '@/components/ui/loader';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface SavedChat {
    id: string;
    title: string;
    updated_at: string;
}

const DataChat = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const [messages, setMessages] = useState<UIMessage[]>([]);
    const [isLoadingChat, setIsLoadingChat] = useState(false);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [chatTitle, setChatTitle] = useState<string | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);


    // Fetch saved chats for sidebar
    const fetchSavedChats = useCallback(async () => {
        if (!user) return;
        setIsLoadingChat(true);
        try {
            const res = await axios.get(`${API_URL}/analytics/chats?user_id=${user.uid}`);
            setSavedChats(res.data);
        } catch (err) {
            console.error('Failed to fetch chats:', err);
        } finally {
            setIsLoadingChat(false);
        }
    }, [user]);

    useEffect(() => {
        fetchSavedChats();
    }, [fetchSavedChats]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const loadChat = async (chatId: string) => {
        setIsLoadingChat(true);
        try {
            const res = await axios.get(`${API_URL}/analytics/chat/${chatId}`);
            setMessages(res.data.messages || []);
            setCurrentChatId(chatId);
            setChatTitle(res.data.title);
            setAttachments([]); // Clear pending attachments when switching sessions
        } catch (err) {
            console.error('Failed to load chat:', err);
        } finally {
            setIsLoadingChat(false);
        }
    };

    const handleSendMessage = useCallback(async ({ input, attachments }: { input: string; attachments: Attachment[] }) => {
        if (!user || (!input.trim() && attachments.length === 0)) return;

        const userMsg: UIMessage = {
            id: `USER_${Date.now()}`,
            role: 'user',
            content: input,
            attachments: attachments
        };

        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setIsGenerating(true);

        const assistantId = `STRM_${Date.now()}`;
        const assistantMsg: UIMessage = {
            id: assistantId,
            role: 'assistant',
            content: ''
        };

        setMessages(prev => [...prev, assistantMsg]);

        try {
            const response = await fetch(`${API_URL}/analytics/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: newMessages.map(m => ({ role: m.role, content: m.content })),
                    user_id: user.uid,
                    chat_id: currentChatId,
                    title: chatTitle
                })
            });

            if (!response.body) throw new Error('No response body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.error) throw new Error(data.error);

                            // Live update the current chat ID if it was newly created
                            if (data.id && !currentChatId) {
                                setCurrentChatId(data.id);
                                setChatTitle(data.title);
                            }

                            if (data.content) {
                                accumulatedContent += data.content;
                                setMessages(prev => prev.map(m =>
                                    m.id === assistantId ? { ...m, content: accumulatedContent } : m
                                ));
                            }
                        } catch (e) {
                            console.error('Error parsing stream chunk:', e);
                        }
                    }
                }
            }
            // Refresh sidebar after stream finishes
            fetchSavedChats();
        } catch (error: any) {
            console.error('Chat Error:', error);
            setMessages(prev => prev.map(m =>
                m.id === assistantId
                    ? { ...m, content: "I apologize, but I encountered an error while analyzing your data. Please check your connection or try again shortly." }
                    : m
            ));
        } finally {
            setIsGenerating(false);
        }
    }, [user, messages, currentChatId, chatTitle, fetchSavedChats]);

    const handleStopGenerating = useCallback(() => {
        setIsGenerating(false);
    }, []);

    const clearChat = () => {
        setMessages([]);
        setCurrentChatId(null);
        setChatTitle(null);
    };

    const deleteChat = async (e: React.MouseEvent, chatId: string) => {
        e.stopPropagation(); // Don't trigger loadChat
        if (!confirm('Are you sure you want to delete this analytical session?')) return;

        try {
            await axios.delete(`${API_URL}/analytics/chat/${chatId}`);
            if (currentChatId === chatId) {
                clearChat();
            }
            fetchSavedChats();
        } catch (err) {
            console.error('Failed to delete chat:', err);
        }
    };

    const handleLogout = async () => {
        try {
            navigate('/', { replace: true });
            await auth.signOut();
        } catch (err) {
            console.error('Logout error:', err);
            window.location.href = '/';
        }
    };

    return (
        <div className={`flex h-screen bg-[#F8FAFC] dark:bg-[#0F172A] transition-all duration-500 ${isFullscreen ? 'fixed inset-0 z-50' : 'relative'}`}>
            {/* Left Sidebar (Chat History) */}
            <AnimatePresence>
                {(isSidebarOpen || window.innerWidth >= 1024) && (
                    <motion.aside
                        initial={{ x: -320, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -320, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className={`
                            fixed lg:relative z-40 lg:z-0 w-80 h-full bg-white dark:bg-[#1E293B] border-r border-slate-200 dark:border-slate-800 flex flex-col
                            ${isSidebarOpen ? 'flex' : 'hidden lg:flex'}
                        `}
                    >
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                            <button
                                onClick={clearChat}
                                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
                            >
                                <Plus className="w-4 h-4" /> New Chat
                            </button>
                            <button
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-500 dark:text-slate-400"
                                title="Toggle Mode"
                            >
                                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            <div className="flex items-center gap-2 px-2 pb-2 text-slate-400 dark:text-slate-500 font-black uppercase text-[9px] tracking-tighter">
                                <History className="w-3 h-3" /> Recent Conversations
                            </div>
                            {savedChats.map((chat) => (
                                <button
                                    key={chat.id}
                                    onClick={() => loadChat(chat.id)}
                                    className={`w-full p-3 rounded-xl text-left transition-all group border ${currentChatId === chat.id
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900/30'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3 flex-1 overflow-hidden">
                                            <MessageCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${currentChatId === chat.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                                            <div className="flex-1 overflow-hidden">
                                                <p className={`text-xs font-bold truncate ${currentChatId === chat.id ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {chat.title}
                                                </p>
                                                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium uppercase mt-1">
                                                    {new Date(chat.updated_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => deleteChat(e, chat.id)}
                                            className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-all flex-shrink-0"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                            <div className="flex items-center gap-3 p-2">
                                <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                                    <BrainCircuit className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase font-outfit truncate">Insightra AI Analyst</p>
                                    <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest truncate">Version 2.4.0 (Real-Time)</p>
                                </div>
                            </div>

                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all font-black uppercase tracking-widest text-[9px]"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>TERMINATE SESSION</span>
                            </button>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Mobile Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsSidebarOpen(false)}
                        className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30"
                    />
                )}
            </AnimatePresence>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="flex items-center justify-between px-4 lg:px-8 py-4 bg-white dark:bg-[#1E293B] border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="lg:hidden p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 dark:text-slate-500"
                        >
                            <History className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 uppercase font-outfit tracking-wider flex items-center gap-2 truncate">
                                Insightra AI <span className="text-[9px] sm:text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full shrink-0">Beta</span>
                            </h1>
                            <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest truncate">
                                {chatTitle || 'Conversational Data Intelligence'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <button
                            onClick={clearChat}
                            className="p-2.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400"
                            title="Clear Workspace"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                        <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700 mx-2" />
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl overflow-hidden">
                            <BrainCircuit className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-hidden relative flex flex-col max-w-5xl mx-auto w-full">
                    {isLoadingChat ? (
                        <div className="flex-1 flex items-center justify-center">
                            <MultiStepLoader
                                loadingStates={[
                                    { text: "Syncing Neural Context..." },
                                    { text: "Decrypting Conversation History..." }
                                ]}
                            />
                        </div>
                    ) : (
                        <>
                            <div
                                ref={scrollRef}
                                className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8 scroll-smooth"
                            >
                                <AnimatePresence initial={false}>
                                    {messages.length === 0 ? (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex flex-col items-center justify-center h-full text-center space-y-6"
                                        >
                                            <div className="w-20 h-20 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-200/50 dark:shadow-none">
                                                <Sparkles className="w-10 h-10 text-white" />
                                            </div>
                                            <div className="space-y-2">
                                                <h2 className="text-2xl font-outfit font-black text-slate-900 dark:text-slate-100 uppercase">Interactive Intelligence</h2>
                                                <p className="max-w-md text-sm text-slate-500 dark:text-slate-400 font-medium">
                                                    Your personal AI Data Scientist is ready.
                                                    Ask complex questions about your revenue, expenses, or projections across all uploaded reports.
                                                </p>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        messages.map((msg) => (
                                            <motion.div
                                                key={msg.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div className={`flex gap-3 sm:gap-4 max-w-[90%] sm:max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                                    <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center border ${msg.role === 'user'
                                                        ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                                                        : 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-100 dark:shadow-none'
                                                        }`}>
                                                        {msg.role === 'user' ? <User className="w-4 h-4 sm:w-5 sm:h-5" /> : <Bot className="w-4 h-4 sm:w-5 sm:h-5" />}
                                                    </div>
                                                    <div className={`px-4 sm:px-6 py-3 sm:py-4 rounded-[1.2rem] sm:rounded-[1.5rem] ${msg.role === 'user'
                                                        ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-tr-none'
                                                        : 'bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900 shadow-xl shadow-indigo-50/50 dark:shadow-none rounded-tl-none'
                                                        }`}>
                                                        <div className="prose prose-slate dark:prose-invert prose-sm max-w-none prose-p:leading-relaxed dark:text-slate-300 prose-pre:bg-slate-900 prose-pre:text-white prose-table:border prose-table:border-slate-200 dark:prose-table:border-slate-700 prose-th:bg-slate-50 dark:prose-th:bg-slate-800/50 prose-th:px-4 prose-th:py-2 prose-td:px-4 prose-td:py-2">
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </AnimatePresence>
                                {isGenerating && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex justify-start"
                                    >
                                        <div className="flex gap-4 items-center pl-14">
                                            <div className="flex gap-1.5">
                                                <motion.div
                                                    animate={{ scale: [1, 1.2, 1] }}
                                                    transition={{ repeat: Infinity, duration: 1 }}
                                                    className="w-1.5 h-1.5 bg-indigo-400 rounded-full"
                                                />
                                                <motion.div
                                                    animate={{ scale: [1, 1.2, 1] }}
                                                    transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                                                    className="w-1.5 h-1.5 bg-indigo-500 rounded-full"
                                                />
                                                <motion.div
                                                    animate={{ scale: [1, 1.2, 1] }}
                                                    transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                                                    className="w-1.5 h-1.5 bg-indigo-600 rounded-full"
                                                />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest animate-pulse">Analyzing Repositories...</span>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            {/* Input Area */}
                            <div className="px-4 sm:px-6 py-4 sm:py-6 bg-transparent">
                                <div className="relative group max-w-4xl mx-auto w-full">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 rounded-[2.5rem] opacity-0 blur-lg group-hover:opacity-10 transition-opacity duration-500" />
                                    <PureMultimodalInput
                                        chatId="main-analyst"
                                        messages={messages}
                                        attachments={attachments}
                                        setAttachments={setAttachments}
                                        onSendMessage={handleSendMessage}
                                        onStopGenerating={handleStopGenerating}
                                        isGenerating={isGenerating}
                                        canSend={!!user && !isGenerating}
                                        selectedVisibilityType="private"
                                        className="relative"
                                    />
                                </div>
                                <p className="mt-3 text-center text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.2em]">
                                    Insightra AI Analyst can make mistakes. Verify critical financial data.
                                </p>
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div >
    );
};

export default DataChat;
