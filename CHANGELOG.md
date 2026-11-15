# Changelog

Format oparty na [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Wersje mają postać `<wersja oryginału>-mod<X>.<Y>`: X rośnie przy nowych funkcjach, Y przy poprawkach (od 1.2.0-mod3.0; wcześniej `<wersja oryginału>-port.<n>`). Oryginał to BE WAVE Soft firmy Satel, a port obejmuje macOS i Linuksa.

## [Unreleased]

## [1.2.0-mod3.1] - 2026-11-15

Oryginał: BE WAVE Soft 1.2.0 (Electron 44.9.3).

Nowy schemat wersji: `<wersja oryginału>-mod<X>.<Y>` (X nowe funkcje, Y poprawki), zamiast `-port.<n>`. Numeracja zaczyna się od 1.2.0-mod3.0; wersja 1.2.0-port.3 nigdy nie została wydana, a 1.2.0-mod3.0 nie został wydany (build testowy).

### Summary
- Przebudowa edytora ekranów klawiatury TSH (REJESTR-ZMIAN 044–054): rozmiary i rysowanie jak w TSH Soft, układ na całe okno z paskiem narzędzi i powiększeniem, ekrany z miniaturami i warstwy, inspektor z wyborem ikon i menu „+ Widżet”, cofanie i skróty, poprawki z przeglądu (wciśnięcie poza podglądem, Esc przy pytaniach, skróty w trakcie pytania i przeciągania).
- Sprawdzone: testy jednostkowe (339, wszystkie przechodzą; przed przebudową 199; pokrycie zmienionych modułów 94–100 % linii), zbudowany renderer w harnessie na osobnym profilu przez CDP (układ przy 1000×800, 1440×900, 1920×1080, 1000×600, 980×700 i DPR 2, pasek narzędzi, listy, inspektor, przeciąganie i trafianie, historia, miniatury), porównanie z zrzutami TSH Soft (76 z 112 obszarów zgodnych co do piksela, reszta o 1–2 px przez inne rysowanie glifów). Zmiany w `work/working/src` obejmują tylko `desktop/tshEditor/*` i teksty i18n, więc telefon, tablet i okno < 900 px (bez przycisku „Edytuj ekrany”) nie zmieniły się.
- Sprawdzone przez autora na macOS z centralą (instalator `.pkg` 1.2.0-mod3.1): edytor ekranów TSH otwarty z ustawień klawiatury, edycja i zapis na klawiaturę działają poprawnie; tabela urządzeń (kolumny Moduł, Obwód, Stan, Usterki, Sposób działania, szerokości kolumn, filtr typów, X wraca do tabeli), panel boczny z „Awarie: N” i grupą „Pozostałe”, wersja 1.2.0-mod3.1 na ekranie startowym i w panelu, plakietka BETA.
- Niesprawdzone: Linux z centralą (Linux tylko bez centrali: start bez błędów), skróty Ctrl/Cmd+= − 0 wobec menu „View” Electrona, dotyk, powiększenie strony ≠ 100 %, ciemny motyw. Edytor TSH zostaje w wersji BETA: sprawdzony przez autora, ale nie jest jeszcze dostatecznie przetestowany na różnych klawiaturach i konfiguracjach.

### Added
- Pełna wersja moda w aplikacji: ekran powitalny i etykieta wersji (dół panelu bocznego, ekrany bez połączenia z centralą) pokazują np. `1.2.0-mod3.1` zamiast `1.2.0`. Wersję wstrzykuje build (`work/working/VERSION` albo `BEWAVE_VERSION`); wersja aplikacji używana przez logikę Satel (API, migracje, aktualizacje) zostaje `1.2.0` (REJESTR-ZMIAN 063).
- Repozytorium do publikacji: `README.md` (instalacja, zawartość wydań, budowanie, wydawanie), licencja MIT dla naszych plików, `mod-recipes/AGENT.md` (praca z przepisami i agentem AI, gotowe prompty), `work/working/tools/export-public.sh` (eksport bez kodu Satel do osobnego repozytorium, odrzuca eksport z danymi osobowymi) i `release-notes.sh` (opis wydania z CHANGELOG). Przepisy w `mod-recipes/` uaktualnione do stanu 1.2.0-port.2 i wpisów 001–058.
- Edytor ekranów klawiatury TSH: cofanie i ponawianie zmian (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z i Ctrl/Cmd+Y, do 100 kroków; wpisywanie w jedno pole i przytrzymana strzałka to jeden krok), Delete i Backspace usuwają zaznaczony widżet po pytaniu, Tab i Shift+Tab przechodzą po widżetach, G włącza i wyłącza siatkę edytora (przyciąganie, niezapisywana). Klawisze wpisywane w polach formularza zostają w polu. Cofnięcie do stanu z wczytania kasuje pytanie o niezapisane zmiany. Telefon, tablet i wąskie okno bez zmian.
- Tabela obiektów (desktop): kolumny „Moduł” (typ i numer seryjny modułu, dla wejść płyty głównej „Centrala”, w podpowiedzi ogólna nazwa typu) i „Wartość” (rezystancja wejścia w Ω), wiersz chipów filtru typów urządzeń (wybór kilku naraz, „Wszystkie typy”; ukryty, gdy w zakładce jest jeden typ), szukanie także po module. Telefon, tablet i wąskie okno bez zmian (REJESTR-ZMIAN 056).
- Tabela obiektów (desktop): szerokość kolumn dopasowana do najdłuższego tekstu w zakładce (40–320 px, ostatnia kolumna wypełnia resztę, bez skakania przy szukaniu); szerokość można zmienić, przeciągając krawędź nagłówka (dwuklik przywraca automatyczną), zapamiętana osobno dla każdej zakładki; gdy kolumny się nie mieszczą, tabela przewija się w poziomie. Telefon, tablet i wąskie okno bez zmian (REJESTR-ZMIAN 060).

### Changed
- **Edytor ekranów klawiatury TSH jest w wersji BETA.** Działa poprawnie w sprawdzonych przypadkach, ale nie jest jeszcze dostatecznie przetestowany (autor sprawdził edycję i zapis na klawiaturę na macOS; brak testów na wielu klawiaturach i konfiguracjach, w ciemnym motywie i na Linuksie z centralą). Przed zapisem ekranów zrób kopię konfiguracji klawiatury. Aplikacja pokazuje to pomarańczową plakietką „BETA” na początku paska narzędzi edytora (podpowiedź o kopii konfiguracji) i dopiskiem „(BETA)” na przycisku „Edytuj ekrany”. Telefon, tablet i wąskie okno bez zmian (REJESTR-ZMIAN 062).
- Wersje i instalatory: schemat `<wersja oryginału>-mod<X>.<Y>` (`work/working/VERSION` = `1.2.0-mod3.1`). Paczka `.deb` ma wersję `1:1.2.0+mod3.1` (epoka 1, bo bez niej dpkg uznałby `1.2.0+mod3.1` za starszą od wydanej `1.2.0+port2`), plik `bewave-soft_1.2.0+mod3.1_amd64.deb`; `.pkg` ma wersję `1.2.0.3.1` (wyższą od wydanej `1.2.0.2`), plik `BE-WAVE-Soft-1.2.0-mod3.1-arm64.pkg`. `package-deb.sh` i `package-mac.sh` odmawiają nadpisania istniejącego pliku w `build/release`: każdy build dostaje nową nazwę. Stare wersje `-port.<n>` są nadal przyjmowane.
- Linux: pole `Maintainer` paczki `.deb` ma neutralną nazwę projektu zamiast prywatnego adresu; własną ustawia zmienna `BW_MAINTAINER`.
- Edytor ekranów klawiatury TSH: układ na całe okno. Nad trzema panelami pasek narzędzi (cofnij/ponów, siatka edytora, powiększenie z menu „Dopasuj / 50–400 %”, „Karta SD”, licznik danych z paskiem, lista skrótów „?”, „Anuluj” i „Zapisz” z plakietką błędów, która po kliknięciu zaznacza wskazany ekran lub widżet); po lewej ekrany, w środku podgląd na całą wolną przestrzeń w proporcjach klawiatury (Ctrl/Cmd+kółko powiększa wokół kursora, Ctrl/Cmd+0, 1, =, − ustawiają powiększenie), po prawej właściwości. Każdy panel przewija się osobno, strona nie; nie ma już dużego przycisku „Zapisz” w stopce. Wiersz stanu pod podglądem: kursor, położenie i rozmiar zaznaczonego widżetu, siatka, powiększenie. Edytor startuje na ekranie głównym. Esc przerywający przeciąganie lub odznaczający widżet nie zamyka edytora. Telefon, tablet i wąskie okno bez zmian.
- Edytor ekranów klawiatury TSH: lewy panel z ekranami i warstwami. Ekrany mają miniatury, grupy „Ekrany użytkownika n/16” i „Ekrany dodatkowe”, plakietki „główny” i „własne kolory”, a ekran o nazwie z samych spacji ma tytuł „Ekran 1 (bez nazwy)” zamiast pustego wiersza. Warstwy pokazują widżety pokazanego ekranu z ikoną i treścią („„Brama””, nazwa urządzenia, scena, tryb czuwania, „Prostokąt 476×38”) zamiast „Tekst · 8, 240”; klik zaznacza widżet na podglądzie i odwrotnie, menu wiersza przenosi widżet na wierzch, do przodu, do tyłu, na spód albo usuwa (z pytaniem). Telefon, tablet i wąskie okno bez zmian.
- Edytor ekranów klawiatury TSH: panel właściwości z zakładkami „Ekran” i „Widżet” (przełączają się z zaznaczeniem), zwijanymi sekcjami (Ogólne, Wygląd, Tło; Położenie i wielkość, Treść i urządzenie, Ikony, Kolory, Zachowanie), własnym przewijaniem i przyciskiem „Usuń widżet” na dole; wielkość widżetu przełącznikiem M/Ś/D. Ikony wybiera się z siatki glifów (najpierw ikony użyte w układzie, potem wszystkie, które rysuje klawiatura; strzałki, Enter, Esc), pole pokazuje glif zamiast kodu `0x11d`. Menu „+ Widżet” w pasku narzędzi i w warstwach: 21 typów w sześciu grupach z ikonami; nowy widżet trafia na środek widocznej części podglądu i jest od razu zaznaczony. Opcja ekranu „Pokaż siatkę” nazywa się teraz „Siatka na klawiaturze”. Telefon, tablet i wąskie okno bez zmian.
- Tabela obiektów (desktop): pole szukania w osobnym wierszu tuż nad tabelą, większe, z przyciskiem × czyszczącym tekst; przełącznik widoku na prawym końcu pierwszego wiersza; kolumny puste w całej zakładce nie są pokazywane. X i Esc w szczegółach urządzenia otwartych z tabeli obiektów albo tabeli awarii wracają do tej tabeli zamiast na ekran główny. Telefon, tablet i wąskie okno bez zmian (REJESTR-ZMIAN 056, 057).
- Panel boczny (desktop): „Podsumowanie” = Lista obiektów, Dziennik zdarzeń i nowa pozycja „Awarie: N” (wyróżniona przy awariach, przy zwiniętej grupie „⚠ N” w nagłówku; pomarańczowy pasek awarii nad panelem ukryty, na ekranie głównym bez zmian); „Konfiguracja” = Integracja, Harmonogramy, Symulacja obecności, Diagnostyka; nowa grupa „Pozostałe” (domyślnie zwinięta) = zagnieżdżony „Obiekt” (Ustawienia obiektu, Edytuj obiekt, Usuń obiekt z czerwoną ikoną), Dane instalatora, Klucz tokenów SATEL, Użytkownicy, Ustawienia e-mail i nowe nieznane pozycje na końcu. Grupa „Ustawienia” znika. Większe ikony strzałek w nagłówkach grup. Telefon, tablet i wąskie okno bez zmian (REJESTR-ZMIAN 058).
- Tabela obiektów (desktop): kolumna „Moduł” zaraz za „Pomieszczeniem” w każdej zakładce i przy każdej szerokości okna (wcześniej w wąskim oknie nie było jej na Wejściach i Wyjściach); „Sposób działania” także w wąskim oknie na Wyjściach; angielski nagłówek „Reaction” tej kolumny to teraz „Operating mode” (REJESTR-ZMIAN 059).
- Panel boczny (desktop): pozycja „Lista obiektów” nazywa się „Lista urządzeń” („Device list”) (REJESTR-ZMIAN 061).

### Fixed
- Edytor ekranów klawiatury TSH: rozmiary czcionek i ikon jak w TSH Soft, także dla INT-TSG2 (tabela rozmiarów odczytana z TSH Soft zamiast połowy TSH2: na TSG2 duża ikona 84 px zamiast 114, mały tekst 12 px zamiast 9; TSH2 średni tekst 33 px, ikony 77/115/180 px). Pasek stanu, kropki stron, siatka i zegar wygaszacza w położeniach z kodu TSH; tekst widżetu nie jest już o kilka pikseli za nisko. Telefon, tablet i wąskie okno bez zmian.
- Edytor ekranów klawiatury TSH: podgląd rysuje jak TSH Soft: duży tekst cienką odmianą Roboto (Thin), tekst o piksel w prawo od ramki, wyrównanie do prawej i do środka tylko dla tekstów, ikony spoza zestawu klawiatury jako znak zastępczy, wskaźniki stanu złożone z glifów TSH (biały kwadrat z zieloną kłódką i pierścieniem, czarny znacznik, czerwony z pierścieniem), obramowanie prostokąta na krawędzi, ikony paska stanu na każdym ekranie INT-TSH2 i nigdy na INT-TSG2, kropki stron glifami TSH, zegar wygaszacza z dwukropkiem połowy wielkości i sekundami w miejscu z TSH (wcześniej o ok. 22 % za duży i przesunięty). Telefon, tablet i wąskie okno bez zmian.
- Edytor ekranów klawiatury TSH: data w widżecie Data/czas formatowana jak w TSH Soft: tokeny Delphi bez względu na wielkość liter (`dddd` dzień tygodnia, `d` dzień bez zera, `MMMM` nazwa miesiąca, `nn` minuty, literały w cudzysłowach, `dddddd`, `ddddd`, `t`, `tt`, `c`), małe `m` zawsze jako minuty jak w TSH, nazwy po polsku albo angielsku według języka klawiatury, polski miesiąc w dopełniaczu („14 listopada”). Wcześniej `dddd, d MMMM yyyy` dawało „1414, d 1111 2026”. Telefon, tablet i wąskie okno bez zmian.
- Edytor ekranów klawiatury TSH: kliknięcie widżetu nie przesuwa go (przeciąganie zaczyna się dopiero po 4 px ruchu myszy, wcześniej drganie myszy przesuwało widżet, a duży przycisk przy dolnej krawędzi INT-TSG2 skakał o kilkadziesiąt pikseli w górę); przyciąganie tylko przy przeciąganiu z włączoną siatką, do pól, krawędzi i środka ekranu, Alt je wstrzymuje; kliknięcie wewnątrz prostokąta-ramki zaznacza widżet pod nim (Alt+klik przechodzi po kolejnych widżetach pod kursorem); Esc przerywa przeciąganie; widżet może wystawać poza ekran jak w TSH, w ekranie zostaje tylko jego punkt X/Y. Telefon, tablet i wąskie okno bez zmian.
- Edytor ekranów klawiatury TSH: wciśnięcie widżetu puszczone tuż poza podglądem nie zostaje „wciśnięte” (wcześniej późniejsze wciśnięcie gdzie indziej przeciągnięte nad podgląd przesuwało tamten widżet, także po zmianie ekranu); zmiana ekranu albo modelu w trakcie przeciągania przerywa je bez zapisu. Tekst i Data/czas z pustą treścią mają ramkę co najmniej 8 px i da się je kliknąć. Kropka pokazanego ekranu nie znika w czasie przeciągania. Shift+klik wybiera kolejny widżet pod kursorem jak Alt+klik (Alt+klik przechwytują niektóre menedżery okien Linuksa). Telefon, tablet i wąskie okno bez zmian.
- Edytor ekranów klawiatury TSH: Esc przy pytaniu (usunięcie widżetu, zapis, nowe ekrany, tło z pliku) anuluje pytanie zamiast pytać o opuszczenie edytora; wcześniej przy niezapisanych zmianach pytanie o wyjście zastępowało pytanie o usunięcie, a potem Delete i „Usuń widżet” przestawały działać do zamknięcia edytora. Skróty (Ctrl/Cmd+Z, Delete, G, powiększenie) czekają na odpowiedź na pytanie i na koniec przeciągania, więc cofnięcie za pytaniem nie usuwa innego widżetu niż nazwany, a cofnięcie w trakcie przeciągania nie zostawia widma widżetu; gdy pytanie zastąpi pytanie o zamknięcie okna, skróty działają znowu zaraz po odpowiedzi. Po cofnięciu lub ponowieniu zmiany kolejności zaznaczenie idzie za widżetem (także gdy w układzie jest identyczna kopia widżetu). Delete, Backspace i G na przyciskach menu i okienek (np. wybór ikon) nic nie robią. Telefon, tablet i wąskie okno bez zmian.
- Edytor ekranów klawiatury TSH: menu „…” wiersza warstwy działa z klawiatury (Enter otwiera je i wybiera pozycję, strzałki w menu nie przenoszą zaznaczenia na inny wiersz), strzałki w menu wiersza ekranu nie zmieniają ekranu. Esc w polu panelu właściwości kończy edycję pola zamiast zamykać edytor. Telefon, tablet i wąskie okno bez zmian.
- Tabela obiektów i tabela awarii (desktop): kolumny Obwód, Stan, Usterki, Sygnał, Zasilanie i Blokada były puste, filtry „Z usterkami”, „Naruszone”, „Sabotaż/maskowanie” i „Zablokowane” nic nie znajdowały, a zakładka „Wyjścia” miała złe urządzenia, bo tabela czytała stan urządzeń z bazy Realm, w której 1.2.0 go już nie trzyma. Stan pochodzi teraz ze strumienia stanów jak w oryginalnych ekranach urządzeń i odświeża się na żywo; „Z usterkami” obejmuje też awarie w pamięci, a kolumna Usterki pokazuje je za bieżącymi (REJESTR-ZMIAN 055).

## [1.2.0-port.2] - 2026-11-14

Oryginał: BE WAVE Soft 1.2.0 (Electron 44.9.3).

### Summary
- Wbudowany edytor ekranów klawiatury TSH (podgląd, widżety, karta microSD), sterowanie pojedynczym wyjściem bez potwierdzenia, zamknięcie okna kończy aplikację także na macOS, poprawka „Zakończ” na macOS, nowe grupy panelu bocznego, Monitoring i Mój profil z ekranów Integracja i Użytkownicy, sygnał na kafelkach urządzeń radiowych.
- Sprawdzone: testy jednostkowe (210, wszystkie przechodzą), build Linux i macOS z instalatorami `.deb` i `.pkg` (ostrzeżenia esbuilda tylko te same co wcześniej). Linux uruchomiony na czystym profilu bez centrali i bez logowania: ekran „Dodaj obiekt”, brak błędów i wyjątków w `main.log`, zamknięcie okna kończy proces.
- Niesprawdzone: macOS (tylko zbudowany, nieuruchamiany, w tym „Zakończ” i zamknięcie okna), pytanie o niezapisane zmiany przy zamknięciu, wszystko, co wymaga logowania i centrali (panel boczny, wiersze Monitoring i Mój profil, sygnał na kafelkach, sterowanie bez potwierdzenia, edytor ekranów TSH z prawdziwymi danymi klawiatury).

### Added
- Desktop (Linux i macOS, okno ≥ 900 px): przycisk „Edytuj ekrany” w ustawieniach klawiatury wraca i otwiera wbudowany edytor ekranów klawiatury INT-TSH2/INT-TSG2 zamiast TSH Soft: lista ekranów (dodawanie, usuwanie, kolejność, nazwa, typ, ekran główny), motyw i wygaszacz, widżety wszystkich typów z formularzami właściwości, licznik danych i błędy na żywo. Wynik trafia do ustawień klawiatury jak plik TSH Soft; na centralę wysyła go dopiero ich „Zapisz”. Przed zapisem edytor ostrzega, gdy zmiana numerów ekranów przeniesie uprawnienia użytkowników. Telefon, tablet i wąskie okno bez zmian (bez przycisku).
- Edytor ekranów klawiatury TSH: pełny podgląd ekranu z grafikami Satel jak w TSH Soft (tło motywu, siatka, pasek stanu, kropki stron, zegar wygaszacza, widżety z ikonami `WDGT` i tekstem Roboto w swoim rozmiarze, środkowaniu i kolorach). Widżet przesuwa się myszą w granicach ekranu (z siatką przyciąga do jej pól) i strzałkami o 1 px, z Shift o 8 px. W panelu wszystkie pola widżetów, ikony wybierane z siatki glifów i ikony z kolorami czterech stanów czuwania; „Do środka” przesuwa X jak TSH. Telefon, tablet i wąskie okno bez zmian.
- Edytor ekranów klawiatury TSH: narzędzia karty microSD jak w TSH Soft. Okno „Karta SD” (pokaz slajdów): obrazy JPG, BMP i PNG dopasowane do ekranu klawiatury tą samą regułą co TSH (bez powiększania, do szerokości ekranu, czarne pasy, obcięcie góry i dołu), lista z kolejnością, zapis `photo/img1.jpg`, `img2.jpg`… (JPEG jakość 90) do wybranego folderu. Tło ekranu „Z pliku…” przy wyłączonym motywie: ostrzeżenie TSH o karcie, kadrowanie prostokątem o proporcjach ekranu (przesuwanie i zmiana rozmiaru myszą), zapis `map/map<id ekranu>.jpg` i ta nazwa w polu obrazu ekranu; podgląd pokazuje to tło. Do wyboru też „Bez obrazu” i tła wbudowane (`int://…`). Pliki tylko do folderu wybranego w tej sesji (nowe kanały IPC z kontrolą ścieżki); na kartę kopiuje je użytkownik, nic nie idzie przez centralę. Telefon, tablet i wąskie okno bez zmian.
- Build (Linux i macOS): `tools/tsh-assets.mjs` czyta zasoby RT_RCDATA z `TSH_soft.exe` oryginału (własny czytnik PE, bez wine) i zapisuje do `dist/tsh/` tła `BG_*`, czcionki Roboto i `WDGT` oraz motywy z `INIFILE` (`themes.json`, kolory Delphi `$BBGGRR` przeliczone na `#rrggbb`). Dla podglądu edytora ekranów klawiatury TSH. Brak exe przerywa build. Wyciągnięte pliki nie trafiają do repozytorium, a binaria TSH nadal nie są dołączane.
- Desktop (okno ≥ 900 px): kafelek urządzenia radiowego BE WAVE w widoku pomieszczenia pokazuje „Sygnał 45%” z tą samą kolorową ikoną co szczegóły urządzenia, a bez łączności czerwone „Brak połączenia” (także gdy centrala nie podaje wtedy sygnału). Tylko odczyt, bez zapytań do centrali; urządzenia przewodowe i kamery bez wiersza. Telefon, tablet i wąskie okno bez zmian.
- Desktop: wiersz „Monitoring ›” na górze ekranu „Integracja” i „Mój profil ›” na ekranie „Użytkownicy” (z uprawnieniami jak dawne pozycje panelu bocznego). Telefon, tablet i wąskie okno bez zmian.

### Fixed
- Edytor ekranów klawiatury TSH: ostrzeżenie o uprawnieniach użytkowników liczone względem listy ekranów centrali, także po „Utwórz nowe ekrany” i przy pustych danych centrali (wcześniej wtedy milczało, a uprawnienia starych ekranów przechodziły na nowe o tych samych numerach). „Utwórz nowe ekrany” najpierw pyta i wymienia ekrany, które zostaną zastąpione.
- Edytor ekranów klawiatury TSH: zapis i usuwanie plików karty microSD odrzucają plik obrazu będący dowiązaniem symbolicznym (wcześniej zapis szedł do celu dowiązania poza wybranym folderem); zapis przez plik tymczasowy i zmianę nazwy.
- Edytor ekranów klawiatury TSH: tło z kadrowania nie cofa zmian zrobionych w trakcie kodowania obrazu; „Dodaj” w oknie „Karta SD” blokuje okno do końca wczytywania i nie przywraca usuniętych w tym czasie slajdów.
- Edytor ekranów klawiatury TSH: zapis pliku na kartę microSD zapisuje wszystkie bajty i synchronizuje je przed podmianą (wcześniej prawie pełna karta mogła dostać ucięty JPEG zamiast starego, a zapis zgłaszał sukces); nieudany zapis nie zostawia pliku tymczasowego i nie blokuje kolejnych prób do restartu aplikacji; plik tymczasowy pozostawiony przez wcześniejsze uruchomienie nie blokuje zapisu ani jednej próby.
- Edytor ekranów klawiatury TSH: układ bez ekranu głównego (TSH Soft zapisywał takie) zostaje bez niego po dodaniu, usunięciu albo zmianie typu ekranu; „Ekran główny” można odznaczyć. Pytanie o usunięcie widżetu nie przechodzi na widżet innego ekranu, a pytanie o usunięcie nieobsługiwanego ekranu nie podaje liczby widżetów (była zawsze 0).
- macOS: „Zakończ” (menu aplikacji, Dock, `Cmd+Q`) nie pokazuje już błędu „Uncaught Exception: Renderer URL is not initialized”. Odmowa w pytaniu o niezapisane zmiany zostawia działające okno z protokołem `app://` (przeładowanie działa), a kolejne „Zakończ” znów sprząta przed wyjściem. Kliknięcie w Dock w trakcie kończenia nie tworzy okna.

### Changed
- Edytor ekranów klawiatury TSH: usunięcie ekranu albo widżetu wymaga potwierdzenia w wierszu. Brak ekranu głównego tylko ostrzega (TSH Soft zapisywał takie układy), a edytor nie wybiera go sam poza pierwszym ekranem użytkownika; więcej niż jeden ekran główny nadal blokuje zapis.
- Linux i macOS: zamknięcie okna (X) kończy aplikację na obu platformach; na macOS aplikacja nie zostaje już w Docku bez okien.
- Desktop: przełącznik na karcie urządzenia i wiersze przełączników w szczegółach („Wyłączone/Włączone” itd.) sterują bez okna potwierdzenia. Polecenia grupowe („Włącz wszystko”, „Wyłącz wszystko” itd.) nadal pytają.
- Desktop: panel boczny ma grupy „Podsumowanie” (Lista obiektów, Dziennik zdarzeń), „Konfiguracja” (Ustawienia obiektu, Harmonogramy, Integracja, Ustawienia e-mail, Użytkownicy, Klucz tokenów, Dane instalatora, Edytuj obiekt, Usuń obiekt za linią) i „Ustawienia” (Symulacja obecności, Diagnostyka i pozostałe); grupa „Zarządzanie obiektem” zniknęła. Stan zwinięcia grup jest zapamiętany niezależnie od języka. Telefon, tablet i wąskie okno bez zmian.

### Removed
- Desktop: z panelu bocznego usunięte „Zużycie energii” i „Dane środowiskowe”; „Monitoring” i „Mój profil” otwierane z „Integracji” i „Użytkowników” (kto nie ma tych ekranów, ma je dalej w „Konfiguracji”). Ekrany zostają dostępne jak w oryginale na telefonie i tablecie.
- Teksty „Włączyć to urządzenie?” i „Wyłączyć to urządzenie?” (`device_table.confirm_on`, `confirm_off`).

### Documentation
- Kodek danych ekranów klawiatury INT-TSH2/INT-TSG2 (`screens_config_base64`) z testami na 89 próbkach TSH Soft; używa go edytor ekranów (koder wydzielony do `tshBlobEncode.js`).
- `REJESTR-ZMIAN.md` wpisy 038–043; przepisy 05 (nowa nazwa `05-zamykanie-aplikacji.md`), 20, 23 zaktualizowane, nowe 25 (grupy panelu bocznego) i 26 (sygnał na kafelkach); `PORTOWANIE.md`: nowe ustalenia (X kończy aplikację na macOS, potwierdzenie tylko dla poleceń grupowych, grupy panelu).

## [1.2.0-port.1] - 2026-11-13

Oryginał: BE WAVE Soft 1.2.0 (Electron 44.9.3).

### Summary
- Port przeniesiony na wydanie Satel 1.2.0 z całym jego nowym zachowaniem (m.in. zamki Tedee, licencje centrali, akcja „żądanie HTTP” w rutynach, wyszukiwanie w dzienniku zdarzeń i na liście rutyn, ekran powitalny, zapis raportów awarii lokalnie). Wszystkie nasze zmiany z `1.1.0-port.3` zostały naniesione ponownie.
- Sprawdzone: build Linux i macOS. Linux uruchomiony na czystym profilu bez centrali i bez logowania: ekran „Dodaj obiekt”, baza Realm otwarta, klucz `realm.key` z prawami `0600`, blokada TSH Soft i blokada otwierania adresów `file:` działają, brak wyjątków w konsoli.
- Niesprawdzone: logowanie, praca z centralą i wszystkie ekrany desktopowe (rutyny, tabela obiektów, awarie, dziennik, panel boczny, pomieszczenia), schowek, ekran powitalny na oko. macOS tylko zbudowany, nieuruchamiany.

### Added
- Linux i macOS: ekran powitalny oryginału 1.2.0 (obraz `splash.jpg` w zasobach aplikacji).
- Desktop: wiersz dziennika zdarzeń pokazuje dla zdarzeń Grade 2 ten sam znak co karta Satel.

### Changed
- Aplikacja na Electronie 44.9.3 (Chrome 152, Node 24) zamiast 41.6.1.
- Desktop: lista rutyn i scen oraz dziennik zdarzeń używają tylko nowego pola szukania Satel. Nasze pole szukania usunięte, a tabela rutyn i wiersze dziennika pokazują wynik wyszukiwania Satel (w dzienniku wyszukiwanie działa na centrali, gdy ją obsługuje).
- Edytor rutyn i scen na desktopie: nowy przełącznik Satel „używaj w skrótach” ma zwarty odstęp jak pozostałe pola.

### Documentation
- `PORT-1.2.0-ANALIZA.md`: analiza różnic 1.1.0 → 1.2.0 i metody scalania.
- `REJESTR-ZMIAN.md`: wpisy 001–031 opisane dla 1.2.0, nowe wpisy 032 (ekran powitalny w buildach) i 033 (cel i wejście buildu).

## [1.1.0-port.3] - 2026-10-30

Oryginał: BE WAVE Soft 1.1.0 (Electron 41.6.1).

### Fixed
- macOS: błąd „Renderer URL is not initialized” przy ponownym otwarciu okna z Docka po jego zamknięciu.

## [1.1.0-port.2] - 2026-10-30

Oryginał: BE WAVE Soft 1.1.0 (Electron 41.6.1).

### Added
- Instalator Linux: pakiet `.deb`, który przy nowszej wersji robi upgrade, a dane w `~/.config` zostawia bez zmian.
- Instalator macOS: pakiet `.pkg` dla arm64, który instaluje albo aktualizuje aplikację w `/Applications`, a dane w `~/Library` zostawia bez zmian.
- Desktop: potwierdzenie przed sterowaniem wyjściem i poleceniem grupowym. Uruchamianie rutyn bez zmian.
- Desktop: tabela aktywnych awarii i tabela urządzeń w pomieszczeniu.
- Panel boczny na desktopie: pozycja „Lista obiektów” otwierająca tabelę obiektów.
- Tabela obiektów na desktopie: wejścia, wyjścia i pozostałe, z kluczowymi parametrami, szukaniem, filtrami i sortowaniem. Tylko do odczytu, wiersz otwiera szczegóły.
- Edytor rutyn i scen na desktopie: pełne nazwy urządzeń i operator w podsumowaniu warunków i akcji.
- Edytor rutyn i scen na desktopie: listy wyzwalaczy i akcji z sekcją częstych, szukaniem, dwiema kolumnami i skrótami klawiszowymi.
- Edytor rutyn i scen na desktopie: wybór urządzeń z szukaniem, zwiniętymi pomieszczeniami i etykietami wybranych.
- Edytor rutyn i scen na desktopie: jeden ekran z panelem warunku lub akcji obok rutyny.
- Edytor rutyn i scen na desktopie: `Ctrl+Enter` zapisuje rutynę, z tymi samymi blokadami co przycisk, a „Brakuje: …” pokazuje powód blokady.

### Changed
- Edytor rutyn i scen na desktopie: nowy warunek domyślnie ma „Stan wejścia”.
- Desktop: dziennik zdarzeń w wierszach z szukaniem, zwijane sekcje panelu bocznego z oddzielonym „Usuń obiekt”, pomieszczenia na ekranie głównym z małymi zdjęciami.
- Lista rutyn i scen na desktopie: tabela z szukaniem, kolumnami „Jeżeli” i „Wykonaj” zamiast kafelków.
- Edytor rutyn i scen na desktopie: zwarty ekran rutyny, listy w jednej kolumnie, krótki komunikat po zapisie zamiast pełnego ekranu.
- Edytor rutyn i scen na desktopie: wartość i opcja wybierane w miejscu, bez osobnego okna.
- Edytor rutyn i scen na desktopie: zmiana wyzwalacza zachowuje pasujące urządzenia, a błąd zapisu nie zamyka edytora.
- Edytor rutyn i scen na desktopie: nowa akcja „Włącz/wyłącz” domyślnie ma „Włącz”, a X i `Esc` zamykają tylko bieżący krok warunku lub akcji.
- Aplikacja jest budowana esbuildem z nazwanego kodu w `work/working/src`, a nie ze zminifikowanego `dist`. Wszystkie zmiany z `1.1.0-port.1` są teraz w tym kodzie.
- Aktualizacje: moduł `autoUpdater` zawsze zgłasza brak aktualizacji, bez `NsisUpdater`.

### Removed
- Edytor rutyn i scen na desktopie: zielony komunikat po dodaniu warunku lub akcji.

## [1.1.0-port.1] - 2026-10-30

Oryginał: BE WAVE Soft 1.1.0 (Electron 41.6.1).

### Added
- Linux x64: build na Electronie 41.6.1 z Realm 12.15.0 i ffmpeg b6.0 dla Linuksa.
- Linux: obsługa Wi-Fi przez `nmcli` (`dist/linux-overrides.js`) zamiast `netsh` i `ipconfig`. Nieprzetestowana na sprzęcie z Wi-Fi.
- macOS arm64: build z tego samego kodu aplikacji i binariów Realm i ffmpeg dla Maca. Nieuruchamiany.

### Changed
- `realm.key` jest zapisywany z prawami `0600`.
- Linux: `password-store=basic`, a przy braku magazynu sekretów `safeStorage` działa na tekście jawnym. Klucz bazy nie ma ochrony systemowej, bo klucz z `gnome-libsecret` nie przetrwał restartu i aplikacja kasowała bazę.
- `node-window-manager` ładuje natywny dodatek tylko na Windows, a `extract-file-icon` jest wymagany tylko tam.

### Removed
- TSH Soft: z ustawień klawiatury zniknął blok „Edytuj ekrany” wraz z przywracaniem ustawień fabrycznych, tak jak na urządzeniach mobilnych. Proces główny nie uruchamia plików `.exe`, a binaria TSH nie są dołączane.
- Automatyczne aktualizacje poza Windows, bo serwer Satel udostępnia tylko instalatory NSIS.
- Binaria tylko dla Windows z `node_modules`: `passport-desktop-win32-x64-msvc`, `@primno/dpapi` (`build`, `prebuilds`) oraz `build` w `bufferutil` i `utf-8-validate`.

[Unreleased]: #unreleased
[1.2.0-mod3.1]: #120-mod31---2026-11-15
[1.2.0-port.2]: #120-port2---2026-11-14
[1.2.0-port.1]: #120-port1---2026-11-13
[1.1.0-port.3]: #110-port3---2026-10-30
[1.1.0-port.2]: #110-port2---2026-10-30
[1.1.0-port.1]: #110-port1---2026-10-30
