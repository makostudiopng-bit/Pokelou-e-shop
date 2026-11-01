"use client";
// Lupa na obrázek karty: myší se ukáže zvětšený výřez, klik (nebo klepnutí na mobilu)
// otevře kartu přes celou obrazovku.
import Image from "next/image";
import { useRef, useState } from "react";

const LENS = 170; // průměr lupy v px
const ZOOM = 2.6;

export function CardZoom({ src, alt }: { src: string; alt: string }) {
  const box = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [lens, setLens] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  function move(e: React.PointerEvent) {
    if (e.pointerType !== "mouse" || !box.current) return;
    const r = box.current.getBoundingClientRect();
    setLens({ x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height });
  }

  return (
    <>
      <button
        ref={box}
        type="button"
        className="pl-zoom"
        onPointerMove={move}
        onPointerLeave={() => setLens(null)}
        onClick={() => dialog.current?.showModal()}
        aria-label={`Zvětšit obrázek: ${alt}`}
      >
        <Image src={src} alt={alt} width={630} height={880} sizes="(max-width: 640px) 80vw, 360px" priority className="h-auto w-full" />
        {lens && (
          <span
            aria-hidden="true"
            className="pl-zoom__lens"
            style={{
              width: LENS,
              height: LENS,
              left: lens.x - LENS / 2,
              top: lens.y - LENS / 2,
              backgroundImage: `url("${src}")`,
              backgroundSize: `${lens.w * ZOOM}px ${lens.h * ZOOM}px`,
              backgroundPosition: `${-(lens.x * ZOOM - LENS / 2)}px ${-(lens.y * ZOOM - LENS / 2)}px`,
            }}
          />
        )}
        <span className="pl-zoom__hint" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5M11 8v6M8 11h6" />
          </svg>
          Zvětšit
        </span>
      </button>

      <dialog
        ref={dialog}
        className="pl-zoom__dialog"
        aria-label={alt}
        // klik na tmavé pozadí zavře
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      >
        <Image src={src} alt={alt} width={630} height={880} sizes="(max-width: 640px) 100vw, 640px" className="pl-zoom__big" />
        <button type="button" className="pl-zoom__close" onClick={() => dialog.current?.close()} aria-label="Zavřít">
          ×
        </button>
      </dialog>
    </>
  );
}
