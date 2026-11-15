# Przepisy zmian (mod-recipes)

**Portowanie kolejnego wydania Satel i wszystkie stałe ustalenia: [PORTOWANIE.md](PORTOWANIE.md). Instrukcja dla agenta AI, który nanosi przepisy na nowe wydanie: [AGENT.md](AGENT.md).**

Funkcjonalna specyfikacja wszystkich naszych zmian w BE WAVE Soft firmy Satel. Wersja bazowa: oryginał **1.2.0** (Electron 44.9.3). Ostatnie wydanie portu: **1.2.0-port.2** (2026-11-14); od następnego wydania wersje mają postać `<wersja Satel>-modX.Y` (pierwsza wydana: `1.2.0-mod3.1`; `1.2.0-mod3.0` był tylko buildem testowym); w 1.2.0-mod3.1: przebudowa edytora ekranów TSH (wpisy 044–054, BETA: 062), tabela urządzeń i panel boczny (wpisy 055–061), wersja moda w aplikacji (wpis 063). Przepisy mają pozwolić odtworzyć każdą zmianę w kolejnym wydaniu Satel, także wtedy, gdy numery modułów webpacka, nazwy po minifikacji i numery wierszy będą inne.

Źródła: `REJESTR-ZMIAN.md` (wpisy 001–063, kod przed i po), `CHANGELOG.md`, `WYMAGANIA.md` (wymagania 1–15), `PROJEKT-RUTYNY.md`, `PROJEKT-TABELA-OBIEKTOW.md`, `PROJEKT-TSH.md`, `PROJEKT-TSH-EDYTOR.md`, nasze nowe moduły w `work/working/src` i historia gita (znaczniki `1.1.0-port.3`, `1.2.0-port.1`). Przepis opisuje zachowanie i sposób wdrożenia. Dokładny kod „przed i po” dla wydania 1.2.0 jest w rejestrze, a pełne pliki nowych komponentów w `work/working/src`.

**Ścieżki** (jak w nagłówku `REJESTR-ZMIAN.md`): względem `work/working/`, a skrócone (`screens/`, `logic/`, `components/`, `hooks/`, `misc/`, `i18n/`, `desktop/`) względem `work/working/src/renderer/app/`. `src/main/` to proces główny.

**Nazwy lokalne.** Nazwy w rodzaju `module43`, `module_2541.js`, `item3`, pojedyncze litery (`YA`, `e`, `r`) i nazwy z cyfrą na końcu (`PageButtonTransparentWithBorder2`) to nazwy nadane przy deobfuskacji wydania 1.2.0. W każdym wydaniu będą inne. Miejsca zmian szukaj po kluczach i18n, nazwach eksportów i literałach (sekcja „Szukanie miejsc zmian” niżej), a te nazwy traktuj tylko jako wskazówkę dla 1.2.0.

**Słowniczek:**
- **Satel:** producent systemu BE WAVE i oryginalnej aplikacji BE WAVE Soft (Electron, kod wspólny z aplikacją mobilną React Native).
- **Centrala:** centrala alarmowa i automatyki BE WAVE, z którą łączy się aplikacja (lokalnie albo zdalnie przez MQTT).
- **Droga desktopowa:** nasze nowe zachowanie interfejsu, włączane tylko przy szerokim oknie (przepis 08). **Droga oryginalna:** zachowanie Satel, bez zmian na telefonie, tablecie i w wąskim oknie.
- **TSH, TSH Soft:** klawiatury dotykowe Satel INT-TSH2 i INT-TSG2 oraz program Satel tylko dla Windows (`TSH_soft.exe`) do edycji ich ekranów (przepis 01).

## Spis przepisów

