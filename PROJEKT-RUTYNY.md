# Projekt: przyjaźniejszy edytor rutyn

Stan: wdrożone, etapy 1–5. Szczegóły w `REJESTR-ZMIAN.md` (wpisy 009–018). Numery w nawiasach odnoszą się do `WYMAGANIA.md`.

## Co dziś utrudnia pracę

Sprawdzone na centrali testowej autora, przez przekliknięcie nowej rutyny bez zapisu (liczba scen i rutyn została 23/100).

| Co | Dane |
|---|---|
| Wyzwalacze | 22 pozycje w jednej kolumnie, widać około 10. „Naruszenie” jest ostatnie, „Stan wejścia” szesnaste |
| Użycie wyzwalaczy | „Stan wejścia” to 16 z 25 warunków w danych z logu sesji, więc najczęstszy wybór leży najniżej |
| Urządzenia w warunku | 16 pomieszczeń i 46 urządzeń przy „Stan wejścia”, wszystko rozwinięte, widać 2 pomieszczenia naraz |
| Wybór opcji | Akcja „Włącz/wyłącz” domyślnie ma „Wyłącz”, bo aplikacja bierze pierwszą opcję z listy |
| Głębokość | Rutyna → wyzwalacz → warunek → wartość, czyli 4 okna jedno na drugim |
| Szerokość | Okno ma ok. 800 px przy ekranie 1508 px i nie wykorzystuje reszty |
| Podsumowanie | Kod pokazuje tylko pierwsze urządzenie i licznik (`+3`), a operatora urządzeń nie pokazuje wcale |

Główna przyczyna to projekt na telefon przeniesiony na ekran komputera: każda decyzja dostaje osobne okno, a lista jest jedna i długa.

## Pomysł: jeden ekran zamiast łańcucha okien

Rutynę widać cały czas po lewej. Po prawej jest edytor klikniętego elementu. Osobnymi oknami zostają tylko rzadkie podokna: ikona, kolor, opóźnienie, potwierdzenia.

```
┌ Nowa rutyna ─────────────────────────────────────────────────────── [X] ┐
│ Nazwa [Wietrzenie po alarmie    ]  [ikona]  [ ] Powiadom                 │
├──────────────────────────────┬───────────────────────────────────────────┤
│ JEŻELI                       │ Warunek 1                             [X] │
│ ▌Stan wejścia = Naruszenie   │ Wyzwalacz [szukaj…                      ] │
│   dowolne z: Okno Sypialnia, │ Częste: (•) Stan wejścia ( ) Naruszenie   │
│   Ruch Sypialnia, Okno Kuch. │         ( ) Detekcja ruchu ( ) Data i czas│
│        ORAZ                  │ Wszystkie ▸                               │
│  Data i czas: 22:00–06:00    │                                           │
│ [+ warunek]                  │ Wartość [Normalny|Naruszenie|Sabotaż|…]   │
│                              │ Łącz [dowolne (Lub) | wszystkie (Oraz)]   │
│ WYKONAJ                      │ Urządzenia [szukaj: okno              ]   │
│  Włącz na 00:00:30:          │ Wybrane: [Okno Sypialnia ×] [Ruch Syp. ×] │
│   Dzwonek, Syrena            │ ▸ Sypialnia       1/2  [zaznacz wszystkie]│
│ [+ akcja]                    │ ▾ Kuchnia         0/5                     │
│                              │    [ ] Okno Kuchnia                       │
│ W PRZECIWNYM RAZIE ▸ (brak)  │ ▸ Salon           0/6                     │
├──────────────────────────────┴───────────────────────────────────────────┤
│ Brakuje: akcji w „Wykonaj”                                   [Zapisz]    │
└──────────────────────────────────────────────────────────────────────────┘
```

Telefon i tablet mają osobną drogę: dotychczasowe ekrany zostają bez zmian. Nowy edytor to nowe komponenty, włączane tylko na desktopie (`isWeb`) przy szerokości okna co najmniej 900 px. Poniżej tej szerokości aplikacja używa starych ekranów, więc nic nie jest wspólne poza logiką danych.

