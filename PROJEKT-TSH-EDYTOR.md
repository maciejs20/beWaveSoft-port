# Projekt: edytor ekranów klawiatury INT-TSH2 / INT-TSG2 w BE WAVE (port TSH Soft)

Stan (2026-11-14): projekt zaakceptowany 2026-11-13. Kroki 1–6 zrobione (kodek, grafiki z exe w buildzie, trasa edytora, podgląd z przeciąganiem, wszystkie typy widżetów, karta microSD; REJESTR-ZMIAN 033–037), plan kodeka `docs/plans/2026-11-13-tsh-codec.md`. Krok 7 częściowo: poprawki z przeglądu końcowego, testy (192), build Linux i test dymny na osobnym profilu (start bez wyjątków, `/tsh/` osiągalne, edytor w harnessie w zbudowanym rendererze, `isDesktopEditor` przy 1600 i 800 px). Niezrobione: zapis na klawiaturę (brak zgody i klawiatury przy teście), uruchomienie z centralą (trasa nigdy nie otwarta z prawdziwego `KeypadSettingsScreen`), macOS nieuruchamiany. Format danych: `PROJEKT-TSH.md`. Oznaczenia jak tam: **[F]** fakt, **[P]** podejrzenie, **[D]** decyzja użytkownika, **[W]** wybór projektanta do sprawdzenia przy czytaniu. Przebudowa edytora (plan `docs/plans/2026-11-14-tsh-editor-redesign.md`, REJESTR-ZMIAN 044–051, 2026-11-15; poprawki z przeglądu 052–054): metryki z tabeli TSH Soft, rysowanie jak TSH, układ na całe okno, ekrany z miniaturami i warstwy, inspektor z wyborem ikon; testy 322 (przed przebudową 199), kontrole w zbudowanym rendererze (CDP) przechodzą. Otwarte **[P]** po przebudowie są w sekcji „Wierność podglądu”.

## Po co

Na Linuksie i macOS nie da się dziś edytować ekranów klawiatury: TSH Soft to program tylko na Windows, więc przepis 01 ukrył „Edytuj ekrany” (wpis 001) i zablokował `.exe` (wpis 002). Edytor w BE WAVE ma przywrócić tę funkcję na obu platformach, bez wine.

## Cele

- Edytor robi wszystko, co TSH Soft 1.00.005 (**[D]** zakres „wszystko”, zakres był użytkownikowi obojętny): motyw, wygaszacz, do 16 ekranów użytkownika z ekranem głównym, ekrany dodatkowe, wszystkie typy widżetów z `PROJEKT-TSH.md` 2.3, oba modele (1024×600 TSH2, 480×272 TSG2).
- **[D] Pełny podgląd jak w TSH (wariant A):** ekran w skali z prawdziwym tłem motywu, ikonami z czcionki `WDGT`, czcionką Roboto i kolorami motywu; widżety przeciągane myszą, obok panel właściwości.
- **[D] Narzędzia karty microSD od razu (2026-11-13):** okno „Karta SD” (`TFormSD`: pokaz zdjęć, obrazy JPG/BMP skalowane do rozdzielczości klawiatury i zapisywane jako `photo/imgN.jpg` w folderze wybranym przez użytkownika) oraz wybór własnego tła „Z pliku…” z przycinaniem (`TFORMPICT`). Pliki trafiają tylko do folderu na dysku, który użytkownik przenosi na kartę; nic nie idzie przez hub.
- Wynik zgodny bajt w bajt z formatem TSH: `screens` i `screens_config_base64` wchodzą do istniejącego handlera `YA` (`KeypadSettingsScreen.js:295`) bez zmian w jego kodzie.

## Poza zakresem

- Odczyt danych z huba do analizy (**[D]** 2026-11-13). Edytor dostaje tylko to, co `KeypadSettingsScreen` i tak przekazywał do TSH.
- Wysyłanie obrazów przez hub. Własne tła i zdjęcia wygaszacza idą tylko przez kartę microSD (**[F]** `PROJEKT-TSH.md` 2.5); edytor zapisuje je do folderu i pokazuje ostrzeżenie jak TSH.
- Windows (ma oryginalny TSH). Telefon i tablet: bez zmian (zasada projektu).
- Wybór języka TSH (`TFORMLANG`, `LAN/*.XX`): edytor używa języka BE WAVE.

## Czego nie wolno zepsuć

