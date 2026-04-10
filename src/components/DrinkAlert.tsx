"use client";

import { useEffect, useState } from "react";
import { DrinkNotification } from "@/types/game";

interface DrinkAlertProps {
  notification: DrinkNotification;
  myTeam: string;
  onDismiss: () => void;
}

export default function DrinkAlert({ notification, myTeam, onDismiss }: DrinkAlertProps) {
  const isForMe = notification.forTeam === myTeam;
  const [visible, setVisible] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => dismiss(), 9000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    setClosing(true);
    setTimeout(() => { setVisible(false); onDismiss(); }, 300);
  }

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-6 transition-opacity duration-300 ${closing ? "opacity-0" : "opacity-100"}`}
      style={{ background: isForMe ? "rgba(60,0,0,0.85)" : "rgba(0,40,20,0.85)", backdropFilter: "blur(6px)" }}
    >
      <div
        className={`rounded-2xl p-8 text-center max-w-sm w-full border-2 relative overflow-hidden ${
          isForMe
            ? "bg-red-950 border-red-500 drink-shake"
            : "bg-emerald-950 border-emerald-500"
        }`}
      >
        {/* Background glow */}
        <div
          className={`absolute inset-0 opacity-20 ${isForMe ? "bg-red-500" : "bg-emerald-500"}`}
          style={{ filter: "blur(40px)" }}
        />

        <div className="relative z-10">
          {isForMe ? (
            <>
              <div className="text-7xl mb-4 animate-drift">🍺</div>
              <p className="text-red-400 text-xs font-bold tracking-widest uppercase mb-2 animate-alert-flash">
                ⚠ Bateau coulé ⚠
              </p>
              <h2 className="text-2xl font-black text-white mb-1">
                {notification.shipName}
              </h2>
              <p className="text-red-300 text-sm mb-4">a été envoyé par le fond</p>

              {/* Shot count */}
              <div className="flex items-center justify-center gap-1 mb-4">
                {Array.from({ length: notification.shotsCount }).map((_, i) => (
                  <span key={i} className="text-3xl animate-drift" style={{ animationDelay: `${i * 0.15}s` }}>
                    🥃
                  </span>
                ))}
              </div>

              <p className="text-red-200 text-3xl font-black">
                {notification.shotsCount} SHOT{notification.shotsCount > 1 ? "S" : ""} À BOIRE !
              </p>
            </>
          ) : (
            <>
              <div className="text-7xl mb-4 animate-drift">💥</div>
              <p className="text-emerald-400 text-xs font-bold tracking-widest uppercase mb-2">
                Bateau coulé !
              </p>
              <h2 className="text-2xl font-black text-white mb-1">
                {notification.shipName}
              </h2>
              <p className="text-emerald-300 text-sm mb-4">ennemi détruit</p>
              <p className="text-emerald-200 text-lg font-bold">
                L&apos;adversaire doit boire{" "}
                <span className="text-3xl font-black text-white">
                  {notification.shotsCount}
                </span>{" "}
                shot{notification.shotsCount > 1 ? "s" : ""} 🥃
              </p>
            </>
          )}

          <button
            onClick={dismiss}
            className={`mt-6 px-10 py-3 rounded-xl font-black text-lg uppercase tracking-widest ${
              isForMe
                ? "bg-red-700 hover:bg-red-600 text-white active:bg-red-800"
                : "bg-emerald-700 hover:bg-emerald-600 text-white active:bg-emerald-800"
            }`}
          >
            {isForMe ? "On boit 🍻" : "Compris"}
          </button>
        </div>
      </div>
    </div>
  );
}
