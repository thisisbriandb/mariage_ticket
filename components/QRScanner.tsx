"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/lib/supabase";
import { Scan, CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function QRScanner() {
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<{
        success: boolean;
        guestName?: string;
        message: string;
    } | null>(null);
    const [processing, setProcessing] = useState(false);

    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    // Play a beep sound on scan
    const playBeep = (success: boolean) => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const ctx = audioContextRef.current;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = success ? "sine" : "sawtooth";
            osc.frequency.setValueAtTime(success ? 800 : 300, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);

            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.2);
            osc.stop(ctx.currentTime + 0.2);
        } catch (e) {
            console.error(e);
        }
    };

    const handleScanSuccess = async (decodedText: string) => {
        if (processing) return;

        // Play beep

        setProcessing(true);
        setResult(null);

        try {
            // Find the ticket by ID
            const { data, error } = await supabase
                .from("tickets")
                .select("*")
                .eq("id", decodedText)
                .single();

            if (error || !data) {
                playBeep(false);
                setResult({
                    success: false,
                    message: "Billet non trouvé ou non valide.",
                });
                return;
            }

            if (data.status === "scanned") {
                playBeep(false);
                setResult({
                    success: false,
                    guestName: data.guest_name,
                    message: "⚠️ Billet DÉJÀ SCANNNÉ !",
                });
            } else if (data.status === "valid") {
                playBeep(true);
                // Mark as scanned
                const { error: updateError } = await supabase
                    .from("tickets")
                    .update({ status: "scanned" })
                    .eq("id", decodedText);

                if (updateError) throw updateError;

                setResult({
                    success: true,
                    guestName: data.guest_name,
                    message: "✅ Entrée autorisée !",
                });
            }
        } catch (err) {
            console.error(err);
            playBeep(false);
            setResult({
                success: false,
                message: "Erreur lors de la vérification.",
            });
        } finally {
            setScanning(false);
            setProcessing(false);
        }
    };

    const startScanner = async () => {
        setResult(null);

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                await navigator.mediaDevices.getUserMedia({ video: true });
                setScanning(true);
            } catch (err) {
                console.error("Camera access error:", err);
                setResult({
                    success: false,
                    message: "Impossible d'accéder à la caméra. Vérifiez les permissions du navigateur.",
                });
            }
        } else {
            setResult({
                success: false,
                message: "L'accès à la caméra requiert une connexion sécurisée (HTTPS) ou localhost.",
            });
        }
    };

    useEffect(() => {
        if (scanning) {
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
            };

            scannerRef.current = new Html5QrcodeScanner("reader", config, false);
            scannerRef.current.render(handleScanSuccess, (err) => {
                // Ignorer les erreurs de vue de scan
            });

            return () => {
                if (scannerRef.current) {
                    scannerRef.current.clear().catch(console.error);
                }
            };
        }
    }, [scanning]);

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-amber-500/10 p-2.5 rounded-xl">
                    <Scan className="text-amber-400" size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-semibold text-white">Scanner les entrées</h3>
                    <p className="text-zinc-400 text-sm mt-0.5">Vérifie la validité des QR Codes</p>
                </div>
            </div>

            {!scanning ? (
                <div className="text-center py-8">
                    <button
                        onClick={startScanner}
                        className="inline-flex items-center gap-2 py-3 px-6 border border-transparent rounded-xl shadow-sm text-sm font-medium text-zinc-900 bg-amber-400 hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-amber-500 transition-all"
                    >
                        <Scan size={18} />
                        {result ? "Scanner le billet suivant" : "Démarrer la caméra"}
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    <div id="reader" className="overflow-hidden rounded-xl border-2 border-zinc-800 bg-black max-w-sm mx-auto shadow-inner">
                        {/* HTML5 QR Code va s'injecter ici */}
                    </div>

                    <button
                        onClick={() => {
                            setScanning(false);
                            setResult(null);
                        }}
                        className="w-full py-2.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                    >
                        Arrêter la caméra
                    </button>
                </div>
            )}

            {/* Result Overlay */}
            {processing && !result && (
                <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-2xl">
                    <Loader2 className="animate-spin text-white mb-4" size={40} />
                    <p className="font-medium text-white">Vérification...</p>
                </div>
            )}

            {result && (
                <div
                    className={`mt-6 p-6 rounded-xl border text-center animate-in fade-in zoom-in-95 duration-200 ${result.success
                        ? "bg-emerald-950/40 border-emerald-900/50 text-emerald-400"
                        : "bg-red-950/40 border-red-900/50 text-red-400"
                        }`}
                >
                    <div className="flex justify-center mb-3">
                        {result.success ? <CheckCircle size={40} /> : <XCircle size={40} />}
                    </div>
                    {result.guestName && (
                        <h4 className={`text-xl font-bold mb-1 ${result.success ? "text-emerald-300" : "text-red-300"}`}>
                            {result.guestName}
                        </h4>
                    )}
                    <p className="font-medium text-lg">{result.message}</p>
                </div>
            )}
        </div>
    );
}
