# CijferReveal

Download de nieuwste versie via [onze website](https://js664.github.io/CijferReveal/).

CijferReveal geeft je SOMtoday-cijfers één voor één vrij, met een korte animatie en geluid. Het cijfer verandert niet. Geopende cijfers staan in je inventaris.

## Installeren

Dit werkt op een computer met Chrome, Edge, Brave of Helium. Je hoeft niet te kunnen programmeren.

1. Download **CijferReveal.zip** via [onze website](https://js664.github.io/CijferReveal/).
2. Pak de ZIP uit en laat de map staan.
3. Open de extensiepagina van je browser:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
   - Helium: `helium://extensions` (werkt dat niet, probeer `chrome://extensions`)
4. Zet **Ontwikkelaarsmodus** aan.
5. Klik op **Uitgepakte extensie laden** en kies de uitgepakte map.
6. Herlaad SOMtoday en open **Cijfers**.

Firefox-versie volgt later.

## Cijfers openen

- Klik bij een nieuw cijfer op **Open cijfer**.
- Druk op Enter om de animatie te starten of naar het volgende cijfer te gaan.
- Druk op Escape om het scherm te sluiten.
- Ook letters en `*` worden getoond.
- In **Inventaris** staan de cijfers die je hebt geopend.
- Klik op het extensie-icoon om **Reset extensie** te gebruiken. Dit wist je inventaris en laat je cijfers opnieuw openen.

## Geen knop om te openen?

1. Controleer of CijferReveal aan staat en toegang tot SOMtoday heeft.
2. Herlaad eerst de extensie en daarna SOMtoday.
3. Open **Cijfers → Laatste cijfers**.
4. Staat er **Cijfer nog niet gekoppeld**? Klik op **Pagina opnieuw laden**.
5. Werkt het nog niet? Meld je browser, versienummer en wat je ziet bij [Issues](https://github.com/js664/CijferReveal/issues). Deel daar geen wachtwoorden, cookies, tokens of leerlingnummers.

Nieuwe of gewijzigde cijfers worden opnieuw herkend. Verandert een `*` later in een cijfer, dan kun je dat cijfer ook openen. Bij twijfel blijft een cijfer verborgen.

## Bijwerken

Download de nieuwste versie en pak die uit over de bestaande map. Klik op het herlaadicoon naast CijferReveal op de extensiepagina en herlaad SOMtoday. Verwijder de extensie niet; dan kan je inventaris verdwijnen.

## Privacy

Je cijfers en instellingen blijven op je apparaat. CijferReveal stuurt ze niet naar de maker. De extensie gebruikt cijfergegevens die SOMtoday al aan je browser heeft geleverd. Lees meer op de [privacy-pagina](https://js664.github.io/CijferReveal/privacy.html).

## Licentie

De broncode valt onder de [PolyForm Noncommercial 1.0.0-licentie](LICENSE). Je mag CijferReveal gebruiken, aanpassen en delen voor niet-commerciële doelen, als je de licentie volgt. Commercieel gebruik of geld verdienen ermee mag alleen met toestemming van js664.

Deel je een kopie of aangepaste versie? Voeg dan het LICENSE-bestand toe en vermeld js664 met een link naar dit project. De precieze regels staan in de licentie.

CijferReveal is een onafhankelijk project. SOMtoday maakt of controleert de extensie niet. Scholen kunnen extensies blokkeren. De werking kan veranderen als SOMtoday wordt aangepast.

## Zelf bouwen

Dit is alleen nodig als je de code wilt aanpassen. Installeer [Node.js](https://nodejs.org/) versie 22.12 of nieuwer. Open een terminal in de projectmap en voer uit:

```sh
npm ci
npm run build
```

De extensie staat daarna in de map `dist`. Laad die via **Uitgepakte extensie laden**.
