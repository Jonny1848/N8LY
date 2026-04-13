# Discover: MVP-Heuristiken und Signale (Roadmap)

Diese Seite beschreibt, wie der Tab **Entdecken** (`app/tabs/discover.tsx`) aktuell Daten wählt und welche **Supabase-/Produkt-Schritte** für echte Personalisierung und RSVP-Zähler vorgesehen sind.

## Aktueller Stand (MVP)

| Thema | Umsetzung | Hinweis |
| --- | --- | --- |
| Datenquelle | Tabelle `events`, **alle** Zeilen (kein Datumsfilter), Limit 500, sortiert nach `date` absteigend | Damit sind auch **vergangene** Termine sichtbar, falls die DB noch keine zukünftigen Events hat. Rails werden **clientseitig** gebildet (`lib/discoverData.ts`). |
| „Beliebt“ / Social Proof | Sortierung nach `events.interested_count` | Aggregat aus der Events-Zeile; schnell, keine Joins. |
| RSVP / Teilnehmerzahl | **Noch nicht** aus `event_attendees` aggregiert | Schema in `ARCHITECTURE.md`: Tabelle `event_attendees` mit Status `interested`, `going`, `attended`. Für echte „X Personen gehen“-Zahlen: DB-View oder Materialized Column, z. B. `going_count` / `rsvp_total`, per Trigger oder periodischem Job aktualisiert — vermeidet N+1-Counts im Client. |
| „Für dich“ | **Kein Profil:** deterministisch gemischter Querschnitt aus dem gesamten Pool (fester Seed, nicht nutzerabhängig) | Später: Personalisierung siehe unten. |
| „Neueste zuerst“ | Sortierung nach `date` absteigend | Passt sowohl zu kürzlich vergangenen als zu kommenden Events. |
| Genre-Schiene | Häufigstes Genre im aktuellen Pool → horizontale Rail „{Genre} & mehr“ | Rein heuristisch, bis Editorial/Curation eigene Tabellen hat. |
| Spotlight | Events mit `is_boosted === true` | Entspricht vorhandenem Marketing-Flag. |

## Geplante Anbindung (Signale)

1. **RSVP-Zähler (serverseitig)**  
   - Zähler für `going` (und optional `interested`) aus `event_attendees` in `events` spiegeln oder View `events_with_rsvp` bereitstellen.  
   - Client sortiert „Beliebt“ dann nach `going_count` statt nur `interested_count`.

2. **Interesse / Popularität**  
   - Später: Views, Saves, Shares oder Score-Spalte — erst Analytics/Tracking.  
   - MVP-Ersatz bleibt `interested_count` bzw. aggregierte RSVPs.

3. **„Für dich“ (ML / Regeln)**  
   - Optional später: `profiles.music_genres`, `party_preferences`, `event_type` oder implizite Signale (Klicks, Saves).  
   - Aktuell bewusst **nicht** angebunden, damit der Screen ohne Nutzerkontext funktioniert.

4. **„Beliebt in deiner Nähe“**  
   - Braucht zuverlässige User-Location oder `favorite_city` + Distanz zu `events.location` / Stadt — aktuell nicht in den MVP-Rails; kann als zusätzliche Query ergänzt werden.

5. **Nur zukünftige Events**  
   - Sobald die DB überwiegend kommende Termine hat: optional wieder Filter `date >= now()` oder eigene Rail „Demnächst“.

## Code-Referenzen

- Heuristiken und Rail-Aufbau: `lib/discoverData.ts`  
- Laden & Refresh: `hooks/useDiscoverRails.ts`  
- UI: `app/tabs/discover.tsx`, `components/discover/EventRail.tsx`, `EventRailCard.tsx`

Änderungen an der Strategie sollten zuerst in diesem Dokument und in den Kommentaren in `discoverData.ts` festgehalten werden, damit das Team die gleiche Erwartung hat.
