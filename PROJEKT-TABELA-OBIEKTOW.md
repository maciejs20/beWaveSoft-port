# Projekt: tabela obiektów na desktop

Stan: zaakceptowane i wdrożone (`REJESTR-ZMIAN.md`, wpis 024). Decyzje: czujki bezprzewodowe w „Pozostałe”, kafelki pomieszczeń bez tabeli, szczegóły bez potwierdzenia, `Esc` w szczegółach wraca do tabeli, domyślnie widok graficzny. Dotyczy sekcji 10 w `WYMAGANIA.md`.

Oznaczenia: **[F]** to fakt potwierdzony w kodzie, **[P]** to podejrzenie do sprawdzenia, **[D]** to decyzja projektowa. Analiza jest wyłącznie statyczna, aplikacji i centrali nie uruchamiano. Ścieżki są względem `work/working/src/renderer/app`, chyba że podano inaczej.

## Najważniejsze ustalenia

1. **[F] Klik w nazwę karty tylko otwiera szczegóły, ale obok niej jest przełącznik bez potwierdzenia.** Nad listą są też przyciski sterujące całą grupą.
2. **[F] Szczegóły urządzenia też sterują.** Cały wiersz „Włącz/wyłącz” jest przyciskiem i działa od razu. `readonly: true` go nie ukrywa.
3. **[D] Największe ryzyko to podwójny klik w wiersz tabeli.** Drugi klik mógłby trafić w taki przełącznik w otwartych szczegółach. Projekt wprowadza okno ochronne 600 ms.
4. **[F] Żadna kolumna nie wymaga dodatkowych żądań do centrali.** Koszt dla 76 urządzeń to 0 żądań.
5. **[F] `Esc` w szczegółach wraca od razu na ekran główny, z pominięciem tabeli.** Stan tabeli musi więc żyć poza ekranem.

## 1. Otwieranie i przełączanie widoku

**[F] Dziś:**
- Kafelek grupy, także „Wszystkie” (`id: null`), otwiera trasę `GroupComponent` (`components/HubGroupList.js:59-65`).
- Trasa jest zarejestrowana w `misc/module_2541.js:344` i pokazuje `GroupScreen`.
- Rozmiar okna jest ograniczony do 800 px (`screens/GroupScreen.js:370`).

**[D] Projekt, z jednym miejscem zmiany w starym kodzie:**
- W `misc/module_2541.js:344` `component={GroupScreen.GroupScreen}` zmienia się na nowy `DeviceTableRoute`. Nowa trasa, zmiana `ScreenName` ani zmiana `GroupScreen.js` nie są potrzebne.
- `DeviceTableRoute` przy otwarciu wybiera drogę warunkiem `useDesktopEditor()`: `isWeb` i `window.innerWidth >= 900`. Zmiana rozmiaru nie przełącza drogi (reguła 8 z `PROJEKT-RUTYNY.md`). Na drodze starej renderuje wyłącznie `GroupScreen`.
- Hook `useDesktopEditor()` jeszcze nie istnieje w kodzie **[F]**. Powstaje w etapie 0 tego projektu albo przychodzi z edytora rutyn, jeśli ten będzie pierwszy.
- Na desktopie przełącznik `[Graficzny | Tabela]` jest w nagłówku tabeli. W widoku graficznym to samo pole jest przypięte w prawym górnym rogu okna, poza modalem 800 px, przez portal do `document.body`.
- Domyślny jest widok graficzny, więc nic się nie zmienia, dopóki użytkownik nie wybierze tabeli. Wybór jest zapamiętany w `localStorage` (w `try/catch`). Od tej chwili kafelek „Wszystkie” otwiera od razu tabelę.
- Kafelek konkretnej grupy otwiera tabelę z etykietą `Grupa: X ×`, a filtr działa jak dziś: `category` (`logic/hubVirtualDevicesChangeListenerCallback.js:270`).

**[P]**
- `components/getModalOpts.js:201` też rejestruje `GroupComponent`. Aktywna wydaje się `misc/module_2541.js` (ładowana z `components/unnamed/module_2526.js:30`), do potwierdzenia w etapie 0.
- Przypięty przełącznik może mieć problem z warstwami nad modalem. To też etap 0.
- Trasa pomieszczeń (`RoomDashboardScreen`) zostaje bez tabeli, tam służy filtr pomieszczenia. Pytanie 2 na końcu.

