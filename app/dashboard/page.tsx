"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import QRGenerator from "@/components/QRGenerator";
import QRScanner from "@/components/QRScanner";
import { LogOut, Ticket, Scan, LayoutDashboard, Loader2 } from "lucide-react";

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"generate" | "scan">("generate");

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/login");
            } else {
                setLoading(false);
            }
        };
        checkSession();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-500" size={40} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col font-sans">
            <header className="bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-40">
                <div className="max-w-5xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-400">
                        <LayoutDashboard size={24} />
                        <h1 className="text-xl font-bold tracking-tight text-white hidden sm:block">
                            Gestionnaire de Billets
                        </h1>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors border border-transparent hover:border-zinc-700"
                    >
                        <LogOut size={16} />
                        Déconnexion
                    </button>
                </div>
            </header>

            <main className="flex-1 max-w-lg md:max-w-4xl w-full mx-auto p-4 md:p-8 w-full mt-4 md:mt-8">
                <div className="flex flex-col md:flex-row gap-4 md:gap-8 h-full items-start">

                    <aside className="w-full md:w-64 shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto scb-hide pb-2 md:pb-0">
                        <button
                            onClick={() => setActiveTab("generate")}
                            className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm whitespace-nowrap ${activeTab === "generate"
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                                }`}
                        >
                            <Ticket size={20} className={activeTab === "generate" ? "text-indigo-200" : ""} />
                            Générer Billet
                        </button>
                        <button
                            onClick={() => setActiveTab("scan")}
                            className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm whitespace-nowrap ${activeTab === "scan"
                                    ? "bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20"
                                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                                }`}
                        >
                            <Scan size={20} className={activeTab === "scan" ? "text-amber-900" : ""} />
                            Scanner Entrées
                        </button>
                    </aside>

                    <section className="flex-1 w-full min-w-0">
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
                            {activeTab === "generate" ? <QRGenerator /> : <QRScanner />}
                        </div>
                    </section>

                </div>
            </main>
        </div>
    );
}
