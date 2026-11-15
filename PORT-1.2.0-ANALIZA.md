# Port na BE WAVE Soft 1.2.0: analiza

Stan na 2026-11-13. Porównanie trzech drzew w tej samej postaci (nazwany kod, ścieżki jak w `working/src`):

| Drzewo | Katalog | Jak powstało |
|---|---|---|
| baza | `work/deobfuscated/1.1.0/named` | `regenerate.sh 1.1.0` z istniejącego `1.1.0/raw` |
| nasze | `work/working/src` | baza + nasze zmiany (wpisy 001–031 z `REJESTR-ZMIAN.md`) |
| Satel | `work/deobfuscated/1.2.0/named` | `deobfuscate.sh 1.2.0`, potem `regenerate.sh 1.2.0` |

Sprawdzenie bazy: `named` 1.1.0 z nowych skryptów jest identyczne z drzewem, z którego powstało `working/src`. Pierwszy commit `working/src` (`0f14642`) różni się od niego tylko w 27 plikach, i to w samych plikach z pierwszymi naszymi zmianami. Pozostałe ok. 3950 plików jest identycznych bajt w bajt.

## a) Nasze zmiany: `named` 1.1.0 → `working/src`

- **Zmienione:** 56 plików, +749/−118 linii.
  - 34 pliki ze zmianą kodu. Każdy z nich występuje we wpisach rejestru.
  - 22 pliki z samymi komentarzami: 21 usług `renderer/app/services/*` i `main/passportDesktop.js`. Po usunięciu komentarzy (porównanie AST przez `@babel/generator`, `comments: false`) są identyczne z bazą.
  - Dodane komentarze: 174 linie. 120 z nich jest w plikach z samymi komentarzami, 54 w plikach z kodem (`main/main.js` 43, `main/realmKeyStore.js` 8, `screens/AutomationAddEditScreen.js` 2, `main/autoUpdater.js` 1).
- **Nowe:** 19 plików, 2052 linie: `main/linuxOverrides.js`, 8 plików `renderer/app/logic/Desktop*.js` (`AutomationList`, `Confirm`, `DevicePicker`, `Editor`, `NameList`, `OptionPicker`, `RoutinePanel`, `ValuePicker`) i 10 w `renderer/app/desktop/` (`deviceTable/` 6, `shared/` 4).
- **Usunięte:** brak. `renderer/MANIFEST.json`, `static/`, `preload/preload.js` i `main/entry.js` są bez zmian.

Zmiany w plikach z kodem (dodane/usunięte linie):

| Grupa | Pliki |
|---|---|
| proces główny | `main/main.js` +56/−3 (002, 004, 006, 031), `main/autoUpdater.js` +3/−28 (003), `main/realmKeyStore.js` +13/−1 (004, 005) |
| edytor rutyn | `screens/AutomationAddEditScreen.js` +89/−8, `AutomationConditionSelectTriggerScreen.js` +40/−5, `AutomationActionSelectTriggerScreen.js` +37/−6, `AutomationConditionSetScreen.js` +16/−9, `AutomationActionSetScreen.js` +16/−9, `logic/NavigateToSelectAutomationIcon.js` +39/−2, `components/InteractiveCard.js` +20/−0, `logic/ConditionDevices.js` +11, `logic/ConditionButtons.js` +11, `components/AutomationList.js` +6/−2, `components/ActionCardDescription.js` +5/−1, `logic/InfoCard.js` +5/−2, `logic/AutomationConditionValueInput.js` +2/−1, `logic/AutomationActionValueInput.js` +2/−1, `components/AutomationConditionInteractiveCard.js` +2/−1 (009–023) |
| wspólne ekrany (013, 017) | `screens/webPageStyle.js` +6/−4, `hooks/useEscapeHandler.js` +2/−2, `screens/PageHeader.js` +1/−1 |
| tabela obiektów, panel boczny, awarie, dziennik, pomieszczenia | `hooks/useHubSettingsMenu.js` +16/−2, `components/HubChildTile.js` +16/−2, `screens/EventLogListScreen.js` +21/−2, `screens/RoomDashboardScreen.js` +12/−1, `screens/HubFailuresScreen.js` +5/−2, `components/unnamed/module_843.js` +3/−1, `misc/module_2541.js` +2/−1 (024–030) |
| potwierdzenia sterowania (026) | `logic/CommandOnOffSwitch.js` +5, `components/CommandSwitchController.js` +4, `components/HeaderActionContainer.js` +4 |
| TSH Soft (001) | `screens/KeypadSettingsScreen.js` +1/−21 |
| tłumaczenia | `i18n/pl.js` +79, `i18n/en.js` +79 |