## 2. Podział na wejścia i wyjścia

**[F] `category` i `modeOfOperation` nie dzielą poprawnie.** `getDeviceOperationMode` daje `INPUT_OUTPUT` wszystkim ekspanderom, także `INT_E` (`logic/DiscoveredDevice.js:227-233`), więc nie rozróżnia kanałów.

**[F] Metadane z `GetSceneTriggers` definiują podział, ale każda reguła inaczej:**

| Grupa | Reguła | Dowód |
|---|---|---|
| Wejścia | `IsExpanderInput(type, Number(key.uuidChannel))` | `logic/GetSceneTriggers.js:301-303`, `logic/ResolveRoomName.js:41-61` |
| Wyjścia | `state.settings.options` zawiera `SET_ON_OFF` | `logic/GetSceneTriggers.js:474`, `:851-855` |

**[D] Model (czysta funkcja `classifyDevice`):**
- **Wejście:** jak w tabeli wyżej.
- **Wyjście:** `SET_ON_OFF` albo `SET_OPEN_CLOSE`. Reguła rozszerza listę 17 kandydatów o drugą komendę sterującą.
- **Obie reguły naraz:** urządzenie jest na obu zakładkach, z oznaczeniem `We/Wy`.
- **Żadna reguła:** zakładka **Pozostałe** (piloty, klawiatury, czujki bezprzewodowe, termostaty). Nic nie znika po cichu.
- **Niezmiennik testowany:** suma unikalnych kluczy z trzech zakładek jest równa liczbie urządzeń, czyli 76.

**[P] Do sprawdzenia na danych:**
- Podział 46 + 17 + 13 to tylko arytmetyka i zakłada brak części wspólnej.
- `IsExpanderInput` zwraca `true` dla kanału `TMP` w `INT_E` (9) i `INT_PP` (17), a `GetChannelName` nazywa je `TMP` (`logic/BuildDeviceViewModel.js:187-192`). Kanał TMP może więc być wśród 46. `INT_O`/`INT_ORS` z kanałem TMP trafia do Pozostałych.
- Kanał `0` lub pusty też przechodzi jako wejście (`isNil(e) || e <= 4`).
- Czujki bezprzewodowe (np. `AXD_200`) nie są „wejściem” dla `INPUT_STATE`. Pytanie 1 na końcu.

## 3. Kolumny

**[F] Wszystkie dane przychodzą z tego samego rekordu urządzenia.** Ekran szczegółów też tylko go czyta (`screens/DeviceDashboardScreen.js:78`), bez osobnych żądań.

**Wspólne** (`S` = `state.settings`):

| Kolumna | Rodzaj | Źródło | Format lub dowód |
|---|---|---|---|
| Nazwa | Konfiguracja | `name` | - |
| Pomieszczenie | Konfiguracja | pokój z drzewa | `ResolveRoomName(t, room)`, `logic/ResolveRoomName.js:13-19` |
| Typ urządzenia | Konfiguracja | `type` | `GetDeviceName`, `logic/ShowDeviceIsArmingWarningModal.js:98`, użyte w `misc/module_3542.js` |
| Zacisk | Konfiguracja | `type`, `key.uuidChannel` | `GetChannelName`, `logic/BuildDeviceViewModel.js:177`; tylko gdy kanał > 0 (`misc/module_3542.js`) |
| Nr systemowy | Konfiguracja | `orderNumber` | `padStart(3, "0")`, `misc/module_3542.js` |
| Nr seryjny | Konfiguracja | `key.uuid` | `logic/GetDeviceTileDataFromHubDiscoveredDevice.js:16` |
| Sygnał | Na żywo | `S.signal` | `Signal` / `SignalExpanders`, `components/DeviceCommonSharedDetails.js:39` |
| Napięcie / bateria | Na żywo | `S.voltageSupply`, `S.battery` | `PowerSupply`, `components/DeviceCommonSharedDetails.js:44` |
| Zablokowane | Na żywo | `S.blockUnblock` | `isDeviceBlocked`, `logic/StructureContainer.js:254` |
| Usterki | Na żywo | `state.errorCodes`, `errorCodesMemory` | klucz `common.options.device.error-codes.values.*`, `components/DeviceCommonSharedDetails.js:83-84` |

