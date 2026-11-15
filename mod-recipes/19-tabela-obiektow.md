# 19. Tabela obiektów i pozycja „Lista urządzeń”

- **Wpisy rejestru:** 024, 025, 055, 056, 057, 059, 060, 061
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** 1.1.0-port.2 (commity `008d0f2`, `0466b30`, `48f2c2f`); 055–057 i 059–061 w 1.2.0-mod3.1, oryginał 1.2.0
- **Wymagania:** 10; projekt `PROJEKT-TABELA-OBIEKTOW.md` (decyzje: czujki bezprzewodowe w „Pozostałe”, szczegóły bez potwierdzenia, `Esc` w szczegółach wraca do tabeli, domyślnie widok graficzny); decyzje użytkownika z 2026-11-15 (wpis 056: kolumny Moduł i Wartość, filtr typów, bez numeru systemowego modułu; wpis 057: X w szczegółach wraca do tabeli; wpisy 059–061 po teście na centrali: Moduł za Pomieszczeniem, szerokości kolumn według treści i zmieniane myszą, nazwa „Lista urządzeń”)

## Cel
Lista urządzeń (ekran główny → kafelek grupy, np. „WSZYSTKIE”) jest zrobiona pod telefon: duże karty, a parametry takie jak typ obwodu wejścia widać dopiero w szczegółach. Potrzebna jest dodatkowa, tabelaryczna wersja z kluczowymi parametrami, wejściami i wyjściami osobno, szukaniem od pierwszych liter i przejściem do szczegółów po kliknięciu. Widok graficzny zostaje. Tabela **niczym nie steruje** (karty i grupy obok mają przełączniki działające jednym kliknięciem).

## Zachowanie

### Wejście i przełącznik widoku
- Kafelek grupy (także „Wszystkie”, `id: null`) otwiera tę samą trasę `GroupComponent` co dawniej. Na desktopie trasa pokazuje:
  - **widok graficzny** (oryginalny `GroupScreen`) z przełącznikiem `[Graficzny | Tabela]` (`device_table.view_graphic` „Graficzny”, `device_table.view_table` „Tabela”) przypiętym w wierszu tytułu modala 800 px, po lewej od X (`position: fixed`, `top: 68`, `zIndex: 1000`, poziomo liczone względem panelu bocznego 360 px i środka okna);
  - **widok tabeli** z tym samym przełącznikiem na prawym końcu pierwszego wiersza (wpis 056; wcześniej obok pola szukania).
- **Domyślny jest widok graficzny.** Wybór jest zapamiętany w `localStorage` pod kluczem `deviceTable.view` (`"table"`/`"graphic"`, odczyt i zapis w `try/catch`). Od chwili wyboru tabeli każdy kafelek grupy otwiera od razu tabelę.
- **Pozycja „Lista urządzeń” w panelu bocznym (025; do wpisu 061 „Lista obiektów”):** w grupie „Podsumowanie” (`hub-settings.summary`), jako **pierwsza** pozycja, przed „Zużycie energii” (`hub-settings.power_consumption`): tytuł `device_table.menu` („Lista urządzeń” / „Device list”, od 061), ikona `home-wifi`, zaznaczona, gdy aktywna jest trasa `GroupComponent`. Otwiera trasę `GroupComponent` z parametrami `{ id: null, name: t("all"), icon: "home-wifi", forceTable: true }`, czyli zawsze tabelę wszystkich urządzeń, **bez zmiany** zapamiętanego widoku kafelków.
- Kafelek konkretnej grupy otwiera tabelę zawężoną do jej kategorii (`params.id` → `row.category`), z tytułem grupy.

