"use client";
// Prodejní režim běží jen v prohlížeči: stav (sklad, fronta prodejů) žije v telefonu.
import dynamic from "next/dynamic";

export const FairPosLoader = dynamic(() => import("./fair-pos").then((m) => m.FairPos), {
  ssr: false,
  loading: () => <p className="pl-note p-6">Načítám prodejní režim…</p>,
});
