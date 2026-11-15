# 04. Wi-Fi przez `nmcli`

- **Wpisy rejestru:** 006
- **Platformy:** Linux
- **Wprowadzone:** 1.1.0-port.1 (`dist/linux-overrides.js`), od 1.1.0-port.2 `src/main/linuxOverrides.js`
- **Wymagania:** brak numeru; powód techniczny. **Nieprzetestowane na sprzęcie z Wi-Fi.**

## Cel
Procedury łączenia z centralą (konfiguracja sieci, tryb punktu dostępowego) pytają system o bieżące Wi-Fi i proszą o połączenie z siecią centrali. Oryginał robi to poleceniami Windows: `netsh wlan show interfaces`, `ipconfig`, `netsh wlan connect name=…`, `start ms-settings:network-wifi`. Na Linuksie trzeba to zrobić przez NetworkManagera.

## Zachowanie
Kanały IPC z tymi samymi nazwami i formatem odpowiedzi co oryginał:

| Kanał | Linux | Wynik |
|---|---|---|
| `get-wifi-info` | `nmcli -t -f DEVICE,TYPE,STATE,CONNECTION device`, pierwsze urządzenie `wifi` w stanie `connected`, potem `nmcli -t -f IP4.ADDRESS device show <dev>` | `{ ssid, ipv4, subnet }`; maska liczona z prefiksu CIDR (np. `/24` → `255.255.255.0`). Bez Wi-Fi lub przy błędzie: wszystkie pola `null` |
| `open-wifi-settings` | `nm-connection-editor` uruchomiony jako proces odłączony | `true` po starcie, `false` przy błędzie |
| `connect-wifi` (`ssid`) | `nmcli connection up id <ssid>` | `true`/`false` |
| `disconnect-wifi` | `nmcli device disconnect <dev>` dla podłączonego urządzenia Wi-Fi | `true`/`false` |

- Polecenia uruchamiane przez `execFile` z tablicą argumentów (bez powłoki), więc nazwa sieci nie jest interpretowana przez shell. Oryginał wstawia nazwę profilu do napisu polecenia.
- `connect-wifi` łączy tylko z siecią, która ma już profil w NetworkManagerze (tak jak `netsh wlan connect name=` wymaga profilu).
- macOS: bez zmian, czyli handlery z `netsh` nie działają. Patrz „Ryzyka”.

## Punkty zaczepienia
- `dist/electron.main.js`: `ipcMain.handle("get-wifi-info"` (w 1.2.0: 1 trafienie), `"connect-wifi"`, `"open-wifi-settings"`, `"disconnect-wifi"`, napisy `netsh`, `ipconfig`, `ms-settings:`.
- Miejsce wpięcia: `app.whenReady().then(` (w 1.2.0: 1 trafienie). Wszystkie `ipcMain.handle` oryginału są rejestrowane wcześniej, w tym samym bloku.

## Implementacja
1. Nowy plik `src/main/linuxOverrides.js` (kopiuj bez zmian z `work/working/src/main/linuxOverrides.js`). Eksportuje `function registerLinuxOverrides(ipcMain)`, która dla każdego kanału robi `ipcMain.removeHandler(channel)` i `ipcMain.handle(channel, handler)`.
2. W `main.js`, tuż przed `app.whenReady().then(`:
   ```js
   if (process.platform === "linux") {
     require("./linuxOverrides")(ipcMain);
   }
   ```
   Warunek `process.platform === "linux"` to usankcjonowany wyjątek od zasady „bez warunków platformy” (README, zasada 1): `nmcli` (NetworkManager) jest narzędziem systemowym tylko Linuksa, a na macOS handlery zostają oryginalne.
   Kolejność jest istotna: podmiana musi być **po** rejestracji oryginalnych handlerów, inaczej oryginał nadpisze nasze (albo `handle` rzuci „second handler”).
3. Build esbuildem dołącza moduł do `electron.entry.js`, więc nie trzeba go dodawać do `asar` osobno.

## Zależności
Brak. Pakiet `.deb` (przepis 07) nie wymaga `network-manager`; bez `nmcli` handlery zwracają `null`/`false`.

## Sprawdzenie
1. Na Linuksie z Wi-Fi, w DevTools renderera: `await window.electronAPI.getWifiInfo()` zwraca SSID, adres i maskę. Bez Wi-Fi: same `null`.
2. `connect-wifi` z nazwą znanej sieci: `nmcli connection show --active` pokazuje to połączenie.
3. Przy braku `nmcli` w `PATH`: `null`/`false` i wpis w konsoli procesu głównego, bez awarii aplikacji.

## Ryzyka przy nowej wersji
- Nowe kanały Wi-Fi w nowym wydaniu (np. lista sieci, skanowanie) trzeba dopisać do `linuxOverrides.js`. Porównaj listę `ipcMain.handle(` poprzedniego i nowego wydania.
- Zmiana formatu odpowiedzi oczekiwanej przez renderer (np. dodatkowe pole `gateway`) wymaga dopisania jej w `getWifiInfo`.
- macOS nie ma zamiennika (`networksetup -getairportnetwork`, `ipconfig getifaddr en0`). Jeśli funkcja okaże się potrzebna na Macu, to osobna zmiana z kodem dla platformy (inne narzędzie systemowe).
