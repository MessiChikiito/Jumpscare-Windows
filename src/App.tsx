/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppSettings, JumpscareVideo, SessionStats } from './types';
import { DEFAULT_VIDEOS } from './data/defaultVideos';
import { Header } from './components/Header';
import { LiveMonitor } from './components/LiveMonitor';
import { ModeSelector } from './components/ModeSelector';
import { VideoLibrary } from './components/VideoLibrary';
import { GameAndPlaybackSettings } from './components/GameAndPlaybackSettings';
import { JumpscareOverlay } from './components/JumpscareOverlay';
import { VideoPreviewModal } from './components/VideoPreviewModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { CodeExplorerModal } from './components/CodeExplorerModal';
import { downloadProjectZip } from './services/pythonProjectGenerator';
import { buildScarePayload } from './services/desktopBridge';
import { soundEffects } from './services/soundEffects';

const STORAGE_KEY = 'random_jumpscare_win11_config';

const INITIAL_SETTINGS: AppSettings = {
  mode: 'random',
  playbackSpeed: 1.0,
  disableFlashingEffect: true,
  fixedMinutes: 15,
  fixedSeconds: 0,
  randomMinMinutes: 5,
  randomMinSeconds: 0,
  randomMaxMinutes: 25,
  randomMaxSeconds: 0,
  checkIntervalSeconds: 60,
  probabilityPercent: 5.0,
  minCooldownSeconds: 180,
  initialDelaySeconds: 15,
  postScarePauseSeconds: 30,
  maxScaresPerSession: 0,
  masterVolume: 100,
  audioEnabled: true,
  targetDisplayId: '',
  fullscreen: true,
  panicKey: 'Escape',
  gameFilterEnabled: true,
  targetProcessName: 'javaw.exe',
  pauseTimerWhenGameClosed: true,
  preventConsecutiveRepetition: true,
};

const BANNED_POLYGON_IDS = new Set([
  'foxy_hallway_sprint',
  'foxy_peeking_door',
  'animatronic_glitch_scream',
]);