- Ekranu ustawień klawiatury na telefonie i tablecie oraz przy oknie < 900 px (`DesktopEditor.isDesktopEditor()` fałszywe): ma działać jak dziś, czyli bez „Edytuj ekrany”.
- Danych z istniejącego bloku: edytor nie może zgubić ekranów ani widżetów, których nie rozumie. Rekord albo widżet, którego nie umie odczytać, zostaje skopiowany bajt w bajt i pokazany jako „nieobsługiwany”, bez edycji.
- Zapisu na hub: dalej robi go wyłącznie istniejąca ścieżka BE WAVE (`YA`, potem zapis ustawień klawiatury przez `SystemSetKeypadSettings`). Edytor niczego nie wysyła sam.

## Podejścia (rozważone)

| | Opis | Za | Przeciw |
|---|---|---|---|
| **A (wybrane [D])** | Pełny podgląd z grafikami Satel, przeciąganie, panel właściwości | Wygląda jak klawiatura i jak TSH | Grafiki trzeba wyciągnąć z exe; część reguł rysowania to **[P]**; największa praca |
| B | Schemat (prostokąty z nazwą), przeciąganie, panel | Bez grafik Satel i zgadywania wyglądu | Wygląd sprawdzany dopiero na klawiaturze |
| C | Sam formularz | Najszybsze | Układanie ekranu na liczbach |
| — | TSH pod wine | Zero pracy nad edytorem | Słabe na macOS, sprzeczne z decyzją „bez wine” |

## Kształt rozwiązania

### Gdzie i jak się otwiera

- Przycisk „Edytuj ekrany” wraca w `KeypadSettingsScreen` tylko gdy `isDesktopEditor()`; w pozostałych przypadkach blok pozostaje usunięty jak w wpisie 001. Wpis 001 zostaje zastąpiony nowym wpisem w `REJESTR-ZMIAN.md`; blokada `.exe` (wpis 002) zostaje.
- **[W]** Edytor otwiera się jako osobna trasa desktopowa na pełne okno (jak `desktop/deviceTable`), nie jako modal 800 px: ekran 1024×600 w skali potrzebuje miejsca. Kod w `renderer/app/desktop/tshEditor/`.
- Wejście: ten sam obiekt, który dziś idzie do `saveTshSettings` (`lang`, `keypad.model`, `scenes`, `rooms`, `alarm_modes`, `devices`, `screens`, `screens_config_base64`). **[W]** Budowa obiektu zostaje wydzielona z obecnej funkcji w `KeypadSettingsScreen` do jednej funkcji używanej przez edytor; plik `tsh-settings.json` i watcher chokidar nie są potrzebne w tej ścieżce.
- Wyjście: „Zapisz” woła `YA({content})` z tym samym kształtem, jaki zapisywał TSH (wejście plus `screens[{screen_name,screen_type,screen_id,screen_image:""}]` i `screens_config_base64`). „Anuluj” nic nie zmienia. Pytanie o niezapisane zmiany przy wyjściu.
- Pierwsze uruchomienie bez bloku (`screens_config_base64` brak): edytor tworzy blok jak świeży TSH dla danego modelu (motyw Abstract, wygaszacz, ekran główny). **[W]** Wzorce pustych bloków dla TSH2 i TSG2 wziąć z próbek `work/re-tsh/samples` (pierwszy zapis bez zmian), z poprawną sumą katalogu (TSH ma tu błąd, próbka 083).

### Identyfikatory ekranów

- `YA` dopasowuje ekrany z huba po `guid === screen_id` i przenosi z nich `users`, `availableAfterSignIn` i `defaultScreen`. Zmiana numeracji przenosi więc uprawnienia użytkowników na inne ekrany.
- **[W]** Edytor numeruje ekrany dokładnie tak jak TSH przy dodawaniu, usuwaniu i zmianie kolejności, bo tylko taki blok wiemy, że klawiatura przyjmie. Przed krokiem 1 sprawdzamy to na próbkach z TSH (usunięcie ekranu ze środka, zmiana kolejności, osobno dla ekranów użytkownika i dodatkowych). Jeśli TSH zmienia numerację, edytor przed zapisem pokazuje, których ekranów dotyczy zmiana uprawnień.

### Warstwy kodu

