# 03. Klucz bazy Realm bez magazynu sekretów, plik `0600`

- **Wpisy rejestru:** 004 (Linux), 005 (Linux, macOS)
- **Platformy:** Linux (004), Linux i macOS (005)
- **Wprowadzone:** 1.1.0-port.1
- **Wymagania:** decyzja użytkownika z 2026-10-30: klucz bez ochrony systemowej (`password-store=basic`, `realm.key` z prawami `0600`). Nie wracamy do tematu.

## Cel
Aplikacja szyfruje lokalną bazę Realm kluczem 64 B, zapisanym w `realm.key` w katalogu danych użytkownika. Klucz jest szyfrowany przez Electron `safeStorage`. Na Linuksie `safeStorage` korzysta z magazynu sekretów (`gnome-libsecret`/`kwallet`). Na pulpicie XFCE (libsecret) klucz nie przetrwał restartu sesji, więc aplikacja nie mogła odszyfrować bazy, uruchamiała „Realm recovery” i kasowała dane (logowanie, centrale). Bez magazynu sekretów `safeStorage` jest niedostępne i oryginał rzuca wyjątek.

## Zachowanie
- **Linux:** Chromium dostaje przełącznik `--password-store=basic` (bez libsecret i kwallet). Jeśli `safeStorage.isEncryptionAvailable()` zwraca `false`, przed pierwszym użyciem włączane jest `safeStorage.setUsePlainTextEncryption(true)`. Klucz jest wtedy zapisany bez ochrony systemowej, a chroni go tylko prawo dostępu do pliku.
- **Linux i macOS:** nowy lub przepisany `realm.key` (oraz plik tymczasowy `realm.key.tmp` przed `rename`) ma prawa `0600` (`-rw-------`).
- **macOS:** `safeStorage` korzysta z pęku kluczy jak w oryginale; zmienia się tylko tryb pliku.
- Po restarcie aplikacji (i sesji) baza otwiera się bez odzyskiwania: w `main.log` (Linux: `~/.config/BE WAVE Soft/logs/main.log`, macOS: `~/Library/Logs/BE WAVE Soft/main.log`) nie ma `Realm recovery`.
- Istniejący klucz z innym trybem nie jest poprawiany, dopóki nie zostanie zapisany ponownie (np. migracja V1 → V2 albo nowy klucz).

## Punkty zaczepienia
- `dist/electron.main.js`: `app.setAppUserModelId(` (w 1.2.0: 1 trafienie) w funkcji eksportowanej jako `default` (start procesu głównego), przed `app.isPackaged` / `app.setPath("userData", …)`.
- Moduł klucza (w nazwanym kodzie `src/main/realmKeyStore.js`): komunikat `Electron safeStorage is not available on this system` (w 1.2.0: 1 trafienie), funkcje `getOrCreateRealmEncryptionKey`, `getRealmKeyPath`, zapis pliku tymczasowego `` `${e}.tmp` `` z opcją `encoding: "utf8"` (w minifikacie `encoding:"utf8"`, 1 trafienie w 1.2.0), `fs.renameSync`.

## Implementacja
1. **Przełącznik Chromium (004)**, na początku funkcji startowej procesu głównego, w miejscu warunku `win32` z `setAppUserModelId`:
   ```js
   if (process.platform === "linux") {
     app.commandLine.appendSwitch("password-store", "basic");
   }
   ```
   Musi być przed `app.whenReady()`. Warunek `process.platform === "linux"` to usankcjonowany wyjątek od zasady „bez warunków platformy” (README, zasada 1): przełącznik `password-store` dotyczy tylko magazynu sekretów Linuksa, a na macOS Keychain działa poprawnie. Oryginalny warunek `win32` w naszym kodzie został zastąpiony (Windows nas nie interesuje). W nowym wydaniu można go zostawić i dopisać nasz warunek obok.
2. **Tryb tekstu jawnego (004)**, na początku funkcji sprawdzającej dostępność `safeStorage` (tej z komunikatem kotwicy):
   ```js
   if (process.platform === "linux" && !safeStorage.isEncryptionAvailable()) {
     safeStorage.setUsePlainTextEncryption(true);
   }
   ```
   Warunek platformy jest konieczny i usankcjonowany: API `setUsePlainTextEncryption` istnieje tylko na Linuksie.
3. **Tryb pliku (005)**, w zapisie atomowym klucza: do opcji `fs.writeFileSync(tmp, data, { encoding: "utf8" })` dodaj `mode: 0o600`. `rename` zachowuje tryb.

## Zależności
Brak. Format pliku (`magic\nbase64`, wersje V1 i V2) bez zmian.

## Sprawdzenie
1. Linux: usuń `~/.config/BE WAVE Soft/realm.key` i bazę (lub użyj czystego profilu), uruchom, zaloguj się, zamknij, wyloguj sesję i uruchom ponownie. Logowanie zostaje, w `~/.config/BE WAVE Soft/logs/main.log` brak `Realm recovery`.
2. `ls -l ~/.config/"BE WAVE Soft"/realm.key` → `-rw-------`. macOS: `~/Library/Application Support/BE WAVE Soft/realm.key`.
3. `ps` z argumentami procesu: `--password-store=basic` (Linux).

## Ryzyka przy nowej wersji
- Nowy Electron: sprawdź w dokumentacji, że `safeStorage.setUsePlainTextEncryption` i `isEncryptionAvailable` istnieją bez zmian. Nowsze Electrony mają też asynchroniczne API `safeStorage` i `getSelectedStorageBackend()`. Jeśli nowe wydanie przejdzie na wersję asynchroniczną, wstaw obejście w odpowiednim miejscu.
- Jeśli Satel zmieni format lub miejsce klucza (np. `realm.key` w innym katalogu albo klucz w pęku kluczy), zachowaj zasadę: plik z kluczem tylko dla właściciela, a na Linuksie bez zależności od libsecret.
- Zmiana `password-store` wpływa też na ciasteczka i hasła Chromium zapisane wcześniej z libsecret: po przejściu z builda bez tej łatki dane mogą być nieczytelne. W naszym porcie zawsze było `basic`.