**[F] Pułapka:** `GetDeviceStatus` zwraca „Naruszenie” dla każdego innego przypadku, także dla pustej listy (`enums/GetDeviceStatus.js:8-27`). Kolumna Usterki nie może jej używać.

**Wejścia:**

| Kolumna | Rodzaj | Źródło | Format lub dowód |
|---|---|---|---|
| Typ obwodu | Konfiguracja | `S.inputType` | `common.options.device.expander-input-type.values.*` (`components/HasAnyDeviceSettingCapability.js:62-81`, `i18n/pl.js:507`) |
| Czułość | Konfiguracja | `S.inputSensitivity` | `${v} ms` (`components/HasAnyDeviceSettingCapability.js:83-110`) |
| Reakcja | Konfiguracja | `inputReactionType` | wariant `_sabotage` dla TMP, `components/DeviceCommonDetails.js:129-133` |
| Czas liczenia | Konfiguracja | `S.blindSensorImpulsesTime` | `components/HasAnyDeviceSettingCapability.js:235-241`, domyślnie 30 (`components/CommandControlFactory.js:440`); tylko przy tej zdolności w `options` |
| Liczba naruszeń | Konfiguracja | `S.blindSensorImpulsesCount` | domyślnie 3 (`components/CommandControlFactory.js:432`); tylko przy tej zdolności |
| Stan wejścia | Na żywo | `S.inputState`, `S.violation` | `widgets.expander.input-state-values.*` (`components/ExpanderWidget.js:31-40`, `i18n/pl.js:2345`) |
| Wartość | Na żywo | `S.inputValue` | `MeasurementValue` w Ω, `components/DeviceCommonDetails.js:121-126` |

**[F] „Liczba naruszeń” ze szczegółów to `blindSensorImpulsesCount`**, a nie `violationCounter`. To drugie pole jest w protokole, ale żaden ekran go nie używa (`logic/HubMapping.js:1623`).

**Wyjścia:**

| Kolumna | Rodzaj | Źródło | Format lub dowód |
|---|---|---|---|
| Stan | Na żywo | `S.onOff` / `S.openClose` | tekst „Włączone”/„Wyłączone” z kropką, **bez kontrolki wyglądającej jak przełącznik** |
| Kanał aktywny | Na żywo | `S.isChannelActive` | `services/HubDiagnosticService.js:89` |
| Sposób działania | Konfiguracja | `outputReactionType` | `components/DeviceCommonDetails.js:136-141`, `i18n/pl.js:433` |
| Czas działania | Konfiguracja | `S.durationTime` | `Convert_Milliseconds_To_HHMMSS`, `components/CommandControlFactory.js:405` |
| Tryb pracy | Konfiguracja | `modeOfWork` | `GetModeOfWorkValue`, `components/DeviceCommonDetails.js:85-89` |
| Typ (przycisku) | Konfiguracja | `typeOfButton` | `components/DeviceCommonDetails.js:99-103`, `i18n/pl.js:400` |
| Rodzaj przycisku | Konfiguracja | `modeOfControl` | `components/DeviceCommonDetails.js:105-109`, `i18n/pl.js:418` |

**[F] Etykiety są mylące:** „Typ” w szczegółach to `typeOfButton`, a „Rodzaj przycisku” to `modeOfControl`. Pole `type` to typ urządzenia.

**Pozostałe:** kolumny wspólne plus `Naruszenie` (`S.violation`).

**Uprawnienia [F]:** szczegóły konfiguracji i ustawienia wejść są widoczne tylko przy `DeviceConfiguration = Full` (`screens/DeviceDashboardScreen.js:86`, `logic/DeviceCommandsForAccount.js:115-127`). **[D]** Bez tego uprawnienia tabela nie pokazuje kolumn konfiguracyjnych. Zakres urządzeń ogranicza już `getHubWithAccessGuard` wewnątrz `fromCache` (`logic/fromCache.js`, funkcja `d`).

### Aktualizacje na żywo

**[F] Ścieżka danych:**
1. Synchronizacja zapisuje dane i `timestamp` centrali (`logic/AppSync.js:191`).
2. `HubContextHooksPublisher` obserwuje magazyn i publikuje po zmianie `timestamp` (`logic/HubContextHooksPublisher.js:114-120`).
3. `fromCache` subskrybuje i przelicza, a stan ustawia tylko przy `!isEqual` (`logic/fromCache.js:31-34`).

