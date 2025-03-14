import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Islamic Prayer Times Visualization',
    short_name: 'Prayer Times',
    description: 'Beautiful visualization of Islamic prayer times with accurate twilight periods',
    start_url: '/',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#312e81',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
