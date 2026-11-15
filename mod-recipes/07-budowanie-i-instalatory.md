# 07. Budowanie z nazwanego kodu, uruchamianie, instalatory

- **Wpisy rejestru:** 032 (ekran powitalny), 033 (cel esbuild i wejście renderera), 034 (grafiki z `TSH_soft.exe` w `dist/tsh`). Reszta to narzędzia i pakowanie bez zmiany zachowania aplikacji, opisane w `CHANGELOG.md` (1.1.0-port.1 „Linux x64”, „macOS arm64”; 1.1.0-port.2 „esbuild z nazwanego kodu”, instalatory `.deb` i `.pkg`; 1.2.0-port.1 build na Electronie 44 bez builda macOS od Satel) i w `work/README.md`.
- **Platformy:** Linux x64, macOS arm64
- **Wprowadzone:** 1.1.0-port.1 (build z `dist` z łatkami), 1.1.0-port.2 (esbuild z `work/working/src`, instalatory), 1.2.0-port.1 (032, 033, układ wersjonowany, `.app` ze zwykłej paczki Electrona), 1.2.0-port.2 (034)

## Cel
Zbudować działającą aplikację na Linuksie i macOS z naszego nazwanego kodu, z Electronem w wersji oryginału, i dostarczyć ją pakietem, który przy nowszej wersji aktualizuje instalację bez utraty danych użytkownika.

## Zachowanie
- **Wersja portu:** `work/working/VERSION`, postać `<wersja oryginału>-port.<n>` (np. `1.2.0-port.2`). Część przed `-port` to wersja oryginału, z której skrypty biorą katalog `work/original/<wersja>`. Do prób można ją nadpisać zmienną `BEWAVE_VERSION`, a wersję Electrona zmienną `ELECTRON_VERSION`.
- **Wersja Electrona:** ta sama co w oryginale, odczytana z napisu `Electron/x.y.z` w `work/original/<wersja>/win-build/BE WAVE Soft/BE WAVE Soft.exe` (1.1.0 → 41.6.1, 1.2.0 → 44.9.3).
- **Skrypty niczego nie pobierają.** Brak paczki `work/working/build/downloads/<ev>/electron-v<ev>-<platforma>.zip` kończy skrypt kodem 2 z gotowymi poleceniami `curl`. Paczka jest sprawdzana sumą z `SHASUMS256.txt`, gdy ten plik leży obok (bez niego tylko `WARN`).
- **Linux, katalog:** domyślnie `work/working/build/linux` z plikiem `bewave-soft` (przemianowany `electron`), `resources/app.asar` (+ `app.asar.unpacked`), plikami z `resources` oryginału z listy `BW_ORIGINAL_RESOURCES` (w 1.2.0 `splash.jpg`, wpis 032), ikoną `bw-pro-desktop-app-ico.png` i `run.sh`.
- **`run.sh`:** `unset ELECTRON_RUN_AS_NODE` (ustawia je np. środowisko VS Code, wtedy Electron działa jak Node), uruchomienie `bewave-soft --no-sandbox "$@"` przez **ścieżkę bezwzględną** (aplikacja zmienia katalog roboczy, a `app.relaunch()` po odzyskiwaniu bazy uruchamia ponownie `argv[0]`). `--no-sandbox`, bo `chrome-sandbox` z katalogu budowania nie ma setuid root (na udziale sieciowym nie może go mieć).
- **Linux, pakiet `.deb`** (`package-deb.sh`): nazwa `bewave-soft`, wersja Debiana `1.2.0+port2` (`-port.` zamienione na `+port`), architektura `amd64`, instalacja do `/opt/bewave-soft`, uruchamiacz `/usr/bin/bewave-soft`, wpis `/usr/share/applications/bewave-soft.desktop` (`Name=BE WAVE Soft`, `MimeType=x-scheme-handler/bewave;` dla głębokich odnośników `bewave://`, `StartupWMClass=bewave`), ikona 256×256 w `hicolor`. Zależności: `libnss3, libgtk-3-0t64 | libgtk-3-0, libgbm1, libasound2t64 | libasound2, libnotify4, libxss1, libsecret-1-0, xdg-utils`.
  - Pole `Maintainer`: domyślnie neutralna nazwa projektu bez prywatnego adresu; własną wartość ustawia zmienna `BW_MAINTAINER` (np. `BW_MAINTAINER="Jan Kowalski <jan@example.com>" package-deb.sh`).
  - Uruchamiacz: jeśli `/opt/bewave-soft/chrome-sandbox` ma setuid, start z piaskownicą, w przeciwnym razie `--no-sandbox`.
  - `postinst`: `chown root:root` i `chmod 4755` na `chrome-sandbox`, odświeżenie bazy `.desktop` i ikon. Przy aktualizacji komunikat „BE WAVE Soft: zaktualizowano z <stara>. Dane i logowanie zostaly bez zmian. Uruchom aplikacje ponownie, jesli byla otwarta.”
  - Instalacja nowszego pakietu aktualizuje w miejscu, dane w `~/.config/BE WAVE Soft` zostają.