**Wniosek dla metody scalania:** poza wpisami rejestru są tylko komentarze. Nie ma zmian nazw ani struktury. Ścieżki i nazwy plików są takie, jak generuje `regenerate.sh`. Dzięki temu 3-way merge pliku po pliku ma wspólną bazę (`named` 1.1.0) i przenosi także komentarze. Zastrzeżenie: nie porównywałem każdej linii z każdym wpisem rejestru. Sprawdziłem tylko, że każdy plik z kodem występuje w rejestrze, a pliki z komentarzami nie mają zmian w kodzie.

## b) Zmiany Satel: `named` 1.1.0 → `named` 1.2.0

### Kod aplikacji (`renderer/app`)

Liczby po dopasowaniu modułów i przeniesieniu nazw zmiennych. Pierwsza linia pliku (`// module N`) nie jest liczona.

| | bez zmian | zmienione | usunięte | nowe |
|---|---|---|---|---|
| app | 1142 | 420 | 20 | 109 |
| lib (dla porządku) | 245 | 1954 | 189 | 93 |

Biblioteki zmieniły się prawie w całości: React 19, react-native-web 0.21, reanimated 4 i inne. Nie analizowałem ich dalej.

- **Usunięte moduły app (20):** `logic/Tooltip.js` i `services/HubEventsService.js` mają następców, opisanych niżej, a ich ścieżki zostały zachowane. Pozostałe to drobne moduły (`misc/module_*`, `logic/serializeHubsAsync`, `logic/getCoordinates`, `logic/DraggableItem`, `logic/HubContextHooksPublisher`, `components/getModalOpts`, `logic/styles.3040`).
- **Nowe moduły app (109), najważniejsze:** integracja zamków Tedee (`screens/TedeeScreen`, `screens/TedeeBridgeScreen`, `logic/TedeeFormSection`, `logic/MapTedeeProbeResult`), licencje huba (`services/HubLicenseService`, `screens/HubLicenseScreen`), ekrany integracji (`logic/IntegrationsScreen`, `screens/CamerasScreen`, `logic/IpZoneDevicesScreen`, `logic/VirtualDevicesScreen`), akcja „żądanie HTTP” w rutynach (`components/AutomationActionHttpRequestForm`, `logic/httpRequestValidator`, `logic/parseHttpRequestTrigger`), kamery (`services/CameraRetryProvider`, `services/CameraSnapshotFallbackProvider`, `services/CameraVisibilityProvider`), skróty (`services/ShortcutsService`), dziennik zdarzeń (`hooks/useEventLogQuery`, `components/EventLogDateSection`), wskaźnik LED (`components/LedIndicatorTypeForm`), `services/AppRealmProvider` (nowy `@realm/react`) i `logic/registerRendererCrashLogging`.
- **Pliki, których dotykamy:** zestawienie w tabeli w punkcie c). 23 z 56 są bez zmian. Najwięcej zmian Satel jest w `screens/EventLogListScreen.js` (204 linie, ekran przepisany), `services/HubEventsService.js` (184, przepisany, nowe eksporty `MaxGetEventFileRetryCount`, `GetEventFileRetryDelay`), `i18n/pl.js` (409) i `i18n/en.js` (391), `services/HubAuthService.js` (79), `services/RetryService.js` (74), `screens/AutomationConditionSetScreen.js` (49), `components/AutomationList.js` (47), `screens/AutomationActionSetScreen.js` (43, przepisany) i `screens/webPageStyle.js` (43).
- **Zależności naszych nowych plików:** wszystkie ścieżki z `require` istnieją w drzewie 1.2.0. Zmieniły się jednak moduły, których używają: `enums/ExpanderInputType.js` (protobuf, 4629 linii różnicy), `logic/hubVirtualDevicesChangeListener.js` (276), `logic/BuildDeviceViewModel.js` (229), `logic/ShowDeviceIsArmingWarningModal.js` (69), `screens/GroupScreen.js` (66), `enums/SetRoutineState.js` (24), `logic/ResolveRoomName.js` (20), `logic/getDeviceImage.js` (19), `logic/fromCache.js` (16), `components/ThemeProvider.js` (13), `logic/ScreenName.js` (11), a z bibliotek `lodash`, `i18next` i `react-native-web` (`View`, `TextInput`, `Image`). Trzeba sprawdzić, czy używane przez nas eksporty i pola nadal istnieją. Nie sprawdzałem tego.

