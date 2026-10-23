import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { ScareStage, ScarePlaybackConfig } from './components/ScareStage';
import type { ScarePayload } from './types';
import './index.css';

function toPlaybackConfig(payload: ScarePayload, src: string): ScarePlaybackConfig {
  return {
    src,
    name: payload.name,
    mediaType: payload.mediaType,
    duration: payload.duration,
    volume: payload.volume,
    speed: payload.speed,
    chromaKeyEnabled: payload.chromaKeyEnabled,
    chromaKeyTolerance: payload.chromaKeyTolerance,
    chromaKeySmoothness: payload.chromaKeySmoothness,
    volumeBoost: payload.volumeBoost ?? 300,
    panicKey: payload.panicKey,
  };
}

function OverlayApp() {
  const [config, setConfig] = useState<ScarePlaybackConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const load = async () => {
      try {
        const payload = await window.foxy?.consumeScarePayload();

        if (!payload) {
          window.foxy?.finishScare();
          return;
        }

        let src = payload.src;

        if (payload.blobData) {
          const source =
            payload.blobData instanceof ArrayBuffer
              ? new Uint8Array(payload.blobData)
              : payload.blobData;
          const buffer = new ArrayBuffer(source.byteLength);
          new Uint8Array(buffer).set(source);
          objectUrl = URL.createObjectURL(
            new Blob([buffer], { type: payload.mime || 'video/mp4' })
          );
          src = objectUrl;
        }

        if (!cancelled) setConfig(toPlaybackConfig(payload, src));
      } catch {
        window.foxy?.finishScare();
      }
    };

    load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  if (!config) {
    return <div className="h-full w-full bg-transparent" />;
  }

  return (
    <div className="h-full w-full bg-transparent">
      <ScareStage config={config} onFinished={() => window.foxy?.finishScare()} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<OverlayApp />);
