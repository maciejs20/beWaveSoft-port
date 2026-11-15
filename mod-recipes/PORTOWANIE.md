# Portowanie kolejnego wydania Satel

Stan na 2026-11-15: oryginał 1.2.0 (Electron 44.9.3), ostatnie wydanie portu `1.2.0-port.2` (2026-11-14), w toku ([Unreleased] w `CHANGELOG.md`) przebudowa edytora ekranów TSH (wpisy 044–054). Procedura powstała przy przejściu 1.1.0 → 1.2.0 (`1.2.0-port.1`). Ten plik jest jedynym źródłem procedury portowania i zebranych ustaleń. `REJESTR-ZMIAN.md` („Odtworzenie po aktualizacji źródła”) ma jej skrót. Przy rozbieżności obowiązuje ten plik.

## Cel

Przenieść port BE WAVE Soft (Linux x64, macOS arm64) na nowe wydanie Satel, np. 1.3.0. Wynik:
- nowe zachowanie Satel w całości,
- nasze zmiany 001–NNN z `REJESTR-ZMIAN.md` naniesione ponownie, z działaniem zmienionym tylko tam, gdzie wymusza to nowy kod,
- buildy i instalatory obu platform, wersja `<oryginał>-port.1`,
- dokumentacja: `CHANGELOG.md`, `REJESTR-ZMIAN.md`, `PORT-<wersja>-ANALIZA.md`.

Oznaczenia w przykładach: `<ver>` to nowe wydanie (np. `1.3.0`), `<prev>` poprzednie (np. `1.2.0`), `<ev>` wersja Electrona nowego wydania. `BW` i `SCRATCH` to zmienne, które ustawia wykonujący port przed pierwszym poleceniem: `BW` to katalog główny repozytorium, `SCRATCH` dowolny pusty katalog tymczasowy, np.:
```sh
export BW="$(git rev-parse --show-toplevel)"   # w katalogu repozytorium
export SCRATCH="$(mktemp -d)"
```

## Wymagania wstępne

- Linux x64 (oba buildy, także macOS, powstają na Linuksie; `build-mac.sh` działa też na macOS), ok. 12 GB RAM (deobfuskacja używa sterty Node 12 GB) i wolne miejsce na rozpakowane oryginały, kod deobfuskowany i paczki Electrona (sprawdź przed krokiem 4).
- Node 22 z npm; narzędzia: `npm ci` w `$BW/work/working/tools` (esbuild, webcrack, asar i inne).
- Narzędzia systemowe: `git`, `curl`, `unzip`, `python3`, `dpkg-deb`, `xar`, `mkbom` (bomutils), `cpio`, `fakeroot`, `file`.
- Instalator Windows nowego wydania od Satel (NSIS `.exe`). W jego katalogu programu musi być `resources/v*/TSH_soft.exe`: build wyciąga z niego grafiki edytora ekranów TSH (wpis 034) i bez niego się przerywa.
- Binaria platform w `work/working/linux/natives` i `work/working/mac/natives` (poza gitem), wypełnione według przepisu 06.
- Paczki Electrona w `work/working/build/downloads/<ev>` (krok 2).

## Ustalenia

Decyzje stałe. Nie podnosimy ich ponownie, chyba że użytkownik sam do nich wróci.

