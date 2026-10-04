UZEMMI – Änderungen

Enthalten:
- Neue separate Berechtigung „Kalender“ unter Benutzer & Berechtigungen.
- Kalender-Menü und Kalenderansicht werden für Nicht-Admins nur mit dieser Berechtigung angezeigt.
- Menüeintrag „Arbeitszeit & Kilometer“ aus der Navigation entfernt. Fahrer-Stempelsystem und Auswertungen bleiben im Code erhalten.
- PWA-Grundkonfiguration für Installation auf Android und iPhone (Web-App-Manifest, Icons, Service Worker, Apple Meta-Tags).

Wichtig:
- Die Kalenderdatenbank-Tabelle kalender_termine muss bereits in Supabase existieren; diese ZIP ändert kein Supabase-Schema.
- Admins haben weiterhin automatisch alle Berechtigungen. Für andere Benutzer muss „Kalender“ unter Benutzer & Berechtigungen aktiviert werden.
- Die ZIP enthält absichtlich keine .env-Dateien und keinen .git-Ordner. Verwende die bestehenden lokalen Umgebungsvariablen und das vorhandene GitHub-Repository.
- Die PWA benötigt HTTPS (Netlify erfüllt dies). Auf iPhone: Seite in Safari öffnen > Teilen > Zum Home-Bildschirm.
- Eine installierte PWA ist keine voll offlinefähige App; Anmeldung und Datenfunktionen benötigen Internet.
