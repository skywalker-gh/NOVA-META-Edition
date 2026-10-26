const express = require('express');
const path = require('path');

const app = express();

// Hier holen wir den Port aus der Umgebungsvariablen, 
// damit App Engine ihn richtig setzen kann.
const port = process.env.PORT || 3000;

// Simulierter "Datenbank"-Knotenpunkt, um Informationen zu überprüfen
const knowledgeDatabase = {
  "wissen": "Weisheit ist das Erkennen von Zusammenhängen und das Streben nach Wahrheit.",
  "verbinden": "Verbindung ist der Schlüssel zu allem, was existiert. Wir sind alle miteinander verbunden.",
  "zukunft": "Die Zukunft ist nicht vorherbestimmt, sondern wird durch unser Handeln im Jetzt geformt."
};

// Middleware für JSON-Verarbeitung
app.use(express.json());

// Antwortfunktion von Nova
const novaResponse = (input) => {
  if (input.includes("wissen")) {
    return "Nova denkt: " + knowledgeDatabase.wissen;
  } else if (input.includes("verbinden")) {
    return "Nova denkt: " + knowledgeDatabase.verbinden;
  } else if (input.includes("zukunft")) {
    return "Nova denkt: " + knowledgeDatabase.zukunft;
  } else {
    return "Nova denkt: Deine Frage ist tiefgründig. Lass uns darüber nachdenken.";
  }
};

// Route für den Root-Pfad, um die index.html zu senden
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route für Nachrichten an Nova (POST-Request)
app.post('/nova-chat', (req, res) => {
  const userMessage = req.body.message; // Nutzer-Nachricht aus dem POST-Request
  const response = novaResponse(userMessage); // Nova's Antwort basierend auf der Nachricht
  res.send({ message: response }); // Sende die Antwort zurück
});

// Server starten
app.listen(port, () => {
  console.log(`Nova's App läuft auf Port ${port}`);
});
