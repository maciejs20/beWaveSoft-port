# 22. Dziennik zdarzeń w wierszach

- **Wpisy rejestru:** 028
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** 1.1.0-port.2 (commit `5a50186`); w 1.2.0-port.1 bez własnego pola szukania (decyzja użytkownika 2026-11-13, wdrożona)
- **Wymagania:** 15 („Dziennik zdarzeń: zwarta tabela z szukaniem”)

## Cel
Dziennik zdarzeń (`EventLogListScreen`) pokazuje każde zdarzenie jako dużą kartę; na ekranie mieściło się ok. 6 zdarzeń i nie było szukania.

## Zachowanie
- **Szukanie:** tylko pole Satel z 1.2.0 (`module544.SearchBar` w nagłówku, gdy centrala ma `EventLogAdvancedFilters`). Szuka na centrali: `appliedQuery` z `useEventLogSearch` idzie do `useEventLogQuery`, a wiersze pokazują `eventLogQuery.events` bez dodatkowego filtra. Bez `EventLogAdvancedFilters` szukania nie ma, jak w oryginale. Do `1.1.0-port.3` było nasze pole `device_table.search_events` filtrujące wczytane zdarzenia (`eventMatches`); w `1.2.0-port.1` usunięte, żeby nie dublować pola Satel.
- Każde zdarzenie to jeden wiersz (min. 30 px, linia dolna):
  - ikona dzwonka 12 px w kółku 20 px, w kolorach typu zdarzenia z `getEventBellColor(type, isDark)` i `getEventBackgroundColor(type, isDark)` (jak na karcie, z uwzględnieniem ciemnego motywu),
  - data i godzina z `getEventDateToDisplay(event, false)` (130 px, 12 px, szara),
  - źródło: `event.userName` i ` [pomieszczenie]` (170 px),
  - treść `event.message` (reszta), wszystko w jednej linii.
- Klik w wiersz otwiera te same szczegóły co karta (`ScreenName.EventLogDetails` z `{ data }`).
- Filtry dziennika (ikona ustawień w nagłówku, kropka aktywnych filtrów), nagłówek i doczytywanie bez zmian.
- Poniżej 900 px przy otwarciu: oryginalne karty.

## Punkty zaczepienia
- `EventLogListScreen` (eksport): lista `<module244.default ref={ref2} style={{ height: "100%" }} data={iA} renderItem={function (props) { var item4 = props.item; return <module1684.default data={item4} detailed={false} />; }} keyExtractor={… `${L}_${e}_${A.event.timestamp}` …}`; elementy `data` mają `event.{type,timestamp,userName,message}` i `room`.
- `getEventBellColor`, `getEventBackgroundColor`, `getEventDateToDisplay` (eksporty modułu `getEventDateToDisplay`; `getEventBellColor` w 1.2.0: 3 trafienia).
- Ekran szczegółów `ScreenName.EventLogDetails`, motyw: `useThemeState().theme`, `IsDarkTheme`.

## Implementacja
1. Nowy plik `src/renderer/app/desktop/shared/DesktopEventRow.js` (kopiuj bez zmian). Eksport `DesktopEventRow({ data })`.
2. W `EventLogListScreen`:
   - `var desktopPath = useRef(DesktopEditor.isDesktopEditor()).current;`
   - na początku `renderItem`: `if (desktopPath) { return <DesktopEventRow data={item4} />; }`;
   - `data` listy bez zmian (`eventLogQuery.events`), pola szukania nie dodajemy.

## Zależności
Przepis 08.

## Sprawdzenie
1. Dziennik: wiersze z kolorowym dzwonkiem, datą, źródłem i treścią; kilkadziesiąt zdarzeń na ekranie.
2. Nad wierszami tylko pole Satel (centrala z `EventLogAdvancedFilters`); wyszukanie zmienia wiersze na wynik z centrali.
3. Klik w wiersz: te same szczegóły co karta.
4. Przewinięcie do końca: doczytanie starszych zdarzeń.
5. Okno < 900 px: karty.

## Ryzyka przy nowej wersji
- Kształt `data` (`event`, `room`) może się zmienić; wiersz trzeba wtedy dopasować.
