import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],resolve:{dedupe:['react','react-dom','motion']},base:'./',server:{watch:{ignored:['**/store-builds/**','**/dist-firefox/**','**/dist-dev/**','**/dist-snapshot-*/**','**/dist-developer-*/**']}},build:{rollupOptions:{input:{popup:'popup.html',tester:'tester.html'}}},test:{environment:'jsdom',include:['tests/**/*.test.{ts,tsx}']}});
