# 02. Aktualizacje wyłączone

- **Wpisy rejestru:** 003
- **Platformy:** Linux, macOS
- **Wprowadzone:** 1.1.0-port.1 (łatka), 1.1.0-port.2 (cały moduł zastąpiony w nazwanym kodzie)
- **Wymagania:** brak numeru; powód techniczny

## Cel
Serwer aktualizacji Satel (`updates.satel.pl`, konfiguracja w `dist/updater.config.js`) udostępnia tylko instalatory NSIS dla Windows. `NsisUpdater` z `electron-updater` na Linuksie i macOS albo zgłasza błąd, albo pobiera instalator, którego nie da się uruchomić. Aktualizacje portu dostarczamy własnymi pakietami (przepis 07).

## Zachowanie
- Sprawdzenie aktualizacji (renderer wysyła `check-for-update`) od razu odpowiada `update-not-available`. Interfejs pokazuje to, co oryginał pokazuje przy braku nowej wersji.
- Aplikacja nie wysyła żadnych żądań do serwera aktualizacji, nie pobiera plików, nie pokazuje paska postępu ani `update-error`.
- Kanał `install-update` nie jest rejestrowany.

## Punkty zaczepienia
- `dist/electron.updater.js` (w 1.1.0 i 1.2.0 osobny plik): `require("electron-updater").NsisUpdater`, `autoDownload = true`, zdarzenia `update-available`, `update-not-available`, `download-progress`, `update-downloaded`, `install-update`, `checkForUpdates()`. W 1.2.0 `NsisUpdater` występuje w `electron.updater.js` (1 trafienie) i w `electron.main.js` (1 trafienie, w dołączonej kopii modułu).
- Proces główny: `ipcMain.on("check-for-update", function () { startAutoUpdater(mainWindow, log); })`.

## Implementacja
Cała treść modułu aktualizacji (w nazwanym kodzie `src/main/autoUpdater.js`) zastąpiona:
```js
// The Satel update server only offers Windows installers.
module.exports = function (mainWindow) {
  mainWindow.webContents.send("update-not-available");
};
```
Sygnatura zostaje (`(mainWindow, log)`), więc wywołanie w `main.js` się nie zmienia. Pakiet `electron-updater` może zostać w `node_modules`, bo nikt go nie wymaga.

Gdyby w nowym wydaniu moduł był wkompilowany w `electron.main.js` (a nie wydzielony), zamień funkcję uruchamianą przez `check-for-update` na wysłanie `update-not-available`.

## Zależności
Brak.

## Sprawdzenie
1. W ustawieniach aplikacji użyj sprawdzenia aktualizacji: komunikat o braku aktualizacji.
2. Podgląd ruchu (DevTools procesu głównego lub `ss`/`tcpdump`): brak połączeń do `updates.satel.pl`.
3. `grep NsisUpdater` w zbudowanym `dist/electron.entry.js` nic nie zwraca.

## Ryzyka przy nowej wersji
- Satel może dodać aktualizacje na starcie bez udziału renderera (np. `autoUpdater.checkForUpdatesAndNotify()` w `whenReady`). Szukaj `electron-updater`, `checkForUpdates` i `updater.config` w całym procesie głównym.
- Jeśli renderer zacznie oczekiwać innych zdarzeń (np. `update-checking`), dopisz je tak, by interfejs nie czekał w nieskończoność.
