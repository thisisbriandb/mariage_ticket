"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { PDFDocument } from "pdf-lib";
import QRCode from "qrcode";
import { Loader2, Download, CheckCircle, Ticket } from "lucide-react";

export default function QRGenerator() {
    const [guestName, setGuestName] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!guestName.trim()) return;

        setLoading(true);
        setSuccess(null);
        setError(null);

        try {
            // 1. Insert into Supabase
            const { data, error: dbError } = await supabase
                .from("tickets")
                .insert({ guest_name: guestName.trim() })
                .select()
                .single();

            if (dbError) throw new Error("Erreur base de données: " + dbError.message);
            if (!data) throw new Error("Aucune donnée retournée");

            const ticketId = data.id;

            // 2. Generate QR Code
            const qrCodeDataUrl = await QRCode.toDataURL(ticketId, {
                width: 300,
                margin: 2,
                color: {
                    dark: "#000000",
                    light: "#FFFFFF",
                },
            });

            // 3. Load PDF
            const pdfResponse = await fetch("/Billet d'invitation.pdf");
            if (!pdfResponse.ok) throw new Error("Impossible de charger le modèle de PDF");
            const pdfArrayBuffer = await pdfResponse.arrayBuffer();
            const pdfDoc = await PDFDocument.load(pdfArrayBuffer);

            // 4. Embed QR code
            const qrImage = await pdfDoc.embedPng(qrCodeDataUrl);

            // 5. Get/create 2nd page
            const pages = pdfDoc.getPages();
            const secondPage = pages.length > 1 ? pages[1] : pdfDoc.addPage();

            // 6. Draw on PDF (Bottom center)
            const { width } = secondPage.getSize();
            const qrSize = 120;
            const x = width / 2 - qrSize / 2;
            const y = 20; // Lowered from 50 to 20 to avoid hiding the text

            secondPage.drawImage(qrImage, {
                x,
                y,
                width: qrSize,
                height: qrSize,
            });

            // 7. Save & Download
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `Invitation_${guestName.replace(/\s+/g, "_")}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setSuccess(`Billet généré avec succès pour ${guestName}`);
            setGuestName("");
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Une erreur est survenue lors de la génération");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-indigo-500/10 p-2.5 rounded-xl">
                    <Ticket className="text-indigo-400" size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-semibold text-white">Créer un billet</h3>
                    <p className="text-zinc-400 text-sm mt-0.5">Génère un PDF avec QR code unique</p>
                </div>
            </div>

            {error && (
                <div className="p-4 mb-6 text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl">
                    {error}
                </div>
            )}

            {success && (
                <div className="p-4 mb-6 text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 rounded-xl flex items-center gap-2">
                    <CheckCircle size={18} />
                    {success}
                </div>
            )}

            <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Nom de l'invité</label>
                    <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        required
                        className="block w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200"
                        placeholder="Ex: Jean Dupont"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || !guestName.trim()}
                    className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <Download size={18} />
                    )}
                    {loading ? "Génération..." : "Générer et télécharger le billet"}
                </button>
            </form>
        </div>
    );
}
