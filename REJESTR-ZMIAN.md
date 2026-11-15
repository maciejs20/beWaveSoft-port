# Rejestr zmian funkcjonalnych

Lista wszystkich zmian zachowania względem oryginału BE WAVE Soft, po to by nanieść je ponownie po aktualizacji źródła. Numery są stałe i nie są używane ponownie. Kotwica to tekst obecny w oryginale, po którym można znaleźć miejsce zmiany także w nowej wersji, bo nazwy zmiennych mogą się wtedy zmienić. Komentarze i nazwy nie są zmianą funkcjonalną.

Wersja bazowa wszystkich wpisów: 1.2.0. Wpisy 001–031 powstały na 1.1.0 i w `1.2.0-port.1` zostały przeniesione na 1.2.0. Gdy kod 1.2.0 różni się od opisu z 1.1.0, wpis ma punkt „W 1.2.0” z nową kotwicą i kodem. Kotwice bez takiego punktu są w 1.2.0 takie same. Ścieżki są względem `work/working/`, a skrócone (`screens/`, `logic/`, `components/`, `hooks/`, `misc/`, `i18n/`, `desktop/`) względem `work/working/src/renderer/app/`. `src/main/` to proces główny.

## Odtworzenie po aktualizacji źródła
1. Rozpakuj nowy `app.asar` do `work/original/<wersja>/app` i uruchom `work/working/tools/deobfuscate.sh <wersja>`. Wynik trafi do `work/deobfuscated/<wersja>/raw`.
2. Utwórz `work/working/tools/versions/<wersja>/`: `version.json` z `"namesFrom": "<poprzednia wersja>"`, `name-main.json` z `port-name-main.mjs` (sprawdź linie `WARN`) i pusty `module-overrides.json` (`{}`).
3. Uruchom `tools/regenerate.sh <wersja>`, potem `match-modules.mjs` (stara i nowa wersja, zapis do `module-overrides.json`) i znów `regenerate.sh`, aż `match-modules.mjs` poda 0 nowych wpisów. Wynik trafi do `work/deobfuscated/<wersja>/named`, w tej samej postaci co `working/src` przed naszymi zmianami: skrypt przywraca znacznik `__esModule` (bez niego biały ekran, React #130), usuwa `require.p + `, dodaje `main/entry.js`, `preload/preload.js` i `static/`, a nazwy zmiennych bierze z poprzedniej wersji.
4. Scal nasze zmiany przez 3-way merge pliku po pliku: baza `deobfuscated/<poprzednia>/named`, nasze `working/src`, nowe `deobfuscated/<wersja>/named`. Konflikty rozwiąż według wpisów poniżej.
5. Nowe pliki z wpisów (oznaczone „nowy, kopiuj bez zmian”) przenieś bez zmian i sprawdź, czy moduły, których używają, nie zmieniły interfejsu.
6. Sprawdź każdy wpis po kolei według kotwic. Wpis, którego scalenie nie przeniosło (plik przepisany przez Satel), nanieś ręcznie.
7. Zbuduj i sprawdź ekran startowy, logowanie oraz to, co opisuje każdy wpis w polu „Sprawdzenie”.

## Zmiany

### 001. TSH Soft: usunięty blok z ustawień klawiatury
- **Platformy:** Linux, macOS
- **Powód:** TSH Soft to program tylko dla Windows. Zachowanie jak na urządzeniach mobilnych.
- **Plik:** `src/renderer/app/screens/KeypadSettingsScreen.js`
- **Kotwica:** `device.keypad_settings.edit_screens`
- **Zmiana:** usuń w całości wyrażenie JSX `{PlatformConstants.isWeb && <View ...>...</View>}` zawierające kotwicę. Znikają przycisk „Edytuj ekrany” i przywracanie ustawień fabrycznych (`hub-configuration.restore_to_factory_settings`).
- **Przed:**
  ```js
  {PlatformConstants.isWeb && <View.default style={{
    marginBottom: Spacing.Spacing._36
  }}><PageButtonTransparentWithBorder2.PageButtonTransparentWithBorder title={... t("device.keypad_settings.edit_screens")} ... />
    ... t("hub-configuration.restore_to_factory_settings") ...
  </View.default>}
  ```
- **Po:** całe wyrażenie usunięte. Nazwy zmiennych w nowym wydaniu mogą być inne.
- **Sprawdzenie:** ustawienia klawiatury nie pokazują tego bloku.

### 002. TSH Soft: blokada uruchamiania `.exe`
- **Platformy:** Linux, macOS
- **Powód:** jak w 001.
- **Plik:** `src/main/main.js`
- **Kotwica:** `ipcMain.handle("open-resource"`, warunek `.extname(...).toLowerCase() === ".exe"`
- **Przed:**
  ```js
  console.log(a);
  if (path.extname(r).toLowerCase() === ".exe") {
    if (childProcessHandle) {
  ```
- **Zmiana:** przed tym warunkiem dodaj:
  ```js
  if (path.extname(r).toLowerCase() === ".exe") {
    log.warn("TSH Soft is not available:", r);
    return;
  }
  ```
- **Dodatkowo:** binaria TSH (`resources/v*`) nie są dołączane do buildów.
- **Sprawdzenie:** `window.electronAPI.openResource("x/TSH_soft.exe")` niczego nie startuje, a w `main.log` jest ostrzeżenie.

### 003. Aktualizacje wyłączone
- **Platformy:** Linux, macOS
- **Powód:** serwer Satel udostępnia tylko instalatory Windows.
- **Plik:** `src/main/autoUpdater.js`
- **Kotwica:** `NsisUpdater`
- **Przed:**
  ```js
  var NsisUpdater = require("electron-updater").NsisUpdater;
  var ipcMain = require("electron").ipcMain;
  module.exports = function (e, t) {
    var r = new NsisUpdater();
    r.autoDownload = true;
    ...
    r.checkForUpdates();
  };
  ```
- **Zmiana:** cała treść pliku:
  ```js
  module.exports = function (mainWindow) {
    mainWindow.webContents.send("update-not-available");
  };
  ```
- **Sprawdzenie:** sprawdzenie aktualizacji zgłasza brak aktualizacji i nie wysyła żądań do `updates.satel.pl`.

### 004. Klucz bazy bez magazynu sekretów
- **Platformy:** Linux
- **Powód:** klucz z `gnome-libsecret` nie przetrwał restartu, przez co aplikacja kasowała bazę. Decyzja użytkownika: klucz bez ochrony systemowej.
- **Plik:** `src/main/main.js`
- **Kotwica:** `app.setAppUserModelId(`
- **Przed:**
  ```js
  if (process.platform === "win32") {
    app.setAppUserModelId(applicationId);
  }
  ```
- **Zmiana:** warunek `win32` z tym wywołaniem zastąp:
  ```js
  if (process.platform === "linux") {
    app.commandLine.appendSwitch("password-store", "basic");
  }
  ```
- **Plik:** `src/main/realmKeyStore.js`
- **Kotwica:** `safeStorage is not available on this system`
- **Przed:**
  ```js
  function assertSafeStorageAvailable() {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("Electron safeStorage is not available on this system. ...");
    }
  }
  ```
- **Zmiana:** na początku funkcji z tym komunikatem dodaj:
  ```js
  if (process.platform === "linux" && !safeStorage.isEncryptionAvailable()) {
    safeStorage.setUsePlainTextEncryption(true);
  }
  ```
- **Sprawdzenie:** po restarcie w `main.log` nie ma `Realm recovery`.

### 005. Prawa `0600` dla `realm.key`
- **Platformy:** Linux, macOS
- **Powód:** klucz chroni tylko uprawnienie do pliku.
- **Plik:** `src/main/realmKeyStore.js`
- **Kotwica:** zapis pliku `${e}.tmp` z `encoding: "utf8"`
- **Przed:**
  ```js
  fs.writeFileSync(r, t, {
    encoding: "utf8"
  });
  ```
- **Po:**
  ```js
  fs.writeFileSync(r, t, {
    encoding: "utf8",
    mode: 0o600
  });
  ```
- **Sprawdzenie:** `ls -l ~/.config/"BE WAVE Soft"/realm.key` pokazuje `-rw-------` dla nowego klucza.

### 006. Wi-Fi przez `nmcli`
- **Platformy:** Linux
- **Powód:** oryginał używa `netsh`, `ipconfig` i `ms-settings:`.
- **Plik:** `src/main/linuxOverrides.js` (nowy, kopiuj bez zmian)
- **Plik:** `src/main/main.js`
- **Kotwica:** `whenReady().then(`
- **Przed:**
  ```js
  app.whenReady().then(async function () {
  ```
- **Zmiana:** tuż przed kotwicą dodaj:
  ```js
  if (process.platform === "linux") {
    require("./linuxOverrides")(ipcMain);
  }
  ```
- **Sprawdzenie:** na sprzęcie z Wi-Fi `get-wifi-info` zwraca SSID, adres i maskę, a bez Wi-Fi wartości `null`.
- **Uwaga:** nieprzetestowane na sprzęcie z Wi-Fi.

### 007. `node-window-manager` tylko na Windows
- **Platformy:** Linux, macOS
- **Powód:** natywne dodatki tego pakietu istnieją tylko dla Windows.
- **Plik:** `app/node_modules/node-window-manager/dist/index.js`
- **Kotwica:** `os_1.platform() === "win32" || os_1.platform() === "darwin"`
- **Przed:** `if (os_1.platform() === "win32" || os_1.platform() === "darwin") {`
- **Po:** `if (os_1.platform() === "win32") {`
- **Plik:** `app/node_modules/node-window-manager/dist/classes/window.js`
- **Kotwica:** `require("extract-file-icon")`
- **Przed:** `const extract_file_icon_1 = __importDefault(require("extract-file-icon"));`
- **Po:**
  ```js
  let extract_file_icon_1 = { default: () => null };
  if (process.platform === "win32") extract_file_icon_1 = __importDefault(require("extract-file-icon"));
  ```
- **Sprawdzenie:** aplikacja startuje na Linuksie i macOS bez błędu ładowania `addon.node`.

### 008. Usunięte binaria Windows i podmienione binaria platform
- **Platformy:** Linux, macOS
- **Powód:** binarium Windows w `build/` ma pierwszeństwo przed właściwym.
- **Plik:** `app/node_modules`
- **Zmiana:** usuń `bufferutil/build`, `utf-8-validate/build`, `passport-desktop-win32-x64-msvc`, `@primno/dpapi/build`, `@primno/dpapi/prebuilds`.
- **W 1.2.0:** `app` to `package.json` i `node_modules` z `work/original/1.2.0/app` po tych samych usunięciach. `utf-8-validate/build` nie istnieje już w oryginale. Nowe pliki Windows w 1.2.0 (`hermes-compiler/hermesc/win64-bin`, `fb-dotslash/bin/windows*`) to narzędzia budowania, nie są ładowane w działającej aplikacji, więc zostają, jak `react-native/sdks/hermesc` w 1.1.0. Wersje `realm` (12.15.0) i `ffmpeg-static` (5.3.0) są te same, więc `linux/natives` i `mac/natives` zostają bez zmian. Pliki 007 w `app/node_modules/node-window-manager/dist` są w 1.2.0 takie same jak w 1.1.0, więc nasze poprawione kopie z gita pasują bez zmian.
- **Pliki:** `linux/natives`, `mac/natives`, wgrywane przez skrypty budowania: `realm/prebuilds/node/realm.node` i `ffmpeg-static/ffmpeg.exe`. Nazwa `ffmpeg.exe` musi zostać, bo renderer szuka dokładnie takiej.
- **Źródła:** Linux to npm `realm@12.15.0` i ffmpeg-static `b6.0`, a macOS to `original/mac-build`. W nowym wydaniu sprawdź wersję `realm` w `package.json` i użyj takiej samej.
- **Sprawdzenie:** `file` na tych binariach w buildzie pokazuje ELF x86-64 na Linuksie i Mach-O arm64 na macOS, a baza Realm otwiera się po starcie.

### 009. Edytor rutyn i scen: wspólne przełączanie drogi desktopowej
- **Platformy:** Linux, macOS
- **Powód:** nowe zachowanie ma działać tylko na desktopie, a telefon i tablet zostają bez zmian.
- **Plik:** `src/renderer/app/logic/DesktopEditor.js` (nowy, kopiuj bez zmian)
- **Zmiana:** `isDesktopEditor()` zwraca `window.innerWidth >= 900`. Stosują go wpisy 010–013.
- **Sprawdzenie:** przy oknie węższym niż 900 px zachowanie jak w oryginale.

### 010. Akcja „Włącz/wyłącz” domyślnie „Włącz”
- **Platformy:** Linux, macOS (droga desktopowa)
- **Powód:** kolejność opcji zaczyna się od „off”, a aplikacja bierze pierwszą. Kolejność zostaje, zmienia się tylko wartość początkowa nowej akcji.
- **Plik:** `src/renderer/app/logic/DesktopEditor.js`, funkcja `desktopInitialAction`
- **Plik:** `src/renderer/app/screens/AutomationActionSelectTriggerScreen.js`
- **Kotwica:** `GetInitialAction`
- **Przed:**
  ```js
  return params.action ?? (0, GetInitialAction.BuildViewModel)(actions2[0]);
  V((0, GetInitialAction.GetInitialAction)(n));
  ```
- **Po:**
  ```js
  return params.action ?? DesktopEditor.desktopInitialAction((0, GetInitialAction.BuildViewModel)(actions2[0]));
  V(DesktopEditor.desktopInitialAction((0, GetInitialAction.GetInitialAction)(n)));
  ```
- **Sprawdzenie:** nowa akcja „Włącz/wyłącz” pokazuje „Włącz”. Edycja istniejącej akcji zachowuje jej wartość.

### 011. Bez zielonego komunikatu po dodaniu warunku lub akcji
- **Platformy:** Linux, macOS (droga desktopowa)
- **Powód:** komunikat zakrywał ekran, a zmiana jest widoczna w podsumowaniu. Błędy i zapis rutyny pokazują się jak dawniej.
- **Pliki:** `src/renderer/app/screens/AutomationConditionSetScreen.js`, `AutomationActionSetScreen.js`
- **Kotwica:** `condition_has_been_succesfully_added`, `action_has_been_succesfully_added`
- **Przed:**
  ```js
  appNavigation.pop(2);
  (0, module93.showToast)({
    type: "success",
  ```
- **Po:**
  ```js
  appNavigation.pop(2);
  if (!DesktopEditor.isDesktopEditor()) (0, module93.showToast)({
    type: "success",
  ```
- **Sprawdzenie:** po „Zapisz” w warunku lub akcji nie ma komunikatu.

### 012. Pełne nazwy i operator w podsumowaniu
- **Platformy:** Linux, macOS (droga desktopowa)
- **Powód:** podsumowanie pokazywało pierwszą nazwę i `+N`, bez operatora.
- **Plik:** `src/renderer/app/logic/DesktopNameList.js` (nowy, kopiuj bez zmian)
- **Pliki:** `logic/ConditionDevices.js`, `logic/ConditionButtons.js`, `components/ActionCardDescription.js`
- **Kotwica:** ``label={`+ ${`` oraz `deviceIds.length - 1`
- **Zmiana:** przed obliczeniem licznika, na drodze desktopowej, zwróć `DesktopNameList` z `keys={...deviceIds}` i nazwą renderowaną przez dotychczasowy `DeviceName` (dla przycisków `DeviceButtonsName` z `deviceButtonsKeys={[key]}`). W warunkach dodaj `parenthesized` i `prefix` z `deviceOperatorPrefix(t, deviceOperator, hasOperatorFeature)` przy więcej niż jednym urządzeniu. `hasOperatorFeature` pochodzi z `hubInfoChangeListener()?.info?.features?.sceneExpressionDevOperator`. Brak operatora pokazujemy jako „dowolne z:”, tak jak formularz pokazuje wtedy „Lub”.
- **Pliki:** `i18n/pl.js`, `i18n/en.js`
- **Kotwica:** `automation: {`
- **Zmiana:** dodaj blok `summary` z kluczami `any_of`, `all_of`, `sum_of`, `show_all`.
- **Sprawdzenie:** warunek z dwoma urządzeniami pokazuje „(dowolne z: A, B)”, a akcja wszystkie nazwy. Powyżej 12 pozycji pojawia się „pokaż wszystkie”.

### 013. X i `Esc` zamykają tylko bieżący krok warunku lub akcji
- **Platformy:** Linux, macOS (droga desktopowa)
- **Powód:** X i `Esc` zamykały całą rutynę.
- **Pliki współdzielone (dodatek bez zmiany domyślnego działania):**
  - `screens/PageHeader.js`, kotwica `<CloseButton2.CloseButton onPress={closeModalStack} />`, po: `onPress={props.onClose || closeModalStack}`
  - `screens/webPageStyle.js`, kotwica `useEscapeHandler)();`, po: `useEscapeHandler)(A.closeHandler);`, a do `PageHeader` dodaj `onClose={A.closeHandler}`. W 1.2.0 obiekt stylów nazywa się `q2` zamiast `F`, a `PageHeader` jest w tym samym wierszu co `<View.default style={q2.view} ref={ref4}>`.
  - `hooks/useEscapeHandler.js`, po: `function (closeHandler)` i `(closeHandler || closeModalStack)();`
- **Pliki ekranów:** `screens/AutomationConditionSelectTriggerScreen.js` i `AutomationActionSelectTriggerScreen.js` (`pop(1)`), `AutomationConditionSetScreen.js` i `AutomationActionSetScreen.js` (`pop(2)`)
- **Kotwica:** `<module32.Page`
- **Zmiana:** dodaj `closeHandler={DesktopEditor.isDesktopEditor() ? function () { return appNavigation.pop(N); } : undefined}`.
- **Sprawdzenie:** X i `Esc` na tych ekranach wracają do „Nowa rutyna” bez utraty rutyny. X na samej rutynie pyta o niezapisane zmiany.

### 014. Listy „Wybierz wyzwalacz” i „Wybierz akcję”: częste, szukanie, skróty
- **Platformy:** Linux, macOS (droga desktopowa)
- **Powód:** lista 22 pozycji wymagała przewijania, a najczęstsze były na dole.
- **Plik:** `src/renderer/app/logic/DesktopOptionPicker.js` (nowy, kopiuj bez zmian). Stałe listy częstych: `Trigger.INPUT_STATE`, `VIOLATION`, `SENSOR_MOTION`, `SENSOR_MAGNETIC`, `CRON_EXPRESSION` oraz `Action.SET_ON_OFF`, `RUN_SCENE`, `INVOKE_NOTIFICATION`, `INVOKE_CHIME`.
- **Plik:** `src/renderer/app/screens/AutomationConditionSelectTriggerScreen.js`
- **Kotwica:** `{W.map(function (item6) {` z `RadioButton2.RadioButton`
- **Zmiana:** dodaj `var desktopPath = (0, react.useRef)(DesktopEditor.isDesktopEditor()).current;`, a listę zamień na `{desktopPath ? <DesktopOptionPicker items=... selectedKey={values.expression?.trigger} frequentKeys={CONDITION_FREQUENT_TRIGGERS} onConfirm={handleSubmit} onSelect=... /> : <dotychczasowa lista>}`. `onSelect` wykonuje to samo co dotychczasowe `onChange` radia, a `items` to `{ key: conditionTrigger, name, icon }`.
- **Plik:** `src/renderer/app/screens/AutomationActionSelectTriggerScreen.js`
- **Kotwica:** `{Z.map(function (item5) {`
- **Zmiana:** jak wyżej, z `selectedKey={values.type}`, `ACTION_FREQUENT_TYPES` i `desktopInitialAction` w `onSelect`.
- **Pliki:** `i18n/pl.js`, `i18n/en.js`, kotwica `automation: {`, blok `picker` z kluczami `search`, `frequent`, `all`, `show_all`.
- **Sprawdzenie:** wpisanie „stan” zawęża listę, `Enter` wybiera, drugi `Enter` przechodzi dalej, `Esc` czyści szukanie, a `Alt+2` wybiera „Naruszenie”. Przy oknie poniżej 900 px lista jest jak w oryginale.

### 015. Wybór urządzeń: szukanie, zwinięte pomieszczenia, etykiety
- **Platformy:** Linux, macOS (droga desktopowa)
- **Powód:** 46 urządzeń rozwiniętych, duże wiersze, brak szukania.
- **Plik:** `src/renderer/app/logic/DesktopDevicePicker.js` (nowy, kopiuj bez zmian). Ma te same właściwości co `RoomWithDeviceGroup`: `selected`, `setSelected`, `filter`, `children`.
- **Pliki:** `screens/AutomationConditionSetScreen.js`, `screens/AutomationActionSetScreen.js`
- **Kotwica:** `<RoomWithDeviceGroup2.RoomWithDeviceGroup setAllSwitch`
- **Zmiana:** po `var appNavigation = ...` dodaj `var DevicePicker = (0, react.useRef)(DesktopEditor.isDesktopEditor() ? DesktopDevicePicker2.DesktopDevicePicker : RoomWithDeviceGroup2.RoomWithDeviceGroup).current;`, a znacznik `RoomWithDeviceGroup2.RoomWithDeviceGroup` (otwarcie i zamknięcie) zamień na `DevicePicker`.
- **Pliki:** `i18n/pl.js`, `i18n/en.js`, blok `automation.picker`: `search_devices`, `not_matching`, `no_results`, `select_visible`, `deselect_visible`.
- **Sprawdzenie:** wpisanie „okno”, `Enter` zaznacza pierwszy wynik, `↓` i `Enter` kolejny, `Esc` czyści szukanie. Urządzenie niepasujące do wyzwalacza ma etykietę „nie pasuje”. Przy wyzwalaczu „Przycisk” lista zostaje stara (`DeviceButtons`).

### 016. Wartość i opcja wybierane w miejscu
- **Platformy:** Linux, macOS (droga desktopowa)
- **Powód:** wybór wartości otwierał osobne okno.
- **Plik:** `src/renderer/app/logic/DesktopValuePicker.js` (nowy, kopiuj bez zmian)
- **Pliki:** `logic/AutomationConditionValueInput.js`, `logic/AutomationActionValueInput.js`, `screens/AutomationConditionSetScreen.js`, `screens/AutomationActionSetScreen.js`
- **Kotwica:** `<SelectOption2.SelectOption`
- **Zmiana:** we wszystkich wystąpieniach w tych plikach zamień na `<DesktopValuePicker2.AdaptiveSelectOption` i dodaj `require`. Reszta właściwości bez zmian.
- **Sprawdzenie:** do 8 opcji to przyciski, powyżej lista rozwijana. Działa jak dawniej przy oknie poniżej 900 px.

### 017. Jeden ekran: panel warunku lub akcji obok rutyny
- **Platformy:** Linux, macOS (droga desktopowa)
- **Powód:** łańcuch okien jedno na drugim. Dane zapisywane na centrali powstają w tych samych ekranach co dawniej.
- **Plik:** `src/renderer/app/logic/DesktopRoutinePanel.js` (nowy, kopiuj bez zmian). Dwa panele od 1300 px szerokości okna, poniżej panel zastępuje formularz.
- **Plik:** `screens/webPageStyle.js`, dodatki bez zmiany domyślnego działania:
  - `useEscapeHandler)(A.closeHandler);` zamień na `useEscapeHandler)(A.escapeDisabled ? function () {} : A.escapeHandler || A.closeHandler);`
  - `maxWidth: "800px",` zamień na `maxWidth: A.modalMaxWidth || "800px",`
  - **W 1.2.0** szerokość okna zależy od nowej właściwości Satel `webModalWide`. Przed:
    ```js
    ? objectSpread(objectSpread({}, webModalWide ? {} : {
        maxWidth: "800px"
      }), {}, {
    ```
    Po:
    ```js
    ? objectSpread(objectSpread({}, webModalWide ? {} : {
        maxWidth: A.modalMaxWidth || "800px"
      }), {}, {
    ```
  - po bloku z `borderRadius: 6` dodaj `A.noScrim ? { boxShadow: "none" } : {}` jako kolejny argument scalania
- **Pliki:** `screens/AutomationConditionSelectTriggerScreen.js`, `AutomationActionSelectTriggerScreen.js`, `AutomationConditionSetScreen.js`, `AutomationActionSetScreen.js`
- **Zmiana:**
  - `(0, module21.useAppNavigation)()` zamień na `(0, DesktopRoutinePanel.usePanelNavigation)()`
  - `(0, useScreenRoute.useScreenRoute)()` zamień na `(0, DesktopRoutinePanel.usePanelRoute)()`
  - na `<module32.Page` dodaj `noScrim={!!appNavigation.twoPanes} escapeDisabled={!!appNavigation.requestClose}` oraz `closeHandler={appNavigation.requestClose || (DesktopEditor.isDesktopEditor() ? function () { return appNavigation.pop(N); } : undefined)}`, a na ekranach Select także `goBack={appNavigation.requestClose}`
  - przed `<module261.Stepper` dodaj `<DesktopRoutinePanel.PanelDirtyReporter values={values} />`
  - tytuł przycisku zapisu na ekranach Set: `appNavigation.requestClose ? t("automation.picker.apply") : <dotychczasowy>`
- **Plik:** `components/AutomationConditionInteractiveCard.js`, `(0, module21.useAppNavigation)()` zamień na `(0, DesktopRoutinePanel.useEditorNavigation)()`.
- **Plik:** `screens/AutomationAddEditScreen.js`
  - `exports.AutomationAddEditScreen = function () {` zamień na `var AutomationAddEditForm = function () {`, a na końcu pliku dodaj eksport owijający w `DesktopRoutineEditor` i mapę `panelScreens`
  - nawigacja przez `useEditorNavigation`
  - na `<module32.Page` dodaj `escapeHandler={editor?.panelOpen ? editor.requestClose : undefined}`
- **Pliki:** `i18n/pl.js`, `i18n/en.js`, blok `automation.picker`: `apply`, `discard_title`, `discard_message`, `discard`, `keep_editing`, `unavailable`, `close`.
- **Sprawdzenie:** edycja warunku otwiera szczegóły od razu po prawej. Zmiana rozmiaru okna nie gubi danych. X i `Esc` przy niezatwierdzonych zmianach pytają „Odrzucić zmiany w panelu?”. Wyzwalacz niedostępny na centrali pokazuje się tylko do odczytu.

### 018. Zapis rutyny: jeden punkt, `Ctrl+Enter`, powód blokady
- **Platformy:** Linux, macOS (droga desktopowa)
- **Powód:** bezpieczeństwo, bo skrót nie może ominąć blokady przycisku. Dotychczasowe pytanie o niezapisane zmiany nie wykrywało zmian w miejscu.
- **Plik:** `screens/AutomationAddEditScreen.js`
- **Kotwica:** `IsSaveButtonDisabled`, `usePreventLeave`, `title={e("SAVE")}`
- **Zmiana:**
  - dodaj `baseline = cloneDeep(dA)` i używaj go w `EA` zamiast `dA`, a warunek pytania rozszerz o `|| !!editor?.dirty`
  - dodaj `missing` (nazwa, warunek bez scen, akcja, panel) i wyświetl „Brakuje: …” nad przyciskami
  - dodaj `trySave`: blokada `savingRef`, odmowa z komunikatem przy `missing`, `validateForm`, dopiero potem `ref2.current = true` i `handleSubmit`. Przycisk i komponent `SaveShortcut` (`Ctrl+Enter`, `Cmd+Enter`, bez `event.repeat`) wołają tylko tę funkcję
  - `useEffect` po `tA === false` kasuje `savingRef` i `ref2`
- **Plik:** `logic/NavigateToSelectAutomationIcon.js`
- **Kotwica:** `failed_to_add_` i `editing_..._failed`, w `action` przycisku `try_again`
- **Zmiana:** przed `if (PlatformConstants.isWeb) { n.pop(2); }` dodaj gałąź `if (DesktopEditor.isDesktopEditor()) { n.pop(1); t(false); } else`. Błąd zapisu zostawia edytor otwarty.
- **Plik:** `logic/DesktopEditor.js`, funkcja `carryDevices`, używana w `onSelect` ekranów Select: zachowuje pasujące urządzenia przy zmianie wyzwalacza, a o usuniętych informuje z możliwością cofnięcia.
- **Pliki:** `i18n/pl.js`, `i18n/en.js`, blok `automation.picker`: `missing_name`, `missing_condition`, `missing_action`, `missing_panel`, `missing`, `cannot_save`, `devices_removed`.
- **Sprawdzenie:** `Ctrl+Enter` przy niepełnej rutynie niczego nie wysyła i pokazuje braki. Prawdziwy zapis tylko na testowej rutynie z nieszkodliwym wyjściem.

### 019. Lista wyzwalaczy i akcji w jednej kolumnie
- **Platformy:** Linux, macOS (droga desktopowa)
- **Powód:** życzenie użytkownika, dwie kolumny były nieczytelne.
- **Plik:** `src/renderer/app/logic/DesktopOptionPicker.js`
- **Zmiana:** `cell.width` z `"50%"` na `"100%"`, wiersz 32 px, znacznik wyboru `mark` po prawej. `MAX_COLLAPSED_REST` z 6 na 30, więc „Wszystkie” są od razu rozwinięte.
- **Sprawdzenie:** „Wybierz wyzwalacz” pokazuje jedną kolumnę z kropką przy wybranej pozycji.

### 020. Zwarty ekran rutyny
- **Platformy:** Linux, macOS (droga desktopowa)
- **Powód:** puste karty i duże odstępy wymuszały przewijanie.
- **Plik:** `screens/AutomationAddEditScreen.js`
- **Kotwica:** `marginBottom={Spacing.Spacing._44}`, `_32`, `_24`
- **Zmiana:** wszystkie na `marginBottom={editor ? Spacing.Spacing._16 : Spacing.Spacing._44}`, odpowiednio `_12` dla `_32` i `_24`.
- **W 1.2.0:** Satel dodał przełącznik `automation.add-edit.use_in_shortcuts` w `<module43.FormGroup marginBottom={Spacing.Spacing._32}>` (w miejscu `{false}` z 1.1.0). Jak pozostałe dostał `marginBottom={editor ? Spacing.Spacing._12 : Spacing.Spacing._32}`.
- **Plik:** `components/InteractiveCard.js`
- **Kotwica:** `(0, jsxRuntime.jsx)(Card.Card, objectSpread(objectSpread({}, S), {}, {`
- **Zmiana:** przed `return` dodaj gałąź `DesktopEditor.isDesktopEditor()`, która zwraca `children` i wiersz `+ {emptyStateMessage}` o wysokości 32 px z tym samym `iconButton.onPress`.
- **Plik:** `logic/InfoCard.js`
- **Kotwica:** `S.padding ?? Spacing.Spacing._16`, `module3829.default.descriptionContainer`
- **Zmiana:** na desktopie padding `_8`, a opis z `marginTop: 2`.
- **Sprawdzenie:** nowa rutyna z warunkiem i akcją mieści się bez przewijania przy oknie 1508×939.

### 021. Potwierdzenie zapisu bez pełnego ekranu
- **Platformy:** Linux, macOS (droga desktopowa)
- **Powód:** zielony ekran z przyciskiem „Wróć” wymagał dodatkowego kliknięcia.
- **Plik:** `logic/NavigateToSelectAutomationIcon.js`
- **Kotwica:** `n.navigate(ScreenName.ScreenName.Notification, {` z `type: OperationType.CommonScreenType.Success`, w dodawaniu, edycji i duplikowaniu (w duplikowaniu zmienna `t`)
- **Zmiana:** przed każdym takim wywołaniem dodaj:
  ```js
  if (DesktopEditor.isDesktopEditor()) {
    n.navigate(ScreenName.ScreenName.Automation);
    (0, module93.showToast)({ type: "success", message: <to samo description> });
    return;
  }
  ```
- **Sprawdzenie:** zapis wraca od razu na listę i pokazuje krótki komunikat. Przy błędzie działa wpis 018.

### 022. Lista rutyn i scen jako tabela
- **Platformy:** Linux, macOS (droga desktopowa)
- **Powód:** duże kafelki nie pokazują, co robi rutyna.
- **Plik:** `src/renderer/app/logic/DesktopAutomationList.js` (nowy, kopiuj bez zmian). Przełącznik i uruchamianie korzystają z tych samych `SetRoutineState` i `ExecuteSceneAction` co `AutomationCard`.
- **Plik:** `components/AutomationList.js`
- **Kotwica:** `gridTemplateColumns: "repeat(auto-fill, minmax(246px, 1fr))"`
- **Zmiana:** dodaj `var desktopPath = (0, react.useRef)(DesktopEditor.isDesktopEditor()).current;`, a element siatki owiń w `{desktopPath ? <DesktopAutomationList2.DesktopAutomationList automations={T} automationsType={automationsType} isReadOnly={isReadOnly2} /> : <dotychczasowa siatka>}`.
- **W 1.2.0:** Satel dodał nad listą pole `module544.SearchBar` (nazwy i urządzenia, `CreateAutomationSearchMatcher`), a rutyny przychodzą przez `props.scenes`. `T` to już lista po filtrze Satel. Przed:
  ```js
      })}><View.default style={objectSpread(objectSpread(objectSpread(objectSpread({}, {
  ...
            })}</View.default></View.default> : <jsxRuntime.Fragment>{T.map(function (item6, index) {
  ```
  Po:
  ```js
      })}>{desktopPath ? <DesktopAutomationList2.DesktopAutomationList automations={T} automationsType={automationsType} isReadOnly={isReadOnly2} /> : <View.default style={objectSpread(objectSpread(objectSpread(objectSpread({}, {
  ...
            })}</View.default>}</View.default> : <jsxRuntime.Fragment>{T.map(function (item6, index) {
  ```
- **W 1.2.0-port.1, `logic/DesktopAutomationList.js`:** tabela nie ma własnego pola szukania (decyzja użytkownika 2026-11-13: przy dublowaniu zostaje funkcja Satel). Jedynym polem na desktopie jest `SearchBar` Satel, a tabela pokazuje `T`, czyli listę po jego filtrze. Usunięte: `TextInput` w tabeli, stan `queryState`, `inputRef`, filtr `visible`, `normalize`, obsługa klawiszy w `useFocusEffect` (litera przenosi fokus do pola, `Esc` czyści), komunikat `automation.picker.no_results` (przy pustym `T` `AutomationList` nie renderuje tabeli, tylko swój pusty stan) oraz `require` dla `TextInput`, `lodash` i `module_58`. Przed:
  ```js
  exports.DesktopAutomationList = function (props) {
    var t = (0, reactI18next.useTranslation)().t;
    var queryState = (0, react.useState)("");
    var inputRef = (0, react.useRef)(null);
    var isRoutine = props.automationsType === ExpanderInputType.Scene_Type.CONDITION;
    var needle = normalize(queryState[0].trim());
    var visible = props.automations.filter(function (automation) {
      return !needle || normalize(automation.name).includes(needle);
    });
    (0, module58.useFocusEffect)(function () { ... });
    return <View><TextInput ref={inputRef} style={styles.search} value={queryState[0]} placeholder={t("automation.picker.search_list")} onChangeText={queryState[1]} /><View style={[styles.row, styles.header]}>...</View>{visible.length === 0 && <module28.Text style={styles.empty}>{t("automation.picker.no_results")}</module28.Text>}{visible.map(function (automation) {
  ```
  Po:
  ```js
  exports.DesktopAutomationList = function (props) {
    var t = (0, reactI18next.useTranslation)().t;
    var isRoutine = props.automationsType === ExpanderInputType.Scene_Type.CONDITION;
    return <View><View style={[styles.row, styles.header]}>...</View>{props.automations.map(function (automation) {
  ```
  Style `search` i `empty` usunięte. `AutomationList.js` bez zmian względem opisu wyżej.
- **Pliki:** `i18n/pl.js`, `i18n/en.js`, blok `automation.picker`: `column_name`, `column_if`, `column_then`, `column_enabled`. Klucz `search_list` usunięty w 1.2.0-port.1 (`"Szukaj po nazwie…"` / `"Search by name…"`). `no_results` zostaje, używa go wybór urządzeń.
- **Sprawdzenie:** na desktopie nad tabelą jest tylko pole Satel. Wpisanie nazwy rutyny lub urządzenia zawęża wiersze tabeli. Kliknięcie nazwy otwiera edycję i nie uruchamia rutyny.

### 023. Nowy warunek domyślnie „Stan wejścia”
- **Platformy:** Linux, macOS (droga desktopowa)
- **Powód:** decyzja użytkownika, to najczęstszy wyzwalacz.
- **Plik:** `screens/AutomationConditionSelectTriggerScreen.js`
- **Kotwica:** `BuildViewModel)(triggers[0], params.isFirstCondition)`
- **Zmiana:** przed `return` dodaj `var initialTrigger = DesktopEditor.isDesktopEditor() && triggers.find(function (item) { return item.type === ExpanderInputType.SceneScenario_Condition_Trigger.INPUT_STATE; }) || triggers[0];`, a w `BuildViewModel` użyj `initialTrigger`.
- **Sprawdzenie:** nowy warunek ma zaznaczony „Stan wejścia”. Bez tego wyzwalacza na centrali zostaje pierwszy z listy.

### 024. Tabela obiektów
- **Platformy:** Linux, macOS (droga desktopowa)
- **Powód:** lista urządzeń pod telefon, parametry dopiero w szczegółach. Projekt: `PROJEKT-TABELA-OBIEKTOW.md`.
- **Pliki:** `src/renderer/app/desktop/deviceTable/` (nowe, kopiuj bez zmian): `DeviceTableRoute.js`, `DeviceTableScreen.js`, `deviceTableModel.js`, `deviceTableStore.js`, `clickShield.js`.
- **Plik:** `misc/module_2541.js`
- **Kotwica:** `name={module55.ScreenName.GroupComponent} component={GroupScreen.GroupScreen}`
- **Zmiana:** `component={DeviceTableRoute2.DeviceTableRoute}` i `require("../desktop/deviceTable/DeviceTableRoute.js")`. To wyjątek od zasady niezmieniania plików wspólnych.
- **Pliki:** `i18n/pl.js`, `i18n/en.js`, blok `device_table` przed `automation: {`.
- **Zasady bezpieczeństwa:** tabela nie ma działań sterujących. W tych plikach nie może być `hub.control`, `.Send(`, `Command*`, `DeviceControlCard`, `DevicesControlWidget`, `renderWidget`, `HeaderActionContainer`, `executeCommand`. Klik i `Enter` tylko otwierają `DeviceDashboard`, a `armClickShield` blokuje wejście przez 600 ms.
- **Przełącznik widoku:** w widoku graficznym jest w wierszu tytułu okna (`pinned` w `DeviceTableRoute.js`), w tabeli obok pola szukania.
- **Ucięty tekst:** komórki mają natywny `title`, więc pełna treść pojawia się po najechaniu myszą.
- **Sprawdzenie:** liczby w zakładkach sumują się do liczby urządzeń (na centrali testowej autora 46 + 17 + 13 = 76). Wpisanie liter filtruje, `Enter` otwiera, `Esc` w szczegółach wraca do tabeli, a szukanie zostaje. Klik w trakcie blokady nie dochodzi do `document`. Domyślny jest widok graficzny, a wybór jest zapamiętany.

### 025. Pozycja „Lista obiektów” w panelu bocznym
- **Platformy:** Linux, macOS (droga desktopowa)
- **Powód:** bezpośrednie wejście do tabeli obiektów.
- **Plik:** `hooks/useHubSettingsMenu.js`
- **Kotwica:** `title: r("hub-settings.power_consumption")`, pierwsza pozycja `items` w grupie `hub-settings.summary`
- **Zmiana:** `items: [{...}]` zamień na `items: [].concat(DesktopEditor.isDesktopEditor() ? [<pozycja>] : [], [{...}])`. Pozycja ma `title: r("device_table.menu")`, `leftIcon: "home-wifi"`, `screen: ScreenName.ScreenName.GroupComponent`, a `onPress` woła `callback(ScreenName.ScreenName.GroupComponent, { id: null, name: r("all"), icon: "home-wifi", forceTable: true })`.
- **Plik:** `desktop/deviceTable/DeviceTableRoute.js`: `params?.forceTable` otwiera tabelę bez zmiany zapamiętanego widoku.
- **Pliki:** `i18n/pl.js`, `i18n/en.js`, klucz `device_table.menu`.
- **Sprawdzenie:** „Lista obiektów” otwiera tabelę, a kafelek WSZYSTKIE zachowuje zapamiętany widok.

### 026. Potwierdzenie sterowania wyjściem i poleceń grupowych
- **Platformy:** Linux, macOS (droga desktopowa)
- **Powód:** jedno kliknięcie steruje prawdziwym urządzeniem. Uruchamianie rutyn celowo zostaje bez potwierdzenia.
- **Plik:** `logic/DesktopConfirm.js` (nowy, kopiuj bez zmian)
- **Plik:** `logic/CommandOnOffSwitch.js`, kotwica `onValueChange={async function () {`. Na początku funkcji dodaj `if (!(await DesktopConfirm.confirmControl(i18nextMin.t(y ? "device_table.confirm_off" : "device_table.confirm_on")))) { return; }`.
- **Plik:** `components/CommandSwitchController.js`, kotwica `await onPress2(!value);`. Na początku funkcji `e` dodaj `if (!(await DesktopConfirm.confirmControl(label))) { return; }`.
- **Plik:** `components/HeaderActionContainer.js`, kotwica `getDevicesCapabilities.executeCommand`. Przed wywołaniem dodaj to samo sprawdzenie z tekstem `hub-groups.actions.*`.
- **Pliki:** `i18n/pl.js`, `i18n/en.js`, blok `device_table`: `confirm_title`, `confirm_yes`, `confirm_no`, `confirm_on`, `confirm_off`.
- **Sprawdzenie:** tylko na nieszkodliwym wyjściu: „Anuluj” niczego nie wysyła, „Wykonaj” steruje.
- **Zakres:** nie obejmuje innych widżetów sterujących, np. rolet, i uzbrajania.
- **Od wpisu 038:** zmiany w `CommandOnOffSwitch.js` i `CommandSwitchController.js` oraz klucze `confirm_on`, `confirm_off` usunięte; zostaje potwierdzenie w `HeaderActionContainer.js`.

### 027. Tabela aktywnych awarii
- **Platformy:** Linux, macOS (droga desktopowa)
- **Powód:** duże karty, mało pozycji na ekranie.
- **Plik:** `desktop/shared/DesktopFailuresList.js` (nowy, kopiuj bez zmian). Wspólne dane: `desktop/deviceTable/useDeviceRows.js`.
- **Plik:** `screens/HubFailuresScreen.js`, kotwica `<module248.default sections={X}`. Owiń w `{desktopPath ? <DesktopFailuresList2.DesktopFailuresList sections={X} /> : <dotychczasowa lista>}` i dodaj `desktopPath` z `useRef`.
- **W 1.2.0:** `desktopPath` stoi po nowej linii Satel `var ie = ... GetHubInfoIssueType ... === "error";`. Nagłówek listy (`ListHeaderComponent`) Satel pokazuje teraz tylko przy `ie`. Tabela desktopowa, jak w 1.1.0, nie ma tego nagłówka.
- **Plik:** `desktop/deviceTable/deviceTableModel.js`: `deviceTypeId` w wierszu, potrzebny do miniatury z `getDeviceImage`.
- **Pliki:** `i18n/pl.js`, `i18n/en.js`, klucz `device_table.in_memory`.
- **Sprawdzenie:** liczba wierszy równa się liczbie w „Liczba awarii”. Wiersz otwiera szczegóły z `readonly: true`.

### 028. Dziennik zdarzeń w wierszach
- **Platformy:** Linux, macOS (droga desktopowa)
- **Powód:** na ekranie mieściło się ok. 6 zdarzeń.
- **Plik:** `desktop/shared/DesktopEventRow.js` (nowy, kopiuj bez zmian)
- **Ikona:** dzwonek w kolorze typu zdarzenia z `getEventBellColor` i `getEventBackgroundColor`.
- **Plik:** `screens/EventLogListScreen.js`, kotwica `data={iA} renderItem={function (props) {`. Na desktopie `data` filtrowane przez `eventMatches`, a `renderItem` zwraca `DesktopEventRow`. Przed listą dodaj pole szukania `eventQuery`.
- **W 1.2.0** Satel przepisał ekran (`useEventLogQuery`, wyszukiwanie na centrali przez `SearchBar`, gdy centrala ma `EventLogAdvancedFilters`). Zmiana naniesiona od nowa:
  - po `var module60 = require("../misc/module_60.js");` dodaj `require` dla `DesktopEditor`, `DesktopEventRow2` (`../desktop/shared/DesktopEventRow.js`) i `TextInput` (`react-native-web/.../TextInput`, `.default`)
  - po `var safeAreaInsets = (0, module60.useSafeAreaInsets)();` dodaj `desktopPath` z `useRef` i `var eventQuery = (0, react.useState)("");`
  - kotwica `var callback = (0, react.useCallback)(function (cA) {`. Przed `return <module1684.default data={q} detailed={false} />;` dodaj `if (desktopPath) { return <DesktopEventRow2.DesktopEventRow data={q} />; }`
  - kotwica `}}><module250.default ref={ref2} style={PlatformConstants.isWeb ? {`. Przed `<module250.default` dodaj `{desktopPath && <TextInput value={eventQuery[0]} placeholder={A("device_table.search_events")} onChangeText={eventQuery[1]} style={...} />}` (styl jak w 1.1.0), a `data={eventLogQuery.events}` zamień na `data={desktopPath ? eventLogQuery.events.filter(function (item) { return DesktopEventRow2.eventMatches(item, eventQuery[0]); }) : eventLogQuery.events}`
- **W 1.2.0-port.1:** bez naszego pola szukania i bez filtra `eventMatches` (decyzja użytkownika 2026-11-13: przy dublowaniu zostaje funkcja Satel). Na desktopie jedynym polem jest `SearchBar` Satel. Filtruje on na centrali: `useEventLogSearch().appliedQuery` idzie jako `searchQuery` do `useEventLogQuery`, a `eventLogQuery.events` to już wynik. Wiersze dostają więc `eventLogQuery.events` bez zmian, tak jak karty. Gdy centrala nie ma `EventLogAdvancedFilters` (`IsEventLogAdvancedFilteringAvailable()` fałszywe), Satel pola nie pokazuje i szukania nie ma, tak jak na telefonie. Zostają: `require` `DesktopEditor` i `DesktopEventRow2`, `desktopPath` i `DesktopEventRow` w `renderItem` (opis wyżej). Przed (1.2.0, nasz kod z punktu wyżej):
  ```js
  var TextInput = require("../../lib/react-native-web/dist/cjs/exports/TextInput/index.js").default;
  ...
    var eventQuery = (0, react.useState)("");
  ...
        }}>{desktopPath && <TextInput value={eventQuery[0]} placeholder={A("device_table.search_events")} onChangeText={eventQuery[1]} style={{ ... }} />}<module250.default ref={ref2} style={PlatformConstants.isWeb ? {
            height: "100%"
          } : undefined} data={desktopPath ? eventLogQuery.events.filter(function (item) {
            return DesktopEventRow2.eventMatches(item, eventQuery[0]);
          }) : eventLogQuery.events} renderItem={callback}
  ```
  Po (tekst oryginału 1.2.0):
  ```js
        }}><module250.default ref={ref2} style={PlatformConstants.isWeb ? {
            height: "100%"
          } : undefined} data={eventLogQuery.events} renderItem={callback}
  ```
  W `desktop/shared/DesktopEventRow.js` usunięte eksport `eventMatches`, funkcja `normalize` i `require` `lodash`. Plik eksportuje tylko `DesktopEventRow`.
- **W 1.2.0, `desktop/shared/DesktopEventRow.js`:** karta Satel (`misc/module_1684.js`) pokazuje dla zdarzeń `HubEvent_Type.GRADE2` znak `module170.Grade2Solid` zamiast dzwonka. Wiersz robi to samo: `require` `../../enums/ExpanderInputType.js` i `../../misc/module_170.js`, a ikona to `{data.event.type === ExpanderInputType.HubEvent_Type.GRADE2 ? <module170.Grade2Solid width={12} height={12} fill={<kolor dzwonka>} /> : <dotychczasowy dzwonek>}`.
- **Pliki:** `i18n/pl.js`, `i18n/en.js`: klucz `device_table.search_events` (`"Szukaj w zdarzeniach…"` / `"Search events…"`) usunięty w 1.2.0-port.1.
- **Sprawdzenie:** na desktopie nad wierszami jest tylko pole Satel (przy centrali z `EventLogAdvancedFilters`). Wyszukanie przez nie zmienia wiersze na wynik z centrali. Wpis otwiera te same szczegóły co karta.

### 029. Panel boczny ze zwijanymi sekcjami
- **Platformy:** Linux, macOS (droga desktopowa)
- **Powód:** długa lista i „Usuń obiekt” wyglądające jak zwykła pozycja.
- **Plik:** `desktop/shared/DesktopSideMenu.js` (nowy, kopiuj bez zmian)
- **Plik:** `components/unnamed/module_843.js`, kotwica `hubSettingsMenu.groups.map`. Owiń w `{DesktopEditor.isDesktopEditor() ? <DesktopSideMenu2.DesktopSideMenu groups={hubSettingsMenu.groups} routeName={routeName} /> : <dotychczasowa lista>}`.
- **Sprawdzenie:** sekcja zwija się po kliknięciu nagłówka, a stan jest zapamiętany. „Usuń obiekt” jest oddzielone linią.
- **Od wpisu 041:** panel pokazuje grupy z `desktopMenuGroups.desktopGroups`, a stan zwinięcia jest zapisywany po `id` grupy.

### 030. Pomieszczenia z małym zdjęciem i tabela w pomieszczeniu
- **Platformy:** Linux, macOS (droga desktopowa)
- **Powód:** duże zdjęcia zajmowały większość ekranu.
- **Plik:** `components/HubChildTile.js`, kotwica `<RoomImage2.RoomImage`. Na desktopie zdjęcie 64×52 px w prawym górnym rogu (`position: "absolute"`), a kafelek ma styl `height: "auto", minHeight: 72, paddingBottom: 8, position: "relative", overflow: "hidden"`.
- **Plik:** `screens/RoomDashboardScreen.js`, kotwica `<PageHeader2.PageHeader title={tA.name} goBack={e} />`. Dodaj `actions` z przyciskiem `device_table.open_room_table`, który woła `navigateToDeviceTable` z `desktop/shared/navigateToDeviceTable.js`.
- **Plik:** `desktop/deviceTable/`: `roomId` w wierszu i filtr `params?.roomId`.
- **Pliki:** `i18n/pl.js`, `i18n/en.js`, klucz `device_table.open_room_table`.
- **Sprawdzenie:** ekran główny z małymi zdjęciami. Tabela z pomieszczenia pokazuje tylko jego urządzenia, ale tylko na zakładce, która je obejmuje.

### 031. macOS: ponowne otwarcie okna po jego zamknięciu
- **Platformy:** macOS
- **Powód:** po zamknięciu okna aplikacja zostaje w Docku, ale `window-all-closed` wyrejestrowywał protokół `app://` i czyścił `rendererUrl`. Kliknięcie w Dock kończyło się błędem „Renderer URL is not initialized”. To błąd oryginału, ujawniony dopiero na macOS.
- **Plik:** `src/main/main.js`
- **Kotwica:** `app.on("window-all-closed"`
- **Przed:**
  ```js
  deleteTshSettings();
  unregisterAppProtocol();
  ```
- **Po:**
  ```js
  deleteTshSettings();
  if (process.platform !== "darwin") {
    unregisterAppProtocol();
  }
  ```
- **Kotwica:** `function createMainWindow() {`
- **Zmiana:** na początku funkcji dodaj `closeConfirmed = false;`, żeby ponownie otwarte okno znów pytało przy zamykaniu.
- **W 1.2.0:** nowe odzyskiwanie renderera woła `mainWindow.webContents.loadURL(rendererUrl)`, więc zachowany `rendererUrl` jest potrzebny także tam. Kotwice bez zmian.
- **Sprawdzenie:** na macOS: zamknij okno, kliknij ikonę w Docku. Okno otwiera się bez błędu.
- **Od wpisu 039:** warunek `process.platform !== "darwin"` przy `unregisterAppProtocol()` usunięty (zamknięcie okna kończy aplikację także na macOS). Zostaje `closeConfirmed = false;` w `createMainWindow`.

### 032. Ekran powitalny w buildach Linux i macOS
- **Platformy:** Linux, macOS
- **Wprowadzone:** 1.2.0-port.1, oryginał 1.2.0
- **Powód:** proces główny 1.2.0 pokazuje okno powitalne z `process.resourcesPath/splash.jpg`. Plik jest tylko w `resources` builda Windows. Bez niego w `main.log` jest `Splash image missing` i nie ma ekranu powitalnego.
- **Kotwica w `src/main/main.js`:** `path.join(process.resourcesPath, "splash.jpg")`
- **Plik:** `lib-version.sh`
- **Zmiana:** stała `BW_ORIGINAL_RESOURCES="splash.jpg"` (pliki z `resources` oryginału czytane przez proces główny na każdej platformie) i funkcja `bw_copy_original_resources <katalog>`, która kopiuje je z `original/<oryginał>/win-build/BE WAVE Soft/resources`. Plik, którego oryginał nie ma (1.1.0), jest pomijany. Brak katalogu oryginału kończy build kodem 2.
- **Pliki:** `linux/build-linux.sh` (po `asar pack`: `bw_copy_original_resources "$OUT/resources" || exit 2`), `mac/build-mac.sh` (po skopiowaniu `bewave.icns`: `bw_copy_original_resources "$C/Resources" || exit 2`).
- **Pominięte celowo:** `bw-pro-desktop-app-ico*.ico` (czytane tylko na `win32`), `elevate.exe`, katalogi TSH `v*` (wpis 002), `app-update.yml` (wpis 003).
- **Sprawdzenie:** `resources/splash.jpg` w buildzie Linux i `Contents/Resources/splash.jpg` w `.app`. Po starcie w `main.log` nie ma `Splash image missing`.

### 033. Build: cel esbuild i wejście renderera
- **Platformy:** Linux, macOS
- **Wprowadzone:** 1.2.0-port.1, oryginał 1.2.0
- **Powód:** `tools/build-app.mjs` miał wpisane na stałe wejście `manifest[1812]` (moduł wejściowy 1.1.0; w 1.2.0 numer 1812 to inny moduł, a wejściem jest 1725) i cele `node22`, `chrome146` pod Electron 41.
- **Plik:** `tools/build-app.mjs`
- **Przed:**
  ```js
  outdir: dist, bundle: true, platform: 'node', format: 'cjs', packages: 'external', target: 'node22', logLevel: 'warning',
  ...
  entryPoints: { 'bundle.web': path.join(src, 'renderer', manifest[1812].path) },
  outdir: dist, bundle: true, platform: 'node', format: 'iife', target: 'chrome146', logLevel: 'warning', logLimit: 15,
  ```
- **Po:** stałe `kNodeTarget = 'node24'` i `kChromeTarget = 'chrome152'` (Electron 44.9.3: Node 24.22.0, Chrome 152.0.7977.167, odczytane `ELECTRON_RUN_AS_NODE=1 electron -p process.versions`). Wejście renderera szuka `rendererEntry()`: jedyny plik z `MANIFEST.json`, którego pierwsza linia pasuje do `^// module \d+ \(entry\)( |$)` (znacznik dopisuje `restructure.mjs` z `entryId` w `bundle.json`). Brak albo kilka takich plików przerywa build.
- **Przy kolejnym wydaniu:** po zmianie Electrona oryginału odczytaj `process.versions` i zmień obie stałe.
- **Sprawdzenie:** `linux/build-linux.sh <katalog>` kończy się `OK linux`. Ostrzeżenia esbuild są tylko w plikach, które ostrzegały w 1.1.0 (`enums/ExpanderInputType.js`, `logic/DiscoveredDevice.js`, `logic/ParseColorActionValue.js`, `duplicate-case`).

### 034. Build: grafiki Satel z TSH_soft.exe w `dist/tsh`
- **Platformy:** Linux, macOS
- **Wprowadzone:** 1.2.0-port.2, oryginał 1.2.0
- **Powód:** podgląd edytora ekranów klawiatury TSH (PROJEKT-TSH-EDYTOR.md) rysuje tła, czcionki i kolory motywów Satel. Zasoby są tylko w `TSH_soft.exe` (Delphi PE32, RT_RCDATA), którego nie dołączamy (wpis 002) i nie commitujemy.
- **Pliki:** nowy `tools/tsh-assets.mjs` (czytnik PE bez zależności, `readPeResources`, `extractTshAssets`, CLI `node tsh-assets.mjs <exe> <katalog>`, kod wyjścia 2 przy braku exe), `tools/build-app.mjs`, testy `test/unit/tshAssets/`.
- **Kotwica w `tools/build-app.mjs`:** `fs.cpSync(path.join(src, 'static'), dist, { recursive: true });`
- **Przed:** na tej linii kończył się plik.
- **Po:** zaraz za nią `extractOriginalTshAssets();`. Funkcja liczy wersję oryginału z `VERSION` (lub `BEWAVE_VERSION`) przed `-port`, szuka dokładnie jednego `work/original/<wersja>/win-build/BE WAVE Soft/resources/v*/TSH_soft.exe` (inaczej `throw` z komunikatem `FAIL tsh assets: ...`, czyli build się przerywa) i woła `extractTshAssets(exe, dist/tsh)`. Import: `import { extractTshAssets } from './tsh-assets.mjs';`.
- **Wynik w `dist/tsh/`:** `bg/BG_*.jpg` (12), `fonts/{ROBL,ROBT,WDGT}.ttf`, `themes.json` (24 motywy: `name`, `background`, `backgroundFile`, `colors` `cl1..cl3` jako `#rrggbb`, `raw` z `$BBGGRR`), `manifest.json` (wszystkie nazwy RCDATA i wyciągnięte pliki). Pozostałe zasoby (BB*, MSG_*, TFORM*) tylko na liście w manifeście.
- **Przy kolejnym wydaniu:** ścieżka `resources/v*` i nazwy zasobów mogą się zmienić; test na prawdziwym exe (12 teł, 24 motywy, magic czcionek) pokaże różnicę.
- **Sprawdzenie:** `npm --prefix tools test`; `build-linux.sh` lub `build-app.mjs <katalog>` daje `<katalog>/dist/tsh/`; z `BEWAVE_VERSION=9.9.9-port.1` build przerywa się komunikatem.

### 035. Edytor ekranów klawiatury TSH na desktopie
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** 1.2.0-port.2, oryginał 1.2.0
- **Powód:** TSH Soft działa tylko na Windows (wpis 001 ukrył „Edytuj ekrany”). Projekt: `PROJEKT-TSH-EDYTOR.md`, krok 3 (trasa, wejście i wyjście przez `YA`, lista ekranów i panel; bez pełnego podglądu). Zastępuje skutek wpisu 001 na drodze desktopowej. Na telefonie, tablecie i w oknie < 900 px wpis 001 obowiązuje bez zmian; przywracanie ustawień fabrycznych zostaje ukryte wszędzie. Blokada `.exe` (002) zostaje.
- **Pliki nowe (kopiuj bez zmian), `desktop/tshEditor/`:** `tshSettingsInput.js` (`buildTshSettingsInput(source, deps)`: obiekt wejścia TSH, ten sam co dawny argument `saveTshSettings`, te same klucze w tej samej kolejności; `tshLanguage`), `tshWidgetTypes.js` (tabela typów widżetów: nazwa, pola panelu, domyślne dane i ikony, rozmiar podglądu, źródło danych), `tshTemplates.js` (blok świeżego zapisu TSH dla TSH2 i TSG2, nowy ekran, nowy widżet), `tshEditorModel.js` (model edytora: wczytanie, operacje, walidacja, wynik dla `YA`), `tshBlobEncode.js` (koder wydzielony z `tshBlob.js`, który zostaje punktem wejścia), `tshAssets.js` (adresy `/tsh/...` i odczyt `themes.json`), `TshEditorRoute.js`, `TshScreenList.js`, `TshPropertyPanel.js`, `TshPreview.js`, `TshFormControls.js`. Testy: `test/unit/tshEditor/tshSettingsInput.test.js`, `tshWidgetTypes.test.js`, `tshEditorModel.test.js`, `tshEditorI18n.test.js`, pomocnik `test/support/tshEditorSupport.js`.
- **Plik:** `screens/KeypadSettingsScreen.js`
  - **Kotwica 1:** `window.electronAPI.saveTshSettings(JSON.stringify(objectSpread(objectSpread(objectSpread({` (budowa obiektu dla TSH, kończy się na `})));` po `devices: SA.filter(...)`).
  - **Przed:** w generatorze `WA = (0, asyncToGenerator.default)(regenerator.default.mark(function A() {` na początku `var e; var i; var o; var a; var l;`, na końcu (przed `}, A);`) `var r; var u;`; na poziomie modułu `var iA = { cs: "cz", nb: "no", sv: "se", el: "gr", uk: "ua" };`. Wyrażenie dokładnie jak w oryginale 1.2.0 (`work/deobfuscated/1.2.0/named/renderer/app/screens/KeypadSettingsScreen.js`, wiersze 375–517, md5 tych wierszy `10b0b925b5c4137aed330855c73db73d`). Przy każdym porcie porównaj je z nowym wydaniem i z `buildTshSettingsInput` w `tshSettingsInput.js` (klucze, kolejność, warunki); test `tshSettingsInput.test.js` pilnuje tej samej postaci JSON.
    <details><summary>Oryginalne wyrażenie (143 wiersze)</summary>

    ```js
                return window.electronAPI.saveTshSettings(JSON.stringify(objectSpread(objectSpread(objectSpread({
                  lang: (r = language, u = undefined, (u = iA[r == null ? undefined : r.toLowerCase()]) !== null && u !== undefined ? u : r)
                }, OA != null && (e = OA.keypadSettings) !== null && e !== undefined && e.data ? {
                  screens_config_base64: Buffer.from(OA == null || (i = OA.keypadSettings) === null || i === undefined ? undefined : i.data).toString("base64")
                } : {}), {}, {
                  keypad: {
                    model: (0, ExpanderInputType.keypadSettings_KeypadTypeToJSON)(OA == null || (o = OA.keypadSettings) === null || o === undefined ? undefined : o.keypadModel)
                  },
                  scenes: jA.map(function (item9) {
                    return {
                      scene_index: parseInt(item9.id, 16),
                      name: item9.name
                    };
                  })
                }, (OA == null || (a = OA.keypadSettings) === null || a === undefined ? undefined : a.screens) !== undefined ? {
                  screens: OA == null || (l = OA.keypadSettings) === null || l === undefined ? undefined : l.screens.map(function (item10) {
                    return {
                      screen_name: item10.name,
                      screen_type: (0, ExpanderInputType.keypadScreen_ScreenTypeToJSON)(item10.screenType),
                      screen_id: item10.guid,
                      screen_image: ""
                    };
                  })
                } : {}), {}, {
                  rooms: MA.filter(function (item11) {
                    return item11.devices.any;
                  }).map(function (item12) {
                    return objectSpread(objectSpread({}, item12.configNumber ? {
                      room_index: item12.configNumber
                    } : {}), {}, {
                      name: item12.name
                    });
                  }),
                  alarm_modes: alarms.map(function (item13) {
                    return {
                      name: item13.name,
                      alarm_mode_index: item13.alarm.isDefault ? 1 : parseInt(item13.alarm.id, 16)
                    };
                  }),
                  devices: SA.filter(function (item14) {
                    return !!item14.orderNumber;
                  }).map(function (item16) {
                    var u;
                    var m = [];
                    item16.sensors.forEach(function (item15) {
                      switch (item15.type) {
                        case ExpanderInputType.HubDeviceState_Sensor_Type.TEMPERATURE:
                          m.push({
                            name: t("hub-environmental-data.types.TEMPERATURE"),
                            config_index: 2,
                            unit: (0, getSensorValue.getSensorInfo)(item15.type).unit
                          });
                          break;
                        case ExpanderInputType.HubDeviceState_Sensor_Type.HUMIDITY:
                          m.push({
                            name: t("hub-environmental-data.types.HUMIDITY"),
                            config_index: 3,
                            unit: (0, getSensorValue.getSensorInfo)(item15.type).unit
                          });
                          break;
                        case ExpanderInputType.HubDeviceState_Sensor_Type.PRESSURE:
                          m.push({
                            name: t("hub-environmental-data.types.PRESSURE"),
                            config_index: 4,
                            unit: (0, getSensorValue.getSensorInfo)(item15.type).unit
                          });
                          break;
                        case ExpanderInputType.HubDeviceState_Sensor_Type.POWER_CONSUMPTION_CURRENT:
                          m.push({
                            name: t("hub-environmental-data.types.POWER_CONSUMPTION_CURRENT"),
                            config_index: 5,
                            unit: (0, getSensorValue.getSensorInfo)(item15.type).unit
                          });
                          break;
                        case ExpanderInputType.HubDeviceState_Sensor_Type.POWER_CONSUMPTION_TOTAL:
                          m.push({
                            name: t("hub-environmental-data.types.POWER_CONSUMPTION_TOTAL"),
                            config_index: 6,
                            unit: (0, getSensorValue.getSensorInfo)(item15.type).unit
                          });
                          break;
                        default:
                          return;
                      }
                    });
                    if (!(0, lodash.isNil)(item16.settings?.shutterValue)) {
                      m.push({
                        name: t("widgets.shutter.opening"),
                        config_index: 8,
                        unit: MeasurementUnit.MeasurementUnit.Percent
                      });
                    }
                    if (!(0, lodash.isNil)(item16.settings?.shutterInclinationValue)) {
                      m.push({
                        name: t("widgets.shutter.inclination"),
                        config_index: 9,
                        unit: MeasurementUnit.MeasurementUnit.Percent
                      });
                    }
                    if (!(0, lodash.isNil)(item16.settings?.heaterForcedValue)) {
                      m.push({
                        name: t("device.settings.desired_temperature"),
                        config_index: 13,
                        unit: MeasurementUnit.MeasurementUnit.Degree
                      });
                    }
                    if (!(0, lodash.isNil)(item16.settings?.inputValue)) {
                      m.push({
                        name: t("device.details.common.input_value"),
                        config_index: 1,
                        unit: MeasurementUnit.MeasurementUnit.Ohm
                      });
                    }
                    if (!(0, lodash.isNil)(item16.settings?.voltageSupply)) {
                      m.push({
                        name: t("device.details.common.voltage_supply"),
                        config_index: 10,
                        unit: MeasurementUnit.MeasurementUnit.Voltage
                      });
                    }
                    if (!(0, lodash.isNil)(item16.settings?.colorBrighteningValue)) {
                      m.push({
                        name: t("widgets.light.intensity"),
                        config_index: 14,
                        unit: MeasurementUnit.MeasurementUnit.Percent
                      });
                    }
                    return objectSpread(objectSpread(objectSpread(objectSpread(objectSpread({
                      dev_index: item16.orderNumber ? item16.orderNumber - 1 : 0,
                      name: item16.name
                    }, (0, lodash.isNil)(item16.settings?.violation) ? {} : {
                      has_input: 1
                    }), (u = item16.settings) !== null && u !== undefined && u.inputValue ? {
                      has_analog: 1
                    } : {}), (0, lodash.isNil)(item16.settings?.heaterWorkingMode) || item16.settings?.heaterWorkingMode !== 60 ? {} : {
                      has_thermostat: 1
                    }), (0, lodash.isNil)(item16.settings?.onOff) && (0, lodash.isNil)(item16.settings?.colorBrighteningValue) && (0, lodash.isNil)(item16.settings?.colorControl) && (0, lodash.isNil)(item16.settings?.shutterValue) && (0, lodash.isNil)(item16.settings?.heaterWorkingMode) ? {} : {
                      has_on_off: 1
                    }), m.length ? {
                      dev_values: m
                    } : {});
                  })
                })));
    ```
    </details>
  - **Po:**
    ```js
    return window.electronAPI.saveTshSettings(JSON.stringify(tshInput()));
    ```
    a przed `WA = (0, asyncToGenerator.default)(...)`:
    ```js
    function tshInput() {
      return (0, tshSettingsInput.buildTshSettingsInput)({
        language: language, keypadSettings: OA?.keypadSettings, scenes: jA, rooms: MA, alarms: alarms, devices: SA
      }, {
        t: t,
        sensorUnit: function (type) { return (0, getSensorValue.getSensorInfo)(type).unit; }
      });
    }
    function openTshEditor() {
      appNavigation.navigate(ScreenName.ScreenName.TshEditor, {
        input: tshInput(),
        onSave: function (content) { YA({ content: content }); }
      });
    }
    ```
    Zmienne `e, i, o, a, l, r, u` generatora i `iA` usunięte (mapa języków jest w `tshSettingsInput.js`). Importy: `var DesktopEditor = require("../logic/DesktopEditor.js");`, `var tshSettingsInput = require("../desktop/tshEditor/tshSettingsInput.js");`. Nazwy `OA`, `jA`, `MA`, `SA`, `YA` w nowym wydaniu mogą być inne: to stan ustawień klawiatury, sceny, pomieszczenia, urządzenia i handler odczytu `tsh-settings.json` (`addListenerTshSettings(YA, NA)`).
  - **Kotwica 2:** `modalHeader={t("device.keypad_settings.default_language")} /></module43.FormGroup>{values.keypadSettings?.screens && <WrapContainer2.WrapContainer`
  - **Po:** między `</module43.FormGroup>` a `{values.keypadSettings?.screens &&`:
    ```js
    {DesktopEditor.isDesktopEditor() && <View.default style={{ marginBottom: Spacing.Spacing._36 }}>
      <PageButtonTransparentWithBorder2.PageButtonTransparentWithBorder title={(0, ChangeUserLanguage.GetCurrentLanguage)() === ExpanderInputType.HubUserLanguage.LANG_IT ? "Modifica schermi" : t("device.keypad_settings.edit_screens")} color={GetHexColorTransparent.Color.primary500} onPress={openTshEditor} />
    </View.default>}
    ```
    To przycisk z bloku usuniętego we wpisie 001 (ten sam tytuł i styl), bez odnośnika przywracania ustawień fabrycznych, z `onPress={openTshEditor}` zamiast `wA()` (start TSH Soft).
- **Plik:** `logic/ScreenName.js`, kotwica `A.KeypadSettingsScreen = "KeypadSettingsScreen";`. Zaraz za nią `A.TshEditor = "TshEditor";`.
- **Plik:** `misc/module_2541.js`, kotwica `return <Title2.Title title="KeypadSettingsScreen" />;` (rejestracja trasy `KeypadSettingsScreen`). Za zamykającym `})} />` tej trasy dodaj trasę z tymi samymi opcjami: `<oe.Screen name={module55.ScreenName.TshEditor} component={TshEditorRoute2.TshEditorRoute} options={...modalOptions({ gestureEnabled: false }), ...getModalOpts(), headerTitle: () => <Title2.Title title="TshEditor" />} />`, import `var TshEditorRoute2 = require("../desktop/tshEditor/TshEditorRoute.js");` za `DeviceTableRoute2`.
- **Pliki:** `i18n/pl.js`, `i18n/en.js`, blok `tsh_editor` przed `automation: {` (136 kluczy, te same w obu plikach; inne języki dostają angielski przez `fallbackLng`).
- **Działanie:** „Edytuj ekrany” otwiera modal na całą szerokość (`modalMaxWidth="100%"`) z parametrami `{ input, onSave }`. Edytor dekoduje `screens_config_base64`; bez niego (albo z pustym) tworzy blok świeżego zapisu TSH (Abstract, wygaszacz, bez ekranów, id motywu 0). „Zapisz” jest aktywny tylko bez błędów walidacji; gdy uprawnienia ekranów centrali przeszłyby na inny ekran albo zniknęły, pyta (`confirmDialog`), bo `YA` przenosi uprawnienia po `guid === screen_id`; potem woła `onSave(content)`, czyli `YA({ content })`, i wraca. `content` = wejście + `screens` (wszystkie rekordy, także motyw i wygaszacz, `screen_image: ""`) + `screens_config_base64`. Zapis na centralę robi dalej przycisk „Zapisz” ustawień klawiatury (`SystemSetKeypadSettings`). „Anuluj” i X wychodzą bez zmian, z pytaniem przy niezapisanych zmianach (`usePreventLeave`).
- **Reguły modelu:** id ekranów zostają przy ekranach przy usuwaniu i zmianie kolejności; nowy ekran dostaje najniższy wolny id swojego zakresu (użytkownika od 33, dodatkowy 1–32); najwyżej 16 ekranów użytkownika i 38 rekordów; przy ekranach użytkownika najwyżej jeden główny, brak głównego tylko ostrzega i edytor go sam nie zmienia (główny staje się tylko pierwszy ekran użytkownika dodany do układu bez ekranów użytkownika, także przez zmianę typu; usunięcie głównego albo zmiana jego typu na dodatkowy przenosi znacznik na pierwszy ekran użytkownika; pole „Ekran główny” można odznaczyć); unikalne id; surowy rekord motywu musi mieć rozdzielczość modelu; odsyłacz musi wskazywać istniejący ekran dodatkowy albo „Powrót”. Rekordy i widżety, których kodek nie odczytał, są pokazane jako „nieobsługiwany”, bez edycji (tylko usunięcie) i zapisane bajt w bajt.
- **Poprawki po przeglądzie (wpis 035):**
  - Ostrzeżenie o uprawnieniach liczone względem listy ekranów centrali z wejścia (`input.screens`, tę samą listę `YA` dopasowuje po `guid === screen_id`), a nie względem id wczytanego bloku. `idChanges(state)` zwraca `changed` (wczytany ekran z nowym id, gdy centrala ma stary albo nowy id), `reused` (ekran niewczytany bierze id ekranu centrali, z `hubName`) i `removed` (ekran centrali, którego edytor nie pokazał, znika; ekranów usuniętych przez użytkownika nie powtarza). Bez `input.screens` nic (wtedy `YA` niczego nie przenosi). Nowe `hubScreens(input)`. Dotyczy „Utwórz nowe ekrany” i pustych danych centrali, gdzie wcześniej ostrzeżenie nigdy się nie pojawiało.
  - „Utwórz nowe ekrany” pyta najpierw (`confirmDialog`, `fresh_warning_title`, `fresh_warning` z listą `fresh_screen` ekranów centrali).
  - Ruling: brak ekranu głównego przy ekranach użytkownika to tylko ostrzeżenie `NO_MAIN_SCREEN` (`validate(state).warnings`, nie blokuje „Zapisz”), bo TSH Soft zapisywał takie bloki (próbki 004–043); więcej niż jeden główny zostaje błędem `MAIN_SCREEN_COUNT`.
  - Usunięcie ekranu i widżetu pyta w wierszu (`ConfirmRow` w `TshFormControls.js`, klucze `remove_screen_question`, `remove_widget_question`).
  - i18n: nowe `remove_screen_question`, `remove_widget_question`, `id_removed`, `fresh_warning_title`, `fresh_warning`, `fresh_screen`, `error.NO_MAIN_SCREEN`; `id_reused` z `{{hub}}`; `error.MAIN_SCREEN_COUNT` „Tylko jeden ekran może być ekranem głównym.” / „Only one screen can be the main screen.”.
  - Sprawdzenie: testy `tshEditorModel.test.js` „warns against the hub screen list…”, „reports nothing without a hub list…”, „hands YA content…” (kopia mapowania ekranów z `YA`: uprawnienia po `screen_id`, `screens_config_base64` dekoduje się do zakodowanego bloku), „allows no main screen with a warning…”.
- **Poprawki po drugim przeglądzie (wpis 035), pliki nasze, kopiuj bez zmian:**
  - `desktop/tshEditor/tshEditorModel.js`, ekran główny: wcześniej `ensureMain(records)` (pierwszy ekran użytkownika dostaje znacznik, gdy żaden go nie ma) szło bezwarunkowo po `addScreen`, `removeScreen` i `setScreenType`, więc układ wczytany bez ekranu głównego (np. próbka 041, 16 ekranów użytkownika) po dodaniu dowolnego ekranu, usunięciu albo zmianie typu dostawał po cichu główny ekran 33, a ostrzeżenie `NO_MAIN_SCREEN` znikało. Teraz:
    - `addScreen`: przed `records.splice(insertIndex(records, type), 0, record);` jest `var firstUser = type === "user" && countType(state, "user") === 0;`, a `ensureMain(records);` zastąpione przez `if (firstUser) { ensureMain(records); }`.
    - `removeScreen`: `next.blob.records.splice(index, 1); ensureMain(next.blob.records);` → `var removed = next.blob.records.splice(index, 1)[0]; if (isScreen(removed) && removed.type === "user" && removed.main) { ensureMain(next.blob.records); }`.
    - `setScreenType`: przed `var next = cloneState(state);` są `var wasMain = found.record.type === "user" && found.record.main;` i `var firstUser = type === "user" && countType(state, "user") === 0;`, a `ensureMain(records);` → `if (wasMain || firstUser) { ensureMain(records); }`.
    - `setMainScreen(state, uid, on)`: nowy trzeci argument; przy `on === false` tylko `screen.main = false;` (bez głównego zostaje ostrzeżenie `NO_MAIN_SCREEN`), w pozostałych przypadkach jak dotąd jedyny główny.
  - `desktop/tshEditor/TshPropertyPanel.js`, `ScreenProperties`: pole „Ekran główny” `<C.CheckField label={t("tsh_editor.main_screen")} value={screen.main} disabled={screen.main} onChange={function () { return apply(TshEditorModel.setMainScreen(state, screen.uid)); }} />` → bez `disabled`, `onChange={function (on) { return apply(TshEditorModel.setMainScreen(state, screen.uid, on)); }}`; główny ekran można odznaczyć.
  - `TshPropertyPanel.js`, `TshPropertyPanel`: `<WidgetList t={t} …/>` → `<WidgetList key={screen.uid} t={t} …/>`. Stan pytania o usunięcie widżetu (`removing`, indeks) nie przechodzi już na widżet o tym samym numerze innego ekranu (wcześniej po zmianie ekranu pytanie od razu stało przy jego widżecie i jedno kliknięcie go usuwało).
  - `tshEditorModel.js` `screenEntries`: `widgets: isScreen(r) ? r.widgets.length : 0` → `widgets: isScreen(r) ? r.widgets.length : null` (surowy rekord może mieć widżety, których kodek nie odczytał). `TshScreenList.js`: pytanie przy usuwaniu `text={t("tsh_editor.remove_screen_question", { name: recordName(entry, t), widgets: entry.widgets })}` → `text={entry.raw ? t("tsh_editor.remove_screen_question_raw", { id: entry.id }) : t("tsh_editor.remove_screen_question", { name: recordName(entry, t), widgets: entry.widgets })}`.
  - i18n, blok `tsh_editor`, za `remove_screen_question` nowy klucz `remove_screen_question_raw`: PL „Usunąć nieobsługiwany ekran {{id}} z całą zawartością (liczba widżetów nieznana)?”, EN „Remove unsupported screen {{id}} with all its contents (number of widgets unknown)?”. Blok `tsh_editor` ma teraz 184 klucze (136 + 1 tu + 5 z 036 + 35 i 7 z 037).
  - Sprawdzenie: testy `tshEditorModel.test.js` „keeps a layout without a main screen (sample 041)…” (dodanie ekranu dodatkowego, usunięcie, zmiana typu w obie strony: bez głównego, ostrzeżenie zostaje), „takes the main mark away on request…”, „makes main the first user screen of a layout without user screens…”, „lists a raw record by the type in its byte 17…” (`widgets: null`). W edytorze: odznaczenie „Ekran główny” pokazuje ostrzeżenie o braku ekranu głównego; „Usuń” przy widżecie 0 ekranu A, wybór ekranu B i jego widżetu 0: przycisk „Usuń”, nie pytanie.
- **Grafiki:** `themes.json` jest czytany z `/tsh/themes.json` (adres bezwzględny). Względny `tsh/...` nie działa: linking nawigacji zmienia ścieżkę strony (np. `app://renderer/HomeSettings/KeypadSettingsScreen`) i protokół `app://` zwraca 404; sprawdzone w zbudowanej aplikacji.
- **Sprawdzenie:** `npm --prefix tools test` (testy modelu odtwarzają próbki TSH 002, 004, 005, 023, 042, 044–047, 054, 060–067, 072, 081 tymi samymi operacjami); okno ≥ 900 px: ustawienia klawiatury pokazują „Edytuj ekrany”, < 900 px nie; edytor otwiera się, zmiana i „Zapisz” wracają do ustawień klawiatury ze zmienioną listą ekranów (log `console.log(e)` w `YA`), dopiero „Zapisz” ustawień wysyła je do centrali.

### 036. Edytor ekranów TSH: podgląd z grafikami Satel i wszystkie typy widżetów w panelu
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** 1.2.0-port.2, oryginał 1.2.0
- **Powód:** `PROJEKT-TSH-EDYTOR.md`, kroki 4 i 5: podgląd ekranu jak w TSH Soft (warstwa 3, „Wierność podglądu”) z przeciąganiem widżetów oraz pełna edycja każdego typu widżetu. Rozszerza wpis 035, kod Satel bez dalszych zmian: wszystkie pliki są nasze (katalog `desktop/tshEditor/` i blok `tsh_editor` w i18n).
- **Pliki nowe (kopiuj bez zmian):** `desktop/tshEditor/tshLayout.js` (czyste funkcje: metryki TSH2 i TSG2, szerokości tekstu Roboto Light z tabeli szerokości znaków, układ widżetu `widgetLayout`, przesunięcie X przy środkowaniu `centerShift`, pola i linie siatki, granice i przyciąganie przy przeciąganiu `dragPosition`, krok strzałek `nudgeDelta`, tło i kolory ekranu `screenBackground`/`screenColors`, motyw `themeOf`, lista glifów `WDGT` `ICON_CODES`); test `test/unit/tshEditor/tshLayout.test.js`.
- **Pliki zmienione (nasze, kopiuj bez zmian):**
  - `desktop/tshEditor/TshPreview.js`: ciało przepisane, propsy bez zmian (`state`, `screenUid`, `selectedWidget`, `themes`, `onSelectWidget`, `onMoveWidget`). Ekran rysowany w pikselach klawiatury (DOM, `transform: scale`), dopasowany do szerokości kolumny i wysokości okna, najwyżej ×2. Przeciąganie przez pointer events z `setPointerCapture`; `onMoveWidget` dopiero po puszczeniu przycisku (w trakcie tylko stan lokalny), więc jedno przeciągnięcie to jedna zmiana stanu. Klawisze na ramce z `tabIndex=0`: strzałki (Shift ×8), Esc odznacza.
  - `desktop/tshEditor/tshWidgetTypes.js`: pole `preview: {width, height}` (szacunek) zastąpione `look: "text" | "icon" | "indicator" | "rect"`; rozmiary są w `tshLayout.js`. Widżety czuwania (0x33, 0x34, 0x36, 0x37) dostały pole `field("states", "states", ["states"], { max: 0xffff })` (cztery ikony stanów z kolorami RGB, próbki 018–021); bity 0–1 „Stan” dalej ukryte (wpis 035).
  - `desktop/tshEditor/TshFormControls.js`: `IconField` (glif `WDGT` z kodem i siatką glifów do wyboru, do `max`; odsyłacz ma ikonę `u8`, więc tylko kody ≤ 0xff).
  - `desktop/tshEditor/TshPropertyPanel.js`: pola `icon` przez `IconField`, nowe pole `states` (ikona i kolor każdego stanu), „Do środka” woła `moveWidget` z `TshLayout.centerShift(...)` i potem `updateWidget({ center })`.
  - `desktop/tshEditor/tshAssets.js`: `TSH_FONT` (`TshIcons`, `TshRobotoLight`, `TshRobotoThin`) i `installTshFonts()` (jeden `<style id="tsh-editor-fonts">` z `@font-face` na `/tsh/fonts/WDGT.ttf`, `ROBL.ttf`, `ROBT.ttf`).
- **Pliki:** `i18n/pl.js`, `i18n/en.js`, blok `tsh_editor`. Za `preview_none` nowe klucze `preview_hint`, `icon_choose`, `state_n` (`Stan {{n}}` / `State {{n}}`), `state_color`; w `field` za `options` klucz `states` (`Stany` / `States`). Teksty `preview_hint`: PL „Kliknij widżet, aby go zaznaczyć; przeciągnij, aby przesunąć (z siatką przyciąga do pól, Alt wyłącza). Strzałki przesuwają o 1 px, z Shift o 8 px.”, EN „Click a widget to select it; drag to move it (with the grid on it snaps to the cells, Alt turns that off). Arrow keys move it by 1 px, with Shift by 8 px.”; `icon_choose` „Wybierz” / „Choose”; `state_color` „kolor” / „color”.
- **Reguły podglądu (zmierzone na `work/re-tsh/shots`, podgląd TSH w skali 0,6 od punktu 238/80):** TSH2: tekst Roboto Light 18 px (rozmiar 0) i 54 px (rozmiar 2), wysokość wiersza 1,17 em; ikony 76 px, kropki stanu 20 px; pasek stanu 53 px (tekst 28 px, ikony 40 px, ikona użytkownika 30 px); siatka 5×2 pól z marginesem i odstępem 20 px, linie w środku odstępów, przerwane na skrzyżowaniach; kropki stron na y 550 co 15 px, białe; wygaszacz: zegar Roboto Thin 294 px, sekundy 78 px. Widżet ze środkowaniem trzyma w X środek (próbka 049: 300 → 380 dla daty 160 px). Wartość pokazuje trzy cyfry z miejscami po przecinku („000”, „00.0”, „0.00”) i jednostkę; Data/czas bieżący czas w swoim formacie; Stan wyjścia „Tekst” tekst nieaktywny; Napad ikonę 0x105/0x106/0x107 według rodzaju; Informacja 0x11b; widżety ikon ikonę nieaktywną (`iconOff` albo `icons[0]`). Ekran z motywem i wygaszacz biorą kolory z rekordu motywu. **[P]** (bez zrzutu TSH): tekst 36 px dla rozmiaru 1, wzrost ikon i kropek z rozmiarem (×1, ×2, ×3), TSG2 jako połowa TSH2, przezroczystość prostokąta jako alfa = bajt/255, wygląd kropek stanu (pomieszczenie zielona otwarta kłódka 0x1fc, wejście 0x1e0, wyjście czerwona kropka), pasek stanu na ekranach dodatkowych.
- **Sprawdzenie:** `npm --prefix tools test` (testy `tshLayout.test.js`: szerokości tekstu z zrzutów, rozmiary, środkowanie z próbki 049, siatka z zrzutu `now.png`, granice przeciągania, przyciąganie, strzałki, tła); edytor na desktopie: wybór ekranu pokazuje podgląd w tle motywu, przeciągnięcie widżetu zmienia X/Y w panelu i nie wychodzi poza ekran, strzałki przesuwają o 1 px (Shift 8), przy siatce widżet przyciąga do pól; ikonę widżetu zmienia siatka glifów; podgląd TSG2 ma proporcje 480×272.

### 037. Edytor ekranów TSH: karta microSD (pokaz slajdów i własne tło z kadrowaniem)
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** 1.2.0-port.2, oryginał 1.2.0
- **Powód:** `PROJEKT-TSH-EDYTOR.md`, krok 6 („Karta microSD”): okno „Karta SD” jak `TFormSD` TSH Soft (pokaz slajdów `photo/imgN.jpg`) i tło ekranu „Z pliku…” z kadrowaniem jak `TFORMPICT` (`map/mapN.jpg`). Reguły z `TSH_soft.exe` (formularze TPF0, Ghidra) i z pliku TSH `work/re-tsh/sdout/photo/img1.jpg`, opis w `PROJEKT-TSH.md` 2.5. Pliki trafiają tylko do folderu wybranego przez użytkownika; nic nie idzie przez hub. Rozszerza wpisy 035 i 036; zmiana kodu Satel: dwa kanały IPC (proces główny i preload).
- **Pliki nowe (kopiuj bez zmian):**
  - `src/main/tshSdCard.js`: `registerTshSdHandlers(ipcMain, dialog, getWindow)` z kanałami `tsh-sd-choose-folder` (okno wyboru folderu; folder dopisany do zbioru folderów tej sesji), `tsh-sd-list(root, subdir)`, `tsh-sd-write(root, subdir, name, bytes)`, `tsh-sd-remove(root, subdir, name)`; `resolveSdPath` przepuszcza tylko folder z tej sesji, podkatalog `photo` z nazwami `img<1-4 cyfry>.jpg` i `map` z `map<1-4 cyfry>.jpg`, bez separatorów; podkatalog i plik obrazu będące dowiązaniem symbolicznym (albo nie zwykłym plikiem) są odrzucane przez `lstat` (`checkRealDir`, `checkRealFile`); zapis idzie do pliku tymczasowego `.<nazwa>.<pid>.<licznik>.tmp` w tym samym katalogu, otwartego z `O_CREAT | O_EXCL | O_NOFOLLOW`, w pętli aż do zapisania wszystkich bajtów, z `fsync`, i `rename` na nazwę docelową (rename zastępuje dowiązanie, nie pisze w jego cel); przy każdym błędzie plik tymczasowy jest usuwany, a stary plik docelowy zostaje; plik 1 B–16 MB.
  - `desktop/tshEditor/tshSdCard.js` (czyste funkcje): `slideRect` (reguła TSH), `photoNames`, `backgroundName`, `isCustomBackground`, `stripJpegMetadata` (usuwa APP1–APP15, Chromium dodaje APP2 z profilem sRGB), `cropInit`, `cropHit`, `cropMove`, `cropResize`, `SD_DIR`, `JPEG_QUALITY = 0.9`.
  - `desktop/tshEditor/tshImage.js`: dekodowanie przez `createImageBitmap` (JPG, BMP, PNG), `renderSlide` i `renderCrop` na canvas (`imageSmoothingQuality: "high"`), `canvasToJpeg` (`toBlob("image/jpeg", 0.9)` + `stripJpegMetadata`), `pickImageFiles` (ukryty `<input type=file>`).
  - `desktop/tshEditor/TshSdTools.js`: `TshSdWindow` (okno „Karta SD”: Dodaj, Usuń, Wyczyść, W lewo/W prawo, miniatury już przeskalowane, licznik, folder, „Zapisz na kartę SD”, pytanie o stare obrazy w `photo/` w oknie), `TshCropDialog` (kadrowanie), `chooseCardFolder`, `writeCardFile`.
  - Testy: `test/unit/tshEditor/tshSdCard.test.js`, `test/unit/tshMain/tshSdCard.test.js`.
- **Plik:** `src/main/main.js`
  - **Kotwica:** `ipcMain.handle("clear-tsh-settings", function () {` (blok `deleteTshSettings(); });`).
  - **Przed:** po `});` tego handlera następuje `ipcMain.handle("set-window-size", ...`.
  - **Po:** między nimi:
    ```js
    // TSH screens editor: microSD card pictures written only under a folder the user picked in this session.
    require("./tshSdCard").registerTshSdHandlers(ipcMain, dialog, function () {
      return mainWindow;
    });
    ```
    `dialog` to `electron.dialog` (`var dialog = electron.dialog;`), `mainWindow` okno główne z tej samej funkcji.
- **Plik:** `src/preload/preload.js`
  - **Kotwica:** `clearTshSettings: function () {` (`return i.invoke("clear-tsh-settings"); },`).
  - **Po:** za zamykającym `},` tej metody:
    ```js
    // TSH screens editor, microSD card pictures (main/tshSdCard.js).
    tshSdChooseFolder: function () {
      return i.invoke("tsh-sd-choose-folder");
    },
    tshSdList: function (root, subdir) {
      return i.invoke("tsh-sd-list", root, subdir);
    },
    tshSdWrite: function (root, subdir, name, bytes) {
      return i.invoke("tsh-sd-write", root, subdir, name, bytes);
    },
    tshSdRemove: function (root, subdir, name) {
      return i.invoke("tsh-sd-remove", root, subdir, name);
    },
    ```
    `i` to `electron.ipcRenderer` w tym pliku.
- **Pliki zmienione (nasze, kopiuj bez zmian):**
  - `desktop/tshEditor/tshEditorModel.js`: nowa operacja `setScreenImage(state, uid, image)` (tylko ekran użytkownika i dodatkowy bez motywu; błędy `SCREEN_TYPE`, `USES_THEME`), eksport w łańcuchu `exports.setSaverOption = exports.setScreenImage = ...`.
  - `desktop/tshEditor/tshLayout.js`: `screenBackground(screen, themeRecord, themes, customImages)` zwraca dodatkowo `url` (obraz z karty wykadrowany w tej sesji) i `missing` (nazwa pliku z karty, którego edytor nie ma); import `tshSdCard.js`.
  - `desktop/tshEditor/TshPreview.js`: prop `customImages`; tło `url(...)` z niego przed tłem motywu; pod podglądem napis `sd.bg_missing`, gdy obraz jest tylko na karcie.
  - `desktop/tshEditor/TshPropertyPanel.js`: `BackgroundField` przy wyłączonym „Używaj motywu”: „Bez obrazu” (`""`), tła wbudowane (po jednym na plik tła z `themes.json`, wartość `int://<nazwa>.jpg`), bieżący plik z karty, „Z pliku…” (wartość `*file`, woła `props.onCustomBackground(uid)`); prop `onCustomBackground` przekazywany z `TshPropertyPanel` do `ScreenProperties`.
  - `desktop/tshEditor/TshEditorRoute.js`: stan sesji `sd` (`folder`, `slides`, `backgrounds`), przycisk „Karta SD” obok „Anuluj”, `customBackground` (ostrzeżenie TSH przez `confirmDialog`, wybór pliku, okno kadrowania), `finishCrop` (JPEG 1024×600/480×272, nazwa `backgroundName(id)`, `setScreenImage`, zapis `map/<nazwa>` do folderu; bez folderu zapisze go okno „Karta SD”), zwalnianie adresów `blob:` przy zamknięciu.
- **Pliki:** `i18n/pl.js`, `i18n/en.js`, blok `tsh_editor`, przed `icon_choose` nowy blok `sd` (35 kluczy, te same w obu plikach): `button`, `title`, `slideshow`, `warning`, `add`, `remove`, `clear`, `left`, `right`, `count`, `empty`, `backgrounds`, `folder`, `folder_none`, `choose_folder`, `save`, `close`, `saved`, `save_failed`, `photo_exists`, `photo_delete`, `photo_keep`, `decode_failed`, `bg_label`, `bg_none`, `bg_file`, `bg_card`, `bg_warning_title`, `bg_warning` (PL dosłownie jak TSH: „Dodatkowe grafiki wymagają zapisania na karcie mikro SD i umieszczenia jej na stałe w czytniku w manipulatorze.”), `bg_missing`, `bg_saved`, `bg_later`, `crop_title` („Kadrowanie” / „Crop”), `crop_hint`, `ok`.
- **Reguły jak w TSH:** obraz pokazu szerszy niż ekran jest zmniejszany do szerokości ekranu z zachowaniem proporcji (wysokość `trunc(h·W/w)`), węższy zostaje w swoim rozmiarze; obraz jest środkowany (`div`, obcięcie do zera), nadmiar u góry i u dołu jest obcinany, reszta czarna; JPEG baseline, jakość 90, 4:2:0, tylko APP0 JFIF. Pliki pokazu `photo/img1.jpg`, `img2.jpg`… w kolejności listy, z pominięciem nazw już istniejących; gdy `photo/` ma już obrazy, edytor pyta, czy je usunąć (usuwa tylko `img*.jpg`). Tło: prostokąt o proporcjach ekranu, przesuwany myszą, róg prawy dolny zmienia rozmiar (większy z ruchów decyduje, najmniej ⅓ wysokości obrazu), wycinek rozciągany do rozdzielczości klawiatury; nazwa `map<id ekranu>.jpg` w `map/` (gdy zajęta, najniższy wolny numer), w polu obrazu ekranu sama nazwa pliku. Pliki `map/` z wcześniejszych sesji nie są usuwane (edytor ich nie ma; TSH czyści `map\*.jpg`).
- **Sprawdzenie:** `npm --prefix tools test`; edytor na desktopie: ekran bez motywu → „Obraz” → „Z pliku…” → ostrzeżenie, plik, kadrowanie, OK: pole obrazu `map33.jpg` (ekran id 33), podgląd z tym tłem, plik `<folder>/map/map33.jpg` 1024×600; „Karta SD” → Dodaj `work/re-tsh/imgs/slajd1.jpg` → Zapisz: `<folder>/photo/img1.jpg` 1024×600 o pikselach równych `work/re-tsh/sdout/photo/img1.jpg` z TSH (sprawdzone: różnica 0) i tych samych segmentach JPEG (APP0, 2×DQT, SOF0, 4×DHT, SOS). Kanały IPC odrzucają folder spoza tej sesji, inne nazwy, podkatalog będący dowiązaniem i plik `img1.jpg` będący dowiązaniem do pliku poza folderem (zapis i usunięcie zwracają błąd, cel dowiązania bez zmian) (`test/unit/tshMain/tshSdCard.test.js`).
- **Poprawki po przeglądzie (wpis 037):**
  - `src/main/tshSdCard.js`: `checkRealFile` i `writeFileNoFollow` (wyżej); `tsh-sd-remove` zwraca błąd dla dowiązania zamiast je pomijać.
  - `TshEditorRoute.js` `finishCrop`: po `await canvasToJpeg` stan jest czytany z `stateRef.current`, a `setScreenImage` idzie przez funkcję aktualizującą (`editorState[1](prev => ...)`), więc zmiany zrobione w trakcie kodowania JPEG zostają.
  - `TshSdTools.js` „Dodaj”: okno jest zajęte (`busy`) od wyboru plików do końca dekodowania, lista rozszerzana funkcją aktualizującą (`props.onChange(prev => ...)`; trasa przekazuje `sd[1]`), tak samo zapis wybranego folderu. Usunięty slajd nie wraca.
  - Bez zmian (jak TSH): po „Usuń stare” stare `img*.jpg` są usuwane przed zapisem nowych.
- **Poprawki po drugim przeglądzie (wpis 037):** `src/main/tshSdCard.js` `writeFileNoFollow` (plik nasz, kopiuj bez zmian).
  - Przed: nazwa `` `.${path.basename(file)}.${process.pid}.tmp` ``; `try { fs.writeSync(fd, bytes); } finally { fs.closeSync(fd); }`, potem `try { fs.renameSync(tmp, file); } catch (e) { fs.rmSync(tmp, { force: true }); throw e; }`. Jedno `writeSync` zapisuje czasem tylko część danych (prawie pełna karta, limit rozmiaru pliku) bez błędu: ucięty JPEG zastępował dobry plik, a zapis zgłaszał sukces. Błąd `writeSync` zostawiał plik tymczasowy, a ta sama nazwa z `O_EXCL` blokowała każdy kolejny zapis tego pliku (`EEXIST`) do restartu aplikacji.
  - Po: licznik modułu `let tmpCounter = 0;` i nazwa `` `.${path.basename(file)}.${process.pid}.${++tmpCounter}.tmp` ``; po `openSync` jeden `try`: pętla `while (off < bytes.length) { const n = fs.writeSync(fd, bytes, off, bytes.length - off); if (!(n > 0)) throw new Error(`short write to ${tmp}`); off += n; }`, `fs.fsyncSync(fd)`, `fs.closeSync(fd)` (`fd = null`), `fs.renameSync(tmp, file)`; `catch`: zamknięcie `fd`, jeśli jeszcze otwarty, `fs.rmSync(tmp, { force: true })`, `throw e`.
  - Sprawdzenie: `test/unit/tshMain/tshSdCard.test.js`, blok „write errors” (krótkie zapisy są kontynuowane; zapis, który staje, zwraca błąd i zostawia stary `img1.jpg`; błąd `writeSync` i `fsyncSync` nie zostawia pliku tymczasowego, a ponowny zapis się udaje; stary plik tymczasowy nie blokuje zapisu). Ręcznie: zapis 200 000 B przy `ulimit -f 100` zwraca `EFBIG`, stary plik bez zmian.
  - Trzecie review (poprawka do powyższej): nazwa tymczasowa zajęta przez plik z wcześniejszego uruchomienia jest pomijana (ponowne `openSync` z następnym licznikiem przy `EEXIST`, najwyżej 100 prób); `fd` jest zerowane przed `closeSync`, żeby nieudane zamknięcie nie zamykało drugi raz numeru, który mógł już dostać inny plik.
    - Przed: `let fd = fs.openSync(tmp, O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW, 0o644);` … `fs.fsyncSync(fd); fs.closeSync(fd); fd = null;`
    - Po: pętla `for (let attempt = 0; fd === null; attempt++) { tmp = …${++tmpCounter}.tmp; try { fd = fs.openSync(…); } catch (e) { if (e.code !== "EEXIST" || attempt >= 99) throw e; } }` … `fs.fsyncSync(fd); const f = fd; fd = null; fs.closeSync(f);`
    - Sprawdzenie: test „is not blocked by a temporary file left by an earlier run” przechodzi także uruchomiony sam (`node --test --test-name-pattern=…`).

### 038. Sterowanie pojedynczym wyjściem bez potwierdzenia
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** 1.2.0-port.2, oryginał 1.2.0
- **Powód:** decyzja użytkownika z 2026-11-14: okno „Potwierdź sterowanie” przy każdym przełączniku przeszkadza. Potwierdzenie zostaje tylko dla poleceń grupowych („Włącz wszystko”, „Wyłącz wszystko” itd.). Cofa część wpisu 026.
- **Plik:** `logic/CommandOnOffSwitch.js` (przywrócony tekst oryginału 1.2.0, `work/deobfuscated/1.2.0/named/renderer/app/logic/CommandOnOffSwitch.js`)
  - **Kotwica:** `onValueChange={async function () {`
  - **Przed:**
    ```js
    var DesktopConfirm = require("./DesktopConfirm.js");
    var i18nextMin = require("../../lib/i18next/i18next.min.js").default;
    ...
      return <module231.Switch style={module3025.default.switchButton} value={y} onValueChange={async function () {
        var e;
        if (!(await DesktopConfirm.confirmControl(i18nextMin.t(y ? "device_table.confirm_off" : "device_table.confirm_on")))) {
          return;
        }
        try {
    ```
  - **Po:**
    ```js
      return <module231.Switch style={module3025.default.switchButton} value={y} onValueChange={async function () {
        var e;
        try {
    ```
    (oba `require` usunięte).
- **Plik:** `components/CommandSwitchController.js` (przywrócony tekst oryginału 1.2.0)
  - **Kotwica:** `await onPress2(!value);`
  - **Przed:**
    ```js
    var DesktopConfirm = require("../logic/DesktopConfirm.js");
    ...
      e = async function () {
        if (!(await DesktopConfirm.confirmControl(label))) {
          return;
        }
        try {
    ```
  - **Po:**
    ```js
      e = async function () {
        try {
    ```
    (`require` usunięty).
- **Pliki:** `i18n/pl.js`, `i18n/en.js`, blok `device_table`: usunięte `"confirm_on": "Włączyć to urządzenie?"`, `"confirm_off": "Wyłączyć to urządzenie?"` (en `"Turn this device on?"`, `"Turn this device off?"`). Nic innego ich nie używało. `confirm_title`, `confirm_yes`, `confirm_no` zostają dla poleceń grupowych.
- **Plik:** `logic/DesktopConfirm.js` (nasz): tylko komentarz („group command”). `components/HeaderActionContainer.js` bez zmian (potwierdzenie z wpisu 026 zostaje).
- **Sprawdzenie:** `diff` obu plików z `work/deobfuscated/1.2.0/named` jest pusty; `grep -rn "confirm_on\|confirm_off" work/working/src` nic nie znajduje. Na desktopie (tylko użytkownik, nieszkodliwe wyjście): przełącznik na karcie i wiersz „Wyłączone/Włączone” w szczegółach sterują bez okna; „Wyłącz wszystko” w grupie nadal pyta.

### 039. Zamknięcie okna kończy aplikację także na macOS
- **Platformy:** Linux, macOS
- **Wprowadzone:** 1.2.0-port.2, oryginał 1.2.0
- **Powód:** decyzja użytkownika z 2026-11-14: X kończy aplikację na obu platformach. Na macOS aplikacja zostawała w Docku bez okien (oryginał: `if (process.platform !== "darwin") app.quit();`, wpis 031 zachowywał do tego protokół `app://`). Cofa pierwszą część wpisu 031.
- **Plik:** `src/main/main.js`
- **Kotwica:** `app.on("window-all-closed", function () {` (blok z `realmRecoveryInProgress`, `clearHlsDir`, `deleteTshSettings`)
- **Przed:**
  ```js
        try {
          clearHlsDir();
          deleteTshSettings();
          // On macOS the app stays in the Dock and needs the protocol to reopen its window.
          if (process.platform !== "darwin") {
            unregisterAppProtocol();
          }
        } catch (e) {
          log.error("window-all-closed cleanup failed:", e);
        }
        if (process.platform !== "darwin") {
          app.quit();
        }
  ```
- **Po:**
  ```js
        try {
          clearHlsDir();
          deleteTshSettings();
          unregisterAppProtocol();
        } catch (e) {
          log.error("window-all-closed cleanup failed:", e);
        }
        // Closing the window quits on every platform, macOS included (no Dock-only state).
        app.quit();
  ```
  Względem oryginału 1.2.0 jedyna różnica to `app.quit()` bez warunku platformy.
- **Sprawdzenie:** Linux i macOS: X → proces się kończy, na macOS ikona znika z Docka. Pytanie pojawia się tylko przy aktywnej osłonie niezapisanych zmian (`usePreventLeave`, renderer `components/unnamed/module_1882.js`, `getPreventLeaveCloseGuard`); bez niej renderer od razu woła `confirm-app-close`. Odmowa w tym pytaniu zostawia okno.

### 040. „Zakończ” bez błędu „Renderer URL is not initialized”
- **Platformy:** Linux, macOS (błąd widoczny na macOS)
- **Wprowadzone:** 1.2.0-port.2, oryginał 1.2.0
- **Powód:** „Zakończ” (menu aplikacji, Docka, `Cmd+Q`) pokazywało „Uncaught Exception: Error: Renderer URL is not initialized at createMainWindow … from an EventEmitter listener”. `before-quit` po 400 ms wyrejestrowywał protokół (zeruje `rendererUrl`) i wołał `app.quit()`, ale okno blokuje każde zamknięcie, dopóki renderer nie potwierdzi (`closeConfirmed`), więc zakończenie było anulowane. Renderer potwierdza od razu, chyba że osłona niezapisanych zmian (`usePreventLeave`) pyta użytkownika. Na macOS okno zamykało się wtedy bez końca aplikacji, a `activate` wołał `createMainWindow()` bez `rendererUrl`; przy odmowie w pytaniu okno zostawało bez protokołu. Błąd oryginału (macOS nie był celem Satel).
- **Plik:** `src/main/main.js`
  - **Kotwica:** `app.on("before-quit", function (e) {` (blok `setTimeout(function () { … }, 400);`)
  - **Przed:**
    ```js
            setTimeout(function () {
              clearHlsDir();
              unregisterAppProtocol();
              app.quit();
            }, 400);
    ```
  - **Po:**
    ```js
            // The app:// protocol stays until will-quit: the window may still cancel this quit.
            setTimeout(function () {
              clearHlsDir();
              app.quit();
            }, 400);
    ```
    Protokół wyrejestrowują dalej `window-all-closed` (wpis 039) i `will-quit` (oryginał), oba dopiero po zamknięciu okna.
  - **Kotwica:** `mainWindow.webContents.send("app-close-request");` (w `mainWindow.on("close", …)`)
  - **Przed:**
    ```js
          if (!closeConfirmed) {
            e.preventDefault();
            mainWindow.webContents.send("app-close-request");
          }
    ```
  - **Po:**
    ```js
          if (!closeConfirmed) {
            e.preventDefault();
            // A quit blocked here is cancelled: the next quit runs its cleanup again.
            quitCleanupDone = false;
            mainWindow.webContents.send("app-close-request");
          }
    ```
  - **Kotwica:** `app.on("activate", function () {`
  - **Przed:**
    ```js
          app.on("activate", function () {
            if (BrowserWindow.getAllWindows().length === 0) {
              createMainWindow();
            }
          });
    ```
  - **Po:**
    ```js
          app.on("activate", function () {
            // No new window while quitting (the protocol is gone then) or during realm recovery.
            if (quitCleanupDone || realmRecoveryInProgress || !rendererUrl) {
              return;
            }
            if (BrowserWindow.getAllWindows().length === 0) {
              createMainWindow();
            }
          });
    ```
- **Przebieg po zmianie:** „Zakończ” → `before-quit` (`quitCleanupDone = true`, `stop-all-rtsp`, 400 ms) → `app.quit()` → okno blokuje zamknięcie (`quitCleanupDone = false`, `app-close-request`). Renderer potwierdza od razu albo, przy niezapisanych zmianach, po zgodzie → okno się zamyka → `window-all-closed` (sprzątanie, wyrejestrowanie, `app.quit()`) → `before-quit` (400 ms) → `will-quit` → koniec. Odmowa w pytaniu → okno działa dalej z `rendererUrl` (`Ctrl/Cmd+R` i odzyskiwanie renderera działają). `createMainWindow` nadal rzuca przy braku `rendererUrl`, ale jedyne miejsca wywołania to start (`whenReady` po rejestracji) i `activate` z nowym warunkiem.
- **Poprawki po przeglądzie (wpis 040):**
  - Gałąź Windows Hello w `mainWindow.on("close")` też anuluje zakończenie. Przed: `if (passportController.isOperationInProgress()) { e.preventDefault(); passportController.showCloseWarning(); return; }`. Po: `if (passportController.isOperationInProgress()) { e.preventDefault(); quitCleanupDone = false; passportController.showCloseWarning(); return; }` (z komentarzem jak w gałęzi `closeConfirmed`).
  - Kotwica `function unregisterAppProtocol() {`. Przed: od razu `try { protocol.unhandle("app"); } catch (e) { log.error("Renderer protocol unhandle failed:", e); } rendererUrl = null;`. Po: na początku `if (!rendererUrl) { return; }` (komentarz: drugi wywołujący to `will-quit` po `window-all-closed`). `rendererUrl` jest ustawiany zaraz po `registerAppProtocol()` w `whenReady`, więc brak `rendererUrl` znaczy brak rejestracji.
- **Sprawdzenie:** `node --check src/main/main.js`. macOS: `Cmd+Q` → aplikacja kończy się bez okna wyjątku. Odmowa: najpierw ekran z `usePreventLeave` ze zmianą (np. edytor ekranów TSH albo edytor rutyny), `Cmd+Q` → odmów → `Cmd+R` przeładowuje okno, ponowne `Cmd+Q` → zgoda kończy aplikację. Linux: X i menu bez zmian, w `main.log` brak `Renderer URL is not initialized` i `Renderer protocol unhandle failed`.

### 041. Panel boczny: grupy „Podsumowanie”, „Konfiguracja”, „Ustawienia”
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** 1.2.0-port.2, oryginał 1.2.0
- **Powód:** decyzja użytkownika z 2026-11-14: przegrupowanie panelu bocznego, bez zużycia energii, danych środowiskowych, monitoringu i mojego profilu. `useHubSettingsMenu` i droga mobilna bez zmian; przegrupowanie tylko w `DesktopSideMenu` (wpis 029). Przepis 25.
- **Plik:** `desktop/shared/desktopMenuGroups.js` (nowy, kopiuj bez zmian): `desktopGroups(groups, t)` spłaszcza pozycje wszystkich grup i rozkłada je po `screen`:
  - `summary` („Podsumowanie”, `hub-settings.summary`): `GroupComponent`, `EventLogList`;
  - `configuration` („Konfiguracja”, `device_table.menu_configuration`): `HubConfiguration`, `ScheduleList`, `Integrations`, `EmailConfigScreen`, `HomeUsers`, `SatelTokenKey`, potem pozycje bez `screen` w kolejności oryginału (Dane instalatora, Edytuj obiekt, Usuń obiekt);
  - `settings` („Ustawienia”, `hub-settings.settings`): pozostałe pozycje z `screen` poza ukrytymi (dziś `HubPresenceSimulation`, `HubDiagnostics`);
  - ukryte: `HubPowerConsumption`, `HubEnvironmentalData`;
  - przeniesione (`MOVED_SCREENS`): `HubMonitoring` znika tylko, gdy jest pozycja `Integrations` (wiersz z wpisu 042), a `UserProfile` tylko, gdy jest `HomeUsers`. Pozycja Integracja wymaga roli administratora (`useHubSettingsMenu`: `role === UserRole.ADMIN`), Monitoring tylko `MonitoringConfiguration === Full`; Użytkownicy wymagają `UsersConfiguration`, Mój profil nie. Bez pozycji-gospodarza Monitoring i Mój profil zostają w „Konfiguracji” zaraz za miejscem gospodarza (`CONFIGURATION_SCREENS`: `HubConfiguration`, `ScheduleList`, `Integrations`, `HubMonitoring`, `EmailConfigScreen`, `HomeUsers`, `UserProfile`, `SatelTokenKey`);
  - grupy bez pozycji są pomijane. Uprawnienia: pozycje przychodzą już przefiltrowane przez `hasPermission` w `useHubSettingsMenu`.
- **Plik:** `desktop/shared/DesktopSideMenu.js` (nasz, kopiuj bez zmian)
  - **Przed:**
    ```js
    var Color = GetHexColorTransparent.Color;
    var STORAGE_KEY = "sideMenu.collapsed";
    ...
      var toggle = function (title) {
        var next = Object.assign({}, state[0], {
          [title]: !state[0][title]
        });
    ...
      return <View>{props.groups.map(function (group) {
          var title = group.info.title;
          var collapsed = !!state[0][title];
          return <View key={title}><module63.PressableOpacity accessibilityState={{
              expanded: !collapsed
            }} onPress={function () {
              return toggle(title);
            }}>
    ```
  - **Po:**
    ```js
    var desktopMenuGroups = require("./desktopMenuGroups.js");
    var Color = GetHexColorTransparent.Color;
    // Collapsed state per group id (stable across languages).
    var STORAGE_KEY = "sideMenu.collapsed";
    ...
      var toggle = function (id) {
        var next = Object.assign({}, state[0], {
          [id]: !state[0][id]
        });
    ...
      return <View>{desktopMenuGroups.desktopGroups(props.groups, t).map(function (group) {
          var title = group.title;
          var collapsed = !!state[0][group.id];
          return <View key={group.id}><module63.PressableOpacity accessibilityState={{
              expanded: !collapsed
            }} onPress={function () {
              return toggle(group.id);
            }}>
    ```
    Stare wpisy `sideMenu.collapsed` po tytułach są ignorowane (grupy raz rozwinięte). Oddzielenie „Usuń obiekt” bez zmian (po tytule).
- **Pliki:** `i18n/pl.js`, `i18n/en.js`, blok `device_table`, za `menu`: `"menu_configuration": "Konfiguracja"` / `"Configuration"`.
- **Test:** `test/unit/desktop/desktopMenuGroups.test.js` (także: bez Integracji Monitoring zostaje za Harmonogramami; bez Użytkowników Mój profil zostaje za Ustawieniami e-mail).
- **Poprawka po przeglądzie:** pierwsza wersja zawsze ukrywała `HubMonitoring` i `UserProfile` (lista `HIDDEN_SCREENS`), więc użytkownik bez roli administratora, ale z uprawnieniem monitoringu, tracił Monitoring na desktopie. Teraz `withoutMoved(items)` usuwa je tylko przy obecnej pozycji-gospodarzu.
- **Sprawdzenie:** `npm --prefix work/working/tools test`. Okno ≥ 900 px: trzy grupy w kolejności Podsumowanie, Konfiguracja, Ustawienia, pozycje jak wyżej, brak „Zarządzania obiektem”; zwinięcie grupy przetrwa restart i zmianę języka. Okno < 900 px: menu oryginału.

### 042. „Monitoring” w Integracji i „Mój profil” w Użytkownikach
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** 1.2.0-port.2, oryginał 1.2.0
- **Powód:** decyzja użytkownika z 2026-11-14: Monitoring i Mój profil znikają z panelu bocznego (wpis 041) i są dostępne z ekranów, do których należą. Przepis 25.
- **Plik:** `logic/IntegrationsScreen.js`
  - **Kotwica:** `title={A("hub-settings.integrations")}`
  - **Przed:**
    ```js
    var hubVirtualDevicesChangeListener = require("./hubVirtualDevicesChangeListener.js");
    ...
      var I = (0, hubVirtualDevicesChangeListener.hubInfoChangeListener)();
      return <module60.SafeAreaProvider><module32.Page title={A("hub-settings.integrations")} goBack={appNavigation.goBack} isModal={PlatformConstants.isWeb}>{I != null && (e = I.info) …
    ```
  - **Po:**
    ```js
    var hubVirtualDevicesChangeListener = require("./hubVirtualDevicesChangeListener.js");
    var react = require("../../lib/react/react.reexport.js");
    var DesktopEditor = require("./DesktopEditor.js");
    var usePermissionGuard = require("../hooks/usePermissionGuard.js");
    ...
      var I = (0, hubVirtualDevicesChangeListener.hubInfoChangeListener)();
      // Desktop: Monitoring left the side menu and opens from here, with the menu item's permission.
      var desktopPath = (0, react.useRef)(DesktopEditor.isDesktopEditor()).current;
      var permissionGuard = (0, usePermissionGuard.usePermissionGuard)();
      var showMonitoring = desktopPath && permissionGuard.MonitoringConfiguration === usePermissionGuard.ResourceAccess.Full;
      return <module60.SafeAreaProvider><module32.Page title={A("hub-settings.integrations")} goBack={appNavigation.goBack} isModal={PlatformConstants.isWeb}>{showMonitoring && <ActionButton2.ActionButton title={A("hub-settings.monitoring")} onPress={function () {
            appNavigation.navigate(ScreenName.ScreenName.HubMonitoring);
          }} />}{I != null && (e = I.info) …
    ```
- **Plik:** `screens/HubUsersScreen.js`
  - **Kotwica:** `title={A("hub-settings.users")}`, `<TabsListSelector.TabsList`
  - **Przed:**
    ```js
    var PlatformConstants = require("../logic/PlatformConstants.js");
    ...
      var themeStyle = (0, useThemeStyle.useThemeStyle)(module3402.default);
      return <jsxRuntime.Fragment><module32.Page … marginBottomByScreenType={MarginBottomByScreenType.MarginBottomByScreenType.PageWithNavigationBar}><TabsListSelector.TabsList tabs={…
    ```
  - **Po:**
    ```js
    var PlatformConstants = require("../logic/PlatformConstants.js");
    var react = require("../../lib/react/react.reexport.js");
    var DesktopEditor = require("../logic/DesktopEditor.js");
    var usePermissionGuard = require("../hooks/usePermissionGuard.js");
    var ActionButton2 = require("../logic/ActionButton.js");
    var module21 = require("../misc/module_21.js");
    ...
      var themeStyle = (0, useThemeStyle.useThemeStyle)(module3402.default);
      // Desktop: My profile left the side menu and opens from here, with the menu item's permission.
      var desktopPath = (0, react.useRef)(DesktopEditor.isDesktopEditor()).current;
      var permissionGuard = (0, usePermissionGuard.usePermissionGuard)();
      var appNavigation = (0, module21.useAppNavigation)();
      var showProfile = desktopPath && permissionGuard.None === usePermissionGuard.ResourceAccess.Full;
      return <jsxRuntime.Fragment><module32.Page … marginBottomByScreenType={MarginBottomByScreenType.MarginBottomByScreenType.PageWithNavigationBar}>{showProfile && <ActionButton2.ActionButton title={A("hub-settings.my_profile")} onPress={function () {
            appNavigation.navigate(ScreenName.ScreenName.UserProfile);
          }} />}<TabsListSelector.TabsList tabs={…
    ```
- **Uprawnienia:** te same co pozycje w `useHubSettingsMenu`: Monitoring `permissionGuard.MonitoringConfiguration === ResourceAccess.Full`, Mój profil `permissionGuard.None === ResourceAccess.Full`. Ekran Integracja widzi tylko administrator, a Użytkowników tylko konto z `UsersConfiguration`; pozostali mają Monitoring i Mój profil nadal w panelu bocznym (wpis 041, `MOVED_SCREENS`).
- **Sprawdzenie:** okno ≥ 900 px: Integracja → pierwszy wiersz „Monitoring ›” otwiera ekran monitoringu, „Wstecz” wraca do Integracji; Użytkownicy → „Mój profil ›” nad zakładkami otwiera profil. Okno < 900 px: oba ekrany jak w oryginale.

### 043. Sygnał radiowy na kafelkach urządzeń w pomieszczeniu
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** 1.2.0-port.2, oryginał 1.2.0
- **Powód:** decyzja użytkownika z 2026-11-14: kafelek urządzenia bezprzewodowego (użytkownik: „ABAX”) w widoku pomieszczenia pokazuje „Sygnał 45%” z tą samą kolorową ikoną co szczegóły urządzenia, a bez łączności czerwone „Brak połączenia”. Przepis 26.
- **Rozpoznanie urządzenia:** `data.product === HubDeviceProduct.BE_WAVE`; wiersz „Brak połączenia”, gdy `errorCodes` zawiera kod połączenia (także bez `settings.signal`), w przeciwnym razie wiersz sygnału, gdy `settings.signal` jest różne od `undefined`/`null`. Poprawka po przeglądzie: pierwsza wersja nie pokazywała nic, gdy urządzenie bez łączności nie miało wartości `signal`. Szczegóły (`DeviceCommonSharedDetails`) pokazują sygnał przy `signal` różnym od `nil`, a dla `BUS_DEVICE` (moduły przewodowe i ich wejścia) używają `SignalExpanders` zamiast `Signal`; `EXTERNAL` to kamery. Brak łączności: `errorCodes` zawiera `StructureContainer.ConnectionErrorCodes` (`CONNECTION_FAILURE`, `CONNECTION_DISCONNECTED`), ten sam warunek co w `Signal`.
- **Pliki nowe (kopiuj bez zmian):** `desktop/shared/deviceSignal.js` (`signalRowState(data, deviceState, connectionErrorCodes)`), `desktop/shared/DesktopSignalRow.js` (`ValueWithLabel` z `device.details.common.signal` i wartością `Signal` albo czerwonym tekstem `device_table.no_connection` z czerwoną ikoną `wifi` przez `StatusValueWithLabel`); test `test/unit/desktop/deviceSignal.test.js`.
- **Plik:** `components/DeviceControlCard.js` (współdzielony, zmiana tylko dodatkowa)
  - **Kotwica:** `{!!j && j}</Card2.Card>`
  - **Przed:**
    ```js
    var CameraRetryProvider2 = require("../services/CameraRetryProvider.js");
    ...
      var autoPlay = props.autoPlay;
    ...
              })} />}{!!j && j}</Card2.Card>
    ```
  - **Po:**
    ```js
    var CameraRetryProvider2 = require("../services/CameraRetryProvider.js");
    var DesktopSignalRow2 = require("../desktop/shared/DesktopSignalRow.js");
    ...
      var autoPlay = props.autoPlay;
      // Desktop room view only (prop set by RoomDashboardScreen); without it the card is unchanged.
      var showSignal = props.showSignal;
    ...
              })} />}{!!j && j}{showSignal && <DesktopSignalRow2.DesktopSignalRow data={R.data} deviceState={deviceState} />}</Card2.Card>
    ```
- **Plik:** `logic/DevicesControlCardList.js`
  - **Kotwica:** `autoPlay={props.autoPlay} key={(0, GetDeviceKey.GetDeviceKey)(item.key)}`
  - **Przed:** `autoPlay={props.autoPlay} key=…`
  - **Po:** `autoPlay={props.autoPlay} showSignal={props.showSignal} key=…`
  - `DevicesControlGroupCard` przekazuje swoje propsy do listy (`objectSpread({}, props)`), a `VisibleConfig.DevicesControlWidget` do obu, więc bez dalszych zmian.
- **Plik:** `screens/RoomDashboardScreen.js`
  - **Kotwica:** `<VisibleConfig.DevicesControlWidget data={item5.data} schedules={iA} fullScreen={false} showHeader={true} isGroupControlEnabled={true}`
  - **Przed:** `… isItemVisible={t} onCollapseScrollTo={callback} />`
  - **Po:** `… isItemVisible={t} onCollapseScrollTo={callback} showSignal={DesktopEditor.isDesktopEditor()} />`
- **Pliki:** `i18n/pl.js`, `i18n/en.js`, blok `device_table`, za `menu_configuration`: `"no_connection": "Brak połączenia"` / `"No connection"` (Satel nie ma takiego tekstu; `error-codes.CONNECTION_DISCONNECTED` to „Offline”).
- **Dane:** te same co ekran szczegółów (`toHubComponent`: `signal` z `deviceState.settings`, `errorCodes` ze stanu), czytane przez kartę i tak (`hubDeviceStructureChangeListener`, `useDeviceState`). Bez zapytań do centrali.
- **Sprawdzenie:** `npm --prefix work/working/tools test`. Okno ≥ 900 px, pomieszczenie „Dach”: kafelek czujki radiowej ma na dole „Sygnał 45%” z ikoną w kolorze jak w szczegółach; urządzenie offline: czerwone „Brak połączenia”; wejście modułu przewodowego i kamera bez wiersza. Ulubione na pulpicie i okno < 900 px: bez wiersza.

### 044. Edytor TSH: metryki podglądu z tabeli TSH Soft (TSH2 i TSG2)
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** niewydane (po 1.2.0-port.2), oryginał 1.2.0
- **Powód:** plan `docs/plans/2026-11-14-tsh-editor-redesign.md`, RC1: na INT-TSG2 podgląd brał połowę rozmiarów TSH2 (ikona dużej wielkości 114 px zamiast 84, tekst mały 9 px zamiast 12), a TSH2 średnie i duże rozmiary ×2/×3. Rozmiary są teraz z tabeli TSH Soft (`FUN_00ab0cd4`) i stałych paska stanu (`FUN_00aa7fe4`), opis w `PROJEKT-TSH.md` 2.6. Rozszerza wpis 036; kod Satel bez zmian.
- **Plik nowy (kopiuj bez zmian):** `desktop/tshEditor/tshMetrics.js`: `TSH2_METRICS`, `TSG2_METRICS` (zamrożone), `metricsFor(width, height)` (tabela TSG2 dla szerokości ≤ 800 jak w TSH, inaczej TSH2; zwraca nowy obiekt z `width`, `height`), `TSG2_MAX_WIDTH = 800`; test `test/unit/tshEditor/tshMetrics.test.js`.
- **Wartości:** TSH2 tekst `[18, 33, 54]`, ikona `[77, 115, 180]`, wskaźnik `[20, 36, 52]`, pasek 52, nazwa i zegar 26 px od y 10, ikona użytkownika 30 px w `(W − 60, 7)`, zegar kończy się na `W − 90`, ikony stanu 40 px od x 4 co 60, y 4, kropki 12 px + 2, siatka margines 20, zegar wygaszacza 256 / sekundy 77, `unknownBox` 48, `snapDistance` 10. TSG2 tekst `[12, 15, 25]`, ikona `[36, 54, 84]`, wskaźnik `[10, 16, 24]`, pasek 26, 13 px od y 7, ikona użytkownika 15 px, ikony stanu 20 px co 30 (rysowane dopiero zgodnie z wpisem 045), kropki 6 + 2, zegar 120 / 36, `unknownBox` 24, `snapDistance` 5.
- **Plik:** `desktop/tshEditor/tshLayout.js` (nasz)
  - **Przed:** stałe `TSH2_METRICS` (zmierzone na zrzutach, m.in. `font: [18, 36, 54]`, `icon: [76, 152, 228]`, `lineHeight: 1.17`, `bar: 53`, `barIconX`, `barClockRight`, `dotsY`, `clockSpacing`), `RESOLUTION_SCALE = { 1024: 1, 480: 0.5 }`, `metricsFor` mnożący TSH2 przez skalę, eksporty `UNKNOWN_BOX = 48` i `SNAP_DISTANCE = 10` (mnożone przez `m.scale`); wysokość tekstu `Math.round(font * m.lineHeight)`, ramka ikony i wskaźnika `em × em`; pola siatki ułamkowe z `gridGap`.
  - **Po:** `exports.metricsFor = TshMetrics.metricsFor`; nowe `textHeight(px) = round(1946·px/2048) + round(512·px/2048)` (GDI `TextHeight` Roboto z `usWinAscent/usWinDescent`) i `glyphBox(em) = { width: round(1000·em/1000), height: round(1004·em/1000) }` (`TextWidth("1") × TextHeight("1")` czcionki `WDGT`); `widgetLayout` bierze `m.unknownBox`, `glyphBox(m.indicator[s])`, `glyphBox(m.icon[s])`, `textHeight(font)`; `snapToGrid` bierze `m.snapDistance`; `gridCells` jak `FUN_00aa0288`: `cellW = floor((W − 6·20) / 5)`, `cellH = floor((H − bar − 3·20) / 2)`, odstęp = margines (TSH2 pola 180×244 od 20/72, linie x 210, 410, 610, 810, y 326; TSG2 72×93, linia y 149).
- **Plik:** `desktop/tshEditor/TshPreview.js` (nasz): pola zmierzone zastąpione wartościami z kodu TSH. Pasek: tekst od `m.barTop` z wysokością `textHeight(m.barFont)`, pogrubienie 700 (było 600), zegar `right: 3 * m.barUser`, ikona użytkownika `left: m.width - 2 * m.barUser, top: m.barUserY`, ikony stanu `left: m.barIconLeft + i * m.barIconPitch, top: m.barIconY`. Kropki: odstęp `m.dotFont + m.dotGap`, początek `(W − n·odstęp) / 2`, góra `H − bar − odstęp / 2`, średnica `m.dotFont`. Wygaszacz: ikony od `(W − 4·pitch) / 2 + barIconLeft`, `hh:mm` na środku od `floor((H − textHeight(clockFont)) / 2) − bar + clockDrop`, sekundy w `(round(W·0,83), round(H·0,45))`. Tekst widżetu: `span` z `position: absolute; left: 0; top: 0; display: block` (jako element liniowy siedział na linii domyślnej czcionki ramki i był o ~3 px za nisko).
- **Plik:** `desktop/tshEditor/TshPropertyPanel.js` bez zmian (woła `TshLayout.metricsFor`).
- **Narzędzie (bez wpływu na aplikację):** `work/working/tools/tsh-preview-compare.mjs` z `tsh-preview-harness.js`, `tshCompareCore.mjs`, `tsh-compare-cases.json` (zadanie 2 planu): porównanie tuszu podglądu z zrzutami TSH (`work/re-tsh/shots`), test `test/unit/tshEditor/tshCompare.test.js`.
- **Sprawdzenie:** `npm --prefix work/working/tools test` (`tshMetrics.test.js`: pełne tabele obu modeli, granica 800/801, przycisk dużej wielkości TSG2 84×84, tekst „Nowe pole tekstowe” 12 px szeroki na 106 px wobec 104 px tuszu w `tsg_scr.png`). Porównanie: zbudowana aplikacja na izolowanym `HOME`, `node tools/tsh-preview-compare.mjs <ws> tools/tsh-compare-cases.json <katalog>`: mały tekst TSG2 w tolerancji (przed zmianą −25 % szerokości). Uwaga: przycisk 84 px w Y 211 dalej wystaje 23 px pod ekran TSG2, więc stare przycinanie całej ramki w `dragPosition` nadal przesuwa go przy kliknięciu (RC3, osobny wpis zadania 7).

### 045. Edytor TSH: krój, wyrównanie, ikony, wskaźniki, pasek stanu i zegar wygaszacza jak w TSH Soft
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** niewydane (po 1.2.0-port.2), oryginał 1.2.0
- **Powód:** plan `docs/plans/2026-11-14-tsh-editor-redesign.md`, RC2, RC7, RC10, RC11 i reguły rysowania odczytane z `TSH_soft.exe` (`PROJEKT-TSH.md` 2.6: `FUN_00a9f9d0`, `FUN_00a9f048`, `FUN_00a9f3a8`, `FUN_00a9f704`, `FUN_00a5b270`, `FUN_00aa7fe4`, `FUN_00aa064c`). Rozszerza wpisy 036 i 044; kod Satel bez zmian.
- **Plik:** `desktop/tshEditor/tshLayout.js` (nasz, kopiuj bez zmian)
  - **Tekst:** tablica szerokości Roboto Thin `ADVANCES_THIN` (te same znaki co `MEASURED_CHARS`, `hmtx` czcionki ROBT), `textWidth(text, px, face)` z `face` `"light"` (domyślnie) albo `"thin"`; `widgetLayout` dla tekstu daje `face: "thin"`, gdy rozmiar równa się `m.font[2]`, i `textX: TEXT_OFFSET` (1 px, TSH rysuje tekst w `lewa + 1`). `textAscent(px) = round(1946·px/2048)` (linia bazowa GDI), stałe `ROBOTO_HHEA_ASCENT = 1900`, `ROBOTO_HHEA_HEIGHT = 2400`, `BOLD_EXTRA_ADVANCE = 1`.
  - **Wyrównanie:** `textAlign(w)`: tylko typy z mapy TSH `0x00, 0x04, 0x05, 0x15, 0x16, 0x26, 0x28, 0x30`; bity 2–3 bajtu 7 = `(center ? 2 : 0) | (flagsOther & 0x04 ? 1 : 0)`: 1 do prawej, 2 do środka, 0 i 3 do lewej. Przed: `var offsetX = w.center ? -Math.round(width / 2) : 0;` dla każdego typu. Po: `var offsetX = align === "right" ? -width : align === "center" ? -(width >> 1) : 0;`.
  - **Ikony:** `widgetGlyph(code)`: kod `& 0xfff`, 0 albo spoza zakresów firmware `FIRMWARE_ICON_RANGES` (`[0xa9, 0x107], [0x110, 0x13d], [0x13f, 0x1a6], [0x226, 0x266], [0x268, 0x268], [0x26a, 0x280], [0x28a, 0x28f]`) → `MISSING_ICON = 0x22`. Odsyłacz: `(lead << 8) | icon` (było `icon`).
  - **Wskaźniki:** `INDICATORS[typ]` to lista warstw `{ glyph, color }` zamiast `{ glyph, glyphColor, glyphScale, fill, ring }`: pomieszczenie `0x1df #ffffff`, `0x1fc #00d9a5`, `0x1e8 #000000`; wejście `0x1df #ffffff`, `0x1e0 #000000`; wyjście `0x1df #ff4d4d`, `0x1e8 #000000`. Układ wskaźnika: `{ font, layers }`.
  - **Ekrany:** `statusIcons(screen, m)` (ikony stanu tylko przy `m.statusIcons`, czyli TSH2, na ekranie użytkownika i dodatkowym od x 4 co 60, na wygaszaczu wyśrodkowane; TSG2 i motyw: brak), `pageDots(m, count, active)` (glify 0x1f6/0x1f7, odstęp `glyphBox(dotFont).width + dotGap`, góra `H − bar − (odstęp >> 1)`), `saverClock(m, now)` (dwukropek Light `clockFont >> 1` w `((W − w(":")) >> 1, ((H − h(":")) >> 1) − bar)`, godziny Thin kończą się na dwukropku, minuty od `(W + w(":")) >> 1`, oba na `((H − h(clockFont)) >> 1) − bar + clockDrop`, sekundy Light `clockSecondsFont` w `(round(W·0,83), round(H·0,45))`). Jedna funkcja `pad2` zamiast dwóch.
- **Plik:** `desktop/tshEditor/TshPreview.js` (nasz, kopiuj bez zmian)
  - `textStyle(font, face, color)`: blok z wysokością linii `font·2400/2048` i `marginTop = textAscent(font) − font·1900/2048`, więc linia bazowa Chrome wypada tam, gdzie GDI (przed: `lineHeight` równe wysokości ramki, linia bazowa do ~2 px wyżej przy zegarze). Używany przez tekst widżetu (z `left: l.textX`), pasek stanu i zegar wygaszacza.
  - Wskaźnik: warstwy `l.layers` jako glify `WDGT` w tym samym miejscu (przed: koło CSS z pierścieniem i glifem w skali).
  - Prostokąt: wypełnienie na ramce widżetu, obramowanie w osobnym `div` przesuniętym o `−border/2` z każdej strony (pióro GDI na krawędzi; przed: obramowanie wewnątrz ramki).
  - Pasek stanu: ikony z `statusIcons`, nazwa i zegar z `letterSpacing` równym `BOLD_EXTRA_ADVANCE` pikseli ekranu (pogrubienie syntetyczne GDI), linia jako `div` o wysokości jednego piksela ekranu na środku wiersza `m.bar` (przed: `borderBottom` ramki o wysokości `m.bar`, czyli wiersz wyżej).
  - Kropki: glify z `pageDots` w bieli (przed: koła CSS). Wygaszacz: ikony z `statusIcons`, zegar z `saverClock` (przed: `hh:mm` jednym napisem Thin na środku, sekundy Thin).
  - Siatka: linie przesunięte o 0,5 px klawiatury na środek wiersza/kolumny piksela (pióro GDI rysuje w pikselu swojej współrzędnej).
- **Sprawdzenie:** `npm --prefix work/working/tools test` (`tshLayout.test.js`: Thin dla rozmiaru 2 i szerokość z tablicy Thin, `textX` 1, środek `x − (w >> 1)` dla szerokości nieparzystej, prawo `x − w`, ikona ze środkowaniem zostaje przy X, warstwy wskaźników, 0x22 dla 0 i kodów spoza firmware, ikony stanu na każdym ekranie TSH2 i nigdzie na TSG2, wygaszacz TSH2 i TSG2 w całości, kropki). Porównanie z zrzutami TSH: `node tools/tsh-preview-compare.mjs <ws> tools/tsh-compare-cases.json <katalog>` na zbudowanej aplikacji z izolowanym `HOME` (wynik w raporcie zadania: 76 ze 112 obszarów w tolerancji wobec 37 przed zmianami; reszta to różnice rasteryzacji GDI/Chrome o 1–2 piksele podglądu).

### 046. Edytor TSH: data w widżecie Data/czas jak w TSH Soft
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** niewydane (po 1.2.0-port.2), oryginał 1.2.0
- **Powód:** plan `docs/plans/2026-11-14-tsh-editor-redesign.md`, RC6: format `dddd, d MMMM yyyy` dawał „1414, d 1111 2026”, bo podgląd znał tylko `yyyy yy MM dd hh HH mm ss` z rozróżnieniem wielkości liter. TSH (`FUN_00a9cc5c`, `PROJEKT-TSH.md` 2.6) najpierw zamienia w formacie `dddddd`, `ddddd`, `mm` → `nn`, `m` → `n`, `tt`, `t`, `c`, potem woła Delphi `FormatDateTime`, a po polsku zamienia mianownik miesiąca na dopełniacz. Rozszerza wpis 036; kod Satel bez zmian.
- **Plik nowy (kopiuj bez zmian):** `desktop/tshEditor/tshDateFormat.js`: `formatTshDate(format, date, lang)`, `TSH_REPLACEMENTS` (kolejność jak w TSH, każda zamiana na całym tekście od lewej, bez ponownego skanowania, także w cudzysłowach), `LOCALES` (`pl`, `en`: nazwy dni i miesięcy, separatory `.`/`/` i `:`, formaty krótkie i długie, AM/PM). Tokeny Delphi bez rozróżnienia wielkości liter, ale seria liczy tylko ten sam znak; `M` zaraz po tokenie `H` to minuty; `y`, `yy` → 2 cyfry, więcej → 4; `d`, `dd`, `ddd`, `dddd`; `M`…`MMMM`; `h`, `hh` (12 h przy `AM/PM`, `A/P`, `AMPM` dalej w formacie); `n`, `nn`, `s`, `ss`, `z`, `zzz`; `AAAA`, `AAA`; `/`, `:`; literały w `'…'` i `"…"`; inne znaki bez zmian. Po polsku (`lang` „pl” bez względu na wielkość liter) pierwsza znaleziona mianownikowa nazwa miesiąca zamieniana na dopełniacz z tabeli TSH; inne języki po angielsku. Test `test/unit/tshEditor/tshDateFormat.test.js`.
- **Plik:** `desktop/tshEditor/tshLayout.js` (nasz)
  - **Przed:** `formatDate(format, date)` z tabelą tokenów `yyyy|yy|MM|dd|hh|HH|mm|ss`; `widgetText(w, now)`, `widgetLayout(w, m, now)`, `centerShift(w, m, now, center)`.
  - **Po:** `formatDate(format, date, lang)` woła `TshDateFormat.formatTshDate`; `widgetText(w, opts)`, `widgetLayout(w, m, opts)` i `centerShift(w, m, opts, center)` z `opts = { now, lang }`.
- **Pliki:** `desktop/tshEditor/TshPreview.js` (`var opts = { now: now, lang: props.state.input.lang };` przekazywane do `widgetLayout`), `desktop/tshEditor/TshPropertyPanel.js` („Do środka”: `TshLayout.centerShift(w, m, { now: new Date(), lang: state.input.lang }, on)`).
- **Różnica wobec planu:** `ddd dd.mm.yy` daje „sob. 14.25.26”, nie „sob. 14.11.26”: TSH zamienia każde małe `m` na minuty, zanim format trafi do Delphi; miesiąc to tylko wielkie `M`.
- **Sprawdzenie:** `npm --prefix work/working/tools test` (`tshDateFormat.test.js`, w tym 2026-11-14 22:25:26: `dd.MM.yyyy hh:mm:ss` → „14.11.2026 22:25:26”, `dddd, d MMMM yyyy` → „sobota, 14 listopada 2026” / „Saturday, 14 November 2026”, `hh:nn` → „22:25”, `'godz.' hh` → „godz. 22”, pusty format → „”). W edytorze: wygaszacz z widżetem Data/czas `dddd, d MMMM yyyy` pokazuje dzień tygodnia i miesiąc słownie.

### 047. Edytor TSH: kliknięcie nie przesuwa widżetu, trafianie przez ramki, przyciąganie tylko przy przeciąganiu
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** niewydane (po 1.2.0-port.2), oryginał 1.2.0
- **Powód:** plan `docs/plans/2026-11-14-tsh-editor-redesign.md`, RC3–RC5 (zgłoszenie z INT-TSG2): samo kliknięcie przesuwało widżet (przycisk 84,211 → 84,158, drganie 1–3 px myszy dawało ruch, a `dragPosition` wciskał całą ramkę w ekran i zapisywał to przy puszczeniu), prostokąt-ramka nad przyciskami przechwytywał ich kliknięcia, przyciąganie działało przy każdym ruchu i zależało od zapisanej flagi „Siatka” ekranu. Rozszerza wpisy 036 i 044; kod Satel bez zmian.
- **Podział podglądu (refaktor zadania 6, bez osobnego wpisu, kopiuj bez zmian):** `desktop/tshEditor/TshScreenRender.js` (statyczne rysowanie ekranu bez obsługi zdarzeń, `react.memo` na `screen`, `scale`, `themes`, `customImages`, `now`, `lang`; przeniesione `Glyph`, `textStyle`, `WidgetContent`, `StatusBar`, `Saver`, `Grid`), `tshLayout.screenDrawList(state, screen, opts)` (lista elementów w kolejności rysowania: `background`, `grid`, `statusBar`, `dots`, `saver`, `widget` z `layout` i `colors`; test `tshScreenRender.test.js`), `desktop/tshEditor/TshCanvas.js` (dawny `TshPreview`: skala, zaznaczenie, wskaźnik), `TshPreview.js` tylko jako `exports.TshPreview = require("./TshCanvas.js").TshCanvas;` do czasu nowej powłoki edytora (zadanie 9).
- **Plik nowy (kopiuj bez zmian):** `desktop/tshEditor/tshPointer.js`: `DRAG_THRESHOLD_PX = 4`, `SNAP_PX = 6`, `RECT_EDGE_PX = 4` (piksele CSS); `toKeypad(clientX, clientY, stageRect, zoom)` (z bieżącego `getBoundingClientRect()` sceny); `passedThreshold(start, point)` (`dx² + dy² >= 16`); `hitTest(layouts, point, zoom, cycleFrom)` (od wierzchu; wnętrze prostokąta dalej niż `max(border, 4 / zoom)` od krawędzi ustępuje innemu widżetowi pod kursorem, zewnętrzna połowa pióra też trafia; `cycleFrom` przy Alt daje następny widżet pod kursorem); `dragAnchor(grab, point, layout, m, { snap, zoom })` (kotwica = kursor − chwyt, przy `snap` krawędzie i środek ramki do `TshLayout.snapTargets(m)` w promieniu `6 / zoom`, potem zaokrąglenie i przycięcie tylko kotwicy do `0…W−1`, `0…H−1`; zwraca `{ x, y, guides }`); `nudgeAnchor(w, delta, m)`; `IDLE` i `pointerReducer(state, event)` (zdarzenia `down`, `move`, `up`, `cancel`, `key`: przeciąganie dopiero po progu, `up` zwraca `commit` tylko po przeciągnięciu, które zmieniło X/Y, Esc i `cancel` bez zapisu). Test `test/unit/tshEditor/tshPointer.test.js`.
- **Plik:** `desktop/tshEditor/tshLayout.js` (nasz)
  - **Przed:** `snapAxis`, `snapToGrid(left, top, width, height, m)` (krawędzie pól w promieniu `m.snapDistance` pikseli klawiatury) i `exports.dragPosition = function (layout, dx, dy, m, snap) { … left = Math.max(Math.min(left, m.width - layout.width), 0); top = Math.max(Math.min(top, m.height - layout.height), 0); … }`.
  - **Po:** `exports.snapTargets = function (m)` → `{ xs: [0, W / 2, W, krawędzie pól…], ys: [0, H / 2, H, krawędzie pól…] }`; `snapAxis`, `snapToGrid` i `dragPosition` usunięte.
- **Plik:** `desktop/tshEditor/tshMetrics.js` (nasz): pole `snapDistance` (10 / 5) usunięte z `TSH2_METRICS`, `TSG2_METRICS` i opisu typu; odległość przyciągania to teraz `SNAP_PX / zoom`.
- **Plik:** `desktop/tshEditor/TshCanvas.js` (nasz)
  - **Przed (w `TshPreview.js`):** każdy widżet miał własne `onPointerDown`/`onPointerMove`/`onPointerUp` z `setPointerCapture` od razu przy naciśnięciu; ruch: `TshLayout.dragPosition(d.layout, (event.clientX - d.startX) / scale, …, m, screen.grid && !event.altKey)`; puszczenie: `if (w && (d.x !== w.x || d.y !== w.y)) props.onMoveWidget(…)`.
  - **Po:** obsługa wskaźnika na ramce sceny: `onPointerDown` → `TshPointer.hitTest(layouts, keypadPoint(event), scale, event.altKey ? props.selectedWidget : null)`, zaznaczenie, zdarzenie `down`; `onPointerMove` → zdarzenie `move` z `snap: !!props.snapEnabled && !event.altKey` (bez wciśniętego przycisku: `cancel`), przechwycenie wskaźnika dopiero przy przejściu w `dragging`; `onPointerUp` → `up` i `props.onMoveWidget` tylko z `commit`; Esc w trakcie przeciągania → `key`; strzałki → `TshPointer.nudgeAnchor`. Warstwa nad rysunkiem w pikselach CSS: kreskowane pola siatki edytora przy `snapEnabled`, obrys widżetu pod kursorem, zaznaczenie z uchwytem kotwicy, linie przyciągania; pod sceną wiersz stanu (`tsh_editor.canvas_pointer`, `tsh_editor.canvas_widget`). `BOTTOM_GAP` 24 → 44 (wiersz stanu).
- **Plik:** `desktop/tshEditor/TshEditorRoute.js` (nasz): `snapEnabled={snapEnabled}`, gdzie `snapEnabled` to flaga siatki pokazanego ekranu (do czasu przełącznika siatki edytora; postanowienie planu: przełącznik startuje włączony, gdy flaga jest włączona).
- **Pliki:** `i18n/pl.js`, `i18n/en.js` (`tsh_editor`): nowy `preview_hint` (Alt+klik, przyciąganie do pól, krawędzi i środka, Esc), `canvas_pointer` „Kursor {{x}}, {{y}}” / „Pointer {{x}}, {{y}}”, `canvas_widget` „Widżet X {{x}}, Y {{y}}” / „Widget X {{x}}, Y {{y}}”.
- **Sprawdzenie:** `npm --prefix work/working/tools test` (`tshPointer.test.js`: próg 3,9 / 4 / 3,3; `toKeypad` przy 0,65, 1,3167, 2 i przewiniętej scenie; przycisk pod ramką użytkownika w 120,250 wygrywa, krawędź ramki trafia, cykl Alt, puste miejsce; przyciąganie w 6 / 7 px i 3 / 4 px przy 2×, środek ekranu, kotwica w `0…479`, ramka poza ekranem dozwolona; kliknięcie z drganiem 0/1/3 px bez `commit`). W zbudowanej aplikacji (izolowany `HOME`, CDP, wejście TSG2 jak u użytkownika): kliknięcia z drganiem 0, 1, 3 i 2,2 px na przycisku i na ramce nic nie przesuwają, przycisk w ramce zaznacza przycisk, Alt+klik przechodzi na ramkę, przeciągnięcie o +60/+30 px CSS daje oczekiwaną kotwicę przy dopasowaniu i przy 200 %, z siatką przyciąga, z Alt nie, Esc przerywa.

### 048. Edytor TSH: cofanie i ponawianie, Delete z pytaniem, skróty klawiszowe
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** niewydane (po 1.2.0-port.2), oryginał 1.2.0
- **Powód:** plan `docs/plans/2026-11-14-tsh-editor-redesign.md`, zadanie 8 i sekcja 5 („History”, „Keyboard on the focused canvas”): edytor nie miał cofania, a usunięcie widżetu było tylko z listy. Rozszerza wpisy 035 i 047; kod Satel bez zmian.
- **Plik nowy (kopiuj bez zmian):** `desktop/tshEditor/tshHistory.js`: `HISTORY_LIMIT = 100`, `COALESCE_MS = 1000`; `createHistory(state)` → `{ past: [], present, future: [], key: null, at: 0 }`; `record(h, next, key, at)` (ten sam niepusty klucz w ciągu ≤ 1000 ms zastępuje `present` zamiast dodawać krok; każdy zapis czyści `future`; `past` przycinane do 100 od najstarszego; `next === present` nic nie zmienia); `undo(h)`, `redo(h)` (zerują klucz, więc kolejna zmiana nie łączy się z krokiem z cofania); `clampSelection(state, { uid, widget })` (brak ekranu → pierwszy ekran użytkownika albo `null`, brak widżetu → `widget: null`); `shortcutFor(event)`: Ctrl/Cmd+Z `undo`, Ctrl/Cmd+Shift+Z i Ctrl/Cmd+Y `redo`, Delete/Backspace `delete`, G `grid`, Tab / Shift+Tab `nextWidget` / `prevWidget`, Ctrl/Cmd `=`/`+`/`-`/`0`/`1` `zoomIn`/`zoomOut`/`zoomFit`/`zoomActual` (obsługa w zadaniu 9); `event.metaKey || event.ctrlKey` bez warunku na platformę; Ctrl+Alt, Ctrl+Shift+Y i każdy klawisz w `INPUT`/`SELECT`/`TEXTAREA` albo elemencie `contentEditable` → `null`. Test `test/unit/tshEditor/tshHistory.test.js`.
- **Plik:** `desktop/tshEditor/TshEditorRoute.js` (nasz)
  - **Przed:** `var editorState = (0, react.useState)(loaded && loaded.ok ? loaded.state : null);`, `var state = editorState[0];`, `apply(result)` → `editorState[1](result.state)`, pytanie o wyjście przy `state.changed`.
  - **Po:** `var history = (0, react.useState)(loaded && loaded.ok ? TshHistory.createHistory(loaded.state) : null);`, `loadedRef` ze stanem startowym, `var state = history[0] ? history[0].present : null;`; `apply(result, key)` → `history[1](function (h) { return TshHistory.record(h, result.state, key, Date.now()); })`; „Utwórz nowe ekrany” zaczyna nową historię i nowy `loadedRef`; tło z kadrowania zapisuje się przez `record` w aktualizacji funkcyjnej. Pytanie o wyjście: `state !== loadedRef.current || loadedRef.current.changed` (cofnięcie do stanu z wczytania = brak zmian; świeży szablon zawsze do zapisania). Nasłuch `keydown` na `window` (`keyRef` z bieżącymi danymi, rejestracja raz w `useEffect` ze zdjęciem przy zamknięciu) pomija zdarzenia z `defaultPrevented` (obsłużone przez scenę), z otwartym oknem „Karta SD” albo kadrowania i po zapisie; `undo`/`redo` → `stepHistory` z `clampSelection`; `delete` przy zaznaczonym widżecie → `confirmDialog(t("tsh_editor.remove_widget_title"), t("tsh_editor.remove_widget_question", { name }), t("tsh_editor.remove"), t("cancel"))`, potem `removeWidget` i odznaczenie (jedno pytanie naraz, `deletingRef`); nazwa w pytaniu z `widgetName`: tekst widżetu, inaczej nazwa urządzenia z wejścia, inaczej typ; `grid` → `editorGrid = { uid, on }` (siatka edytora tylko dla pokazanego ekranu, niezapisywana; inne ekrany startują z flagą siatki). `snapEnabled` z `editorGrid` albo flagi ekranu; `onMoveWidget(index, x, y, key)` → `apply(moveWidget(…), key)`.
- **Plik:** `desktop/tshEditor/TshCanvas.js` (nasz): Tab / Shift+Tab (`TshHistory.shortcutFor`) zaznacza następny / poprzedni widżet w kolejności rysowania z zawijaniem; strzałki wołają `props.onMoveWidget(index, x, y, "nudge:<uid>:<index>")`, więc przytrzymana strzałka to jeden krok cofania.
- **Plik:** `desktop/tshEditor/TshPropertyPanel.js` (nasz): `fieldKey(uid, widget, path)` → `"field:<uid>:<widget albo ->:<path>"`; klucz dostają: pola `text` i `number` widżetu (`setField(path, v, true)`), X i Y, kolory widżetu, nazwa i kolory ekranu. Wybory, przełączniki i przyciski idą bez klucza (każdy to osobny krok).
- **Pliki:** `i18n/pl.js`, `i18n/en.js` (`tsh_editor`): `remove_widget_title` „Usuń widżet” / „Remove widget”; `preview_hint` uzupełniony o Tab, Delete, Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z i G.
- **Sprawdzenie:** `npm --prefix work/working/tools test` (`tshHistory.test.js`: cofanie i ponawianie do identycznego modelu, czyszczenie ponawiania, limit 99/100/101, łączenie przy 999/1000 ms i nie przy 1001, inny klucz, `clampSelection`, mapa skrótów i pola formularzy). W zbudowanej aplikacji (izolowany `HOME`, CDP, wejście TSG2 jak u użytkownika): przeciągnięcie, wpisanie „XYZ” w tekst „Brama”, Delete na scenie (pytanie), potem Ctrl+Z ×3 daje `screens_config_base64` identyczne z wczytanym, a Ctrl+Shift+Z ×3 identyczne z końcowym; Backspace w polu tekstowym edytuje tekst bez pytania; Tab/Shift+Tab, G (10 pól siatki edytora), 5 naciśnięć strzałki cofane jednym Ctrl+Z.

### 049. Edytor TSH: układ na całe okno z paskiem narzędzi, powiększeniem i licznikiem danych
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** niewydane (po 1.2.0-port.2), oryginał 1.2.0
- **Powód:** plan `docs/plans/2026-11-14-tsh-editor-redesign.md`, zadanie 9 i sekcje 3.1–3.3 (RC12, zgłoszenie z INT-TSG2): mały podgląd i dużo pustego miejsca, duży przycisk „Zapisz” w stopce `Page`, panel właściwości ucięty pod stopką, rozmiar danych i „Karta SD”/„Anuluj” w jednym wierszu nad kolumnami. Rozszerza wpisy 035, 036, 047 i 048; kod Satel bez zmian.
- **Pliki nowe (kopiuj bez zmian):**
  - `desktop/tshEditor/tshZoom.js`: `ZOOM_LEVELS = [0.5, 0.75, 1, 1.5, 2, 3, 4]`, `MIN_ZOOM = 0.05`; `fitZoom(pane, m, padding)` → `min((W − 2p) / m.width, (H − 2p) / m.height)` w granicach `MIN_ZOOM…4`; `stepZoom(current, dir)` → najbliższy poziom w danym kierunku (z dopasowania też), na końcach koniec; `zoomAround(scroll, point, from, to)` → `(scroll + point) · to / from − point` (przewinięcie liczone od początku sceny; wywołujący dodaje przesunięcie sceny po zmianie). Test `test/unit/tshEditor/tshZoom.test.js`.
  - `desktop/tshEditor/TshEditorShell.js`: ramka edytora (`flex: 1` w treści `Page`, obramowanie, promień 8): pasek narzędzi, a pod nim trzy panele: lewy 264 px, środkowy `flex: 1` (min. 360 px), prawy 320 px (280 px przy oknie < 1200 px CSS); `left`, `center`, `right` to funkcje układu `{ narrow, compact }` (`compact` < 1000 px); `ScrollPane` to `div.tsh-scroll` z własnym przewijaniem.
  - `desktop/tshEditor/TshToolbar.js`: pasek 48 px: model i rozdzielczość („INT-TSG2 · 480 × 272”), Cofnij/Ponów (wyłączone przy pustej historii), miejsce na menu „+ Widżet” (`addMenu`), „Siatka” (siatka edytora, `aria-pressed`), powiększenie (−, menu „Dopasuj / 50…400 %”, +), „Karta SD”, licznik danych (pasek 120 px w `primary500`, od 90 % `warning500`, ponad limit albo przy błędach `danger500`, tekst „1 024 / 65 535 B” z wąską spacją), „?” z listą skrótów, plakietka błędów/uwag przed „Zapisz” (czerwona „Błędy: N” albo szara „Uwagi: N”; lista w okienku, kliknięcie błędu z numerem rekordu zaznacza ekran i widżet), „Anuluj”, „Zapisz” (wypełniony `primary500`, kolor tekstu z `PrimaryButtonThemeStyle`, 32 px). Pasek węższy niż 1180 px chowa podpisy przycisków (ikona i podpowiedź), węższy niż 960 px także model.
  - `desktop/tshEditor/TshUi.js`: arkusz stylów edytora `<style id="tsh-editor-css">` w kolorach motywu aplikacji (`useEditorCss`, przy zamknięciu usuwany): przyciski `.tsh-btn` (32 px, promień 6, hover `secondary200`, fokus `primary500`), pola `.tsh-ctl` (pola liczbowe bez strzałek, żeby X/Y mieściły cztery cyfry w wąskim inspektorze), menu, wiersze list, przełącznik segmentowy, zakładki, komórki ikon; `ToolButton`, `Popover` (portal do `document.body`, `position: fixed` pod kotwicą i w oknie, zamyka klik obok, Esc i zmiana rozmiaru okna; Esc nie dochodzi do edytora ani do `Page`), `MenuItem`, `MenuSection`; `cssScale(el)` = `getBoundingClientRect().width / offsetWidth` (0,8, gdy aplikacja ustawia `body.style.zoom = 0.8` na ekranach HiDPI, `module_1813`).
  - `desktop/tshEditor/TshIcons.js`: ikony liniowe SVG w kolorze tekstu (cofnij, ponów, plus, minus, siatka, karta SD, pomoc, uwaga, strzałki, więcej, kosz, na wierzch, na spód).
- **Plik usunięty:** `desktop/tshEditor/TshPreview.js` (przejściowy re-eksport z wpisu 047). `tools/tsh-preview-harness.js` rysuje teraz rekord przez `TshScreenRender` w ramce `tabindex=0` dokładnie w zadanej skali (wcześniej `TshPreview` liczył skalę z całkowitego `clientWidth`).
- **Plik:** `desktop/tshEditor/TshCanvas.js` (nasz)
  - **Przed:** skala `Math.min(szerokość kolumny / W, (window.innerHeight − top − BOTTOM_GAP) / H, MAX_SCALE = 2)`, scena w kolumnie z ramką `overflow: hidden`, wskazówka `tsh_editor.preview_hint` i baner `bg_missing` pod sceną, punkt klawiatury `toKeypad(…, scale)`.
  - **Po:** panel środkowy na tle `secondary100`: przewijany `div` (`overflow: auto`, `overflowAnchor: none`) mierzony `ResizeObserver` (`clientWidth − 1`, `clientHeight − 1`, bo zaokrąglony rozmiar dawał ułamkowe przepełnienie i migotanie paska przewijania przy dopasowaniu); `zoom` z trasy (`"fit"` albo poziom), `onFit(fitZoom(pane, m, 24))`; treść `max(panel, scena + 48)` z `overflow: hidden` (obrys ramki wystającej poza ekran nie przewija panelu), scena wyśrodkowana, dopóki się mieści, potem przy 24 px i panel się przewija; cień i obrys 1 px `secondary300`; Ctrl/Cmd+kółko (natywny `wheel` z `passive: false`, krok co 40 jednostek `deltaY`) zmienia poziom wokół kursora: `zoomAround` z przewinięciem zapamiętanym przed zmianą (`scrollRef`, bo po pomniejszeniu przeglądarka już je przycięła) i przesunięciem sceny po zmianie; zmiana z paska albo klawiszy trzyma środek panelu. Punkt klawiatury `toKeypad(…, rect.width / m.width)` (poprawne też przy powiększeniu `body` 0,8). Esc obsłużony na scenie (przerwanie przeciągania, odznaczenie) woła `stopPropagation`, więc nie zamyka edytora przez `useEscapeHandler` w `Page`. Wybrany widżet spoza widoku (lista, Tab) jest przewijany do widoku (liczy się tylko część ramki na ekranie). Wiersz stanu 24 px pod panelem: kursor, X/Y zaznaczonego, rozmiar ramki „84 × 84”, typ, „Siatka: wł./wył.”, „153 %” (panel węższy niż 560 px: kursor tylko bez zaznaczenia, bez typu). Obrys najechania 1 px `primary300`, zaznaczenie 2 px `primary500` z uchwytem kotwicy, linie przyciągania `warning500`, przy przeciąganiu dymek „x, y”; obrysy mogą wychodzić poza ekran (`overflow: hidden` tylko na rysunku). Brak ekranu: „Wybierz ekran…” na środku panelu; tło tylko na karcie: pasek ostrzeżenia przyklejony u góry panelu.
- **Plik:** `desktop/tshEditor/TshEditorRoute.js` (nasz)
  - **Przed:** `<module32.Page … actions={<PageButtonPrimary … onPress={save} />}>`, wiersz z `tsh_editor.bytes`, „Karta SD” i „Anuluj”, notatki i błędy jako tekst, trzy kolumny w `View` `flexDirection: "row", minHeight: 560`, start bez zaznaczonego ekranu.
  - **Po:** `Page` bez `actions` (bez stopki), treść to `TshEditorShell` z `TshToolbar` (cofnij/ponów przez `stepHistory`, siatka `toggleGrid`, `zoom`/`fit`, „Karta SD”, licznik z `validation.size`/`limit`, błędy z `onPick`, uwagi: `tsh_editor.issues` i ostrzeżenia), lewy i prawy panel w `ScrollPane` (padding 16), środkowy `TshCanvas` z `zoom`, `onFit`, `onZoom`. Okno klawiszy: `zoomIn`/`zoomOut` → `TshZoom.stepZoom`, `zoomFit` → `"fit"`, `zoomActual` → 1 (z `preventDefault`). Na starcie zaznaczony ekran główny, inaczej pierwszy ekran użytkownika. `useEditorCss()`.
- **Pliki:** `desktop/tshEditor/TshScreenList.js`, `TshPropertyPanel.js` (nasze): styl `column` bez stałej szerokości i obramowania (szerokość i przewijanie daje powłoka).
- **Pliki:** `i18n/pl.js`, `i18n/en.js` (`tsh_editor`): usunięty `preview_hint` (lista skrótów jest w „?”); `canvas_widget` „X {{x}}, Y {{y}}”; nowe `grid_on`, `grid_off`, `undo`, `redo`, `editor_grid`, `editor_grid_hint`, `zoom_in`, `zoom_out`, `zoom_level`, `zoom_fit`, `budget`, `errors_badge`, `notes_badge`, `errors_title`, `notes_title` i blok `help` (`title`, `key_*` i opisy dwunastu skrótów).
- **Sprawdzenie:** `npm --prefix work/working/tools test` (`tshZoom.test.js`: dopasowanie TSH2/TSG2 w 1100×700 i 400×300, granice, kroki z dopasowania w obie strony i na końcach, `zoomAround` trzyma punkt klawiatury). W zbudowanej aplikacji (izolowany `HOME`, CDP, prawdziwy `Page`, wejście TSG2 jak u użytkownika i TSH2 z próbki 054) przy 1000×800, 1440×900 i 1920×1080: brak przewijania strony, panele przewijają się osobno, scena wypełnia panel z proporcją 480:272 / 1024:600, „+” z dopasowania daje 200 %, Ctrl+= 300 %, Ctrl+0 dopasowanie, Ctrl+1 100 %, Ctrl+− 75 %, menu poziomów, Ctrl/Cmd+kółko trzyma punkt pod kursorem, zwykłe kółko nie powiększa, „Siatka” pokazuje 10 pól, Cofnij/Ponów, Esc na scenie odznacza bez zamykania, Esc w okienku zamyka tylko okienko, Esc bez niczego do przerwania zamyka edytor jak wcześniej, „Zapisz” oddaje wynik. Przy `devicePixelRatio` 2 (aplikacja ustawia `body` zoom 0,8): kliknięcie trafia w przycisk, przeciągnięcie o 60 px daje 60 / skala, menu otwiera się pod przyciskiem.

### 050. Edytor TSH: ekrany z miniaturami i lista warstw z ikonami i nazwami
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** niewydane (po 1.2.0-port.2), oryginał 1.2.0
- **Powód:** plan `docs/plans/2026-11-14-tsh-editor-redesign.md`, zadanie 10 i sekcja 3.3 „Left panel” (RC9, RC13): ekran o nazwie z samych spacji miał w liście pusty wiersz (tylko linia z typem), widżety były na liście jako „Typ · x, y” bez ikony i treści (dwa „Tekst” nie do odróżnienia), lista widżetów siedziała w panelu właściwości, nie było zmiany kolejności widżetów. Rozszerza wpisy 035, 048 i 049; kod Satel bez zmian.
- **Pliki nowe (kopiuj bez zmian):**
  - `desktop/tshEditor/tshWidgetLabel.js`: `MAX_LABEL_LENGTH = 32`; `hasVisibleText(text)` (`/[^\s\u0000-\u001f​-‍﻿]/`); `widgetLabel(w, state, t)` → `{ glyph, glyphKind: "icon"|"text"|"rect"|"dot", title, subtitle, named }`: tekst i informacja `„tekst”` (`tsh_editor.quoted`, obcięty do 32 znaków z „…”), data/czas format, wartość „urządzenie · nazwa wartości”, sterowanie/przycisk/ikony/wskaźniki/stan wyjścia (tekst) nazwa urządzenia, stan pomieszczenia pomieszczenie, sceny nazwa sceny, czuwanie tryb czuwania, napad rodzaj alarmu, odsyłacz „Powrót” albo tytuł ekranu dodatkowego, prostokąt „Prostokąt W×H”, nieobsługiwany „Nieobsługiwany”; bez nazwy (brak urządzenia, pusty tekst) tytułem jest nazwa typu i `named: false`; `glyph` to `TshLayout.widgetGlyph(TshLayout.widgetIcon(w))` dla widżetów z ikoną. `screenTitle(entry, index, t)`: nazwa z widocznym znakiem bez zmian, inaczej „Ekran {n} (bez nazwy)” / „Ekran dodatkowy {n} (bez nazwy)” (n = pozycja w typie), motyw i wygaszacz nazwą typu, rekord nieobsługiwany „Nieobsługiwany ekran {id}”. Test `test/unit/tshEditor/tshWidgetLabel.test.js`.
  - `desktop/tshEditor/TshLayerList.js`: sekcja „Warstwy” z liczbą widżetów i przyciskiem „+”: widżety pokazanego ekranu w kolejności rysowania (góra listy rysowana pierwsza), wiersz 32 px z glifem 18 px (`WDGT`, „T” dla tekstów, ramka dla prostokąta, kropka dla wskaźników), tytułem z `widgetLabel` i typem po najechaniu; menu „…”: Na wierzch, Przesuń do przodu, Przesuń do tyłu, Na spód, Usuń widżet…; klik zaznacza, strzałki ↑/↓ przechodzą po wierszach, Delete (okno edytora) pyta; zaznaczenie z podglądu przewija wiersz do widoku.
  - `desktop/tshEditor/TshAddWidgetMenu.js`: przycisk „+” z menu typów widżetów (`groups`, `onAdd(type)`) i `WidgetGlyph` (glif wiersza listy i menu).
- **Plik:** `desktop/tshEditor/tshEditorModel.js` (nasz): nowe `exports.reorderWidget = function (state, uid, index, toIndex)`: `screen.widgets.splice(toIndex, 0, screen.widgets.splice(index, 1)[0])`, wynik `{ ok, state, index: toIndex }`; `NO_WIDGET` dla braku widżetu, `MOVE_RANGE` dla tego samego miejsca, niecałkowitego albo spoza `0…n−1` (błąd cichy w trasie). Test w `tshEditorModel.test.js` (granice −1, 0, n−1, n, 1,5, to samo miejsce, brak widżetu, brak ekranu, widżet nieobsługiwany).
- **Plik:** `desktop/tshEditor/tshLayout.js` (nasz): `widgetIcon` eksportowane (`var widgetIcon = exports.widgetIcon = function (w)`), bez zmiany działania.
- **Plik:** `desktop/tshEditor/TshScreenList.js` (nasz), przepisany
  - **Przed:** przyciski „Dodaj ekran” / „Dodaj ekran dodatkowy”, wiersz = nazwa i „typ · id · główny”, przy zaznaczonym przyciski „W górę”, „W dół”, „Usuń”.
  - **Po:** nagłówek „Ekrany” z „+” (menu: Ekran użytkownika, wyłączony przy 16, Ekran dodatkowy); motyw i wygaszacz, potem „Ekrany użytkownika n/16” i „Ekrany dodatkowe n”; wiersz z miniaturą 96×56 (`TshScreenRender` w skali `min(96 / W, 56 / H)`, wpisana w ramkę; rekord nieobsługiwany kreskowany), tytułem `screenTitle` (bez nazwy szarym kolorem), plakietkami „główny” i „własne kolory” oraz „nr {id} · widżety: {n}” (motyw: nazwa motywu); po najechaniu ↑, ↓ i „…” (Przenieś wyżej, Przenieś niżej, Usuń ekran…) nałożone na prawą stronę wiersza; usuwanie pyta jak dotąd w wierszu (`ConfirmRow`); ↑/↓ na klawiaturze przechodzą po wierszach; poniżej 1000 px okna wiersze jednoliniowe bez miniatur.
- **Plik:** `desktop/tshEditor/TshPropertyPanel.js` (nasz): usunięty `WidgetList` (lista i dodawanie widżetów są w „Warstwach”).
- **Plik:** `desktop/tshEditor/TshEditorRoute.js` (nasz): lewy panel to `TshScreenList` (`flexGrow` 6) nad `TshLayerList` (`flexGrow` 5), każdy z własnym przewijaniem; `deleteWidget(index)` zastępuje `deleteSelected` i `widgetName`: pytanie `remove_widget_question` „Usunąć widżet {{type}}: {{name}}?” albo `remove_widget_question_type` „Usunąć widżet {{type}}?” z `widgetLabel`; `addWidget(type)` dodaje i zaznacza; menu „+” warstw z `addableWidgetTypes()`.
- **Plik:** `desktop/tshEditor/TshUi.js` (nasz): `PaneHeader` (tytuł 11 px wersalikami, liczba, przyciski po prawej); `.tsh-row` z `position: relative` i `.tsh-actions` (przyciski wiersza pokazywane po najechaniu albo przy fokusie, nałożone).
- **Pliki:** `i18n/pl.js`, `i18n/en.js` (`tsh_editor`): usunięte `add_user_screen`, `add_additional_screen`, `widgets`; nowe `add_screen`, `user_screens`, `additional_screens`, `screen_menu`, `remove_screen_menu`, `screen_meta`, `own_colors_badge`, `layers`, `layers_none`, `layer_menu`, `layer_front`, `layer_forward`, `layer_backward`, `layer_back`, `remove_widget_menu`, `widget_unsupported`, `quoted`, `rect_label`, `screen_unsupported`, `screen_unnamed_user`, `screen_unnamed_additional`, `remove_widget_question_type`; `remove_widget_question` z `{{type}}` i `{{name}}`.
- **Sprawdzenie:** `npm --prefix work/working/tools test` (`tshWidgetLabel.test.js`: wszystkie 21 typów z danymi domyślnymi, nazwy z wejścia, puste i białe teksty, brak urządzenia, obcięcie przy 32/33 znakach, odsyłacz do ekranu bez nazwy i nieistniejącego, glif zastępczy, widżet nieobsługiwany, tytuły ekranów; `reorderWidget`). W zbudowanej aplikacji (izolowany `HOME`, CDP, prawdziwy `Page`, wejście TSG2 jak u użytkownika): ekran o nazwie z czterech spacji jako „Ekran 1 (bez nazwy)”, warstwy „Załącz czuwanie”, „Wyłącz czuwanie”, „Światło salon”, „„Brama””, „Prostokąt 476×38”, „„Sterowanie””, „„Furtka””, „Światło salon” z glifami; klik w wiersz zaznacza na podglądzie i odwrotnie; ↓ na wierszu; „Na wierzch” i Ctrl+Z; „Usuń widżet…” i Delete pytają z nazwą; „+” dodaje ekran; ↑ po najechaniu; poniżej 1000 px wiersze bez miniatur. Czas odświeżenia po zmianie z 19 miniaturami (16 ekranów × 20 widżetów, TSH2): mediana 39 ms od zdarzenia do drugiej klatki (budżet planu 50 ms).

### 051. Edytor TSH: inspektor z sekcjami i przewijaniem, wybór ikon z podglądem, menu „+ Widżet”
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** niewydane (po 1.2.0-port.2), oryginał 1.2.0
- **Powód:** plan `docs/plans/2026-11-14-tsh-editor-redesign.md`, zadanie 11 i sekcja 3.3 „Inspector”, „Icon picker”, „Toolbar” (RC12, RC13): długi panel właściwości bez podziału, ikona jako kod `0x11d` z przyciskiem „Wybierz” i siatką wszystkich glifów czcionki (także tych, których klawiatura nie rysuje), dodawanie widżetu z listy rozwijanej w panelu, nowy widżet w miejscu domyślnym TSH. Rozszerza wpisy 035, 049 i 050; kod Satel bez zmian.
- **Pliki nowe (kopiuj bez zmian):**
  - `desktop/tshEditor/tshWidgetGroups.js`: `WIDGET_GROUPS` (klucz i typy): `text` [0x00, 0x05, 0x30, 0x16], `control` [0x08, 0x27, 0x06, 0x07], `alarm` [0x33, 0x34, 0x36, 0x37, 0x23], `indicators` [0x01, 0x02, 0x03], `navigation` [0x25, 0x31, 0x35], `shapes` [0x17, 0x24]; `widgetGroups(t)` → `[{ key, items: [{ type, key, glyph, glyphKind }] }]` z glifem widżetu z `TshTemplates.newWidget`. Test `test/unit/tshEditor/tshWidgetGroups.test.js`.
  - `desktop/tshEditor/TshIconPicker.js`: pole z samym glifem 28 px (64×40, kod w podpowiedzi „Kod 0x11d”), okienko z siatką 8 kolumn po 40 px: „Użyte w tym układzie” (ikony wszystkich widżetów układu), potem „Wszystkie ikony” (`TshLayout.ICON_CODES` do `max` pola, odsyłacz do 0xff); bieżąca obwiedziona `primary500`; po otwarciu fokus na bieżącej; strzałki ±1 / ±8, Enter i spacja wybierają, Esc zamyka.
  - `desktop/tshEditor/TshInspector.js`: zakładki „Ekran” / „Widżet” idące za zaznaczeniem (zaznaczenie widżetu otwiera Widżet, odznaczenie wraca do Ekran; Widżet wyłączona bez zaznaczenia), nagłówek (tytuł z `screenTitle` albo `widgetLabel`, typ), przewijana treść sekcji zwijanych (stan w `localStorage` pod `tshEditor.inspector.collapsed`, odczyt i zapis w `try/catch`), na zakładce Widżet stopka „Usuń widżet” (obramowanie `danger`). Ekran: „Ogólne” (nazwa z licznikiem bajtów i podpowiedzią dla nazwy bez widocznych znaków, typ, ekran główny), „Wygląd” (Używaj motywu, kolory, „Siatka na klawiaturze”), „Tło” (wybór tła albo informacja o tle motywu); motyw: „Ogólne”, „Motyw”; wygaszacz: „Ogólne”, „Wygaszacz”. Widżet: „Położenie i wielkość” (X i Y obok siebie, wielkość M/Ś/D przełącznikiem segmentowym, „Wyrównaj do środka”), „Treść i urządzenie” (typ wariantu i pola danych), „Ikony” (pola `icon` i `states`), „Kolory”, „Zachowanie” (pola `flags`). Esc poza polem formularza odznacza widżet i nie dochodzi do `Page`.
- **Plik:** `desktop/tshEditor/tshLayout.js` (nasz)
  - **Przed:** `var ICON_RANGES = [[0x21, 0x22], [0x75, 0x75], [0xa1, 0x13d], …]` (cmap czcionki `WDGT`, 404 glify) i `ICON_CODES` z nich.
  - **Po:** `ICON_RANGES` usunięte; `var ICON_CODES = exports.ICON_CODES = FIRMWARE_ICON_RANGES.reduce(…)` (340 kodów, które rysuje firmware klawiatury; inne TSH i klawiatura pokazują jako 0x22).
- **Plik:** `desktop/tshEditor/TshPropertyPanel.js` (nasz): zostają kontrolki pól (`exports.WidgetField`, `ThemeField`, `BackgroundField`, `fieldKey`, `SIZES`); `WidgetProperties`, `ScreenProperties` i `exports.TshPropertyPanel` usunięte (układ jest w inspektorze). Ikona przez `C.IconField` z `used`; stany czuwania w jednym wierszu: „Stan n”, wybór ikony i kolor.
- **Plik:** `desktop/tshEditor/TshFormControls.js` (nasz), przepisany na klasy `TshUi`: wiersz z etykietą 104 px (13 px `secondary800`), `.tsh-ctl` 32 px, pole wyboru z etykietą po prawej, `NumberInput` (samo pole), `TextField` z podpowiedzią pod spodem, kolory z wartością hex, nowy `Segmented`, `IconField` z `TshIconPicker`, `SmallButton` jako `button.tsh-btn` (też w oknach „Karta SD” i kadrowania), `ConfirmRow`. Usunięte `Section` i stara siatka ikon.
- **Plik:** `desktop/tshEditor/tshHistory.js` (nasz): `exports.isFormField(target)` (INPUT, SELECT, TEXTAREA, element edytowalny); `shortcutFor` z niego korzysta (bez zmiany działania).
- **Plik:** `desktop/tshEditor/TshEditorRoute.js` (nasz): prawy panel to `TshInspector` (`onDelete` → `deleteWidget(null)`, `onClearSelection`); „+ Widżet” w pasku (podpis „Widżet”, w wąskim pasku sama ikona) i „+” w warstwach z `widgetGroups(t)`, wyłączone poza ekranem użytkownika i dodatkowym; `addWidget(type)`: `addWidget`, potem `moveWidget` tak, by środek ramki (`widgetLayout`) był w środku widocznej części sceny (`TshCanvas` `viewRef.visibleCenter()`), jako jeden krok cofania, i zaznaczenie.
- **Plik:** `desktop/tshEditor/TshCanvas.js` (nasz): `viewRef.current.visibleCenter()` (widok panelu przycięty do sceny w każdej osi); na ekranie użytkownika lub dodatkowym bez widżetów napis na środku „Dodaj widżet przyciskiem „+ Widżet””.
- **Plik:** `desktop/tshEditor/TshLayerList.js` (nasz): Esc na zaznaczonym wierszu odznacza i nie dochodzi do `Page`.
- **Plik:** `desktop/tshEditor/TshEditorShell.js` (nasz): `ScrollPane` usunięty (przewijają panele w środku).
- **Pliki:** `i18n/pl.js`, `i18n/en.js` (`tsh_editor`): usunięte `icon_choose`, `screen_properties`, `widget_properties`; `grid` „Siatka na klawiaturze” / „Grid on the keypad” (zapisana flaga ekranu, odróżniona od siatki edytora); nowe `inspector`, `tab_screen`, `tab_widget`, blok `section` (`general`, `look`, `background`, `position`, `content`, `icons`, `colors`, `behaviour`), `position`, `size_short_0…2` (M/Ś/D, S/M/L), `remove_widget_button`, `background_theme`, `name_blank_hint`, `icon_code`, `icons_used`, `icons_all`, `widget_button`, `canvas_empty`, blok `widget_group` (sześć grup).
- **Sprawdzenie:** `npm --prefix work/working/tools test` (`tshWidgetGroups.test.js`: każdy dodawalny typ dokładnie raz, bez 0x15, kolejność grup i glify; `isFormField`). W zbudowanej aplikacji (izolowany `HOME`, CDP, prawdziwy `Page`, wejście TSG2 jak u użytkownika): przy 1000×600 treść inspektora przewija się osobno i po przewinięciu widać „Ikona: aktywne”; okienko ikon ma „Użyte w tym układzie” i 340 ikon w 8 kolumnach po 40 px z fokusem na 0x11d, → i ↓ przechodzą do 0x126, Enter ustawia `iconOff`, pole pokazuje sam glif i „Kod 0x126” w podpowiedzi; sekcja „Ikony” zwija się i zostaje zwinięta dla kolejnego widżetu (`localStorage`); Esc wraca do zakładki Ekran; M ustawia wielkość 0; menu „+ Widżet” ma sześć grup, „Przycisk” trafia środkiem ramki w środek widocznej części sceny (dopasowanie i 200 % przewinięte do rogu), jest zaznaczony i cofa się jednym Ctrl+Z; „Usuń widżet” pyta „Usunąć widżet Przycisk: Światło salon?”.

### 052. Edytor TSH: wciśnięcie puszczone poza sceną nie zostaje „wciśnięte”, puste teksty da się kliknąć, Shift+klik jak Alt+klik
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** niewydane (po 1.2.0-port.2), oryginał 1.2.0
- **Powód:** przegląd przebudowy (I1, M2, M3, M7). Scena brała wskaźnik dopiero po progu 4 px, więc wciśnięcie widżetu przy krawędzi puszczone kawałek poza sceną zostawało w stanie „pressed”, a późniejsze wciśnięcie gdzie indziej przeciągnięte nad scenę przesuwało stary widżet (np. przycisk 84,211 → 284,43), także po zmianie ekranu. Tekst lub Data/czas z pustą treścią miały ramkę szerokości 0 (przy dopasowaniu mniej niż 1 px CSS), kropka pokazanego ekranu znikała w czasie przeciągania, a Alt+klik przechwytują niektóre menedżery okien Linuksa (Xfce, MATE, Cinnamon). Rozszerza wpisy 047 i 049; kod Satel bez zmian.
- **Plik:** `desktop/tshEditor/tshPointer.js` (nasz)
  - **Przed:** `pointerReducer` bez identyfikatora wskaźnika; `"move"` sprawdzał tylko `state.phase === "idle" || !state.movable || …próg`; trafienie `right = l.left + Math.max(l.width, 1) + pen`.
  - **Po:** `"down"` zapamiętuje `pointerId: event.pointerId ?? null`; `"move"` i `"up"` innego wskaźnika (`otherPointer(state, event)`, oba id znane) nic nie zmieniają; `"move"` z `buttons` bez bitu 1 zwraca `IDLE` (puszczenie przegapione; sprawdzenie przeniesione z `TshCanvas`). Nowe `MIN_TEXT_HIT_PX = 8` i `hitBox(l, zoom)` → `{ left, width }`: ramka tekstu węższa niż 8 px CSS rośnie do nich wokół swojego środka, inne ramki mają co najmniej 1 px klawiatury od lewej krawędzi; `hitKind` liczy z `hitBox`.
- **Plik:** `desktop/tshEditor/TshCanvas.js` (nasz)
  - **Przed:** `var pointerRef = (0, react.useRef)(TshPointer.IDLE);` w `KeypadScreen`; `setPointerCapture` dopiero przy przejściu `pressed` → `dragging` w `onPointerMove`; `if ((event.buttons & 1) === 0) { dispatch({ type: "cancel" }); return; }` w `onPointerMove`; `event.altKey ? props.selectedWidget : null` w `onPointerDown`; `boxStyle` z `left: l.left * z`, `width: Math.max(l.width, 1) * z`; uchwyt kotwicy `left: -selected.offsetX * scale - 4`.
  - **Po:** `pointerRef` tworzy `TshCanvas` i podaje `KeypadScreen` (`props.pointerRef`, zerowany przy odmontowaniu); `viewRef.current.busy()` → `pointerRef.current.phase !== "idle"` (czyta trasa, wpis 053). `onPointerDown` woła `frameRef.current?.setPointerCapture?.(event.pointerId)` przed `dispatch({ type: "down", …, pointerId: event.pointerId })`; `onPointerMove` podaje `buttons` i `pointerId`; `onPointerUp` podaje `pointerId`; nowe `onLostPointerCapture` → `cancel`, gdy stan nie jest `idle`; `useEffect(…, [screen])` → `cancel`, gdy trwa wciśnięcie (inny ekran, cofnięcie, zmiana z zewnątrz). Cykl `event.altKey || event.shiftKey`. `boxStyle` z `TshPointer.hitBox(l, z)` (obwiednia pustego tekstu widoczna), uchwyt `left: (selected.left - selected.offsetX - TshPointer.hitBox(selected, scale).left) * scale - 4`.
- **Plik:** `desktop/tshEditor/tshLayout.js` (nasz), `screenDrawList`
  - **Przed:** `exports.pageDots(m, users.length, users.indexOf(screen))`
  - **Po:** `exports.pageDots(m, users.length, users.findIndex(function (r) { return r.uid === screen.uid; }))` (w czasie przeciągania scena rysuje kopię ekranu).
- **Pliki:** `i18n/pl.js`, `i18n/en.js` (`tsh_editor.help`): `key_alt_click` „Alt+klik, Shift+klik” / „Alt+click, Shift+click”.
- **Sprawdzenie:** `npm --prefix work/working/tools test` (`tshPointer.test.js`: ruch bez wciśniętego przycisku kończy wciśnięcie i późniejszy ruch z przyciskiem nie przeciąga starego widżetu (bez poprawki test nie przechodzi), tylko wskaźnik, który wcisnął, `hitBox` pustego tekstu przy 1 i 0,5; `tshScreenRender.test.js`: kropka dla kopii ekranu). W zbudowanej aplikacji (izolowany `HOME`, CDP, prawdziwy `Page`, wejście TSG2 jak u użytkownika): wciśnięcie przycisku 1,5 px nad dolną krawędzią puszczone 1,5 px pod nią zaznacza i nie przesuwa, potem wciśnięcie na marginesie panelu przeciągnięte nad scenę nie zmienia `screens_config_base64` (bez poprawki przycisk ląduje na 264,40); przeciągnięcie ze sceny dalej działa; Shift+klik w 120,250 wybiera ramkę pod przyciskiem, Alt+klik wraca.

### 053. Edytor TSH: Esc anuluje pytanie, skróty czekają na odpowiedź i koniec przeciągania, zaznaczenie po cofnięciu kolejności
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** niewydane (po 1.2.0-port.2), oryginał 1.2.0
- **Powód:** przegląd przebudowy (I2, I3, M5, M6). Okno pytania aplikacji (`logic/showConfirmDialog.js`) nie obsługuje Esc: Esc przy pytaniu „Usunąć widżet…?” trafiał do `Page`, który przy niezapisanych zmianach pokazywał „Opuścić ekran?” w miejsce pytania; odpowiedź pierwszego pytania ginęła, flaga `deletingRef` zostawała ustawiona i Delete, Backspace, „Usuń” w menu warstwy i „Usuń widżet” przestawały działać do zamknięcia edytora. Ctrl+Z, G i powiększenie działały za pytaniem i w czasie przeciągania (cofnięcie zmiany kolejności przy pytaniu usuwało inny widżet niż nazwany, cofnięcie w trakcie przeciągania dawało widmo widżetu i błąd przy puszczeniu). Cofnięcie „Na wierzch” zostawiało zaznaczenie na starym indeksie, czyli na innym widżecie; Backspace i G działały na przyciskach okienek (menu, wybór ikon). Rozszerza wpisy 048 i 050; kod Satel bez zmian.
- **Plik nowy (kopiuj bez zmian):** `desktop/tshEditor/tshAsk.js`: `createAsker({ confirm, hide, target, inEditor })` → `{ ask(title, text, ok, cancel), pending(), dismiss() }`. Przy otwartym pytaniu nasłuch `keydown` i `pointerdown` na `target` w fazie przechwytywania: Esc → `preventDefault()`, `stopPropagation()`, `hide()` i odpowiedź `false` (Esc nie dochodzi do `Page`); wciśnięcie w elemencie edytora (`inEditor(node)`, nakładka okna pytania zakrywa całe okno, więc taki klik znaczy, że inne okno zastąpiło pytanie) → `false`; nowe pytanie odpowiada `false` poprzedniemu; `dismiss()` przy zamknięciu edytora. Test `test/unit/tshEditor/tshAsk.test.js`.
- **Plik:** `desktop/tshEditor/TshEditorRoute.js` (nasz)
  - **Przed:** `var deletingRef = (0, react.useRef)(false);`; `(0, module623.confirmDialog)(…)` w `startFresh`, `customBackground`, `deleteWidget` i `save`; `deleteWidget` z `if (!w || deletingRef.current) return; deletingRef.current = true; try { … TshEditorModel.removeWidget(stateRef.current, sel.uid, at) … } finally { deletingRef.current = false; }`; w `keyRef.current` `if (event.defaultPrevented || !historyRef.current || sdOpen[0] || crop[0] || saved[0]) return;`; `stepHistory` z `TshHistory.clampSelection(next.present, selectionRef.current)`.
  - **Po:** `deletingRef` usunięte; `rootRef` (element powłoki) i `var asker = useMemo(() => TshAsk.createAsker({ confirm: (title, text, ok, cancel) => module623.confirmDialog(title, text, ok, cancel), hide: () => module623.hideConfirmDialog(), target: window, inEditor: (node) => !!rootRef.current && !!node && rootRef.current.contains(node) }), [])`, `asker.dismiss()` przy odmontowaniu; cztery pytania przez `asker.ask(…)`. `deleteWidget`: `var asked = stateRef.current;` przy pytaniu, po odpowiedzi `if (!(await asker.ask(…)) || stateRef.current !== asked) return;` i `TshEditorModel.removeWidget(asked, sel.uid, at)`. `keyRef.current` wychodzi też przy `asker.pending()` i `canvasViewRef.current?.busy?.()` (wpis 052). `stepHistory` → `TshHistory.clampSelection(next.present, selectionRef.current, h.present)`. `<TshEditorShell.TshEditorShell rootRef={rootRef} …>`.
- **Plik:** `desktop/tshEditor/TshEditorShell.js` (nasz): prop `rootRef`: `ref={function (node) { shellRef.current = node; if (props.rootRef) { props.rootRef.current = node; } }}`.
- **Plik:** `desktop/tshEditor/tshHistory.js` (nasz)
  - **Przed:** `exports.clampSelection = function (state, selection)` tylko z indeksem; `shortcutFor` → `if (isFormField(event.target)) return null;`.
  - **Po:** `clampSelection(state, selection, from)`: z `from` (stan, w którym zaznaczono) widżet szukany po treści (`JSON.stringify` równy), gdy pod jego indeksem jest teraz inny; widżet o zmienionej treści zostaje pod indeksem. Nowe `inPopup(target)` (`target.closest('[role="menu"],[role="dialog"]')`); `shortcutFor` zwraca `null` także dla celów w okienkach `TshUi.Popover`.
- **Poprawka po przeglądzie (N1), `desktop/tshEditor/tshHistory.js`, `clampSelection`:**
  - **Przed:** `if (was && !sameWidget(widgets[selection.widget], was)) { var at = widgets.findIndex(function (w) { return sameWidget(w, was); }); … }` (po przesunięciu zaznaczonego widżetu, który miał identycznego bliźniaka, np. dwa teksty dodane „+ Widżet” bez przesuwania, ponowienie przenosiło zaznaczenie na bliźniaka).
  - **Po:** szukanie po treści tylko wtedy, gdy miejsce zajął widżet, który w `from` stał pod innym indeksem (`var taken = !!was && !!now && !sameWidget(now, was) && before.record.widgets.some(function (w, i) { return i !== index && sameWidget(w, now); });`), i wybór dopasowania najbliższego staremu indeksowi. Test: bliźniaki przy cofnięciu i ponowieniu przesunięcia, bliźniaki po zmianie kolejności (bez poprawki pierwszy nie przechodzi).
- **Poprawka po przeglądzie (N2), `desktop/tshEditor/tshAsk.js` i `TshEditorRoute.js`:** gdy pytanie o wyjście przy zamykaniu okna (`setPreventLeaveCloseGuard`) zastąpiło otwarte pytanie edytora i użytkownik wybrał „Zostań”, `pending()` zostawało `true` (skróty zablokowane do kliknięcia w edytorze, pierwszy Esc połknięty).
  - **Przed:** `pending: function () { return current !== null; }`; `onKey` dla Esc zawsze `preventDefault()`, `stopPropagation()`, `hide()`.
  - **Po:** nowe `SHOW_GRACE_MS = 500` i opcjonalne `deps.shows(title, text)`, `deps.now()`; `alive(entry)`: pytanie widoczne → `seen = true`; niewidoczne po tym, jak było widać, albo po 500 ms od zadania → odpowiedź `false`. `pending()` → `current !== null && alive(current)`; Esc przy pytaniu, którego już nie ma, przechodzi dalej bez zatrzymania. Trasa podaje `shows`: element z `aria-label` równym `` `${title}. ${text}` `` (karta okna aplikacji ma `accessibilityLabel={`${M.title}. ${M.description}`}`, `logic/showConfirmDialog.js`). Testy: zastąpienie zwalnia edytor, 500 ms na pojawienie się, Esc po zniknięciu przechodzi. W zbudowanej aplikacji (atrapa okna z kartą o tej etykiecie): Delete pyta, pytanie o wyjście je zastępuje, „Zostań”, od razu Ctrl+Z cofa przesunięcie; Delete pyta znowu, Esc anuluje bez dojścia do `Page`.
- **Sprawdzenie:** `npm --prefix work/working/tools test` (`tshAsk.test.js`: odpowiedź okna, Esc w fazie przechwytywania z `hide`, jedno pytanie naraz, klik w edytorze kończy zastąpione pytanie, `dismiss` i błąd okna; `tshHistory.test.js`: zaznaczenie po cofnięciu i ponowieniu zmiany kolejności, widżet zmieniony i usunięty, skróty w menu i okienkach). W zbudowanej aplikacji (izolowany `HOME`, CDP, prawdziwy `Page`, atrapa okna pytania zastępująca je jak oryginał, Esc `Page` pyta o wyjście przy zmianach; wejście TSG2): po przesunięciu strzałką Delete pyta, Esc zamyka pytanie bez pytania o wyjście i bez dojścia do `Page`, widżet zostaje, Delete pyta znowu; Ctrl+Z, G i Ctrl+= przy pytaniu nic nie zmieniają, potwierdzenie usuwa nazwany widżet; Ctrl+Z w czasie przeciągania nic nie zmienia, puszczenie zapisuje przesunięcie (bez błędu); po „Na wierzch” i Ctrl+Z zaznaczona jest „Brama”, Ctrl+Y przenosi zaznaczenie z nią; Backspace i G na pozycji menu warstwy nie pytają i nie przełączają siatki. Bez poprawki te kontrole nie przechodzą.

### 054. Edytor TSH: klawiatura w menu wierszy list, Esc w polu inspektora kończy edycję
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** niewydane (po 1.2.0-port.2), oryginał 1.2.0
- **Powód:** przegląd przebudowy (M1, M4). Obsługa klawiszy wiersza warstwy łapała Enter, spację i strzałki z jego przycisku „…” i z menu (okienko to portal, a zdarzenia React przechodzą przez portal do wiersza): Enter na „…” nie otwierał menu, Enter na „Na wierzch” tylko zaznaczał wiersz, strzałki w menu przenosiły zaznaczenie na inny wiersz; strzałki w menu wiersza ekranu zmieniały ekran. Esc w polu inspektora (np. nazwa) dochodził do `Page` i zamykał edytor albo pytał o wyjście. Rozszerza wpisy 050 i 051; kod Satel bez zmian.
- **Plik:** `desktop/tshEditor/TshLayerList.js` (nasz), `onKeyDown` wiersza
  - **Przed:** `}} onKeyDown={function (event) { if (event.key === "ArrowDown" && index …`
  - **Po:** na początku `if (event.target !== event.currentTarget) { return; }` (klawisze przycisku i menu zostają w nich).
- **Plik:** `desktop/tshEditor/TshScreenList.js` (nasz), `onKeyDown` wiersza ekranu
  - **Przed:** `}} onKeyDown={function (event) { var next = event.key === "ArrowDown" ? …`
  - **Po:** na początku `if (event.target !== event.currentTarget) { return; }`.
- **Plik:** `desktop/tshEditor/TshInspector.js` (nasz), `onKeyDown`
  - **Przed:** `if (event.key === "Escape" && props.selectedWidget !== null && !event.defaultPrevented && !TshHistory.isFormField(event.target)) { event.preventDefault(); event.stopPropagation(); props.onClearSelection(); }`
  - **Po:** `if (event.key !== "Escape" || event.defaultPrevented) return;`; w polu formularza (`TshHistory.isFormField`) `preventDefault()`, `stopPropagation()`, `event.target.blur?.()`; poza polem przy zaznaczonym widżecie jak dotąd odznaczenie. Esc bez zaznaczenia na scenie lub na wierszu dalej dochodzi do `Page` (zamyka edytor, pyta przy zmianach), jak w oryginale.
- **Sprawdzenie:** w zbudowanej aplikacji (izolowany `HOME`, CDP, prawdziwy `Page`, wejście TSG2): Enter na „…” zaznaczonego wiersza warstwy otwiera menu, ↓ w menu nie zmienia zaznaczonego wiersza, Esc zamyka menu bez zamykania edytora; ↑ na przycisku wiersza ekranu nie zmienia ekranu; Esc w polu tekstowym inspektora zdejmuje z niego fokus, edytor zostaje otwarty (`closeModalStack` nie wołany). Bez poprawki Enter na „…” nie otwiera menu.

### 055. Tabela obiektów i tabela awarii: stan urządzeń ze strumienia stanów zamiast z Realm
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** niewydane (po 1.2.0-port.2), oryginał 1.2.0
- **Powód:** błąd po przeniesieniu na 1.2.0. Tabela czytała `device.state` ze struktury z Realm (`hub.structure.tree(data, t).rooms`), a 1.2.0 nie zapisuje już stanu urządzeń w Realm: schemat `schemaRoomsDevices` w `logic/HubMapping.js` nie ma pola `state`, stany są w `deviceStatesSubject` (`logic/stageStructureStatesHub.js`, `BehaviorSubject` z `Map` po `GetDeviceKey(key)`). Skutek: puste kolumny Obwód, Stan, Usterki, Sygnał, Zasilanie i Blokada, filtry „Z usterkami”, „Naruszone”, „Sabotaż/maskowanie” i „Zablokowane” nigdy nic nie znajdowały, a podział na „Wyjścia” (opcje `SET_ON_OFF`/`SET_OPEN_CLOSE` ze stanu) był zły. Tabela awarii (wpis 027) bierze wiersze z tego samego `useDeviceRows`, więc też miała puste usterki, sygnał i zasilanie. Przepisy 19 i 21; kod Satel bez zmian.
- **Plik:** `desktop/deviceTable/useDeviceRows.js` (nasz)
  - **Przed:**
    ```js
    var fromCache = require("../../logic/fromCache.js");
    var deviceTableModel = require("./deviceTableModel.js");
    ...
      return (0, fromCache.fromCache)("DeviceTable()", function (data) {
        return lodash.isNil(data) ? [] : deviceTableModel.buildRows(i18nextMin.t, hub.structure.tree(data, i18nextMin.t).rooms);
      });
    ```
  - **Po:**
    ```js
    var useDerivedWithHubInfo = require("../../hooks/useDerivedWithHubInfo.js");
    var deviceTableModel = require("./deviceTableModel.js");
    var deviceTableNames = require("./deviceTableNames.js");
    ...
      return (0, useDerivedWithHubInfo.fromCacheWithStates)("DeviceTable()", function (data) {
        return lodash.isNil(data) ? null : hub.structure.tree(data, i18nextMin.t).rooms;
      }, function (rooms, states) {
        return rooms ? deviceTableModel.buildRows(i18nextMin.t, rooms, states, deviceTableNames.deviceTableNames) : [];
      });
    ```
    `fromCacheWithStates(name, fromRealm, withStates)` to eksport oryginału (`hooks/useDerivedWithHubInfo.js`, kotwica `exports.fromCacheWithStates = function (e, A, t, n)`), którego używają oryginalne ekrany urządzeń: wynik z Realm plus bieżąca `Map` stanów, przeliczane przy każdej zmianie stanu, porównanie `lodash.isEqual`.
- **Plik nowy (kopiuj bez zmian):** `desktop/deviceTable/deviceTableNames.js`: obiekt `deviceTableNames` z odwołaniami do usług aplikacji, które model dostaje z zewnątrz (dzięki temu `deviceTableModel.js` ładuje się w testach node bez usług): `roomName: ResolveRoomName.ResolveRoomName`, `isInput: ResolveRoomName.IsExpanderInput`, `isTamper: ResolveRoomName.IsTemporaryChannel`, `channelName: BuildDeviceViewModel.GetChannelName`, `deviceName: ShowDeviceIsArmingWarningModal.GetDeviceName`.
- **Plik:** `desktop/deviceTable/deviceTableModel.js` (nasz)
  - **Przed:**
    ```js
    var lodash = require("../../../lib/lodash/lodash.js");
    var ResolveRoomName = require("../../logic/ResolveRoomName.js");
    ...
    var classifyDevice = exports.classifyDevice = function (device) {
      var options = device.state?.settings?.options ?? [];
      return { input: (0, ResolveRoomName.IsExpanderInput)(device.type, Number(device.key.uuidChannel)), ... };
    };
    ...
    exports.buildRows = function (t, rooms) {
      ...
          var settings = device.state?.settings ?? {};
          var errorCodes = device.state?.errorCodes ?? [];
          var kind = classifyDevice(device);
    ...
            errors: errorCodes.map(function (code) { return t(`common.options.device.error-codes.values.${...}`); }).join(", "),
            hasErrors: errorCodes.length > 0,
            violated: settings.violation === true || settings.inputState === 1 || settings.inputState === 4,
            tampered: settings.inputState === 2 || settings.inputState === 3 || settings.inputState === 4,
    ```
  - **Po:**
    ```js
    var GetDeviceKey = require("../../logic/GetDeviceKey.js");
    ...
    var InputState = ExpanderInputType.ExpanderInputState;
    var isNil = function (value) { return value === null || value === undefined; };
    // Live state of a device: the state stream first (since 1.2.0 Realm keeps no state), then a state on the device itself.
    var deviceState = function (device, states) {
      return states?.get((0, GetDeviceKey.GetDeviceKey)(device.key)) ?? device.state ?? {};
    };
    var classifyDevice = exports.classifyDevice = function (device, state, names) {
      var options = state?.settings?.options ?? [];
      return { input: names.isInput(device.type, Number(device.key.uuidChannel)), ... };
    };
    ...
    exports.buildRows = function (t, rooms, states, names) {
      ...
          var state = deviceState(device, states);
          var settings = state.settings ?? {};
          var errorCodes = state.errorCodes ?? [];
          var memoryCodes = state.errorCodesMemory ?? [];
          var kind = classifyDevice(device, state, names);
    ...
            errors: errorsText(t, errorCodes, memoryCodes),
            hasErrors: errorCodes.length > 0,
            hasErrorsInMemory: memoryCodes.length > 0,
            violated: settings.violation === true || settings.inputState === InputState.VIOLATION || settings.inputState === InputState.VIOLATION_AND_MASKING,
            tampered: settings.inputState === InputState.SABOTAGE || settings.inputState === InputState.MASKING || settings.inputState === InputState.VIOLATION_AND_MASKING,
    ```
    Pozostałe odwołania do usług przez `names` (`names.roomName`, `names.channelName`, `names.isTamper`, `names.deviceName`). `lodash` usunięty z modelu: `lodash.isNil` → `isNil`, `lodash.deburr` w `normalize` → `String(text ?? "").normalize("NFD").replace(/\p{M}/gu, "").replace(/ł/g, "l").replace(/Ł/g, "L").toLowerCase()`. Usterki: bieżące jak dotąd, a za nimi `` `${t("device_table.in_memory")}: …` `` z kodami tylko z pamięci (`errorsText`). Stan wejścia: gdy `inputState` nie ma nazwy, a `violation` jest typu `boolean`, tekst `widgets.expander.input-state-values.violation` albo `.normal` (`inputStateText`).
- **Plik:** `desktop/deviceTable/DeviceTableScreen.js` (nasz), filtr „Z usterkami”
  - **Przed:** `(!filters.errors || row.hasErrors)`
  - **Po:** `(!filters.errors || row.hasErrors || row.hasErrorsInMemory)` (także urządzenia z awarią tylko w pamięci, jak lista awarii).
- **Test:** `test/unit/desktop/deviceTableModel.test.js` (nowy): stan ze strumienia, stan zapisany na urządzeniu jako zapas, usterki z pamięci za bieżącymi, podział wyjść po opcjach stanu na żywo.
- **Sprawdzenie:** `npm --prefix work/working/tools test`. W aplikacji z centralą (okno ≥ 900 px) „Lista obiektów”: kolumny Obwód, Stan, Sygnał, Zasilanie, Blokada i Usterki wypełnione; filtr „Naruszone” przy otwartym czujniku pokazuje to wejście; zakładka „Wyjścia” ma przekaźniki i rolety; zmianę stanu wejścia widać w tabeli bez ponownego otwierania. Lista awarii: usterki, sygnał i zasilanie wypełnione.

### 056. Tabela obiektów: kolumny Moduł i Wartość, filtr typów, ukrywanie pustych kolumn, szukanie nad tabelą
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** niewydane (po 1.2.0-port.2), oryginał 1.2.0
- **Powód:** decyzja użytkownika z 2026-11-15: przy wielu ekspanderach nie widać, w którym module jest wejście lub wyjście; potrzebna wartość rezystancji wejść, szybkie zawężenie do typu urządzenia i mniej pustych kolumn. W kolumnie „Moduł” bez numeru systemowego modułu (decyzja użytkownika). Przepis 19; kod Satel bez zmian.
- **Plik:** `desktop/deviceTable/deviceTableModel.js` (nasz)
  - **Przed:** wiersz z `deviceType: (0, ShowDeviceIsArmingWarningModal.GetDeviceName)(device.type) ?? "",`, bez pól modułu i wartości; `exports.matchesQuery` z `` normalize(`${row.name} ${row.room}`) ``; eksporty `isBlocked`, `matchesQuery`, `sortRows`, `buildRows`, `classifyDevice`.
  - **Po:**
    ```js
    var HubGenericName = require("../../logic/HubGenericName.js");
    var MeasurementUnit = require("../../logic/MeasurementUnit.js");
    ...
          var mainBoard = device.type === ExpanderInputType.HubDeviceType.MAIN_BOARD;
          var deviceType = names.deviceName(device.type) ?? "";
          var typeLabel = mainBoard ? t("device_table.main_board") : deviceType;
    ...
            deviceType: deviceType,
            typeLabel: typeLabel,
            module: mainBoard ? typeLabel : [deviceType, device.key.uuid].filter(Boolean).join(" "),
            moduleTitle: HubGenericName.DeviceGenericNameMap.get(device.type) ?? "",
    ...
            inputValue: isNil(settings.inputValue) ? "" : `${Math.round(Number(settings.inputValue) * 10) / 10}${MeasurementUnit.MeasurementUnit.Ohm}`,
    ```
    `matchesQuery` szuka w `` `${row.name} ${row.room} ${row.module}` ``. Nowe czyste funkcje: `matchesTypes(row, types, available)` (pusty wybór albo wybór bez typu z `available` nie filtruje), `typeOptions(rows, counted)` (jeden chip na `deviceTypeId` z `rows`, etykieta `typeLabel`, liczba z `counted`, sortowane `collator`), `visibleColumns(columns, rows)` (usuwa kolumny bez wartości w żadnym wierszu; gdy zniknie kolumna elastyczna o szerokości `0`, ostatnia zostaje elastyczna; bez zmian zwraca tę samą tablicę).
- **Plik:** `desktop/deviceTable/DeviceTableScreen.js` (nasz)
  - **Przed:**
    ```js
      input: [["room", 130], ["deviceType", 80], ["channel", 56], ["circuit", 80], ["sensitivity", 70], ...
      output: [["room", 130], ["deviceType", 80], ["channel", 56], ["state", 90], ...
      other: [["room", 130], ["deviceType", 110], ["channel", 56]].concat(COMMON_END)
    ...
      other: [["room", 110], ["deviceType", 90], ["errors", 0]]
    ...
      var scoped = rows.filter(function (row) {
        return (category === null || row.category === category) && (!params?.roomId || row.roomId === params.roomId) && deviceTableModel.matchesQuery(row, query) && ...;
      });
    ...
      var columns = (widthState[0] >= 1750 ? WIDE : widthState[0] >= 1300 ? MEDIUM : NARROW)[tab];
    ...
      return <module32.Page isModal={true} modalMaxWidth="100%" title={params?.name ?? t("all")}><View style={styles.bar}><TextInput ref={inputRef} style={styles.search} ... />{props.toggle}</View><View style={styles.bar}>{TABS.map(...
    ```
  - **Po:** kolumna `["module", 120]` (Pozostałe 130, średnie okno 110/110/120) za „Typ” w WIDE i MEDIUM, `["inputValue", 70]` (średnie 60) za „Obwód” na wejściach; NARROW „Pozostałe”: `[["room", 110], ["module", 120], ["errors", 0]]`. Zakres zakładki bez szukania i filtrów:
    ```js
      var base = rows.filter(function (row) {
        return (category === null || row.category === category) && (!params?.roomId || row.roomId === params.roomId);
      });
      var tabBase = base.filter(function (row) { return inTab(row, tab); });
      var tabTypes = lodash.uniq(tabBase.map(function (row) { return row.deviceTypeId; }));
      var selectedTypes = filters.types ?? [];
      var filtered = base.filter(function (row) { return deviceTableModel.matchesQuery(row, query) && ...; });
      var scoped = filtered.filter(function (row) {
        return !inTab(row, tab) || deviceTableModel.matchesTypes(row, selectedTypes, tabTypes);
      });
    ...
      var typeOptions = tabTypes.length > 1 ? deviceTableModel.typeOptions(tabBase, filtered.filter(function (row) { return inTab(row, tab); })) : [];
    ...
      var shownColumns = deviceTableModel.visibleColumns((widthState[0] >= 1750 ? WIDE : widthState[0] >= 1300 ? MEDIUM : NARROW)[tab], tabBase);
      var columns = (0, react.useMemo)(function () { return shownColumns; }, [shownColumns.join("|")]);
    ```
    Układ: wiersz 1 to zakładki, filtry i lista pomieszczeń, a przełącznik widoku na prawym końcu (`<View style={{ marginLeft: "auto", paddingLeft: 12 }}>{props.toggle}</View>`); styl `bar` z `flexWrap: "wrap"`, `rowGap: 6`. Wiersz 2 (tylko gdy w zakładce są co najmniej dwa typy): chip `device_table.filter_all_types` („Wszystkie typy”, aktywny bez wyboru) i chip na typ `` `${option.label} ${option.count}` ``, wybór wielokrotny (`toggleType`, wybór w `filters.types`, zapamiętany w `deviceTableStore` z resztą filtrów; typy spoza zakładki są pomijane). Wiersz 3: pole szukania w `searchBox` (`position: "relative"`, `maxWidth: 720`), wysokość 40, czcionka 15, `paddingRight: 36`, przycisk `×` (`searchClear`, 32×32, tylko przy tekście) czyści szukanie i wraca fokusem do pola; tuż pod nim tabela. Komórka ma podpowiedź `` row[`${column[0]}Title`] || row[column[0]] `` (dla „Moduł” ogólna nazwa typu z `moduleTitle`, np. „Zone expander”).
- **Pliki:** `i18n/pl.js`, `i18n/en.js`, blok `device_table`:
  - **Przed:** `"search": "Szukaj po nazwie lub pomieszczeniu…"` / `"Search by name or room…"`; ostatni klucz `"column_errors": "Usterki"` / `"Faults"`.
  - **Po:** `"search": "Szukaj po nazwie, pomieszczeniu lub module…"` / `"Search by name, room or module…"`; za `column_errors`: `"column_module": "Moduł"` / `"Module"`, `"column_inputValue": "Wartość"` / `"Value"`, `"filter_all_types": "Wszystkie typy"` / `"All types"`, `"main_board": "Centrala"` / `"Main board"` (oraz klucze menu z wpisu 058).
- **Test:** `test/unit/desktop/deviceTableModel.test.js`: centrala jako „Centrala” z nazwą ogólną w podpowiedzi, szukanie po numerze seryjnym modułu, nazwie i pomieszczeniu, chipy typów z liczbami, wybór typów, `visibleColumns`.
- **Sprawdzenie:** `npm --prefix work/working/tools test`. W aplikacji z centralą: kolumna „Moduł” z typem i numerem seryjnym modułu (`key.uuid`), dla wejść płyty głównej „Centrala”, podpowiedź z nazwą ogólną; „Wartość” w Ω na wejściach, które ją podają; chipy typów w zakładce z kilkoma typami, kilka naraz zawęża do sumy typów, „Wszystkie typy” zdejmuje wybór, przy jednym typie wiersza chipów nie ma; kolumna pusta w całej zakładce znika i nie wraca przy szukaniu; szukanie numeru seryjnego modułu zawęża tabelę; `×` czyści szukanie. Okno < 900 px: oryginalny `GroupScreen`.

### 057. Szczegóły urządzenia otwarte z tabeli: X i Esc wracają do tabeli
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** niewydane (po 1.2.0-port.2), oryginał 1.2.0
- **Powód:** X w szczegółach urządzenia otwartych z tabeli obiektów albo z tabeli awarii zamykał cały stos modali (ekran główny), więc trzeba było od nowa otwierać tabelę. `Esc` wracał do tabeli obiektów tylko dzięki nasłuchowi z wpisu 024, a z tabeli awarii zamykał wszystko. Przepisy 19 i 21.
- **Plik nowy (kopiuj bez zmian):** `desktop/shared/tableDetailsClose.js`: `TABLE_SCREENS = [ScreenName.GroupComponent, ScreenName.HubFailures]` i `returnsToTable(state)`: `true`, gdy w tym nawigatorze trasa tuż pod bieżącą (`state.routes[state.index - 1].name`) to jedna z `TABLE_SCREENS`.
- **Plik:** `screens/DeviceDashboardScreen.js` (Satel)
- **Kotwica:** `resetScrollOnFocus: true` w obiekcie `pageProps` przekazywanym do listy kart (`title: … Q.name, headerAccessibilityLabel: D,`); w `DeviceDashboardScreen` 1 trafienie.
- **Przed:**
  ```js
    var isLoading = (0, AppProvider.useAppState)().state.isLoading;
    (0, react.useEffect)(function () {
  ...
        headerAccessibilityLabel: D,
        resetScrollOnFocus: true
      }} cards={...
  ```
- **Po:**
  ```js
  var DesktopEditor = require("../logic/DesktopEditor.js");
  var useCloseModalStack = require("../hooks/useCloseModalStack.js");
  var tableDetailsClose = require("../desktop/shared/tableDetailsClose.js");
  ...
    var isLoading = (0, AppProvider.useAppState)().state.isLoading;
    // Desktop: X on details opened from a table returns to that table instead of the home screen.
    var desktopPath = (0, react.useRef)(DesktopEditor.isDesktopEditor()).current;
    var navigation = (0, module58.useNavigation)();
    var closeModalStack = (0, useCloseModalStack.useCloseModalStack)();
    var closeHandler = desktopPath ? function () {
      if (tableDetailsClose.returnsToTable(navigation.getState())) {
        navigation.goBack();
      } else {
        closeModalStack();
      }
    } : undefined;
    (0, react.useEffect)(function () {
  ...
        headerAccessibilityLabel: D,
        resetScrollOnFocus: true,
        closeHandler: closeHandler
      }} cards={...
  ```
  `Page` (`screens/webPageStyle.js`) przekazuje `closeHandler` do X w nagłówku (`onClose={A.closeHandler}`) i do `useEscapeHandler`, więc X i `Esc` działają tak samo. Na drodze oryginalnej `closeHandler` jest `undefined`, czyli oryginalne `closeModalStack`. Szczegóły otwarte skądinąd (ekran główny, pomieszczenie) zamykają się jak dotąd.
- **Test:** `test/unit/desktop/deviceTableModel.test.js` (`returnsToTable`: tabela obiektów i lista awarii pod szczegółami → `true`; inna trasa, pierwszy ekran, brak stanu → `false`).
- **Sprawdzenie:** `npm --prefix work/working/tools test`. Okno ≥ 900 px: „Lista obiektów” → wiersz → X wraca do tabeli z zachowanym szukaniem; to samo `Esc`. „Awarie” → wiersz → X i `Esc` wracają do tabeli awarii. Szczegóły z kafelka na ekranie głównym: X zamyka jak w oryginale. Okno < 900 px: bez zmian.

### 058. Panel boczny: „Awarie” w Podsumowaniu, nowa grupa „Pozostałe” z zagnieżdżonym „Obiektem”
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** niewydane (po 1.2.0-port.2), oryginał 1.2.0
- **Powód:** decyzja użytkownika z 2026-11-15: w „Konfiguracji” tylko pozycje używane przy konfiguracji (Integracja, Harmonogramy, Symulacja obecności, Diagnostyka), rzadkie ustawienia w zwiniętej grupie „Pozostałe”, ustawienia obiektu razem z edycją i usuwaniem, a awarie jako stała pozycja panelu zamiast pomarańczowego paska nad menu. Zastępuje układ grup z wpisu 041; mechanizm z wpisów 029 i 041 bez zmian. Przepisy 23 i 25.
- **Plik:** `desktop/shared/desktopMenuGroups.js` (nasz)
  - **Przed:**
    ```js
    var SUMMARY_SCREENS = [ScreenName.GroupComponent, ScreenName.EventLogList];
    var CONFIGURATION_SCREENS = [ScreenName.HubConfiguration, ScreenName.ScheduleList, ScreenName.Integrations, ScreenName.HubMonitoring, ScreenName.EmailConfigScreen, ScreenName.HomeUsers, ScreenName.UserProfile, ScreenName.SatelTokenKey];
    ...
      var listed = HIDDEN_SCREENS.concat(SUMMARY_SCREENS, CONFIGURATION_SCREENS);
    ...
      }, {
        id: "configuration",
        title: t("device_table.menu_configuration"),
        items: byScreenOrder(items, CONFIGURATION_SCREENS).concat(items.filter(function (item) { return !item.screen; }))
      }, {
        id: "settings",
        title: t("hub-settings.settings"),
        items: items.filter(function (item) { return item.screen && !listed.includes(item.screen); })
      }]
    ```
  - **Po:**
    ```js
    var SUMMARY_SCREENS = [ScreenName.GroupComponent, ScreenName.EventLogList, ScreenName.HubFailures];
    var CONFIGURATION_SCREENS = [ScreenName.Integrations, ScreenName.HubMonitoring, ScreenName.ScheduleList, ScreenName.HubPresenceSimulation, ScreenName.HubDiagnostics];
    var OTHER_SCREENS = [ScreenName.SatelTokenKey, ScreenName.HomeUsers, ScreenName.UserProfile, ScreenName.EmailConfigScreen];
    ...
    function byTitle(items, title) {
      return items.filter(function (item) { return !item.screen && item.title === title; });
    }
    ...
      var installer = byTitle(items, t("installer-data.title")).concat(byTitle(items, t("installer-data.help")));
      var edit = byTitle(items, t("hub-settings.edit_object"));
      var remove = byTitle(items, t("hub-settings.delete_object"));
      var objectChildren = byScreenOrder(items, [ScreenName.HubConfiguration]).concat(edit, remove);
      var listedScreens = HIDDEN_SCREENS.concat(SUMMARY_SCREENS, CONFIGURATION_SCREENS, OTHER_SCREENS, [ScreenName.HubConfiguration]);
      var known = installer.concat(edit, remove);
      var rest = items.filter(function (item) {
        return item.screen ? !listedScreens.includes(item.screen) : !known.includes(item);
      });
      var object = objectChildren.length > 0 ? [{ id: "object", title: t("device_table.menu_object"), leftIcon: "home-wifi", children: objectChildren }] : [];
    ...
      }, {
        id: "configuration",
        title: t("device_table.menu_configuration"),
        items: byScreenOrder(items, CONFIGURATION_SCREENS)
      }, {
        id: "other",
        title: t("device_table.menu_other"),
        items: object.concat(installer, byScreenOrder(items, OTHER_SCREENS), rest.filter(function (item) { return item.screen; }), rest.filter(function (item) { return !item.screen; }))
      }]
    ```
    Grupy: Podsumowanie = Lista obiektów, Dziennik zdarzeń, Awarie; Konfiguracja = Integracja, Harmonogramy, Symulacja obecności, Diagnostyka; Pozostałe = Obiekt (zagnieżdżone: Ustawienia obiektu, Edytuj obiekt, Usuń obiekt), Dane instalatora, Klucz tokenów SATEL, Użytkownicy, Ustawienia e-mail, na końcu nieznane pozycje (najpierw z `screen`, potem bez). Grupa „Ustawienia” (`hub-settings.settings`) znika. Ukryte i przeniesione (`HIDDEN_SCREENS`, `MOVED_SCREENS`) bez zmian: bez pozycji Integracja Monitoring zostaje w „Konfiguracji” za miejscem Integracji, bez pozycji Użytkownicy Mój profil zostaje w „Pozostałych” za miejscem Użytkowników. Dane instalatora mają tytuł `installer-data.title` (administrator) albo `installer-data.help` (pozostali), jak w `useHubSettingsMenu`.
- **Plik:** `desktop/shared/DesktopSideMenu.js` (nasz)
  - **Przed:**
    ```js
    // Collapsed state per group id (stable across languages).
    var STORAGE_KEY = "sideMenu.collapsed";
    ...
      header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, marginTop: 4 },
      title: { fontSize: 14, fontWeight: "600", color: Color.white },
    ...
      var toggle = function (id) {
        var next = Object.assign({}, state[0], { [id]: !state[0][id] });
    ...
      var renderItem = function (item) {
        return <ActionButton.ActionButton key={item.title} title={item.title} selected={props.routeName === item.screen} leftIcon={item.leftIcon} onPress={item.onPress} themeStyle={...} />;
      };
      return <View>{desktopMenuGroups.desktopGroups(props.groups, t).map(function (group) {
          var title = group.title;
          var collapsed = !!state[0][group.id];
          ... <View style={styles.header}><module28.Text style={styles.title}>{title}</module28.Text><module28.Text style={styles.title}>{collapsed ? "▸" : "▾"}</module28.Text></View> ...
          {!collapsed && group.items.filter(function (item) { return item.title !== deleteTitle; }).map(renderItem)}{!collapsed && group.items.filter(function (item) { return item.title === deleteTitle; }).map(function (item) {
              return <View key={item.title} style={styles.danger}>{renderItem(item)}</View>;
    ```
  - **Po:**
    ```js
    var Icon2 = require("../../logic/Icon.js");
    var IconFontWeight = require("../../logic/IconFontWeight.js");
    var ScreenName = require("../../logic/ScreenName.js").ScreenName;
    var hubVirtualDevicesChangeListener = require("../../logic/hubVirtualDevicesChangeListener.js");
    ...
    var STORAGE_KEY = "sideMenu.collapsed";
    var DEFAULT_COLLAPSED = { other: true, object: true };
    var OBJECT_ROUTES = [ScreenName.HubConfiguration, ScreenName.HubEdit];
    ...
      header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 40, paddingVertical: 6, marginTop: 4 },
      title: { fontSize: 15, fontWeight: "600", color: Color.white },
      badge: { marginLeft: 8, fontSize: 14, fontWeight: "600", color: Color.warning500 },
      chevron: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
      children: { paddingLeft: 16, borderLeftWidth: 1, borderLeftColor: Color.secondary600 },
    ...
    function isCollapsed(stored, id) {
      return id in stored ? !!stored[id] : !!DEFAULT_COLLAPSED[id];
    }
    ...
      var failuresCount = (0, hubVirtualDevicesChangeListener.useRoomContainer)().failuresCount ?? 0;
    ...
      var renderItem = function (item) {
        var failures = item.screen === ScreenName.HubFailures;
        return <ActionButton.ActionButton key={item.screen ?? item.title} title={failures ? t("device_table.menu_failures", { failuresCount: failuresCount }) : item.title} selected={props.routeName === item.screen} leftIcon={item.leftIcon} hasError={failures && failuresCount > 0} onPress={item.onPress} themeStyle={...} />;
      };
    ```
    Nagłówek grupy: tytuł, przy zwiniętej grupie z pozycją `HubFailures` i `failuresCount > 0` plakietka `` `⚠ ${failuresCount}` `` (`warning500`), po prawej `<Icon2.Icon icon={collapsed ? "chevron-right" : "chevron-down"} fontSize={18} fontWeight={IconFontWeight.IconFontWeight.Regular} color={Color.white} />` w polu 28×28 zamiast znaków `▸`/`▾`. Pozycja z `children` (Obiekt) to `ActionButton` z `rightIcon` `chevron-up`/`chevron-down`, zwijana po `id` `object`; dzieci we wcięciu z linią po lewej, „Usuń obiekt” na końcu za linią (`styles.danger`) z ikoną `danger` w kolorze `Color.danger500`. Zwinięcie: zapis po `id` jak dotąd, domyślnie zwinięte `other` i `object`, reszta rozwinięta; wejście na trasę `HubConfiguration` albo `HubEdit` rozwija „Obiekt” i jego grupę (`useEffect`, zapis do `localStorage`).
- **Plik:** `hooks/useHubSettingsMenu.js` (Satel)
- **Kotwica:** pozycja „Lista obiektów” z wpisu 025 (`title: r("device_table.menu")`, `forceTable: true`), w gałęzi `DesktopEditor.isDesktopEditor() ? [...] : []` grupy `hub-settings.summary`.
- **Przed:**
  ```js
              forceTable: true
            });
          }
        }] : [], [{
          hasPermission: permissionGuard.None === usePermissionGuard.ResourceAccess.Full,
          title: r("hub-settings.power_consumption"),
  ```
- **Po:**
  ```js
              forceTable: true
            });
          }
        }, {
          hasPermission: permissionGuard.None === usePermissionGuard.ResourceAccess.Full,
          title: r("device_table.menu_failures_plain"),
          leftIcon: "danger",
          screen: ScreenName.ScreenName.HubFailures,
          onPress: function () {
            return callback(ScreenName.ScreenName.HubFailures);
          }
        }] : [], [{
          hasPermission: permissionGuard.None === usePermissionGuard.ResourceAccess.Full,
          title: r("hub-settings.power_consumption"),
  ```
  Tylko na drodze desktopowej (ta sama gałąź co „Lista obiektów”), więc menu telefonu bez zmian. Tytuł z liczbą („Awarie: N”) nadaje `DesktopSideMenu`.
- **Plik:** `components/HubAlerts.js` (Satel)
- **Kotwica:** `U("FAILURES_FOUND", {`
- **Przed:** `return <jsxRuntime.Fragment>{failuresCount > 0 ? <View.default style={themeStyle.hubWarningBoxContainer}><Alert2.Alert alerts={[U("FAILURES_FOUND", {`
- **Po:** `return <jsxRuntime.Fragment>{failuresCount > 0 && !props.hideFailures ? <View.default style={themeStyle.hubWarningBoxContainer}><Alert2.Alert alerts={[U("FAILURES_FOUND", {`
  Bez nowej właściwości zachowanie oryginału (zasada plików wspólnych).
- **Plik:** `components/unnamed/module_843.js` (Satel, ekran ustawień obiektu `HomeSettings`, panel boczny)
- **Kotwica:** `<HubAlerts2.HubAlerts hubInfo={A} hidePresenceSimulationStatus={!PlatformConstants.isWeb} />` w `titleComponent` (przed `nativeID="dark-scroll-view-settings"`)
- **Przed:** `<HubAlerts2.HubAlerts hubInfo={A} hidePresenceSimulationStatus={!PlatformConstants.isWeb} />`
- **Po:** `<HubAlerts2.HubAlerts hubInfo={A} hidePresenceSimulationStatus={!PlatformConstants.isWeb} hideFailures={DesktopEditor.isDesktopEditor()} />`
  Pomarańczowy pasek „Znaleziono awarie” znika tylko nad panelem bocznym na desktopie (awarie są pozycją panelu); pasek na ekranie głównym (`HubAlerts` bez `hideFailures`) bez zmian.
- **Pliki:** `i18n/pl.js`, `i18n/en.js`, blok `device_table`, za kluczami z wpisu 056: `"menu_failures": "Awarie: {{failuresCount}}"` / `"Faults: {{failuresCount}}"`, `"menu_failures_plain": "Awarie"` / `"Faults"`, `"menu_other": "Pozostałe"` / `"Other"`, `"menu_object": "Obiekt"` / `"Object"`.
- **Test:** `test/unit/desktop/desktopMenuGroups.test.js` (przepisany): trzy grupy z zagnieżdżonym „Obiektem”, ikona „Obiektu” i „Usuń obiekt” na końcu, Dane instalatora także po tytule `installer-data.help`, nieznane pozycje na końcu „Pozostałych” (z `screen` najpierw), pozycje bez uprawnień, pusty „Obiekt” i puste grupy pominięte, Monitoring i Mój profil bez pozycji-gospodarza, przekazanie oryginalnych obiektów pozycji.
- **Sprawdzenie:** `npm --prefix work/working/tools test`. Okno ≥ 900 px, konto administratora: grupy Podsumowanie (Lista obiektów, Dziennik zdarzeń, „Awarie: N”), Konfiguracja (Integracja, Harmonogramy, Symulacja obecności, Diagnostyka), Pozostałe zwinięte; po rozwinięciu „Obiekt” (zwinięty), Dane instalatora, Klucz tokenów SATEL, Użytkownicy, Ustawienia e-mail; w „Obiekcie” Ustawienia obiektu, Edytuj obiekt i „Usuń obiekt” z czerwoną ikoną za linią (**nie klikać**). „Awarie” otwiera listę awarii, przy awariach pozycja wyróżniona, a zwinięta grupa ma `⚠ N`. Nad panelem brak pomarańczowego paska awarii, na ekranie głównym pasek jest. Wejście w Ustawienia obiektu rozwija „Pozostałe” i „Obiekt”. Okno < 900 px: oryginalne menu i pasek awarii.