### Tabela
- Modal na całą szerokość (`modalMaxWidth: "100%"`), tytuł: nazwa grupy albo `all` („Wszystkie”).
- **Wiersz 1:** zakładki-chipy z liczbą trafień, np. „Wejścia 46”, „Wyjścia 17”, „Pozostałe 13” (`device_table.tab_input`, `tab_output`, `tab_other`); filtry-chipy `filter_errors` („Z usterkami”), `filter_violated` („Naruszone”), `filter_tampered` („Sabotaż/maskowanie”), `filter_blocked` („Zablokowane”), przełączane kliknięciem; lista rozwijana pomieszczeń z pozycją `all_rooms` („Wszystkie pomieszczenia”); przełącznik widoku na prawym końcu (`marginLeft: "auto"`). Wiersz się zawija (`flexWrap: "wrap"`, `rowGap: 6`). Liczby w zakładkach uwzględniają szukanie, filtry i wybrane typy.
- **Wiersz 2, filtr typów (056):** tylko gdy w bieżącej zakładce (kategoria i pomieszczenie ekranu, bez szukania i filtrów) są co najmniej dwa typy urządzeń. Chip `filter_all_types` („Wszystkie typy”, aktywny bez wyboru) i chip na każdy typ: etykieta typu („Centrala” dla płyty głównej) i liczba wierszy po pozostałych filtrach, sortowane alfabetycznie. Wybór wielokrotny (suma typów), trzymany w `filters.types` razem z resztą filtrów; typy nieobecne w zakładce nie filtrują, a pozostałe zakładki nie są zawężane typami.
- **Wiersz 3, szukanie (056):** pole `device_table.search` („Szukaj po nazwie, pomieszczeniu lub module…”) w osobnym wierszu tuż nad tabelą, do 720 px szerokości, wysokość 40, czcionka 15; przy tekście przycisk `×` (32×32 po prawej w polu) czyści szukanie i zostawia fokus w polu.
- **Podział na zakładki** (`classifyDevice`):
  - wejście: `IsExpanderInput(device.type, Number(device.key.uuidChannel))` (ta sama reguła co wyzwalacz „Stan wejścia”),
  - wyjście: `state.settings.options` zawiera `SET_ON_OFF` lub `SET_OPEN_CLOSE`,
  - oba naraz: urządzenie na obu zakładkach, z dopiskiem ` (We/Wy)` przy nazwie,
  - żadne: „Pozostałe” (piloty, klawiatury, czujki bezprzewodowe, termostaty). Nic nie znika.
- **Kolumny** (nagłówki `device_table.column_<pole>`; nagłówek przyklejony u góry przy przewijaniu). Zestaw zależy od szerokości okna (`LAYOUTS`/`layoutFor` w modelu, wpis 059); Moduł zawsze zaraz za Pomieszczeniem:

| Okno | Wejścia | Wyjścia | Pozostałe |
|---|---|---|---|
| ≥ 1750 px | Nazwa, Pomieszczenie, Moduł, Zacisk, Typ, Obwód, Wartość, Czułość, Reakcja, Czas, Liczba, Stan, Sygnał, Zasilanie, Blokada, Usterki | Nazwa, Pomieszczenie, Moduł, Zacisk, Typ, Stan, Sposób działania, Czas działania, Sygnał, Zasilanie, Blokada, Usterki | Nazwa, Pomieszczenie, Moduł, Zacisk, Typ, Sygnał, Zasilanie, Blokada, Usterki |
| 1300–1749 px | jak wyżej bez Typ, Czas i Liczba | jak wyżej bez Typ | jak wyżej |
| < 1300 px | Nazwa, Pomieszczenie, Moduł, Zacisk, Obwód, Reakcja, Stan, Usterki | Nazwa, Pomieszczenie, Moduł, Zacisk, Stan, Sposób działania, Czas działania, Usterki | Nazwa, Pomieszczenie, Moduł, Usterki |

  Do wpisu 059 układy były w ekranie jako pary `[klucz, szerokość]` ze stałymi szerokościami, Moduł stał za Typem, a w wąskim oknie nie było Modułu na Wejściach i Wyjściach ani Sposobu działania na Wyjściach.
- **Szerokości kolumn (060):** automatycznie według najdłuższego tekstu nagłówka (z ` ▼`) i komórek całej zakładki (bez szukania, filtrów i typów, więc nic nie skacze przy pisaniu), pomiar `canvas.measureText` czcionką Jost (`12px` nagłówek, `13px` komórka) + 12 px, w granicach 40–320 px; ostatnia kolumna wypełnia resztę. Przeciągnięcie uchwytu 6 px przy prawej krawędzi nagłówka zmienia szerokość (min 40 px, bez sortowania), dwuklik przywraca automatyczną. Szerokości użytkownika w `localStorage` `deviceTable.columnWidths`, osobno dla każdej zakładki. Gdy kolumny się nie mieszczą, tabela przewija się w poziomie.

- **Puste kolumny (056):** kolumna bez wartości w żadnym wierszu bieżącej zakładki znika (`visibleColumns`). Zakres liczony bez szukania, filtrów i typów, więc kolumny nie skaczą przy pisaniu. Ostatnia pozostała kolumna bierze wolne miejsce.

