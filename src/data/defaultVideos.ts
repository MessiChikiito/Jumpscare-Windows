import { JumpscareVideo } from '../types';

export const DEFAULT_VIDEOS: JumpscareVideo[] = [
  {
    id: 'fnaf2_foxy_greenscreen',
    name: 'FNAF 2: Foxy Jumpscare (Pantalla Verde)',
    sourceType: 'custom_url',
    mediaType: 'video',
    src: '/assets/aistudio/Fnaf_2_Foxy_Jumpscare_Green_Screen_7efbcb69.mp4',
    duration: 1.8,
    volume: 100,
    enabled: true,
    chromaKeyEnabled: true,
    chromaKeyTolerance: 42,
    description: 'Jumpscare original de Foxy en FNAF 2 abalanzándose desde la oscuridad, con fondo verde eliminado en tiempo real.',
    thumbnail: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180" fill="%230b0f17"><rect width="320" height="180" fill="%23052e16"/><rect x="10" y="10" width="300" height="160" rx="8" fill="%230f172a" stroke="%2322c55e" stroke-width="2"/><path d="M120 45 L160 95 L200 45 L180 120 L140 120 Z" fill="%23b91c1c"/><circle cx="145" cy="80" r="8" fill="%23facc15"/><circle cx="175" cy="80" r="10" fill="%23000"/><circle cx="175" cy="80" r="13" stroke="%23333" stroke-width="2" fill="none"/><path d="M135 125 Q160 150 185 125" stroke="%23ef4444" stroke-width="5" fill="none"/><text x="160" y="155" fill="%234ade80" font-family="monospace" font-weight="bold" font-size="12" text-anchor="middle">[ FOXY 2 · CHROMA KEY ]</text></svg>',
  },
  {
    id: 'fnaf3_phantom_chica_greenscreen',
    name: 'FNAF 3: Phantom Chica Jumpscare (Pantalla Verde)',
    sourceType: 'custom_url',
    mediaType: 'video',
    src: '/assets/aistudio/Five_Nights_at_Freddys_3_Phantom_chica_jumscare_Green_screen_582aac85.mp4',
    duration: 2.5,
    volume: 100,
    enabled: true,
    chromaKeyEnabled: true,
    chromaKeyTolerance: 42,
    description: 'Aparición repentina y alarido de Phantom Chica (FNAF 3) procesada con transparencia en tiempo real.',
    thumbnail: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180" fill="%230b0f17"><rect width="320" height="180" fill="%23052e16"/><rect x="10" y="10" width="300" height="160" rx="8" fill="%230f172a" stroke="%2322c55e" stroke-width="2"/><circle cx="160" cy="85" r="45" fill="%23854d0e"/><circle cx="142" cy="75" r="7" fill="%23ffffff"/><circle cx="178" cy="75" r="7" fill="%23ffffff"/><polygon points="160,95 145,115 175,115" fill="%23ea580c"/><text x="160" y="155" fill="%234ade80" font-family="monospace" font-weight="bold" font-size="12" text-anchor="middle">[ PHANTOM CHICA · CHROMA ]</text></svg>',
  },
];
