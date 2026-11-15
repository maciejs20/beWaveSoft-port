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

Mod to jedna zmiana programu Satel. Mody **01–07** są niezbędne: bez nich program nie działa na Linuksie i macOS
albo działa źle. Mod **08** dodaje osobny widok na komputer (okno co najmniej 900 px szerokości); dopiero w nim działają
ulepszenia z modów 09–26 i edytor ekranów z modu 01. Mody 09–26 możesz wybrać według potrzeb. Kolumna „Wymaga” mówi,
które mody trzeba wziąć razem.

| Nr | Mod | Co to zmienia dla Ciebie | Wymaga |
|---|---|---|---|
| [01](mod-recipes/01-tsh-soft.md) | Edytor ekranów klawiatur dotykowych (**BETA**) | Ekrany klawiatur dotykowych INT-TSH2 i INT-TSG2 układa się w programie Satel TSH Soft, który działa tylko na Windows. Mod dodaje edytor tych ekranów do BE WAVE Soft: widzisz ekran klawiatury tak, jak będzie wyglądał, i myszą układasz na nim przyciski, napisy i ikony. Przygotowuje też zdjęcia na kartę pamięci klawiatury. | 07; edytor: 08 |
| [02](mod-recipes/02-aktualizacje.md) | Bez aktualizacji z serwera Satel | Satel udostępnia aktualizacje tylko dla Windows. Program nie próbuje ich pobierać ani instalować; nowe wersje portu instalujesz sam. | — |
| [03](mod-recipes/03-klucz-bazy-realm.md) | Dane programu nie znikają po restarcie | Na części Linuksów program po ponownym zalogowaniu do systemu nie umiał otworzyć swoich zapisanych danych i je kasował. Mod naprawia sposób przechowywania klucza do tych danych. | — |
| [04](mod-recipes/04-wifi-linux.md) | Wi-Fi przy konfiguracji centrali na Linuksie | Przy dodawaniu centrali program przełącza komputer na sieć Wi-Fi centrali. Oryginał robił to poleceniami Windows; mod robi to poleceniami Linuksa. Na macOS ta funkcja nadal nie działa. | — |
| [05](mod-recipes/05-zamykanie-aplikacji.md) | Poprawne zamykanie programu | Zamknięcie okna kończy program (na macOS wcześniej zostawał w Docku), a „Zakończ” nie pokazuje komunikatu o błędzie. | — |
| [06](mod-recipes/06-natywne-moduly-i-binaria.md) | Części programu dla Linuksa i macOS | Oryginał zawiera wbudowane składniki tylko dla Windows (m.in. bazę danych i obsługę wideo z kamer). Mod podmienia je na wersje dla Linuksa i macOS; bez tego program nie startuje. | — |
| [07](mod-recipes/07-budowanie-i-instalatory.md) | Budowanie programu i instalatora | Skrypty, które składają program i tworzą instalator dla Linuksa i macOS. Nowszy instalator aktualizuje program bez utraty danych. | 06 |
| [08](mod-recipes/08-droga-desktopowa.md) | Osobny widok na komputer | Program Satel jest projektowany pod telefon. Mod dodaje przełącznik: w szerokim oknie (co najmniej 900 px) działają ulepszenia z modów 09–26, w wąskim program wygląda i działa jak oryginał. | — |
| [09](mod-recipes/09-kroki-warunku-i-akcji-domyslne.md) | Lepsze wartości startowe w rutynach | Nowa akcja „Włącz/wyłącz” zaczyna od „Włącz”, a nowy warunek od „Stan wejścia”, czyli od tego, czego używa się najczęściej. Znika zbędny zielony komunikat. | 08 |
| [10](mod-recipes/10-podsumowanie-warunkow-i-akcji.md) | Pełny opis warunków i akcji rutyny | Zamiast „Okno Sypialnia +3” widać nazwy wszystkich urządzeń i to, czy warunek dotyczy dowolnego z nich, czy wszystkich naraz. | 08 |
| [11](mod-recipes/11-zamykanie-krokow-x-esc.md) | Zamknięcie okienka nie kasuje rutyny | Krzyżyk albo klawisz Esc w okienku warunku zamyka tylko to okienko. Wcześniej zamykał całą rutynę i niezapisane zmiany przepadały. | 08 |
| [12](mod-recipes/12-listy-wyzwalaczy-i-akcji.md) | Krótkie listy wyzwalaczy i akcji | Cała lista mieści się na ekranie bez przewijania, pozycje można wybierać klawiaturą. | 08, 09 |
| [13](mod-recipes/13-wybor-urzadzen.md) | Szybki wybór urządzeń | Przy wyborze urządzeń do rutyny pomieszczenia są zwinięte, wiersze mniejsze, a urządzenie można znaleźć, wpisując jego nazwę. | 08 |
| [14](mod-recipes/14-wartosci-w-miejscu.md) | Mniej okienek przy ustawianiu rutyny | Wartość warunku i opcję akcji wybierasz od razu na liście, bez otwierania kolejnego okienka. | 08 |
| [15](mod-recipes/15-jeden-ekran-z-panelem.md) | Rutyna na jednym ekranie | Rutyna jest widoczna cały czas, a warunek lub akcję edytujesz w panelu obok, zamiast w okienkach otwieranych jedno na drugim. | 08, 11, 12 |
| [16](mod-recipes/16-zapis-rutyny.md) | Bezpieczny zapis rutyny | Jeden przycisk „Zapisz”, który mówi, czego brakuje; zapis także klawiszami Ctrl+Enter. Błąd zapisu nie zamyka rutyny, a program pyta o niezapisane zmiany. | 08, 12, 15 |
| [17](mod-recipes/17-zwarty-ekran-rutyny.md) | Zwarty ekran rutyny | Mniejsze odstępy, więc cała rutyna mieści się na ekranie bez przewijania. | 08, 15 |
| [18](mod-recipes/18-lista-rutyn-tabela.md) | Lista rutyn i scen jako tabela | Zamiast dużych kafelków tabela, w której od razu widać, co każda rutyna sprawdza i co robi. | 08 |
| [19](mod-recipes/19-tabela-obiektow.md) | Tabela urządzeń | Wszystkie urządzenia w jednej tabeli z najważniejszymi danymi (np. typ wejścia, stan, sygnał), wejścia i wyjścia osobno, z wyszukiwaniem. Kliknięcie otwiera szczegóły. Tabela tylko pokazuje, niczym nie steruje. | 08 |
| [20](mod-recipes/20-potwierdzenie-sterowania.md) | Pytanie przed poleceniem dla wielu urządzeń | „Włącz wszystko” i podobne przyciski, które sterują wieloma urządzeniami naraz, najpierw pytają o potwierdzenie. Pojedyncze wyjście włączasz od razu. | 08 |
| [21](mod-recipes/21-tabela-awarii.md) | Tabela awarii | Aktywne awarie w zwartej tabeli, zamiast kilku dużych kart na ekran. | 08, 19 |
| [22](mod-recipes/22-dziennik-zdarzen.md) | Czytelny dziennik zdarzeń | Zdarzenia w wierszach tabeli, więc na ekranie widać ich dużo więcej, z wyszukiwaniem. | 08 |
| [23](mod-recipes/23-panel-boczny.md) | Uporządkowane menu ustawień | Menu ustawień obiektu po lewej ma zwijane sekcje, a „Usuń obiekt” jest oddzielone od reszty, żeby nie kliknąć go przypadkiem. | 08 (19 dla pozycji „Lista urządzeń”) |
| [24](mod-recipes/24-pomieszczenia.md) | Pomieszczenia | Mniejsze zdjęcia pomieszczeń na ekranie głównym i tabela urządzeń dla każdego pomieszczenia. | 08, 19 |
| [25](mod-recipes/25-grupy-panelu-bocznego.md) | Menu ustawień według zadań | Pozycje menu ułożone według tego, co się robi (konfiguracja, użytkownicy itd.), rzadko używane schowane. „Monitoring” jest w ekranie Integracja, „Mój profil” w ekranie Użytkownicy. | 08, 23 (19 dla „Listy urządzeń”) |
| [26](mod-recipes/26-sygnal-na-kafelkach.md) | Siła sygnału na kafelkach urządzeń | W widoku pomieszczenia każde urządzenie bezprzewodowe pokazuje siłę sygnału, a urządzenie bez łączności jest na czerwono. | 08 |

