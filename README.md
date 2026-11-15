# BE WAVE Soft dla Linuksa i macOS (port nieoficjalny)

Nieoficjalny port programu **BE WAVE Soft** firmy SATEL na **Linuksa (amd64)** i **macOS (Apple Silicon, arm64)**,
z usprawnieniami interfejsu na desktopie. Satel wydaje BE WAVE Soft tylko na Windows. To repozytorium nie zawiera
programu Satel: zawiera **przepisy na mody** i narzędzia, dzięki którym z oficjalnego instalatora Satel
**sam zbudujesz instalator dla Linuksa albo macOS**, z pomocą agenta AI.

> Projekt nie jest związany z firmą SATEL sp. z o.o. ani przez nią wspierany. BE WAVE, INT-TSH2, INT-TSG2 i TSH Soft
> to znaki i oprogramowanie Satel. Program steruje systemem alarmowym i automatyką budynku: używasz go na własną
> odpowiedzialność, a każde wydanie wymienia, co zostało sprawdzone, a co nie.
>
> Kod powstał na własne potrzeby, jako „krzyk rozpaczy”: żeby interfejs BE WAVE na desktopie był choć trochę
> dostosowany do pracy instalatora systemu alarmowego, a nie tylko do sterowania inteligentnym domem. Nie gwarantujemy
> poprawności działania.

> **Edytor ekranów klawiatur TSH (mod 01) to wersja BETA.** Autor go sprawdził i działa poprawnie, ale nie jest
> jeszcze dostatecznie przetestowany. Przed zapisem ekranów do klawiatury zrób kopię konfiguracji centrali.

## Dlaczego warto zbudować samemu

Gotowe instalatory są w zakładce Releases, ale **zachęcamy, żeby zbudować aplikację samodzielnie**:

- **Źródło jest znane.** To program do systemu alarmowego. Budujesz go z instalatora pobranego od Satel, a każda
  zmiana jest opisana w przepisie i w rejestrze. Nie musisz ufać cudzej binarce (ufasz agentowi, więc testuj).
- **Wybierasz mody.** Bierzesz tylko to, czego potrzebujesz, np. sam port na Linuksa bez zmian interfejsu.
- **Nie musisz czekać.** Gdy Satel wyda nową wersję, możesz przenieść mody sam tą samą metodą. To trudniejsze niż
  budowa 1.2.0 i agent częściej zapyta o decyzje.
- **Możesz dopisać własny mod** i opisać go tak samo, żeby dało się go odtworzyć w kolejnych wersjach.

Nie musisz umieć programować. Pracę wykonuje agent AI, który czyta przepisy z tego repozytorium. Ty przygotowujesz
komputer, pobierasz instalator Satel, uruchamiasz agenta, odpowiadasz na jego pytania i testujesz wynik.

## Jak to działa

```text
 instalator Satel (Windows, .exe)
        │  1. narzędzia z repozytorium rozpakowują go i odtwarzają czytelny kod aplikacji
        ▼
 kod aplikacji Satel  +  nasze nowe moduły (work/working/src)
        │  2. agent AI nanosi mody według przepisów z mod-recipes/
        ▼
 zmodyfikowana aplikacja
        │  3. skrypty budują ją z Electronem dla Linuksa i macOS
        ▼
 instalator .deb (Linux) / .pkg (macOS)
```

Każdy mod ma **przepis** (`mod-recipes/NN-*.md`): po co jest zmiana, jak ma działać, gdzie w kodzie Satel ją
zaczepić, jak ją wprowadzić, jak sprawdzić i co może pójść źle. Dokładny kod każdej zmiany jest w `REJESTR-ZMIAN.md`.
Agent łączy jedno z drugim, więc nie musi zgadywać.

## Mody

Mody **01–07 są podstawą portu**: bez nich aplikacja nie działa na Linuksie i macOS albo działa źle. Mod **08**
włącza osobną drogę dla desktopu (okno co najmniej 900 px), na której działają mody 09–26 i edytor ekranów z modu 01.
Mody 09–26 są opcjonalne; kolumna „Wymaga” mówi, które trzeba wziąć razem.