### Proces główny i preload (najważniejsze dla portu)

`electron.app.config`, `electron.updater` i `updater.config` są identyczne. `electron.encode` różni się tylko numerami modułów. `main/appConfig.js`, `main/autoUpdater.js`, `main/passportDesktop.js` i `main/realmKeyStore.js` są po przeniesieniu nazw identyczne z 1.1.0. Zmienił się `main/main.js` (302 linie różnicy, w raw 46 → 55 KB) i preload:

1. **Raporty awarii:** `app.setPath("crashDumps", <userData>/crashes)` i `crashReporter.start({ uploadToServer: false, compress: false, globalExtra: { appVersion, channel } })`, a do tego przełącznik `enable-features=DocumentPolicyIncludeJSCallStacksInCrashReports`. Protokół `app://` dodaje do plików `.html` nagłówek `Document-Policy: include-js-call-stacks-in-crash-reports`. Działa na wszystkich platformach. Nic nie wysyła, bo `uploadToServer: false`.
2. **Ekran powitalny:** okno 500×500 bez ramki (`sandbox: true`, `contextIsolation: true`) z `splash.jpg` z `process.resourcesPath` (w trybie dev z `../src/assets/desktop/splash.jpg`) i numerem wersji. Okno główne pokazuje się po `did-finish-load`, ale nie wcześniej niż 2 s po splashu. Splash zamyka się najpóźniej po 60 s. **Dla portu:** `splash.jpg` jest nowym plikiem w `win-build/BE WAVE Soft/resources/`. Skrypty budowania Linux i macOS muszą go skopiować do `resources`, bo inaczej będzie tylko ostrzeżenie w logu i brak splasha. Ścieżka dev `../src/assets/desktop/` w `dist/src` nie istnieje w 1.1.0 ani w 1.2.0.
3. **Ikona okna zależna od motywu:** tylko `process.platform === "win32"` (`reg query ... SystemUsesLightTheme`, `.ico`). Na Linuksie i macOS nic nie robi. `windowStateKeeper.manage` przeniesione do pierwszego pokazania okna.
4. **Odzyskiwanie renderera:** zamiast `webContents.reload()` jest `loadURL(rendererUrl)` w `setTimeout(0)`, z blokadą powtórzeń. Przy „unresponsive” przeładowanie następuje dopiero po 20 s, chyba że wróci „responsive”. Do logu trafia stos JS (`mainFrame.collectJavaScriptCallStack()`, Electron 44). Uwaga dla wpisu 031: `loadURL(rendererUrl)` zakłada, że `rendererUrl` jest ustawiony, a nasza poprawka dla macOS zachowuje go po zamknięciu okna.
5. **`dialog:saveFile`:** okno modalne względem `mainWindow`, filtr z rozszerzenia podanej nazwy i dopisanie rozszerzenia, gdy użytkownik je usunie.
6. **Nowe IPC:** `clipboard:write-text`, `clipboard:write-image` (przez `ClipboardItem` i `Blob` PNG) oraz `open-external` z listą dozwolonych schematów `https?:`, `mailto:`, `ms-settings:`, `x-apple.systempreferences:`.
7. **Preload:** używa już tylko `ipcRenderer`. `clipboard`, `nativeImage` i `shell.openExternal` przeszły do procesu głównego, więc preload działa w sandboxie. Lista metod `window.electronAPI` jest taka sama. Zmieniła się tylko implementacja `openExternal`, `writeClipboardText` i `writeClipboardImage` (teraz zwracają Promise, a renderer w `ShareService` robi `await`).
8. Nowe pobrania z `electron`: `crashReporter`, `nativeTheme`, `clipboard`, `ClipboardItem`, `nativeImage`, `child_process.execFile`. Nowy helper `@babel/runtime/helpers/slicedToArray` w main.
9. Bez zmian w miejscach naszych poprawek: `open-resource` (.exe, 002), Wi-Fi przez `netsh` (006, w 1.2.0 te same handlery), klucz Realm (004, 005), `window-all-closed` (031), aktualizacje (003). Potwierdza to dry merge: w tych miejscach nie ma konfliktów.

