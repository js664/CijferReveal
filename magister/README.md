# CijferReveal voor Magister

Magister-versie van CijferReveal 0.2.8. Download CijferReveal-Magister.zip via https://js664.github.io/CijferReveal/. Pak uit en laad de map via Ontwikkelaarsmodus / Uitgepakte extensie laden in Chrome of Edge. Open daarna Cijfers in je schoolomgeving en herlaad indien nodig.

Deze versie heeft dezelfde pack-openinganimatie, geluiden en resultaatfamilies als SOMtoday. De extensie toont maximaal 25 recente cijfers in een eigen paneel; lokale inventaris en replay zijn inbegrepen. Jaaroverzichten, gemiddelden en home-widgets zijn niet aangepast.

Authorization wordt alleen tijdelijk per tabblad in het achtergrondgeheugen gehouden. Lokale migratiebeveiligingen blijven behouden. Zie ../PRIVACY.md voor details.

## Diagnostiek

Het paneel is standaard verborgen; technische gebeurtenissen blijven lokaal bewaard (laatste 1500). Voer window['enable-magister-debug']() in de Magister-browserconsole uit om het paneel te tonen. Met window['disable-magister-debug']() verberg je het. Download logs (.txt) exporteert pagina- en achtergrondgebeurtenissen zonder tokens, leerling-ID's, cijferwaarden of ruwe API-antwoorden. Alleen jij kunt het TXT-bestand delen. Na herladen is het paneel weer verborgen.

## Bouwen en controleren

npm ci
npm run typecheck
npm test
npm run build
npm run validate
npm run test:e2e

Firefox kan met npm run build:firefox gebouwd worden; de ongetekende ZIP is bedoeld voor tijdelijke developer-installatie.

## Loginbeveiliging

Login- en callbackschermen blijven volledig native. Het cijferpaneel start alleen op een bekende cijfercontainer na een geslaagde cijferaanvraag van Magister zelf. De loginfix is gecontroleerd met een synthetische login-, SPA- en uitlogtest; controle van de echte school-SSO blijft noodzakelijk voor publicatie.

## Voorlopige versie en updates

Magister staat samen met SOMtoday in één normale GitHub-release. Alleen de website waarschuwt voor de download dat deze versie nog in ontwikkeling is. Na inloggen controleert de updatechecker maximaal eens per uur op nieuwe gezamenlijke releases, alleen normale releases. Er gaan geen schoolcredentials of cijfergegevens naar GitHub. Het updatebericht opent de releasepagina; er wordt niets automatisch geïnstalleerd.
