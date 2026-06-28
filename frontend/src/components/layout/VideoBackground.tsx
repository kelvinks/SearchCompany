"use client";

import { useEffect, useRef } from "react";

export default function VideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.defaultMuted = true;
      
      const playVideo = () => {
        video.play().catch((err) => {
          console.warn("Autoplay was prevented by browser policy. Retrying on user interaction...", err);
        });
      };

      playVideo();

      // Fallback: Play on first document user interaction if browser initially blocks it
      const handleInteraction = () => {
        if (video.paused) {
          playVideo();
        }
        document.removeEventListener("click", handleInteraction);
        document.removeEventListener("touchstart", handleInteraction);
      };

      document.addEventListener("click", handleInteraction);
      document.addEventListener("touchstart", handleInteraction);

      return () => {
        document.removeEventListener("click", handleInteraction);
        document.removeEventListener("touchstart", handleInteraction);
      };
    }
  }, []);

  return (
    <video
      ref={videoRef}
      loop
      muted
      playsInline
      className="absolute inset-0 w-full h-full object-cover z-0 opacity-15 pointer-events-none"
    >
      <source src="/CompanySearch.mp4" type="video/mp4" />
    </video>
  );
}