Electron 41.6.1 → 44.9.3. Wersje modułów natywnych bez zmian (podane w zadaniu, nie sprawdzałem).

## c) Mapowanie ścieżek plików, których dotykamy

Dopasowanie po treści (`tools/match-modules.mjs`, wynik w `deobfuscated/1.2.0/module-matches.json`). Ścieżka 1.2.0 jest wszędzie taka sama jak w 1.1.0, bo dopasowania zapisano w `tools/versions/1.2.0/module-overrides.json`. Kolumna „Satel” to linie różnicy `named` 1.1.0 → 1.2.0, a „konfl.” to liczba konfliktów w dry merge. Proces główny dopasowuje `port-name-main.mjs` (podobieństwo plików raw 0,92–1,0).

| Plik 1.1.0 | id 1.1.0 → 1.2.0 | Ścieżka 1.2.0 | Pewność | Satel | konfl. |
|---|---|---|---|---|---|
| `main/autoUpdater.js` | 12.js → 12.js | `main/autoUpdater.js` | wysoka (1,000) | 0 | 0 |
| `main/main.js` | index.js → index.js | `main/main.js` | wysoka (0,916, nowy kod) | 302 | 2 |
| `main/passportDesktop.js` | 23.js → 23.js | `main/passportDesktop.js` | wysoka (1,000) | 0 | 0 |
| `main/realmKeyStore.js` | 9.js → 10.js | `main/realmKeyStore.js` | wysoka (1,000) | 0 | 0 |
| `renderer/app/components/ActionCardDescription.js` | 3831 → 3555 | ta sama | wysoka (podobieństwo 1,00) | 0 | 0 |
| `renderer/app/components/AutomationConditionInteractiveCard.js` | 3844 → 3568 | ta sama | wysoka (1,00) | 0 | 0 |
| `renderer/app/components/AutomationList.js` | 3806 → 3536 | ta sama | średnia (0,66) | 47 | 3 |
| `renderer/app/components/CommandSwitchController.js` | 1466 → 1451 | ta sama | wysoka (1,00) | 0 | 0 |
| `renderer/app/components/HeaderActionContainer.js` | 3018 → 2980 | ta sama | wysoka (1,00) | 0 | 0 |
| `renderer/app/components/HubChildTile.js` | 2959 → 2943 | ta sama | wysoka (0,84) | 10 | 0 |
| `renderer/app/components/InteractiveCard.js` | 1751 → 1641 | ta sama | wysoka (0,97) | 2 | 0 |
| `renderer/app/components/unnamed/module_843.js` | 843 → 1594 | ta sama | wysoka (0,99) | 10 | 0 |
| `renderer/app/hooks/useEscapeHandler.js` | 296 → 296 | ta sama | wysoka (zależność) | 0 | 0 |
| `renderer/app/hooks/useHubSettingsMenu.js` | 3398 → 3347 | ta sama | wysoka (0,90) | 15 | 0 |
| `renderer/app/i18n/en.js` | 2005 → 1841 | ta sama | wysoka (0,88) | 391 | 0 |
| `renderer/app/i18n/pl.js` | 2006 → 1842 | ta sama | średnia (0,79, nowe klucze) | 409 | 0 |
| `renderer/app/logic/AutomationActionValueInput.js` | 3882 → 3622 | ta sama | wysoka (1,00) | 0 | 0 |
| `renderer/app/logic/AutomationConditionValueInput.js` | 3887 → 3605 | ta sama | wysoka (1,00) | 0 | 0 |
| `renderer/app/logic/CommandOnOffSwitch.js` | 3024 → 2986 | ta sama | wysoka (1,00) | 0 | 0 |
| `renderer/app/logic/ConditionButtons.js` | 3870 → 3594 | ta sama | wysoka (1,00) | 0 | 0 |
| `renderer/app/logic/ConditionDevices.js` | 3869 → 3593 | ta sama | wysoka (1,00) | 0 | 0 |
| `renderer/app/logic/InfoCard.js` | 615 → 598 | ta sama | wysoka (1,00) | 0 | 0 |
| `renderer/app/logic/NavigateToSelectAutomationIcon.js` | 892 → 850 | ta sama | wysoka (0,97) | 19 | 0 |
| `renderer/app/misc/module_2541.js` | 2541 → 2494 | ta sama | wysoka (0,91) | 18 | 1 |
| `renderer/app/screens/AutomationActionSelectTriggerScreen.js` | 1773 → 3617 | ta sama | wysoka (1,00) | 0 | 0 |
| `renderer/app/screens/AutomationActionSetScreen.js` | 1774 → 3618 | ta sama | średnia (przepisany, ten sam eksport) | 43 | 1 |
| `renderer/app/screens/AutomationAddEditScreen.js` | 1750 → 3543 | ta sama | średnia (0,74) | 8 | 2 |
| `renderer/app/screens/AutomationConditionSelectTriggerScreen.js` | 1772 → 3600 | ta sama | wysoka (1,00) | 0 | 0 |
| `renderer/app/screens/AutomationConditionSetScreen.js` | 1778 → 3603 | ta sama | średnia (0,66) | 49 | 3 |
| `renderer/app/screens/EventLogListScreen.js` | 1683 → 3685 | ta sama | średnia (przepisany, ten sam eksport) | 204 | 3 |
| `renderer/app/screens/HubFailuresScreen.js` | 1789 → 3528 | ta sama | wysoka (0,93) | 23 | 2 |
| `renderer/app/screens/KeypadSettingsScreen.js` | 1810 → 3669 | ta sama | wysoka (0,90) | 33 | 0 |
| `renderer/app/screens/PageHeader.js` | 348 → 342 | ta sama | wysoka (zależność) | 0 | 0 |
| `renderer/app/screens/RoomDashboardScreen.js` | 1746 → 3852 | ta sama | wysoka (0,92) | 41 | 1 |
| `renderer/app/screens/webPageStyle.js` | 294 → 294 | ta sama | wysoka (zależność) | 43 | 2 |
| `renderer/app/services/HubAccountService.js` | 83 → 84 | ta sama | wysoka (zależność) | 0 | 0 |
| `renderer/app/services/HubAuthService.js` | 416 → 412 | ta sama | wysoka (zależność, override z 1.1.0) | 79 | 0 |
| `renderer/app/services/HubControlService.js` | 2417 → 2344 | ta sama | wysoka (1,00) | 0 | 0 |
| `renderer/app/services/HubDiagnosticService.js` | 713 → 705 | ta sama | wysoka (0,92) | 44 | 1 |
| `renderer/app/services/HubEmailService.js` | 2516 → 2446 | ta sama | wysoka (1,00) | 0 | 0 |
| `renderer/app/services/HubEventsService.js` | 2400 → 2327 | ta sama (bez override: `logic/MaxGetEventFileRetryCount.js`) | średnia (przepisany, ten sam eksport) | 184 | 2 |
| `renderer/app/services/HubInstallerDataService.js` | 2517 → 2447 | ta sama | wysoka (1,00) | 0 | 0 |
| `renderer/app/services/HubLocalFilesService.js` | 2420 → 2347 | ta sama | wysoka (0,94) | 0 | 0 |
| `renderer/app/services/HubLocationService.js` | 2422 → 2351 | ta sama | średnia (0,78) | 0 | 0 |
| `renderer/app/services/HubMeasurementService.js` | 1285 → 1275 | ta sama | wysoka (1,00) | 0 | 0 |
| `renderer/app/services/HubMonitoringService.js` | 2416 → 2343 | ta sama | wysoka (1,00) | 0 | 0 |
| `renderer/app/services/HubMqttClientService.js` | 2323 → 2244 | ta sama | wysoka (zależność) | 5 | 0 |
| `renderer/app/services/HubMqttServerService.js` | 1279 → 1268 | ta sama | wysoka (zależność) | 0 | 0 |
| `renderer/app/services/HubMqttService.js` | 2518 → 2448 | ta sama | wysoka (1,00) | 0 | 0 |
| `renderer/app/services/HubNfcService.js` | 2515 → 2445 | ta sama | wysoka (1,00) | 0 | 0 |
| `renderer/app/services/HubProtocolVersionService.js` | 201 → 105 | ta sama | wysoka (zależność) | 49 | 0 |
| `renderer/app/services/HubSceneService.js` | 2419 → 2346 | ta sama | wysoka (0,94) | 15 | 0 |
| `renderer/app/services/HubService.js` | 2106 → 1943 | ta sama | wysoka (0,99) | 9 | 0 |
| `renderer/app/services/NetworkService.js` | 289 → 208 | ta sama | wysoka (zależność) | 45 | 2 |
| `renderer/app/services/RetryService.js` | 121 → 112 | ta sama | wysoka (zależność) | 74 | 1 |
| `renderer/app/services/UdpService.js` | 290 → 290 | ta sama | wysoka (zależność) | 22 | 0 |

