# Praca z przepisami i agentem AI

Jak użyć przepisów z `mod-recipes/` razem z agentem programistycznym (Claude Code, Codex, Cursor itp.), żeby
odtworzyć nasze zmiany na własnej kopii BE WAVE Soft albo przenieść je na nowe wydanie Satel.

Repozytorium nie zawiera kodu Satel. Kod aplikacji odtwarzasz sam z instalatora Satel narzędziami z
`work/working/tools`, a agent nanosi na niego zmiany według przepisów. Gotowe instalatory są w wydaniach (Releases);
ta instrukcja jest dla tych, którzy chcą zbudować aplikację sami.

## Co jest czym

| Plik | Rola dla agenta |
|---|---|
| `mod-recipes/NN-*.md` | **Co** zmieniamy i **po co**: cel, zachowanie, punkty zaczepienia (stałe teksty z oryginału), implementacja, sprawdzenie, ryzyka. Główne wejście dla agenta. |
| `REJESTR-ZMIAN.md` | **Jak dokładnie** wyglądała zmiana w 1.2.0: pliki, kotwice, kod przed i po. Wzór, nie łatka do ślepego nałożenia. |
| `mod-recipes/PORTOWANIE.md` | Procedura przeniesienia na nowe wydanie i stałe ustalenia (decyzje, których agent nie zmienia). |
| `mod-recipes/README.md` | Spis przepisów, zależności między nimi, konwencja ścieżek, nazwy lokalne. |
| `work/working/src/**` (w tym repo) | Tylko **nasze nowe pliki** (`desktop/**`, `logic/Desktop*.js`, `main/linuxOverrides.js`, `main/tshSdCard.js`). Agent kopiuje je bez zmian. |
| `work/working/test/` | Testy jednostkowe naszych modułów: `npm --prefix work/working/tools test`. |
| `CHANGELOG.md` | Zmiany widoczne dla użytkownika, w każdym wydaniu z podziałem na sprawdzone i niesprawdzone. |

Zasada, którą agent musi znać: **kotwicz na stałym tekście, nie na nazwach.** Klucze i18n (`device.keypad_settings…`),
nazwy eksportów, kanały IPC i literały są stałe między wydaniami. Nazwy takie jak `module_2541.js`, `moduleNN`, `itemN`,
pojedyncze litery czy `xxx2` to lokalne nazwy z naszej deobfuskacji 1.2.0 i w innym wydaniu (albo bez przeniesienia nazw
z 1.1.0) są inne.

## Przygotowanie (raz)

Potrzebne: Linux albo macOS, Node 22, ok. 12 GB RAM (deobfuskacja), `git curl unzip python3 rsync`, do instalatorów
`dpkg-deb` (Linux) oraz `xar mkbom cpio fakeroot` (pakiet macOS; `mkbom` z bomutils).

1. Sklonuj repozytorium i ustaw zmienną na jego katalog: `BW=$PWD`.
2. Narzędzia: `npm ci --prefix "$BW/work/working/tools"`.
3. Instalator Satel (Windows, NSIS) z witryny Satel, np. `BE_WAVE_Soft_Configuration_Program_1.2.0_INT_17817.exe`,
   połóż w `$BW/installers-original/<ver>/`. Z niego pochodzi kod aplikacji i `TSH_soft.exe` (grafiki edytora TSH).
4. Rozpakowanie, paczki Electrona i moduły natywne: kroki 1–2 w [PORTOWANIE.md](PORTOWANIE.md) i przepis
   [06](06-natywne-moduly-i-binaria.md). Skrypty budowania same niczego nie pobierają: gdy brakuje paczki Electrona,
   wypisują dokładne polecenia `curl` i kończą się kodem 2.

## Scenariusz A: zbudować bieżący port (oryginał 1.2.0)

1. Deobfuskacja: `cd $BW/work/working/tools && ./deobfuscate.sh 1.2.0 && ./regenerate.sh 1.2.0`.
   `tools/versions/1.2.0/version.json` każe przenieść nazwy z drzewa 1.1.0 (`"namesFrom": "1.1.0"`). Bez instalatora
   1.1.0 ustaw tam `{}`: drzewo powstanie, pliki będą w tych samych ścieżkach, ale nazwy lokalne inne niż w
   `REJESTR-ZMIAN.md`. Przepisy kotwiczą na stałych tekstach, więc agent da radę, tylko z większą uwagą.
2. Złożenie źródła: `cp -an $BW/work/deobfuscated/1.2.0/named/. $BW/work/working/src/` (`-n` zostawia nasze pliki).
3. `work/working/app`: krok 7 z PORTOWANIE.md (`package.json` i `node_modules` z oryginału, bez binariów Windows).
4. Zmiany w plikach Satel nanosi agent, przepis po przepisie, w kolejności z sekcji „Kolejność” w
   [README.md](README.md). Prompt poniżej.
5. Build i test: `work/working/linux/build-linux.sh`, `work/working/mac/build-mac.sh`, testy jednostkowe,
   uruchomienie na osobnym profilu (krok 10 PORTOWANIE.md). Instalatory: krok 11.

Prompt dla agenta (jeden przepis na raz, nowa rozmowa albo czysty kontekst na każdy):

