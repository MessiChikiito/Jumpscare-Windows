import { AppSettings, JumpscareVideo, ScarePayload } from '../types';

export function isDesktopApp(): boolean {
  return typeof window !== 'undefined' && Boolean(window.foxy);
}

/**
 * Prepara el payload que consume la ventana de overlay. Los archivos subidos por el
 * usuario viven en blob URLs del renderer principal, así que hay que enviar sus bytes.
 */
export async function buildScarePayload(
  video: JumpscareVideo,
  settings: AppSettings
): Promise<ScarePayload> {
  let blobData: ArrayBuffer | undefined;
  let mime: string | undefined;

  if (video.src.startsWith('blob:')) {
    const response = await fetch(video.src);
    const blob = await response.blob();
    blobData = await blob.arrayBuffer();
    mime = blob.type || (video.mediaType === 'audio' ? 'audio/mpeg' : 'video/mp4');
  }

  const masterVolume = settings.audioEnabled ? settings.masterVolume : 0;
  const volume =
    Math.min(1, Math.max(0, masterVolume / 100)) * Math.min(1, Math.max(0, video.volume / 100));

  return {
    src: video.src,
    blobData,
    mime,
    name: video.name,
    mediaType: video.mediaType === 'audio' ? 'audio' : 'video',
    duration: video.duration > 0 ? video.duration : 10,
    volume,
    speed: video.speed || settings.playbackSpeed || 1,
    chromaKeyEnabled: Boolean(video.chromaKeyEnabled),
    chromaKeyTolerance: video.chromaKeyTolerance ?? 42,
    chromaKeySmoothness: video.chromaKeySmoothness ?? 25,
    volumeBoost: video.volumeBoost ?? 300,
    panicKey: settings.panicKey,
    fullscreen: settings.fullscreen,
    displayId: settings.targetDisplayId,
  };
}
