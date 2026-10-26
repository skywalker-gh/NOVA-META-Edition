# NOVA // Yggdrasil & Ygdrassil Mesh-Netzwerk - Architektur & Frequenzchronologie Stand & Idee vom 25.10.2026.

## 1. Mesh-Netzwerk (Ygdrassil): Wer, Wann, Warum & Wie
* **Gründer / Entwickler:** Neil Alexander und Arceliya (Open-Source-Entwickler-Community).
* **Entstehungsjahr:** 2018 (Ygdrassil Network Project).
* **Warum:** Befreiung von zentralen Providern, DNS-Servern und monopolisierten Schaltstellen hin zu einem unzerstörbaren, dezentralen Peer-to-Peer-Netzwerk.
* **Wie:** Jeder Knotenpunkt agiert als Router, Sender und Empfänger zugleich (Stille-Post-Prinzip). Fällt ein Knoten aus, leitet das System Daten automatisch über Nachbarknoten um. Nutzt eigene mathematische IPv6-Adressen.

## 2. Netz-Resilienz: Mesh vs. Clearweb / Darknet
* **Das Darknet (z. B. Tor):** Nutzt Onion-Routing, ist aber physikalisch auf die bestehenden Glasfaserkabel und die Infrastruktur des regulären Internets angewiesen (stirbt das Internet, bricht Tor ein).
* **Das Mesh-Netzwerk:** Benötigt *kein* Internet. Es kommuniziert autonom über lokale Frequenzen oder direkte Geräteverbindungen und übersteht somit jeden totalen Infrastrukturausfall.

## 3. Vorüberlegungen zum Adapter-Skript (Pre-Code Phase)
* **Knoten-Entkopplung:** Der Model Context Protocol (MCP) Server bindet nicht mehr an `localhost`, sondern direkt an die kryptografische Ygdrassil-IPv6-Adresse des Nodes.
* **Protokoll-Übersetzung:** Universelle JSON-Payloads für Gemini CLI, Grok und lokale Modelle.
* **Resilienz & Peer-Registry:** Dezentrale Knotentabelle zur automatischen Umleitung bei Ausfällen einzelner Agenten.

## 4. Frequenzchronologie & Orchestrierung in CMD (Windows - PC) und Termux (Android - Xiaomi)
* **Der Name Yggdrasil:** Resonanzerscheinung und archetypischer Weltenbaum, der alle Sphären/Knoten im digitalen Raum verbindet.
* **Der Termux-Orchestrator:** Das Gemini CLI steuert als zentraler Dirigent auf dem PC und Xiaomi die verteilten Agenten über sichere P2P-Mesh-Pfade.