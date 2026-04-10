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
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setShow(false);
      onDismiss();
    }, 8000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
      <div
        className={`rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl border-2 ${
          isForMe
            ? "bg-red-900 border-red-500"
            : "bg-emerald-900 border-emerald-500"
        }`}
      >
        <div className="text-6xl mb-4">{isForMe ? "🍺" : "💥"}</div>

        {isForMe ? (
          <>
            <h2 className="text-2xl font-black text-red-200 mb-2">COULÉ !</h2>
            <p className="text-red-300 text-lg mb-1">
              Votre <span className="font-bold text-white">{notification.shipName}</span> a été coulé
            </p>
            <p className="text-red-200 text-5xl font-black my-4">
              {notification.shotsCount}
            </p>
            <p className="text-red-300 text-xl font-bold">
              shot{notification.shotsCount > 1 ? "s" : ""} à boire !
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-black text-emerald-200 mb-2">COULÉ !</h2>
            <p className="text-emerald-300 text-lg">
              Vous avez coulé le{" "}
              <span className="font-bold text-white">{notification.shipName}</span>
            </p>
            <p className="text-emerald-300 mt-2">
              L'adversaire doit boire{" "}
              <span className="font-black text-white text-2xl">
                {notification.shotsCount}
              </span>{" "}
              shot{notification.shotsCount > 1 ? "s" : ""}
            </p>
          </>
        )}

        <button
          onClick={() => { setShow(false); onDismiss(); }}
          className={`mt-6 px-8 py-3 rounded-xl font-bold text-lg ${
            isForMe
              ? "bg-red-600 hover:bg-red-500 text-white"
              : "bg-emerald-600 hover:bg-emerald-500 text-white"
          }`}
        >
          OK
        </button>
      </div>
    </div>
  );
}
