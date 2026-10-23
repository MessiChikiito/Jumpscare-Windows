import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { ChromaKeyRenderer } from '../services/chromaKeyRenderer';

export interface ScarePlaybackConfig {
  src: string;
  name: string;
  mediaType?: 'video' | 'audio';
  duration: number;
  /** Volumen final ya combinado (0 a 1) */
  volume: number;
  speed: number;
  chromaKeyEnabled: boolean;
  chromaKeyTolerance: number;
  chromaKeySmoothness: number;
  /** Amplificación del audio en % (100 = normal, hasta 500) */
  volumeBoost: number;
  panicKey: string;
}

interface ScareStageProps {
  config: ScarePlaybackConfig;
  onFinished: () => void;
}

export const ScareStage: React.FC<ScareStageProps> = ({ config, onFinished }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const finishedRef = useRef(false);
  const onFinishedRef = useRef(onFinished);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  const glRef = useRef<ChromaKeyRenderer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioGainRef = useRef<GainNode | null>(null);

  const [webglFailed, setWebglFailed] = useState(false);

  const isAudio = config.mediaType === 'audio';
  const useChroma = config.chromaKeyEnabled && !isAudio;

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinishedRef.current();
  }, []);

  // Renderizador de chroma key (mismo motor que usa la vista previa)
  useEffect(() => {
    if (isAudio) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new ChromaKeyRenderer(canvas);

    if (!renderer.isReady) {
      setWebglFailed(true);
      return;
    }

    glRef.current = renderer;

    return () => {
      renderer.dispose();
      glRef.current = null;
    };
  }, [isAudio]);

  // Amplificación de audio (Web Audio): permite pasar del 100% sin distorsionar
  // gracias a un limitador dinámico al final de la cadena.
  const boostEnabled = Math.min(5, Math.max(1, config.volumeBoost / 100)) > 1.001;

  useEffect(() => {
    const mediaEl = isAudio ? audioRef.current : videoRef.current;
    if (!mediaEl) return;

    // Sin amplificación se usa el audio nativo del elemento (más fiable).
    if (!boostEnabled) return;

    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) return;

    let context: AudioContext | null = null;
    let cancelled = false;

    const setup = async () => {
      try {
        context = new AudioContextCtor();
      } catch {
        context = null;
        return;
      }

      try {
        await context.resume();
      } catch {
        // Ignorado: si no arranca, se mantiene el audio nativo.
      }

      if (cancelled) return;

      if (context.state !== 'running') {
        // Enrutar por Web Audio con el contexto suspendido dejaría el susto en silencio:
        // es preferible perder la amplificación antes que el sonido.
        void context.close().catch(() => {});
        context = null;
        return;
      }

      try {
        const source = context.createMediaElementSource(mediaEl);
        const gain = context.createGain();
        const limiter = context.createDynamicsCompressor();

        gain.gain.value = Math.min(5, Math.max(1, config.volumeBoost / 100));
        limiter.threshold.value = -2;
        limiter.knee.value = 0;
        limiter.ratio.value = 12;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.25;

        source.connect(gain);
        gain.connect(limiter);
        limiter.connect(context.destination);

        audioContextRef.current = context;
        audioGainRef.current = gain;
      } catch {
        audioContextRef.current = null;
        audioGainRef.current = null;
      }
    };

    void setup();

    return () => {
      cancelled = true;
      audioContextRef.current = null;
      audioGainRef.current = null;
      if (context) void context.close().catch(() => {});
    };
  }, [isAudio, webglFailed, boostEnabled]);

  useEffect(() => {
    const gain = audioGainRef.current;
    if (gain) {
      gain.gain.value = Math.min(5, Math.max(1, config.volumeBoost / 100));
    }
    if (audioContextRef.current?.state === 'suspended') {
      void audioContextRef.current.resume().catch(() => {});
    }
  }, [config.volumeBoost]);

  const drawFrame = () => {
    const renderer = glRef.current;
    const videoEl = videoRef.current;

    if (!renderer || !videoEl) return;

    renderer.render(
      videoEl,
      {
        enabled: useChroma,
        tolerance: config.chromaKeyTolerance,
        smoothness: config.chromaKeySmoothness,
      },
      'contain'
    );
  };

  // Reproducción, bucle de render y cierre
  useEffect(() => {
    const mediaEl = isAudio ? audioRef.current : videoRef.current;
    if (!mediaEl) return;

    mediaEl.volume = Math.min(1, Math.max(0, config.volume));
    mediaEl.playbackRate = Math.min(5, Math.max(0.2, config.speed));
    if (audioContextRef.current?.state === 'suspended') {
      void audioContextRef.current.resume().catch(() => {});
    }

    const played = mediaEl.play();
    if (played && typeof played.catch === 'function') {
      played.catch(() => {
        // Un rechazo puntual (p. ej. AbortError) no debe cerrar el susto antes de tiempo.
        setTimeout(() => {
          if (!finishedRef.current && mediaEl.paused && mediaEl.error) finish();
        }, 1500);
      });
    }

    let cancelled = false;
    let animationFrameId: number | null = null;
    let videoFrameId: number | null = null;

    const videoEl = mediaEl as HTMLVideoElement & {
      requestVideoFrameCallback?: (callback: () => void) => number;
      cancelVideoFrameCallback?: (id: number) => void;
    };

    // Se dibuja justo cuando hay un frame nuevo de vídeo (sin pasar por rAF),
    // así la reproducción no se entrecorta ni se repiten movimientos.
    const scheduleNextFrame = () => {
      if (cancelled || finishedRef.current || isAudio || webglFailed) return;

      if (typeof videoEl.requestVideoFrameCallback === 'function') {
        videoFrameId = videoEl.requestVideoFrameCallback(() => {
          drawFrame();
          scheduleNextFrame();
        });
      } else {
        animationFrameId = requestAnimationFrame(() => {
          drawFrame();
          scheduleNextFrame();
        });
      }
    };

    if (!isAudio && !webglFailed) {
      drawFrame();
      scheduleNextFrame();
    }

    const handleEnded = () => finish();
    const handleError = () => finish();

    mediaEl.addEventListener('ended', handleEnded);
    mediaEl.addEventListener('error', handleError);

    // Red de seguridad: si el vídeo nunca dispara "ended", cerramos igualmente.
    const expectedMs = ((config.duration || 10) / Math.max(0.2, config.speed)) * 1000;
    const safetyTimer = setTimeout(() => finish(), Math.max(15000, expectedMs + 8000));

    return () => {
      cancelled = true;
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      if (videoFrameId !== null && typeof videoEl.cancelVideoFrameCallback === 'function') {
        videoEl.cancelVideoFrameCallback(videoFrameId);
      }
      clearTimeout(safetyTimer);
      mediaEl.removeEventListener('ended', handleEnded);
      mediaEl.removeEventListener('error', handleError);
      mediaEl.pause();
    };
  }, [config.volume, config.speed, config.duration, isAudio, webglFailed, finish]);

  // Tecla de pánico (la ventana de overlay también la captura de forma global)
  useEffect(() => {
    const panic = config.panicKey.toLowerCase();

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const code = event.code.toLowerCase();
      if (key === 'escape' || code === 'escape' || key === panic || code === panic) {
        event.preventDefault();
        finish();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [config.panicKey, finish]);

  if (isAudio) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-transparent">
        <audio ref={audioRef} src={config.src} autoPlay onEnded={finish} onError={finish} />
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-red-600/80 bg-black/40 shadow-[0_0_60px_#dc2626] animate-violent-shake">
            <Volume2 className="h-14 w-14 animate-pulse text-red-500" />
          </div>
        </div>
      </div>
    );
  }

  if (webglFailed) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-transparent">
        <video
          ref={videoRef}
          src={config.src}
          autoPlay
          playsInline
          onEnded={finish}
          onError={finish}
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-transparent">
      <video
        ref={videoRef}
        src={config.src}
        autoPlay
        playsInline
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
      />
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
};