**[P]** Nie prześledzono, co dokładnie wyzwala `requestSync` przy zmianie stanu urządzenia. Tabela ma to samo opóźnienie co karty, bo korzysta z tego samego źródła.

**[D]** Nowy jeden słuchacz `fromCache("DeviceTable()", …)` buduje wiersze i zachowuje referencje niezmienionych wierszy, żeby `React.memo` wiersza działał. Nie używamy `hubAllDeviceChangeListener`, bo dla każdego urządzenia liczy też listę czujników temperatury (`logic/hubVirtualDevicesChangeListenerCallback.js:485-498`). Nie używamy też 76 osobnych słuchaczy, jak robią karty (`components/DeviceControlCard.js:29`).

### Koszt żądań

**[F] 0 dodatkowych żądań** na 76 urządzeń, dla wszystkich kolumn powyżej. Nie ma kolumny niemożliwej do wypełnienia bez żądań. Gdyby taka doszła, koszt to 76 kolejnych wywołań przy każdym odświeżeniu, nie mierzony. **[D]** Takiej kolumny nie dodajemy.

## 4. Bezpieczeństwo

### Co dziś robi klik

| Miejsce | Działanie | Dowód |
|---|---|---|
| Nazwa na karcie | Tylko przejście do szczegółów | `logic/DeviceControlCardHeader.js:74-78` |
| Przełącznik obok nazwy | **Od razu** `OnOff(!y).Send`, bez potwierdzenia | `logic/DeviceControlCardHeader.js` (`CommandOnOffSwitch`), `logic/CommandOnOffSwitch.js:31-36` |
| Przyciski nad listą grupy | **Sterowanie wszystkimi urządzeniami w grupie** jednym kliknięciem | `screens/GroupScreen.js:350`, `components/HeaderActionContainer.js:69-80` |
| Widżety w szczegółach | Sterowanie (światło, roleta, termostat) | `screens/DeviceDashboardScreen.js:119`, `components/renderWidget.js:33-42` |
| Wiersz „Włącz/wyłącz” w szczegółach | **Cały wiersz działa od razu**, bez potwierdzenia, dla każdego użytkownika | `components/CommandSwitchController.js:54-67`, `components/CommandControlFactory.js:116-119`, `logic/DeviceCommandsForAccount.js:9,13-14` |
| Alarm optyczny i akustyczny w szczegółach | Tak samo, za uprawnieniem konfiguracji | `components/CommandControlFactory.js:124-142` |

**[F]**
- `readonly: true` ukrywa tylko dane środowiskowe i przyciski akcji, a ustawień i widżetu nie (`screens/DeviceDashboardScreen.js:119,125,129-132`). Nie jest więc zabezpieczeniem.
- `module_2989` woła `goBack()` przed `navigate` (`components/unnamed/module_2989.js:126-130`). Tego nie kopiujemy.
- Klucz trzeba przekazać cały: `DeviceKeyEqual` porównuje `uuid` i `uuidChannel` (`logic/GetDeviceKey.js:9-10`). Inaczej otworzy się inny kanał.

**[P]** Nie przeczytano całego `executeCommand` w `logic/getDevicesCapabilities.js`. W `HeaderActionContainer` nie ma potwierdzenia, a wstępne wyszukanie w `executeCommand` też go nie pokazało.

### Reguły tabeli (obowiązkowe)