- **Treść komórek** (tylko dane, które aplikacja już ma; 0 dodatkowych żądań do centrali):

| Pole | Źródło i format |
|---|---|
| Nazwa | `device.name` |
| Pomieszczenie | `ResolveRoomName(t, room)` |
| Typ | `GetDeviceName(device.type)` |
| Moduł (056) | typ i numer seryjny modułu: `` `${GetDeviceName(type)} ${device.key.uuid}` ``; płyta główna (`HubDeviceType.MAIN_BOARD`) jako `device_table.main_board` („Centrala”); podpowiedź: ogólna nazwa typu z `DeviceGenericNameMap` (np. „Zone expander”). Bez numeru systemowego modułu (decyzja użytkownika) |
| Zacisk | `GetChannelName(type, channel)` tylko gdy kanał > 0 |
| Obwód | `common.options.device.expander-input-type.values.<ExpanderInputType[settings.inputType]>` |
| Wartość (056) | `settings.inputValue` zaokrąglone do 0,1 z jednostką `MeasurementUnit.Ohm` („Ω”) |
| Czułość | `${inputSensitivity} ms` |
| Reakcja | `common.options.device.input_alarm_type.values.<InputReactionType[inputReactionType] małymi>` z `_sabotage` dla kanału TMP (`IsTemporaryChannel`) |
| Czas / Liczba | `${blindSensorImpulsesTime} s` / `blindSensorImpulsesCount` |
| Stan (wejście) | `widgets.expander.input-state-values.<ExpanderInputState[inputState] małymi>`; bez `inputState`, przy `violation` typu `boolean`: `…violation` / `…normal` (055) |
| Stan (wyjście) | `device_table.on` („Włączone”) / `device_table.off` („Wyłączone”) z `settings.onOff ?? settings.openClose`, tekst, **bez kontrolki przypominającej przełącznik** |
| Sposób działania | `common.options.device.output_reaction_type.values.<OutputReactionType[…] małymi>` |
| Czas działania | `Convert_Milliseconds_To_HHMMSS(settings.durationTime)` |
| Sygnał | `${signal}%` |
| Zasilanie | `${voltageSupply.toFixed(2)}V`, inaczej `${battery}%` |
| Blokada | `device_table.yes` („Tak”) gdy `settings.blockUnblock === true` |
| Usterki | `common.options.device.error-codes.values.<HubDeviceState_ErrorCode[code]>` rozdzielone przecinkami (nie `GetDeviceStatus`, który daje „Naruszenie” dla pustej listy); za nimi po `; ` `` `${device_table.in_memory}: …` `` z kodami tylko z `errorCodesMemory` (055) |

- **Źródło stanu (055):** pola `settings`, `errorCodes` i `errorCodesMemory` pochodzą ze strumienia stanów `deviceStatesSubject` (`Map` po `GetDeviceKey(key)`), a `device.state` ze struktury jest tylko zapasem. Od 1.2.0 Realm nie trzyma stanu urządzeń (schemat `schemaRoomsDevices` bez `state`); czytanie samego `device.state` daje puste kolumny stanu i martwe filtry.

- Ucięty tekst: każda komórka ma natywny `title`, więc pełna treść jest w podpowiedzi po najechaniu.
- **Filtry:** „Z usterkami” = usterki bieżące lub w pamięci (`errorCodes` lub `errorCodesMemory` niepuste, 055); „Naruszone” = `violation === true` lub `inputState` `VIOLATION` (1) lub `VIOLATION_AND_MASKING` (4); „Sabotaż/maskowanie” = `inputState` `SABOTAGE` (2), `MASKING` (3) lub `VIOLATION_AND_MASKING` (4); „Zablokowane” = `blockUnblock === true`; pomieszczenie = równość nazwy; typy jak wyżej.
- **Szukanie:** po nazwie, pomieszczeniu i module (056), bez znaków diakrytycznych (`normalize("NFD")`, usunięcie znaków łączących, `ł` → `l`) i małymi literami, zapytanie dzielone po spacjach, każdy fragment musi wystąpić („okno kuch”). Bez opóźnienia.
- **Sortowanie:** domyślnie pomieszczenie, potem nazwa; `Intl.Collator("pl", { numeric: true, sensitivity: "base" })` (`Z9` przed `Z10`). Klik w nagłówek sortuje po kolumnie rosnąco, kolejny klik malejąco (`▲`/`▼`). Remis rozstrzyga `orderNumber`.
- Brak wierszy: `device_table.no_results` („Brak wyników”).
- **Podświetlenie:** pierwszy widoczny wiersz automatycznie; podświetlenie idzie za identyfikatorem urządzenia (`uuid-uuidChannel`), więc zostaje przy zmianach na żywo.
- **Dane na żywo:** wiersze przeliczane przy każdej synchronizacji struktury i przy każdej zmianie stanu urządzenia (`fromCacheWithStates`, ten sam mechanizm co oryginalne ekrany urządzeń), wiersz przerysowywany tylko przy zmianie (`React.memo` z `isEqual`).

