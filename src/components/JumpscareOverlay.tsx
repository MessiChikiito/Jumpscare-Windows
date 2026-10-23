import React from 'react';
import { JumpscareVideo } from '../types';
import { ScareStage } from './ScareStage';

interface JumpscareOverlayProps {
  video: JumpscareVideo;
  masterVolume: number;
  playbackSpeed?: number;
  panicKey: string;
  onFinished: () => void;
}

/**
 * Fallback para navegador (sin Electron): muestra el susto dentro de la página,
 * sin fondo negro ni capas opacas, reutilizando el mismo motor de chroma key.
 */
export const JumpscareOverlay: React.FC<JumpscareOverlayProps> = ({
  video,
  masterVolume,
  playbackSpeed = 1.0,
  panicKey,
  onFinished,
}) => {
  const effectiveVolume =
    Math.min(1, Math.max(0, masterVolume / 100)) * Math.min(1, Math.max(0, video.volume / 100));

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden bg-transparent select-none cursor-none">
      <ScareStage
        config={{
          src: video.src,
          name: video.name,
          mediaType: video.mediaType,
          duration: video.duration,
          volume: effectiveVolume,
          speed: video.speed || playbackSpeed || 1,
          chromaKeyEnabled: Boolean(video.chromaKeyEnabled),
          chromaKeyTolerance: video.chromaKeyTolerance ?? 42,
          chromaKeySmoothness: video.chromaKeySmoothness ?? 25,
          volumeBoost: video.volumeBoost ?? 300,
          panicKey,
        }}
        onFinished={onFinished}
      />
    </div>
  );
};