1. **Tabela nie ma żadnych działań sterujących w pierwszej wersji.** Ani przełączników, ani przycisków grupowych, ani menu kontekstowego. Także później nie bez osobnej decyzji.
2. **Jedyna funkcja wiersza:** `navigate(DeviceDashboard, { key: row.key })`. Jest jedna, nazwana `openDetails`, i tylko ją wołają klik i `Enter`.
3. **Zakaz importów w nowych plikach:** `hub.control`, `useService`, `Command*`, `DevicesControlWidget`, `DeviceControlCard`, `renderWidget`, `HeaderActionContainer`, `executeCommand`, `.Send(`. Sprawdza to skrypt w planie weryfikacji. Dozwolone jest wyłącznie czytanie przez `fromCache`.
4. **Okno ochronne po otwarciu szczegółów, 600 ms:** nasłuch w fazie capture na `window` blokuje `pointerdown`, `pointerup`, `mousedown`, `mouseup`, `click`, `keydown`, `keyup`. Bez tego drugi klik podwójnego kliknięcia trafia w szczegóły, bo modal pojawia się natychmiast (`animationEnabled: false`, `components/getModalOpts.js:147`), a `onClick` uruchamia `onPress` (`lib/react-native-web/dist/modules/usePressEvents/PressResponder.js:202`). Szczegółów przy tym nie zmieniamy.
5. **`Enter` otwiera tylko przy `!event.repeat`.** `Spacja` w wierszu nie robi nic.
6. **Bez reakcji poza fokusem.** Poprzedni ekran zostaje w DOM (`detachPreviousScreen: false`, `components/getModalOpts.js:149`). Wszystkie skróty tabeli działają przez `useFocusEffect`, więc klawisze w szczegółach nie trafiają do ukrytej tabeli.
7. **Wiersz to zwykły element z `onClick`**, a nie `PressableOpacity`. Reaguje tylko na lewy przycisk i nie otwiera przy zaznaczonym tekście, żeby dało się skopiować numer seryjny.

**[P] Do sprawdzenia:** po otwarciu szczegółów `useAutoFocusFirst` ustawia fokus na pierwszym elemencie (`hooks/useAutoFocusFirst.js:13-19`, `screens/webPageStyle.js:142`). Powinna to być strzałka wstecz (`screens/PageHeader.js:31`), ale musi to potwierdzić test. `PressResponder` aktywuje dowolny element na `Enter` (`PressResponder.js:64-67,152-167`).

**[F] Ryzyko, które zostaje:** szczegóły nadal sterują jednym kliknięciem, tak jak dziś. Pytanie 3 na końcu.

## 5. Klik w wiersz i powrót

**[D] Wiersz otwiera dzisiejszy `DeviceDashboard`, bez zmian.**
- Są tam ustawienia wejścia (`components/CommandControlFactory.js:388-422`) i dalsza edycja (`components/DeviceBaseActions.js:223`), czyli to, czego wymaga „kliknięcie przechodzi do edycji”.
- Bez `readonly`, bo to ukryłoby akcje.
- Nowy ekran bezpiecznych szczegółów byłby dublowaniem. Okno ochronne usuwa ryzyko przypadkowego drugiego kliknięcia.

**Stan po powrocie:**

| Sposób powrotu | Co się dzieje | Stan |
|---|---|---|
| Strzałka wstecz | **[F]** Tabela zostaje zamontowana (`components/getModalOpts.js:149`) | Zachowany |
| `Esc` | **[F]** `closeModalStack` wraca do `HomeDashboard` (`hooks/useCloseModalStack.js`, `hooks/useEscapeHandler.js:11-15`), więc tabela jest odmontowana | **[D]** Zachowany przez magazyn modułu |

**[D]** Magazyn modułu `deviceTableStore` trzyma w pamięci: zapytanie, zakładkę, sortowanie, filtry, klucz podświetlonego wiersza i przewinięcie, osobno dla każdego `hubIdentifier`. Znika przy zamknięciu aplikacji i przy zmianie centrali.

## 6. Szukanie, klawiatura, sortowanie, filtry

### Fokus
- Tabela nie używa `useAutoFocusFirst`. Po otwarciu i po powrocie fokus jest w polu szukania, z zachowanym tekstem. Tabela sama woła `useEscapeHandler`.
- Pisanie działa od razu. Gdy fokus jest poza polem, litera przenosi fokus do pola i wpisuje się. Warunek: `event.key` to litera lub cyfra (`\p{L}|\p{N}`), bez `Ctrl` i `Cmd`, poza `<input>`/`<textarea>`, bez otwartego dialogu, ekran w fokusie. Litery z `AltGr` i `Option` przechodzą, co obsługuje „ł” na macOS i Linuksie.
- Wiersze nie dostają fokusu klawiatury. Pole ma `aria-activedescendant` i jest jedynym miejscem nawigacji, a `Tab` przechodzi do filtrów.

