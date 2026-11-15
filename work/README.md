# BE WAVE Soft - katalog roboczy

Katalogi oryginałów są rozdzielone według wersji Satel (`<ver>`, np. `1.1.0`, `1.2.0`).

| Katalog | Zawartość | Edycja |
|---|---|---|
| `../installers-original/<ver>/` | Instalatory Satel: `1.1.0/BE WAVE Soft.zip`, `1.2.0/BE_WAVE_Soft_Configuration_Program_1.2.0_INT_17817.exe` (NSIS, tylko Windows) | nie zmieniać |
| `original/<ver>/` | Stary kod: `app/` (rozpakowany app.asar, repo git z baseline), `win-build/`; tylko 1.1.0 ma `mac-build/` (nasze przepakowanie, wzór dla `working/mac/app-template`) | nie zmieniać |
| `deobfuscated/<ver>/` | Kod wygenerowany: `raw/` (wynik webcracka), `named/` (tylko do porównań, tworzy go `regenerate.sh`) | nie zmieniać |
| `working/` | Nasz kod: `src/` (nazwany kod aplikacji, tu nanosimy zmiany), `app/` (`package.json` i `node_modules`), `linux/` i `mac/` (natywne binaria, skrypty budowania), `mac/app-template/` (Info.plist, ikona, `zainstaluj.command`), `tools/` (narzędzia deobfuskacji), `build/linux`, `build/mac` (gotowe aplikacje) | tu pracujemy |
| `working/build/downloads/` | `<electron>/electron-v<electron>-<platforma>.zip` (+ `SHASUMS256.txt`), niezależne od wersji: `ffmpeg.gz`, `realm/` | pobrane pliki |

## Wersje

- `working/VERSION` to nasza wersja `<oryginał>-port.<n>`, np. `1.1.0-port.3`. Część przed `-port` to wersja oryginału.
- Wersję Electrona odczytujemy z napisu `Electron/x.y.z` w `original/<oryginał>/win-build/BE WAVE Soft/BE WAVE Soft.exe`
  (1.1.0 → 41.6.1, 1.2.0 → 44.9.3). Robi to `working/lib-version.sh`, wspólny dla skryptów Linuksa i Maca.
- Skrypty niczego nie pobierają. Gdy brakuje paczki Electrona, wypisują polecenia `curl` z dokładnym adresem i kończą się
  kodem 2. Paczkę sprawdzają sumą z `SHASUMS256.txt`, jeśli ten plik leży obok niej (bez niego tylko ostrzeżenie).
- Do testów można nadpisać wersję bez zmiany pliku: `BEWAVE_VERSION=1.2.0-port.1` albo `ELECTRON_VERSION=44.9.3`.

## Build

- Linux: `working/linux/build-linux.sh [katalog]`, Electron z `downloads/<electron>/electron-v<electron>-linux-x64.zip`.
  Start: `working/build/linux/run.sh`.
- macOS: `working/mac/build-mac.sh [katalog]` składa `BE WAVE Soft.app` (arm64) z czystego
  `electron-v<electron>-darwin-arm64.zip`: zmienia nazwy aplikacji, pliku wykonywalnego i aplikacji pomocniczych
  (`BE WAVE Soft Helper`, `(GPU)`, `(Plugin)`, `(Renderer)`), nakłada klucze z `mac/app-template/Info.plist`
  (wersja = wersja oryginału) i kopiuje ikonę oraz `zainstaluj.command`. Działa na Linuksie i macOS, wymaga `python3`.
  Na Macu aplikację podpisuje i instaluje `zainstaluj.command`.

Domyślnie wynik trafia do `working/build/linux` i `working/build/mac`. Nie budujemy tam, gdy aplikacja z tego katalogu
działa; do prób podajemy inny katalog.

## Instalatory

`working/linux/package-deb.sh`, `working/mac/package-mac.sh`, wynik w `working/build/release`. Pakiet na Maca wymaga
`xar` i `bomutils`.
