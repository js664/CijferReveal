# Ontwikkelen en publiceren

De [README](../README.md#zelf-bouwen) bevat de installatie en productiebuilds. Voer onderstaande hoofdmapcommando's uit vanuit de gekloonde repository. Er is geen externe Magister-werkmap of synchronisatiescript nodig.

## Broncode

SOMtoday gebruikt src/; Magister gebruikt magister/src/. Beide projecten hebben eigen manifests, dependencies en tests. Werk direct in het juiste project. De algemene opening, resultaatfamilies en opslagcode zijn voorlopig nog gekopieerd: controleer beide projecten als je daar wijzigingen aanbrengt. Het samenvoegen van die code is een afzonderlijke refactor.

## Controles

~~~sh
npm run typecheck
npm run lint
npm test
npm --prefix magister run typecheck
npm --prefix magister run lint
npm run test:magister
npm run build
npm run build:magister
npm run validate
npm run validate:magister
~~~

De validatie controleert manifest, rechten, verpakte bestanden en ZIP-inhoud. De releasevoorbereiding controleert bovendien dat de migratiebeveiligingen voor lokale opslag overeenkomen. Behoud de controles voor records, aliases, inventaris, instellingen en metadata in beide state/migrations.ts-bestanden.

## Browsertests

Installeer de testbrowser en maak eerst de productiebuilds. De SOMtoday-tests gebruiken ook de ontwikkelbuild:

~~~sh
npx playwright install chromium
npm run build:dev
npm run test:e2e
npm run test:e2e:magister
~~~

Op Linux kan npx playwright install --with-deps chromium de benodigde systeembibliotheken installeren. De tests gebruiken synthetische schoolpagina's en gegevens. Magister controleert onder andere login/uitloggen, credential-isolatie, verhullen, inventaris, debugexport en updates. De website-test controleert de downloadkeuze en waarschuwing.

## Ontwikkelbuilds

~~~sh
npm run build:dev
npm --prefix magister run build:dev
~~~

Deze builds staan in dist-dev/ en magister/dist-dev/. Voor het lokale animatie-testscherm: npm run dev en open de tester.html-pagina op het door Vite getoonde adres. Publiceer geen ontwikkelbuilds als download.

## Firefox

~~~sh
npm run build:firefox
npm --prefix magister run build:firefox
~~~

De uitvoer staat in dist-firefox/ en magister/dist-firefox/. Firefox-ZIPs worden per project gemaakt. Open about:debugging#/runtime/this-firefox, kies **Tijdelijke add-on laden** en selecteer het betreffende manifest.json. Dit zijn ongetekende developer-builds, geen winkelinstallaties.

## Gezamenlijke release

1. Werk de versie in package.json, package-lock.json en manifest.json van beide projecten bij en voeg een sectie aan de hoofd-CHANGELOG toe.
2. Voer de controles en browsertests voor beide projecten uit. Controleer ook de staged bestanden met npm run check:secrets -- --staged.
3. Maak een commit en één stabiele tag vX.Y.Z op die commit. Push de tag met een account dat release-tags mag aanmaken.
4. De releaseworkflow bouwt en test die exacte commit en publiceert **CijferReveal.zip** en **CijferReveal-Magister.zip** samen in dezelfde normale GitHub-release. Beide updatecheckers gebruiken de nieuwste gezamenlijke release.
5. Publiceer de hoofdbranch nadat beide assets beschikbaar zijn. GitHub Pages bouwt website/ en vult de versie uit het hoofdmanifest in.

Voor lokale releasevoorbereiding na de productiebuilds:

~~~sh
node scripts/prepare-release.mjs vX.Y.Z release-packages/X.Y.Z
~~~

De tweede parameter is een nieuwe uitvoermap voor de gecontroleerde ZIPs en gezamenlijke releasetext. Wijzig voor een bronopruiming geen reeds gepubliceerde downloads of tags.

## Documentatie

Actuele informatie staat in de README, deze gids, de CHANGELOG en PRIVACY. [docs/archive](archive/README.md) bevat historische controles en SOMtoday-notities; die zijn geen huidige buildinstructies.
