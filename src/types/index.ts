export type JumpscareMode = 'fixed' | 'random' | 'probability';

export interface JumpscareVideo {
  id: string;
  name: string;
  sourceType: 'builtin' | 'custom_file' | 'custom_url';
  mediaType?: 'video' | 'audio';
  src: string; // Blob URL, Data URL, or path
  duration: number; // in seconds
  volume: number; // 0 to 100
  enabled: boolean;
  thumbnail?: string;
  description?: string;
  lastPlayedAt?: number;
  chromaKeyEnabled?: boolean;
  chromaKeyColor?: string; // Hex color e.g. '#00ff00'
  chromaKeyTolerance?: number; // 0 to 100
  chromaKeySmoothness?: number; // 0 to 100
  speed?: number; // 0.2 to 5.0 (default 1.0)
  /** Amplificación del audio en % (100 = normal, hasta 500). Por defecto 300 */
  volumeBoost?: number;
  /** Nombre original del archivo importado */
  fileName?: string;
}

export interface AppSettings {
  mode: JumpscareMode;
  playbackSpeed: number; // 0.2 to 5.0 (default 1.0)
  disableFlashingEffect: boolean; // Prevent screen blinking
  // Mode 1: Fixed interval
  fixedMinutes: number;
  fixedSeconds: number;

  // Mode 2: Random interval
  randomMinMinutes: number;
  randomMinSeconds: number;
  randomMaxMinutes: number;
  randomMaxSeconds: number;

  // Mode 3: Probability
  checkIntervalSeconds: number;
  probabilityPercent: number;
  minCooldownSeconds: number;

  // Playback & Session Options
  initialDelaySeconds: number;
  postScarePauseSeconds: number;
  maxScaresPerSession: number; // 0 for unlimited
  masterVolume: number; // 0 to 100
  audioEnabled: boolean;
  targetDisplayId: string; // '' = pantalla principal
  fullscreen: boolean;
  panicKey: string; // 'Escape' | 'F10' | 'Space'

  // Game Compatibility
  gameFilterEnabled: boolean;
  targetProcessName: string; // e.g. 'javaw.exe'
  pauseTimerWhenGameClosed: boolean;

  // Library settings
  preventConsecutiveRepetition: boolean;
}

export interface SessionStats {
  scaresTriggered: number;
  sessionStartTime: number | null;
  lastScareTime: number | null;
  lastScareName: string | null;
  nextScheduledTime: number | null;
  nextCheckTime: number | null;
  systemState: 'idle' | 'running' | 'waiting_for_game' | 'paused' | 'cooling_down';
  gameDetected: boolean;
  /** Modo probabilidad: tiradas realizadas y resultado de la última */
  probabilityRolls: number;
  lastRollPercent: number | null;
  lastRollHit: boolean;
}

export interface FoxyDisplay {
  id: string;
  label: string;
  width: number;
  height: number;
  scaleFactor: number;
  primary: boolean;
}

export interface ScarePayload {
  src: string;
  /** Bytes del archivo cuando la fuente es un blob del renderer principal */
  blobData?: ArrayBuffer | Uint8Array;
  mime?: string;
  name: string;
  mediaType: 'video' | 'audio';
  duration: number;
  /** Volumen final combinado (0 a 1) */
  volume: number;
  speed: number;
  chromaKeyEnabled: boolean;
  chromaKeyTolerance: number;
  chromaKeySmoothness: number;
  /** Amplificación del audio en % (100 = normal) */
  volumeBoost: number;
  panicKey: string;
  fullscreen: boolean;
  displayId: string;
}

export interface FoxyApi {
  getDisplays(): Promise<FoxyDisplay[]>;
  showScare(payload: ScarePayload): Promise<void>;
  closeScare(): Promise<void>;
  onScareFinished(callback: () => void): () => void;
  consumeScarePayload(): Promise<ScarePayload | null>;
  finishScare(): void;
}

declare global {
  interface Window {
    foxy?: FoxyApi;
  }
}

