# PRECODER-001 — NOVA Hackathon Demo: erster Precoding-Brief

**Stand:** 22.10.2026  
**Phase:** PRECODING — Analyse und Empfehlung, keine Implementierungsfreigabe  
**Repository:** `skywalker-gh/nova-v2-ygdrassil`  
**Branch:** `hackathon/nova-yggdrasil-meta-ai-2026`  
**Hackathon-Zeitraum laut Charter:** 26.10.–04.11.2026  
**Status dieses Briefs:** DOCUMENTED; Empfehlungen PROPOSED  
**Entscheidungshoheit:** Gürkan (Human Authority)

## 1. Zielbild

In einer dreiminütigen Demo soll ein Jurymitglied verstehen und erleben, dass NOVA einen realen Arbeitsauftrag strukturiert, einen belegbar verfügbaren KI-Pfad nutzt, Ergebnisse und Unsicherheit sichtbar macht und einen konkreten nächsten Schritt liefert. Die Demo soll zeigen, was heute tatsächlich funktioniert; Agent Bus, langlebiges Memory und breite Multi-Agent-Koordination bleiben Roadmap, solange sie nicht implementiert und live verifiziert sind.

**Empfohlene Story:** „Nimm ein konkretes Hackathon-Projektproblem, verwandle es in einen kleinen priorisierten Plan, zeige verwendeten Provider und Status, mache Annahmen/Risiken sichtbar und liefere einen strukturierten nächsten Schritt. Zeige danach einen kontrollierten Provider-Fehler ohne stillen Wechsel.“

## 2. Ausgangslage und Evidenz

| Aussage | Status | Grundlage |
|---|---|---|
| Das Ziel-Repository und der Hackathon-Branch existieren. | VERIFIZIERT | GitHub Repo-Metadaten; Branch-Suche lieferte `hackathon/nova-yggdrasil-meta-ai-2026`. |
| PRECODER ist auf diesem Branch dokumentiert. | VERIFIZIERT | GitHub-Datei `hackathon-edition/Agent/PRECODER/PRECODER.md`, Commit `6452235f6f1ac6737a88280a6163203c83b3579b`. |
| Das Repo enthält Gemini-MCP, Hackathon-Charter, Trinity-Vertrag und Agent-Bus-Vorschlag. | VERIFIZIERT | Verzeichnis- und Dateizugriffe auf dem Branch. |
| Die Gemini Streamable HTTP-Bridge beschreibt getesteten MCP-Handshake; Live-Generierung benötigt einen Key. | DOKUMENTIERT | `gemini-mcp/HTTP.md`; der Handshake ist dort als getestet beschrieben, in dieser Aufgabe nicht erneut ausgeführt. |
| Der Agent Bus ist noch nicht für Umsetzung freigegeben. | DOKUMENTIERT | `docs/AGENT-BUS-PROPOSAL-2026-10-07.md`: Status PROPOSED, R2, NOT APPROVED FOR IMPLEMENTATION. |
| Die Hackathon-Baseline beschreibt FastAPI, Provider-Vertrag, Ollama, xAI/Grok- und Gemini-Arbeit, Intent-Erkennung und Prompt Builder. | DOKUMENTIERT, historisch | `hackathon-edition/README.md` nennt historischen Ausgangsstand und 45 frühere Tests; keine frische Validierung. |
| Das aktuelle ausführbare Runtime-Repo und sein aktueller Git-Zustand sind hier vollständig eingesehen. | UNKNOWN | Der NOVA Codex Connector lieferte bei zwei Read-only-Aufrufen HTTP 429. Das sichtbare Projektverzeichnis enthält nur Quellenreferenzen, kein Runtime-Checkout. |
| Railway-Deployment ist verfügbar. | UNKNOWN/BLOCKED | Railway-Verbindung fordert erneute Authentifizierung; kein Deployment-Zustand verifiziert. |
| Es gibt ein Supabase-Projekt für NOVA. | UNKNOWN | Supabase-Verbindung lieferte derzeit eine leere Projektliste. |
| Linear-Projekt „Nova — Ygdrassil“ ist Backlog; GUR-6, GUR-7 sind urgent, GUR-12 high und Backlog. | VERIFIZIERT | Linear-Projekt- und Issue-Abfragen. |
| ChatGPT/NOVA End-to-End-Aufrufe über den Canonical MCP funktionieren. | UNKNOWN | Linear-Projektbeschreibung hält fest, dass trotz lokaler Tests ChatGPT E2E-Tool-Aufrufe noch nicht verifiziert sind. |
| Meta API Guthaben von nominell 150 USD ist verfügbar und aktuell nutzbar. | UNKNOWN | Im MUSE-001 Plan steht der Betrag als nominell und ausdrücklich zu verifizieren. |

