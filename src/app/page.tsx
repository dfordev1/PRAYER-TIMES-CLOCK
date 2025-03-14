"use client";

import { useEffect } from "react";
import CircularPrayerTracker from "@/components/circular-prayer-tracker";
import { DynamicBackground } from "@/components/dynamic-background";
import { usePrayerTimesStore } from "@/lib/store";

export default function Home() {
  const { fetchLocation } = usePrayerTimesStore();

  useEffect(() => {
    // Initialize background service
    fetchLocation();
  }, [fetchLocation]);

  return (
    <main className="min-h-screen py-8 px-4 bg-white">
      {/* The circular prayer tracker will handle its own location detection */}
      <div className="max-w-4xl mx-auto">
        <CircularPrayerTracker />

        <footer className="mt-8 text-center text-xs text-gray-400">
          <p>© {new Date().getFullYear()} Prayer Times Visualization</p>
          <div className="mt-2">
            <a 
              href="http://qrn.im" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="premium-link"
            >
              Visit Quran App | qrn.im
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