### Dopasowanie
- `lodash.deburr` (`lib/lodash/lodash.js:4642`) i `toLowerCase`, dla nazwy i pomieszczenia. „lazienka” znajdzie „Łazienka”.
- Zapytanie dzielone po spacjach. Każdy fragment musi pasować, np. „okno kuch”.
- Kolejność trafień: początek słowa w nazwie, początek słowa w pomieszczeniu, reszta fragmentów. Bez opóźnienia, bo 76 wierszy nie wymaga `debounce`.
- Zakładki pokazują liczbę trafień, np. `Wejścia 3 · Wyjścia 1 · Pozostałe 0`. Przy braku wyników: „Brak w tej zakładce, 1 w Wyjściach”.

### Klawisze

| Klawisz | Działanie |
|---|---|
| Litera, cyfra | Szukanie |
| `/` | Przejście do pola szukania |
| `↑` `↓`, `PgUp` `PgDn` | Ruch podświetlenia |
| `Home` `End` | Ruch podświetlenia, gdy pole jest puste. Przy tekście ruch kursora w polu |
| `Enter` | Otwarcie podświetlonego wiersza, tylko `!event.repeat`. Bez podświetlenia nic |
| `Alt+1`…`Alt+3` | Zakładki, przez `event.code` |
| `Esc` | Patrz niżej |

Pierwszy wynik jest podświetlony automatycznie. Podświetlenie idzie za kluczem urządzenia, nie za numerem wiersza, więc zostaje przy zmianach na żywo.

### `Esc` bez konfliktu

**[F]** `useEscapeHandler` to nasłuch `window` w fazie bubble, bez sprawdzania `defaultPrevented`. Zawsze zamyka stos (`hooks/useEscapeHandler.js:11-15`). Sam `preventDefault` go nie zatrzyma.

**[D]** Tabela rejestruje, w `useFocusEffect`, nasłuch `window` w fazie **capture**:
1. Jest tekst w polu: czyści tekst, `stopPropagation()`, tabela zostaje.
2. Otwarty jest rozwijany filtr: zamyka go, `stopPropagation()`.
3. W przeciwnym razie nic nie robi i `Esc` przechodzi do starego handlera, który zamyka tabelę.

Trzymany `Esc` (`event.repeat`) w kroku 1 i 2 jest tylko zatrzymywany. Czyszczenie nie przechodzi więc od razu w zamknięcie tabeli. Filtrów chipowych `Esc` nie czyści, bo są widoczne i mają „Wyczyść filtry”.

### Sortowanie
- Domyślnie: pomieszczenie, potem nazwa. `Intl.Collator("pl", { numeric: true })`, żeby `Z10` było po `Z9`.
- Klik w nagłówek zmienia kolumnę i kierunek. Przy remisie decyduje `orderNumber`.
- Sortowanie po kolumnie na żywo może przesuwać wiersze. Klik i tak tylko otwiera szczegóły, więc nie jest to groźne. Podświetlenie zostaje przy urządzeniu.

### Filtry
- `Z usterkami`: `errorCodes.length > 0`.
- `Naruszone`: `S.violation === true` albo `inputState` 1 lub 4 (`enums/ExpanderInputType.js:1314-1320`).
- `Sabotaż / maskowanie`: `inputState` 2, 3 lub 4.
- `Zablokowane`: `isDeviceBlocked`.
- Rozwijane `Pomieszczenie`.
- Filtry nie znikają same, są widoczne jako etykiety.

## 7. Układ

Wiersz 32 px, czcionka 14 px, jak w `PROJEKT-RUTYNY.md`. Nagłówek przyklejony, tak samo kolumna Nazwa przy przewijaniu poziomym. Okno tabeli ma szerokość okna minus 48 px, a nie 800 px.

Szerokość 1508 px, zakładka Wejścia (1460 px na tabelę):