- **macOS, katalog:** domyślnie `work/working/build/mac/BE WAVE Soft.app` (arm64), złożony ze zwykłej paczki `electron-v<ev>-darwin-arm64.zip` i szablonu `work/working/mac/app-template` (`Info.plist`, `bewave.icns`, `zainstaluj.command`); bez builda macOS od Satel. Obok `.app` leży `zainstaluj.command`: na Macu podpisuje aplikację ad hoc i kopiuje ją do `/Applications` (droga bez instalatora).
- **macOS, pakiet `.pkg`** (`package-mac.sh`): `BE-WAVE-Soft-<wersja>-arm64.pkg`, identyfikator `pl.satel.bewave.port`, wersja pakietu `1.2.0.2` (`-port.` zamienione na `.`), instalacja do `/Applications`, tylko `arm64`, bez wyboru składników. `CFBundleShortVersionString` w `Info.plist` ustawione na wersję portu, plik `Contents/Resources/port-version`. `zainstaluj.command` nie trafia do pakietu.
  - `preinstall`: zamyka działającą aplikację (`pkill -TERM`, po 3 s `-KILL`), a gdy brak rachunku `pl.satel.bewave.port` (kopia zainstalowana inaczej), usuwa stare `/Applications/BE WAVE Soft.app`.
  - `postinstall`: `xattr -cr`, podpis ad hoc (`codesign --force --sign -`) każdego `*.node` i `ffmpeg.exe` typu Mach-O, potem całej aplikacji (`--deep`). Bez podpisu arm64 macOS nie uruchomi kodu.
  - Dane w `~/Library` zostają.

## Punkty zaczepienia
Nie dotyczy kodu Satel. Elementy zależne od wydania:
- wersja Electrona oryginału (napis `Electron/x.y.z` w `BE WAVE Soft.exe`, funkcja `bw_electron_version` w `work/working/lib-version.sh`), dla 1.2.0: 44.9.3, paczki `work/working/build/downloads/44.9.3/electron-v44.9.3-{linux-x64,darwin-arm64}.zip` i `SHASUMS256.txt`,
- cele esbuilda `kNodeTarget` i `kChromeTarget` w `work/working/tools/build-app.mjs`, dla Electron 44.9.3: `node24` i `chrome152` (wpis 033),
- wejście renderera: znacznik `// module N (entry)` w pierwszej linii modułu, który dopisuje `regenerate.sh`; `build-app.mjs` znajduje go sam przez `renderer/MANIFEST.json` (wpis 033),
- pliki z `resources` oryginału czytane przez proces główny z `process.resourcesPath`: lista `BW_ORIGINAL_RESOURCES` w `lib-version.sh`, w 1.2.0 `splash.jpg` (wpis 032; kotwica w `src/main/main.js`: `path.join(process.resourcesPath, "splash.jpg")`),
- ścieżka `resources/v*/TSH_soft.exe` w buildzie Windows oryginału i nazwy zasobów RCDATA (`tools/tsh-assets.mjs`, wpis 034).