1. **Model i kodek (czysty JS, bez React):** `tshBlob` — dekodowanie bloku do modelu (ekrany, widżety, nieobsługiwane fragmenty jako surowe bajty) i kodowanie z powrotem z sumami (`tshChecksum`, suma u32 w katalogu), dopełnienie `0xab`, limity (16 ekranów użytkownika, 38 wpisów katalogu, długość nagłówka i widżetu ≤ 255, rozmiar ekranu). Bazą jest `work/working/tools/tsh-blob.mjs`. Kodek odrzuca zapis, który łamie limit, z komunikatem dla użytkownika zamiast obcinać dane.
2. **Opis typów widżetów:** jedna tabela (typ → nazwa, pola ładunku, domyślne ikony, rozmiar w podglądzie, wymagane źródło danych: urządzenie z `has_input`/`has_on_off`/…, scena, tryb czuwania, pomieszczenie, ekran dodatkowy). Panel właściwości i podgląd są generowane z tej tabeli.
3. **Podgląd (canvas lub DOM w skali):** tło motywu albo kolor, siatka (bajt 7, 0x10), widżety z ikonami `WDGT` i tekstem Roboto, rozmiar 0–3, środkowanie, kolory motywu lub własne. Przeciąganie zmienia X/Y w pikselach ekranu klawiatury, z granicami ekranu.
4. **Panel:** lista ekranów (dodaj/usuń/zmień kolejność/nazwę/typ, ekran główny), lista widżetów ekranu, właściwości zaznaczonego widżetu i ekranu, ustawienia motywu i wygaszacza (opcje 0x02 bez zegara, 0x04 bez wygaszacza).

### Grafiki Satel

- Źródło: `TSH_soft.exe` z buildu Windows (`work/original/<wersja>/win-build/BE WAVE Soft/resources/v*/TSH_soft.exe`), z którego build i tak kopiuje `BW_ORIGINAL_RESOURCES`.
- **[W]** Skrypt Node przy budowaniu czyta zasoby RT_RCDATA z PE (bez wine): `INIFILE` (motywy, kolory Delphi `$BBGGRR`), `BG_*` (JPG), `ROBL`/`ROBT`, `WDGT`, i zapisuje je do katalogu zasobów aplikacji. Do repozytorium nie trafiają ani exe, ani wyciągnięte pliki. Brak exe przy budowaniu przerywa build z jasnym komunikatem.
- Binaria TSH (`resources/v*`) nadal nie są dołączane do aplikacji (wpis 002); dołączane są tylko wyciągnięte grafiki i czcionki.

### Karta microSD

- **[W]** Obróbka obrazów w rendererze przez canvas (dekodowanie JPG/BMP/PNG przeglądarki, skalowanie, `toBlob("image/jpeg")`), bez natywnych bibliotek, więc tak samo na macOS i Linuksie. Zapis do wybranego folderu przez nowy kanał IPC w procesie głównym (okno wyboru folderu Electron, zapis pliku), tylko pod ścieżką wybraną przez użytkownika.
- Reguły jak w TSH ustalone przy kroku 6 (`PROJEKT-TSH.md` 2.5, rejestr 037): skalowanie tylko w dół do szerokości ekranu, wyśrodkowanie, czarne pasy i obcięcie góry/dołu; `photo/img1.jpg`… z pominięciem istniejących nazw; JPEG jakość 90; bez limitu liczby zdjęć; tła `map/map<id>.jpg`, w polu obrazu sama nazwa pliku.
- Przycinanie: prostokąt o proporcjach ekranu klawiatury przesuwany i skalowany myszą na obrazie źródłowym.

### Teksty

- Etykiety w języku BE WAVE (i18n aplikacji). **[W]** Polskie i angielskie teksty piszemy; inne języki BE WAVE dostają angielski, dopóki ktoś nie przetłumaczy. Nazwy typów widżetów można wziąć z `LAN/TSH_soft.PL`/`.EN` jako wzór.

## Wierność podglądu

