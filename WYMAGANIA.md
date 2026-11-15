# Wymagania użytkownika

Lista zgłoszonych wymagań, jeszcze niewdrożonych. Po wdrożeniu wymaganie trafia do `REJESTR-ZMIAN.md`.

## 1. Okno „Wybierz wyzwalacz” jest mało czytelne
- **Ścieżka:** Automatyka → „Dodaj rutynę” → wpisanie nazwy → dodanie warunku.
- **Problem:** żeby wybrać pozycję, trzeba przewijać listę wyzwalaczy.
- **Problem:** okno nie ma skrótów klawiszowych.

## 2. Okno „Ustaw warunek” utrudnia wybór
- **Ścieżka:** kolejny krok po „Wybierz wyzwalacz” (na zrzucie wyzwalacz „Stan wejścia”).
- **Problem:** lista pomieszczeń i czujników ma duże litery.
- **Problem:** wszystkie pomieszczenia są domyślnie rozwinięte, przez co trudno znaleźć pomieszczenie lub obiekt.
- **Problem:** kliknięcie wartości warunku („Normalny”) otwiera osobne okno „Wybierz wartość”, co jest niepraktyczne.

## 3. Komunikat po zapisaniu warunku przeszkadza
- **Ścieżka:** „Ustaw warunek” → „Zapisz”.
- **Problem:** na dole pojawia się overlay „warunek stan wejścia został zmieniony”, który zakrywa część ekranu i spowalnia pracę.

## 4. Podsumowanie warunku w „Nowa rutyna” ukrywa szczegóły
- **Ścieżka:** „Nowa rutyna” → sekcja „Jeżeli”, po dodaniu kilku wejść lub wyjść.
- **Problem:** nie widać nazw wszystkich wejść i wyjść. Na zrzucie widać tylko pierwszą nazwę i licznik: „Normalny (Okno Sypialnia +3)”.
- **Problem:** nie widać, czy warunek łączy je przez „Lub”, czy przez „Oraz”.

## 5. Edycja warunku nie pokazuje wybranego wyzwalacza
- **Ścieżka:** „Nowa rutyna” → kliknięcie istniejącego warunku → „Wybierz wyzwalacz”.
- **Problem:** wybrana pozycja jest gdzieś na dole listy, więc trzeba przewijać, żeby ją zobaczyć.

## 6. Częściej używane wyzwalacze powinny być na górze listy
- **Ścieżka:** „Wybierz wyzwalacz”.
- **Wymaganie:** częściej używane wyzwalacze, np. „Stan wejścia” i naruszenie, mają być na górze listy.

## 7. Przycisk X w edycji warunku zamyka całą rutynę
- **Ścieżka:** edycja warunku wyzwalacza → X w prawym górnym rogu.
- **Problem:** X zamyka całą rutynę, a nie tylko edycję wyzwalacza.

## 8. Lista „Wybierz akcję” jest niewygodna
- **Ścieżka:** „Nowa rutyna” → „Wykonaj” → „Wybierz akcję”.
- **Problem:** akcje nie są pogrupowane według częstości użycia.
- **Problem:** okno nie ma skrótów klawiszowych.
- **Problem:** trzeba przewijać listę.

## 9. Okno „Ustaw akcję” i podsumowanie akcji są niewygodne
- **Ścieżka:** „Wybierz akcję” → „Ustaw akcję” → „Zapisz” → „Nowa rutyna”.
- **Problem:** wybór opcji akcji otwiera kolejne okno, co nie ma sensu.
- **Problem:** domyślna opcja to „Wyłącz”, a powinno być „Włącz”.
- **Problem:** wybór elementu dla akcji wymaga przewijania, bo nie można wyszukać go po fragmencie nazwy.
- **Problem:** po zapisaniu znów pojawia się zielony overlay na dole ekranu (jak w wymaganiu 3).
- **Problem:** podsumowanie w „Nowa rutyna” nie pokazuje, czego dotyczy akcja, choć na ekranie jest sporo miejsca. Na zrzucie widać tylko „Dzwonek +3” (jak w wymaganiu 4).

## 10. Lista obiektów na desktop
- **Ścieżka:** ekran główny → kafelek grupy lub pomieszczenia → lista urządzeń → szczegóły urządzenia.
- **Problem:** dziś lista jest tylko graficzna i trzeba wybrać kafelek.
- **Problem:** lista po wyborze jest zrobiona pod telefon, a nie pod desktop: nieczytelna, zbyt duże elementy.
- **Problem:** żeby zobaczyć np. typ obwodu wejścia, trzeba klikać dalej do szczegółów.
- **Wymaganie:** dodatkowa wersja tabelaryczna z kluczowymi parametrami. Widok graficzny zostaje.
- **Wymaganie:** wejścia i wyjścia oddzielnie.
- **Wymaganie:** kliknięcie pozycji przechodzi do jej edycji.
- **Wymaganie:** wyszukiwanie automatyczne po wpisaniu pierwszych liter.

## 11. Lista wyzwalaczy w jednej kolumnie
- **Ścieżka:** „Wybierz wyzwalacz” w panelu.
- **Wymaganie:** lista ma mieć jedną kolumnę zamiast dwóch.

## 12. Ekran rutyny do przeprojektowania
- **Ścieżka:** „Nowa rutyna” lub „Edytuj rutynę”, czyli pierwszy ekran.
- **Problem:** żeby zobaczyć całą rutynę, trzeba przewijać, np. do „W przeciwnym razie wykonaj”.

## 13. Ekran potwierdzenia zapisu do zmiany
- **Ścieżka:** „Zapisz” w rutynie → pełny zielony ekran „Rutyna dodana” z przyciskiem „Wróć”.
- **Problem:** ekran potwierdzenia jest do zmiany.

## 14. Główny ekran rutyn do przeprojektowania pod desktop
- **Ścieżka:** Automatyka → Sceny / Rutyny.
- **Problem:** ekran kafelków nie jest zaprojektowany pod desktop.

## 15. Kolejne zmiany na desktop (decyzje z 30.10.2026)
- **Rutyny:** uruchamianie zostaje bez potwierdzenia.
- **Sterowanie wyjściem i polecenia grupowe:** potwierdzenie przed wykonaniem.
- **Aktywne awarie:** zwarta tabela.
- **Dziennik zdarzeń:** zwarta tabela z szukaniem.
- **Panel boczny:** zwijane sekcje i oddzielenie „Usuń obiekt”.
- **Ekran główny i pomieszczenia:** zwarta lista pomieszczeń i tabela urządzeń pomieszczenia.