**Quellen im Branch**

- [Hackathon Charter](https://github.com/skywalker-gh/nova-v2-ygdrassil/blob/hackathon/nova-yggdrasil-meta-ai-2026/hackathon-edition/README.md)
- [MUSE-001 Bestandsaufnahme und Implementierungsplan](https://github.com/skywalker-gh/nova-v2-ygdrassil/blob/hackathon/nova-yggdrasil-meta-ai-2026/hackathon-edition/MUSE-001_Bestandsaufnahme_Prototyp-Implementierungsplan.md)
- [Trinity Agent Contract v0.2](https://github.com/skywalker-gh/nova-v2-ygdrassil/blob/hackathon/nova-yggdrasil-meta-ai-2026/trinity-agent-contract-v0.2.md)
- [Agent Bus Proposal (R2, nicht freigegeben)](https://github.com/skywalker-gh/nova-v2-ygdrassil/blob/hackathon/nova-yggdrasil-meta-ai-2026/docs/AGENT-BUS-PROPOSAL-2026-10-07.md)
- [Gemini MCP HTTP-Vertrag](https://github.com/skywalker-gh/nova-v2-ygdrassil/blob/hackathon/nova-yggdrasil-meta-ai-2026/gemini-mcp/HTTP.md)
- Linear: [GUR-6 — Canonical Project State & Agent Bus](https://linear.app/nova-chatgpt-gee/issue/GUR-6/p0-canonical-project-state-agent-bus), [GUR-7 — GitHub Canonicalization & CI](https://linear.app/nova-chatgpt-gee/issue/GUR-7/p0-github-canonicalization-and-ci), [GUR-12 — Browser/App Architecture](https://linear.app/nova-chatgpt-gee/issue/GUR-12/p1-browserapp-architecture)

## 3. Problem / Gelegenheit

Die Projektvision ist groß: gemeinsamer Projektzustand, MCP, Agenten, Runtime, Browser-App, Memory und kontrollierte Automatisierung. Die Hackathon-Zeit ist dagegen kurz. Das größte unmittelbare Risiko ist nicht fehlende Vision, sondern eine Demo, die zu viele unbestätigte Integrationen gleichzeitig benötigt oder deren Status übertreibt.

Die Chance: NOVAs besonderen Wert über **Transparenz und kontrollierte Orchestrierung** zeigen — gleiche Aufgabe, sichtbarer Plan, nachvollziehbarer Providerstatus, Fehlerbehandlung und menschlicher Kontrollpunkt. Das ist glaubwürdiger als ein unbestätigtes autonomes Agentennetz.

## 4. Optionen

### Option A — Ein zuverlässiger Primärpfad mit sichtbarem Status (empfohlen)

- Einen bereits im aktuellen Runtime-Checkout vorhandenen und live erreichbaren Provider auswählen.
- Eine konkrete strukturierte Aufgabe von Input zu Plan/Ergebnis führen.
- Modell/Provider, Laufstatus, Fehler, Annahmen und Ergebnis anzeigen.
- Provider-Fehler kontrolliert darstellen; kein stiller Fallback.
- Memory als sitzungsgebundenen Kontext behandeln oder aus dem ersten Demo-Scope weglassen.

**Nutzen:** geringstes Integrationsrisiko, klare Demo, gute Fehlerdiagnose.  
**Nachteil:** Multi-Agent-Vision wird nur als Ausbaupfad gezeigt.

### Option B — Primärpfad plus optionales Zweitreview

- Den robusten Ablauf aus Option A behalten.
- Zweitreview nur zuschalten, wenn Bridge, Zugang und Antwortzeit live verifiziert sind.
- Review-Frage eng begrenzen, z. B. „Welche zwei Risiken fehlen?“
- Ausfall oder Timeout darf Primärergebnis nicht blockieren; der UI-Status muss das klar ausweisen.

**Nutzen:** zeigt unabhängige Gegenprüfung und NOVA-Eigenständigkeit.  
**Nachteil:** zusätzliche Schlüssel, Laufzeit, Kosten, Fehlerzustände und Unabhängigkeitsfragen; schwieriger reproduzierbar.

### Option C — Zuerst Canonical Agent Bus und gemeinsame Projektzustands-Schicht

- Event-Schema, AgentMessage, Provenance, Authority Gate, Transport und Store umsetzen.

**Nutzen:** adressiert zentrale langfristige Architektur.  
**Nachteil:** R2-Änderung, offene Technologie- und Review-Entscheidungen, geringerer unmittelbarer Demo-Wert und hoher Zeit-/Integrationsumfang. Der bestehende Vorschlag ist ausdrücklich nicht freigegeben. Keine Hackathon-Erstaufgabe ohne Reviews und separate Freigabe.

## 5. Vergleich

| Kriterium | A: Primärpfad | B: optionales Zweitreview | C: Agent Bus zuerst |
|---|---|---|---|
| Demo-Wert | Hoch: klarer End-to-End-Nutzen | Sehr hoch, falls stabil | Mittel: schwer in drei Minuten erfahrbar |
| Aufwand / Zeitrisiko | Niedrig bis mittel | Mittel bis hoch | Hoch |
| Kompatibilität mit Bestand | Erst nach Code-Checkout verifizierbar; gezielt begrenzbar | Zusätzliche Adapter/Secrets nötig | Zentrale Schnittstellen betroffen |
| Zuverlässigkeit | Am besten kontrollierbar | Von zweiter Verbindung abhängig | Abhängig von offenen Architekturfragen |
| Kosten/Latenz | Niedrig und messbar | Höher, muss begrenzt werden | Infrastruktur-/Entwicklungsaufwand |
| Datenschutz/Sicherheit | Einfacher begrenzbar | Mehr Datenflüsse und Credentials | R2: Auth, Rechte, Konflikte und Eventstore ungelöst |
| Erweiterbarkeit | Gute Basis | Gute spätere Erweiterung | Hoch langfristig, aber aktuell ungeklärt |
| Empfehlung | **Hackathon-MVP** | Optional nach MVP | Zurückstellen, bis Reviews/Freigabe vorliegen |

## 6. Empfehlung

**PROPOSED:** Option A als Muss-Scope; Option B nur als nachgelagerter, optionaler Slice, wenn die aktuelle Bridge und ein unabhängiger Review-Pfad tatsächlich erreichbar und zeitlich robust sind. Option C bleibt außerhalb des ersten Demo-Scope.

Warum: Der Hackathon-Charter nennt einen stabilen End-to-End-Demoablauf, sichtbare Providerwahl und Fehler sowie additive Integration als Prioritäten. Der Agent-Bus-Vorschlag ist R2 und nicht genehmigt. Die Linear-Projektbeschreibung sagt, dass ChatGPT-End-to-End-Calls noch nicht verifiziert sind. Deshalb muss die Umsetzung mit einer aktuellen Bestandsaufnahme anfangen, nicht mit einer Annahme, dass frühere Tests oder Connectorberichte den heutigen Stand garantieren.

## 7. Drei-Minuten-Demoentwurf

1. **0:00–0:25 — Problem:** „Plane für NOVA die kleinste Hackathon-Demo, die einen echten Nutzen beweist. Trenne Muss-Scope von Vision.“
2. **0:25–0:55 — NOVA strukturiert:** Ziel, Randbedingungen und offene Annahmen sichtbar machen; Nutzer kann den Auftrag korrigieren.
3. **0:55–1:45 — Primärpfad:** genau ein live erreichbarer Provider erzeugt einen knappen, priorisierten Plan mit klar gekennzeichnetem Provider und Ergebnisstatus.
4. **1:45–2:20 — Transparenz:** zeige Belege/Quellen und markiere Unbekanntes. Keine Providerantwort als verifizierte Tatsache ausgeben.
5. **2:20–2:45 — kontrollierter Fehler:** im Demo-Modus oder mit sicher reproduzierbarer Fehlersimulation zeigen, wie 429/Timeout als BLOCKED/UNKNOWN sichtbar werden; keine unbegrenzten Retries, kein stiller Anbieterwechsel.
6. **2:45–3:00 — Nutzerkontrolle:** nächster Schritt und Freigabepunkt klar anzeigen; NOVA schlägt vor, Gürkan entscheidet.

**Vorführbarkeit:** Der Fehlerfall darf nur simuliert werden, wenn er eindeutig als Simulation beschriftet ist. Ein echter 429 aus der aktuellen Codex Bridge ist Integrationsdiagnose, kein Beleg für das NOVA Runtime-Verhalten.

## 8. Priorisierte Roadmap — noch nicht freigegeben

| Reihenfolge | Arbeitspaket | Voraussetzung | Akzeptanzkriterien |
|---|---|---|---|
| P0 | Kanonischen lokalen Runtime-Checkout/Branch und tatsächlichen Status ermitteln | NOVA Bridge verfügbar oder Repo-Checkout-Zugriff | Branch, commit, Startanleitung, vorhandene Module und Arbeitsbaumstatus mit Pfaden dokumentiert; keine unbelegten Behauptungen |
| P1 | Einen Provider für den Demo-Pfad auswählen | P0; vorhandene Adapter und Zugangskonfiguration geprüft | Ein klarer Request→Antwort-Ablauf mit sichtbarem Provider, Timeout/Fehler und reproduzierbarem Start |
| P2 | Strukturierte Demo-Aufgabe und Output-Format definieren | P0/P1 | Ziel, Annahmen, Risiken, priorisierte Schritte, Status und Quellen getrennt darstellbar |
| P3 | Kontrollierte Fehlerdarstellung und sichere Demo-Fixture planen | P1 | 429/Timeout oder Mock klar klassifiziert; begrenzter Retry; keine stille Fallback-Antwort |
| P4 | Optional Zweitreview technisch probeweise integrieren | P1–P3 stabil; Bridge, Zugang, Laufzeit und Privacy geprüft | Zweitreview klar als Review gekennzeichnet; Fehler blockiert Primärpfad nicht; Provenance bleibt sichtbar |
| P5 | Demo-Skript, Setup und Pitch erstellen | MVP stabil | Kaltstart reproduzierbar; drei Minuten; live belegte und nur geplante Fähigkeiten klar getrennt |

## 9. Risiken und Blocker

- **Runtime-Checkout fehlt in dieser lokalen Session:** Quellenordner ist nur Referenzmaterial; Codex Connector meldete HTTP 429. Codekompatibilität und wirklicher Einstiegspunkt daher UNKNOWN.
- **Historische Tests sind kein aktuelles Testergebnis:** die 45 Tests stammen aus dem Charter als vorheriger Bericht.
- **Agent Bus R2:** unabhängige Reviews, Technologie, Auth-/Freigabeverfahren und Human Approval fehlen; nicht implementieren aufgrund dieses Briefs.
- **Meta Guthaben:** 150 USD ist nur nominell dokumentiert; Konto, Zeitraum, Nutzung und Preise UNKNOWN. MUSE-001 untersagt in der Planungsphase kostenpflichtige Aufrufe.
- **Railway Reauth nötig:** keine Live-Bereitstellung behaupten.
- **Supabase-Projekt nicht sichtbar:** kein Supabase-Pfad für die MVP-Annahme.
- **Live-Providerzugänge:** Historische Hinweise melden frühere Gemini-API-/Modellverfügbarkeit- und xAI-Credit-Probleme; aktueller Status muss vor Nutzung verifiziert werden.
- **Review-Unabhängigkeit:** Agentennamen allein beweisen keine unabhängige Prüfung.
- **Datenschutz:** Demo-Eingaben auf synthetische Projektdaten begrenzen; keine persönlichen Schlüssel oder privaten E-Mails in Demos/Logs.
- **Leere Connectors sind keine Bestandsdaten:** Postman-Workspace-Liste enthält aktuell allgemeine Workspaces; kein NOVA-spezifisches Collection-/Endpoint-Artefakt identifiziert.

## 10. Tool-/Integrationsstatus dieser Runde

- **GitHub:** Zugriff funktionierte; Repo und Hackathon-Branch vorhanden, PRECODER-Datei auf Branch bestätigt.
- **Codex // Connector 3000 — Nova V2:** Read-only Status- und Analyseaufrufe beide mit HTTP 429 fehlgeschlagen; keine Änderungen erfolgt.
- **Linear:** Nova-Projekt und GUR-6/GUR-7/GUR-12 eingesehen; alle als Backlog gemeldet.
- **Dropbox:** Konto und Hackathon-Ordner vorhanden; Ordner `/NOVA-Yggdrasil-Meta-AI-Hackathon-Edition/Agent/PRECODER` wurde angelegt. Upload lokaler Pfade kann das Dropbox-Tool nicht; es akzeptiert hier nur im Chat übergebene Dateiobjekte. Dropbox-Inhalt in diesem Unterordner daher noch nicht verifiziert/hochgeladen.
- **Postman:** Workspaces sichtbar, NOVA-spezifische Assets nicht belegt; keine API-Änderung oder Veröffentlichung durchgeführt.
- **Supabase:** Projektliste leer.
- **Railway:** Integration reauthentifizieren, daher blockiert.
- **Meta API/OpenAI API:** Keine kostenpflichtigen Modellaufrufe; keine API-Verfügbarkeit für den Runtime-Pfad verifiziert.
- **Visualize:** Für diesen dokumentarischen Entscheidungsvorschlag ist keine separate Visualisierung erforderlich.
- **Firecrawl:** Für interne Repository-/Linear-Fakten nicht benötigt; aktuelle Meta-Preis-/API-Angaben bleiben UNKNOWN, da keine offizielle Dokumentationsprüfung in dieser Runde durchgeführt wurde.
- **Hugging Face:** Für die Repo-Bestandsaufnahme nicht einschlägig; kein Modell oder Dataset als Laufzeitabhängigkeit empfohlen.
- **Cody:** kein verfügbarer direkter steuerbarer Anschluss nachgewiesen; daher keine Aktivität behauptet.

## 11. Entscheidungen und Freigaben vor Implementierung

Dieser Brief erteilt **keine** Umsetzungsgenehmigung. Nach den vorhandenen Projektregeln müssen vor der Implementierung mindestens folgende Punkte entschieden und dokumentiert werden:

1. Welcher konkrete Runtime-Checkout/Commit ist die kanonische Basis für den Hackathon-Branch?
2. Welcher Provider ist für den MVP live erreichbar und welche Zugangsdaten dürfen verwendet werden?
3. Ist der Muss-Scope auf einen einzelnen Provider begrenzt? Empfehlung: ja.
4. Soll ein Zweitreview als optionaler Slice geplant werden, erst nachdem MVP stabil ist? Empfehlung: nur dann.
5. Welche Kostenobergrenze und Abbruchregel gelten, sobald ein kostenpflichtiger API-Call separat freigegeben wird?
6. Soll der R2 Agent Bus aus dem Demo-Scope herausgehalten werden, bis Grok- und Gemini-Review sowie explizite Human-Freigabe vorliegen? Bestehende Dokumente verlangen diese Schranke.
7. Wer verifiziert live die Demo und welche Evidenz gilt für die Statuswerte TESTED/VERIFIED?

## 12. Handoff nach Freigabe

**Primärrolle:** ChatGPT/Codex — begrenzte Implementierung und Verifikation laut Trinity-Vertrag.  
**Vorbereitende Reviews:** Gemini für Design/Cross-Check; Grok für Sicherheits-/Architekturprüfung, insbesondere für R2 oder Provider-/Auth-Grenzen.  
**Auftrag:** zuerst nur einen engen Read-only Bestandsabgleich im tatsächlichen Runtime-Checkout; danach separate Umsetzung eines freigegebenen MVP-Slices.  
**Nicht-Ziele:** Agent Bus, Memory-Plattform, autonome Schreibaktionen, Providerwechsel ohne sichtbaren Status, unbegrenzte Retries, unbestätigte Meta-API-Kosten.  
**Rückmeldeformat:** veränderte Pfade, beobachteter Provider, exakte Befehle/Checks und Ergebnisse, Kosten/Requests falls separat freigegeben, bekannte Einschränkungen, Status mit Evidenz.

**Aktueller Planungsstatus:** Der Zielscope ist als Vorschlag priorisiert, aber die Umsetzung ist noch nicht planungsreif, weil der tatsächliche Runtime-Checkout und ein live erreichbarer Primärprovider in dieser Sitzung nicht verifiziert werden konnten.