| Id | Tytuł | Kategoria | Platformy | Wpisy rejestru | Zależy od |
|---|---|---|---|---|---|
| [01](01-tsh-soft.md) | TSH Soft wyłączony, edytor ekranów na desktopie | port: renderer i proces główny; desktop: edytor ekranów | Linux, macOS | 001, 002, 035, 036, 037, 044–054, 062 | 08 (edytor), 07 (wpis 034: grafiki z `TSH_soft.exe`) |
| [02](02-aktualizacje.md) | Aktualizacje wyłączone | port: proces główny | Linux, macOS | 003 | — |
| [03](03-klucz-bazy-realm.md) | Klucz bazy Realm bez magazynu sekretów, plik `0600` | port: proces główny | Linux (004), Linux i macOS (005) | 004, 005 | — |
| [04](04-wifi-linux.md) | Wi-Fi przez `nmcli` | port: proces główny | Linux | 006 | — |
| [05](05-zamykanie-aplikacji.md) | Zamykanie aplikacji: okno X kończy program, „Zakończ” bez błędu | port: proces główny | Linux, macOS | 031, 039, 040 | — |
| [06](06-natywne-moduly-i-binaria.md) | Moduły natywne i binaria platform | port: `node_modules` | Linux, macOS | 007, 008 | — |
| [07](07-budowanie-i-instalatory.md) | Budowanie z nazwanego kodu, uruchamianie, instalatory | port: budowanie i pakiety | Linux, macOS | 032, 033, 034, 063 | 06 |
| [08](08-droga-desktopowa.md) | Przełącznik drogi desktopowej (`isDesktopEditor`) | desktop: podstawa | Linux, macOS | 009 | — |
| [09](09-kroki-warunku-i-akcji-domyslne.md) | Domyślne „Włącz” i „Stan wejścia”, bez zielonego komunikatu | desktop: edytor rutyn | Linux, macOS | 010, 011, 023 | 08 |
| [10](10-podsumowanie-warunkow-i-akcji.md) | Pełne nazwy i operator w podsumowaniu | desktop: edytor rutyn | Linux, macOS | 012 | 08 |
| [11](11-zamykanie-krokow-x-esc.md) | X i `Esc` zamykają tylko bieżący krok | desktop: edytor rutyn | Linux, macOS | 013 | 08 |
| [12](12-listy-wyzwalaczy-i-akcji.md) | Listy „Wybierz wyzwalacz” i „Wybierz akcję” | desktop: edytor rutyn | Linux, macOS | 014, 019 | 08, 09 |
| [13](13-wybor-urzadzen.md) | Wybór urządzeń z szukaniem | desktop: edytor rutyn | Linux, macOS | 015 | 08 |
| [14](14-wartosci-w-miejscu.md) | Wartość i opcja wybierane w miejscu | desktop: edytor rutyn | Linux, macOS | 016 | 08 |
| [15](15-jeden-ekran-z-panelem.md) | Jeden ekran: rutyna i panel warunku lub akcji | desktop: edytor rutyn | Linux, macOS | 017 | 08, 11, 12 |
| [16](16-zapis-rutyny.md) | Zapis rutyny: jeden punkt, `Ctrl+Enter`, błąd, krótki komunikat | desktop: edytor rutyn | Linux, macOS | 018, 021 | 08, 12, 15 |
| [17](17-zwarty-ekran-rutyny.md) | Zwarty ekran rutyny | desktop: edytor rutyn | Linux, macOS | 020 | 08, 15 |
| [18](18-lista-rutyn-tabela.md) | Lista rutyn i scen jako tabela | desktop: automatyka | Linux, macOS | 022 | 08 |
| [19](19-tabela-obiektow.md) | Tabela obiektów i pozycja „Lista urządzeń” | desktop: urządzenia | Linux, macOS | 024, 025, 055, 056, 057, 059, 060, 061 | 08 |
| [20](20-potwierdzenie-sterowania.md) | Potwierdzenie poleceń grupowych (pojedyncze wyjścia bez potwierdzenia) | desktop: bezpieczeństwo | Linux, macOS | 026, 038 | 08 |
| [21](21-tabela-awarii.md) | Tabela aktywnych awarii | desktop: urządzenia | Linux, macOS | 027, 055, 057 | 08, 19 |
| [22](22-dziennik-zdarzen.md) | Dziennik zdarzeń w wierszach | desktop: zdarzenia | Linux, macOS | 028 | 08 |
| [23](23-panel-boczny.md) | Panel boczny ze zwijanymi sekcjami | desktop: nawigacja | Linux, macOS | 029, 058 | 08 (19 dla pozycji „Lista urządzeń”) |
| [24](24-pomieszczenia.md) | Pomieszczenia z małym zdjęciem i tabela pomieszczenia | desktop: urządzenia | Linux, macOS | 030 | 08, 19 |
| [25](25-grupy-panelu-bocznego.md) | Grupy panelu bocznego, „Monitoring” w Integracji i „Mój profil” w Użytkownikach | desktop: nawigacja | Linux, macOS | 041, 042, 058, 061 | 08, 23 (19 dla „Listy urządzeń”) |
| [26](26-sygnal-na-kafelkach.md) | Sygnał radiowy na kafelkach urządzeń w pomieszczeniu | desktop: urządzenia | Linux, macOS | 043 | 08 |

Każdy wpis rejestru 001–063 jest w co najmniej jednym przepisie. Wpisy 055, 057, 058 i 061 zmieniają wspólny kod dwóch przepisów i są w obu; 034 opisuje przepis 07, a przepis 01 tylko powołuje się na niego jako zależność:

