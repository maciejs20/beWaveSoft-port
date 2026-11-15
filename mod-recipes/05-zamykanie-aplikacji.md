# 05. Zamykanie aplikacji: okno X kończy program, „Zakończ” bez błędu

- **Wpisy rejestru:** 031 (w części: `closeConfirmed` w `createMainWindow`), 039, 040
- **Platformy:** Linux, macOS
- **Wprowadzone:** 1.1.0-port.3 (031), 1.2.0-port.2 (039, 040), oryginał 1.2.0
- **Wymagania:** zgłoszone błędy i decyzja użytkownika z 2026-11-14 („zamknięcie okna X kończy aplikację na obu platformach”)

## Cel
Do wpisu 039 na macOS zamknięcie ostatniego okna zostawiało aplikację w Docku (wpis 031 celowo zachowywał protokół `app://`, żeby okno dało się otworzyć ponownie z Docka). Użytkownik zdecydował, że zamknięcie okna ma kończyć aplikację także na macOS, tak jak na Linuksie.

Drugi błąd: wybór „Zakończ” (menu aplikacji albo Docka na macOS) kończył się oknem „Uncaught Exception: Error: Renderer URL is not initialized at createMainWindow … from an EventEmitter listener”. Oryginał w `before-quit` po 400 ms wyrejestrowuje protokół (`unregisterAppProtocol` zeruje `rendererUrl`) i woła `app.quit()`. Okno blokuje jednak każde zamknięcie (`closeConfirmed` fałszywe → `preventDefault` i `app-close-request` do renderera), więc to zakończenie zostaje anulowane. Renderer bez niezapisanych zmian zaraz potwierdza i okno się zamyka, ale na macOS `window-all-closed` nie kończył aplikacji, a `activate` wołał `createMainWindow()` bez `rendererUrl`; przy niezapisanych zmianach i odmowie okno żyło dalej bez protokołu.

Renderer w module, który nasłuchuje kanału `app-close-request` i odpowiada kanałem `confirm-app-close` (w 1.2.0 plik `components/unnamed/module_1882.js`), od razu woła `confirm-app-close`, chyba że jest aktywna osłona niezapisanych zmian (`usePreventLeave`, np. edytor rutyny, ustawienia klawiatury, edytor ekranów TSH ze zmianą): wtedy pyta i dopiero po zgodzie potwierdza; przy odmowie okno zostaje.

## Zachowanie
- Zamknięcie okna (X, `Cmd+W`, `Alt+F4`) kończy aplikację na Linuksie i macOS: od razu albo, przy niezapisanych zmianach, po zgodzie w pytaniu renderera (`confirm-app-close`). Na macOS aplikacja nie zostaje w Docku bez okien.
- „Zakończ” (`Cmd+Q`, menu Docka, menu aplikacji): jak X (pytanie tylko przy niezapisanych zmianach); aplikacja kończy się bez wyjątku. Po odmowie w pytaniu okno działa dalej z protokołem `app://` (przeładowanie `Ctrl/Cmd+R` i odzyskiwanie renderera nadal mają `rendererUrl`), a kolejne „Zakończ” znów zatrzymuje RTSP i czeka 400 ms.
- `activate` (kliknięcie w Dock) w trakcie kończenia, w trakcie odzyskiwania bazy Realm albo bez `rendererUrl` nie tworzy okna.
- Sprzątanie bez zmian: `clearHlsDir`, `deleteTshSettings`, wyrejestrowanie protokołu w `window-all-closed` (jak oryginał) i w `will-quit`; zatrzymanie RTSP w `before-quit`; blokada w trakcie Windows Hello (`passportController`) bez zmian; `realmRecoveryInProgress` nadal wyłącza sprzątanie i `app.quit()` w `window-all-closed`.
- Nowe okno (`createMainWindow`) zeruje `closeConfirmed` (wpis 031), żeby zamknięcie zawsze przechodziło przez renderer (osłonę niezapisanych zmian).

## Punkty zaczepienia
- `dist/electron.main.js`: `app.on("window-all-closed"` (w 1.2.0: 2 trafienia; to z `clearHlsDir`/`deleteTshSettings`/`unregisterAppProtocol` i warunkiem `realmRecoveryInProgress`), `app.on("before-quit"` (blok z `setTimeout(..., 400)`), `app.on("activate"` (z `BrowserWindow.getAllWindows().length === 0`), komunikat `Renderer URL is not initialized` (1 trafienie) na początku `createMainWindow`, `mainWindow.on("close"` z `app-close-request`, kanał `confirm-app-close`.
- Flagi w funkcji głównej: `quitCleanupDone`, `closeConfirmed`, `realmRecoveryInProgress`, `rendererUrl`.

## Implementacja
1. `window-all-closed`: bez warunków `process.platform !== "darwin"`; `unregisterAppProtocol()` w `try` jak w oryginale i `app.quit()` na każdej platformie (w środku `if (!realmRecoveryInProgress)`).
2. `before-quit`: w `setTimeout(..., 400)` zostają `clearHlsDir()` i `app.quit()`, bez `unregisterAppProtocol()`. Protokół wyrejestrowują `window-all-closed` i `will-quit`, czyli dopiero gdy okna już nie ma.
3. `mainWindow.on("close")`: w gałęzi Windows Hello (`passportController.isOperationInProgress()`) i w gałęzi `if (!closeConfirmed) { e.preventDefault(); … }` dodaj `quitCleanupDone = false;` (zakończenie zablokowane przez okno jest anulowane).
4. `activate`: na początku `if (quitCleanupDone || realmRecoveryInProgress || !rendererUrl) { return; }`.
5. `createMainWindow`: na początku `closeConfirmed = false;` (wpis 031). Wyjątek `Renderer URL is not initialized` zostaje jako zabezpieczenie, ale `activate` już go nie wywoła.
6. `unregisterAppProtocol`: na początku `if (!rendererUrl) { return; }`. `will-quit` woła ją drugi raz po `window-all-closed`; bez tego `protocol.unhandle` drugi raz i wpis w logu.

## Zależności
Brak.

## Sprawdzenie
Linux i macOS: uruchom, X → proces kończy się bez pytania (`pgrep -f "BE WAVE"` pusty), w `main.log` brak wyjątków i brak `Renderer protocol unhandle failed`. macOS: `Cmd+Q` → aplikacja znika z Docka bez okna „Uncaught Exception”. Odmowa: otwórz ekran z `usePreventLeave` i zrób zmianę (np. edytor ekranów TSH albo edytor rutyny), `Cmd+Q` → w pytaniu odmów → okno działa, `Cmd+R` przeładowuje bez błędu; ponowne `Cmd+Q` → zgoda kończy aplikację.

## Ryzyka przy nowej wersji
- Jeśli Satel sam przywróci pozostawanie w Docku albo zmieni kolejność sprzątania w `before-quit`, sprawdź oba scenariusze z „Sprawdzenia” przed naniesieniem.
- Nowe flagi stanu kończenia (np. `isQuitting`) trzeba uwzględnić w warunku `activate` i zerować przy anulowanym zamknięciu, tak jak `quitCleanupDone`.
- Electron 44 nie pozwala zarejestrować tego samego schematu dwa razy przez `protocol.handle`. Nie przenoś rejestracji do `createMainWindow`.
