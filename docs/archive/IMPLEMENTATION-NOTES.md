> Historisch document. Zie de [README](../../README.md) en [ontwikkelgids](../DEVELOPMENT.md) voor de huidige werkwijze.

# Technische uitleg

Dit is een korte uitleg voor mensen die aan de code werken. De installatie en het gebruik staan in de [README](../../README.md).

CijferReveal bestaat uit een browserextensie en een kleine lokale opslag. De extensie kijkt mee met cijfergegevens die SOMtoday zelf ophaalt. Ze doet geen eigen verzoeken om cijfers op te halen. Cijfers en instellingen blijven in de browser.

Een cijfer wordt alleen aan een vakkaart gekoppeld als de gegevens duidelijk bij elkaar passen. Bij twijfel blijft het cijfer verborgen. Gemiddelden, rapportcijfers en andere samenvattingen zijn geen openbare resultaten.

De animatie gebruikt het echte SOMtoday-cijfer. De draaiende rol is alleen voor de show; de extensie kiest geen cijfer. De resultatenkaart verschijnt pas nadat de opening klaar is.

Voor bouwen en controles: zie [README.md](../../README.md) en `package.json`. De tests gebruiken voorbeeldgegevens, geen echte leerlingaccounts.
