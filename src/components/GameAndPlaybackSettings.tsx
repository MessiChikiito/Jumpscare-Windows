import React from 'react';
import { Gamepad2, Sliders, Volume2, Monitor, AlertTriangle, ShieldCheck, Keyboard } from 'lucide-react';
import { AppSettings } from '../types';

interface GameAndPlaybackSettingsProps {
  settings: AppSettings;
  onChange: (updates: Partial<AppSettings>) => void;
}

const COMMON_GAME_PROCESSES = [
  { name: 'javaw.exe', label: 'Minecraft: Java Edition (javaw.exe)' },
  { name: 'Minecraft.exe', label: 'Minecraft: Bedrock / Windows (Minecraft.exe)' },
  { name: 'RobloxPlayerBeta.exe', label: 'Roblox Client (RobloxPlayerBeta.exe)' },
  { name: 'FortniteClient-Win64-Shipping.exe', label: 'Fortnite (FortniteClient...exe)' },
  { name: 'Valorant.exe', label: 'VALORANT (Valorant.exe)' },
  { name: 'cs2.exe', label: 'Counter-Strike 2 (cs2.exe)' },
  { name: 'Overwatch.exe', label: 'Overwatch 2 (Overwatch.exe)' },
  { name: 'League of Legends.exe', label: 'League of Legends (League of Legends.exe)' },
];

