# 24. Pomieszczenia z małym zdjęciem i tabela urządzeń pomieszczenia

- **Wpisy rejestru:** 030
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** 1.1.0-port.2 (commit `5a50186`)
- **Wymagania:** 15 („Ekran główny i pomieszczenia: zwarta lista pomieszczeń i tabela urządzeń pomieszczenia”); `PROJEKT-TABELA-OBIEKTOW.md`, pytanie 2 (zmiana decyzji: pomieszczenie dostało tabelę)

## Cel
Kafelki pomieszczeń na ekranie głównym mają duże zdjęcia, które zajmują większość ekranu. Ekran pomieszczenia nie miał wejścia do tabeli urządzeń.

## Zachowanie
- **Kafelek pomieszczenia** (`HubChildTile`) na ekranie głównym:
  - zdjęcie pomieszczenia 64×52 px w prawym górnym rogu kafelka (`position: absolute`, `top: 10`, `right: 10`, zaokrąglenie 6 px),
  - kafelek o wysokości dopasowanej do treści: `height: "auto"`, `minHeight: 72`, `paddingBottom: 8`, `position: "relative"`, `overflow: "hidden"`,
  - nazwa, ikona stanu czuwania, temperatura i inne wartości oraz klik (przejście do `RoomDashboard`) bez zmian.
- **Ekran pomieszczenia** (`RoomDashboardScreen`): w nagłówku, obok tytułu (nazwy pomieszczenia), tekstowy przycisk `device_table.open_room_table` („Tabela urządzeń” / „Device table”, 13 px, `secondary800`). Otwiera tabelę obiektów (przepis 19) z parametrami `{ id: null, name: <nazwa pomieszczenia>, roomId: <id pomieszczenia>, forceTable: true }`:
  - tytuł tabeli to nazwa pomieszczenia,
  - wiersze tylko z tego pomieszczenia (`row.roomId === params.roomId`),
  - zawsze tabela, bez zmiany zapamiętanego widoku kafelków,
  - zakładki pokazują liczby dla pomieszczenia; urządzenia są widoczne tylko na zakładce, która je obejmuje (np. przy zapamiętanej zakładce „Wejścia” pomieszczenie z samymi wyjściami pokazuje „Brak wyników”, a chip „Wyjścia N” wskazuje, gdzie są).
- Poniżej 900 px: oryginalne duże zdjęcie na kafelku i brak przycisku w nagłówku pomieszczenia.

## Punkty zaczepienia
- `HubChildTile` (eksport, w 1.2.0: 11 trafień): `<module63.PressableOpacity style={objectSpread(objectSpread({}, tileStyles.tile), PlatformConstants.isWeb ? { marginLeft: 0, marginTop: 0 } : {})} onPress={… navigate(ScreenName.RoomDashboard, { roomIdentifier: data.id }) …}>`, na końcu `<RoomImage2.RoomImage style={tileStyles.childIcon} resource={data.imageId} />`.
- `RoomDashboardScreen` (eksport): `<PageHeader2.PageHeader title={tA.name} goBack={e} />` w kontenerze `headerContainer`; obiekt pomieszczenia `tA` z polami `id`, `name`, `imageId`. `PageHeader` przyjmuje `actions` (renderowane po tytule).
- Tabela: trasa `ScreenName.GroupComponent` z przepisu 19.

## Implementacja
1. `HubChildTile`: do scalania stylu kafelka dodaj trzeci argument `DesktopEditor.isDesktopEditor() ? { height: "auto", minHeight: 72, paddingBottom: 8, position: "relative", overflow: "hidden" } : {}`, a styl `RoomImage`: `isDesktopEditor() ? { position: "absolute", top: 10, right: 10, width: 64, height: 52, borderRadius: 6 } : tileStyles.childIcon`.
2. Nowy plik `src/renderer/app/desktop/shared/navigateToDeviceTable.js` (kopiuj bez zmian): `navigateToDeviceTable(appNavigation, room)` → `appNavigation.navigate(ScreenName.GroupComponent, { id: null, name: room.name, roomId: room.id, forceTable: true })`.
3. `RoomDashboardScreen`: do `PageHeader` dodaj `actions={DesktopEditor.isDesktopEditor() ? <PressableOpacity onPress={() => navigateToDeviceTable(appNavigationForTable, tA)}><Text style={{ fontSize: 13, color: Color.secondary800 }}>{t("device_table.open_room_table")}</Text></PressableOpacity> : undefined}`; `appNavigationForTable = useAppNavigation()` (dodatkowe wywołanie hooka na początku komponentu).
4. Tabela obiektów (przepis 19): wiersz ma pole `roomId: entry.room.id`, a `DeviceTableScreen` filtruje `(!params?.roomId || row.roomId === params.roomId)`. `DeviceTableRoute` obsługuje `forceTable`.
5. i18n `device_table.open_room_table`: „Tabela urządzeń” / „Device table”.

## Zależności
Przepisy 08 i 19 (trasa tabeli, `forceTable`, filtr `roomId`).

## Sprawdzenie
1. Ekran główny: kafelki pomieszczeń niskie, z małym zdjęciem w prawym górnym rogu.
2. Pomieszczenie → „Tabela urządzeń”: tabela z tytułem pomieszczenia i tylko jego urządzeniami; liczby w zakładkach sumują się do liczby urządzeń pomieszczenia.
3. Po powrocie: kafelek „WSZYSTKIE” otwiera zapamiętany widok, nie wymuszoną tabelę.
4. Okno < 900 px: duże zdjęcia, brak przycisku.

## Ryzyka przy nowej wersji
- **Stan tabeli jest wspólny** (`deviceTableStore`): szukanie, filtry i zakładka wpisane w tabeli wszystkich urządzeń przechodzą do tabeli pomieszczenia i odwrotnie. To zachowanie z 1.1.0; przy przenoszeniu można rozdzielić stan per kontekst.
- Filtr pomieszczenia w tabeli (lista rozwijana) porównuje **nazwę**, a filtr `roomId` identyfikator; dwa pomieszczenia o tej samej nazwie są w liście rozwijanej nierozróżnialne.
- Zmiana stylów kafelka (`tileStyles.tile`, np. stała wysokość w nowym wydaniu) może kolidować z `height: "auto"`; celem jest niski kafelek z miniaturą.
- `HubChildTile` woła `isDesktopEditor()` przy każdym renderze, więc reaguje na żywo na zmianę szerokości okna.
