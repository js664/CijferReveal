# CijferReveal

Met CijferReveal open je SOMtoday-cijfers één voor één, met een korte animatie en geluid. Je cijfer staat al vast. De extensie verandert het nooit. Open cijfers vind je terug in de inventaris.

## Installeren

Dit werkt met Chrome, Edge, Brave en Helium op een computer. Je hoeft niet te kunnen programmeren.

1. Download **CijferReveal.zip** via [de website](https://js664.github.io/CijferReveal/).
2. Pak de ZIP uit in een map en laat de map daar staan.
3. Open de extensiepagina van je browser:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
   - Helium: `helium://extensions` (werkt dit niet, probeer `chrome://extensions`)
4. Zet **Ontwikkelaarsmodus** aan.
5. Klik op **Uitgepakte extensie laden** en kies de map die je net hebt uitgepakt.
6. Herlaad de SOMtoday-pagina. Ga daarna naar **Cijfers**.

## Zo werkt het

- Bij een cijfer dat je nog niet hebt geopend staat **?**. Klik op **Open cijfer**.
- Klik op **Open Cijfer** of druk op Enter om de animatie te starten.
- Daarna zie je het echte cijfer. Ook een `*` wordt gewoon als `*` getoond.
- Druk op Enter om naar het volgende cijfer te gaan. Escape sluit het scherm.
- In **Inventaris** vind je de cijfers die je al hebt geopend.
- Klik op het extensie-icoon voor het versienummer en **Reset extensie**. Die knop wist je inventaris en zet je cijfers weer klaar om te openen.

## Geen knop om te openen?

1. Kijk of CijferReveal aan staat en SOMtoday mag gebruiken.
2. Herlaad de extensie en daarna de SOMtoday-pagina.
3. Open **Cijfers** of bekijk de losse resultaten van een vak.
4. Staat er **Cijfer nog niet gekoppeld**? Klik op **Pagina opnieuw laden**.
5. Werkt het nog steeds niet? Meld je browser, versienummer en wat je ziet bij [Issues](https://github.com/js664/CijferReveal/issues). Stuur geen wachtwoorden, cookies, tokens of leerlingnummers mee.

Nieuwe cijfers en gewijzigde cijfers worden opnieuw herkend. Als een `*` later een cijfer wordt, kun je die nieuwe versie ook openen. De oude versie blijft in je inventaris staan. Bij twijfel blijft een cijfer verborgen.

## Bijwerken

Download en pak de nieuwste release uit over de bestaande map. Klik daarna op het herlaadicoon naast CijferReveal op de extensiepagina. Herlaad ook SOMtoday. Verwijder de oude extensie niet: dan kan je inventaris verdwijnen.

## Privacy en ondersteuning

Je cijfers en instellingen blijven op je eigen apparaat. Er is geen account bij CijferReveal en de extensie stuurt je gegevens niet naar de maker. De extensie leest alleen cijfergegevens die SOMtoday zelf al ophaalt.

## Licentie

Iedereen kan de broncode bekijken en forken, maar de voorwaarden beperken wat je ermee mag doen. De code valt onder de [PolyForm Noncommercial 1.0.0-licentie](LICENSE): gebruik, aanpassingen en delen zijn alleen toegestaan voor niet-commerciële doelen. Commercieel gebruik of geld verdienen ermee mag alleen met aparte toestemming van js664.

Als je een kopie of aangepaste versie deelt, moet je de licentie en de verplichte creditregel uit het LICENSE-bestand meeleveren en js664 vermelden met een link naar dit project. De details en uitzonderingen staan in de licentie.

CijferReveal is gemaakt voor computerbrowsers die op Chromium werken. Het is niet gemaakt voor Firefox, Safari of mobiele browsers. Sommige scholen kunnen extensies blokkeren. We hebben tests gedaan met voorbeeldcijfers; dat garandeert niet dat elke school of toekomstige SOMtoday-versie werkt.

## Zelf bouwen

Dit is alleen nodig als je de code wilt aanpassen. Installeer [Node.js](https://nodejs.org/) versie 22.12 of nieuwer. Open daarna een terminal in de map en voer uit:

```sh
npm ci
npm run build
```

De map `dist` is de extensie. Je kunt die laden via **Uitgepakte extensie laden**. Andere opdrachten voor ontwikkelaars staan in `package.json`.

CijferReveal is een onafhankelijk project. SOMtoday maakt of controleert deze extensie niet.