## Szczegóły

### Wyzwalacze i akcje (1, 5, 6, 8)
- **Częste na górze:** stała, zakodowana lista: Stan wejścia, Naruszenie, Detekcja ruchu, Detekcja otwarcia, Data i czas.
- **Reszta:** zwinięta sekcja „Wszystkie” w dwóch lub trzech kolumnach, więc 22 pozycje mieszczą się bez przewijania.
- **Szukanie:** pole filtruje od razu po fragmencie nazwy.
- **Edycja:** od razu otwiera szczegóły warunku. Lista pokazuje się dopiero po „Zmień”, z wybraną pozycją na widoku.

### Wartość i opcja (2, 9)
- **Bez osobnego okna:** do 6 krótkich opcji to przyciski w jednym rzędzie, a przy dłuższych opcjach rozwijana lista w tym samym miejscu.
- **Domyślnie „Włącz”:** dotyczy tylko akcji „Włącz/wyłącz”.

### Wybór urządzeń (2, 9)
- **Szukanie:** po fragmencie nazwy urządzenia i pomieszczenia, bez znaczenia polskich znaków. „lazienka” znajdzie „Łazienka”.
- **Pomieszczenia zwinięte:** z licznikiem `1/2`. Rozwinięte są tylko te z wybranymi urządzeniami oraz wszystkie pasujące podczas szukania.
- **Wybrane zawsze widoczne:** jako etykiety z `×` nad listą.
- **Mniejsze wiersze:** ok. 32 px zamiast 48 px i czcionka 14 px, tylko w tym edytorze.
- **Czytelny operator:** „dowolne (Lub)” i „wszystkie (Oraz)” zamiast samych słów.

### Podsumowanie (4, 9)
- Pełne nazwy zawijane w wierszach, a dopiero powyżej 12 urządzeń przycisk „pokaż wszystkie”.
- Operator widoczny w tekście: „dowolne z:” albo „wszystkie z:”, a „ORAZ”/„LUB” także między warunkami.
- To samo dla akcji, razem z opóźnieniem.

### Komunikaty i zamykanie (3, 7, 9)
- **Bez zielonego komunikatu:** po dodaniu warunku lub akcji zmiana jest widoczna od razu po lewej. Komunikaty o błędach i o zapisaniu całej rutyny zostają.
- **X:** zamyka tylko to, w czym jest. Prawy panel zamyka prawy panel, a X na górze zamyka rutynę, pytając o niezapisane zmiany.
- **Powód wyłączonego „Zapisz”:** np. „Brakuje: nazwy”. Dziś przycisk jest tylko szary, bez wyjaśnienia.

### Skróty klawiszowe (1, 8)

| Klawisz | Działanie |
|---|---|
| `/` | Przejście do pola szukania |
| `↑` `↓` | Ruch po liście |
| `Enter` | Wybór pozycji, a w formularzu zatwierdzenie panelu |
| `Spacja` | Zaznaczenie urządzenia |
| `Alt+1`…`Alt+9` | Wybór z listy częstych |
| `Esc` | Zamknięcie panelu albo wyjście z szukania |
| `Ctrl+Enter` | Zapis całej rutyny na centrali |

`Ctrl+Enter` nie jest zwykłym `Enter`, żeby przypadkiem nie wysłać rutyny na centralę.

## Czego nie zmieniamy
- Formatu rutyny i komunikacji z centralą: wysyłane dane mają być takie same jak dziś.
- Reguł, które urządzenia pasują do wyzwalacza, oraz formularzy specjalnych: harmonogram (cron), karta NFC, przyciski, godziny.
- Grup warunków i „W przeciwnym razie”. Zmienia się tylko wygląd.

## Reguły bezpieczeństwa edycji (z recenzji)
To konfiguracja prawdziwej centrali alarmowej, więc te reguły są obowiązkowe.