```text
Repozytorium: BE WAVE Soft port. Przeczytaj mod-recipes/AGENT.md, mod-recipes/README.md (konwencja ścieżek, nazwy
lokalne) i mod-recipes/PORTOWANIE.md, sekcja „Ustalenia”. Nanieś przepis mod-recipes/NN-nazwa.md na
work/working/src (oryginał 1.2.0, kod zdeobfuskowany).
- Szukaj miejsc po punktach zaczepienia z przepisu (klucze i18n, eksporty, literały), nie po nazwach modułów.
- Wpisy REJESTR-ZMIAN.md wymienione w przepisie traktuj jako wzór kodu przed i po; dopasuj nazwy lokalne.
- Nowe pliki wymienione w przepisie już są w work/working/src: nie pisz ich od nowa, tylko podłącz.
- Nie zmieniaj zachowania na telefonie i tablecie (droga desktopowa, przepis 08). Nie dodawaj warunków platformy
  poza wyjątkami opisanymi w przepisach.
- Na koniec wykonaj punkty „Sprawdzenie” z przepisu, uruchom `npm --prefix work/working/tools test` i zbuduj
  work/working/linux/build-linux.sh do katalogu tymczasowego. Raport: zmienione pliki, każda kotwica znaleziona lub
  nie, wynik testów, czego nie sprawdziłeś.
```

## Scenariusz B: przenieść port na nowe wydanie Satel

Pełna procedura to [PORTOWANIE.md](PORTOWANIE.md); agent prowadzi ją krok po kroku. Wymaga drzewa poprzedniego
wydania (`work/deobfuscated/<prev>/named`) jako bazy scalania trzystronnego, czyli najpierw scenariusza A dla
`<prev>`.

```text
Przeczytaj mod-recipes/AGENT.md i mod-recipes/PORTOWANIE.md. Przenieś port z <prev> na nowe wydanie Satel <ver>
(instalator w installers-original/<ver>/). Wykonuj kroki PORTOWANIE.md po kolei; po krokach 1, 4, 5 i 6 zatrzymaj się
i pokaż wynik. Analizę zapisz w PORT-<ver>-ANALIZA.md na wzór PORT-1.2.0-ANALIZA.md. Konflikt scalania rozstrzygaj
według przepisu i wpisu rejestru, który dotyczy pliku; gdy Satel dodał funkcję dublującą naszą, zostaw wersję Satel
i opisz to. Nie zmieniaj ustaleń z sekcji „Ustalenia”. Każdy przepis, którego kotwica zniknęła, zgłoś jako ryzyko.
```

Dobre praktyki przy nowym wydaniu:

- Najpierw sprawdź tylko kotwice: poproś agenta o tabelę „przepis → kotwica → znaleziona w pliku / brak” dla wszystkich
  przepisów, zanim cokolwiek zmieni. Brak kotwicy to sygnał, że Satel przebudował ekran, a przepis wymaga decyzji.
- Jeden przepis na commit; commit z numerem przepisu w tytule. Łatwo cofnąć i porównać.
- Testy jednostkowe naszych modułów muszą przejść bez zmian; czerwony test oznacza zmianę w API Satel, którego używa
  nasz moduł, a nie powód do poprawiania testu.
- Na końcu kontrola jakości z PORTOWANIE.md („Kontrola jakości przed wydaniem”) i wpis w `CHANGELOG.md`.

## Scenariusz C: nowy mod albo zmiana istniejącego

Zmiana nie jest skończona bez dokumentacji (tak samo dla ludzi i agentów):

1. Kod w `work/working/src`; nowe komponenty desktopu tylko pod przełącznikiem z przepisu 08, stare ekrany bez zmian.
2. Test jednostkowy dla nowej logiki w `work/working/test/unit/`.
3. Wpis w `REJESTR-ZMIAN.md` pod kolejnym numerem: pliki, kotwice z tekstu oryginału, kod przed i po, sprawdzenie.
4. Przepis `mod-recipes/NN-nazwa.md` (nowy albo uzupełniony) według struktury istniejących i wiersz w spisie oraz w
   tabeli wpisów w `mod-recipes/README.md`.
5. Wpis w `CHANGELOG.md` w sekcji `[Unreleased]`.

Prompt:

```text
Przeczytaj mod-recipes/AGENT.md (scenariusz C), mod-recipes/README.md i przepis 08. Chcę: <opis zmiany>.
Najpierw zaproponuj zachowanie i punkty zaczepienia w kodzie Satel (stałe teksty), potem zaimplementuj z testem,
a na końcu dopisz wpis REJESTR-ZMIAN.md, przepis w mod-recipes/ i CHANGELOG.md. Telefon i tablet bez zmian.
```

## Czego agent nie może zrobić sam

- Pobrać instalatora Satel ani zaakceptować jego licencji: robisz to Ty.
- Zalogować się do centrali: testy z centralą i kontem wykonujesz sam, agent dostaje tylko wynik lub logi.
- Uruchomić nowej wersji na Twoim prawdziwym profilu bez zgody: baza Realm migruje się przy starcie. Do testów
  `HOME` i `XDG_CONFIG_HOME` wskazują osobny katalog (krok 10 PORTOWANIE.md).
- Sprawdzić macOS na Linuksie: build `.app` i `.pkg` powstaje na Linuksie, ale uruchomić trzeba na Macu (arm64).
