import React, { useRef, useState } from 'react';
import { Film, Upload, Volume2, Eye, Trash2, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { JumpscareVideo } from '../types';

interface VideoLibraryProps {
  library: JumpscareVideo[];
  preventConsecutiveRepetition: boolean;
  masterVolume: number;
  onUpdateVideo: (id: string, updates: Partial<JumpscareVideo>) => void;
  onAddVideo: (video: JumpscareVideo) => void;
  onRemoveVideo: (id: string) => void;
  onPreviewVideo: (video: JumpscareVideo) => void;
  onTogglePreventRepetition: (value: boolean) => void;
  onRequestDelete: (video: JumpscareVideo) => void;
}

/**
 * Genera una miniatura del primer fotograma útil del vídeo para reconocerlo en la biblioteca.
 */
function generateVideoThumbnail(fileUrl: string, fallbackDuration: number): Promise<string | undefined> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    let settled = false;
    let timer: number | undefined;

    const finish = (value?: string) => {
      if (settled) return;
      settled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      video.removeAttribute('src');
      video.load();
      resolve(value);
    };

    timer = window.setTimeout(() => finish(), 5000);

    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = fileUrl;

    video.onloadeddata = () => {
      const duration =
        Number.isFinite(video.duration) && video.duration > 0 ? video.duration : fallbackDuration;
      const seekTo = Math.min(Math.max(0.1, duration * 0.33), Math.max(0.1, duration - 0.1));
      try {
        video.currentTime = seekTo;
      } catch {
        finish();
      }
    };

    video.onseeked = () => {
      try {
        if (!video.videoWidth || !video.videoHeight) {
          finish();
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = Math.max(1, Math.round((480 * video.videoHeight) / video.videoWidth));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          finish();
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        finish(canvas.toDataURL('image/jpeg', 0.82));
      } catch {
        finish();
      }
    };

    video.onerror = () => finish();
  });
}

/**
 * Convierte el valor de un input (texto o número) a un porcentaje 0-100 válido.
 */
