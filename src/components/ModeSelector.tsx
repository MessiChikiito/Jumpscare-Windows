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
            ¿Cuándo quieres que salga el susto?
          </h2>
          <p className="text-xs text-slate-400">
            Los tres modos hacen lo mismo (reproducir un jumpscare); solo cambia cómo se decide el
            momento. Elige el que te resulte más fácil.
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
            <div className="font-semibold text-slate-200">Siempre cada X tiempo</div>
            <div className="text-[11px] text-slate-400">Reloj fijo · fácil de controlar</div>
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
            <div className="font-semibold text-slate-200">En algún momento entre X y Y</div>
            <div className="text-[11px] text-slate-400">Hora impredecible · más sorpresa</div>
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
            <div className="font-semibold text-slate-200">Al azar con un % de probabilidad</div>
            <div className="text-[11px] text-slate-400">Puede tardar mucho o nada</div>
          </div>
        </button>
      </div>

      {/* Mode 1 Specific Controls: Fixed Interval */}
      {currentMode === 'fixed' && (
        <div className="bg-[#0e1523] border border-slate-800/80 rounded-lg p-4 space-y-3">
          <div className="rounded-lg bg-sky-950/30 border border-sky-800/50 p-3 text-xs text-sky-200 leading-relaxed">
            <strong className="block mb-0.5 text-sky-100">Así funciona:</strong>
            El susto siempre tarda lo mismo. Con {settings.fixedMinutes}m {settings.fixedSeconds}s,
            el primer susto llega {settings.fixedMinutes}m {settings.fixedSeconds}s después de pulsar
            Iniciar, y los siguientes cada {settings.fixedMinutes}m {settings.fixedSeconds}s.
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">
              Espera entre un susto y el siguiente:
            </span>
            <span className="text-xs font-mono tabular-nums text-sky-400 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-800/50">
              {settings.fixedMinutes} min {settings.fixedSeconds} seg
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
            Pon los minutos y los segundos. Después de cada susto, la cuenta vuelve a empezar sola.
          </p>
        </div>
      )}

      {/* Mode 2 Specific Controls: Random Interval */}
      {currentMode === 'random' && (
        <div className="bg-[#0e1523] border border-slate-800/80 rounded-lg p-4 space-y-3">
          <div className="rounded-lg bg-rose-950/30 border border-rose-800/50 p-3 text-xs text-rose-200 leading-relaxed">
            <strong className="block mb-0.5 text-rose-100">Así funciona:</strong>
            Eliges un mínimo y un máximo. Cada vez, el programa escoge una hora al azar dentro de ese
            rango, así que nunca sabes cuándo llega. Ejemplo: entre {settings.randomMinMinutes}m y{' '}
            {settings.randomMaxMinutes}m puede salir a los 7 minutos, luego a los 21, luego a los 12…
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">
              Espera mínima y máxima entre sustos:
            </span>
            <span className="text-xs font-mono tabular-nums text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/50">
              {settings.randomMinMinutes}m {settings.randomMinSeconds}s — {settings.randomMaxMinutes}m {settings.randomMaxSeconds}s
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Min Range */}
            <div className="p-3 bg-[#0b0f17] rounded-lg border border-slate-800">
              <span className="text-xs font-medium text-slate-300 block mb-2">
                Lo mínimo que esperará
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
                Lo máximo que esperará
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
              <span>El valor máximo tiene que ser mayor que el mínimo.</span>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">
              Cuanto más ancho sea el rango, más impredecible será el susto.
            </p>
          )}
        </div>
      )}

      {/* Mode 3 Specific Controls: Probability */}
      {currentMode === 'probability' && (
        <div className="bg-[#0e1523] border border-slate-800/80 rounded-lg p-4 space-y-4">
          <div className="rounded-lg bg-amber-950/30 border border-amber-800/50 p-3 text-xs text-amber-200 leading-relaxed">
            <strong className="block mb-0.5 text-amber-100">Así funciona:</strong>
            Cada {settings.checkIntervalSeconds} segundos el programa hace una tirada de dado: con un{' '}
            {settings.probabilityPercent}% de probabilidad sale el susto; si no sale, vuelve a tirar
            más tarde. No es un cronómetro: puede salir enseguida o tardar bastante. Aunque subas
            mucho el %, el enfriamiento de {settings.minCooldownSeconds}s impide dos sustos seguidos.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">
                Cada cuántos segundos hace la tirada
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="600"
                  step="1"
                  value={settings.checkIntervalSeconds}
                  onChange={(e) =>
                    onChange({
                      checkIntervalSeconds: Math.max(
                        1,
                        Math.min(600, parseFloat(e.target.value) || 1)
                      ),
                    })
                  }
                  className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono tabular-nums focus:outline-none focus:border-amber-500"
                />
                <span className="text-xs text-slate-400">seg</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Mínimo 1 segundo</span>
            </div>

            <div>
              <label className="block text-[11px] text-slate-300 mb-1">
                Probabilidad de que salga (%)
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
              <span className="text-[10px] text-slate-500 mt-1 block">0.1% = casi nunca · 100% = siempre</span>
            </div>

            <div>
              <label className="block text-[11px] text-slate-300 mb-1">
                Espera mínima entre sustos
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="1800"
                  value={settings.minCooldownSeconds}
                  onChange={(e) =>
                    onChange({ minCooldownSeconds: Math.max(0, parseInt(e.target.value) || 0) })
                  }
                  className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono tabular-nums focus:outline-none focus:border-amber-500"
                />
                <span className="text-xs text-slate-400">seg</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Nunca habrá dos sustos más seguidos que esto</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-900/60 border border-slate-700/60 text-slate-300 text-xs leading-relaxed">
            <Info className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
            <div>
              <strong className="font-semibold block text-slate-200 mb-0.5">Ejemplo con tus valores:</strong>
              Tirada cada {settings.checkIntervalSeconds}s con {settings.probabilityPercent}% de salir →
              en promedio un susto cada ~
              {Math.max(
                1,
                Math.round(
                  (Math.max(settings.checkIntervalSeconds, settings.minCooldownSeconds) *
                    (100 / settings.probabilityPercent)) /
                    60
                )
              )}{' '}
              minutos, respetando la espera mínima de {settings.minCooldownSeconds}s. Puede salir antes o
              después: es una media, no una promesa.
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