## Implementacja
Ścieżki względem `work/working/`.
1. **`lib-version.sh`** (wspólny dla skryptów Linuksa i macOS, dołączany przez `.`): `bw_port_version` (z `VERSION` albo `BEWAVE_VERSION`), `bw_original_version` (część przed `-port`), `bw_electron_version` (napis z `BE WAVE Soft.exe` albo `ELECTRON_VERSION`), `bw_electron_zip <platforma>` (ścieżka paczki po sprawdzeniu sumy, inaczej polecenia `curl` i kod 2), `BW_ORIGINAL_RESOURCES` i `bw_copy_original_resources <katalog>` (kopia tych plików z `work/original/<wersja>/win-build/BE WAVE Soft/resources`; pliku, którego oryginał nie ma, nie kopiuje).
2. **`tools/build-app.mjs <katalog>`** (esbuild):
   - proces główny i preload: wejścia `electron.entry` ← `src/main/entry.js`, `electron.preload` ← `src/preload/preload.js`; `platform: node`, `format: cjs`, `packages: external`, `target: kNodeTarget`;
   - renderer: `bundle.web` ← moduł oznaczony `(entry)` (`rendererEntry()`; brak albo kilka takich modułów przerywa build); `format: iife`, `target: kChromeTarget`, `loader: { ".js": "jsx" }`, `jsx: automatic`, alias `react/jsx-runtime` → `src/renderer/lib/react/jsx-runtime.js`, zewnętrzne: wbudowane moduły Node oraz `realm`, `mqtt`, `electron`;
   - kopiuje `src/static` (`index.html`, `main.css`, `src/assets`) do `dist`;
   - zaraz potem `extractOriginalTshAssets()`: `tools/tsh-assets.mjs` wyciąga z `work/original/<wersja oryginału>/win-build/BE WAVE Soft/resources/v*/TSH_soft.exe` tła `BG_*`, czcionki `ROBL`/`ROBT`/`WDGT` i motywy z `INIFILE` do `dist/tsh/` (`bg/`, `fonts/`, `themes.json`, `manifest.json`). Brak dokładnie jednego `v*/TSH_soft.exe` przerywa build (`FAIL tsh assets: ...`). Wynik jest tylko w buildzie, nie w gicie (wpis 034).
3. **`linux/build-linux.sh [katalog]`** (domyślnie `build/linux`): katalog tymczasowy ← `app` (`package.json`, `node_modules`) + `linux/natives` na wierzch (przepis 06), `build-app.mjs`, rozpakowanie paczki Electrona, `electron` → `bewave-soft`, `asar pack … --unpack '{*.node,*.exe}'`, `bw_copy_original_resources "$OUT/resources"`, kopia ikony i `run.sh`. Koniec: `OK linux: <katalog> (<wersja portu>, Electron <ev>)`.
4. **`mac/build-mac.sh [katalog]`** (domyślnie `build/mac`, wymaga `python3`, działa na Linuksie i macOS): to samo z `mac/natives`, potem z paczki `electron-v<ev>-darwin-arm64.zip`: `Electron.app` → `BE WAVE Soft.app`, `Contents/MacOS/Electron` → `BE WAVE Soft`, aplikacje pomocnicze `Electron Helper*` → `BE WAVE Soft Helper` (`(GPU)`, `(Plugin)`, `(Renderer)`) z nowymi nazwami plików wykonywalnych; usunięte `default_app.asar` i `electron.icns`, skopiowane `bewave.icns` i pliki z `BW_ORIGINAL_RESOURCES`. Skrypt w Pythonie nakłada klucze z `mac/app-template/Info.plist` na `Info.plist` z paczki (`@ORIGINAL_VERSION@` → wersja oryginału, `CFBundleIdentifier` `pl.satel.bewave`, schemat URL `bewave`, opisy dostępu do sieci lokalnej i lokalizacji), usuwa `ElectronAsarIntegrity` (suma obejmowała usunięty `default_app.asar`) i ustawia nazwy oraz identyfikator `pl.satel.bewave.helper` w `Info.plist` aplikacji pomocniczych. Na koniec `asar pack` do `Contents/Resources` i kopia `zainstaluj.command` obok `.app`.
5. **`linux/package-deb.sh [wersja]`**: wywołuje `build-linux.sh` do katalogu tymczasowego (nie do `build/linux`, który może być uruchomiony), składa układ z „Zachowanie” i `dpkg-deb --root-owner-group --build`.
6. **`mac/package-mac.sh [wersja]`**: wywołuje `build-mac.sh` do domyślnego `build/mac`, usuwa stamtąd `zainstaluj.command`, ustawia wersję portu w `Info.plist`, dopisuje `port-version`; `.pkg` składany bez Xcode: `cpio` (format `odc`) + `gzip` → `Payload`/`Scripts`, `mkbom` (bomutils), `xar --compression none`, właściciel `0:80` przez `fakeroot`.
7. Oba instalatory trafiają do `build/release` i same budują aplikację od nowa, więc nie trzeba wcześniej uruchamiać `build-*.sh`.
8. **Nie budować do `build/linux`, gdy aplikacja z niego działa** (`rm -rf` psuje działający proces). Do prób podawać inny katalog.

