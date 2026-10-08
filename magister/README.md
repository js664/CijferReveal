# CijferReveal voor Magister

Dit is het zelfstandige Magister-project binnen [CijferReveal](../README.md). Download CijferReveal-Magister.zip via [de website](https://js664.github.io/CijferReveal/) of de gezamenlijke GitHub-release.

Het paneel toont maximaal 25 recente cijfers. Openingen, geluid, resultaatfamilies, lokale inventaris en replay zijn inbegrepen. Jaaroverzichten, gemiddelden en home-widgets zijn niet aangepast. Login- en callbackschermen blijven native; het paneel start pas na een geslaagde eigen Magister-cijferaanvraag.

## Zelf bouwen

Installeer Node.js 22.12 of nieuwer. Vanuit deze magister-map:

~~~sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run validate
~~~

Laad dist/ als uitgepakte extensie. De ZIP heet pack-opening-voor-magister.zip. Voor de browsertests:

~~~sh
npx playwright install chromium
npm run test:e2e
~~~

Je kunt ook de hoofdmapcommando's uit de [README](../README.md#zelf-bouwen) gebruiken. Pas Magister direct in deze map aan; een externe kopie is niet nodig. Zie de [ontwikkelgids](../docs/DEVELOPMENT.md) voor Firefox, ontwikkelbuilds en releases.

## Diagnostiek en updates

Het debugpaneel is standaard verborgen. Toon het in de Magister-browserconsole met window['enable-magister-debug']() en verberg het met window['disable-magister-debug'](). Download logs (.txt) exporteert de laatste 1500 lokale technische gebeurtenissen zonder tokens, leerling-ID's of cijferwaarden. Logs blijven na herladen bewaard; het paneel is dan weer verborgen.

De updatechecker gebruikt de nieuwste gezamenlijke GitHub-release, controleert de Magister-asset en bewaart updategegevens maximaal één uur. Updates worden niet automatisch geïnstalleerd. Authorization blijft tijdelijk per tabblad in het achtergrondgeheugen en gaat niet naar GitHub. Zie [PRIVACY.md](../PRIVACY.md).