function clampPercent(raw: string | number, fallback: number): number {
  const parsed = typeof raw === 'number' ? raw : parseFloat(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

export const VideoLibrary: React.FC<VideoLibraryProps> = ({
  library,
  preventConsecutiveRepetition,
  masterVolume,
  onUpdateVideo,
  onAddVideo,
  onPreviewVideo,
  onTogglePreventRepetition,
  onRequestDelete,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validExtensions = ['.mp4', '.webm', '.mkv', '.avi', '.mov'];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();

      if (!validExtensions.includes(ext)) {
        setImportError(
          `Formato "${ext}" no recomendado. Formatos soportados: MP4, MKV, AVI, MOV, WebM.`
        );
      }

      const fileUrl = URL.createObjectURL(file);
      const videoId = `custom_vid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const tempVideo = document.createElement('video');
      tempVideo.src = fileUrl;
      tempVideo.onloadedmetadata = () => {
        const durationSec = Math.round(tempVideo.duration * 10) / 10 || 3.0;
        const newVideo: JumpscareVideo = {
          id: videoId,
          name: file.name.replace(/\.[^/.]+$/, ''),
          fileName: file.name,
          sourceType: 'custom_file',
          mediaType: 'video',
          src: fileUrl,
          duration: durationSec,
          volume: 100,
          volumeBoost: 300,
          enabled: true,
          description: `Vídeo importado (${(file.size / (1024 * 1024)).toFixed(1)} MB)`,
        };
        onAddVideo(newVideo);

        void generateVideoThumbnail(fileUrl, durationSec).then((thumbnail) => {
          if (thumbnail) onUpdateVideo(videoId, { thumbnail });
        });
      };

      tempVideo.onerror = () => {
        const newVideo: JumpscareVideo = {
          id: videoId,
          name: file.name,
          fileName: file.name,
          sourceType: 'custom_file',
          mediaType: 'video',
          src: fileUrl,
          duration: 3.5,
          volume: 100,
          volumeBoost: 300,
          enabled: true,
          description: 'Vídeo importado',
        };
        onAddVideo(newVideo);
      };
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileUrl = URL.createObjectURL(file);
      const tempAudio = new Audio(fileUrl);

      tempAudio.onloadedmetadata = () => {
        const durationSec = Math.round(tempAudio.duration * 10) / 10 || 2.5;
        const newAudio: JumpscareVideo = {
          id: `custom_aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: `Sonido: ${file.name.replace(/\.[^/.]+$/, '')}`,
          fileName: file.name,
          sourceType: 'custom_file',
          mediaType: 'audio',
          src: fileUrl,
          duration: durationSec,
          volume: 100,
          volumeBoost: 300,
          enabled: true,
          description: `Sonido de jumpscare (${(file.size / 1024).toFixed(0)} KB)`,
        };
        onAddVideo(newAudio);
      };

      tempAudio.onerror = () => {
        const newAudio: JumpscareVideo = {
          id: `custom_aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: `Sonido: ${file.name}`,
          fileName: file.name,
          sourceType: 'custom_file',
          mediaType: 'audio',
          src: fileUrl,
          duration: 2.5,
          volume: 100,
          volumeBoost: 300,
          enabled: true,
          description: 'Efecto de audio importado',
        };
        onAddVideo(newAudio);
      };
    }

    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const enabledCount = library.filter((v) => v.enabled).length;

  return (
    <section className="rounded-xl border border-slate-800 bg-[#121927] p-5 shadow-sm mb-5">
      {/* Header and import action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-100">
              Biblioteca de Vídeos y Jumpscares
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              ({enabledCount} de {library.length} activos)
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Admite archivos MP4, MKV, AVI, MOV y WebM gestionados con el motor libVLC
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Video file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/x-msvideo,.mp4,.mkv,.avi,.mov,.webm"
            multiple
            className="hidden"
          />
          {/* Audio file input */}
          <input
            type="file"
            ref={audioInputRef}
            onChange={handleAudioUpload}
            accept="audio/mp3,audio/wav,audio/ogg,audio/mpeg,audio/aac,audio/flac,.mp3,.wav,.ogg,.m4a,.flac"
            multiple
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5 text-sky-400" />
            Subir Vídeo (MP4, WebM...)
          </button>

          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Volume2 className="h-3.5 w-3.5 text-indigo-200" />
            Subir Sonido (MP3, WAV, OGG...)
          </button>
        </div>
      </div>

      {importError && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-950/40 border border-amber-800 text-amber-300 text-xs mb-4">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{importError}</span>
        </div>
      )}

      {/* Repetition setting */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-[#0b0f17] border border-slate-800/80 mb-4 text-xs">
        <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={preventConsecutiveRepetition}
            onChange={(e) => onTogglePreventRepetition(e.target.checked)}
            className="rounded border-slate-700 text-rose-600 focus:ring-0 focus:outline-none"
          />
          <span>Evitar la repetición consecutiva del mismo vídeo o sonido cuando haya otros disponibles</span>
        </label>
        <span className="text-[11px] text-slate-500 font-mono hidden md:inline">
          Garantiza rotación estocástica
        </span>
      </div>

      {/* Video & Audio Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {library.map((video) => {
          const boost = video.volumeBoost ?? 300;
          const effectiveVol = Math.round((masterVolume / 100) * video.volume * (boost / 100));
          const isAudio = video.mediaType === 'audio';

          return (
            <div
              key={video.id}
              className={`rounded-lg border p-3.5 transition-all flex flex-col justify-between ${
                video.enabled
                  ? 'border-slate-800 bg-[#0e1524] hover:border-slate-700'
                  : 'border-slate-850 bg-[#0a0e17] opacity-60'
              }`}
            >
              {/* Top: Enabled toggle and title */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => onUpdateVideo(video.id, { enabled: !video.enabled })}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 text-left hover:text-white transition-colors cursor-pointer truncate"
                  >
                    {video.enabled ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-slate-600 shrink-0" />
                    )}
                    <span className="truncate">{video.name}</span>
                  </button>

                  <span className="text-[10px] font-mono tabular-nums text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
                    {video.duration}s
                  </span>
                </div>

                {video.fileName && (
                  <p
                    className="text-[10px] font-mono text-slate-500 truncate -mt-1 mb-2"
                    title={video.fileName}
                  >
                    {video.fileName}
                  </p>
                )}

                {/* Media thumbnail or preview frame */}
                <div className="relative aspect-video w-full rounded bg-black/60 border border-slate-800 overflow-hidden mb-3 flex items-center justify-center">
                  {isAudio ? (
                    <div className="flex flex-col items-center justify-center text-center p-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-1.5">
                        <Volume2 className="h-5 w-5" />
                      </div>
                      <span className="text-[11px] font-mono text-indigo-300 font-semibold">Pista de Audio</span>
                      <span className="text-[9px] text-slate-500 font-mono">Alarido sonoro</span>
                    </div>
                  ) : video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      alt={video.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-600 p-2 text-center">
                      <Film className="h-8 w-8 text-slate-500 mb-1" />
                      <span className="text-[10px] font-mono text-slate-400">Vídeo Local</span>
                    </div>
                  )}

                  {/* Audio or Chroma Badge */}
                  {isAudio ? (
                    <span className="absolute top-1.5 left-1.5 text-[9px] font-mono bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 px-1.5 py-0.5 rounded">
                      SONIDO AUDIO
                    </span>
                  ) : video.chromaKeyEnabled ? (
                    <span className="absolute top-1.5 left-1.5 text-[9px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                      CHROMA KEY
                    </span>
                  ) : null}

                  {video.fileName && (
                    <span className="absolute bottom-0 inset-x-0 bg-black/75 px-1.5 py-1 text-[9px] font-mono text-slate-300 truncate">
                      {video.fileName}
                    </span>
                  )}
                </div>

                {video.description && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 mb-3">
                    {video.description}
                  </p>
                )}
              </div>

              {/* Bottom: Volume, Speed & actions */}
              <div className="border-t border-slate-800/80 pt-2.5 mt-2 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Volume2 className="h-3 w-3 text-slate-400" />
                    Volumen individual:
                  </span>
                  <span className="font-mono tabular-nums text-slate-200">
                    {video.volume}%{' '}
                    <span className="text-slate-500">({effectiveVol}% efectivo)</span>
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={video.volume}
                  onChange={(e) =>
                    onUpdateVideo(video.id, { volume: parseInt(e.target.value) || 0 })
                  }
                  style={{ ['--slider-accent' as string]: '#f43f5e' }}
                  className="w-full range-slider"
                />

                {/* Amplificación por encima del 100% para vídeos con audio bajo */}
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    Amplificación:
                    {boost > 100 && (
                      <span className="text-[9px] font-mono px-1 rounded bg-amber-950/60 border border-amber-800/60 text-amber-300">
                        x{(boost / 100).toFixed(2).replace(/0$/, '')}
                      </span>
                    )}
                  </span>
                  <span className="font-mono tabular-nums text-amber-300">{boost}%</span>
                </div>

                <input
                  type="range"
                  min="100"
                  max="500"
                  step="25"
                  value={boost}
                  onChange={(e) =>
                    onUpdateVideo(video.id, { volumeBoost: parseInt(e.target.value) || 300 })
                  }
                  style={{ ['--slider-accent' as string]: '#f59e0b' }}
                  className="w-full range-slider"
                />

                <span className="text-[10px] text-slate-500 block">
                  Sube el volumen por encima del 100% (con limitador para que no distorsione).
                </span>

                {/* Individual speed selector up to 5x */}
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Velocidad individual:</span>
                  <select
                    value={video.speed ?? ''}
                    onChange={(e) =>
                      onUpdateVideo(video.id, {
                        speed: e.target.value === '' ? undefined : parseFloat(e.target.value),
                      })
                    }
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-[10px] text-slate-200 font-mono"
                  >
                    <option value="">Global</option>
                    <option value="0.25">0.25x (Lentísimo)</option>
                    <option value="0.5">0.5x (Lento)</option>
                    <option value="0.75">0.75x</option>
                    <option value="1.0">1.0x (Normal)</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x (Rápido)</option>
                    <option value="2.0">2.0x (Doble)</option>
                    <option value="3.0">3.0x (Triple)</option>
                    <option value="4.0">4.0x (4x)</option>
                    <option value="5.0">5.0x (5x Ultra)</option>
                  </select>
                </div>

                {/* Chroma Key / Green Screen switch (only for video) */}
                {!isAudio && (
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800 text-[11px] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(video.chromaKeyEnabled)}
                          onChange={(e) =>
                            onUpdateVideo(video.id, {
                              chromaKeyEnabled: e.target.checked,
                              chromaKeyTolerance: video.chromaKeyTolerance ?? 42,
                              chromaKeySmoothness: video.chromaKeySmoothness ?? 25,
                            })
                          }
                          className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                        />
                        <span className="font-medium text-emerald-400">Pantalla Verde (Chroma Key)</span>
                      </label>
                      {video.chromaKeyEnabled && (
                        <span className="text-[10px] font-mono text-emerald-300">
                          Tol {video.chromaKeyTolerance ?? 42}% · Suav {video.chromaKeySmoothness ?? 25}%
                        </span>
                      )}
                    </div>

                    {video.chromaKeyEnabled && (
                      <div className="pt-1 space-y-2">
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                            <span>Tolerancia (cuánto verde quitar)</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={video.chromaKeyTolerance ?? 42}
                                onChange={(e) =>
                                  onUpdateVideo(video.id, {
                                    chromaKeyTolerance: clampPercent(e.target.value, 42),
                                  })
                                }
                                className="w-14 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-mono text-emerald-300 text-right"
                              />
                              <span className="text-slate-500">%</span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={video.chromaKeyTolerance ?? 42}
                            onChange={(e) =>
                              onUpdateVideo(video.id, {
                                chromaKeyTolerance: clampPercent(e.target.value, 42),
                              })
                            }
                            style={{ ['--slider-accent' as string]: '#22c55e' }}
                            className="w-full range-slider"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                            <span>Suavidad / anti-halo en bordes</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={video.chromaKeySmoothness ?? 25}
                                onChange={(e) =>
                                  onUpdateVideo(video.id, {
                                    chromaKeySmoothness: clampPercent(e.target.value, 25),
                                  })
                                }
                                className="w-14 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-mono text-emerald-300 text-right"
                              />
                              <span className="text-slate-500">%</span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={video.chromaKeySmoothness ?? 25}
                            onChange={(e) =>
                              onUpdateVideo(video.id, {
                                chromaKeySmoothness: clampPercent(e.target.value, 25),
                              })
                            }
                            style={{ ['--slider-accent' as string]: '#34d399' }}
                            className="w-full range-slider"
                          />
                        </div>

                        <span className="text-[10px] text-slate-400 block">
                          Arrastra el círculo o escribe el número. Si queda verde sube la
                          tolerancia; si recorta al personaje, bájala. Si el borde vibra, sube la
                          suavidad.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => onPreviewVideo(video)}
                    className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white py-1 px-2 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Eye className="h-3 w-3 text-sky-400" />
                    Vista Previa
                  </button>

                  <button
                    type="button"
                    onClick={() => onRequestDelete(video)}
                    title="Eliminar vídeo de la biblioteca"
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 py-1 px-2 rounded hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {library.length === 0 && (
        <div className="text-center py-10 border border-dashed border-slate-800 rounded-lg">
          <Film className="h-10 w-10 text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-300">Biblioteca vacía</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Importa archivos de vídeo desde tu PC (MP4, WebM, MKV, AVI, MOV) para comenzar.
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors cursor-pointer"
          >
            Importar Primer Vídeo
          </button>
        </div>
      )}
    </section>
  );
};