## Zależności
Przepis 06 (natywne binaria w `linux/natives` i `mac/natives`).

## Sprawdzenie
1. `work/working/linux/build-linux.sh "$SCRATCH/build-linux"` kończy się `OK linux`; potem `"$SCRATCH/build-linux/run.sh"` na osobnym profilu (`HOME` i `XDG_CONFIG_HOME` w katalogu tymczasowym): ekran powitalny i startowy, logowanie, baza po restarcie. W katalogu jest `resources/splash.jpg`.
2. `work/working/mac/build-mac.sh "$SCRATCH/build-mac"` kończy się `OK mac`; w `Contents/Info.plist` `CFBundleExecutable` = `BE WAVE Soft`, brak `ElectronAsarIntegrity`, jest `Contents/Resources/splash.jpg`.
3. `package-deb.sh`, `dpkg -i` starszej, potem nowszej wersji: `dpkg -l bewave-soft` pokazuje nową, dane i logowanie zostają; `dpkg-deb -f <plik>.deb Maintainer` pokazuje wartość domyślną albo `BW_MAINTAINER`.
4. `package-mac.sh`, instalacja na Macu arm64: aplikacja w `/Applications` startuje, ponowna instalacja nowszej zastępuje ją bez utraty danych.
5. Testy narzędzi (z katalogu głównego repozytorium): `npm --prefix work/working/tools test`.

## Ryzyka przy nowej wersji
- **Nowy Electron:** odczytaj `process.versions` z nowej paczki (`ELECTRON_RUN_AS_NODE=1 <rozpakowana paczka>/electron -p process.versions`) i zmień `kNodeTarget`/`kChromeTarget`. Za stary cel może przerwać build na nowej składni bibliotek.
- **Nowe pliki w `resources`:** każdy plik, który proces główny czyta z `process.resourcesPath` na każdej platformie, dopisz do `BW_ORIGINAL_RESOURCES`. Nie dołączamy `*.ico` (tylko `win32`), `elevate.exe`, `v*` (TSH, przepis 01) ani `app-update.yml` (przepis 02).
- **Zmiana układu paczki Electrona dla macOS** (nazwy aplikacji pomocniczych, klucze `Info.plist`) wymaga zmiany pętli przemianowań i skryptu Pythona w `build-mac.sh`.
- **`TSH_soft.exe`:** inna ścieżka `resources/v*` albo inne nazwy zasobów RCDATA przerwą build; test `npm --prefix work/working/tools test` na prawdziwym exe (12 teł, 24 motywy, sygnatury czcionek) pokaże różnicę.
- Alias `react/jsx-runtime` wskazuje plik w `src/renderer/lib/react/`; po regeneracji nowego wydania jego ścieżka może być inna.