| Decyzja | Data | Źródło |
|---|---|---|
| Platformy: tylko macOS i Linux. Windows jest poza zakresem, bo Satel wydaje na niego gotowy program. | 2026-10-30 | `CLAUDE.md` „Zasady” |
| Każda zmiana dotyczy obu platform. Bez warunków typu `process.platform === "linux"`. Kod dla jednej platformy tylko wtedy, gdy nie da się inaczej (inne binarium, inne narzędzie systemowe, API tylko jednej platformy). Obecne wyjątki: wpis 004 (przepis 03, `password-store` i `safeStorage.setUsePlainTextEncryption` tylko na Linuksie) i wpis 006 (przepis 04, Wi-Fi przez `nmcli`). | 2026-10-30 | `CLAUDE.md` „Zasady”, `README.md` zasada 1 |
| Każda zmiana aplikacji jest w `CHANGELOG.md` (Keep a Changelog) z wersją oryginału i naszą. Wersja ma postać `<oryginał>-port.<n>`, w `work/working/VERSION`. | 2026-10-30 | `CLAUDE.md`, `CHANGELOG.md` |
| Każda zmiana funkcjonalna ma numerowany wpis w `REJESTR-ZMIAN.md`: pliki, kotwice z tekstu oryginału, dokładny kod przed i po, sprawdzenie. Numerów nie używa się ponownie. | 2026-10-30 | `CLAUDE.md`, `REJESTR-ZMIAN.md` |
| Pracujemy na nazwanym kodzie w `work/working/src` i z niego budujemy. `work/working/app` trzyma tylko `package.json` i `node_modules`. | 2026-10-30 | `CLAUDE.md` |
| Desktop i telefon/tablet to dwie osobne drogi. Zmiana interfejsu działa tylko na drodze desktopowej (szerokość okna co najmniej 900 px, przepis 08). Nowe zachowanie to nowe komponenty, stare ekrany dostają tylko rozgałęzienie. | 2026-10-30 | `CLAUDE.md`, `PROJEKT-RUTYNY.md` decyzja 5, `README.md` zasady 2–4 |
| Port zmienia działanie najmniej, jak się da. Usterki zauważone przy porcie idą do „Znane luki”, nie do poprawki w tym samym wydaniu. | 2026-11-13 | użytkownik, port 1.2.0 |
| Gdy Satel doda funkcję, która dubluje naszą, wybieramy wersję Satel, a naszą na desktopie usuwamy. | 2026-11-13 | użytkownik, port 1.2.0 |
| Szukanie na liście rutyn i scen (wpis 022) i w dzienniku zdarzeń (wpis 028): na desktopie zostaje tylko pole Satel z 1.2.0, nasze pole usunięte, a nasze tabele pokazują wynik filtrowania Satel. Wdrożone w `1.2.0-port.1`. | 2026-11-13 | użytkownik |
| Klucz bazy Realm bez magazynu sekretów systemu: `password-store=basic`, `safeStorage` na tekście jawnym, `realm.key` z prawami `0600` (wpisy 004, 005, przepis 03). Klucz z `gnome-libsecret` ginął między uruchomieniami. Nie podnosić ponownie. | 2026-10-30 | `REJESTR-ZMIAN.md` 004, 005 |
| Samego TSH Soft na Linuksie i macOS nie uruchamiamy: blokada `.exe` w `open-resource` (wpis 002), bez wine, binaria TSH (`resources/v*`) nie są dołączane. Na drodze desktopowej (okno ≥ 900 px) „Edytuj ekrany” otwiera wbudowany edytor ekranów klawiatury (wpisy 035–037, przebudowa 044–054, `PROJEKT-TSH-EDYTOR.md`); na telefonie, tablecie i w oknie < 900 px blok zostaje ukryty jak we wpisie 001. Build czyta grafiki z `TSH_soft.exe` oryginału (wpis 034; brak exe przerywa build), ale go nie dołącza. | 2026-10-30, 2026-11-13 | przepis 01, wpisy 001, 002, 034, 035 |
| Aktualizacje wyłączone: `autoUpdater` zawsze zgłasza brak aktualizacji (wpis 003), bo serwer Satel ma tylko instalatory NSIS. `app-update.yml` nie jest dołączany. | 2026-10-30 | `REJESTR-ZMIAN.md` 003, przepis 02 |
| Wi-Fi na Linuksie przez `nmcli` (wpis 006). | 2026-10-30 | `REJESTR-ZMIAN.md` 006, przepis 04 |
| `run.sh`: `unset ELECTRON_RUN_AS_NODE` (ustawia je np. VS Code), `--no-sandbox` (`chrome-sandbox` z katalogu budowania nie ma setuid; na udziale sieciowym nie może go mieć), uruchomienie przez ścieżkę bezwzględną (aplikacja zmienia katalog roboczy, a `app.relaunch()` uruchamia ponownie `argv[0]`). | 2026-10-30 | `linux/run.sh` |
| Nie budujemy do `work/working/build/linux`, gdy aplikacja z niego działa (`rm -rf` psuje działający proces). Do prób podajemy inny katalog. | 2026-10-30 | `work/README.md` |
| Nigdy nie klikamy „Zapisz” w rutynie ani nie sterujemy centralą w testach bez zgody użytkownika. Prawdziwy zapis i sterowanie robi tylko użytkownik, na nieszkodliwym wyjściu. | 2026-10-30 | `PROJEKT-RUTYNY.md`, `README.md` zasada 5 |
| Centrala testowa autora jest w innej sieci niż maszyna, na której powstaje port. Błędy wykrywania UDP i praca tylko zdalna (MQTT, port 8854) są wtedy oczekiwane, to nie błędy. | 2026-10-30 | autor |
| Uruchamianie rutyn bez potwierdzenia. Polecenia grupowe z potwierdzeniem (wpis 026). Sterowanie pojedynczym wyjściem (przełącznik na karcie, wiersze przełączników w szczegółach) bez potwierdzenia od wpisu 038. | 2026-10-30, 2026-11-14 | `WYMAGANIA.md` 15, użytkownik |
| Desktop (decyzje z 30.10): aktywne awarie i dziennik zdarzeń jako zwarte tabele, panel boczny ze zwijanymi sekcjami i oddzielonym „Usuń obiekt”, zwarta lista pomieszczeń z tabelą urządzeń pomieszczenia. | 2026-10-30 | `WYMAGANIA.md` 15 |
| Panel boczny na desktopie: grupy „Podsumowanie”, „Konfiguracja”, „Ustawienia” (przepis 25); bez zużycia energii i danych środowiskowych; Monitoring otwierany z Integracji, Mój profil z Użytkowników. Kafelki urządzeń radiowych w pomieszczeniu z wierszem sygnału (przepis 26). | 2026-11-14 | użytkownik, wpisy 041–043 |
| Zamknięcie okna X kończy aplikację na Linuksie i macOS; na macOS aplikacja nie zostaje w Docku bez okien (zastępuje decyzję z wpisu 031 o pozostawaniu w Docku). | 2026-11-14 | użytkownik, wpis 039, przepis 05 |
| Tabela obiektów: czujki bezprzewodowe w „Pozostałe”, kafelki pomieszczeń bez tabeli, szczegóły bez potwierdzenia, `Esc` w szczegółach wraca do tabeli, domyślnie widok graficzny. Tabela tylko do odczytu, bez sterowania bez osobnej decyzji. | 2026-10-30 | `PROJEKT-TABELA-OBIEKTOW.md` |
| Edytor rutyn: obejmuje też sceny, częste wyzwalacze to stała lista, `Ctrl+Enter` zapisuje, lista wyzwalaczy w jednej kolumnie, nowy warunek domyślnie „Stan wejścia”. | 2026-10-30 | `PROJEKT-RUTYNY.md`, `REJESTR-ZMIAN.md` 019, 023 |
| macOS: tylko arm64. Instalator `.pkg` składany bez Xcode (`xar`, `mkbom`, `cpio`, `fakeroot`), podpis ad hoc w `postinstall`. Linux: `.deb` z aktualizacją w miejscu. Dane użytkownika zostają przy aktualizacji. | 2026-10-30 | przepis 07 |
| Szkielet `.app` składany z czystego `electron-v<ev>-darwin-arm64.zip` i `mac/app-template`, bez builda macOS od Satel. | 2026-11-13 | commit `707c225`, `work/README.md` |
| Układ wersjonowany: `installers-original/<ver>`, `work/original/<ver>`, `work/deobfuscated/<ver>`, `work/working/build/downloads/<ev>`, konfiguracja narzędzi w `work/working/tools/versions/<ver>`. Skrypty niczego nie pobierają. | 2026-11-13 | commity `707c225`, `8ecc64a`, `work/README.md` |
| Commity na `main` (lokalne repo bez zdalnego), po angielsku, bez śladów AI (bez `Co-Authored-By`). Nie zmieniamy oryginałów w `installers-original/` i `work/original/`. | 2026-10-23, 2026-11-03 | `codingRules/CLAUDE.md` §2 i §6, `rules/workflow-git.md` |

