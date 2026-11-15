# BE WAVE Soft dla Linuksa i macOS (port nieoficjalny)

Nieoficjalny port programu **BE WAVE Soft** firmy SATEL na **Linuksa (amd64)** i **macOS (Apple Silicon, arm64)**,
z usprawnieniami interfejsu na desktopie. Satel wydaje BE WAVE Soft tylko na Windows; ten projekt przenosi tę samą
aplikację (Electron) na inne systemy i opisuje każdą zmianę jako **przepis na mod**, który da się nanieść na kolejne
wydania Satel, także z pomocą agenta AI.

> Projekt nie jest związany z firmą SATEL sp. z o.o. ani przez nią wspierany. BE WAVE, INT-TSH2, INT-TSG2 i TSH Soft
> to znaki i oprogramowanie Satel. Program steruje systemem alarmowym i automatyką budynku: używasz go na własną
> odpowiedzialność, a każde wydanie wymienia, co zostało sprawdzone, a co nie.
>
> Kod powstał na własne potrzeby, jako „krzyk rozpaczy”: żeby interfejs BE WAVE na desktopie był choć trochę
> dostosowany do pracy instalatora systemu alarmowego, a nie tylko do sterowania inteligentnym domem. Nie gwarantujemy
> poprawności działania. Udostępniamy gotowe instalatory, ale zachęcamy, żeby zbudować aplikację samodzielnie z pomocą
> agenta AI, według przepisów z tego repozytorium ([mod-recipes/AGENT.md](mod-recipes/AGENT.md)): wtedy wiesz, co
> zostało zmienione, i możesz dopasować zmiany do siebie.

## Co zawiera port

Pełna lista w [CHANGELOG.md](CHANGELOG.md). W skrócie:

- **Działanie na Linuksie i macOS:** klucz bazy Realm bez systemowego magazynu sekretów, Wi-Fi przez `nmcli`, moduły
  natywne dla obu platform, wyłączone aktualizacje Satel (prowadzą do instalatora Windows), poprawne zamykanie.
- **TSH Soft zastąpiony wbudowanym edytorem ekranów** klawiatur INT-TSH2 i INT-TSG2: podgląd jak w TSH Soft,
  widżety, warstwy, cofanie, narzędzia karty microSD. Nie trzeba wine ani Windows.
- **Desktop (okno ≥ 900 px):** edytor rutyn na jednym ekranie z panelem, tabela obiektów i awarii, lista rutyn jako
  tabela, dziennik zdarzeń w wierszach, panel boczny z grupami, sygnał radiowy na kafelkach, sterowanie pojedynczym
  wyjściem bez okna potwierdzenia (polecenia grupowe nadal pytają).

## Instalacja z wydania (Releases)

Każde wydanie ma wersję `<wersja Satel>-port.<n>`, np. `1.2.0-port.2` = oryginał Satel 1.2.0, druga poprawka portu.

| Plik | System |
|---|---|
| `bewave-soft_<ver>+port<n>_amd64.deb` | Linux amd64: Debian 12+, Ubuntu 22.04+ i pochodne |
| `BE-WAVE-Soft-<ver>-port.<n>-arm64.pkg` | macOS na Apple Silicon (M1 i nowsze) |
| `SHA256SUMS.txt` | sumy kontrolne obu plików |

Sprawdzenie pobranych plików: `sha256sum -c SHA256SUMS.txt --ignore-missing` (macOS: `shasum -a 256 -c …`).

**Linux:**

```bash
sudo apt install ./bewave-soft_1.2.0+port2_amd64.deb
```

Program jest w menu jako „BE WAVE Soft” i jako polecenie `bewave-soft`. Dane: `~/.config/BE WAVE Soft/`
(logi w `logs/main.log`). Nowsza paczka aktualizuje program w miejscu, dane zostają. Usunięcie:
`sudo apt remove bewave-soft`.

**macOS:** pakiet nie jest podpisany certyfikatem Apple. Po pobraniu otwórz go prawym przyciskiem → „Otwórz”
(albo zezwól w Ustawieniach → Prywatność i ochrona). Instalator kopiuje aplikację do `/Applications` i podpisuje ją
lokalnie (ad hoc), bo macOS na arm64 nie uruchamia niepodpisanego kodu. Dane zostają w `~/Library` przy aktualizacji.

Pierwsze uruchomienie nowej wersji może zmienić format lokalnej bazy (Realm), więc powrót do starszej wersji nie jest
obsługiwany.

## Co publikujemy w wydaniu

Wydanie na GitHubie (zakładka Releases) zawiera:

1. **Binarne instalatory:** `.deb` dla Linuksa amd64 i `.pkg` dla macOS arm64, zbudowane z tego repozytorium i
   oryginału Satel tej samej wersji, plus `SHA256SUMS.txt`.
2. **Opis zmian:** sekcja danej wersji z [CHANGELOG.md](CHANGELOG.md) (skrypt `work/working/tools/release-notes.sh`):
   oryginał Satel i wersja Electrona, podsumowanie, **co sprawdzono, co tylko zbudowano, czego nie sprawdzono**, a potem
   Added / Changed / Fixed.
3. **Kod repozytorium w chwili wydania** (tag `<ver>-port.<n>`): przepisy, narzędzia, testy i nasze moduły. Bez kodu
   Satel.

Repozytorium **nie** zawiera kodu, grafik, czcionek ani instalatorów Satel. Instalatory w wydaniu zawierają
zmodyfikowaną aplikację Satel; kto chce zbudować ją sam, odtwarza kod z własnego instalatora Satel (niżej).

## Zawartość repozytorium

