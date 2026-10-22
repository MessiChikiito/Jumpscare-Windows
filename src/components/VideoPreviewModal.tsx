import React, { useEffect, useRef, useState } from 'react';
import { X, Volume2, ShieldAlert, Sparkles } from 'lucide-react';
import { JumpscareVideo } from '../types';
import { soundEffects } from '../services/soundEffects';

interface VideoPreviewModalProps {
  video: JumpscareVideo | null;
  masterVolume: number;
  playbackSpeed?: number;
  onClose: () => void;
}

export const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({
  video,
  masterVolume,
  playbackSpeed = 1.0,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const [showExtracted, setShowExtracted] = useState<boolean>(true);

  useEffect(() => {
    if (!video) return;

    const effectiveVol = (masterVolume / 100) * (video.volume / 100);
    const effectiveSpeed = video.speed || playbackSpeed || 1.0;

    if (video.sourceType === 'builtin') {
      soundEffects.playFoxyScream(Math.min(0.3, effectiveVol * 0.3), 1.2, effectiveSpeed);
    } else if (videoRef.current) {
      videoRef.current.playbackRate = effectiveSpeed;
      videoRef.current.volume = Math.max(0, Math.min(1, effectiveVol));
      videoRef.current.play().catch(() => {});
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [video, masterVolume, playbackSpeed, onClose]);

  // Real-time Chroma Key canvas loop in preview modal
  useEffect(() => {
    if (!video || !video.chromaKeyEnabled || !showExtracted) return;

    const videoEl = videoRef.current;
    const canvas = canvasRef.current;
    if (!videoEl || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const tolerance = (video.chromaKeyTolerance ?? 42) / 100;
    const targetG = 255;
    const targetR = 0;
    const targetB = 0;

    let isCancelled = false;

    const renderLoop = () => {
      if (isCancelled || videoEl.paused || videoEl.ended) {
        if (!isCancelled && !videoEl.ended) {
          animFrameIdRef.current = requestAnimationFrame(renderLoop);
        }
        return;
      }

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

          const isGreenDominant = g > 70 && g > r * 1.25 && g > b * 1.25;
          const diff = Math.sqrt(
            Math.pow(r - targetR, 2) + Math.pow(g - targetG, 2) + Math.pow(b - targetB, 2)
          ) / 441.67;

          if (isGreenDominant || diff < tolerance) {
            frame.data[i * 4 + 3] = 0;
          }
        }
        ctx.putImageData(frame, 0, 0);
      }

      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    videoEl.onplay = () => {
      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isCancelled = true;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [video, showExtracted]);

  if (!video) return null;

  const effectiveVolPercent = Math.round((masterVolume / 100) * video.volume);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl rounded-xl border border-slate-800 bg-[#121927] overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-3.5 bg-slate-900/50">
          <div className="flex items-center gap-2 text-slate-200">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold truncate max-w-md">{video.name}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Media Preview Box */}
        <div className="relative aspect-video w-full bg-[#070b12] flex items-center justify-center overflow-hidden">
          {video.mediaType === 'audio' ? (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="h-16 w-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 shadow-[0_0_30px_#6366f1]">
                <Volume2 className="h-8 w-8 animate-pulse" />
              </div>
              <h4 className="text-base font-semibold text-slate-100 mb-1">{video.name}</h4>
              <p className="text-xs text-slate-400 mb-4">{video.description || 'Pista de sonido para susto'}</p>
              <audio
                src={video.src}
                controls
                autoPlay
                className="w-full max-w-sm rounded"
              />
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Checkerboard/dark backdrop for transparency verification */}
              {video.chromaKeyEnabled && showExtracted && (
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                  }}
                />
              )}

              {/* Source Video (always mounted for audio and frames) */}
              <video
                ref={videoRef}
                src={video.src}
                controls={!video.chromaKeyEnabled || !showExtracted}
                autoPlay
                loop
                playsInline
                className={`w-full h-full object-contain ${
                  video.chromaKeyEnabled && showExtracted ? 'hidden' : 'block'
                }`}
              />

              {/* Chroma Key Canvas */}
              {video.chromaKeyEnabled && (
                <canvas
                  ref={canvasRef}
                  className={`w-full h-full object-contain relative z-10 ${
                    showExtracted ? 'block' : 'hidden'
                  }`}
                />
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Info & Chroma Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 bg-[#0d131f] text-xs text-slate-400 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Volume2 className="h-3.5 w-3.5 text-slate-300" />
              Volumen: <strong className="text-slate-200 font-mono">{effectiveVolPercent}%</strong>
            </span>
            <span>·</span>
            <span>Duración: <strong className="text-slate-200 font-mono">{video.duration}s</strong></span>
          </div>

          <div className="flex items-center gap-2">
            {video.chromaKeyEnabled && (
              <button
                type="button"
                onClick={() => setShowExtracted(!showExtracted)}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800 rounded-lg transition-colors cursor-pointer"
              >
                <Sparkles className="h-3 w-3 text-emerald-400" />
                <span>{showExtracted ? 'Ver Verde Original' : 'Ver Fondo Transparente'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