Objaśnienie pewności: „wysoka (1,00)” oznacza ten sam kod, różniący się tylko literami zmiennych. „Zależność” oznacza, że moduł jest zależnością już dopasowanego modułu, na tej samej pozycji `require` i z podobieństwem ≥ 0,5. „Przepisany, ten sam eksport” oznacza podobieństwo < 0,5, ale ten sam unikalny `exports.<Nazwa>`. Takie pliki trzeba sprawdzić ręcznie. Nie znaleziono: żadnego.

Nasze nowe pliki (19) nie mają odpowiednika w 1.1.0, więc przechodzą bez zmian. Ścieżki ich zależności istnieją w 1.2.0 (lista zmian w punkcie b).

## d) Zalecana metoda scalania

**3-way merge pliku po pliku**: `git merge-file --diff3 working/src/<plik> deobfuscated/1.1.0/named/<plik> deobfuscated/1.2.0/named/<plik>`, a 19 nowych plików skopiować bez zmian. Uzasadnienie:

- nasze zmiany to wyłącznie wpisy rejestru i komentarze na wspólnej bazie (punkt a), więc merge przenosi jedno i drugie,
- ścieżki 1.2.0 są takie same jak w 1.1.0 (punkt c),
- `regenerate.sh 1.2.0` przenosi nazwy zmiennych z `named` 1.1.0 (`carry-names.mjs`). Bez tego kroku żaden plik app nie byłby identyczny, bo minifikator 1.2.0 zamienił litery, np. `e` z `A` prawie wszędzie. Z tym krokiem 1142 z 1562 dopasowanych plików app jest identycznych z 1.1.0,
- ręczne nanoszenie 31 wpisów wymaga szukania każdej kotwicy. Merge robi to automatycznie w 42 z 56 plików.