| Nr | Mod | Co daje | Wymaga |
|---|---|---|---|
| [01](mod-recipes/01-tsh-soft.md) | Edytor ekranów klawiatur zamiast TSH Soft (**BETA**) | TSH Soft działa tylko na Windows, więc jest wyłączony. Na desktopie wbudowany edytor ekranów INT-TSH2 i INT-TSG2: podgląd jak w TSH Soft, widżety, warstwy, cofanie, pliki na kartę microSD. | 07; edytor: 08 |
| [02](mod-recipes/02-aktualizacje.md) | Aktualizacje Satel wyłączone | Serwer Satel ma tylko instalatory Windows; program nie próbuje ich pobierać. | — |
| [03](mod-recipes/03-klucz-bazy-realm.md) | Klucz bazy bez magazynu sekretów | Lokalna baza nie znika po restarcie sesji na Linuksie (klucz w pliku z prawami `0600`). | — |
| [04](mod-recipes/04-wifi-linux.md) | Wi-Fi przez `nmcli` | Łączenie z siecią centrali przy konfiguracji działa na Linuksie (NetworkManager zamiast poleceń Windows). Na macOS ta funkcja nadal nie działa (znana luka). | — |
| [05](mod-recipes/05-zamykanie-aplikacji.md) | Zamykanie aplikacji | Zamknięcie okna kończy program także na macOS; „Zakończ” bez błędu. | — |
| [06](mod-recipes/06-natywne-moduly-i-binaria.md) | Moduły natywne | Baza Realm i ffmpeg w wersjach dla Linuksa i macOS zamiast Windows. | — |
| [07](mod-recipes/07-budowanie-i-instalatory.md) | Budowanie i instalatory | Budowanie aplikacji i paczek `.deb` / `.pkg`, aktualizacja bez utraty danych. | 06 |
| [08](mod-recipes/08-droga-desktopowa.md) | Droga desktopowa | Jeden przełącznik: nowe zachowanie tylko w szerokim oknie, w wąskim oryginał Satel. | — |
| [09](mod-recipes/09-kroki-warunku-i-akcji-domyslne.md) | Rozsądne wartości domyślne w rutynach | Nowa akcja zaczyna od „Włącz”, warunek od „Stan wejścia”, bez zbędnego komunikatu. | 08 |
| [10](mod-recipes/10-podsumowanie-warunkow-i-akcji.md) | Pełne podsumowanie rutyny | Karty warunków i akcji pokazują wszystkie urządzenia i operator (Lub/Oraz) zamiast „+3”. | 08 |
| [11](mod-recipes/11-zamykanie-krokow-x-esc.md) | X i Esc zamykają jeden krok | Zamknięcie okna warunku nie wyrzuca niezapisanej rutyny. | 08 |
| [12](mod-recipes/12-listy-wyzwalaczy-i-akcji.md) | Zwarte listy wyzwalaczy i akcji | Cała lista widoczna naraz, skróty klawiszowe, wybrana pozycja w widoku. | 08, 09 |
| [13](mod-recipes/13-wybor-urzadzen.md) | Wybór urządzeń z szukaniem | Zwinięte pomieszczenia, mniejsze wiersze, szukanie po nazwie. | 08 |
| [14](mod-recipes/14-wartosci-w-miejscu.md) | Wartości wybierane w miejscu | Wartość warunku i opcja akcji bez otwierania dodatkowego okna. | 08 |
| [15](mod-recipes/15-jeden-ekran-z-panelem.md) | Rutyna na jednym ekranie | Rutyna widoczna cały czas, warunek lub akcja w panelu obok zamiast stosu okien. | 08, 11, 12 |
| [16](mod-recipes/16-zapis-rutyny.md) | Bezpieczny zapis rutyny | Jeden przycisk zapisu, `Ctrl+Enter`, czytelny błąd bez utraty rutyny, krótki komunikat. | 08, 12, 15 |
| [17](mod-recipes/17-zwarty-ekran-rutyny.md) | Zwarty ekran rutyny | Cała rutyna mieści się na ekranie bez przewijania. | 08, 15 |
| [18](mod-recipes/18-lista-rutyn-tabela.md) | Lista rutyn i scen jako tabela | Widać warunki i akcje każdej rutyny zamiast dużych kafelków. | 08 |
| [19](mod-recipes/19-tabela-obiektow.md) | Tabela obiektów | Tabela urządzeń z kluczowymi parametrami, wejścia i wyjścia osobno, szukanie, przejście do szczegółów, pozycja „Lista urządzeń” w panelu; niczym nie steruje. | 08 |
| [20](mod-recipes/20-potwierdzenie-sterowania.md) | Potwierdzenie poleceń grupowych | „Włącz wszystko” i podobne pytają przed wysłaniem; pojedyncze wyjście steruje od razu. | 08 |
| [21](mod-recipes/21-tabela-awarii.md) | Tabela awarii | Aktywne awarie w zwartej tabeli zamiast dużych kart. | 08, 19 |
| [22](mod-recipes/22-dziennik-zdarzen.md) | Dziennik zdarzeń w wierszach | Dużo więcej zdarzeń na ekranie, szukanie. | 08 |
| [23](mod-recipes/23-panel-boczny.md) | Panel boczny ze zwijanymi sekcjami | Krótszy panel ustawień obiektu, „Usuń obiekt” oddzielone od reszty. | 08 (19 dla pozycji „Lista urządzeń”) |
| [24](mod-recipes/24-pomieszczenia.md) | Pomieszczenia | Małe zdjęcia pomieszczeń i tabela urządzeń pomieszczenia. | 08, 19 |
| [25](mod-recipes/25-grupy-panelu-bocznego.md) | Grupy panelu bocznego | Pozycje panelu pogrupowane według zadań, rzadko używane w zwiniętej grupie; „Monitoring” w Integracji, „Mój profil” w Użytkownikach. | 08, 23 (19 dla „Listy urządzeń”) |
| [26](mod-recipes/26-sygnal-na-kafelkach.md) | Sygnał na kafelkach | Siła sygnału urządzeń radiowych i brak łączności widoczne od razu w pomieszczeniu. | 08 |

