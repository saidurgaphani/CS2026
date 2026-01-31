import { Sidebar } from "@/components/ui/sidebar";
import { useState } from "react";

const DemoOne = () => {
    const [activeTab, setActiveTab] = useState('dashboard');

    return (
        <div className="flex h-screen bg-slate-50">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            <div className="flex-1 lg:ml-64 p-8">
                <h1 className="text-2xl font-bold">Main Content Area</h1>
                <p className="mt-4">Active Tab: {activeTab}</p>
            </div>
        </div>
    );
};

export { DemoOne };
