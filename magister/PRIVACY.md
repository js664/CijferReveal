# Privacy van CijferReveal

Bijgewerkt op 8 oktober 2026. Ontwikkelaar: [js664](https://github.com/js664).

CijferReveal gebruikt je SOMtoday- of Magister-resultaten om cijfers te openen en in je inventaris te tonen. De extensie verandert je cijfers niet.

## Wat bewaart CijferReveal?

De extensie bewaart gegevens die SOMtoday al aan je browser heeft gegeven: het cijfer of de letter, het vak, de toets, de datum en de weging. Ook cijfers die je nog niet hebt geopend kunnen worden bewaard. Verder bewaart de extensie welke cijfers je hebt geopend, je inventaris en je instellingen.

Deze gegevens staan alleen in de extensie op jouw apparaat. Om cijfers uit elkaar te houden maakt de extensie lokale codes van bron-id's, met een willekeurige extra waarde. De codes bevatten geen namen, maar zijn wel gevoelig. CijferReveal synchroniseert of verstuurt deze gegevens niet.

## Wat wordt online verstuurd?

Voor updates vraagt de extensie de officiële GitHub-API naar het nieuwste versienummer en de downloadlink. Je cijfers, accountgegevens en cookies gaan niet mee. De aanvraag bevat ook geen pagina-adres. GitHub kan wel je IP-adres zien. De extensie leest alleen de versie en link; deze controle haalt geen code op of start die. De updategegevens worden lokaal bewaard. Na een uur zijn ze verouderd en controleert de extensie bij een volgend bezoek opnieuw.

SOMtoday blijft zelf gegevens ophalen zoals altijd. CijferReveal leest passende antwoorden die SOMtoday al aan de pagina heeft gegeven. Het vraagt geen extra cijfergegevens op en leest of bewaart geen wachtwoorden, cookies of inlogtokens.

De Magister-versie vraagt maximaal 25 recente cijfers op bij je eigen Magister-schoolomgeving. Hiervoor leest ze de Authorization-header van een cijferaanvraag die Magister zelf uitvoert. De header blijft alleen tijdelijk in het geheugen van de achtergrondextensie, apart per tabblad en schoolomgeving. Hij wordt niet naar GitHub of de maker gestuurd en niet in lokale opslag of logs gezet. Technische debuglogs worden wel lokaal bewaard (maximaal 1500 gebeurtenissen), ook met het paneel verborgen. Ze bevatten aantallen, fouttypen, HTTP-statussen en stappen, maar geen cijfers, vaknamen, leerlingnummers, cookies of tokens. Exporteren maakt alleen een lokaal TXT-bestand; delen doe je zelf.

De downloadpagina staat op GitHub Pages. Er staan geen advertenties op en we meten je bezoek niet. De site laadt geen lettertypen van andere websites. GitHub host de site en kan technische gegevens verwerken. Lees meer in zijn [privacyverklaring](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).

## Gebruik en verwijderen

De extensie gebruikt je gegevens alleen voor de functies die je ziet. Ze worden niet verkocht, gebruikt voor advertenties of op afstand bekeken door de maker. We volgen ook de extra privacyregels van de Chrome Web Store.

Met **Reset extensie** wis je de inventaris en kun je cijfers opnieuw openen. Eerder gevonden koppelingen blijven bewaard. Verwijder CijferReveal via je browser om ook die lokale gegevens te wissen. Je SOMtoday-gegevens veranderen hierdoor niet.

Heb je een privacyvraag? Stel die via [GitHub](https://github.com/js664/CijferReveal/issues). Dit zijn openbare berichten. Deel daar geen cijfers, persoonsgegevens of inloggegevens.