1. **Jeden punkt zapisu:** przycisk i `Ctrl+Enter` wołają tę samą funkcję. Nic nie jest wysyłane, gdy: rutyna jest niekompletna, otwarty jest dialog, panel ma niezatwierdzone zmiany, klawisz jest trzymany (`event.repeat`) albo zapis już trwa. Dziś jedyną blokadą jest wyłączony przycisk, więc sam skrót by ją ominął.
2. **Niezatwierdzony panel:** `Zapisz`, `Ctrl+Enter`, `Esc`, X i kliknięcie innego elementu nie zatwierdzają go po cichu, tylko pytają „Zatwierdź / Odrzuć”. Nowy warunek jest po lewej wyraźnie oznaczony jako szkic.
3. **Zmiana wyzwalacza:** zachowuje pasujące urządzenia, a o usuniętych informuje z „Cofnij”. Dziś wybór ginie bez śladu, a w jednym panelu mógłby go skasować jeden klawisz.
4. **Pytanie o niezapisane zmiany:** nowy edytor porównuje z osobną kopią wartości początkowych i nie zmienia danych w miejscu. Dzisiejszy mechanizm bywa zawodny.
5. **Niedostępny wyzwalacz lub akcja:** element z istniejącej rutyny pokazujemy tylko do odczytu, z opcją usunięcia. Nigdy nie podmieniamy go po cichu.
6. **`Esc`:** kolejno podokno, szukanie, panel, rutyna. Podokno zamyka tylko siebie. Dziś `Esc` cofa cały stos do listy.
7. **Błąd zapisu na centrali:** edytor zostaje otwarty z komunikatem. Dziś „Spróbuj ponownie” zamyka go i rutyna przepada.
8. **Wybór drogi:** desktop albo stara droga jest ustalana raz, przy otwarciu rutyny, na podstawie `window.innerWidth`. Zmiana rozmiaru okna nigdy jej nie przełącza.
9. **Urządzenia niepasujące:** etykiety pokazują każde wybrane urządzenie, także niepasujące do wartości (np. „Maskowanie”), z ostrzeżeniem i blokadą zatwierdzenia. „Zaznacz wszystkie” działa tylko na widoczne.

## Funkcje do zachowania (z recenzji)
- Porównania wartości (równe, mniejsze itd.) i operator urządzeń „Suma” dla mocy.
- „Łącz” i „W przeciwnym razie” tylko tam, gdzie centrala ma tę funkcję. „W przeciwnym razie” tylko w rutynach.
- Sceny: bez „Jeżeli”, z wyborem pomieszczenia. Akcje zawsze z `hub.scene.actions(type)`.
- Grupy warunków do 3 poziomów, z własnym operatorem. „ORAZ/LUB” między warunkami to przełącznik, a nie tekst.
- Akcja opóźnienia między akcjami, usuwanie elementów, Duplikuj i Usuń przy edycji.
- „Brak naruszeń”, usterki systemowe, NFC, warianty powiadomień, hasło APN, kolory, grupy opcji przycisku.
- W podsumowaniu `duration` znaczy „na” dla Włącz i „za” dla Wyłącz. Przy „Przełącz” go nie ma. Podsumowanie budujemy z istniejących `GetActionCardTitle` i `ConditionValue`.