**Dry merge** (katalog tymczasowy, usunięty po scaleniu w `1.2.0-port.1`; powtórzenie: polecenie z punktu d dla każdego z 56 plików): 56 plików, **26 konfliktów w 14 plikach**. 42 pliki scalają się bez konfliktu, w tym `main/autoUpdater.js`, `main/realmKeyStore.js`, `i18n/pl.js`, `i18n/en.js` i `KeypadSettingsScreen.js`.

| Plik | Konfl. | Linie w konfliktach | Rodzaj |
|---|---|---|---|
| `main/main.js` | 2 | 119 | nasz komentarz obok nowego kodu Satel (splash, odzyskiwanie renderera) |
| `services/NetworkService.js` | 2 | 41 | komentarz |
| `services/HubEventsService.js` | 2 | 35 | komentarz (plik przepisany) |
| `services/HubDiagnosticService.js` | 1 | 8 | komentarz |
| `services/RetryService.js` | 1 | 8 | komentarz |
| `screens/EventLogListScreen.js` | 3 | 80 | kod: Satel usunął blok, w którym jest wpis 028 (ekran przepisany) |
| `components/AutomationList.js` | 3 | 40 | kod: wpis 022 obok zmian Satel |
| `screens/AutomationAddEditScreen.js` | 2 | 24 | kod: nasze `require` i wpisy 017, 018, 020 obok nowych linii Satel |
| `screens/AutomationConditionSetScreen.js` | 3 | 24 | kod: nowe `require` po obu stronach, `usePanelRoute` obok nowego `hubSchedulesChangeListener`, JSX `DevicePicker` (011, 015, 016) |
| `screens/webPageStyle.js` | 2 | 21 | kod: wpis 013 i 017 w liniach, w których Satel ma inną nazwę stylu (`F` → `q2`, nazwa nieprzeniesiona) |
| `screens/HubFailuresScreen.js` | 2 | 13 | kod: wpis 027 obok zmian Satel |
| `misc/module_2541.js` | 1 | 13 | kod: nasze `require` trasy tabeli (024) obok nowych tras Satel (Tedee, licencje, integracje): zostawić oba |
| `screens/AutomationActionSetScreen.js` | 1 | 11 | kod: nowe `require` po obu stronach |
| `screens/RoomDashboardScreen.js` | 1 | 11 | kod: nasze `require` (030) obok nowych |

