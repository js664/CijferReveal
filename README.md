# CijferReveal

Download de nieuwste versie via [onze website](https://js664.github.io/CijferReveal/).

CijferReveal geeft je SOMtoday- of Magister-cijfers één voor één vrij met een korte animatie en geluid. Het echte resultaat verandert niet. Geopende cijfers staan in je lokale inventaris. Beide ZIPs staan in [dezelfde GitHub-release](https://github.com/js664/CijferReveal/releases/latest).

## Installeren

Dit werkt op een computer met Chrome, Edge, Brave of Helium.

1. Kies **SOMtoday** (CijferReveal.zip) of **Magister** (CijferReveal-Magister.zip) op de website. Voor Magister verschijnt eerst een waarschuwing voor mogelijke bugs.
2. Pak de ZIP uit en laat de map staan.
3. Open chrome://extensions, edge://extensions, brave://extensions of helium://extensions.
4. Zet **Ontwikkelaarsmodus** aan.
5. Klik op **Uitgepakte extensie laden** en kies de uitgepakte map met manifest.json.
6. Herlaad SOMtoday of Magister en open **Cijfers**.

Firefox-builds zijn beschikbaar voor tijdelijke developer-installatie; zie [Firefox](#firefox).

## Cijfers openen

- Klik bij een nieuw resultaat op **Open cijfer**.
- Druk op Enter om de animatie te starten of naar het volgende resultaat te gaan.
- Druk op Escape om het scherm te sluiten.
- Ook letters, niveau-aanduidingen en sterren worden getoond; de animatie eindigt op het oorspronkelijke resultaat.
- De inventaris bevat de resultaten die je hebt geopend.
- Via het extensie-icoon kun je **Reset extensie** gebruiken. Dit wist de inventaris en laat je resultaten opnieuw openen.

SOMtoday en Magister hebben afzonderlijke extensies en inventarissen. Magister toont maximaal 25 recente resultaten in een eigen paneel. Jaaroverzichten, gemiddelden en home-widgets zijn niet aangepast.

## Geen knop om te openen?

1. Controleer of de juiste extensie aan staat en toegang tot je schoolomgeving heeft.
2. Herlaad de extensie op de extensiepagina en daarna de schoolwebsite.
3. Open **Cijfers**; in SOMtoday kies je **Laatste cijfers**.
4. Gebruik de herlaadknop als een cijfer niet gekoppeld is. Magister moet eerst zelf een geslaagde cijferaanvraag uitvoeren voordat het paneel verschijnt.
5. Meld je browser, versienummer en wat je ziet bij [Issues](https://github.com/js664/CijferReveal/issues). Deel geen wachtwoorden, cookies, tokens of leerlingnummers.

Voor Magister kun je het verborgen debugpaneel tonen via de browserconsole:

~~~js
window['enable-magister-debug']()
~~~

Met window['disable-magister-debug']() verberg je het. **Download logs (.txt)** exporteert de laatste 1500 lokale technische gebeurtenissen, zonder credentials, leerling-ID's of cijferwaarden. De logs blijven na herladen bewaard; het paneel wordt weer verborgen.

## Bijwerken

Pak de nieuwste ZIP uit over de bestaande map. Herlaad de extensie op de extensiepagina en daarna de schoolwebsite. Verwijder de extensie niet; dan kan je inventaris verdwijnen. Beide versies controleren GitHub op nieuwe releases en tonen een updatebericht. Ze installeren geen updates automatisch.

## Zelf bouwen

Installeer Node.js **22.12 of nieuwer** en Git. Haal de broncode op en installeer de vaste dependencies voor beide projecten:

~~~sh
git clone https://github.com/js664/CijferReveal.git
cd CijferReveal/extension
npm ci
npm --prefix magister ci
~~~

Bouw vanuit de map extension/:

~~~sh
npm run build
npm run build:magister
~~~

| Extensie | Map om uitgepakt te laden | Lokale ZIP |
| --- | --- | --- |
| SOMtoday | dist/ | pack-opening-voor-somtoday.zip |
| Magister | magister/dist/ | magister/pack-opening-voor-magister.zip |

Laad de gewenste map via **Uitgepakte extensie laden**. Alleen SOMtoday bouwen? Dan kun je de installatie en build van Magister overslaan.

Controleer beide pakketten:

~~~sh
npm run validate
npm run validate:magister
~~~

Voor tests, ontwikkelbuilds, Firefox en publicatie: [ontwikkeling](#ontwikkeling).

## Projectindeling

| Pad | Inhoud |
| --- | --- |
| extension/src/ | SOMtoday-adapter |
| extension/magister/ | Magister-adapter, manifest en tests |
| extension/shared/ | Gedeelde animaties, audio, resultaten, inventaris en opslag |
| extension/assets/ | Audio, iconen en bronvermelding |
| extension/tests/ | SOMtoday- en gedeelde tests |
| extension/scripts/ | Build, validatie, secretcontrole en releasevoorbereiding |
| website/ | GitHub Pages-downloadpagina |
| .github/workflows/ | Controles, releases en websitepublicatie |

## Ontwikkeling

Voer alle npm-commando's uit vanuit extension/. Gebruik Node.js 22.12 of nieuwer.

~~~sh
npm run typecheck
npm run lint
npm test
npm --prefix magister run typecheck
npm --prefix magister run lint
npm run test:magister
npm run check:secrets
~~~

Voor het lokale animatie-testscherm: npm run dev en open tester.html op het getoonde adres.
Ontwikkelbuilds worden gemaakt met npm run build:dev en npm --prefix magister run build:dev.
Publiceer alleen productiebuilds.

Voor browsertests:

~~~sh
npx playwright install chromium
npm run build
npm run build:magister
npm run build:dev
npm run test:e2e
npm run test:e2e:magister
~~~

### Firefox

~~~sh
npm run build:firefox
npm --prefix magister run build:firefox
~~~

Laad dist-firefox/manifest.json of magister/dist-firefox/manifest.json via
about:debugging#/runtime/this-firefox en **Tijdelijke add-on laden**. Dit zijn ongetekende developer-builds.

### Releases en lokale opslag

Werk voor een release de versie in package.json, package-lock.json en manifest.json van
beide projecten bij en voeg release-notities toe aan CHANGELOG.md.
Voer alle controles en browsertests uit. Een stabiele tag vX.Y.Z activeert de gezamenlijke
releaseworkflow, die beide productie-ZIPs bouwt en publiceert.
Voor lokale voorbereiding: node scripts/prepare-release.mjs vX.Y.Z release-packages/X.Y.Z.

Beide adapters gebruiken extension/shared/state/migrations.ts. Behoud de validatie van
opgeslagen records, aliases, inventarisvelden, instellingen en metadata. Een broncodeverplaatsing
mag inventarissen niet resetten.

## Privacy en licentie

Cijfers en instellingen blijven op je apparaat en worden niet naar de maker gestuurd. SOMtoday gebruikt antwoorden die de schoolwebsite zelf ophaalt. Magister vraagt recente cijfers op bij je eigen schoolomgeving met een tijdelijk in het geheugen gehouden Authorization-header. Lees de [privacyverklaring](extension/PRIVACY.md).

De broncode valt onder de [PolyForm Noncommercial 1.0.0-licentie](extension/LICENSE). Je mag gebruiken, aanpassen en delen voor niet-commerciële doelen volgens die licentie. Commercieel gebruik vereist toestemming van js664. Voeg bij delen de licentie en bronvermelding toe; behoud ook de [notices](extension/THIRD_PARTY_NOTICES.txt).

CijferReveal is onafhankelijk van SOMtoday en Magister. Scholen kunnen extensies blokkeren; wijzigingen aan de schoolwebsite kunnen aanpassingen vereisen. Zie [CHANGELOG.md](extension/CHANGELOG.md) voor wijzigingen.