```
┌ Wszystkie (76) ────────────── [Graficzny|Tabela] ────────────────────── [X] ┐
│ [Szukaj: lazi_                     ]  Wejścia 46  Wyjścia 17  Pozostałe 13  │
│ [Z usterkami] [Naruszone] [Sabotaż] [Zablokowane] [Pomieszczenie ▾]         │
├──────────────┬─────────┬─────┬───┬──────┬─────┬────────┬───┬───┬──────┬──┬─┤
│Nazwa         │Pomieszcz│Typ  │Zac│Obwód │Czuł.│Reakcja │Cz.│L. │Stan  │Sy│U│
├──────────────┼─────────┼─────┼───┼──────┼─────┼────────┼───┼───┼──────┼──┼─┤
│▌Okno Łazienka│Łazienka │INT-E│Z7 │NC    │100ms│Natychm.│ - │ - │Normal│▂▄│ │
│ Drzwi wejśc. │Hol      │INT-E│Z1 │2EOL/N│100ms│Wej/Wyj │30s│ 3 │Narus.│▂▄│!│
└──────────────┴─────────┴─────┴───┴──────┴─────┴────────┴───┴───┴──────┴──┴─┘
  Dane z centrali, 46 pozycji                  Enter otwiera · Esc czyści
```

Układ przy 1024 px (976 px na tabelę), Wyjścia:

```
┌ Wszystkie ── [Graficzny|Tabela] ──────────────────────────── [X] ┐
│ [Szukaj…               ]  Wejścia 46  Wyjścia 17  Pozostałe 13   │
├──────────────┬──────────┬─────┬────────┬────────┬───────┬───┬────┤
│Nazwa         │Pomieszcz.│Zacisk│Stan   │Sposób  │Czas   │Sygn│Ust.│
│ Oświetlenie  │Hol       │OUT1 │Wyłączone│MONO   │00:00:05│▂▄│    │
└──────────────┴──────────┴─────┴────────┴────────┴───────┴───┴────┘
```

Dane w obu szkicach są przykładowe.

| Szerokość tabeli | Wejścia | Wyjścia |
|---|---|---|
| Od 1400 px | Wszystkie: Nazwa 300, Pomieszczenie 160, Typ 80, Zacisk 56, Obwód 90, Czułość 70, Reakcja 180, Czas 70, Liczba 70, Stan 110, Sygnał 60, Napięcie 60, Blokada 60, Usterki reszta | Wszystkie |
| 950-1399 px | Nazwa 220, Pomieszczenie 130, Zacisk 52, Obwód 86, Czułość 70, Reakcja 150, Stan 100, Sygnał 60, Usterki reszta | Nazwa, Pomieszczenie, Zacisk, Stan, Sposób, Czas, Sygnał, Usterki |
| 640-949 px | Nazwa, Zacisk, Obwód, Stan, Usterki | Nazwa, Zacisk, Stan, Usterki |
| Poniżej 640 px | Przewijanie poziome przy min. 640 px | To samo |

Nr seryjny, Nr systemowy i Wartość są widoczne w etykiecie `title` wiersza oraz w szczegółach. Stałych kolumn nie ma tam, gdzie zabrałyby miejsce.

**Wąskie okna [D]:**
- Poniżej 900 px przy otwarciu: stary `GroupScreen`, bez przełącznika.
- Zmniejszenie otwartej tabeli: tabela zostaje i chowa kolumny, zgodnie z regułą 8.

**Wirtualizacja [D]: niepotrzebna.** 76 wierszy po ok. 14 komórek to ok. 1000 prostych elementów DOM, bez widżetów. Dzisiejsza strona na web też nie wirtualizuje kart (`screens/GroupScreen.js:375-388`). Wystarczy `React.memo` wiersza. Rewizja dopiero przy ponad 300 urządzeniach.

## 8. Nowe pliki

Wszystko w `src/renderer/app/desktop/deviceTable/`:

| Plik | Zawartość |
|---|---|
| `DeviceTableRoute.js` | Wybór drogi, przełącznik widoku |
| `DeviceTableScreen.js` | Ekran, klawiatura, układ |
| `deviceTableModel.js` | `classifyDevice`, budowa wierszy, szukanie, sortowanie, filtry. Czyste funkcje |
| `deviceTableStore.js` | Stan w pamięci |
| `useClickShield.js` | Okno ochronne |
| `strings.js` | Lokalne napisy, żeby nie zmieniać `i18n/pl.js` |

Jedyna zmiana w starym kodzie: `misc/module_2541.js:344`, zapisana w `REJESTR-ZMIAN.md` z kotwicą. To wyjątek od zasady niezmieniania plików wspólnych, bez niego ekranu nie da się podpiąć.

## 9. Weryfikacja bez sterowania

**Zasada:** żaden test nie klika w szczegółach niczego poza strzałką wstecz, a centrali nic nie wysyłamy. Testy z kliknięciami robimy z atrapą.

