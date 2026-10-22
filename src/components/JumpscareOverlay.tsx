import React, { useEffect, useState, useRef } from 'react';
import { JumpscareVideo } from '../types';
import { AlertOctagon, Volume2 } from 'lucide-react';

interface JumpscareOverlayProps {
  video: JumpscareVideo;
  masterVolume: number;
  playbackSpeed?: number;
  disableFlashingEffect?: boolean;
  fullscreen: boolean;
  panicKey: string;
  onFinished: () => void;
}

export const JumpscareOverlay: React.FC<JumpscareOverlayProps> = ({
  video,
  masterVolume,
  playbackSpeed = 1.0,
  fullscreen,
  panicKey,
  onFinished,
}) => {
  const videoElemRef = useRef<HTMLVideoElement>(null);
  const audioElemRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const finishedRef = useRef(false);

  const isAudioOnly = video.mediaType === 'audio';
  const effectiveVol = (masterVolume / 100) * (video.volume / 100);
  const effectiveSpeed = Math.min(5.0, Math.max(0.2, video.speed || playbackSpeed || 1.0));

  const handleClose = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
    }

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    onFinished();
  };

  // Real-time Chroma Key canvas loop for green screen video removal
  useEffect(() => {
    if (isAudioOnly || !video.chromaKeyEnabled) return;

    const videoEl = videoElemRef.current;
    const canvas = canvasRef.current;
    if (!videoEl || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const tolerance = (video.chromaKeyTolerance ?? 42) / 100;
    const targetG = 255;
    const targetR = 0;
    const targetB = 0;

    let isCancelled = false;

    const renderFrame = () => {
      if (isCancelled || finishedRef.current || videoEl.paused || videoEl.ended) return;

      if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
        if (canvas.width !== videoEl.videoWidth || canvas.height !== videoEl.videoHeight) {
          canvas.width = videoEl.videoWidth;
          canvas.height = videoEl.videoHeight;
        }

        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const l = frame.data.length / 4;

        for (let i = 0; i < l; i++) {
          const r = frame.data[i * 4 + 0];
          const g = frame.data[i * 4 + 1];
          const b = frame.data[i * 4 + 2];

          // Green screen detection: dominant green or Euclidean distance
          const isGreenDominant = g > 70 && g > r * 1.22 && g > b * 1.22;
          const diff = Math.sqrt(
            Math.pow(r - targetR, 2) + Math.pow(g - targetG, 2) + Math.pow(b - targetB, 2)
          ) / 441.67;

          if (isGreenDominant || diff < tolerance) {
            frame.data[i * 4 + 3] = 0; // Transparent
          }
        }
        ctx.putImageData(frame, 0, 0);
      }

      animFrameIdRef.current = requestAnimationFrame(renderFrame);
    };

    videoEl.onplay = () => {
      animFrameIdRef.current = requestAnimationFrame(renderFrame);
    };

    return () => {
      isCancelled = true;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [video, isAudioOnly]);

  // Main playback, speed, and safety timeout
  useEffect(() => {
    // Attempt fullscreen if configured
    if (fullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }

    // Emergency keyboard listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' ||
        e.code === 'Escape' ||
        e.key.toLowerCase() === panicKey.toLowerCase() ||
        e.code.toLowerCase() === panicKey.toLowerCase()
      ) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });

    if (isAudioOnly) {
      // Audio element playback
      if (audioElemRef.current) {
        audioElemRef.current.playbackRate = effectiveSpeed;
        audioElemRef.current.volume = Math.max(0, Math.min(1, effectiveVol));
        audioElemRef.current.play().catch(() => {});
      }
    } else {
      // Video element playback
      if (videoElemRef.current) {
        videoElemRef.current.playbackRate = effectiveSpeed;
        videoElemRef.current.volume = Math.max(0, Math.min(1, effectiveVol));
        videoElemRef.current.play().catch(() => {});
      }
    }

    // Auto-close timeout based on duration / speed
    const calculatedDuration = Math.max(0.5, (video.duration || 2.5) / effectiveSpeed);
    const timer = setTimeout(() => {
      handleClose();
    }, calculatedDuration * 1000 + 100);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [video, masterVolume, fullscreen, panicKey, effectiveSpeed, isAudioOnly, effectiveVol]);

  return (
    <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-black overflow-hidden select-none cursor-none">
      {/* Emergency Esc notice banner */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2 bg-black/80 px-3 py-1.5 rounded-full border border-red-500/40 text-[11px] font-mono text-red-300">
        <AlertOctagon className="h-3.5 w-3.5 text-red-500" />
        <span>Presiona [ESC] para salir inmediatamente</span>
        {effectiveSpeed !== 1.0 && (
          <span className="ml-1 text-amber-400 font-bold">({effectiveSpeed.toFixed(1)}x)</span>
        )}
      </div>

      {/* Media Rendering */}
      {isAudioOnly ? (
        /* Audio Only Jumpscare */
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-black p-6">
          <audio
            ref={audioElemRef}
            src={video.src}
            autoPlay
            onEnded={handleClose}
          />
          {video.thumbnail ? (
            <img
              src={video.thumbnail}
              alt={video.name}
              className="max-h-[70vh] object-contain rounded-xl shadow-2xl animate-violent-shake"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center animate-violent-shake">
              <div className="h-28 w-28 rounded-full bg-red-950/60 border-2 border-red-600 flex items-center justify-center mb-6 shadow-[0_0_60px_#dc2626]">
                <Volume2 className="h-14 w-14 text-red-500 animate-pulse" />
              </div>
              <h2 className="text-3xl font-black font-mono text-red-500 tracking-wider">
                {video.name.toUpperCase()}
              </h2>
              <span className="text-xs font-mono text-red-400/80 mt-2">
                [ ALARIDO EN REPRODUCCIÓN A {effectiveSpeed.toFixed(1)}x ]
              </span>
            </div>
          )}
        </div>
      ) : video.chromaKeyEnabled ? (
        /* Chroma Key Green Screen Removal mode */
        <div className="relative w-full h-full flex items-center justify-center bg-transparent">
          {/* Simulated gaming backdrop behind the green-screen extracted monster */}
          <div className="absolute inset-0 z-0 bg-neutral-950 opacity-90 flex items-center justify-center">
            <div className="text-center font-mono text-xs text-neutral-600 select-none">
              [ JUEGO ACTIVO // SUPERPOSICIÓN CHROMA KEY TRANSPARENTE ]
            </div>
          </div>

          {/* Hidden source video element playing audio and feeding canvas */}
          <video
            ref={videoElemRef}
            src={video.src}
            autoPlay
            playsInline
            onEnded={handleClose}
            className="hidden"
          />

          {/* Canvas displaying extracted monster without green background */}
          <canvas
            ref={canvasRef}
            className="relative z-10 w-full h-full object-contain animate-violent-shake"
          />
        </div>
      ) : (
        /* Standard Video element */
        <video
          ref={videoElemRef}
          src={video.src}
          autoPlay
          playsInline
          onEnded={handleClose}
          className="w-full h-full object-cover animate-violent-shake"
        />
      )}
    </div>
  );
};
