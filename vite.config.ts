import { defineConfig } from 'vite';
export default defineConfig({server:{host:'0.0.0.0',proxy:{'/socket.io':{target:'http://127.0.0.1:3000',ws:true}}},build:{rollupOptions:{input:{main:'index.html',visualLab:'visual-lab.html',vfxPlayground:'vfx-playground.html'}}}});