### Otwieranie szczegółów i bezpieczeństwo
- **Jedyna funkcja wiersza:** `openDetails(row)` = `navigate(ScreenName.DeviceDashboard, { key: row.key })`, z pełnym kluczem (`uuid` i `uuidChannel`). Wołają ją tylko klik i `Enter`.
- Klik reaguje tylko na lewy przycisk i nie otwiera, gdy zaznaczony jest tekst (można skopiować np. nazwę).
- **Osłona 600 ms:** zaraz przed nawigacją `armClickShield()` rejestruje na `window` w fazie capture blokadę (`preventDefault` + `stopImmediatePropagation`) zdarzeń `pointerdown`, `pointerup`, `mousedown`, `mouseup`, `click`, `dblclick`, `keydown`, `keyup` na 600 ms. Drugi klik podwójnego kliknięcia nie trafi w przełącznik w szczegółach (modal pojawia się natychmiast, a szczegóły sterują jednym kliknięciem).
- `Enter` otwiera tylko przy `!event.repeat`. `Spacja` w tabeli nic nie robi.
- Szczegóły (`DeviceDashboard`) bez `readonly`, bo tam jest dalsza edycja urządzenia. Jedyna zmiana w szczegółach (057): na desktopie X w nagłówku i `Esc` wracają do tabeli (`goBack`), gdy szczegóły leżą bezpośrednio nad tabelą obiektów (`GroupComponent`) albo tabelą awarii (`HubFailures`, przepis 21); otwarte skądinąd zamykają cały stos jak w oryginale.

### Klawisze tabeli
Nasłuch w fazie capture na `window`, tylko gdy tabela ma fokus nawigacji (`useFocusEffect`), więc klawisze w otwartych szczegółach nie trafiają do tabeli pod spodem. Po otwarciu i po powrocie fokus jest w polu szukania z zachowanym tekstem.

| Klawisz | Działanie |
|---|---|
| litera lub cyfra (`\p{L}`, `\p{N}`, bez `Ctrl`/`Cmd`; `AltGr`/`Option` dozwolone) poza polem | fokus w polu szukania, znak się wpisuje |
| `↑` `↓` / `PgUp` `PgDn` (w polu szukania albo poza polami) | podświetlenie o 1 / o 10 wierszy, z przewinięciem do widoku |
| `Enter` (w polu szukania albo poza polami) | otwiera podświetlony wiersz (bez `repeat`) |
| `Alt+1` … `Alt+3` (`event.code`) | zakładki Wejścia, Wyjścia, Pozostałe |
| `Esc` przy tekście | czyści szukanie, tabela zostaje |
| `Esc` w pustym polu / bez tekstu | zamyka tabelę jak w oryginale |
| `Esc` lub X w szczegółach otwartych z tabeli | wraca do tabeli (`goBack`), a nie na ekran główny (X od wpisu 057) |

### Stan tabeli
Zapytanie, zakładka, sortowanie, filtry (z wybranymi typami) i pomieszczenie są trzymane w pamięci modułu (`deviceTableStore`), więc przetrwają powrót ze szczegółów (także przez `Esc`, które w oryginale odmontowuje tabelę) i ponowne otwarcie tabeli w tej samej sesji. Znikają po zamknięciu aplikacji.

### Telefon, tablet, wąskie okno
Poniżej 900 px przy otwarciu trasy: wyłącznie oryginalny `GroupScreen`, bez przełącznika i bez pozycji „Lista urządzeń” w panelu.

