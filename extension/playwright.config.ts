import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/e2e',timeout:30000,workers:1,reporter:'list',use:{trace:'retain-on-failure'},webServer:{command:'npm run dev -- --port 5174',url:'http://127.0.0.1:5174/tester.html',reuseExistingServer:false}});