| Wpis | Przepis | Wpis | Przepis | Wpis | Przepis |
|---|---|---|---|---|---|
| 001 | 01 | 019 | 12 | 037 | 01 |
| 002 | 01 | 020 | 17 | 038 | 20 |
| 003 | 02 | 021 | 16 | 039 | 05 |
| 004 | 03 | 022 | 18 | 040 | 05 |
| 005 | 03 | 023 | 09 | 041 | 25 |
| 006 | 04 | 024 | 19 | 042 | 25 |
| 007 | 06 | 025 | 19 | 043 | 26 |
| 008 | 06 | 026 | 20 | 044 | 01 |
| 009 | 08 | 027 | 21 | 045 | 01 |
| 010 | 09 | 028 | 22 | 046 | 01 |
| 011 | 09 | 029 | 23 | 047 | 01 |
| 012 | 10 | 030 | 24 | 048 | 01 |
| 013 | 11 | 031 | 05 | 049 | 01 |
| 014 | 12 | 032 | 07 | 050 | 01 |
| 015 | 13 | 033 | 07 | 051 | 01 |
| 016 | 14 | 034 | 07 | 052 | 01 |
| 017 | 15 | 035 | 01 | 053 | 01 |
| 018 | 16 | 036 | 01 | 054 | 01 |
| 055 | 19, 21 | 056 | 19 | 057 | 19, 21 |
| 058 | 23, 25 | 059 | 19 | 060 | 19 |
| 061 | 19, 25 | 062 | 01 | 063 | 07 |

Wydania: 001–031 powstały na 1.1.0 (1.1.0-port.1 … 1.1.0-port.3) i w 1.2.0-port.1 zostały przeniesione na 1.2.0; 032, 033 w 1.2.0-port.1; 034–043 w 1.2.0-port.2; 044–063 w 1.2.0-mod3.1.

Wymagania użytkownika (`WYMAGANIA.md`) a przepisy: 1 → 12; 2 → 13, 14; 3 → 09; 4 → 10; 5 → 12, 15; 6 → 12; 7 → 11; 8 → 12; 9 → 09, 10, 13, 14; 10 → 19; 11 → 12; 12 → 17; 13 → 16; 14 → 18; 15 → 20, 21, 22, 23, 24 (oraz decyzja „uruchamianie rutyn bez potwierdzenia” w 18 i 20).

## Zasady wspólne dla wszystkich przepisów

1. **Dwie platformy.** Zmiany dotyczą jednocześnie macOS i Linuksa. Warunek `process.platform` tylko tam, gdzie nie da się inaczej (inne binarium, inne narzędzie systemowe, API tylko jednej platformy). Obecne wyjątki: `process.platform === "linux"` we wpisie 004 (przepis 03: `password-store` i `safeStorage.setUsePlainTextEncryption`, API tylko na Linuksie) i we wpisie 006 (przepis 04: Wi-Fi przez `nmcli`). Windows jest poza zakresem.
2. **Telefon i tablet bez zmian.** Każda zmiana interfejsu działa tylko na drodze desktopowej (przepis 08: szerokość okna co najmniej 900 px). Poniżej progu aplikacja ma działać dokładnie jak oryginał. Nowe zachowanie to nowe komponenty, a stare ekrany dostają tylko rozgałęzienie `desktop ? nowe : stare`.
3. **Pliki współdzielone.** Komponenty używane też przez inne ekrany (`Page`/`webPageStyle`, `PageHeader`, `useEscapeHandler`, `RoomWithDeviceGroup`, `SelectOption`, `GetInitialAction`) zmieniamy tylko dodatkami, które bez nowych właściwości zachowują się jak oryginał.
4. **Droga ustalana raz.** Ekran, który przełącza całe drzewo komponentów, zapamiętuje wynik `isDesktopEditor()` przy montowaniu (`useRef(...).current`), żeby zmiana rozmiaru okna nie podmieniła komponentu i nie zgubiła danych, z wyjątkami opisanymi w przepisie 08.
5. **Bezpieczeństwo centrali alarmowej.** Nowe widoki tylko czytają dane, a każde sterowanie przechodzi przez te same funkcje co w oryginale. Testy z prawdziwym zapisem lub sterowaniem robi wyłącznie użytkownik, na nieszkodliwym wyjściu.
6. **Dokumentacja.** Po naniesieniu: wpis w `CHANGELOG.md` (wersja oryginału i nasza, np. `1.3.0-mod4.0`) oraz aktualizacja wpisu w `REJESTR-ZMIAN.md` (nowe kotwice i kod przed/po dla nowego wydania).

## Jak użyć przepisów w nowym wydaniu