## Układ katalogów

Szczegóły w `work/README.md`. Najważniejsze dla portu:

| Katalog | Rola w porcie |
|---|---|
| `installers-original/<ver>/` | instalator Satel; nie zmieniać |
| `work/original/<ver>/win-build/BE WAVE Soft/` | rozpakowany program Windows: `BE WAVE Soft.exe` (źródło wersji Electrona), `resources/` (źródło `splash.jpg` i innych plików z `BW_ORIGINAL_RESOURCES`) |
| `work/original/<ver>/app/` | rozpakowany `app.asar` z repozytorium git i commitem bazowym; nie zmieniać |
| `work/deobfuscated/<ver>/raw/` | wynik `deobfuscate.sh` |
| `work/deobfuscated/<ver>/named/` | wynik `regenerate.sh`: drzewo w postaci `working/src` bez naszych zmian, baza 3-way merge |
| `work/working/tools/versions/<ver>/` | `version.json` (`namesFrom`), `name-main.json`, `module-overrides.json`, opcjonalnie `manual-names.json` |
| `work/working/src/` | nasz nazwany kod (źródło prawdy) |
| `work/working/app/` | `package.json` i `node_modules` oryginału po usunięciu binariów Windows; w gicie tylko `node-window-manager/dist` (wpis 007) |
| `work/working/{linux,mac}/natives/` | `realm/prebuilds/node/realm.node` i `ffmpeg-static/ffmpeg.exe` dla platformy (poza gitem, źródła i polecenia w przepisie 06) |
| `work/working/build/downloads/<ev>/` | paczki Electrona i `SHASUMS256.txt`; obok, niezależne od wersji: `ffmpeg.gz`, `realm/` |
| `work/working/build/{linux,mac,release}/` | gotowe aplikacje i instalatory |

## Przepis krok po kroku

Kolejność kroków jest ważna. Każdy krok ma polecenia, oczekiwany wynik i pułapki. Polecenia zakładają `cd $BW/work/working/tools`, chyba że podano inaczej.

### 1. Rozpakowanie oryginału

Satel może wydać tylko instalator Windows NSIS (tak było z 1.2.0: `BE_WAVE_Soft_Configuration_Program_1.2.0_INT_17817.exe`, bez builda macOS). Wystarcza on dla obu platform.

