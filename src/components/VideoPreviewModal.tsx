import React, { useEffect, useRef, useState } from 'react';
import { X, Volume2, ShieldAlert, Sparkles } from 'lucide-react';
import { JumpscareVideo } from '../types';
import { soundEffects } from '../services/soundEffects';
import { ChromaKeyRenderer } from '../services/chromaKeyRenderer';

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
  const audioElRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioGraphRef = useRef<{ element: HTMLMediaElement; context: AudioContext; gain: GainNode } | null>(
    null
  );
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

  // Amplificación de audio (misma cadena que en el susto real)
  useEffect(() => {
    const element = video?.mediaType === 'audio' ? audioElRef.current : videoRef.current;
    if (!video || !element) return;

    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) return;

    let graph = audioGraphRef.current;

    if (!graph || graph.element !== element) {
      if (graph) void graph.context.close().catch(() => {});

      try {
        const context = new AudioContextCtor();
        const source = context.createMediaElementSource(element);
        const gain = context.createGain();
        const limiter = context.createDynamicsCompressor();

        limiter.threshold.value = -3;
        limiter.knee.value = 0;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.25;

        source.connect(gain);
        gain.connect(limiter);
        limiter.connect(context.destination);

        graph = { element, context, gain };
        audioGraphRef.current = graph;
      } catch {
        return;
      }
    }

    graph.gain.gain.value = Math.min(5, Math.max(1, (video.volumeBoost ?? 300) / 100));
    void graph.context.resume().catch(() => {});
  }, [video?.id, video?.volumeBoost, video?.mediaType]);

  useEffect(
    () => () => {
      if (audioGraphRef.current) {
        void audioGraphRef.current.context.close().catch(() => {});
        audioGraphRef.current = null;
      }
    },
    []
  );

  // Chroma key con el MISMO motor que el susto real (WebGL): misma tolerancia y mismo suavizado.
  useEffect(() => {
    if (!video || !video.chromaKeyEnabled || !showExtracted) return;

    const videoEl = videoRef.current;
    const canvas = canvasRef.current;
    if (!videoEl || !canvas) return;

    const renderer = new ChromaKeyRenderer(canvas);
    if (!renderer.isReady) return;

    const settings = {
      enabled: true,
      tolerance: video.chromaKeyTolerance ?? 42,
      smoothness: video.chromaKeySmoothness ?? 25,
    };

    let cancelled = false;
    let animationFrameId: number | null = null;
    let videoFrameId: number | null = null;

    const frameVideo = videoEl as HTMLVideoElement & {
      requestVideoFrameCallback?: (callback: () => void) => number;
      cancelVideoFrameCallback?: (id: number) => void;
    };

    const draw = () => {
      if (cancelled) return;
      renderer.render(videoEl, settings, 'contain');
    };

    const scheduleNextFrame = () => {
      if (cancelled) return;

      if (typeof frameVideo.requestVideoFrameCallback === 'function') {
        videoFrameId = frameVideo.requestVideoFrameCallback(() => {
          draw();
          scheduleNextFrame();
        });
      } else {
        animationFrameId = requestAnimationFrame(() => {
          draw();
          scheduleNextFrame();
        });
      }
    };

    draw();
    scheduleNextFrame();

    return () => {
      cancelled = true;
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      if (videoFrameId !== null && typeof frameVideo.cancelVideoFrameCallback === 'function') {
        frameVideo.cancelVideoFrameCallback(videoFrameId);
      }
      renderer.dispose();
    };
  }, [
    video?.id,
    video?.chromaKeyEnabled,
    video?.chromaKeyTolerance,
    video?.chromaKeySmoothness,
    showExtracted,
  ]);

  if (!video) return null;

  const effectiveVolPercent = Math.round(
    (masterVolume / 100) * video.volume * ((video.volumeBoost ?? 300) / 100)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl rounded-xl border border-slate-800 bg-[#121927] overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-3.5 bg-slate-900/50">
          <div className="flex items-center gap-2 text-slate-200 min-w-0">
            <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
            <div className="min-w-0">
              <span className="text-sm font-semibold truncate block max-w-md">{video.name}</span>
              {video.fileName && (
                <span className="text-[10px] font-mono text-slate-500 truncate block max-w-md">
                  {video.fileName}
                </span>
              )}
            </div>
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
                ref={audioElRef}
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

              {/* Source Video (siempre montado y reproduciendo para alimentar el canvas) */}
              <video
                ref={videoRef}
                src={video.src}
                controls={!video.chromaKeyEnabled || !showExtracted}
                autoPlay
                loop
                playsInline
                className={
                  video.chromaKeyEnabled && showExtracted
                    ? 'pointer-events-none absolute inset-0 h-full w-full opacity-0'
                    : 'relative h-full w-full object-contain'
                }
              />

              {/* Chroma Key Canvas (mismo render que el susto real) */}
              {video.chromaKeyEnabled && (
                <canvas
                  ref={canvasRef}
                  className={`h-full w-full object-contain relative z-10 ${
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