export default function App() {
  // Load settings with fallback
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...INITIAL_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // Ignored
    }
    return INITIAL_SETTINGS;
  });

  // Library of videos
  const [library, setLibrary] = useState<JumpscareVideo[]>(() => {
    try {
      const savedLib = localStorage.getItem(`${STORAGE_KEY}_library`);
      if (savedLib) {
        const parsed = JSON.parse(savedLib);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Remove old polygon clips and dead blob entries (los blob: no sobreviven al reinicio)
          const cleaned = parsed.filter(
            (v: JumpscareVideo) =>
              !BANNED_POLYGON_IDS.has(v.id) &&
              !(
                v.sourceType === 'custom_file' &&
                typeof v.src === 'string' &&
                v.src.startsWith('blob:')
              )
            )
            // Las entradas antiguas sin amplificación pasan a 300 % por defecto.
            .map((v: JumpscareVideo) => ({ ...v, volumeBoost: v.volumeBoost ?? 300 }));
          const existingIds = new Set(cleaned.map((v: JumpscareVideo) => v.id));
          const missingDefaults = DEFAULT_VIDEOS.filter((dv) => !existingIds.has(dv.id));
          return [...missingDefaults, ...cleaned];
        }
      }
    } catch {
      // Ignored
    }
    return DEFAULT_VIDEOS;
  });

  // Session and engine state
  const [stats, setStats] = useState<SessionStats>({
    scaresTriggered: 0,
    sessionStartTime: null,
    lastScareTime: null,
    lastScareName: null,
    nextScheduledTime: null,
    nextCheckTime: null,
    systemState: 'idle',
    gameDetected: true, // Default to true so user can immediately test
    probabilityRolls: 0,
    lastRollPercent: null,
    lastRollHit: false,
  });

  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [activeScareVideo, setActiveScareVideo] = useState<JumpscareVideo | null>(null);
  const [inPageScare, setInPageScare] = useState<boolean>(false);
  const [previewVideo, setPreviewVideo] = useState<JumpscareVideo | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<JumpscareVideo | null>(null);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState<boolean>(false);

  const lastVideoIdRef = useRef<string | null>(null);

  // Save settings on update
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignored
    }
  }, [settings]);

  // Save library on update
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_library`, JSON.stringify(library));
    } catch {
      // Ignored
    }
  }, [library]);

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  // Video selector with anti-consecutive repetition rule
  const selectNextVideo = useCallback((): JumpscareVideo | null => {
    const enabledVideos = library.filter((v) => v.enabled);
    if (enabledVideos.length === 0) return null;

    if (
      settings.preventConsecutiveRepetition &&
      enabledVideos.length > 1 &&
      lastVideoIdRef.current
    ) {
      const eligible = enabledVideos.filter((v) => v.id !== lastVideoIdRef.current);
      if (eligible.length > 0) {
        const chosen = eligible[Math.floor(Math.random() * eligible.length)];
        lastVideoIdRef.current = chosen.id;
        return chosen;
      }
    }

    const chosen = enabledVideos[Math.floor(Math.random() * enabledVideos.length)];
    lastVideoIdRef.current = chosen.id;
    return chosen;
  }, [library, settings.preventConsecutiveRepetition]);

  // Trigger jumpscare
  const triggerJumpscare = useCallback(
    (videoToPlay?: JumpscareVideo): boolean => {
      const video = videoToPlay || selectNextVideo();
      if (!video) return false;

      setActiveScareVideo(video);
      setStats((prev) => ({
        ...prev,
        scaresTriggered: prev.scaresTriggered + 1,
        lastScareTime: Date.now(),
        lastScareName: video.name,
        systemState: 'running',
      }));

      const foxy = window.foxy;
      if (!foxy) {
        // Navegador: overlay dentro de la propia página.
        setInPageScare(true);
        return true;
      }

      setInPageScare(false);
      void (async () => {
        try {
          const payload = await buildScarePayload(video, settings);
          await foxy.showScare(payload);
        } catch {
          // Si la ventana de overlay falla, el susto se muestra dentro de la app.
          setInPageScare(true);
        }
      })();

      return true;
    },
    [selectNextVideo, settings]
  );

  // Compute next interval based on mode (en segundos, admite fracciones)
  const getNextDuration = useCallback(() => {
    if (settings.mode === 'fixed') {
      return settings.fixedMinutes * 60 + settings.fixedSeconds;
    } else if (settings.mode === 'random') {
      const minSec = settings.randomMinMinutes * 60 + settings.randomMinSeconds;
      const maxSec = settings.randomMaxMinutes * 60 + settings.randomMaxSeconds;
      const safeMin = Math.max(1, minSec);
      const safeMax = Math.max(safeMin + 1, maxSec);
      // Precisión de milisegundos dentro del rango
      return safeMin + Math.random() * (safeMax - safeMin);
    } else {
      // Mode 3: Probability check cycle
      return Math.max(1, settings.checkIntervalSeconds);
    }
  }, [settings]);

  /* ------------------------------------------------------------------ *
   * Motor de tiempos preciso
   * Usa una fecha límite absoluta (deadlineRef) en lugar de contar ticks,
   * así no acumula deriva y dispara con precisión de ~100 ms.
   * ------------------------------------------------------------------ */
  const statsRef = useRef(stats);
  const settingsRef = useRef(settings);
  const triggerRef = useRef(triggerJumpscare);
  const getNextDurationRef = useRef(getNextDuration);
  const deadlineRef = useRef<number | null>(null);
  const remainingMsRef = useRef(0);
  const deadlineTimeoutRef = useRef<number | null>(null);
  const engineTickRef = useRef<() => void>(() => {});

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    triggerRef.current = triggerJumpscare;
  }, [triggerJumpscare]);

  useEffect(() => {
    getNextDurationRef.current = getNextDuration;
  }, [getNextDuration]);

  const clearDeadlineTimeout = () => {
    if (deadlineTimeoutRef.current !== null) {
      window.clearTimeout(deadlineTimeoutRef.current);
      deadlineTimeoutRef.current = null;
    }
  };

  // Programa el disparo exacto (no depende del sondeo de 100 ms del temporizador visual).
  const scheduleDeadlineTimeout = (ms: number) => {
    clearDeadlineTimeout();
    deadlineTimeoutRef.current = window.setTimeout(() => {
      deadlineTimeoutRef.current = null;
      engineTickRef.current();
    }, Math.max(0, ms) + 2);
  };

  const armTimer = useCallback((seconds: number) => {
    const ms = Math.max(0, Math.round(seconds * 1000));
    remainingMsRef.current = ms;
    deadlineRef.current = Date.now() + ms;
    setSecondsRemaining(ms >= 10000 ? Math.ceil(ms / 1000) : Math.round(ms / 100) / 10);
    scheduleDeadlineTimeout(ms);
  }, []);

  const disarmTimer = useCallback(() => {
    clearDeadlineTimeout();
    deadlineRef.current = null;
    remainingMsRef.current = 0;
    setSecondsRemaining(0);
  }, []);

  const freezeTimer = useCallback(() => {
    clearDeadlineTimeout();
    if (deadlineRef.current !== null) {
      remainingMsRef.current = Math.max(0, deadlineRef.current - Date.now());
      deadlineRef.current = null;
    }
  }, []);

  // Si cambias la frecuencia de comprobación en Modo 3, la nueva cuenta empieza ya.
  const activeScareRef = useRef<JumpscareVideo | null>(activeScareVideo);
  const lastCheckIntervalRef = useRef(settings.checkIntervalSeconds);

  useEffect(() => {
    activeScareRef.current = activeScareVideo;
  }, [activeScareVideo]);

  useEffect(() => {
    const changed = lastCheckIntervalRef.current !== settings.checkIntervalSeconds;
    lastCheckIntervalRef.current = settings.checkIntervalSeconds;

    if (!changed || settings.mode !== 'probability') return;
    if (statsRef.current.systemState !== 'running' || activeScareRef.current) return;

    deadlineRef.current = Date.now() + Math.max(1, settings.checkIntervalSeconds) * 1000;
    remainingMsRef.current = Math.max(1, settings.checkIntervalSeconds) * 1000;
    setSecondsRemaining(
      settings.checkIntervalSeconds >= 10
        ? Math.ceil(settings.checkIntervalSeconds)
        : Math.round(settings.checkIntervalSeconds * 10) / 10
    );
    scheduleDeadlineTimeout(remainingMsRef.current);
  }, [settings.checkIntervalSeconds, settings.mode]);

  const resumeTimer = useCallback(() => {
    const ms = remainingMsRef.current;
    deadlineRef.current = Date.now() + Math.max(0, ms);
    setSecondsRemaining(ms >= 10000 ? Math.ceil(ms / 1000) : Math.round(ms / 100) / 10);
    scheduleDeadlineTimeout(Math.max(0, ms));
  }, []);

  // Start engine
  const handleToggleStart = () => {
    soundEffects.playClick();
    if (stats.systemState === 'idle') {
      const initialDelay = settings.initialDelaySeconds;
      setStats((prev) => ({
        ...prev,
        sessionStartTime: Date.now(),
        systemState: 'running',
        scaresTriggered: 0,
        probabilityRolls: 0,
        lastRollPercent: null,
        lastRollHit: false,
      }));
      armTimer(initialDelay > 0 ? initialDelay : getNextDuration());
    } else {
      // Stop
      setStats((prev) => ({
        ...prev,
        systemState: 'idle',
      }));
      disarmTimer();
      setActiveScareVideo(null);
      setInPageScare(false);
      void window.foxy?.closeScare();
    }
  };

  // Pause engine
  const handleTogglePause = () => {
    soundEffects.playClick();
    const willPause = stats.systemState !== 'paused';

    setStats((prev) => ({
      ...prev,
      systemState: prev.systemState === 'paused' ? 'running' : 'paused',
    }));

    if (willPause) freezeTimer();
    else resumeTimer();
  };

  // Immediate scare test
  const handleTestScare = () => {
    soundEffects.playClick();
    triggerJumpscare();
  };

  // Finished scare callback
  const handleScareFinished = () => {
    setActiveScareVideo(null);
    setInPageScare(false);

    // Check session limit
    if (
      settings.maxScaresPerSession > 0 &&
      stats.scaresTriggered >= settings.maxScaresPerSession
    ) {
      setStats((prev) => ({ ...prev, systemState: 'idle' }));
      disarmTimer();
      return;
    }

    // Post-scare pause if configured
    if (settings.postScarePauseSeconds > 0) {
      setStats((prev) => ({ ...prev, systemState: 'cooling_down' }));
      armTimer(settings.postScarePauseSeconds);
    } else {
      setStats((prev) => ({ ...prev, systemState: 'running' }));
      armTimer(getNextDuration());
    }
  };


  // La ventana de overlay avisa cuando el susto termina (vídeo finalizado o tecla de pánico).
  const scareFinishedRef = useRef(handleScareFinished);

  useEffect(() => {
    scareFinishedRef.current = handleScareFinished;
  }, [handleScareFinished]);

  useEffect(() => {
    const foxy = window.foxy;
    if (!foxy) return;

    return foxy.onScareFinished(() => {
      setInPageScare(false);
      scareFinishedRef.current();
    });
  }, []);

  // Bucle del motor: revisa la fecha límite cada 100 ms (precisión ~0,1 s, sin deriva)
  useEffect(() => {
    const tick = () => {
      const current = statsRef.current;
      const cfg = settingsRef.current;

      if (current.systemState === 'idle' || current.systemState === 'paused') return;
      if (current.systemState === 'waiting_for_game') {
        // Si el juego vuelve a estar abierto, se reanuda exactamente donde quedó.
        const stillWaiting =
          cfg.gameFilterEnabled && !current.gameDetected && cfg.pauseTimerWhenGameClosed;
        if (stillWaiting) return;

        setStats((prev) =>
          prev.systemState === 'waiting_for_game' ? { ...prev, systemState: 'running' } : prev
        );
        resumeTimer();
        return;
      }

      // Filtro de juego: congela el tiempo mientras el proceso no exista.
      const shouldWait =
        cfg.gameFilterEnabled && !current.gameDetected && cfg.pauseTimerWhenGameClosed;

      if (shouldWait) {
        freezeTimer();
        setStats((prev) =>
          prev.systemState === 'waiting_for_game' ? prev : { ...prev, systemState: 'waiting_for_game' }
        );
        return;
      }

      if (deadlineRef.current === null) return;

      const remainingMs = deadlineRef.current - Date.now();
      const remainingSec = remainingMs / 1000;
      // Bajo 10 s mostramos décimas para que se note la precisión.
      const displaySeconds =
        remainingSec >= 10
          ? Math.ceil(remainingSec)
          : Math.max(0, Math.round(remainingSec * 10) / 10);
      setSecondsRemaining((prev) => (prev === displaySeconds ? prev : displaySeconds));

      if (remainingMs > 0) return;

      // --- Se cumplió el tiempo ---
      deadlineRef.current = null;
      clearDeadlineTimeout();

      if (current.systemState === 'cooling_down') {
        setStats((prev) => ({ ...prev, systemState: 'running' }));
        armTimer(getNextDurationRef.current());
        return;
      }

      if (cfg.mode === 'probability') {
        const cooldownMs = Math.max(0, cfg.minCooldownSeconds) * 1000;
        const cooldownEnd = (current.lastScareTime ?? 0) + cooldownMs;
        const now = Date.now();

        // En enfriamiento no gastamos tiradas: esperamos a que se cumpla el mínimo.
        if (current.lastScareTime && now < cooldownEnd) {
          const waitMs = Math.min(Math.max(1, cfg.checkIntervalSeconds) * 1000, cooldownEnd - now);
          armTimer(waitMs / 1000);
          return;
        }

        const roll = Math.random() * 100;
        const hit = roll < cfg.probabilityPercent;

        setStats((prev) => ({
          ...prev,
          probabilityRolls: prev.probabilityRolls + 1,
          lastRollPercent: Math.round(roll * 10) / 10,
          lastRollHit: hit,
        }));

        if (hit) {
          const started = triggerRef.current();
          if (started) return; // el siguiente armado ocurre al terminar el susto
        }

        armTimer(Math.max(1, cfg.checkIntervalSeconds));
        return;
      }

      // Modo fijo / aleatorio
      const started = triggerRef.current();
      if (!started) {
        // Sin vídeos activos: reintenta en el siguiente intervalo en vez de quedarse parado.
        armTimer(Math.max(1, getNextDurationRef.current()));
      }
    };

    engineTickRef.current = tick;
    const interval = window.setInterval(tick, 100);

    return () => {
      engineTickRef.current = () => {};
      window.clearInterval(interval);
      clearDeadlineTimeout();
    };
  }, [armTimer, freezeTimer, resumeTimer]);

  // Library actions
  const handleUpdateVideo = (id: string, updates: Partial<JumpscareVideo>) => {
    setLibrary((prev) => prev.map((v) => (v.id === id ? { ...v, ...updates } : v)));
  };

  const handleAddVideo = (video: JumpscareVideo) => {
    setLibrary((prev) => [video, ...prev]);
  };

  const handleConfirmDelete = () => {
    if (!videoToDelete) return;
    setLibrary((prev) => prev.filter((v) => v.id !== videoToDelete.id));
    setVideoToDelete(null);
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col font-sans">
      {/* 1. Header Zone */}
      <Header
        stats={stats}
        onToggleStart={handleToggleStart}
        onTogglePause={handleTogglePause}
        onTestScare={handleTestScare}
        onOpenCodeExplorer={() => setIsCodeModalOpen(true)}
        onDownloadZip={downloadProjectZip}
      />

      {/* 2. Main Content Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Real-Time Live Monitor */}
        <LiveMonitor
          stats={stats}
          settings={settings}
          secondsRemaining={secondsRemaining}
          onToggleSimulatedGame={() =>
            setStats((prev) => ({ ...prev, gameDetected: !prev.gameDetected }))
          }
        />

        {/* The 3 Core Activation Modes */}
        <div className="mb-5">
          <ModeSelector settings={settings} onChange={updateSettings} />
        </div>

        {/* Video Library */}
        <VideoLibrary
          library={library}
          preventConsecutiveRepetition={settings.preventConsecutiveRepetition}
          masterVolume={settings.masterVolume}
          onUpdateVideo={handleUpdateVideo}
          onAddVideo={handleAddVideo}
          onRemoveVideo={(id) => setLibrary((prev) => prev.filter((v) => v.id !== id))}
          onPreviewVideo={(video) => setPreviewVideo(video)}
          onTogglePreventRepetition={(val) =>
            updateSettings({ preventConsecutiveRepetition: val })
          }
          onRequestDelete={(video) => setVideoToDelete(video)}
        />

        {/* Game Compatibility & Playback Settings */}
        <GameAndPlaybackSettings settings={settings} onChange={updateSettings} />
      </main>

      {/* 3. Jumpscare Overlay (solo fallback de navegador; en escritorio se usa la ventana transparente) */}
      {activeScareVideo && inPageScare && (
        <JumpscareOverlay
          video={activeScareVideo}
          masterVolume={settings.audioEnabled ? settings.masterVolume : 0}
          playbackSpeed={settings.playbackSpeed}
          panicKey={settings.panicKey}
          onFinished={handleScareFinished}
        />
      )}

      {/* 4. Video Preview Modal */}
      <VideoPreviewModal
        video={previewVideo}
        masterVolume={settings.audioEnabled ? settings.masterVolume : 0}
        playbackSpeed={settings.playbackSpeed}
        onClose={() => setPreviewVideo(null)}
      />

      {/* 5. Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(videoToDelete)}
        videoName={videoToDelete?.name || ''}
        onConfirm={handleConfirmDelete}
        onCancel={() => setVideoToDelete(null)}
      />

      {/* 6. Python Windows 11 Code & Project Explorer Modal */}
      <CodeExplorerModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
      />
    </div>
  );
}