1. Położyć instalator w `$BW/installers-original/<ver>/`.
2. `7za` z pakietu npm `7zip-bin@5.2.0`, zainstalowanego tymczasowo w scratchpadzie (nie jest zależnością projektu):
   ```sh
   npm install --prefix "$SCRATCH/tools7z" 7zip-bin@5.2.0
   Z="$SCRATCH/tools7z/node_modules/7zip-bin/linux/x64/7za"
   mkdir -p "$BW/work/original/<ver>/win-build/BE WAVE Soft"
   cd "$BW/work/original/<ver>/win-build/BE WAVE Soft" && "$Z" x "$BW/installers-original/<ver>/<instalator>.exe"
   ```
   `7za x` na instalatorze NSIS rozpakowuje od razu katalog programu (`BE WAVE Soft.exe`, `resources/`, biblioteki).
3. Rozpakowanie `app.asar`:
   ```sh
   ./node_modules/.bin/asar extract "$BW/work/original/<ver>/win-build/BE WAVE Soft/resources/app.asar" "$BW/work/original/<ver>/app"
   cd "$BW/work/original/<ver>/app" && git init && git add -A && git commit -m "Baseline: app.asar extracted from BE WAVE Soft <ver> (minified)"
   ```
   Commit bazowy jest potrzebny: `git diff` względem niego pokazuje każdą przypadkową zmianę oryginału.
4. Wersja Electrona: napis `Electron/x.y.z` w `BE WAVE Soft.exe`. Czyta go `work/working/lib-version.sh` (`bw_electron_version`), ręcznie:
   ```sh
   LC_ALL=C grep -a -o -m1 'Electron/[0-9]*\.[0-9]*\.[0-9]*' "$BW/work/original/<ver>/win-build/BE WAVE Soft/BE WAVE Soft.exe" | head -n1
   ```
   1.1.0 → 41.6.1, 1.2.0 → 44.9.3.
5. Porównać `package.json` `<prev>` i `<ver>` (`dependencies`) oraz wersje modułów natywnych: `realm`, `ffmpeg-static`, `bufferutil`, `utf-8-validate`, `node-window-manager`, `passport-desktop`, `@primno/dpapi`. W 1.2.0 bez zmian: `realm` 12.15.0, `ffmpeg-static` 5.3.0. Przejrzeć też `node_modules` pod kątem nowych `*.node`, `build/Release`, `prebuilds/win32-*` i pakietów `*-win32-*` (przepis 06, „Ryzyka”).
   - Zmiana wersji `realm` albo `ffmpeg-static`: nowe binaria dla Linuksa i macOS do `linux/natives` i `mac/natives`, polecenia w przepisie 06 („Implementacja”, punkt 3). Plik ffmpeg zostaje pod nazwą `ffmpeg.exe` z prawem wykonania, bo renderer szuka dokładnie tej ścieżki.

### 2. Paczki Electrona

```sh
mkdir -p "$BW/work/working/build/downloads/<ev>" && cd "$BW/work/working/build/downloads/<ev>"
curl -fLO https://github.com/electron/electron/releases/download/v<ev>/electron-v<ev>-linux-x64.zip
curl -fLO https://github.com/electron/electron/releases/download/v<ev>/electron-v<ev>-darwin-arm64.zip
curl -fLO https://github.com/electron/electron/releases/download/v<ev>/SHASUMS256.txt
```
Skrypty budowania przy braku paczki wypisują te same polecenia i kończą się kodem 2. Sumę sprawdzają same (`bw_electron_zip`), gdy `SHASUMS256.txt` leży obok. Bez niego jest tylko `WARN`, więc plik trzeba pobrać.

### 3. Znacznik ostatniego portu poprzedniej wersji

```sh
cd $BW && git tag <prev>-port.<n>
```
Istnieją `1.1.0-port.3` i `1.2.0-port.1`. Wydanie `1.2.0-port.2` (commit `a0c5cce`, 2026-11-14) nie ma znacznika: przed portem 1.3.0 dodaj go (`git tag 1.2.0-port.2 a0c5cce`), a jeśli po nim wyjdzie kolejne wydanie 1.2.0 (np. z przebudową edytora TSH z [Unreleased]), oznacz ostatnie. Bez znacznika nie da się później zbudować starej wersji ani porównać.

### 4. Deobfuskacja i nazwany kod

1. Surowy kod (ok. 1,5 min, sterta Node 12 GB):
   ```sh
   ./deobfuscate.sh <ver>
   ```
   Wynik: `work/deobfuscated/<ver>/raw`, jedna linia na krok, pełny log w `/tmp/bewave-deobfuscate-<ver>.log`. Kod 1 oznacza nieudany krok albo moduły, które zostały w postaci surowej. Istniejący katalog wymaga `--force`.
2. Baza do przenoszenia nazw, jeśli `work/deobfuscated/<prev>/named` nie istnieje albo powstał starszymi skryptami:
   ```sh
   ./regenerate.sh <prev>
   ```
3. Konfiguracja nowej wersji w `versions/<ver>/`:
   ```sh
   mkdir versions/<ver>
   printf '{\n "namesFrom": "<prev>"\n}\n' > versions/<ver>/version.json
   echo '{}' > versions/<ver>/module-overrides.json
   node port-name-main.mjs ../../deobfuscated/<prev>/raw/electron.main versions/<prev>/name-main.json \
     ../../deobfuscated/<ver>/raw/electron.main versions/<ver>/name-main.json
   ```
   Przejrzeć linie `WARN` (nazwy nieprzeniesione). W 1.2.0 nie było żadnej.
