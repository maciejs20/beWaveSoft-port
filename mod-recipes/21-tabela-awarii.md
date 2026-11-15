# 21. Tabela aktywnych awarii

- **Wpisy rejestru:** 027, 055, 057
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** 1.1.0-port.2 (commit `5a50186`); 055 i 057 niewydane (po 1.2.0-port.2), oryginał 1.2.0
- **Wymagania:** 15 („Aktywne awarie: zwarta tabela”)

## Cel
Ekran aktywnych awarii (`HubFailuresScreen`) pokazuje każdą awarię jako dużą kartę urządzenia (`SectionList` z `DeviceInfoComponent`), więc na ekranie mieści się kilka pozycji.

## Zachowanie
- Pod nagłówkiem ekranu (z koszem do kasowania pamięci awarii dla administratora, bez zmian) zamiast listy kart:
  - **najpierw** pozycje, które nie są urządzeniem z tabeli (np. awarie centrali), jako oryginalne karty `DeviceInfoComponent`, z odstępem 8 px;
  - **potem** zwarta tabela urządzeń z awarią bieżącą (`hasErrors`) lub w pamięci (`hasErrorsInMemory`), wiersz min. 32 px, odstęp boczny 32 px.
- **Kolumny:** „Nazwa” (200 px: miniatura typu urządzenia 24×24 z `getDeviceImage(deviceTypeId)` i nazwa), „Pomieszczenie” 130, „Typ” 80, „Usterki” (reszta), „Sygnał” 50, „Zasilanie” 62. Nagłówki z kluczy `device_table.column_*` (przepis 19). W kolumnie „Usterki” lista bieżących usterek, a za nią usterki tylko z pamięci po `device_table.in_memory` („W pamięci awarii: …” / „In fault memory: …”, wpis 055); gdy jest tylko awaria zapamiętana bez kodów: `device_table.in_memory`. Komórki mają natywny `title`.
- **Dane wierszy (055):** usterki, sygnał i zasilanie pochodzą z `useDeviceRows()` (przepis 19), które od wpisu 055 czyta stan ze strumienia stanów (`deviceStatesSubject`), bo 1.2.0 nie trzyma stanu urządzeń w Realm. Wcześniej te kolumny były puste.
- **Klik w wiersz** (lewy przycisk, bez zaznaczonego tekstu) otwiera szczegóły urządzenia `DeviceDashboard` z `{ key, readonly: true }`, poprzedzone osłoną 600 ms (`armClickShield`, przepis 19).
- **Powrót ze szczegółów (057):** X w nagłówku szczegółów i `Esc` wracają do tabeli awarii (`goBack`), a nie na ekran główny. Mechanizm `closeHandler` w `DeviceDashboardScreen` i `tableDetailsClose.returnsToTable` (`TABLE_SCREENS` zawiera `HubFailures`) opisuje przepis 19.
- Liczba wierszy tabeli plus kart urządzeń spoza tabeli równa się liczbie w „Liczba awarii” na ekranie centrali.
- Brak sortowania, szukania i filtrów (lista jest krótka).
- Poniżej 900 px przy otwarciu: oryginalna lista kart z nagłówkiem `HubInfoComponent`.
- Wejście z panelu bocznego: pozycja „Awarie: N” w „Podsumowaniu” (wpis 058, przepis 25).

## Punkty zaczepienia
- `HubFailuresScreen` (eksport): `<module248.default sections={X} initialNumToRender={1} … ListHeaderComponent={<View …><HubInfoComponent2.HubInfoComponent data={n} withRedirection={true} /></View>} …` (lista sekcji RN), dane sekcji z `GetHubInfoData(o, ErrorFilterMode.AllErrors, true)`; elementy sekcji mają `key`, `hasErrors`, `hasErrorsInMemory` (ustawiane w `hubVirtualDevicesChangeListenerCallback` z `state.errorCodesMemory`).
- `DeviceInfoComponent` (eksport, `deviceKey`), `getDeviceImage` (eksport), `DeviceKeyEqual` / `GetDeviceKey`.

## Implementacja
1. Nowy plik `src/renderer/app/desktop/shared/DesktopFailuresList.js` (kopiuj bez zmian). Eksport `DesktopFailuresList({ sections })`: zbiera elementy sekcji z `hasErrors || hasErrorsInMemory`, dopasowuje je do wierszy `useDeviceRows()` (przepis 19) przez `DeviceKeyEqual`, niedopasowane renderuje jako `DeviceInfoComponent`.
2. W `deviceTableModel.buildRows` wiersz ma pole `deviceTypeId: device.type` (potrzebne do miniatury). W naszym kodzie dodane razem z tym przepisem.
3. `useDeviceRows.js` (wspólne dane obu tabel) powstał razem z tym przepisem; w przepisie 19 jest opisany jako część katalogu `deviceTable`.
4. W `HubFailuresScreen`: `var desktopPath = useRef(DesktopEditor.isDesktopEditor()).current;` i `<module248.default sections={X} …/>` owinięte w `{desktopPath ? <DesktopFailuresList2.DesktopFailuresList sections={X} /> : <dotychczasowa lista>}`.
5. i18n `device_table.in_memory`: „W pamięci awarii” / „In fault memory”.
6. Powrót X i `Esc` do tabeli (057): `screens/DeviceDashboardScreen.js` i `desktop/shared/tableDetailsClose.js`, krok 3a przepisu 19 i wpis 057. Ekran `HubFailures` musi być na liście `TABLE_SCREENS`.

## Zależności
Przepisy 08 i 19 (`useDeviceRows`, `clickShield`, klucze `device_table.column_*`).

## Sprawdzenie
1. Centrala z aktywnymi awariami: tabela z miniaturami, liczba wierszy (plus ewentualnych kart) = „Liczba awarii”.
2. Urządzenie z awarią tylko w pamięci: „W pamięci awarii”.
3. Klik w wiersz: szczegóły w trybie `readonly`; strzałka wstecz, X i `Esc` wracają do tabeli awarii (057).
4. Kosz (administrator) bez zmian; testować tylko za zgodą użytkownika (kasuje pamięć awarii na centrali).
5. Okno < 900 px: karty.
6. Kolumny „Usterki”, „Sygnał” i „Zasilanie” wypełnione dla urządzeń, które je podają (055).

## Ryzyka przy nowej wersji
- `readonly: true` w szczegółach nie ukrywa wiersza „Włącz/wyłącz” (ustalenie z `PROJEKT-TABELA-OBIEKTOW.md`); ochronę dają osłona 600 ms i potwierdzenie z przepisu 20.
- Jeśli nowe wydanie zmieni strukturę sekcji (np. awarie centrali z innym kształtem albo inne pola niż `hasErrors`/`hasErrorsInMemory`), dopasuj zbieranie elementów.
- Dane wierszy zależą od źródła stanu z przepisu 19 (wpis 055): gdy nowe wydanie przeniesie stan urządzeń, kolumny Usterki, Sygnał i Zasilanie będą puste bez błędu.
- `Image` z RNW i `getDeviceImage` (zasoby z `dist/src/assets`): po zmianie ścieżek zasobów miniatury mogą być puste.