- Rozmiary czcionek i ikon podgląd bierze z tabeli TSH Soft (`FUN_00ab0cd4`, `tshMetrics.js`, wpis 044, `PROJEKT-TSH.md` 2.6), nie z proporcji ani zrzutów **[F]**. Układ i rysowanie jak w TSH (wpisy 044–046): duży tekst Roboto Thin, wyrównanie z bitów 2–3 bajtu 7 tylko dla tekstów, ikony spoza firmware jako 0x22, wskaźniki z glifów, pasek stanu tylko na INT-TSH2, kropki stron i zegar wygaszacza w położeniach z kodu, data jak w Delphi. Jedyna wartość, w której pomiar i tabela się różnią, to zegar wygaszacza (294 px zmierzone, 256 px w tabeli), rozstrzygnięta kodem wyśrodkowania.
- Wzorzec pozostaje ten sam: zrzuty podglądu z samego TSH Soft pod wine (`work/re-tsh`, `shot.sh`) dla każdego typu widżetu, rozmiaru i obu modeli, ale porównanie jest teraz narzędziem z liczbami: 112 obszarów TSH2 i TSG2, 76 zgodnych co do piksela, 36 przesuniętych o 1–2 px (inne rysowanie glifów w wine GDI i w Chrome), 18 zrzutów kontrolnych identycznych jak po zadaniu 8. Zgodność co do piksela nie jest celem; celem jest ten sam układ, ikony, rozmiary tekstu i kolory.
- Klawiatura użytkownika jest ostatecznym sprawdzianem, ale tylko przy zapisie po jego zgodzie (punkt „Sprawdzenie”).

### Zasady układu i obsługi (wpisy 047–051)

- Układ: ramka na całą treść okna, pasek narzędzi nad trzema panelami (lewy 264 px: ekrany z miniaturami i warstwy; środek: podgląd na całą resztę, min. 360 px; prawy 320 px, 280 px poniżej 1200 px: inspektor). Każdy panel przewija się osobno, strona nie.
- Siatka: przełącznik w pasku narzędzi to siatka edytora (przyciąganie przy przeciąganiu, niezapisywana, start z flagą ekranu); „Siatka na klawiaturze” w inspektorze to zapisana flaga ekranu (bajt 7, bit 0x10), która rysuje linie siatki TSH. Zmiana jednej nie rusza drugiej **[W]**.
- Przycinanie: ograniczana jest tylko kotwica X/Y do ekranu, ramka może wystawać poza krawędź jak w układach z TSH. Widżet, którego użytkownik nie przeciągnął, nie jest przepisywany.
- Przesuwanie: strzałki 1 px, z Shift 8 px; przeciąganie zaczyna się po 4 px CSS; przyciąganie do pól siatki, krawędzi i środka ekranu w promieniu 6 px CSS, Alt je wstrzymuje.
- Trafianie: wnętrze prostokąta ustępuje innemu widżetowi pod kursorem (prostokąty są ramkami za sterowaniem); Alt+klik albo lista warstw wybiera prostokąt.
- Powiększenie: dopasowanie domyślnie, 50–400 %, Ctrl/Cmd+kółko wokół kursora, Ctrl/Cmd+0, 1, =, −. Esc przerywa przeciąganie, potem odznacza, dopiero potem zamyka edytor.
- Historia: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl/Cmd+Y, 100 kroków; Delete i Backspace usuwają zaznaczony widżet po pytaniu.

### Otwarte **[P]** po przebudowie

- **[P]** macOS nie uruchamiany; sprawdzony tylko podgląd przy DPR 2 (emulacja), nie prawdziwy ekran Retina ani skróty z Cmd.
- **[P]** Edytor w tej przebudowie nigdy nie otwarty z prawdziwych ustawień klawiatury z centralą (trasa z `KeypadSettingsScreen` sprawdzona wcześniej, przy kroku 7; po przebudowie tylko w harnessie na zbudowanym rendererze).
- **[P]** Zapis na klawiaturę nie wykonany (użytkownik odmówił); ani razu nie sprawdzono, jak klawiatura rysuje ekran z edytora.
- **[P]** Menu „View” Electrona może przechwycić Ctrl/Cmd+=, − i 0 przed edytorem; nie sprawdzone w uruchomionej aplikacji.
- **[P]** Dotyk, powiększenie strony inne niż 100 % i ciemny motyw nie sprawdzone.
- **[P]** Okno 1000 px daje około 380 px podglądu (264 + 320 px paneli); układ jest poprawny, ale ekran jest mały. Węższe panele są jedną stałą na panel.
- **[P]** Okienko ikon w niskim oknie otwiera się nad przyciskiem i zasłania pasek narzędzi do chwili zamknięcia.
- **[P]** Alt+klik (kolejny widżet pod kursorem) mogą przechwytywać menedżery okien Linuksa (Xfce, MATE, Cinnamon, starsze GNOME) do przesuwania okna; nie sprawdzone na takim pulpicie. Shift+klik robi to samo (wpis 052), są też lista warstw i Tab.
- **[P]** 36 z 112 obszarów porównania z TSH różni się o 1–2 px (rysowanie glifów wine GDI kontra Chrome); nie do usunięcia bez własnego rastra czcionek.