4. Pętla dopasowania modułów renderera:
   ```sh
   ./regenerate.sh <ver>
   node match-modules.mjs ../../deobfuscated/<prev>/raw/bundle.web ../../deobfuscated/<prev>/named/renderer/MANIFEST.json \
     versions/<prev>/module-overrides.json ../../deobfuscated/<ver>/raw/bundle.web \
     ../../deobfuscated/<ver>/named/renderer/MANIFEST.json versions/<ver>/module-overrides.json \
     ../../deobfuscated/<ver>/module-matches.json
   ```
   Powtarzać `regenerate.sh <ver>` i `match-modules.mjs`, aż `match-modules.mjs` poda 0 nowych wpisów. W 1.2.0 powstało 1854 wpisy. Kończy `regenerate.sh <ver>`.
5. `regenerate.sh` sam przywraca znacznik `__esModule` (bez niego biały ekran z błędem React #130), usuwa `require.p + `, dodaje `main/entry.js`, `preload/preload.js` i `static/`, oznacza wejście renderera `// module N (entry)` i przenosi nazwy zmiennych z `<prev>` (`carry-names.mjs`). Ręcznie nic z tego nie robimy.

**Pułapki:** `regenerate.sh` i `deobfuscate.sh` mają blokadę w `/tmp/bewave-*.lock`; dwa przebiegi naraz kończą się kodem 2. Niepowodzenie kroku zostawia wynik w `named.partial`. Przed uruchomieniem sprawdzić wolne miejsce.

### 5. Analiza

Plik `$BW/PORT-<ver>-ANALIZA.md`, wzór: `PORT-1.2.0-ANALIZA.md`. Zawartość:
- a) nasze zmiany: różnica `deobfuscated/<prev>/named` → `working/src` (pliki z kodem, pliki z samymi komentarzami, nowe pliki); każdy plik z kodem musi być w rejestrze,
- b) zmiany Satel: `named/<prev>` → `named/<ver>`, osobno app, biblioteki, proces główny i preload (nowe IPC, nowe pliki z `resources`, zmiany w miejscach naszych poprawek),
- c) mapa ścieżek plików, których dotykamy, z pewnością dopasowania i liczbą konfliktów w próbnym scaleniu,
- d) metoda scalania i lista plików wymagających ręcznej pracy.

Próbne scalenie robić w scratchpadzie, nie w `working/src`.

### 6. Scalenie trzystronne

Dla każdego pliku, który zmieniamy (lista z punktu a analizy; `<plik>` to ścieżka względem `src/`, np. `renderer/app/screens/KeypadSettingsScreen.js`, taka sama w `working/src` i w `deobfuscated/<wersja>/named`):
```sh
cd "$BW/work"
mkdir -p "$SCRATCH/merge/$(dirname <plik>)"
cp working/src/<plik> "$SCRATCH/merge/<plik>"
git merge-file --diff3 "$SCRATCH/merge/<plik>" deobfuscated/<prev>/named/<plik> deobfuscated/<ver>/named/<plik>
```
Kolejność argumentów: nasze, baza, Satel. Kod wyjścia to liczba konfliktów.

Nowe `working/src` = całe drzewo `deobfuscated/<ver>/named` + scalone pliki + nasze nowe pliki bez zmian (`main/linuxOverrides.js`, `renderer/app/logic/Desktop*.js`, `renderer/app/desktop/**`). Przed podmianą zrobić kopię `working/src` w scratchpadzie.

Zasady rozwiązywania konfliktów:
- zostaje zachowanie Satel i nasza zmiana; usuwamy tylko to, co wymaga wpis rejestru,
- sąsiednie dopisane linie (`require`, trasy, klucze i18n) zostawić obie,
- nasz komentarz obok nowego kodu Satel: kod Satel, komentarz dopisać,
- ekran przepisany przez Satel: nanieść zmianę od nowa według przepisu `mod-recipes/NN-*.md` (kotwice z „Punkty zaczepienia”),
- Satel dodał funkcję dublującą naszą: zostaje funkcja Satel (ustalenie z 2026-11-13).

W 1.2.0: 56 plików, 26 konfliktów w 14 plikach. Ręcznej pracy wymagały `EventLogListScreen.js` (028), `AutomationList.js` (022), `AutomationConditionSetScreen.js`, `AutomationActionSetScreen.js`, `webPageStyle.js`, `HubFailuresScreen.js`.

Scalenie bez konfliktu nie gwarantuje poprawności: nasze nowe pliki korzystają z modułów, które Satel mógł zmienić. Sprawdzić, czy używane eksporty i pola nadal istnieją.

### 7. `working/app`

