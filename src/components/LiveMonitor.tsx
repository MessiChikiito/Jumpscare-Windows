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
    const mins = Math.floor(Math.max(0, totalSec) / 60);
    const secs = Math.floor(Math.max(0, totalSec) % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isGameRunning = stats.gameDetected;

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
          {stats.systemState === 'running' && 'Temporizador activo'}
          {stats.systemState === 'waiting_for_game' && 'En pausa: juego inactivo'}
          {stats.systemState === 'paused' && 'Sistema en pausa manual'}
          {stats.systemState === 'cooling_down' && 'Enfriamiento activo'}
          {stats.systemState === 'idle' && 'Presiona Iniciar para comenzar'}
        </div>
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
              ? 'Intervalo Fijo'
              : settings.mode === 'random'
              ? 'Intervalo Aleatorio'
              : 'Probabilidad'}
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
