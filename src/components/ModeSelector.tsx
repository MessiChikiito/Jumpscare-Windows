import React from 'react';
import { Timer, Shuffle, Percent, Info, AlertCircle } from 'lucide-react';
import { AppSettings, JumpscareMode } from '../types';

interface ModeSelectorProps {
  settings: AppSettings;
  onChange: (updates: Partial<AppSettings>) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ settings, onChange }) => {
  const currentMode = settings.mode;

  const handleModeChange = (mode: JumpscareMode) => {
    onChange({ mode });
  };

  const isRandomInvalid =
    settings.randomMinMinutes * 60 + settings.randomMinSeconds >=
    settings.randomMaxMinutes * 60 + settings.randomMaxSeconds;

  return (
    <section className="rounded-xl border border-slate-800 bg-[#121927] p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Modos de Activación
          </h2>
          <p className="text-xs text-slate-400">
            Selecciona la regla matemática que desencadenará los jumpscares
          </p>
        </div>
      </div>

      {/* Mode selection buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 p-1.5 bg-[#0b0f17] rounded-lg border border-slate-800/80 mb-5">
        <button
          type="button"
          onClick={() => handleModeChange('fixed')}
          className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-md text-xs font-medium transition-all text-left cursor-pointer ${
            currentMode === 'fixed'
              ? 'bg-[#1b263b] text-white shadow-xs border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <div className={`p-1.5 rounded-md ${currentMode === 'fixed' ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400'}`}>
            <Timer className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-200">Modo 1: Intervalo Fijo</div>
            <div className="text-[11px] text-slate-400">Cada lapso de tiempo exacto</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('random')}
          className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-md text-xs font-medium transition-all text-left cursor-pointer ${
            currentMode === 'random'
              ? 'bg-[#1b263b] text-white shadow-xs border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <div className={`p-1.5 rounded-md ${currentMode === 'random' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>
            <Shuffle className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-200">Modo 2: Intervalo Aleatorio</div>
            <div className="text-[11px] text-slate-400">Rango dinámico entre Mín y Máx</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('probability')}
          className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-md text-xs font-medium transition-all text-left cursor-pointer ${
            currentMode === 'probability'
              ? 'bg-[#1b263b] text-white shadow-xs border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <div className={`p-1.5 rounded-md ${currentMode === 'probability' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
            <Percent className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-200">Modo 3: Probabilidad</div>
            <div className="text-[11px] text-slate-400">Tirada periódica con Cooldown</div>
          </div>
        </button>
      </div>

      {/* Mode 1 Specific Controls: Fixed Interval */}
      {currentMode === 'fixed' && (
        <div className="bg-[#0e1523] border border-slate-800/80 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">
              Tiempo entre cada jumpscare consecutivo:
            </span>
            <span className="text-xs font-mono tabular-nums text-sky-400 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-800/50">
              Total: {settings.fixedMinutes * 60 + settings.fixedSeconds} segundos
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Minutos</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={settings.fixedMinutes}
                  onChange={(e) =>
                    onChange({ fixedMinutes: Math.max(0, parseInt(e.target.value) || 0) })
                  }
                  className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono tabular-nums focus:outline-none focus:border-sky-500"
                />
                <span className="text-xs text-slate-400">min</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Segundos</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={settings.fixedSeconds}
                  onChange={(e) =>
                    onChange({
                      fixedSeconds: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)),
                    })
                  }
                  className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono tabular-nums focus:outline-none focus:border-sky-500"
                />
                <span className="text-xs text-slate-400">seg</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            El programa reproducirá un susto automáticamente cada vez que termine este intervalo y volverá a reiniciar la cuenta.
          </p>
        </div>
      )}

      {/* Mode 2 Specific Controls: Random Interval */}
      {currentMode === 'random' && (
        <div className="bg-[#0e1523] border border-slate-800/80 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">
              Rango de tiempo aleatorio entre sustos:
            </span>
            <span className="text-xs font-mono tabular-nums text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/50">
              {settings.randomMinMinutes}m {settings.randomMinSeconds}s — {settings.randomMaxMinutes}m {settings.randomMaxSeconds}s
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Min Range */}
            <div className="p-3 bg-[#0b0f17] rounded-lg border border-slate-800">
              <span className="text-xs font-medium text-slate-300 block mb-2">
                Tiempo Mínimo de Espera
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400">Minutos</label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={settings.randomMinMinutes}
                    onChange={(e) =>
                      onChange({ randomMinMinutes: Math.max(0, parseInt(e.target.value) || 0) })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Segundos</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={settings.randomMinSeconds}
                    onChange={(e) =>
                      onChange({
                        randomMinSeconds: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)),
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* Max Range */}
            <div className="p-3 bg-[#0b0f17] rounded-lg border border-slate-800">
              <span className="text-xs font-medium text-slate-300 block mb-2">
                Tiempo Máximo de Espera
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400">Minutos</label>
                  <input
                    type="number"
                    min="0"
                    max="300"
                    value={settings.randomMaxMinutes}
                    onChange={(e) =>
                      onChange({ randomMaxMinutes: Math.max(0, parseInt(e.target.value) || 0) })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Segundos</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={settings.randomMaxSeconds}
                    onChange={(e) =>
                      onChange({
                        randomMaxSeconds: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)),
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono tabular-nums"
                  />
                </div>
              </div>
            </div>
          </div>

          {isRandomInvalid ? (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>El tiempo máximo debe ser estrictamente mayor que el tiempo mínimo.</span>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">
              Tras cada susto, el programa genera un nuevo intervalo estrictamente contenido dentro de este rango.
            </p>
          )}
        </div>
      )}

      {/* Mode 3 Specific Controls: Probability */}
      {currentMode === 'probability' && (
        <div className="bg-[#0e1523] border border-slate-800/80 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">
                Frecuencia de Comprobación
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="600"
                  value={settings.checkIntervalSeconds}
                  onChange={(e) =>
                    onChange({ checkIntervalSeconds: Math.max(5, parseInt(e.target.value) || 5) })
                  }
                  className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono tabular-nums focus:outline-none focus:border-amber-500"
                />
                <span className="text-xs text-slate-400">seg</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Cada cuánto se evalúa</span>
            </div>

            <div>
              <label className="block text-[11px] text-slate-300 mb-1">
                Probabilidad por Intento
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.5"
                  value={settings.probabilityPercent}
                  onChange={(e) =>
                    onChange({
                      probabilityPercent: Math.max(
                        0.1,
                        Math.min(100, parseFloat(e.target.value) || 0.1)
                      ),
                    })
                  }
                  className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono tabular-nums focus:outline-none focus:border-amber-500"
                />
                <span className="text-xs text-slate-400">%</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Rango permitido 0.1% a 100%</span>
            </div>

            <div>
              <label className="block text-[11px] text-slate-300 mb-1">
                Espera Mínima (Cooldown)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="10"
                  max="1800"
                  value={settings.minCooldownSeconds}
                  onChange={(e) =>
                    onChange({ minCooldownSeconds: Math.max(0, parseInt(e.target.value) || 0) })
                  }
                  className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono tabular-nums focus:outline-none focus:border-amber-500"
                />
                <span className="text-xs text-slate-400">seg</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Evita sustos en cascada</span>
            </div>
          </div>

          {/* Mathematical clarification note as explicitly requested in brief */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-amber-300 text-xs leading-relaxed">
            <Info className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <strong className="font-semibold block text-amber-200 mb-0.5">
                Principio Matemático de Independencia Estocástica:
              </strong>
              Una probabilidad del {settings.probabilityPercent}% por comprobación <em>no garantiza</em> un jumpscare cada{' '}
              {Math.round((settings.checkIntervalSeconds * (100 / settings.probabilityPercent)) / 60)} minutos.
              Cada comprobación constituye un nuevo intento independiente (ensayo de Bernoulli) cuando el tiempo mínimo de enfriamiento ({settings.minCooldownSeconds}s) se haya cumplido.
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