`package.json` i `node_modules` z `work/original/<ver>/app`, potem usunięcia z wpisu 008 (przepis 06) i przywrócenie naszych plików z wpisu 007:
```sh
cd "$BW"
rm -rf work/working/app/node_modules work/working/app/package.json
cp -a work/original/<ver>/app/package.json work/original/<ver>/app/node_modules work/working/app/
cd work/working/app/node_modules
rm -rf bufferutil/build utf-8-validate/build passport-desktop-win32-x64-msvc @primno/dpapi/build @primno/dpapi/prebuilds
cd "$BW" && git checkout -- work/working/app/node_modules/node-window-manager/dist
```
Usuwane katalogi: `bufferutil/build`, `utf-8-validate/build` (w 1.2.0 już nie istnieje), `passport-desktop-win32-x64-msvc`, `@primno/dpapi/build`, `@primno/dpapi/prebuilds`. Narzędzia budowania dla Windows, których aplikacja nie ładuje (`hermes-compiler/hermesc/win64-bin`, `fb-dotslash/bin/windows*`, `react-native/sdks/hermesc`), zostają.

`node-window-manager/dist` (wpis 007) jest w gicie. Gdy wersja `node-window-manager` się nie zmieniła i jego `dist` w oryginale jest taki sam jak w `<prev>`, `git checkout` naszych plików wystarczy. W przeciwnym razie nanieść 007 według kotwic.

### 8. Build: cele esbuilda i zasoby oryginału

1. Wersje runtime nowego Electrona:
   ```sh
   unzip -q "$BW/work/working/build/downloads/<ev>/electron-v<ev>-linux-x64.zip" -d "$SCRATCH/electron-<ev>"
   ELECTRON_RUN_AS_NODE=1 "$SCRATCH/electron-<ev>/electron" -p process.versions
   ```
   Zmienić `kNodeTarget` i `kChromeTarget` w `tools/build-app.mjs` (dla 44.9.3: `node24`, `chrome152`) i komentarz nad nimi. Wejście renderera `build-app.mjs` znajduje sam (znacznik `(entry)`).
2. Nowe pliki, które proces główny czyta z `process.resourcesPath`: szukać `process.resourcesPath` w `src/main/main.js` i porównać z `win-build/BE WAVE Soft/resources`. Każdy taki plik dopisać do `BW_ORIGINAL_RESOURCES` w `lib-version.sh` (1.2.0 dodało `splash.jpg`, wpis 032). Nie dołączamy: `*.ico` (tylko `win32`), `elevate.exe`, `v*` (TSH, 002), `app-update.yml` (003). `v*/TSH_soft.exe` musi jednak być w `win-build` oryginału: build wyciąga z niego grafiki do `dist/tsh` (034).

### 9. Proces główny: dziury w naszych blokadach

Przejrzeć nowe `ipcMain.handle`/`ipcMain.on` i wywołania `shell`, `child_process`, `execFile` w `src/main/main.js`. Pytania:
- czy nowy kanał może uruchomić `.exe` albo plik z `resources/v*` z pominięciem blokady 002? W 1.2.0 `open-external` dopuszcza tylko `https?:`, `mailto:`, `ms-settings:`, `x-apple.systempreferences:`, więc `file:` jest zablokowane,
- czy nowy kod nie omija 003 (aktualizacje), 004/005 (klucz Realm), 006 (Wi-Fi), 031/039/040 (zamykanie okna i aplikacji),
- czy nowy kod ma gałąź tylko dla `win32`, która na Linuksie i macOS zostawia brak funkcji (w 1.2.0 ikona zależna od motywu; zostaje, bo nic nie psuje).

### 10. Build i test dymny

```sh
$BW/work/working/linux/build-linux.sh "$SCRATCH/build-linux"     # koniec: OK linux
$BW/work/working/mac/build-mac.sh "$SCRATCH/build-mac"           # wymaga python3, działa na Linuksie
```
Kody: 0 zbudowane, 1 błąd kroku, 2 brak paczki, oryginału albo narzędzia. Ostrzeżenia esbuilda tylko w plikach, które ostrzegały wcześniej (`enums/ExpanderInputType.js`, `logic/DiscoveredDevice.js`, `logic/ParseColorActionValue.js`, `duplicate-case`).

Test na Linuksie, zawsze na **osobnym profilu**:
```sh
T="$(mktemp -d -p "$SCRATCH")"
HOME="$T" XDG_CONFIG_HOME="$T/.config" "$SCRATCH/build-linux/run.sh" --remote-debugging-port=9222
```
- Aplikacja trzyma dane w `$XDG_CONFIG_HOME/BE WAVE Soft` niezależnie od `--user-data-dir`, więc trzeba ustawić `XDG_CONFIG_HOME` (i `HOME`).
- **Nie uruchamiać nowej wersji na prawdziwym profilu użytkownika** (`~/.config/BE WAVE Soft`) bez jego zgody: nowa wersja może przenieść bazę Realm na nowy format bez drogi powrotu.
- Sterowanie i odczyt przez CDP na porcie z `--remote-debugging-port`. Log procesu głównego: `$XDG_CONFIG_HOME/BE WAVE Soft/logs/main.log`.
- Minimum: ekran startowy (i ekran powitalny, jeśli jest), baza otwarta, `realm.key` z prawami `0600`, `openResource("x/TSH_soft.exe")` niczego nie uruchamia (ostrzeżenie w `main.log`), `/tsh/themes.json` i `/tsh/fonts/WDGT.ttf` zwracają 200, brak wyjątków w konsoli, ekrany desktopowe przy oknie ≥ 900 px i oryginalne < 900 px. Bez zapisu rutyn i bez sterowania.
- Logowanie i praca z centralą tylko za zgodą użytkownika (właściciela centrali). Centrala testowa autora jest dostępna tylko zdalnie.

