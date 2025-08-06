'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import Image from 'next/image';

export default function GlobalLoading() {
  // Fade‑out state
  const [fadeOut, setFadeOut] = useState(false);

  // Trigger fade‑out shortly after mount
  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 500); // wait a bit longer for logo vibe
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div
        className={clsx(
          'fixed inset-0 z-50 flex items-center justify-center',
          'bg-gradient-to-br from-red-600 via-red-400 to-blue-500',
          'animate-hero-bg transition-opacity duration-500',
          fadeOut && 'opacity-0 pointer-events-none'
        )}
      >
        <Image
          src="/logo2.png"
          alt="Loading logo"
          width={160}
          height={160}
          priority
          className="w-32 sm:w-40 lg:w-48 h-auto drop-shadow-lg animate-[float_6s_ease-in-out_infinite]"
        />
      </div>

      {/* ---- Animations (global) --------------------------------------------- */}
      <style jsx global>{`
        /* Floating animation for logo */
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-25px); }
        }
        /* Animated hero gradient background */
        @keyframes heroBg {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-hero-bg {
          background-size: 300% 300%;
          animation: heroBg 12s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
