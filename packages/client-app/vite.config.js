import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
export default defineConfig({
    server: { port: 5173 },
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
    plugins: [
        VitePWA({
            registerType: 'autoUpdate',
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/api\.openai\.com\/.*$/i,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'openai-api-cache',
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 60 * 60 * 24, // 24 hours
                            },
                        },
                    },
                    {
                        urlPattern: /^https:\/\/.*\.openrouter\.ai\/.*$/i,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'openrouter-api-cache',
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 60 * 60 * 24, // 24 hours
                            },
                        },
                    },
                ],
            },
            manifest: {
                name: 'Gon Voice Assistant',
                short_name: 'Gon',
                description: 'Your personal AI voice assistant',
                theme_color: '#6366f1',
                background_color: '#ffffff',
                display: 'standalone',
                orientation: 'portrait',
                scope: '/',
                start_url: '/',
                icons: [
                    {
                        src: '/icon.svg',
                        sizes: 'any',
                        type: 'image/svg+xml',
                        purpose: 'any maskable',
                    },
                ],
            },
        }),
    ],
});
