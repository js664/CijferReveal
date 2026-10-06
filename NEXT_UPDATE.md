# Overzicht updates

De onderstaande extensiefixes horen bij **0.2.7**. Nieuwe bugmeldingen komen onder een volgende versie te staan.

## Extensie

| Probleem | Oplossing | Status |
| --- | --- | --- |
| Cijfers van een ander schoolniveau worden niet gekoppeld. | SOMtoday geeft zulke cijfers door in aparte `formatted…Alternatief`-velden. Die nu apart verwerken. De echte kaartvelden lezen en losse labels negeren. Bij twee mogelijke resultaten blijft openen geblokkeerd. | Unit- en browsertests geslaagd. De echte gegevens van de getroffen gebruiker zijn niet beschikbaar. |
| De updatepopup verschijnt pas na extra herladen. | Versiecontrole starten op de SOMtoday-startpagina en de melding tonen bij het openen van Cijfers. | Browsertest geslaagd, ook na herladen. |
| Het is niet duidelijk wie de updatepopup toont. | De melding krijgt het label **CijferReveal-extensie**. | Gereed. |
| Beschadigde opgeslagen gegevens kunnen de extensie verstoren. | Records, aliassen en inventaris controleren; onbruikbare items verwijderen; instellingen apart herstellen. | Gereed en getest. Deze beveiliging moet meegaan in de release. |
| Reset kan in Firefox worden geweigerd. | De eigen Firefox-extensiepagina correct herkennen en vreemde afzenders blijven weigeren. | Gereed; eerder lokaal getest in Firefox. |

## Website en README

- Kortere, gewone Nederlandse tekst in de README, FAQ en privacyuitleg — gepusht op 6 oktober 2026 (commit `e8adf72`).
- Merkinformatie op de downloadpagina achter een uitklapbaar label — gepusht.
- Privacyuitleg over het lokaal bewaren van updategegevens — opgenomen in 0.2.7.

De website- en README-teksten zijn eerder gepusht. De nieuwe updatecontrole en extensiefixes horen bij release 0.2.7. Er wordt alleen een normale Chrome-build als download gepubliceerd. De Firefox-bouwoptie is beschikbaar voor ontwikkelaars; de winkelpublicatie volgt apart.

## Onderzoek naar het extra niveaulabel

De openbare SOMtoday-code is op 6 oktober 2026 gecontroleerd. Het label staat naast de vaknaam in `.titel-postfix`, niet in `.titel`. Het label zelf vervuilt de vaknaam in deze versie dus niet. SOMtoday maakt daarnaast aparte recente kaarten uit `formattedEerstePogingAlternatief`, `formattedHerkansing1Alternatief` en `formattedHerkansing2Alternatief`. CijferReveal las die velden nog niet. Dit verklaart een reproduceerbare fout bij een kaart waarvan het alternatieve cijfer afwijkt van het standaardcijfer.

De fix gebruikt geen lijst met niveaunamen. Het bekende `.titel-postfix`-veld geeft aan dat het om de alternatieve normering gaat; de tekst van dat label wordt geen deel van de vaknaam. Andere labels en onbekende badges worden genegeerd. Zonder genoeg informatie om twee resultaten veilig uit elkaar te houden blijft de kaart geblokkeerd.

Bestaande sleutels voor standaardcijfers veranderen niet. Alternatieve pogingen krijgen een eigen variant en dus een eigen sleutel voor openen, opslaan en inventaris. Een herlaadtest controleert dat het alternatieve cijfer geopend blijft en het standaardcijfer zijn eigen status houdt. De controles van opgeslagen gegevens in `src/state/migrations.ts` blijven behouden.

Bronnen: [SOMtoday-kaarttemplate](https://leerling.somtoday.nl/chunk-CBHOLQ67.js) en [SOMtoday-opbouw van recente pogingen](https://leerling.somtoday.nl/chunk-B26NUKKB.js). Deze openbare bestanden kunnen na een SOMtoday-update een andere naam krijgen.

## Voorbereiding voor de winkels

Lokale Chrome- en Firefox-pakketten, eigen iconen, licentieteksten en privacydocumenten zijn voorbereid. Dat betekent nog niet dat de winkels de extensie hebben goedgekeurd. Een winkelpublicatie is een aparte stap.

## Bij een volgende release

Werk dit overzicht bij zodra er een nieuwe bug bijkomt. Zet de afgeronde punten bij de juiste versie in `CHANGELOG.md`. Publiceer pas wanneer daar om gevraagd wordt. Bewaar de lokale controles in `src/state/migrations.ts` bij het bouwen en publiceren.

## Laatste controle

281 unit-tests geslaagd. Alle 45 browserchecks zijn gecontroleerd: 44 slaagden in de volledige run; de nieuwe test voor een ander niveau slaagde na het corrigeren van de knoplocatie in de test. Typecheck, lint, productiebuild en pakketcontrole slagen. De herlaadtest bevestigt dat het geopende alternatieve cijfer apart blijft van het nog ongeopende standaardcijfer.
