import React from 'react';
import { Clock, Gamepad2, ShieldCheck, Flame, Eye } from 'lucide-react';
import { AppSettings, SessionStats } from '../types';

interface LiveMonitorProps {
  stats: SessionStats;
  settings: AppSettings;
  secondsRemaining: number;
  onToggleSimulatedGame: () => void;
}

export const LiveMonitor: React.FC<LiveMonitorProps> = ({
  stats,
  settings,
  secondsRemaining,
  onToggleSimulatedGame,
}) => {
  const formatTime = (totalSec: number) => {
    const safe = Math.max(0, Math.round(totalSec * 10) / 10);
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;

    if (safe < 10) {
      // Décimas: 00:03.4
      return `${mins.toString().padStart(2, '0')}:${secs.toFixed(1).padStart(4, '0')}`;
    }

    return `${mins.toString().padStart(2, '0')}:${Math.floor(secs)
      .toString()
      .padStart(2, '0')}`;
  };

  const isGameRunning = stats.gameDetected;
  const cooldownRemainingSec =
    settings.mode === 'probability' && stats.lastScareTime
      ? Math.max(0, Math.round((stats.lastScareTime + settings.minCooldownSeconds * 1000 - Date.now()) / 1000))
      : 0;
  const waitingCooldown = stats.systemState === 'running' && cooldownRemainingSec > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 mb-5">
      {/* 1. Countdown card */}
      <div className="rounded-xl border border-slate-800 bg-[#121927] p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-medium">
            {settings.mode === 'probability' ? 'Próxima Comprobación' : 'Próximo Jumpscare'}
          </span>
          <Clock className="h-4 w-4 text-sky-400" />
        </div>
        <div className="text-3xl font-mono tabular-nums font-bold text-slate-100 tracking-tight my-1">
          {stats.systemState === 'idle' ? '--:--' : formatTime(secondsRemaining)}
        </div>
        <div className="text-[11px] text-slate-400 truncate">
          {stats.systemState === 'running' && !waitingCooldown && 'Temporizador activo'}
          {waitingCooldown && `Enfriamiento: faltan ${cooldownRemainingSec}s`}
          {stats.systemState === 'waiting_for_game' && 'En pausa: juego inactivo'}
          {stats.systemState === 'paused' && 'Sistema en pausa manual'}
          {stats.systemState === 'cooling_down' && 'Enfriamiento activo'}
          {stats.systemState === 'idle' && 'Presiona Iniciar para comenzar'}
        </div>

        {settings.mode === 'probability' && stats.systemState !== 'idle' && (
          <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] font-mono">
            <span className="text-amber-300/90">Tiradas: {stats.probabilityRolls}</span>
            {stats.lastRollPercent !== null && (
              <span className={stats.lastRollHit ? 'text-emerald-400' : 'text-slate-400'}>
                Última: {stats.lastRollPercent}% {stats.lastRollHit ? '✓ salió' : '✕ no salió'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 2. Last Scare Card */}
      <div className="rounded-xl border border-slate-800 bg-[#121927] p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-medium">Último Jumpscare</span>
          <Flame className="h-4 w-4 text-rose-500" />
        </div>
        <div className="text-sm font-semibold text-slate-200 truncate my-1">
          {stats.lastScareName || 'Ninguno aún'}
        </div>
        <div className="text-[11px] text-slate-400 font-mono tabular-nums">
          {stats.lastScareTime
            ? `Activado a las ${new Date(stats.lastScareTime).toLocaleTimeString()}`
            : 'Esperando primer evento'}
        </div>
      </div>

      {/* 3. Session Statistics */}
      <div className="rounded-xl border border-slate-800 bg-[#121927] p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-medium">Sustos / Límite de Sesión</span>
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="text-3xl font-mono tabular-nums font-bold text-slate-100 my-1">
          {stats.scaresTriggered}
          <span className="text-xs text-slate-500 font-normal ml-1">
            {settings.maxScaresPerSession > 0 ? `/ ${settings.maxScaresPerSession}` : '(sin límite)'}
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          Modo actual:{' '}
          <strong className="text-slate-300 capitalize">
            {settings.mode === 'fixed'
              ? 'Cada X tiempo'
              : settings.mode === 'random'
              ? 'Entre X e Y'
              : 'Al azar (%)'}
          </strong>
        </div>
      </div>

      {/* 4. Game Process Status Card */}
      <div className="rounded-xl border border-slate-800 bg-[#121927] p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-medium">Detección de Videojuego</span>
          <Gamepad2 className="h-4 w-4 text-indigo-400" />
        </div>

        <div className="flex items-center justify-between my-1">
          <div className="truncate pr-2">
            <span className="text-xs font-mono text-slate-200 block truncate">
              {settings.gameFilterEnabled ? settings.targetProcessName : 'Filtro Desactivado'}
            </span>
            <span
              className={`text-[11px] font-medium ${
                !settings.gameFilterEnabled
                  ? 'text-slate-400'
                  : isGameRunning
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              {!settings.gameFilterEnabled
                ? 'Se activa en cualquier app'
                : isGameRunning
                ? 'Proceso detectado (En juego)'
                : 'Proceso ausente (Pausado)'}
            </span>
          </div>

          {settings.gameFilterEnabled && (
            <button
              type="button"
              onClick={onToggleSimulatedGame}
              title="Simular abrir/cerrar Minecraft en Windows"
              className={`px-2.5 py-1 text-[11px] font-medium rounded border transition-colors cursor-pointer shrink-0 ${
                isGameRunning
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300 hover:bg-emerald-900'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isGameRunning ? 'Simulado: Abierto' : 'Simulado: Cerrado'}
            </button>
          )}
        </div>

        <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
          <Eye className="h-3 w-3" />
          <span>Monitor sin inyección de memoria</span>
        </div>
      </div>
    </div>
  );
};