Nie budować do `work/working/build/linux`, gdy aplikacja z niego działa.

### 11. Instalatory

```sh
$BW/work/working/linux/package-deb.sh      # .deb, wersja Debiana <ver>+port<n>, buduje w katalogu tymczasowym
$BW/work/working/mac/package-mac.sh        # .pkg arm64, wymaga xar, mkbom (bomutils), cpio, fakeroot
```
Wynik w `work/working/build/release`. Oba skrypty same budują aplikację od nowa (`package-deb.sh` w katalogu tymczasowym, `package-mac.sh` do `work/working/build/mac`), więc wcześniejszy build z kroku 10 nie jest potrzebny. Pole `Maintainer` w `.deb` ustawia zmienna `BW_MAINTAINER` (domyślnie neutralna nazwa projektu). Obie wersje brane z `work/working/VERSION`, więc najpierw krok 12.1.

### 12. Dokumentacja

1. `work/working/VERSION` = `<ver>-port.1`.
2. `CHANGELOG.md`: nagłówek `## [<ver>-port.1] - RRRR-MM-DD`, linia `Oryginał: BE WAVE Soft <ver> (Electron <ev>).`, `### Summary` z tym, co sprawdzono (uruchomione, tylko zbudowane, niesprawdzone), potem `Added`/`Changed`/`Fixed`/`Removed`/`Documentation`. Odnośnik na dole pliku.
3. `REJESTR-ZMIAN.md`: zmiana „Wersja bazowa wszystkich wpisów”, punkt „W <ver>” w każdym wpisie, którego kotwica albo kod się zmieniły, nowe numerowane wpisy dla potrzeb portu (jak 032, 033).
4. `PORT-<ver>-ANALIZA.md` z kroku 5.
5. `mod-recipes/`: aktualizacja przepisu, który trzeba było zaprojektować od nowa, i tabel w `README.md` dla nowych wpisów. Ten plik: nowe ustalenia i luki.

### 13. Commity

Na `main`, po angielsku, krótkie i tematyczne (wzór: `8ecc64a` narzędzia, `17ff108` kod, `26841d6` dokumentacja), prefiks `<ver>-port.<n>: …` dla zmian wydania, `docs: …` dla samej dokumentacji. Pliki dodawać po ścieżkach, nigdy `git add -A`. Bez `Co-Authored-By` i innych śladów AI. Na końcu znacznik `<ver>-port.1` przy kolejnym porcie (krok 3).

## Kontrola jakości przed wydaniem

- [ ] `deobfuscate.sh <ver>` i `regenerate.sh <ver>` zakończone kodem 0, `match-modules.mjs` podaje 0 nowych wpisów, `port-name-main.mjs` bez nieprzejrzanych `WARN`.
- [ ] Każdy plik z konfliktem scalenia rozwiązany, brak znaczników `<<<<<<<`, `|||||||`, `>>>>>>>` w `working/src` (`grep -rn '^<<<<<<<\|^>>>>>>>' work/working/src`).
- [ ] Każdy wpis rejestru 001–NNN sprawdzony według kotwic i „Sprawdzenia”; wpis z inną kotwicą ma punkt „W <ver>”.
- [ ] `working/app` bez binariów Windows z wpisu 008; `node-window-manager/dist` z wpisem 007.
- [ ] `linux/natives` i `mac/natives` zgodne z wersjami `realm` i `ffmpeg-static` nowego `package.json`; `file` pokazuje `ELF 64-bit … x86-64` i `Mach-O 64-bit arm64`.
- [ ] `kNodeTarget`/`kChromeTarget` zgodne z `process.versions` nowego Electrona.
- [ ] `BW_ORIGINAL_RESOURCES` obejmuje każdy plik, który proces główny czyta z `process.resourcesPath`.
- [ ] Nowe IPC i wywołania procesów nie omijają wpisów 002, 003, 004, 005, 006, 031, 039, 040 ani kontroli ścieżek kanałów `tsh-sd-*` (037).
- [ ] Build Linux kończy się `OK linux`, build macOS kodem 0, ostrzeżenia esbuilda tylko znane.
- [ ] Test dymny na osobnym profilu: start, baza, `realm.key` `0600`, blokada TSH, brak wyjątków, drogi ≥ 900 px i < 900 px.
- [ ] Nic nie uruchomiono na prawdziwym profilu użytkownika ani na centrali bez zgody; żadnego „Zapisz” w rutynie.
- [ ] `VERSION`, `CHANGELOG.md` (z `Summary`: co uruchomione, co tylko zbudowane), `REJESTR-ZMIAN.md`, `PORT-<ver>-ANALIZA.md` uzupełnione.
- [ ] Instalatory `.deb` i `.pkg` w `work/working/build/release`.
- [ ] Pliki tymczasowe w scratchpadzie i `/tmp` usunięte (kopie, próbne scalenia, rozpakowane paczki, `tools7z`), wolne miejsce sprawdzone.