Szacunek: 8 konfliktów komentarzowych rozwiązuje się od ręki (zostawić kod Satel, dopisać komentarz). Ok. 10 to sąsiednie dopisane linie (`require`), gdzie trzeba zostawić obie strony. Pracy wymagają `EventLogListScreen.js` (028 od nowa na przepisanym ekranie), `AutomationList.js` (022), `AutomationConditionSetScreen.js` i `AutomationActionSetScreen.js` (przepisany), `webPageStyle.js` i `HubFailuresScreen.js`. Merge bez konfliktu nie gwarantuje poprawności: po scaleniu trzeba zbudować aplikację i przejść „Sprawdzenie” każdego wpisu. Nasze nowe pliki korzystają z modułów zmienionych w 1.2.0 (punkt b), a renderer działa na React 19 i react-native-web 0.21.

Dodatkowo, poza merge:

- skopiować `splash.jpg` do `resources` w buildach Linux i macOS (punkt b2),
- zaktualizować Electron do 44.9.3 w skryptach budowania i `work/working/app`,
- nowe IPC schowka działają przez `ClipboardItem` w procesie głównym. Trzeba to sprawdzić na Linuksie (X11/Wayland) i macOS, bo wcześniej preload używał `clipboard.writeImage`.

## Jak powtórzyć

```sh
cd work/working/tools
./deobfuscate.sh 1.2.0          # raw, ok. 1,5 min
./regenerate.sh 1.1.0           # baza, potrzebna do carry-names
./regenerate.sh 1.2.0           # named 1.2.0 (z versions/1.2.0/*)
```

Konfiguracja 1.2.0: `tools/versions/1.2.0/module-overrides.json` (1854 wpisy, z `match-modules.mjs`), `name-main.json` (z `port-name-main.mjs`, wszystkie nazwy przeniesione, bez `WARN`) i `version.json` (`namesFrom: 1.1.0`).