### 1. Przygotowanie kodu
Rozpakowanie nowego wydania, deobfuskacja, nazwany kod, scalenie trzystronne i build: kroki 1–11 w [PORTOWANIE.md](PORTOWANIE.md). Agent AI zaczyna od [AGENT.md](AGENT.md).

### 2. Szukanie miejsc zmian
Numery modułów i nazwy zmiennych lokalnych nie przetrwają. Przetrwają:
- **Klucze i18n** (np. `device.keypad_settings.edit_screens`, `hub-settings.power_consumption`) i literały tekstowe (np. włoskie `"Modifica schermi"`).
- **Nazwy eksportów modułów** (`exports.X`, w minifikacie `t.d(A, "X", …)`). Sprawdzone w bundlu 1.2.0: występują m.in. `AutomationAddEditScreen`, `RoomWithDeviceGroup`, `SelectOption`, `GetInitialAction`, `useEscapeHandler`, `HubChildTile`, `useHubSettingsMenu`, `confirmDialog`, `IsExpanderInput`, `CommandOnOffSwitch`, `HeaderActionContainer`, `executeCommand`, `NavigateToSelectAutomationIcon`, `getEventBellColor`.
- **Nazwy wartości enumów** (`INPUT_STATE`, `SET_ON_OFF`, `VIOLATION`) i nazwy ekranów (`ScreenName.GroupComponent`, `DeviceDashboard`).
- **Literały stylów** (np. `repeat(auto-fill, minmax(246px, 1fr))`, `maxWidth: "800px"`).
- **Kanały IPC i wywołania Electrona** w procesie głównym (`ipcMain.handle("open-resource"`, `app.on("window-all-closed"`, `safeStorage`).

Każdy przepis ma sekcję „Punkty zaczepienia” z takimi kotwicami. Liczby trafień podane w przepisach („w 1.2.0: N trafień”) dotyczą `dist/bundle.web.js` i `dist/electron.main.js` wydania 1.2.0; w nowym wydaniu policz je ponownie, a inna liczba to sygnał do sprawdzenia miejsca.

### 3. Kolejność
1. **Port (01–07):** najpierw 06 i 07, żeby aplikacja w ogóle wstała na Linuksie i macOS, potem 01–05. Sprawdź ekran startowy, logowanie i otwarcie bazy.
2. **Podstawa desktopu (08):** jeden moduł `DesktopEditor`. Edytor ekranów TSH z przepisu 01 (wpisy 035–037, 044–054) nanosi się dopiero po 08.
3. **Edytor rutyn (09–17)** w kolejności numerów: 09, 10, 11 (szybkie poprawki), 12, 13, 14 (komponenty wyboru), 15 (panel, korzysta z 11 i 12), 16, 17.
4. **Pozostałe widoki desktopowe:** 18, 19, potem 20–26 (21 i 24 korzystają z danych i trasy z 19, 25 z panelu z 23).

Po każdym przepisie zbuduj i wykonaj jego „Sprawdzenie” przy oknie szerszym niż 900 px oraz węższym (droga oryginalna).

## Ryzyka przy nowym wydaniu
- **Nowa wersja React:** przestarzałe API (`forwardRef`, `defaultProps` w komponentach funkcyjnych, `propTypes`, `ref="x"`, `ReactDOM.render`) może zniknąć. Nasze komponenty używają tylko `forwardRef` (w `webPageStyle`). Alias `react/jsx-runtime` w `build-app.mjs` wskazuje plik ręcznie (przepis 07).
- **Nowa wersja react-native-web:** właściwości `accessibilityRole`, `accessibilityState`, `accessibilityLabel` i `nativeID` są w 0.21 przestarzałe na rzecz `role`, `aria-*` i `id`. Nasze komponenty przekazują też do `View` właściwość `onClick` oraz style webowe (`position: "sticky"`/`"fixed"`, `cursor`, `boxShadow`, `calc()`): sprawdź, czy nowa wersja dalej przepuszcza je do DOM. `TextInput` w RNW zatrzymuje propagację `keydown`, na czym polegają nasze obejścia `Esc`.
- **Animacje (reanimated):** nasze zmiany ich nie używają, ale zmiana czasu animacji modali może zmienić moment pojawiania się szczegółów (osłona 600 ms w 19).
- **Nowy Electron:** cele esbuilda (przepis 07), `safeStorage` (03), `protocol.handle` oraz `window-all-closed`, `before-quit` i `activate` (05).
- **Nowe pliki w `resources` i nowe kanały IPC:** przepis 07 (`BW_ORIGINAL_RESOURCES`) i krok 9 w `PORTOWANIE.md` (blokady 002, 003, 004–006, 031, 039, 040).