export const GameAndPlaybackSettings: React.FC<GameAndPlaybackSettingsProps> = ({
  settings,
  onChange,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
      {/* 1. Compatibilidad con Videojuegos */}
      <section className="rounded-xl border border-slate-800 bg-[#121927] p-5 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Gamepad2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Compatibilidad con Videojuegos (Minecraft, etc.)
              </h3>
              <p className="text-xs text-slate-400">
                Condición no invasiva para restringir los sustos a tus partidas
              </p>
            </div>
          </div>

          <div className="space-y-4 mt-4">
            {/* Enable switch */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0b0f17] border border-slate-800">
              <div>
                <span className="text-xs font-medium text-slate-200 block">
                  Limitar jumpscares al juego seleccionado
                </span>
                <span className="text-[11px] text-slate-400">
                  Solo se reproducirá si el proceso está activo en Windows
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.gameFilterEnabled}
                onChange={(e) => onChange({ gameFilterEnabled: e.target.checked })}
                className="h-4 w-4 rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
              />
            </div>

            {/* Target Process selector */}
            {settings.gameFilterEnabled && (
              <div className="p-3.5 rounded-lg bg-[#0e1524] border border-slate-800 space-y-3">
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1.5 font-medium">
                    Proceso o ejecutable objetivo:
                  </label>
                  <select
                    value={
                      COMMON_GAME_PROCESSES.some((p) => p.name === settings.targetProcessName)
                        ? settings.targetProcessName
                        : 'custom'
                    }
                    onChange={(e) => {
                      if (e.target.value !== 'custom') {
                        onChange({ targetProcessName: e.target.value });
                      }
                    }}
                    className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    {COMMON_GAME_PROCESSES.map((proc) => (
                      <option key={proc.name} value={proc.name}>
                        {proc.label}
                      </option>
                    ))}
                    <option value="custom">Otro ejecutable personalizado (.exe)...</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Nombre exacto del proceso en el Administrador de Tareas:
                  </label>
                  <input
                    type="text"
                    value={settings.targetProcessName}
                    onChange={(e) => onChange({ targetProcessName: e.target.value })}
                    placeholder="ej. javaw.exe"
                    className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={settings.pauseTimerWhenGameClosed}
                      onChange={(e) => onChange({ pauseTimerWhenGameClosed: e.target.checked })}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                    />
                    <span>Pausar los temporizadores cuando el juego deja de ejecutarse</span>
                  </label>
                </div>
              </div>
            )}

            {/* Minecraft recommendation notice */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-900/70 border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <strong className="text-slate-100 block mb-0.5">Compatibilidad Total Sin Mods:</strong>
                Para que el jumpscare se superponga suavemente encima de Minecraft, usa el modo{' '}
                <strong className="text-indigo-300">Ventana sin bordes</strong> (Borderless Window) o modo ventana maximizada. La pantalla completa exclusiva de Windows puede impedir que aplicaciones externas tomen el plano frontal.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Opciones de Reproducción, Audio y Seguridad */}
      <section className="rounded-xl border border-slate-800 bg-[#121927] p-5 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Opciones de Reproducción y Seguridad
              </h3>
              <p className="text-xs text-slate-400">
                Control de volumen maestro, monitor de destino y tiempos de seguridad
              </p>
            </div>
          </div>

          <div className="space-y-4 mt-4">
            {/* Master Volume */}
            <div className="p-3.5 rounded-lg bg-[#0b0f17] border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-200">
                  <Volume2 className="h-4 w-4 text-slate-400" />
                  Volumen General Maestro:
                </span>
                <span className="font-mono tabular-nums text-slate-100 font-semibold">
                  {settings.audioEnabled ? `${settings.masterVolume}%` : 'SILENCIADO'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.audioEnabled ? settings.masterVolume : 0}
                onChange={(e) =>
                  onChange({ masterVolume: parseInt(e.target.value) || 0, audioEnabled: true })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                <span>Multiplica el volumen de cada vídeo individual</span>
                <button
                  type="button"
                  onClick={() => onChange({ audioEnabled: !settings.audioEnabled })}
                  className="text-xs text-slate-300 hover:text-white underline cursor-pointer"
                >
                  {settings.audioEnabled ? 'Silenciar Todo' : 'Activar Audio'}
                </button>
              </div>
            </div>

            {/* Playback Speed Control (Acelerar o ralentizar jumpscares) */}
            <div className="p-3.5 rounded-lg bg-[#0b0f17] border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-200">
                  <Sliders className="h-4 w-4 text-amber-400" />
                  Velocidad de Jumpscares y Sonido:
                </span>
                <span className="font-mono tabular-nums text-amber-300 font-bold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                  {settings.playbackSpeed.toFixed(2)}x
                  {settings.playbackSpeed < 1.0 && ' (Ralentizado)'}
                  {settings.playbackSpeed === 1.0 && ' (Normal)'}
                  {settings.playbackSpeed > 1.0 && ' (Acelerado)'}
                </span>
              </div>

              {/* Quick preset buttons up to 5x */}
              <div className="grid grid-cols-6 gap-1.5">
                {[0.5, 1.0, 2.0, 3.0, 4.0, 5.0].map((spd) => {
                  const isActive = Math.abs(settings.playbackSpeed - spd) < 0.05;
                  return (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => onChange({ playbackSpeed: spd })}
                      className={`py-1 text-[11px] font-mono rounded transition-colors cursor-pointer border ${
                        isActive
                          ? 'bg-amber-600 text-white font-bold border-amber-500 shadow-xs'
                          : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800'
                      }`}
                    >
                      {spd}x
                    </button>
                  );
                })}
              </div>

              {/* Fine tuning slider up to 5x */}
              <input
                type="range"
                min="0.2"
                max="5.0"
                step="0.1"
                value={settings.playbackSpeed}
                onChange={(e) =>
                  onChange({ playbackSpeed: parseFloat(e.target.value) || 1.0 })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />

              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>0.2x (Cámara Ultralenta)</span>
                <span>1.0x (Normal)</span>
                <span>5.0x (Máxima Velocidad Frenética)</span>
              </div>
            </div>

            {/* Anti-Flicker setting */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0b0f17] border border-slate-800 text-xs">
              <div>
                <span className="text-slate-200 font-medium block">
                  Sin parpadeo de pantalla (Pantalla estable)
                </span>
                <span className="text-[11px] text-slate-400">
                  Elimina destellos de contraste y brillo estroboscópico durante el jumpscare
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.disableFlashingEffect}
                onChange={(e) => onChange({ disableFlashingEffect: e.target.checked })}
                className="h-4 w-4 rounded border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
              />
            </div>

            {/* Grid of timings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">
                  Espera antes del primer susto:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="600"
                    value={settings.initialDelaySeconds}
                    onChange={(e) =>
                      onChange({ initialDelaySeconds: Math.max(0, parseInt(e.target.value) || 0) })
                    }
                    className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono tabular-nums"
                  />
                  <span className="text-xs text-slate-400">seg</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 mb-1">
                  Pausa temporal tras cada susto:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="300"
                    value={settings.postScarePauseSeconds}
                    onChange={(e) =>
                      onChange({
                        postScarePauseSeconds: Math.max(0, parseInt(e.target.value) || 0),
                      })
                    }
                    className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono tabular-nums"
                  />
                  <span className="text-xs text-slate-400">seg</span>
                </div>
              </div>
            </div>

            {/* Display & Panic Key row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-300 mb-1 flex items-center gap-1">
                  <Monitor className="h-3.5 w-3.5 text-slate-400" />
                  Monitor de Destino:
                </label>
                <select
                  value={settings.targetMonitor}
                  onChange={(e) => onChange({ targetMonitor: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                >
                  <option value={0}>Monitor 1 (Principal)</option>
                  <option value={1}>Monitor 2 (Secundario)</option>
                  <option value={2}>Monitor 3</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 mb-1 flex items-center gap-1">
                  <Keyboard className="h-3.5 w-3.5 text-slate-400" />
                  Atajo de Pánico / Cierre:
                </label>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-[#0b0f17] border border-slate-700 text-xs font-mono text-rose-300">
                    ESCAPE
                  </span>
                  <span className="text-[11px] text-slate-400">Cierra y restaura el foco</span>
                </div>
              </div>
            </div>

            {/* Session Limit */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0b0f17] border border-slate-800 text-xs">
              <span className="text-slate-300">Límite opcional de sustos por sesión:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.maxScaresPerSession}
                  onChange={(e) =>
                    onChange({ maxScaresPerSession: Math.max(0, parseInt(e.target.value) || 0) })
                  }
                  className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono tabular-nums text-right"
                />
                <span className="text-[11px] text-slate-400">
                  {settings.maxScaresPerSession === 0 ? '(0 = infinito)' : 'sustos'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