Pełny spis z numerami wpisów rejestru: [mod-recipes/README.md](mod-recipes/README.md). Historia zmian:
[CHANGELOG.md](CHANGELOG.md).

## Zbuduj instalator krok po kroku

Opis dotyczy oryginału Satel **1.2.0**, na którym oparte są przepisy. Autor budował na Linuksie (Ubuntu/Debian) i tam
powstaje też paczka dla macOS. Budowania na Macu nie sprawdzano.

**Czas i koszt.** Przygotowanie komputera i odtworzenie kodu to krótka część pracy. Najdłużej trwa nanoszenie modów:
przy wszystkich 26 to wiele godzin pracy agenta w kilku sesjach. Kosztu autor nie mierzył; zależy od agenta i planu
(abonament ma limity zużycia, klucz API to opłata za zużycie). Na początek możesz wziąć samą podstawę 01–07.

### Krok 1. Przygotuj komputer

Potrzebujesz:

- **Linuksa amd64** (np. Ubuntu 24.04), **16 GB RAM** (odtwarzanie kodu zużywa ok. 12 GB) i ok. **10 GB** wolnego
  miejsca na dysku. Masz tylko Maca? Potrzebny jest komputer albo maszyna wirtualna z Linuksem amd64; część poleceń
  zakłada Linuksa;
- **Node.js 22**: zainstaluj [nvm](https://github.com/nvm-sh/nvm) według instrukcji na jego stronie (jedno polecenie
  `curl … | bash`), zamknij i otwórz terminal, potem `nvm install 22`. Sprawdzenie: `node --version` pokazuje `v22`;
- narzędzi systemowych:
  ```bash
  sudo apt install git curl unzip python3 rsync
  ```
- do paczki macOS dodatkowo `sudo apt install fakeroot cpio` oraz `xar` i `mkbom` (projekt bomutils), których zwykle
  nie ma w apt: agent zbuduje je ze źródeł, jeśli się zgodzisz. Możesz też zbudować tylko paczkę dla Linuksa.

### Krok 2. Zainstaluj agenta AI

