import js from '@eslint/js';
import ts from 'typescript-eslint';
import globals from 'globals';
export default ts.config({ignores:['dist/**','dist-dev/**','dist-firefox/**','store-builds/**','dist-developer-*/**','dist-snapshot-*/**','node_modules/**','test-results/**','playwright-report/**','pack-opening-voor-somtoday/**','SOMtoday-local-grade-test.user.js','.impeccable/**']},js.configs.recommended,...ts.configs.recommended,{languageOptions:{globals:{...globals.browser,...globals.node,chrome:'readonly'}},rules:{'@typescript-eslint/no-explicit-any':'error','@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_'}]}});
