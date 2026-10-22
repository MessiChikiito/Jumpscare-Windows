import React from 'react';
import { Skull, Download, Code2, Play, Square, Pause } from 'lucide-react';
import { SessionStats } from '../types';

interface HeaderProps {
  stats: SessionStats;
  onToggleStart: () => void;
  onTogglePause: () => void;
  onTestScare: () => void;
  onOpenCodeExplorer: () => void;
  onDownloadZip: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  onToggleStart,
  onTogglePause,
  onTestScare,
  onOpenCodeExplorer,
  onDownloadZip,
}) => {
  const isRunning = stats.systemState !== 'idle' && stats.systemState !== 'paused';
  const isPaused = stats.systemState === 'paused';

  return (
    <header className="flex items-center justify-between gap-6 px-6 py-4 border-b border-slate-800 bg-[#0e1422] sticky top-0 z-40">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600/15 border border-red-500/30 text-red-500">
          <Skull className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap">
            Random Jumpscare Windows 11
          </h1>
          <p className="text-[11px] text-slate-400 font-mono">
            Foxy FNAF Edition · Multi-Mode Engine
          </p>
        </div>
      </div>

      {/* Zone 2: System Status indicator */}
      <div className="hidden md:flex items-center gap-3 text-xs text-slate-400">
        <span className="flex items-center gap-1.5 font-medium">
          <span
            className={`h-2 w-2 rounded-full ${
              stats.systemState === 'running'
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                : stats.systemState === 'waiting_for_game'
                ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                : stats.systemState === 'paused'
                ? 'bg-yellow-400'
                : 'bg-slate-500'
            }`}
          />
          <span className="uppercase font-mono text-[11px] tracking-wide text-slate-200">
            {stats.systemState === 'running' && 'Motor Activo'}
            {stats.systemState === 'waiting_for_game' && 'Esperando Proceso de Juego'}
            {stats.systemState === 'paused' && 'Sistema Pausado'}
            {stats.systemState === 'cooling_down' && 'Enfriamiento Post-Susto'}
            {stats.systemState === 'idle' && 'Sistema Detenido'}
          </span>
        </span>
        <span aria-hidden="true" className="text-slate-600">·</span>
        <span>Sustos esta sesión: <strong className="text-slate-200 font-mono tabular-nums">{stats.scaresTriggered}</strong></span>
      </div>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onTestScare}
          title="Prueba inmediata a pantalla completa"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-200 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-600/40 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-xs"
        >
          <Skull className="h-3.5 w-3.5 text-amber-400" />
          Probar Susto
        </button>

        {stats.systemState !== 'idle' ? (
          <>
            <button
              type="button"
              onClick={onTogglePause}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                isPaused
                  ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              {isPaused ? 'Reanudar' : 'Pausar'}
            </button>
            <button
              type="button"
              onClick={onToggleStart}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-rose-950 hover:text-rose-200 border border-slate-700 hover:border-rose-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Square className="h-3.5 w-3.5 text-rose-400 fill-rose-400" />
              Detener
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onToggleStart}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-colors whitespace-nowrap cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-white" />
            Iniciar Motor
          </button>
        )}

        <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

        <button
          type="button"
          onClick={onOpenCodeExplorer}
          title="Ver código fuente Python (PySide6)"
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700/60 transition-colors whitespace-nowrap cursor-pointer"
        >
          <Code2 className="h-3.5 w-3.5 text-sky-400" />
          <span className="hidden sm:inline">Código</span>
        </button>

        <button
          type="button"
          onClick={onDownloadZip}
          title="Descargar paquete completo para Windows 11"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Descargar .ZIP</span>
        </button>
      </div>
    </header>
  );
};