Pełny spis z numerami wpisów rejestru: [mod-recipes/README.md](mod-recipes/README.md). Historia zmian:
[CHANGELOG.md](CHANGELOG.md).

## Jak to wygląda

Zrzuty z działającej instalacji autora (numery seryjne modułów, typy obwodów, reakcje wejść i nazwa obiektu są
zakryte). Okno ma co najmniej 900 px szerokości, więc działa widok na komputer (mod 08).

**Ekran główny** z mniejszymi zdjęciami pomieszczeń i menu ustawień po lewej (mody 23, 24, 25):

![Ekran główny](docs/screenshots/24-ekran-glowny.png)

**Tabela urządzeń** z filtrami i wyszukiwaniem (mod 19):

![Tabela urządzeń](docs/screenshots/19-tabela-urzadzen.png)

**Pomieszczenie**: kafelki z siłą sygnału i przycisk „Tabela urządzeń” (mod 26), a po kliknięciu tabela urządzeń tego
pomieszczenia (mod 24):

![Kafelki z sygnałem](docs/screenshots/26-sygnal-na-kafelkach.png)

![Tabela pomieszczenia](docs/screenshots/24-tabela-pomieszczenia.png)

**Tabela awarii** (mod 21) i **dziennik zdarzeń** w wierszach z wyszukiwaniem (mod 22):

