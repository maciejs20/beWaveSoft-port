# 06. Moduły natywne i binaria platform

- **Wpisy rejestru:** 007, 008
- **Platformy:** Linux, macOS
- **Wprowadzone:** 1.1.0-port.1
- **Wymagania:** brak numeru; warunek startu aplikacji poza Windows

## Cel
Oryginalny `app.asar` jest zbudowany pod Windows x64. W `node_modules` są natywne dodatki tylko dla Windows (albo ładowane przed właściwymi), a Realm i ffmpeg są binariami Windows. Bez tej zmiany aplikacja na Linuksie i macOS nie startuje (błąd ładowania `addon.node`) albo nie otwiera bazy.

## Zachowanie
- Aplikacja startuje na Linuksie x64 i macOS arm64 bez błędów ładowania modułów natywnych.
- `node-window-manager` (używany do szukania i podnoszenia okna TSH Soft) ładuje natywny dodatek tylko na Windows. Na Linuksie i macOS jego API jest dostępne, ale zwraca puste wyniki (bez okien), więc kod oryginału nie musi się zmieniać.
- Baza Realm otwiera się (natywny `realm.node` dla platformy), a funkcje używające ffmpeg (podgląd kamer RTSP/HLS) mają binarium dla platformy pod nazwą oczekiwaną przez renderer.

## Punkty zaczepienia
- `node_modules/node-window-manager/dist/index.js`: `if (os_1.platform() === "win32" || os_1.platform() === "darwin") {` (w 1.2.0 nadal, wiersz 21).
- `node_modules/node-window-manager/dist/classes/window.js`: `const extract_file_icon_1 = __importDefault(require("extract-file-icon"));` (w 1.2.0 nadal, wiersz 7).
- Katalogi do usunięcia: `bufferutil/build`, `utf-8-validate/build`, `passport-desktop-win32-x64-msvc`, `@primno/dpapi/build`, `@primno/dpapi/prebuilds`.
- Binaria do podmiany: `realm/prebuilds/node/realm.node`, `ffmpeg-static/ffmpeg.exe`. Wersja Realm z `package.json` aplikacji (`"realm": "12.15.0"` w 1.1.0 i 1.2.0).

## Implementacja
1. **`node-window-manager` (007)**, w `app/node_modules` (nasza kopia `work/working/app/node_modules`):
   - `dist/index.js`: warunek ładowania dodatku `win32 || darwin` → tylko `win32`.
   - `dist/classes/window.js`: wymaganie `extract-file-icon` tylko na Windows:
     ```js
     let extract_file_icon_1 = { default: () => null };
     if (process.platform === "win32") extract_file_icon_1 = __importDefault(require("extract-file-icon"));
     ```
   To są pliki zależności, nie aplikacji. W nazwanym kodzie leżą w `work/working/app/node_modules/node-window-manager/dist/` (w commicie `0f14642` dodane do gita).