## Punkty zaczepienia
- Rejestracja tras (w 1.1.0 `misc/module_2541.js`, ładowana z `components/unnamed/module_2526.js`): `<oe.Screen name={module55.ScreenName.GroupComponent} component={GroupScreen.GroupScreen} options={getModalOpts.getModalOpts} />` (w 1.2.0: `GroupComponent` 3 trafienia). Uwaga: `components/getModalOpts.js` też rejestruje `GroupComponent`; aktywna jest lista z `HomeDashboard`, `HubPowerConsumption`, `HomeSettings` pod `connection.connected`.
- `HubGroupList` (eksport): `appNavigation.navigate(ScreenName.GroupComponent, { … })` z danymi kafelka (`id`, `name`, `icon`).
- `useHubSettingsMenu` (eksport, w 1.2.0: 3 trafienia): grupa `title: r("hub-settings.summary")`, pierwsza pozycja `items` z `title: r("hub-settings.power_consumption")` (1 trafienie w 1.2.0), `leftIcon: "bolt"`, funkcja `callback(screen, params)` z `useCallback`, pole `hasPermission`.
- Dane: `fromCacheWithStates(name, fromRealm, withStates)` (eksport `hooks/useDerivedWithHubInfo.js`, kotwica `exports.fromCacheWithStates = function (e, A, t, n)`; łączy `fromCache` z `deviceStatesSubject` z `logic/stageStructureStatesHub.js`), `GetDeviceKey`, `hub.structure.tree(data, t).rooms` (pokoje z `room.devices`, bez stanu od 1.2.0), `DeviceGenericNameMap` (`logic/HubGenericName.js`), `MeasurementUnit.Ohm`, `HubDeviceType.MAIN_BOARD`, `IsExpanderInput`, `IsTemporaryChannel`, `ResolveRoomName` (moduł `ResolveRoomName`), `GetChannelName` (`BuildDeviceViewModel`), `GetDeviceName` (`ShowDeviceIsArmingWarningModal`), `Convert_Milliseconds_To_HHMMSS`, enumy `HubDeviceState_Settings_Command`, `ExpanderInputType`, `ExpanderInputState`, `InputReactionType`, `OutputReactionType`, `HubDeviceState_ErrorCode`.
- Nawigacja: `useAppNavigation()`, `useNavigation()` z `isFocused()` i `getState()` (`@react-navigation`, moduł 58), `useFocusEffect`.
- Szczegóły (057): `DeviceDashboardScreen` (eksport, `screens/DeviceDashboardScreen.js`), obiekt właściwości strony z `resetScrollOnFocus: true` (1 trafienie w ekranie); `Page` (`screens/webPageStyle.js`) przekazuje `closeHandler` do X (`onClose={A.closeHandler}`) i do `useEscapeHandler`; `useCloseModalStack` (eksport `hooks/useCloseModalStack.js`).

## Implementacja
1. **Nowy katalog** `src/renderer/app/desktop/deviceTable/` (kopiuj bez zmian):

| Plik | Odpowiedzialność |
|---|---|
| `DeviceTableRoute.js` | eksporty `DeviceTableRoute` (wybór drogi `useRef(isDesktopEditor())`, tryb z `params.forceTable ? "table" : loadViewMode()`, przełączanie i zapis trybu) oraz `ViewToggle` (`pinned` = przypięty w wierszu tytułu) |
| `DeviceTableScreen.js` | ekran tabeli: wiersze z zakładkami i filtrami, chipy typów, szukanie z `×`, kolumny wg szerokości bez pustych, klawiatura, `openDetails`, obsługa `Esc` w szczegółach |
| `deviceTableModel.js` | czyste funkcje bez usług aplikacji: `classifyDevice(device, state, names)`, `buildRows(t, rooms, states, names)`, `matchesQuery`, `matchesTypes`, `typeOptions`, `visibleColumns`, `sortRows`, `isBlocked`; od 059–060 `LAYOUTS`, `layoutFor`, `cellText`, `autoWidths`, `columnWidths`, `clampWidth`, `MIN_COLUMN_WIDTH`; ładuje się w testach node |
| `deviceTableNames.js` | `deviceTableNames`: odwołania do usług przekazywane do modelu (`roomName` = `ResolveRoomName`, `isInput` = `IsExpanderInput`, `isTamper` = `IsTemporaryChannel`, `channelName` = `GetChannelName`, `deviceName` = `GetDeviceName`) (055) |
| `deviceTableStore.js` | stan w pamięci (`loadTableState`/`saveTableState`) i tryb widoku w `localStorage` (`loadViewMode`/`saveViewMode`, klucz `deviceTable.view`); szerokości kolumn (`loadColumnWidths`/`saveColumnWidths`, klucz `deviceTable.columnWidths`, 060) |
| `clickShield.js` | `armClickShield()`: osłona 600 ms |
| `useDeviceRows.js` | `useDeviceRows()`: `fromCacheWithStates("DeviceTable()", data => isNil(data) ? null : hub.structure.tree(data, t).rooms, (rooms, states) => rooms ? buildRows(t, rooms, states, deviceTableNames) : [])` (055; wcześniej `fromCache` i sam `device.state`); wspólne z przepisem 21 (dodany w commicie `5a50186`) |

   Oraz `desktop/shared/tableDetailsClose.js` (057, kopiuj bez zmian): `TABLE_SCREENS = [GroupComponent, HubFailures]`, `returnsToTable(state)` = trasa tuż pod bieżącą w `state.routes` jest jedną z nich.