![Tabela awarii](docs/screenshots/21-tabela-awarii.png)

![Dziennik zdarzeń](docs/screenshots/22-dziennik-zdarzen.png)

**Menu ustawień** ze zwijanymi sekcjami (mody 23 i 25) i „Monitoring” przeniesiony do ekranu Integracja (mod 25):

<p>
<img src="docs/screenshots/23-panel-boczny.png" alt="Menu ustawień" width="32%">
<img src="docs/screenshots/23-panel-boczny-rozwiniety.png" alt="Menu ustawień rozwinięte" width="32%">
</p>

![Integracja z Monitoringiem](docs/screenshots/25-integracja-monitoring.png)

**Rutyny**: lista jako tabela (mod 18), edycja z pełnym opisem warunków i przełącznikiem Oraz/Lub (mody 10 i 17),
krótka lista wyzwalaczy ze skrótami Alt+1…5 (mod 12) i wybór urządzeń ze zwiniętymi pomieszczeniami i szukaniem, z
wartością wybieraną od razu (mody 13 i 14):

![Lista rutyn](docs/screenshots/18-lista-rutyn.png)

![Edycja rutyny](docs/screenshots/10-edycja-rutyny.png)

![Lista wyzwalaczy](docs/screenshots/12-lista-wyzwalaczy.png)

![Wybór urządzeń](docs/screenshots/13-wybor-urzadzen.png)

**Pytanie przed poleceniem dla wielu urządzeń** (mod 20):

![Potwierdzenie sterowania](docs/screenshots/20-potwierdzenie.png)

**Edytor ekranów klawiatur dotykowych** (mod 01, **BETA**): ekrany i warstwy po lewej, podgląd w środku, właściwości
po prawej; wybór ikon z siatki:

![Edytor ekranów](docs/screenshots/01-edytor-ekranow.png)

![Edytor: właściwości widżetu](docs/screenshots/01-edytor-widzet.png)

![Edytor: wybór ikon](docs/screenshots/01-edytor-ikony.png)

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

Wersja ma postać `<wersja Satel>-modX.Y`, np. `1.2.0-mod3.1`: oryginał Satel 1.2.0, X rośnie przy nowych funkcjach,
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
