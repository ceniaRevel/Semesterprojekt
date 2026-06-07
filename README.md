# Zusammenarbeit und Aufteilung

Die Zusammenarbeit hat sehr gut funktioniert. Gemeinsam haben wir die Grundidee besprochen und ein grobes Konzept entwickelt. Anschliessend teilten wir die Aufgaben auf, um effizienter am Projekt arbeiten zu können. Cenia erstellte zunächst das Figma-Design, während Chiara bereits damit begann, das Projekt in VS Code aufzubauen und eine Grundstruktur zu erstellen.

Nach der Abgabe arbeiteten wir beide am Code und unterstützten uns gegenseitig bei Herausforderungen und offenen Fragen. Den Unterricht nutzten wir gezielt, um letzte Unklarheiten zu klären und den Code fertigzustellen. Insbesondere während des Unterrichts stellte die gleichzeitige Arbeit am Projekt eine Herausforderung dar, da GitHub dies nicht ohne Weiteres vorsieht. Dennoch konnten wir dieses Problem gut lösen, indem jede Person zunächst an einem eigenen Problem arbeitete und die Anpassungen anschliessend gemeinsam in den Code integriert wurden.

Zudem war es sehr hilfreich, dass uns die Dozierenden bei Fragen und Unsicherheiten direkt unterstützen konnten.

Bei grundlegenden Fragen und Anpassungen tauschten wir uns regelmässig aus und suchten gemeinsam nach der bestmöglichen Lösung. Insgesamt hat die Zusammenarbeit sehr gut funktioniert.

# Figma

Die Konzeption im Figma mit den verschiedenen interaktiven Funktionen war zu Beginn sehr zeitintensiv und anspruchsvoll. Insbesondere war zunächst unklar, wie die Struktur aufgebaut werden musste, damit alle interaktiven Elemente korrekt zusammenspielen und sich gegenseitig nicht beeinträchtigen.

Eine besondere Herausforderung bestand darin, sicherzustellen, dass beispielsweise beide Dropdown-Menüs weiterhin korrekt funktionieren, wenn in beiden eine Auswahl getroffen wurde und zusätzlich die Indoor-/Outdoor-Buttons verwendet werden. Schlussendlich haben wir jedoch eine passende Lösung gefunden, welche die Funktionalitäten der Webseite korrekt, aber vereinfacht darstellt.

Im Figma entschieden wir uns bewusst dafür, die Pop-ups in der Mobile- und Desktop-Version unterschiedlich zu gestalten. Bei der Umsetzung im Code merkten wir jedoch, dass das Ergebnis optisch nicht unseren Vorstellungen entsprach. Deshalb entschieden wir uns, die Pop-ups neu zu gestalten und zu vereinheitlichen, sodass sie sowohl in der Mobile- als auch in der Desktop-Version identisch dargestellt werden.

# Code

## HTML

Die Grundstruktur der Anwendung konnte zügig erstellt werden. Die grösste Herausforderung bestand darin zu entscheiden, welche Elemente bereits statisch im HTML definiert werden und welche lediglich als Platzhalter dienen, um später dynamisch durch JavaScript befüllt zu werden. So wurden beispielsweise die Filterelemente und die Kartenstruktur direkt im HTML angelegt, während die Detail-Ansicht und das Popup als leere Container vorbereitet und erst beim Klick auf einen Pin mit Inhalt befüllt werden.

Im Verlauf der Entwicklung stellten wir fest, dass einzelne Elemente fehlerhaft strukturiert waren, was nachträgliche Anpassungen erforderte. So fehlte beispielsweise einem <div> die nötige ID, wodurch JavaScript das Element nicht ansprechen konnte und die Detail-Ansicht nicht korrekt ein- und ausgeblendet wurde. Solche Fehler waren anfangs schwer zu lokalisieren, da sie keine direkten Fehlermeldungen in der Konsole erzeugten. Jedoch konnten alle gelöst werden.

## CSS

Die grobe Struktur konnte mithilfe von KI relativ schnell erstellt werden. Anschliessend investierten wir viel Zeit in kleinere Anpassungen, damit das Design unseren Vorstellungen entspricht. Dabei nutzten wir insbesondere die Entwicklertools, um zu analysieren, welche Anpassungen erforderlich sind, um das gewünschte Ergebnis zu erreichen.

## JavaScript

Zu Beginn des Projekts definierten wir die benötigten Funktionen und bauten sie schrittweise ein. Als Grundlage diente die Leaflet-Karte, die mithilfe der offiziellen Dokumentation schnell eingebunden werden konnte. Eigene Pins mit einem Normal- und Aktivzustand liessen sich unkompliziert umsetzen.

Die Anbindung der Zürich.com API ermöglichte es, alle Aktivitäten dynamisch auf der Karte darzustellen. Besonders anspruchsvoll war die Umsetzung der Filterfunktionen nach Kategorie, Preis sowie Indoor/Outdoor. Der Kategorienfilter stellte die grösste Herausforderung dar, da die API-Datenstruktur inkonsistent war — je nach Datensatz wurde die Kategorie als Array, Objekt oder einfacher String geliefert. Zusätzlich mussten die englischen Kategorienamen ins Deutsche übersetzt und in der Detailansicht auf bekannte Filterkategorien beschränkt werden.

Für diese und weitere Herausforderungen — wie das dynamische Ein- und Ausblenden von Inhalten, das Debugging von API-Feldern und die Filterlogik — nutzten wir KI-gestützte Lösungsansätze.