| Ścieżka | Co to jest |
|---|---|
| [mod-recipes/](mod-recipes/README.md) | **Przepisy na mody**: każda zmiana jako cel, zachowanie, punkty zaczepienia, implementacja, sprawdzenie, ryzyka |
| [mod-recipes/AGENT.md](mod-recipes/AGENT.md) | **Jak używać przepisów z agentem AI**: przygotowanie, gotowe prompty, scenariusze |
| [mod-recipes/PORTOWANIE.md](mod-recipes/PORTOWANIE.md) | Procedura przeniesienia portu na nowe wydanie Satel i stałe ustalenia |
| [REJESTR-ZMIAN.md](REJESTR-ZMIAN.md) | Dokładny kod każdej zmiany: pliki, kotwice z oryginału, kod przed i po, sprawdzenie (wpisy 001–058) |
| [CHANGELOG.md](CHANGELOG.md) | Zmiany widoczne dla użytkownika, wydanie po wydaniu |
| `PROJEKT-*.md`, `WYMAGANIA.md`, `PORT-1.2.0-ANALIZA.md`, `docs/plans/` | Projekty, wymagania, analiza portu 1.2.0, plany implementacji |
| [work/README.md](work/README.md) | Układ katalogów roboczych, wersje, build |
| `work/working/tools/` | Deobfuskacja (`deobfuscate.sh`, `regenerate.sh`), budowanie (`build-app.mjs`), narzędzia TSH, eksport i opis wydania |
| `work/working/linux/`, `work/working/mac/` | Skrypty budowania aplikacji i instalatorów |
| `work/working/src/` | Tylko nasze nowe moduły (desktop, edytor TSH, proces główny); reszta powstaje z instalatora Satel |
| `work/working/test/` | Testy jednostkowe naszych modułów |

## Budowanie samemu i praca z agentem AI

Instrukcja krok po kroku, z gotowymi promptami: **[mod-recipes/AGENT.md](mod-recipes/AGENT.md)**. W skrócie:

1. Wymagania: Linux albo macOS, Node 22, ok. 12 GB RAM, `git curl unzip python3 rsync`; do instalatorów `dpkg-deb`
   oraz `xar mkbom cpio fakeroot`.
2. `npm ci --prefix work/working/tools`, instalator Satel do `installers-original/<ver>/`, rozpakowanie i paczki
   Electrona według [PORTOWANIE.md](mod-recipes/PORTOWANIE.md) (kroki 1–2), moduły natywne według przepisu
   [06](mod-recipes/06-natywne-moduly-i-binaria.md).
3. `work/working/tools/deobfuscate.sh <ver>` i `regenerate.sh <ver>` odtwarzają nazwany kod aplikacji; składasz go z
   naszymi modułami w `work/working/src`.
4. Agent nanosi przepisy z `mod-recipes/` (jeden na raz, kotwice na stałych tekstach oryginału, wpisy rejestru jako
   wzór), uruchamia testy `npm --prefix work/working/tools test` i build.
5. `work/working/linux/build-linux.sh` / `work/working/mac/build-mac.sh` budują aplikację,
   `package-deb.sh` / `package-mac.sh` instalatory do `work/working/build/release/`.

## Wydanie nowej wersji (dla opiekuna)

1. Zmiany skończone: testy przechodzą, wpisy w `REJESTR-ZMIAN.md`, przepisy w `mod-recipes/`, sekcja w
   `CHANGELOG.md` z datą i podsumowaniem „sprawdzone / niesprawdzone”.
2. Wersja w `work/working/VERSION` (np. `1.2.0-port.3`), commit i tag `1.2.0-port.3` w repozytorium roboczym.
3. Instalatory (dane pakietu bez prywatnego e-maila; własny opis opiekuna przez `BW_MAINTAINER="Nazwa <adres>"`):
   ```bash
   work/working/linux/package-deb.sh && work/working/mac/package-mac.sh
   ```
4. Sumy kontrolne:
   ```bash
   (cd work/working/build/release && sha256sum bewave-soft_1.2.0+port3_amd64.deb BE-WAVE-Soft-1.2.0-port.3-arm64.pkg > SHA256SUMS.txt)
   ```
5. Eksport do repozytorium publicznego. Skrypt kopiuje tylko pliki z `work/working/tools/public-files.txt` i odrzuca
   eksport, gdy znajdzie dane osobowe z `~/.config/bewave-soft/leak-patterns` (wzorce trzymane poza repozytorium):
   ```bash
   BW_PUBLIC_AUTHOR="login <id+login@users.noreply.github.com>" work/working/tools/export-public.sh ../beWaveSoft-public --commit "1.2.0-port.3"
   ```
6. Tag i wydanie w repozytorium publicznym (opis z CHANGELOG):
   ```bash
   work/working/tools/release-notes.sh 1.2.0-port.3 > /tmp/notes.md
   ```
   ```bash
   cd ../beWaveSoft-public && git tag 1.2.0-port.3 && git push origin main --tags && gh release create 1.2.0-port.3 --title "BE WAVE Soft 1.2.0-port.3" --notes-file /tmp/notes.md ../beWaveSoft/work/working/build/release/{bewave-soft_1.2.0+port3_amd64.deb,BE-WAVE-Soft-1.2.0-port.3-arm64.pkg,SHA256SUMS.txt}
   ```

## Licencja

Pliki tego repozytorium (przepisy, dokumentacja, narzędzia, testy, nasze moduły): [MIT](LICENSE). Licencja nie
obejmuje oprogramowania, grafik, czcionek, dźwięków ani znaków firmy SATEL, także tych zawartych w instalatorach
wydań.