## Otwarte **[P]** z formatu i jak je traktujemy

- Bajty 2–6 nagłówka ekranu, pierwsze 7 bajtów pól sceny i trybu: kopiujemy stałe z próbek przy tworzeniu, zachowujemy przy edycji.
- „Niedostępne w czuwaniu” w widżetach czuwania i bity 0–1 „Stan”: w panelu tylko jeśli potwierdzimy na próbkach przed implementacją, inaczej zachowujemy istniejące bajty.
- Typ 15 (znany tylko z exe): tylko zachowanie, bez dodawania z panelu, dopóki nie ma próbki z TSH.
- Katalog i nazwy plików graficznych na karcie: ustalone przy kroku 6 z exe i plików TSH (`PROJEKT-TSH.md` 2.5): `photo/imgN.jpg`, tła `map/map<id ekranu>.jpg` (dla ekranów użytkownika **[P]**), w polu obrazu sama nazwa; `graphics` to klucz ustawień, nie katalog.

## Sprawdzenie

- Testy kodeka (`node --test`): każdy z 89 bloków próbek po dekodowaniu i kodowaniu daje te same bajty (poza znanym błędem sumy w próbce 083, który kodek naprawia); bloki zbudowane od zera przechodzą `tsh-blob.mjs` bez błędów; limity zwracają błąd.
- Podgląd: zestawienie zrzutów TSH i edytora dla tych samych bloków, oceniane wzrokowo.
- Test dymny na osobnym profilu: okno ≥ 900 px pokazuje „Edytuj ekrany”, < 900 px nie; zapis z edytora trafia do `YA` (log `console.log(e)`), brak wyjątków.
- Karta microSD: pliki z edytora porównane z plikami z TSH dla tych samych obrazów (rozmiar, pasy, nazwy); folder przeniesiony na kartę dopiero za zgodą użytkownika.
- Zapis na klawiaturę: tylko po wyraźnej zgodzie użytkownika, jeden prosty ekran, potem ocena na klawiaturze.
- `CHANGELOG.md` i `REJESTR-ZMIAN.md` (kotwice, kod przed i po) jak dla każdej zmiany; przepis w `mod-recipes/` i aktualizacja `PORTOWANIE.md` (decyzja o wyłączeniu TSH zmienia się).

## Kolejność wdrożenia

1. Kodek z testami round-trip na próbkach.
2. Skrypt wyciągania grafik z exe i włączenie go do builda.
3. Trasa edytora, wejście/wyjście przez `YA`, przycisk tylko na desktopie (bez podglądu: lista ekranów i panel).
4. Podgląd z grafikami i przeciąganie.
5. Wszystkie typy widżetów w panelu.
6. Karta microSD: okno pokazu zdjęć i własne tło z przycinaniem.
7. Porównanie z TSH, poprawki, test dymny, zapis na klawiaturę za zgodą.

## Uwagi z recenzji kodeka (krok 1, do planu edytora)

Kodek jest gotowy (`work/working/src/renderer/app/desktop/tshEditor/`, 78 testów, `npm --prefix work/working/tools test`). Końcowa recenzja zostawiła na kroki 3–5:
- Surowy rekord motywu pozwala przełączyć TSH2↔TSG2 bez kontroli rozdzielczości (ten sam błąd co w próbce 083). Edytor musi tego pilnować.
- Kodek nie sprawdza powtórzonych identyfikatorów ekranów ani liczby ekranów głównych. To zadanie edytora (sekcja „Identyfikatory ekranów”).
- Uwagi z odczytu nie mają wagi, a `FIELD_RANGE` nie podaje ścieżki pola. Komunikaty dla użytkownika trzeba budować z indeksów rekordu i widżetu.
- `tshBlob.js` nie eksportuje `encodeUtf8` ani stałych rozmiarów potrzebnych do licznika bajtów na żywo. Dodać przy panelu.
- `tshBlob.js` ma około 690 linii. Przy kolejnych zmianach wydzielić koder do osobnego pliku, a `tshBlob.js` zostawić jako punkt wejścia.

## Decyzje użytkownika

- 2026-11-13: port robimy („Tak, projekt”); zakres obojętny → pełny; wariant A (pełny podgląd); bez odczytu z huba; okno „Karta SD” i przycinanie tła od razu; motyw Black nieistotny, domyślny Abstract.