Potrzebny jest agent, który pracuje w terminalu: czyta pliki, uruchamia polecenia i edytuje kod, np.
[Claude Code](https://code.claude.com/docs) (instalacja według dokumentacji, potem polecenie `claude`), z którym
powstał ten projekt. Inny agent, który sam czyta pliki i uruchamia polecenia w terminalu (np. Codex CLI), też powinien
sobie poradzić, ale autor go nie sprawdzał. Do pracy potrzebny jest abonament albo klucz API.

### Krok 3. Pobierz repozytorium

```bash
git clone https://github.com/maciejs20/beWaveSoft-port.git
```

```bash
cd beWaveSoft-port
```

### Krok 4. Pobierz instalator Satel

Ze strony [satel.pl](https://www.satel.pl) pobierz **BE WAVE Soft dla Windows w wersji 1.2.0**. Przepisy
sprawdzono na tym pliku:

- nazwa: `BE_WAVE_Soft_Configuration_Program_1.2.0_INT_17817.exe`, rozmiar 277 498 800 bajtów,
- SHA-256: `d1d96c69e534326e0bfa2ccdf8b7433b4da29b46261337fe7b6901766654f5f4` (sprawdzisz poleceniem
  `sha256sum <plik>`).

Połóż go w repozytorium w katalogu `installers-original/1.2.0/` (`mkdir -p installers-original/1.2.0`). Jeśli na
stronie jest już tylko nowsza wersja, zapytaj pomoc techniczną Satel o 1.2.0 albo idź drogą „nowsza wersja Satel”
(tabela „Gdy coś pójdzie nie tak”); to dużo trudniejsze.

Narzędzie rozpakowuje instalator bez uruchamiania go, więc okno licencji się nie pojawi. Z programu Satel korzystasz
na warunkach jego licencji; agent nie podejmuje tu decyzji za Ciebie. Z tego pliku pochodzi kod aplikacji i grafiki
edytora ekranów klawiatur.

### Krok 5. Uruchom agenta z poleceniem startowym

W katalogu repozytorium uruchom agenta (np. `claude`) i wklej:

```text
Chcę zbudować z tego repozytorium instalator BE WAVE Soft dla <Linuksa / macOS / obu>.
Przeczytaj README.md, mod-recipes/AGENT.md (scenariusz A), mod-recipes/README.md i mod-recipes/PORTOWANIE.md.
Instalator Satel 1.2.0 jest w installers-original/1.2.0/. Mody: <wszystkie / tylko podstawa 01–07 /
podstawa i wybrane: 08, 19, …>.
Pracuj etapami i zatrzymaj się po każdym, pokazując wynik:
1. przygotowanie narzędzi i rozpakowanie instalatora,
2. pobranie Electrona i modułów natywnych (zapytaj mnie przed pobraniem czegokolwiek),
3. odtworzenie kodu aplikacji i złożenie work/working/src,
4. nanoszenie modów, jeden przepis na raz, w kolejności z mod-recipes/README.md („Kolejność”), z testami i
   commitem po każdym,
5. build i uruchomienie na osobnym profilu testowym,
6. zbudowanie instalatora.
Nie uruchamiaj programu na moim prawdziwym profilu. Gdy kotwica z przepisu nie pasuje do kodu, zatrzymaj się
i opisz, co znalazłeś.
```

Agent będzie pytał o zgodę na polecenia i pobieranie plików. Czytaj, co chce zrobić, zanim się zgodzisz:

- spokojnie zgadzaj się na polecenia w katalogu repozytorium (`npm`, `node`, skrypty `.sh`, `git`);
- uważaj na `sudo`, usuwanie plików poza repozytorium i uruchamianie `bewave-soft` bez osobnego katalogu `HOME`;
- pobieranie tylko z github.com (Electron, ffmpeg) i npmjs.com (Realm, 7-Zip).

Gdy sesja się skończy albo agent zgubi wątek, zacznij nową i wklej:

```text
Kontynuuj budowę instalatora BE WAVE Soft z tego repozytorium. Przeczytaj README.md i mod-recipes/AGENT.md,
sprawdź git log i git status, powiedz, na którym etapie jesteśmy i które mody są już naniesione, i czekaj na
moją zgodę.
```

Dlatego każdy etap i każdy mod niech kończy się commitem.

### Krok 6. Co agent robi po kolei

Żeby wiedzieć, czego się spodziewać i co sprawdzać na każdym etapie:

1. **Narzędzia i rozpakowanie** (`npm ci`, 7-Zip): instalator trafia do `work/original/1.2.0/win-build/`, a
   rozpakowany `app.asar` do `work/original/1.2.0/app/`.
2. **Electron i moduły natywne:** pobiera Electron 44.9.3 dla Linuksa i macOS oraz bazę Realm i ffmpeg dla obu
   systemów (przepis 06). Skrypty budowania same niczego nie pobierają; gdy czegoś brakuje, wypisują dokładne polecenie.
3. **Odtworzenie kodu:** `deobfuscate.sh 1.2.0` i `regenerate.sh 1.2.0` zamieniają zminifikowany kod Satel w
   czytelne pliki. Ten krok zużywa najwięcej pamięci i trwa kilka minut. Plik `tools/versions/1.2.0/version.json`
   każe przejąć nazwy z wersji 1.1.0; bez instalatora 1.1.0 `regenerate.sh` zatrzyma się z błędem `carry-names`, a
   agent ustawia wtedy w tym pliku `{}`. Pliki są w tych samych ścieżkach, ale nazwy zmiennych inne niż w rejestrze,
   więc agent dopasowuje kod po stałych tekstach i potrzebuje więcej czasu (tej drogi autor nie przeszedł do końca).
   Potem agent kopiuje kod do `work/working/src`, gdzie są już nasze nowe moduły, i składa `work/working/app`
   (`package.json` i `node_modules` z oryginału, bez binariów Windows: krok 7 w PORTOWANIE.md).
4. **Mody:** jeden przepis na raz. Agent szuka miejsc po tekstach z przepisu, wprowadza zmianę, wykonuje punkty
   „Sprawdzenie” i testy `npm --prefix work/working/tools test`. Najlepiej, żeby każdy mod był osobnym commitem: łatwo
   wtedy cofnąć jeden z nich.
5. **Build i test:** `work/working/linux/build-linux.sh` buduje aplikację; agent uruchamia ją z osobnym katalogiem
   domowym (`HOME`, `XDG_CONFIG_HOME`), żeby nie ruszać Twoich danych. Agent sprawdzi tylko to, co da się bez
   centrali; logowanie i pracę z centralą robisz Ty. Sprawdź po kolei: program startuje, logowanie, połączenie z
   centralą, lista urządzeń, przy szerokim oknie (≥ 900 px) nowe ekrany, przy wąskim oryginalne. Nie zapisuj rutyn i
   nie steruj wyjściami na działającym systemie alarmowym; jeśli musisz, użyj nieszkodliwego wyjścia i najpierw zrób
   kopię konfiguracji centrali.
6. **Instalator:** `work/working/linux/package-deb.sh` i `work/working/mac/package-mac.sh`. Wynik w
   `work/working/build/release/`.

### Krok 7. Zainstaluj i sprawdź

- **Linux:** `sudo apt install ./work/working/build/release/bewave-soft_*_amd64.deb` (gdy plików jest kilka, wpisz pełną
  nazwę najnowszego). Program jest w menu jako
  „BE WAVE Soft” i jako polecenie `bewave-soft`. Dane: `~/.config/BE WAVE Soft/`, logi w `logs/main.log`.
- **macOS:** skopiuj `BE-WAVE-Soft-<wersja>-arm64.pkg` na Maca i otwórz go. Pakiet nie jest podpisany certyfikatem
  Apple: gdy macOS go zablokuje, wejdź w Ustawienia systemowe → Prywatność i ochrona i kliknij „Otwórz mimo to” (na
  starszych macOS: prawy przycisk → „Otwórz”). Instalator kopiuje aplikację do `/Applications` i podpisuje ją lokalnie, bo macOS na
  arm64 nie uruchamia niepodpisanego kodu.

Pierwsze uruchomienie nowej wersji może zmienić format lokalnej bazy, więc powrót do starszej wersji nie jest
obsługiwany.

### Gdy coś pójdzie nie tak

| Problem | Co zrobić |
|---|---|
| Odtwarzanie kodu przerywa się z braku pamięci | Zamknij inne programy albo dodaj pamięć wymiany (swap); potrzeba ok. 12 GB. |
| Agent nie znajduje miejsca z przepisu | Poproś o tabelę „przepis → tekst do znalezienia → plik albo brak”. Brak oznacza, że Satel zmienił ekran; zdecyduj, czy mod pominąć. |
| Test jednostkowy nie przechodzi | Testy przechodzą dopiero po złożeniu `work/working/src` (krok 3), a testy edytora TSH po naniesieniu modu 01. Jeśli test nie przechodzi później, nie pozwól agentowi zmieniać testu: niech porówna swoją zmianę z wpisem w `REJESTR-ZMIAN.md`. |
| Satel wydał nowszą wersję niż 1.2.0 | To scenariusz B w [mod-recipes/AGENT.md](mod-recipes/AGENT.md) i procedura [PORTOWANIE.md](mod-recipes/PORTOWANIE.md): najpierw zbuduj 1.2.0, potem przenieś mody. |
| Agent chce uruchomić program na Twoim profilu | Odmów; testy tylko z osobnym `HOME` (baza migruje się przy starcie). |
| Program nie startuje po instalacji | Uruchom `bewave-soft` z terminala i pokaż agentowi komunikat oraz `~/.config/BE WAVE Soft/logs/main.log`. |

Więcej o pracy z agentem, gotowe prompty dla nowych wersji Satel i dla własnych modów:
**[mod-recipes/AGENT.md](mod-recipes/AGENT.md)**.

## Gotowe instalatory (Releases)

Jeśli nie możesz zbudować sam, w zakładce Releases są instalatory zbudowane przez autora z tych samych przepisów,
z wszystkimi modami:

| Plik | System |
|---|---|
| `bewave-soft_<wersja Satel>+modX.Y_amd64.deb` | Linux amd64: Debian 12+, Ubuntu 22.04+ i pochodne |
| `BE-WAVE-Soft-<wersja Satel>-modX.Y-arm64.pkg` | macOS na Apple Silicon (M1 i nowsze) |
| `SHA256SUMS.txt` | sumy kontrolne; sprawdzenie: `sha256sum -c SHA256SUMS.txt --ignore-missing` |

Wersja ma postać `<wersja Satel>-modX.Y`, np. `1.2.0-mod3.0`: oryginał Satel 1.2.0, X rośnie przy nowych funkcjach,
Y przy poprawkach. Starsze wydania nazywały się `<wersja Satel>-port.N` (ostatnie `1.2.0-port.2`). Opis wydania to
sekcja tej wersji z [CHANGELOG.md](CHANGELOG.md): oryginał Satel, wersja Electrona, co sprawdzono, co tylko zbudowano
i czego nie sprawdzono. Instalacja jak w kroku 7; przy `.pkg` z wydania obowiązuje to samo ostrzeżenie macOS.

## Zawartość repozytorium

| Ścieżka | Co to jest |
|---|---|
| [mod-recipes/](mod-recipes/README.md) | Przepisy na mody: cel, zachowanie, punkty zaczepienia, implementacja, sprawdzenie, ryzyka |
| [mod-recipes/AGENT.md](mod-recipes/AGENT.md) | Praca z agentem AI: scenariusze i gotowe prompty |
| [mod-recipes/PORTOWANIE.md](mod-recipes/PORTOWANIE.md) | Przeniesienie portu na nowe wydanie Satel i stałe ustalenia |
| [REJESTR-ZMIAN.md](REJESTR-ZMIAN.md) | Dokładny kod każdej zmiany: pliki, kotwice, kod przed i po, sprawdzenie |
| [CHANGELOG.md](CHANGELOG.md) | Zmiany widoczne dla użytkownika, wydanie po wydaniu |
| `PROJEKT-*.md`, `WYMAGANIA.md`, `PORT-1.2.0-ANALIZA.md`, `docs/plans/` | Projekty, wymagania, analiza portu 1.2.0, plany implementacji |
| [work/README.md](work/README.md) | Układ katalogów roboczych, wersje, build |
| `work/working/tools/` | Odtwarzanie kodu (`deobfuscate.sh`, `regenerate.sh`), budowanie (`build-app.mjs`), narzędzia edytora TSH |
| `work/working/linux/`, `work/working/mac/` | Skrypty budowania aplikacji i instalatorów |
| `work/working/src/` | Tylko nasze nowe moduły; resztę kodu odtwarzasz z instalatora Satel |
| `work/working/test/` | Testy jednostkowe naszych modułów |
| [docs/WYDAWANIE.md](docs/WYDAWANIE.md) | Wydawanie nowej wersji (dla opiekuna repozytorium) |

## Licencja

Pliki tego repozytorium (przepisy, dokumentacja, narzędzia, testy, nasze moduły): [MIT](LICENSE). Licencja nie
obejmuje oprogramowania, grafik, czcionek, dźwięków ani znaków firmy SATEL, także tych zawartych w instalatorach
wydań.
