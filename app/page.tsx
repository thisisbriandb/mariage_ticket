"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
      <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
      <p className="text-zinc-500 text-sm font-medium">Chargement de l'application...</p>
    </div>
  );
}
