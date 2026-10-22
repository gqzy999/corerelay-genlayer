import {defineConfig} from 'vite';
export default defineConfig({
  base:'./',
  build:{rollupOptions:{output:{manualChunks(id){
    if(id.includes('node_modules/@metamask/'))return 'wallet';
    if(id.includes('node_modules/viem/'))return 'evm';
    if(id.includes('node_modules/genlayer-js/'))return 'genlayer';
  }}}}
});