2. **Trasa (jedyna zmiana w rejestrze tras, wyjątek od zasady niezmieniania plików wspólnych):** `component={GroupScreen.GroupScreen}` → `component={DeviceTableRoute2.DeviceTableRoute}` i `require("../desktop/deviceTable/DeviceTableRoute.js")`. `DeviceTableRoute` na drodze oryginalnej renderuje `<GroupScreen {...props} />`, więc telefon i wąskie okno działają jak dawniej.
3. **„Esc” w szczegółach → tabela:** `DeviceTableScreen` rejestruje (w `useEffect`, capture na `window`) nasłuch, który przy `Escape`, gdy tabela **nie** ma fokusu, a bieżąca trasa to `DeviceDashboard` bezpośrednio nad `GroupComponent`, robi `preventDefault`, `stopImmediatePropagation` i `navigation.goBack()`.
3a. **X i `Esc` w szczegółach → tabela (057), `screens/DeviceDashboardScreen.js`:** `require` `DesktopEditor`, `useCloseModalStack`, `tableDetailsClose`; za `var isLoading = …`: `desktopPath = useRef(isDesktopEditor()).current`, `navigation = useNavigation()`, `closeModalStack = useCloseModalStack()`, `closeHandler = desktopPath ? () => returnsToTable(navigation.getState()) ? navigation.goBack() : closeModalStack() : undefined`; w obiekcie właściwości strony za `resetScrollOnFocus: true` dopisz `closeHandler: closeHandler`. Na drodze oryginalnej `undefined`, czyli zachowanie Satel. Kod przed i po: wpis 057.
4. **Panel boczny (025)**, w `useHubSettingsMenu`: `items: [{…zużycie energii…}, …]` → `items: [].concat(DesktopEditor.isDesktopEditor() ? [pozycja] : [], [{…}, …])`, gdzie pozycja:
   ```js
   { hasPermission: permissionGuard.None === ResourceAccess.Full, title: r("device_table.menu"), leftIcon: "home-wifi",
     screen: ScreenName.GroupComponent,
     onPress: () => callback(ScreenName.GroupComponent, { id: null, name: r("all"), icon: "home-wifi", forceTable: true }) }
   ```
   (`hasPermission` skopiowane z sąsiedniej pozycji; nie wpływa na wyświetlanie.)
5. **Zasady bezpieczeństwa kodu** (sprawdzane `grep`em po `desktop/deviceTable/`): brak `hub.control`, `.Send(`, `Command*` (poza enumem ustawień), `DeviceControlCard`, `DevicesControlWidget`, `renderWidget`, `HeaderActionContainer`, `executeCommand`. Dozwolone tylko czytanie przez `fromCache`.
6. **i18n:** w `pl.js` i `en.js` nowy blok najwyższego poziomu `device_table`, wstawiony przed `automation: {`:

