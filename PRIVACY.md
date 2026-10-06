# Privacy van CijferReveal

Bijgewerkt op 6 oktober 2026. Ontwikkelaar: [js664](https://github.com/js664).

CijferReveal gebruikt je SOMtoday-resultaten om cijfers met een animatie te openen en geopende resultaten in de inventaris te tonen. De extensie verandert je echte schoolresultaten niet.

## Wat blijft op je apparaat?

De extensie verwerkt resultaten die SOMtoday al aan jouw browser heeft geleverd: het cijfer of de letter, het vak, de toetsomschrijving, de datum en de weging. Ook nog niet geopende resultaten kunnen lokaal worden bewaard. De lokale opslag bevat verder welke resultaten zijn geopend, de inventaris en instellingen voor geluid en beweging.

Om resultaten en accounts uit elkaar te houden, maakt de extensie lokale, met een willekeurige salt gehashte sleutels van SOMtoday-identificaties. Die sleutels zijn geen namen, maar blijven gevoelig en worden niet als anonieme gegevens behandeld.

Deze gegevens staan in de lokale opslag van de extensie in jouw browserprofiel. CijferReveal gebruikt geen synchronisatieopslag en stuurt je resultaten of sleutels niet naar de ontwikkelaar of een andere server.

## Wat gaat het internet op?

Voor de updatecontrole vraagt de extensie bij de officiële GitHub-API de nieuwste openbare release van CijferReveal op. Je cijfers, accountgegevens en lokaal opgeslagen sleutels gaan niet mee. De extensie stuurt bij deze aanvraag geen cookies of verwijzende pagina mee. GitHub ontvangt bij een gewone internetverbinding wel technische netwerkgegevens, zoals je IP-adres. De API-respons wordt alleen als versiegegevens gelezen; er wordt geen externe code opgehaald of uitgevoerd.

SOMtoday blijft zelf zijn normale verzoeken uitvoeren. CijferReveal leest alleen passende resultaatantwoorden die al aan de pagina zijn geleverd en vraagt zelf geen extra cijfergegevens op. De extensie leest of bewaart geen wachtwoorden, cookies of inlogtokens.

De downloadwebsite wordt door GitHub Pages gehost. Er staan geen advertenties, analytics of externe lettertypen van CijferReveal op. GitHub verwerkt gegevens voor zijn hosting en downloads volgens zijn [privacyverklaring](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).

## Gebruiken, delen en verwijderen

De resultaatgegevens worden uitsluitend gebruikt voor de zichtbare functies van de extensie. Ze worden niet verkocht, gedeeld voor advertenties of door de ontwikkelaar op afstand bekeken. Het gebruik van gegevens volgt de Chrome Web Store User Data Policy, inclusief de Limited Use-eisen.

Met **Reset extensie** kun je geopende cijfers opnieuw openen en wis je de inventaris. Bekende lokale resultaatkoppelingen blijven behouden. Verwijder de extensie via je browser als je ook de lokale extensieopslag wilt verwijderen. Hiermee verander je niets aan je gegevens bij SOMtoday.

Heb je een privacyvraag? Neem contact op via [de GitHub-issues](https://github.com/js664/CijferReveal/issues). Die zijn openbaar: deel daar geen cijferoverzichten, persoonsgegevens of inloggegevens.