2. **Usunięcie binariów Windows (008)**: wymienione katalogi. Binarium Windows w `build/` ma pierwszeństwo przed właściwym (np. `node-gyp-build` bierze `build/Release` przed `prebuilds`), a `passport-desktop` (Windows Hello) i `@primno/dpapi` (migracja klucza V1, DPAPI) są tylko dla Windows i ładowane w `try/catch` albo leniwie.
3. **Binaria platform (008)**: katalogi `work/working/linux/natives` i `work/working/mac/natives` z tą samą strukturą co `node_modules`, kopiowane na wierzch przez skrypt budowania (przepis 07). Oba katalogi są w `.gitignore` (binaria nie trafiają do repozytorium), więc po sklonowaniu trzeba je wypełnić samemu. Docelowy układ:
   ```
   work/working/linux/natives/realm/prebuilds/node/realm.node     # ELF 64-bit x86-64
   work/working/linux/natives/ffmpeg-static/ffmpeg.exe             # ELF 64-bit x86-64, prawo wykonania
   work/working/mac/natives/realm/prebuilds/node/realm.node       # Mach-O 64-bit arm64
   work/working/mac/natives/ffmpeg-static/ffmpeg.exe               # Mach-O 64-bit arm64, prawo wykonania
   ```
   Polecenia (z katalogu głównego repozytorium; `<realm>` to wersja `realm` z `work/original/<ver>/app/package.json`, w 1.2.0 `12.15.0`; `$SCRATCH` to dowolny katalog tymczasowy):
   - **Realm, Linux x64:** instalacja pakietu npm pobiera prebuild Node-API dla bieżącej platformy.
     ```sh
     npm install --prefix work/working/build/downloads/realm realm@<realm>
     mkdir -p work/working/linux/natives/realm/prebuilds/node
     cp work/working/build/downloads/realm/node_modules/realm/prebuilds/node/realm.node work/working/linux/natives/realm/prebuilds/node/
     ```
   - **Realm, macOS arm64:** ten sam pakiet, prebuild dla innej platformy pobrany przez `prebuild-install` (zależność `realm`, źródło `static.realm.io`), w osobnej kopii, żeby nie nadpisać linuksowego pliku.
     ```sh
     npm install --prefix "$SCRATCH/realm-mac" --ignore-scripts realm@<realm>
     (cd "$SCRATCH/realm-mac/node_modules/realm" && ../.bin/prebuild-install --runtime napi --platform darwin --arch arm64)
     mkdir -p work/working/mac/natives/realm/prebuilds/node
     cp "$SCRATCH/realm-mac/node_modules/realm/prebuilds/node/realm.node" work/working/mac/natives/realm/prebuilds/node/
     ```
   - **ffmpeg:** `ffmpeg-static` 5.x pobiera binaria z wydań repozytorium GitHub `eugeneware/ffmpeg-static`. Nasze buildy 1.1.0-port.* i 1.2.0-port.* mają binaria z wydania `b6.0` (ffmpeg 6.0); `ffmpeg-static` 5.3.0 deklaruje w `package.json` `"binary-release-tag": "b6.1.1"`, tego wydania nie sprawdzaliśmy. Plik musi się nazywać `ffmpeg.exe` także na Linuksie i macOS, bo renderer szuka dokładnie tej ścieżki, i musi mieć prawo wykonania.
     ```sh
     R=https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0
     curl -fL -o work/working/build/downloads/ffmpeg.gz "$R/ffmpeg-linux-x64.gz"
     curl -fL -o "$SCRATCH/ffmpeg-darwin-arm64.gz" "$R/ffmpeg-darwin-arm64.gz"
     mkdir -p work/working/linux/natives/ffmpeg-static work/working/mac/natives/ffmpeg-static
     gunzip -c work/working/build/downloads/ffmpeg.gz > work/working/linux/natives/ffmpeg-static/ffmpeg.exe
     gunzip -c "$SCRATCH/ffmpeg-darwin-arm64.gz" > work/working/mac/natives/ffmpeg-static/ffmpeg.exe
     chmod +x work/working/{linux,mac}/natives/ffmpeg-static/ffmpeg.exe
     ```
     Numer wydania binariów, którego oczekuje dana wersja `ffmpeg-static`, jest w jej `package.json` (`binary-release-tag`).
4. `asar pack` z `--unpack '{*.node,*.exe}'`, żeby binaria były w `app.asar.unpacked`.

## Zależności
Przepis 07 (skrypty kopiują `natives` i pakują `asar`).

## Sprawdzenie
1. `file` na `resources/app.asar.unpacked/node_modules/realm/prebuilds/node/realm.node` i `…/ffmpeg-static/ffmpeg.exe`: `ELF 64-bit LSB … x86-64` na Linuksie, `Mach-O 64-bit arm64` na macOS.
2. Start aplikacji: brak błędu `addon.node` / `Cannot find module` w konsoli procesu głównego, baza Realm otwiera się (logowanie zachowane po restarcie).
3. `asar list` nie zawiera usuniętych katalogów Windows.

## Ryzyka przy nowej wersji
- Zmiana wersji `realm` w `package.json` nowego wydania: pobierz oba `realm.node` od nowa (polecenia wyżej). Realm 12 korzysta z Node-API, więc nie zależy od ABI Electrona, ale sprawdź start na nowym Electronie.
- Zmiana wersji `ffmpeg-static`: sprawdź `binary-release-tag` w jej `package.json` i pobierz oba pliki od nowa.
- Nowe zależności natywne w nowym wydaniu: przejrzyj `node_modules` pod kątem `*.node`, `build/Release`, `prebuilds/win32-*` i pakietów `*-win32-*`. Każdy natywny moduł Windows ładowany bez `try/catch` zatrzyma start. Narzędzia budowania dla Windows, których aplikacja nie ładuje (w 1.2.0 `hermes-compiler/hermesc/win64-bin`, `fb-dotslash/bin/windows*`, `react-native/sdks/hermesc`), zostają.
- Jeśli `node-window-manager` zmieni wersję, kotwice mogą wyglądać inaczej; zasada: natywny dodatek i `extract-file-icon` tylko na `win32`.