| Klucz | pl | en |
|---|---|---|
| `menu` | Lista urządzeń (061; wcześniej Lista obiektów) | Device list (061; wcześniej Object list) |
| `view_graphic` / `view_table` | Graficzny / Tabela | Graphic / Table |
| `search` | Szukaj po nazwie, pomieszczeniu lub module… (056; wcześniej „…po nazwie lub pomieszczeniu…”) | Search by name, room or module… |
| `tab_input` / `tab_output` / `tab_other` | Wejścia / Wyjścia / Pozostałe | Inputs / Outputs / Other |
| `filter_errors` / `filter_violated` / `filter_tampered` / `filter_blocked` | Z usterkami / Naruszone / Sabotaż/maskowanie / Zablokowane | With faults / Violated / Tamper/masking / Blocked |
| `all_rooms` | Wszystkie pomieszczenia | All rooms |
| `no_results` | Brak wyników | No results |
| `yes` / `on` / `off` | Tak / Włączone / Wyłączone | Yes / On / Off |
| `column_name`, `column_room`, `column_deviceType`, `column_channel` | Nazwa, Pomieszczenie, Typ, Zacisk | Name, Room, Type, Terminal |
| `column_circuit`, `column_sensitivity`, `column_reaction`, `column_countTime`, `column_count`, `column_inputState` | Obwód, Czułość, Reakcja, Czas, Liczba, Stan | Circuit, Sensitivity, Reaction, Time, Count, State |
| `column_state`, `column_outputReaction`, `column_duration` | Stan, Sposób działania, Czas działania | State, Operating mode (059; wcześniej Reaction), Duration |
| `column_signal`, `column_power`, `column_blockedText`, `column_errors` | Sygnał, Zasilanie, Blokada, Usterki | Signal, Power, Blocked, Faults |
| `column_module`, `column_inputValue` (056) | Moduł, Wartość | Module, Value |
| `filter_all_types`, `main_board` (056) | Wszystkie typy, Centrala | All types, Main board |

Ten sam blok mieści klucze przepisów 20 (`confirm_*`), 21 (`in_memory`, używany też w kolumnie Usterki), 24 (`open_room_table`) i 25 (`menu_configuration`, `menu_failures`, `menu_failures_plain`, `menu_other`, `menu_object`).

## Zależności
Przepis 08. Strona z `modalMaxWidth` wymaga dodatku do `webPageStyle` z przepisu 15 (`maxWidth: A.modalMaxWidth || "800px"`); bez niego tabela ma 800 px. Przepisy 21 i 24 korzystają z `useDeviceRows`, `clickShield`, filtra `roomId` i parametru `forceTable`.

## Sprawdzenie
1. Kafelek „WSZYSTKIE”: widok graficzny z przełącznikiem w wierszu tytułu. „Tabela”: tabela; zamknięcie i ponowne otwarcie kafelka: od razu tabela.
2. Liczby w zakładkach sumują się do liczby urządzeń (na centrali testowej autora 46 + 17 + 13 = 76), urządzenia We/Wy liczone w obu.
3. Wpisanie „lazi”: tylko urządzenia z „Łazienka”; `Enter` otwiera szczegóły; `Esc` w szczegółach wraca do tabeli, szukanie zostaje; `Esc` w tabeli czyści, drugi `Esc` zamyka.
4. Podwójny klik w wiersz: otwierają się szczegóły, a drugi klik nie dochodzi do `document` (test z nasłuchem w DevTools, bez klikania w szczegółach niczego poza strzałką wstecz).
5. Zmiana szerokości okna: zmienia się zestaw kolumn, droga zostaje.
6. Panel boczny: „Lista urządzeń” otwiera tabelę wszystkich urządzeń; kafelek „WSZYSTKIE” dalej otwiera zapamiętany widok (np. graficzny).
7. `grep -rE "hub\.control|\.Send\(|DeviceControlCard|DevicesControlWidget|renderWidget|HeaderActionContainer|executeCommand" src/renderer/app/desktop/deviceTable` nic nie zwraca.
8. Okno < 900 px: oryginalny `GroupScreen`, brak „Listy urządzeń”.
9. `npm --prefix work/working/tools test` (`test/unit/desktop/deviceTableModel.test.js`: stan ze strumienia i zapas z urządzenia, usterki z pamięci, „Centrala” i nazwa ogólna, podział wyjść po stanie na żywo, szukanie po module, chipy typów, `visibleColumns`, układy z Modułem za Pomieszczeniem, Sposób działania, `autoWidths`, `columnWidths`, `returnsToTable`).
10. Z centralą (055): kolumny Obwód, Stan, Sygnał, Zasilanie, Blokada i Usterki wypełnione; „Naruszone” przy otwartym czujniku pokazuje to wejście; „Z usterkami” pokazuje też urządzenia z awarią tylko w pamięci; „Wyjścia” mają przekaźniki i rolety; zmianę stanu widać bez ponownego otwierania.
11. Moduł i Wartość (056): „Moduł” z typem i numerem seryjnym, wejścia płyty głównej jako „Centrala”, podpowiedź z nazwą ogólną; „Wartość” w Ω; chipy typów tylko przy co najmniej dwóch typach, wybór kilku sumuje typy, „Wszystkie typy” zdejmuje wybór; kolumna pusta w całej zakładce nie jest pokazywana; `×` czyści szukanie.
12. Szczegóły (057): z tabeli obiektów X i `Esc` wracają do tabeli z zachowanym szukaniem; z kafelka na ekranie głównym X zamyka jak w oryginale.
13. Układy (059): przy każdej szerokości okna Moduł zaraz za Pomieszczeniem, w oknie < 1300 px na Wyjściach „Sposób działania”; po angielsku „Operating mode”.
14. Szerokości (060): kolumny według najdłuższego tekstu, bez skakania przy szukaniu; przeciągnięcie krawędzi nagłówka zmienia szerokość bez sortowania i zostaje po ponownym otwarciu (osobno dla zakładek), dwuklik przywraca automatyczną; przy za szerokich kolumnach przewijanie w poziomie.