## Ustalenia techniczne (z recenzji)
- **Bez zmian we współdzielonych plikach:** `RoomWithDeviceGroup`, `SelectOption`, `Page`, `GetInitialAction` są używane też przez inne ekrany. Nowe komponenty powstają od etapu 1 i są włączane jednym warunkiem `useDesktopEditor()`, a „Włącz” jest ustawiane w warstwie nowego edytora.
- **Kodowanie wartości:** wydzielamy `decodeCondition`, `encodeCondition`, `decodeAction`, `encodeAction`, bo dziś format danych (`value|A`, `{0|1}_sekundy`, `a|b|c|d|e|f`) jest wpisany w ekrany. Stara droga zachowuje działanie.
- **Panel:** przemontowany przez `key` przy zmianie elementu. Zaznaczenie po ścieżce, a nie po `id`, bo edycja nadaje nowe `id`. Harmonogram ma własny formularz, zatwierdzany jako pierwszy.
- **Szukanie:** `lodash.deburr`, bo `normalize("NFD")` nie rozkłada „Ł”. Lista częstych to typy z enuma (26, 37, 6, 10, 4), filtrowane dostępnością. Przy „Naruszenie” krótki opis, bo to też wartość „Stanu wejścia”.
- **Częste akcje:** też stała lista, którą trzeba ustalić.
- **Skróty:** `/`, `Spacja` i strzałki działają tylko poza polami edycyjnymi. `Enter` na przycisku aktywuje przycisk, a w szukaniu wybiera podświetloną pozycję i nigdy nie zatwierdza panelu. `Alt+cyfra` przez `event.code`, numer widoczny przy pozycji. Na macOS także `Cmd+Enter`. Dostępność: fokus po otwarciu i zamknięciu panelu, `aria-live` zamiast zielonego komunikatu, `aria-disabled` na „Zapisz”.

## Kolejność wdrożenia

Każdy etap dostaje własny wpis w `REJESTR-ZMIAN.md` i `CHANGELOG.md`. Przełącznik wyłączający nowy edytor zostaje na czas etapu 4.

| Etap | Zakres | Ryzyko |
|---|---|---|
| 1. Szybkie poprawki | Domyślne „Włącz”, bez zielonego komunikatu, pełne podsumowanie z operatorem (także przyciski), X zamyka właściwy poziom | Małe |
| 2. Listy wyboru | Częste na górze, szukanie, kolumny, wybrana pozycja na widoku, skróty list | Małe |
| 3. Wybór urządzeń | Szukanie, zwinięte pomieszczenia, wybrane jako etykiety, mniejsze wiersze, także lista przycisków | Średnie |
| 4. Wartości w miejscu | Przyciski i lista zamiast osobnego okna, próg długości opcji | Małe |
| 5. Jeden ekran | Najpierw kodowanie wartości i reguły bezpieczeństwa, potem dwa panele i skróty globalne, powód wyłączonego „Zapisz” | Największe |

## Sprawdzenie
- **Dane:** porównanie zakodowanego polecenia `UpsertSceneCommand` ze starego i nowego edytora dla każdego typu wyzwalacza i akcji, z pominięciem `id` i celowej zmiany „Włącz”. Blokada wysyłki jest osobną bramką testową, usuniętą z wydania.
- **Typy niedostępne na tej centrali:** centrala pokazuje 22 z 38 wyzwalaczy, więc resztę obejmują testy funkcji kodowania na danych wzorcowych.
- **Istniejące rutyny:** dla wszystkich 23 otwarcie każdego warunku i akcji, zatwierdzenie bez zmian i porównanie z oryginałem, bez zapisu.
- **Bezpieczeństwo:** każda reguła powyżej ma własny test, m.in. `Ctrl+Enter` w każdym stanie, trzymany klawisz, `Esc` z podokna, zmiana rozmiaru, błąd centrali.
- **Prawdziwy zapis:** tylko Ty, na testowej rutynie z nieszkodliwym wyjściem, bez syreny i alarmu, z odczytem z centrali na końcu każdego etapu.

## Decyzje użytkownika
1. Nowy edytor obejmuje wszystkie obszary używające tych ekranów, także sceny.
2. Częste wyzwalacze to stała, zakodowana lista.
3. `Ctrl+Enter` zapisuje rutynę na centrali.
4. Wdrażamy wszystkie etapy. Po recenzji jest ich pięć, bo listy wyboru stały się osobnym etapem.
5. Desktop i telefon/tablet to dwie osobne drogi, bez zmian w działaniu telefonu i tabletu.