1. **Skrypt statyczny:** zakazane nazwy z reguły 3 nie występują w `desktop/deviceTable/`.
2. **Testy jednostkowe modelu na danych wzorcowych 76 urządzeń, bez centrali:**
   - Niezmiennik sumy zakładek, urządzenia w obu i w żadnej grupie.
   - `deburr`, kolejność trafień, sortowanie `Z9`/`Z10`.
   - Formatery: nieznany `inputType`, brak pól, `errorCodes` puste.
3. **Build testowy z bramką:** `transport.call` odrzuca i liczy każde wywołanie w czasie testu. Bramka jest usunięta z wydania, jak w `PROJEKT-RUTYNY.md`. Dane z atrapy stanu, urządzenie z `SET_ON_OFF` w każdym widoku. Licznik musi wynosić 0 po każdym scenariuszu:
   - Podwójny i potrójny klik w wiersz. Elementy pod kursorem w szczegółach nie dostają kliknięcia.
   - Trzymany `Enter`, `Enter` po szukaniu, `Spacja` w wierszu i w polu.
   - Klawisze w szczegółach nie ruszają tabeli pod spodem.
   - Sprawdzenie, gdzie jest fokus po otwarciu szczegółów, dla typów `INT_E`, `INT_O`, `ASW_210`, `ARSC_200`.
   - `Esc`: tekst, potem zamknięcie. Trzymany `Esc`. `Esc` w szczegółach, potem powrót ze stanem.
   - Zmiana rozmiaru okna, brak przełączenia drogi. Wąskie okno pokazuje stary ekran.
4. **Zgodność:** tekst komórek porównany z tekstem szczegółów dla każdego typu urządzenia, z atrapy.
5. **Tylko Ty, na prawdziwej centrali, tylko oglądanie:**
   - Otwarcie tabeli i porównanie liczb, także 76 urządzeń, oraz list obu podziałów.
   - Aktualizacja na żywo przez naturalną zmianę, np. ręczne otwarcie drzwi. **Bez sterowania wyjściem z aplikacji.**
   - Otwarcie szczegółów kilku urządzeń i powrót strzałką, bez klikania niczego innego.

## 10. Etapy

Każdy etap dostaje wpis w `REJESTR-ZMIAN.md` i `CHANGELOG.md`.

| Etap | Zakres | Ryzyko |
|---|---|---|
| 0. Sprawdzenia | Podejrzenia [P], aktywny rejestr tras, nakładanie przełącznika, `useDesktopEditor` | Małe |
| 1. Model | `deviceTableModel`, testy, skrypt zakazów | Małe |
| 2. Tabela tylko do oglądania | Trasa, przełącznik widoku, zakładki, kolumny, na żywo. Wiersz jeszcze nie klikalny | Małe |
| 3. Otwieranie | `openDetails`, okno ochronne, testy z bramką. **Warunek wejścia do etapu 4: licznik 0** | Średnie |
| 4. Szukanie i klawiatura | Szukanie, skróty, `Esc`, magazyn stanu | Średnie |
| 5. Sortowanie, filtry, układ | Sortowanie, filtry, progi szerokości | Małe |

## Pytania do użytkownika

1. **Czujki bezprzewodowe:** gdzie mają być? Dziś `INPUT_STATE` ich nie obejmuje, więc trafiają do Pozostałych. Propozycja: Pozostałe, bo tak mówią dane, i zmiana po zobaczeniu ich na liście.
2. **Pomieszczenia:** czy kafelek pomieszczenia też ma mieć tabelę? Propozycja: nie w pierwszej wersji, wystarczy filtr. To druga zmiana w starym kodzie.
3. **Szczegóły sterują jednym kliknięciem:** zostawiamy jak dziś, czy dodać później osobny ekran desktopowy z potwierdzeniem? Propozycja: zostawić w tym projekcie i rozważyć potwierdzenie jako osobne wymaganie.
4. **`Esc` w szczegółach:** czy ma wracać do tabeli, a nie na ekran główny? Propozycja: tak, w nowym kodzie przez nasłuch capture, tylko gdy szczegóły leżą bezpośrednio nad tabelą. Dziś wraca na ekran główny.
5. **Domyślny widok:** graficzny do pierwszego wyboru, jak w projekcie, czy od razu tabela?