## Ryzyka przy nowej wersji
- **Przypięty przełącznik** ma pozycję liczoną na sztywno (`calc(360px + (100vw - 360px) / 2 + min(400px, (100vw - 360px) / 2 - 40px) - 240px)`, `top: 68`), zależną od szerokości panelu bocznego 360 px, modala 800 px i miejsca X. Zmiana układu w 1.2.0 przesunie go na tytuł albo na X. Rozważ portal do nagłówka modala.
- Rejestr tras może się przenieść (React Navigation 7 w RN 0.86, statyczna konfiguracja tras). Szukaj miejsca, gdzie `GroupScreen` jest przypisany do `GroupComponent`.
- `hub.structure.tree` i pola `state.settings.*` pochodzą z protokołu centrali; nowe wydanie może dodać pola (warto rozważyć nowe kolumny) albo zmienić nazwy (puste komórki). Porównaj `HubDeviceState_Settings` w nowym wydaniu.
- **Źródło stanu (055):** od 1.2.0 stan urządzeń jest tylko w `deviceStatesSubject`, a nie w Realm. Jeśli nowe wydanie przeniesie stan znowu (inny strumień, inny klucz niż `GetDeviceKey(key)`, zmiana podpisu `fromCacheWithStates`), tabela pokaże puste kolumny stanu bez żadnego błędu. Po porcie sprawdź na centrali, czy Sygnał, Zasilanie i Usterki są wypełnione, i porównaj, skąd stan biorą oryginalne ekrany urządzeń.
- **Moduł (056):** numer seryjny to `device.key.uuid`; jeśli nowe wydanie zmieni klucz urządzenia albo nazwy w `DeviceGenericNameMap`, kolumna i podpowiedź się zmienią. Nowe typy urządzeń dostaną chip filtru same, z etykietą z `GetDeviceName`.
- **X w szczegółach (057):** zależy od tego, że `Page` dalej przekazuje `closeHandler` do X i `Esc`, i od kształtu stanu nawigatora (`routes`, `index`). Nowy ekran tabeli, z którego otwiera się szczegóły, dopisz do `TABLE_SCREENS`.
- `useNavigation().getState()` i `isFocused()` zależą od wersji `@react-navigation`; obsługa `Esc` w szczegółach może przestać działać, jeśli stos modali będzie inny.
- Rozbieżność z projektem: progi szerokości w kodzie (okno 1750/1300 px) różnią się od projektu (tabela 1400/950/640 px), a magazyn stanu nie trzyma podświetlenia, przewinięcia i nie rozdziela stanu per centrala (`hubIdentifier`). Przy przenoszeniu zachowaj zachowanie z kodu albo świadomie dopasuj do projektu.
- **Szerokości (060):** pomiar zakłada czcionkę Jost 12/13 px z `styles.headerCell`/`styles.cell`; zmiana czcionki w stylach bez zmiany `HEADER_FONT`/`CELL_FONT` da za wąskie lub za szerokie kolumny. Uchwyt korzysta z Pointer Events i zmiennych CSS w stylu `div`, co musi dalej przechodzić przez RNW. Nowa kolumna nie potrzebuje szerokości, wystarczy klucz w `LAYOUTS`.
- RNW 0.21: `onClick` na `View`, `nativeID` (dla `getElementById` przy przewijaniu), `position: "sticky"`/`"fixed"`, `cursor` muszą dalej trafiać do DOM. Komórki z `title` są zwykłymi `div`, więc nie zależą od RNW.