## Znane luki

Nienaprawione z powodu ustalenia „port zmienia działanie najmniej, jak się da”. Każda wymaga osobnej decyzji użytkownika.

1. **macOS: Wi-Fi nadal przez `netsh`.** Wpis 006 zastępuje `netsh` przez `nmcli` tylko na Linuksie. Na macOS handlery Wi-Fi wołają `netsh wlan …` (`src/main/main.js`), który tam nie istnieje.
2. **Droga desktopowa zależy tylko od szerokości.** `isDesktopEditor()` sprawdza `window.innerWidth >= 900`, bez `isWeb`, choć projekt (`PROJEKT-RUTYNY.md`) mówi o obu warunkach (przepis 08, „Ryzyka”). Kilka komponentów przełącza się na żywo przy zmianie rozmiaru okna, wbrew zasadzie 4 z `README.md`.
3. **Tabela pomieszczenia dzieli filtry i zakładkę z tabelą wszystkich urządzeń** (wpisy 024, 030): ustawienie w jednej zmienia drugą.
4. **`CHANGELOG.md` 1.1.0-port.2 jest wewnętrznie sprzeczny co do list wyzwalaczy:** „Added” mówi o dwóch kolumnach, „Changed” o listach w jednej kolumnie (stan obecny: jedna kolumna, wpis 019). Wydanych wpisów nie przepisujemy.
5. **Nie da się teraz zbudować `1.1.0-port.3` dla macOS:** brak `electron-v41.6.1-darwin-arm64.zip` w `build/downloads/41.6.1` (jest tylko paczka Linux).
6. **Ekrany desktopowe 1.2.0 niesprawdzone po porcie:** logowanie, praca z centralą, rutyny, tabela obiektów, awarie, dziennik, panel boczny, pomieszczenia, schowek przez `ClipboardItem` (X11/Wayland, macOS); macOS tylko zbudowany (`CHANGELOG.md` 1.2.0-port.1 i 1.2.0-port.2, „Niesprawdzone”).
7. **Stan urządzeń nie jest w Realm od 1.2.0.** Schemat `schemaRoomsDevices` (`logic/HubMapping.js`) nie ma pola `state`; stany są tylko w strumieniu `deviceStatesSubject` (`logic/stageStructureStatesHub.js`, Map po `GetDeviceKey(key)`), czytane przez `fromCacheWithStates` (`hooks/useDerivedWithHubInfo.js`). Nasz kod czytający stan musi iść tą drogą (od wpisu 055 `useDeviceRows`, przepisy 19, 21, 24). Błąd daje tylko puste kolumny i martwe filtry, bez wyjątku: po każdym porcie sprawdź na centrali kolumny Sygnał, Zasilanie, Usterki, Stan i filtr „Naruszone”.

## Otwarte pytania

Brak otwartych pytań procedury na 2026-11-15. Pytanie o dwa pola szukania (lista rutyn i scen, dziennik zdarzeń) rozstrzygnięte 2026-11-13, patrz „Ustalenia”. Edytor ekranów TSH: wbudowany w `1.2.0-port.2` (035–037), przebudowany w [Unreleased] (044–054); niesprawdzone są zapis na prawdziwą klawiaturę, otwarcie edytora z ustawień klawiatury z centralą po przebudowie, macOS, dotyk, powiększenie strony ≠ 100 % i ciemny motyw (`PROJEKT-TSH-EDYTOR.md`, „Otwarte [P] po przebudowie”).

## Notatki autora (środowisko prywatne)

Ustalenia dotyczące maszyny autora i jego pracy z agentami AI. Dla innej osoby nie są wiążące.

| Notatka | Data | Źródło |
|---|---|---|
| Katalogi projektu leżą na udziale NFS i należą do uid 1024, więc git odmawia pracy („dubious ownership”). Autor używa `git -c safe.directory='*' -C <katalog> …` zamiast zmieniać globalną konfigurację. | 2026-11-13 | autor |
| Źródłem części ustaleń z tabeli „Ustalenia” była pamięć projektu agenta AI autora (poza repozytorium); każde z nich ma tu źródło w repozytorium. | 2026-11-15 | autor |
| Pracę wykonują subagenci, wątek główny koordynuje. Planowanie i analiza: effort `medium`, kodowanie: `low` albo `medium`. | 2026-11-13 | pamięć agenta autora |
| Pytania do użytkownika pojedynczo, jako lista opcji z rekomendacją. | 2026-10-30 | `CLAUDE.md` |
| Wolno czytać wszystkie logi aplikacji, także z danymi logowania. | 2026-10-30 | `CLAUDE.md` |
