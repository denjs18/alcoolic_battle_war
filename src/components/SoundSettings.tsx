"use client";

import { useState, useEffect } from "react";
import { gameAudio, SoundPreset } from "@/lib/sounds";

export default function SoundSettings() {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<SoundPreset>("all");

  useEffect(() => {
    if (gameAudio) setPreset(gameAudio.preset);
  }, []);

  function choose(p: SoundPreset) {
    setPreset(p);
    gameAudio?.setPreset(p);
    setOpen(false);
  }

  const options: { value: SoundPreset; icon: string; label: string; sub: string }[] = [
    { value: "all",     icon: "🔊", label: "Tout",          sub: "Musique + effets" },
    { value: "effects", icon: "💥", label: "Effets seuls",  sub: "Sans musique"     },
    { value: "music",   icon: "🎵", label: "Musique seule", sub: "Sans effets"      },
    { value: "none",    icon: "🔇", label: "Silence",       sub: "Tout désactivé"   },
  ];

  const current = options.find((o) => o.value === preset)!;

  return (
    <div className="relative">
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800/80 border border-slate-700 text-lg"
        title="Son"
      >
        {current.icon}
      </button>

      {/* Popover */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-11 z-50 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 px-3 pt-3 pb-1">
              Son
            </p>
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => choose(opt.value)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  preset === opt.value
                    ? "bg-cyan-900/50 text-cyan-300"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <span className="text-xl w-7 text-center">{opt.icon}</span>
                <span>
                  <p className="text-sm font-bold leading-tight">{opt.label}</p>
                  <p className="text-xs text-slate-500">{opt.sub}</p>
                </span>
                {preset === opt.value && (
                  <span className="ml-auto text-cyan-400 text-xs">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
