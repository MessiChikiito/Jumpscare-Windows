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
  targetMonitor: 0,
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
          // Remove old polygon clips
          const cleaned = parsed.filter((v: JumpscareVideo) => !BANNED_POLYGON_IDS.has(v.id));
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
  });

  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [activeScareVideo, setActiveScareVideo] = useState<JumpscareVideo | null>(null);
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
  const triggerJumpscare = useCallback((videoToPlay?: JumpscareVideo) => {
    const video = videoToPlay || selectNextVideo();
    if (!video) return;

    setActiveScareVideo(video);
    setStats((prev) => ({
      ...prev,
      scaresTriggered: prev.scaresTriggered + 1,
      lastScareTime: Date.now(),
      lastScareName: video.name,
      systemState: 'running',
    }));
  }, [selectNextVideo]);

  // Compute next interval based on mode
  const getNextDuration = useCallback(() => {
    if (settings.mode === 'fixed') {
      return settings.fixedMinutes * 60 + settings.fixedSeconds;
    } else if (settings.mode === 'random') {
      const minSec = settings.randomMinMinutes * 60 + settings.randomMinSeconds;
      const maxSec = settings.randomMaxMinutes * 60 + settings.randomMaxSeconds;
      const safeMin = Math.max(1, minSec);
      const safeMax = Math.max(safeMin + 1, maxSec);
      return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
    } else {
      // Mode 3: Probability check cycle
      return settings.checkIntervalSeconds;
    }
  }, [settings]);

  // Start engine
  const handleToggleStart = () => {
    soundEffects.playClick();
    if (stats.systemState === 'idle') {
      const initialDelay = settings.initialDelaySeconds;
      setSecondsRemaining(initialDelay > 0 ? initialDelay : getNextDuration());
      setStats((prev) => ({
        ...prev,
        sessionStartTime: Date.now(),
        systemState: 'running',
        scaresTriggered: 0,
      }));
    } else {
      // Stop
      setStats((prev) => ({
        ...prev,
        systemState: 'idle',
      }));
      setSecondsRemaining(0);
      setActiveScareVideo(null);
    }
  };

  // Pause engine
  const handleTogglePause = () => {
    soundEffects.playClick();
    setStats((prev) => ({
      ...prev,
      systemState: prev.systemState === 'paused' ? 'running' : 'paused',
    }));
  };

  // Immediate scare test
  const handleTestScare = () => {
    soundEffects.playClick();
    triggerJumpscare();
  };

  // Finished scare callback
  const handleScareFinished = () => {
    setActiveScareVideo(null);

    // Check session limit
    if (
      settings.maxScaresPerSession > 0 &&
      stats.scaresTriggered >= settings.maxScaresPerSession
    ) {
      setStats((prev) => ({ ...prev, systemState: 'idle' }));
      return;
    }

    // Post-scare pause if configured
    if (settings.postScarePauseSeconds > 0) {
      setStats((prev) => ({ ...prev, systemState: 'cooling_down' }));
      setSecondsRemaining(settings.postScarePauseSeconds);
    } else {
      setSecondsRemaining(getNextDuration());
      setStats((prev) => ({ ...prev, systemState: 'running' }));
    }
  };

  // Main Scheduler loop (1-second tick)
  useEffect(() => {
    if (stats.systemState === 'idle' || stats.systemState === 'paused' || activeScareVideo) {
      return;
    }

    const interval = setInterval(() => {
      // Check game process restriction
      if (settings.gameFilterEnabled && !stats.gameDetected) {
        if (settings.pauseTimerWhenGameClosed) {
          if (stats.systemState !== 'waiting_for_game') {
            setStats((prev) => ({ ...prev, systemState: 'waiting_for_game' }));
          }
          return;
        }
      } else if (stats.systemState === 'waiting_for_game') {
        setStats((prev) => ({ ...prev, systemState: 'running' }));
      }

      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Timer reached 0!
          if (stats.systemState === 'cooling_down') {
            // Cooldown complete, start normal cycle
            setStats((s) => ({ ...s, systemState: 'running' }));
            return getNextDuration();
          }

          if (settings.mode === 'probability') {
            // Mode 3: Evaluate Bernoulli trial
            const now = Date.now();
            const cooldownMs = settings.minCooldownSeconds * 1000;
            const canTrigger = !stats.lastScareTime || now - stats.lastScareTime >= cooldownMs;

            if (canTrigger) {
              const roll = Math.random() * 100;
              if (roll <= settings.probabilityPercent) {
                // Susto activado!
                triggerJumpscare();
              }
            }
            return settings.checkIntervalSeconds;
          } else {
            // Mode 1 or Mode 2
            triggerJumpscare();
            return getNextDuration();
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [
    stats.systemState,
    stats.gameDetected,
    stats.lastScareTime,
    activeScareVideo,
    settings.gameFilterEnabled,
    settings.pauseTimerWhenGameClosed,
    settings.mode,
    settings.minCooldownSeconds,
    settings.probabilityPercent,
    settings.checkIntervalSeconds,
    getNextDuration,
    triggerJumpscare,
  ]);

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

      {/* 3. Jumpscare Fullscreen Overlay */}
      {activeScareVideo && (
        <JumpscareOverlay
          video={activeScareVideo}
          masterVolume={settings.audioEnabled ? settings.masterVolume : 0}
          playbackSpeed={settings.playbackSpeed}
          disableFlashingEffect={settings.disableFlashingEffect}
          fullscreen={settings.fullscreen}
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
