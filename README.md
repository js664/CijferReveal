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

Firefox-builds zijn beschikbaar voor tijdelijke developer-installatie; zie de [ontwikkelgids](docs/DEVELOPMENT.md#firefox).

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
cd CijferReveal
npm ci
npm --prefix magister ci
~~~

Bouw vanuit de hoofdmap:

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

Voor tests, ontwikkelbuilds, Firefox en publicatie: [ontwikkelgids](docs/DEVELOPMENT.md).

## Projectindeling

| Pad | Inhoud |
| --- | --- |
| src/, tests/, assets/ | SOMtoday-broncode, tests en gebruikte assets |
| magister/ | Zelfstandig Magister-project; pas de code hier direct aan |
| scripts/ | Build-, validatie- en releasehulpmiddelen |
| website/ | GitHub Pages-downloadpagina |
| docs/ | Ontwikkelgids en historische documentatie |
| .github/workflows/ | Automatische controles, gezamenlijke releases en websitepublicatie |

## Privacy en licentie

Cijfers en instellingen blijven op je apparaat en worden niet naar de maker gestuurd. SOMtoday gebruikt antwoorden die de schoolwebsite zelf ophaalt. Magister vraagt recente cijfers op bij je eigen schoolomgeving met een tijdelijk in het geheugen gehouden Authorization-header. Lees de [privacyverklaring](PRIVACY.md).

De broncode valt onder de [PolyForm Noncommercial 1.0.0-licentie](LICENSE). Je mag gebruiken, aanpassen en delen voor niet-commerciële doelen volgens die licentie. Commercieel gebruik vereist toestemming van js664. Voeg bij delen de licentie en bronvermelding toe; behoud ook de [notices](THIRD_PARTY_NOTICES.txt).

CijferReveal is onafhankelijk van SOMtoday en Magister. Scholen kunnen extensies blokkeren; wijzigingen aan de schoolwebsite kunnen aanpassingen vereisen. Zie [CHANGELOG.md](CHANGELOG.md) voor wijzigingen.
