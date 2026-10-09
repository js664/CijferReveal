import {buildExtension} from '../../scripts/build-extension.mjs';
await buildExtension({entries:[['debug-console','src/magister/debug-console.ts'],['content','src/magister/bootstrap.tsx'],['worker','src/state/worker.ts']],archiveName:'pack-opening-voor-magister.zip',archivePrefix:'CijferReveal-Magister',firefoxId:'cijferreveal-magister@js664.github.io',assetRoot:'../assets'});
