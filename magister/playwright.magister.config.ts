import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/e2e',testMatch:'magister.spec.mjs',timeout:45000,workers:1,reporter:'list',use:{trace:'retain-on-failure'}});
