# Projekt: port TSH Soft (edytor ekranów klawiatury INT-TSH2 / INT-TSG2)

Stan: analiza wstępna (2026-11-13). Portu nie rozpoczęto, nic w aplikacji nie zmieniono.

Oznaczenia: **[F]** to fakt potwierdzony w kodzie albo na próbkach, **[P]** to podejrzenie do sprawdzenia, **[D]** to decyzja.

## Najważniejsze ustalenia

1. **[F] TSH Soft to program Delphi/VCL (PE32, i386), `TSH_soft.exe` v1.00.005** z `resources/v1.00.005 2026-07-03` buildu Windows 1.2.0. Okno programu podaje wersję v1.00.006.
2. **[F] Z BE WAVE wymienia się tylko plikiem `tsh-settings.json`.** Port nie musi naśladować uruchamiania exe: wystarczy komponent, który przyjmuje to samo wejście i oddaje `screens` oraz `screens_config_base64`. Obecny handler `YA` w `KeypadSettingsScreen` przyjmie wynik bez zmian.
3. **[F] Format danych ekranów jest rozpoznany, łącznie z sumami kontrolnymi.** Narzędzie `work/working/tools/tsh-blob.mjs` dekoduje dane i sprawdza sumy. Zgodność sprawdzona na 89 próbkach: 1306 widżetów, 1135 nagłówków ekranów, 0 błędów sum rekordów. Jedyny błąd sumy w katalogu robi sam TSH (2.1). Niezależny przegląd (własny skrypt, bez `parse.py`) potwierdził te liczby i twierdzenia [F]; jego uwagi są naniesione.
4. **[F] Obrazy użytkownika idą wyłącznie przez kartę microSD w klawiaturze.** BE WAVE wysyła na hub tylko `screens_config_base64` (`screen_image` zawsze puste). TSH przy wyborze własnego obrazu ostrzega, że grafiki trzeba zapisać na karcie microSD, która zostaje na stałe w czytniku klawiatury (2.5).
5. **[D] Próbki syntetyczne (jeden widżet na ekran) służą tylko do odczytu bajtów.** Nie są wzorem typowego użycia programu.
6. **[D] Prawdziwych danych z huba w ogóle nie czytamy** (decyzja użytkownika z 2026-11-13). Port opiera się wyłącznie na próbkach z TSH Soft.

## 1. Interfejs z BE WAVE

- Renderer zapisuje JSON przez `saveTshSettings` (`work/working/src/renderer/app/screens/KeypadSettingsScreen.js:373`). Proces główny trzyma go w `userData/tsh-settings.json` (`work/working/src/main/main.js:396`).
- Wejście do TSH: `lang`, `keypad.model` (`TSH2_TSH210` | `TSG2`), `scenes[{scene_index,name}]`, `rooms[{room_index,name}]`, `alarm_modes[{alarm_mode_index,name}]`, `devices[{dev_index,name,has_input,has_analog,has_thermostat,has_on_off,dev_values[{name,config_index,unit}]}]`, `screens`, opcjonalnie `screens_config_base64`.
- Wyjście z TSH: to samo plus `screens[{screen_name,screen_type,screen_id,screen_image}]` i `screens_config_base64`. Program dopisuje pola `has_*` z wartością 0.
- TSH zamyka się po OK i zapisuje plik. chokidar wykrywa zmianę, `YA` buduje `keypadSettings` (`data` = zdekodowane dane, `screens`), a zapis na hub idzie przez `SystemSetKeypadSettings`.
- Lista `screens` z wejścia nie tworzy ekranów. TSH czyta ekrany z `screens_config_base64`.

## 2. Format `screens_config_base64`

Wszystkie liczby wielobajtowe są zapisane big-endian (zapis `FUN_00704ae0`, odczyt `FUN_00704aa4`). **[F]** Teksty są w UTF-8 z jednym bajtem długości liczonym w bajtach, np. „Ekran ąę” = `0a` + 10 bajtów. Działa to niezależnie od języka systemu, bo TSH koduje przez `0xfde9`. **[F]** Cały blok jest dopełniany bajtami `0xab` do wielokrotności 32 bajtów (0–31 bajtów dopełnienia, nigdy pełne 32).

### 2.1 Nagłówek globalny (0x160 = 352 bajty, reszta wypełniona zerami)

| Offset | Pole |
|---|---|
| 0 | wersja, `01` |
| 1–2 | szerokość LCD: 1024 dla TSH2, 480 dla TSG2 (`0x1e0`×`0x110` w `FUN_00aa1acc`) |
| 3–4 | wysokość LCD: 600 dla TSH2, 272 dla TSG2 |
| 5 | liczba ekranów N |
| 6 + 9·i | wpis katalogu: `u8 id`, `u16 offset`, `u16 długość`, `u32 suma` (zwykła suma bajtów rekordu razem z jego sumami kontrolnymi). Miejsce na najwyżej 38 wpisów |

Id ekranów: **[F]** motyw `256 − numer motywu z listy` (Abstract 255, Ambient 254, Black 253, Collage 251, Gradient 1 243; `0` tylko przed pierwszym wyborem motywu), wygaszacz `0`, ekrany użytkownika od `33` (0x21) wzwyż, ekrany dodatkowe od `1`. Program pozwala na najwyżej 16 ekranów użytkownika. Id nie jest unikalnym kluczem: motyw i wygaszacz mogą mieć oba `0` (001, 083, 084), więc rekord rozpoznaje się po pozycji w katalogu i po typie z bajtu 17.

**[F]** Rekordy leżą od 0x160 jeden za drugim, bez przerw, w kolejności katalogu: motyw, wygaszacz, ekrany użytkownika, ekrany dodatkowe. Potem jest dopełnienie `0xab`.

**[F]** TSH2 i TSG2 różnią się tylko rozdzielczością (nagłówek globalny i pola szerokość/wysokość rekordu motywu) i mają tę samą listę 18 widżetów. Błąd TSH: przy pierwszym zapisie świeżego wejścia TSG2 suma motywu w katalogu jest jeszcze liczona dla 1024×600 (próbka 083), a po edycji jest już poprawna. Port zawsze liczy sumy od nowa.

### 2.2 Rekord ekranu

| Offset | Pole |
|---|---|
| 0–1 | `hl` = długość nagłówka ekranu bez tych 2 bajtów |
| 2–3 | **[F]** `u16` szerokość: w motywie szerokość LCD (1024 / 480), w pozostałych ekranach `0x20` (**[P]** krok siatki) |
| 4–5 | **[F]** `u16` wysokość: w motywie wysokość LCD (600 / 272), w pozostałych `0x20` |
| 6 | **[P]** `u8` zawsze `0x20` |
| 7 | **[F]** flagi: `0x80` „Używaj motywu”, `0x10` „Pokaż siatkę” |
| 8–16 | 3 kolory RGB: cl1 (czcionka/ikony), cl2 (podświetlenie), cl3 (tło). To kolory motywu z `INIFILE` w exe, gdzie są zapisane jako Delphi `$BBGGRR` |
| 17 | **[F]** typ ekranu: `0` THEME, `1` SCREENSAVER, `2` USER_SCREEN, `4` ADDITIONAL_SCREEN; bit `0x01` przy ekranie użytkownika oznacza „Ekran główny” (`03`) |
| 18 | **[F]** opcje wygaszacza: `0x02` „Bez zegara”, `0x04` „Bez wygaszacza”; w innych ekranach `00` |
| 19 | długość nazwy w bajtach, potem nazwa w UTF-8 |
| … | **[F]** `u8 id` ekranu, potem nazwa obrazu tła z długością na początku. W ekranach innych niż motyw pusta nazwa to sam bajt `00`. **[F]** Motyw ma zawsze bajt długości `0x20` i 32 bajty nazwy dopełnionej spacjami, także bez obrazu (Black: `20` + 32 spacje, próbka 002). `int://` = tło wbudowane. **[P]** Nie wiadomo, co z nazwą dłuższą niż 32 bajty: koder ją odrzuca |
| hl+1 | suma kontrolna nagłówka (2.4) |
| hl+2… | widżety, jeden po drugim |

### 2.3 Widżet

| Offset | Pole |
|---|---|
| 0–1 | `L` = długość widżetu bez tych 2 bajtów |
| 2–3 | X |
| 4–5 | Y |
| 6 | typ: liczba z TSH zapisana szesnastkowo jak cyfry, np. typ 23 → `0x23` |

Minimalny widżet ma 18 bajtów (L = 16: pozycja, typ, flagi, kolory i suma, bez danych typu; typ 23 ma L = 17).
| 7 | **[F]** flagi: `0x80` kolory z motywu (domyślnie włączone), `0x08` wyrównanie do środka (Data/czas, Wartość; wtedy TSH przelicza X), bity 0–1 wielkość: `0` mała, `1` średnia, `2` duża |
| 8–16 | 3 kolory RGB |
| 17…L | dane zależne od typu |
| L+1 | suma kontrolna (2.4) |

Dane według typu. **[F]** to pole potwierdzone zmianą w edytorze, reszta **[P]**:

| Typ | Nazwa | Dane |
|---|---|---|
| 00 | Tekst | **[F]** tekst z długością na początku |
| 01 | Stan pomieszczenia | **[F]** `u16` indeks pomieszczenia |
| 02, 03 | Stan wejścia / wyjścia, wariant „Wskaźnik” | **[F]** `u16` indeks urządzenia (`dev_index`) |
| 06, 07 | Stan wejścia / wyjścia, wariant „Ikona” | **[F]** `u16` indeks, `u16` ikona stanu nieaktywnego, `u16` ikona aktywnego (wejście 0x121/0x123, wyjście 0x124/0x126). Pole „Typ” w edytorze zmienia kod widżetu (047, 072, 081). W próbkach 048, 068 i 069, opisanych jako „typ +1”, zmieniło się tylko Y o +5: kliknięcie trafiło w przycisk Y+ |
| 15, 16 | Stan wejścia / wyjścia, wariant „Tekst” | `u16` indeks, 2 teksty z długością na początku. **[F]** dla 16 („Nieaktywne”, „Aktywne”, 072). **[P]** dla 15: znany tylko z próbki Satel zaszytej w exe („Stan normalny”, „Naruszenie”), brak próbki z TSH |
| 05 | Data/czas | **[F]** format jako tekst, domyślnie `dd.MM.yyyy hh:mm:ss` |
| 08, 27 | Sterowanie, Przycisk | **[F]** `u16` indeks wyjścia, `u16` ikona nieaktywne (0x11d), `u16` ikona aktywne (0x11e) |
| 17 | Prostokąt | **[F]** `u16` szerokość (domyślnie 255), `u16` wysokość (32), `u8` przezroczystość (7), `u8` grubość ramki (2) |
| 23 | Napad/poż./med. | **[F]** `u8` rodzaj alarmu (0 = NAPAD) |
| 24 | Informacja | **[F]** tekst z długością na początku |
| 25 | Odsyłacz | `u8` 00, `u8` ikona (0xfa), **[F]** `u8` cel: `ff` = „Powrót”, inaczej id ekranu dodatkowego |
| 30 | Wartość z urządzenia | **[F]** `u16` `dev_index` (088: 0 → 4), `u8` miejsca po przecinku (087: 1 → 2), `u16` `config_index` wartości z wejścia BE WAVE (089/090: 3 wilgotność, 4 ciśnienie; 14 jasność), tekst jednostki z długością na początku (`%`, `hPa`). Osobnego indeksu wartości nie ma. **[P]** `config_index` jako `u16`: starszy bajt zawsze `00` |
| 31, 35 | Uruchom / zatrzymaj scenę | **[F]** 8 bajtów: `scene_index` w ostatnim (3 → `03`, 10 → `0a`, 0 = brak), `u16` × 2 ikony (0x120/0x11f, 0x249), `u8` opcje jak w czuwaniu plus `0x08` „Niedostępne w czuwaniu”, 2 bajty `00` |
| 33, 34, 36, 37 | Załącz / wyłącz / przełącz czuwanie, kasowanie alarmu | **[F]** 8 bajtów: `alarm_mode_index` w ostatnim (to indeks, nie maska: tryb 3 → `03`), `u16` × 2 ikony, **[F]** `u8` opcje: `0x40` „Pytaj o kod dostępu”, `0x10` „Długie naciśnięcie”, `0x80` „Wyloguj po uruchomieniu”, bity 0–1 „Stan”; potem `00 00` i 4 pary `u16` ikona + RGB (kolory stanów: zielony `00b27f`, żółty `ffbb00` ×2, czerwony `ff0000`); zaraz po nich suma kontrolna. Razem 35 bajtów danych (L = 0x33) |

### 2.4 Suma kontrolna (nagłówek ekranu i widżet)

**[F]** `FUN_00a9b64c` + `FUN_00a9b604`. Liczy się po bajtach `d[0..d[1]]`, gdzie `d[1]` to młodszy bajt pola długości, a wynik ląduje w `d[d[1]+1]`:

```js
let a = 0x13;
for (let i = 0; i <= d[1]; i++) { const x = (d[i] + a) & 0xff; a = ((x << 1) & 0xff) | (x >> 7); }
```

Maska w `FUN_00a9b604` jest czytana ze zmiennej globalnej (`[[0x00b0d57c]+0x1c]`). Na wszystkich próbkach zachowuje się jak `0x80`, czyli obrót w lewo. Pole długości jest 16-bitowe, ale suma używa tylko młodszego bajtu, więc dla długości ≥ 256 jej położenie `d[d[1]+1]` wypada w środku danych. **[D]** Koder ogranicza `L` i `hl` do 255: tekst w widżecie Tekst do 238 bajtów, nazwa ekranu i nazwa obrazu razem do 234 bajtów. Dekoder zgłasza starszy bajt długości różny od 0 jako nieobsługiwany. W próbkach nigdy nie wystąpił.

**[F]** Kolejność liczenia przy zapisie: sumy widżetów, potem suma nagłówka ekranu, na końcu `u32` w katalogu, która obejmuje już wszystkie sumy kontrolne rekordu.

### 2.5 Karta microSD (obrazy)

Źródła (2026-11-14): formularze TPF0 `TFORMSD` i `TFORMPICT` z `TSH_soft.exe`, dekompilacja Ghidra (`BB_Save2SDClick` 0x00a8bc54, `BB_addClick` 0x00a8cb38, skalowanie 0x00ab0e98, zapis JPEG 0x00a5a51c, kadrowanie 0x00a6d1c4–0x00a6dfd4, nazwa tła 0x00a61efc), plik TSH `work/re-tsh/sdout/photo/img1.jpg` z `work/re-tsh/imgs/slajd1.jpg`, próbka Satel w exe (`embedded-sample.txt`).

- **[F]** Okno „Zapis na kartę SD” (`TFormSD`) ma zakładki „Dodatkowe tła ekranów” (lista teł z projektu, ostrzeżenie „Dodano do projektu dodatkowe grafiki. Należy użyć polecenia „Zapisz na kartę SD”…”, opcja „Pokaż obrazy z karty SD” i „Użyj ten obraz”), „Pokaz slajdów” (Dodaj, Usuń, Wyczyść, „Ilość obrazów:”) i „Dźwięki” (dźwięki naruszenia wejść; poza zakresem portu). Wspólny przycisk „Zapisz na kartę SD” pyta o katalog (główny katalog karty) i kończy komunikatem „Zapisano pliki do "<katalog>"”.
- **[F]** Katalogi na karcie: `map\` (tła ekranów), `photo\` (pokaz slajdów), `chime\`, `sounds\` (dźwięki). Napis `graphics` w exe to klucz ustawień obok `cl1`–`cl3`, nie katalog karty.
- **[F]** Zapis: najpierw usuwa wszystkie pliki z `map\`; gdy `photo\` ma pliki, pyta i po zgodzie usuwa katalogi `photo\`, `chime\`, `sounds\`. Tworzy brakujące katalogi. Pokaz: dla każdego obrazu listy pierwsza wolna nazwa `photo\img<N>.jpg` od N = 1 (licznik rośnie, istniejące nazwy są pomijane). Tła: `map\<nazwa z listy>`.
- **[F]** Skalowanie obrazu pokazu przy dodawaniu (do rozmiaru listy obrazów = rozdzielczość klawiatury): obraz szerszy niż ekran zmniejszany do szerokości ekranu (wysokość `h·W div w`), węższy bez zmiany; brak dopasowania do wysokości (wywołanie z flagą wyłączoną); wynik rysowany na czarnym tle 24 bit w punkcie `((W−w) div 2, (H−h) div 2)`, więc nadmiar u góry i dołu jest obcinany. Sprawdzone: `slajd1.jpg` 800×800 → `img1.jpg` 1024×600, treść x 112–911, pasy po 112 px; napis z wierszy 52–60 źródła nie ma w wyniku (obcięte górne 100 wierszy), piksele wyniku portu równe plikowi TSH. `StretchDraw` VCL (bez wygładzania) przy zmniejszaniu. Limitu liczby zdjęć ani czasu slajdu w oknie nie ma.
- **[F]** JPEG: `TJPEGImage` z domyślną jakością 90 (tablice kwantyzacji IJG 90), baseline, 4:2:0, tylko APP0 JFIF 1.1 (gęstość 1×1, bez jednostek), bez EXIF.
- **[F]** Własne tło ekranu: przycisk „...” przy „Obraz:” (widoczny po wyłączeniu „Używaj motywu”), menu „Według motywu”, 12 teł wbudowanych (`int://…`), „Z pliku...”, „Bez obrazu”. „Z pliku...” pokazuje „Dodatkowe grafiki wymagają zapisania na karcie mikro SD i umieszczenia jej na stałe w czytniku w manipulatorze.”, okno pliku (`JPG/BMP`) i „Kadrowanie” (`TFORMPICT`).
- **[F]** Kadrowanie: prostokąt o proporcjach ekranu; przeciąganie wewnątrz przesuwa go w granicach obrazu, ostatnie 10 px prawego dolnego rogu (do 5 px na zewnątrz) zmienia rozmiar z zachowaniem proporcji (decyduje większy z ruchów), najmniej ⅓ wysokości pokazanego obrazu. OK kopiuje wycinek z obrazu źródłowego i `StretchDraw` do rozdzielczości klawiatury.
- **[F]** Nazwa pliku tła: `"map" + liczba + ".jpg"` (exe, 0x00a61efc). Próbka Satel: ekrany dodatkowe o id 2–5 mają w polu obrazu i w `screen_image` `map2.jpg`–`map5.jpg`, czyli liczba = id ekranu. W polu obrazu ekranu jest sama nazwa pliku, bez katalogu.
- **[P]** Ta sama reguła nazwy dla ekranów użytkownika (`map33.jpg`…); próbki z TSH z własnym tłem ekranu użytkownika nie ma. Nazwa „Według motywu” w polu obrazu nieznana. Początkowe położenie prostokąta kadrowania w TSH nie zostało odczytane (port: największy wyśrodkowany).
- Port (wpis 037 rejestru): okno „Karta SD” z pokazem slajdów i kadrowanie tła; pliki tylko do folderu wybranego przez użytkownika, który sam kopiuje go na kartę. Wysyłka przez hub nie istnieje. Port nie usuwa `map/` (ma tylko tła z bieżącej sesji) i usuwa w `photo/` tylko `img*.jpg` po zgodzie; skaluje canvasem z wygładzaniem (piksele wyniku dla `slajd1.jpg` identyczne z TSH, bo obraz nie jest skalowany).

### 2.6 Podgląd TSH Soft: metryki i rysowanie

Źródła (2026-11-14): dekompilacja Ghidra `TSH_soft.exe` 1.00.005 (zrzuty w `~/snap/ghidra/common/tsh/`: `r_ab0cd4.txt`, `r_a9f9d0.txt`, `r_a9d7.txt`, `r_a9c4b4.txt`, `r_aa7fe4.txt`, `d_aa7fe4.txt`, `r_aa01f4.txt`, `aa064c.c`, `r_550b88.txt`), stałe czytane wprost z pliku exe (adres → plik przez nagłówki sekcji PE), metryki czcionek z `dist/tsh/fonts` (tabele `hhea`, `OS/2`, `hmtx`, `cmap`), zrzuty `work/re-tsh/shots` (`saver.png`, `e2.png`, `now.png`, `tsg_scr.png`). Kolumna „Źródło”: **[F] kod** = odczyt z kodu, **[F] zrzut** = pomiar na zrzucie TSH, **[P]** = przypuszczenie.

**Skala podglądu.** **[F] kod** TSH rysuje podgląd od razu w pikselach okna: każda współrzędna i rozmiar czcionki przechodzi przez `FUN_00a9b6c4(v) = Round(v / k)`, gdzie `k` to `double` pod `0xb0c1b0`. **[F] zrzut** Podgląd w oknie 1123×663 zaczyna się w punkcie 238/81: TSH2 617×361 (skala ≈ 0,6023: linia paska ma 617 kolumn, linia siatki x 210 leży w kolumnie 127), TSG2 632×358 (skala ≈ 632/480). `Round` Delphi zaokrągla połówki do parzystej. Czcionki: `Font.Height = −rozmiar`, czyli rozmiar to wysokość em w pikselach. Edytor rysuje te same reguły w pikselach klawiatury (skala 1).

**Tabela metryk** (`FUN_00ab0cd4(form, szerokość, wysokość)`, gałąź `szerokość < 0x321`, globalne `0xb0c0c4..0xb0c0da`):

| Pole | Znaczenie (funkcja) | TSH2 1024×600 | TSG2 480×272 | Źródło |
|---|---|---|---|---|
| `_1436` | wysokość paska stanu, linia paska na tej wysokości (`FUN_00aa7fe4`, `FUN_00a9b794`) | 52 | 26 | [F] kod; TSG2 linia na 26 ([F] zrzut `tsg_scr.png`: 26,6) |
| `_1438/1440/1442` | tekst widżetu, rozmiar 0/1/2 (`FUN_00a9f048`) | 18 / 33 / 54 | 12 / 15 / 25 | [F] kod; TSG2 12 px ([F] zrzut: „Nowe pole tekstowe” 104 px) |
| `_1444/1446/1448` | ikona widżetu `WDGT`, rozmiar 0/1/2 (`FUN_00a9f270`) | 77 / 115 / 180 | 36 / 54 / 84 | [F] kod |
| `_1450` | zegar wygaszacza `hh`, `mm` (Roboto Thin) i dwukropek (Roboto Light, `_1450 >> 1`) (`FUN_00aa064c`) | 256 (dwukropek 128) | 120 (60) | [F] kod; TSH2 [F] zrzut `saver.png` (wysokość cyfr 110 px przy skali 0,6023 = em 154 = Round(256·0,6023)) |
| `_1452` | sekundy wygaszacza (Roboto Light) | 77 | 36 | [F] kod i zrzut (cyfry 33 px = em 46) |
| `_1454/1456/1458` | wskaźnik stanu, rozmiar 0/1/2 (`FUN_00a9f3a8`) | 20 / 36 / 52 | 10 / 16 / 24 | [F] kod |

Pasek stanu ma własne stałe w `FUN_00aa7fe4` (nie z tabeli): **[F] kod** TSH2 nazwa i zegar 26 px, ikona użytkownika 30 px, ikony stanu 40 px, kropki stron 12 px, odstęp od góry 10 px; TSG2 13 / 15 / 20 / 6 / 7 px.

**Metryki czcionek** **[F]** (pliki z exe): Roboto Light i Thin: 2048 jednostek na em, `hhea` 1900/−500, `OS/2` `usWinAscent` 1946, `usWinDescent` 512. `WDGT`: 1000 na em, `usWinAscent` 1004, `usWinDescent` 0, glif 0x31 („1”) szeroki na 1000, czyli 1 em. GDI liczy `TextHeight` z `usWin*`: `round(1946·em/2048) + round(512·em/2048)` (≈ 1,2 em; 12 px → 14, 18 px → 22, 54 px → 65), linia bazowa `round(1946·em/2048)` pod górą. `TextWidth` to suma szerokości znaków. **[P]** zaokrąglanie GDI/wine szerokości i wysokości przy skali 1 (różnice do 1 px); szerokość pogrubienia syntetycznego (pasek stanu).

**Widżety** (`FUN_00a9f9d0`, wywoływany dla każdego widżetu z jego bajtami; podgląd podaje stan „nieaktywny”):
- **[F] kod** Typy ikon (mapa bitów `0x00aa01ec`): 0x06, 0x07, 0x08, 0x21, 0x23, 0x24, 0x25, 0x27, 0x29, 0x31, 0x33–0x37. Glif: `u16` z bajtu 0x13 (ikona nieaktywna); 0x23 napad 0x105/0x106/0x107 według bajtu 0x11; 0x24 informacja 0x11b; 0x25 odsyłacz `u16` z 0x11 (bajt 00 + ikona); 0x31, 0x33–0x37 `u16` z 0x19 (pierwsza ikona; kolory stanów tylko w stanie aktywnym). Glif 0 → 0x22. Kolor cl1 widżetu (albo motywu). Rozmiar ramki = `TextWidth("1") × TextHeight("1")` czcionki `WDGT` (nazwa kroju „u”) w rozmiarze ikony: em × round(1,004·em), np. TSG2 duża 84×84, TSH2 duża 180×181. Glif rysowany `ExtTextOutW` z górnym lewym rogiem komórki w X/Y.
- **[F] kod** Glif poza zakresami firmware jest rysowany jako 0x22 (`FUN_00a5b270` → `FUN_00a5b13c`, tabela `0x00b0b9b8` dla wersji „2.01 2025-12-03”, kod `& 0xfff`): poprawne 0xa9–0x107, 0x110–0x13d, 0x13f–0x1a6, 0x226–0x266, 0x268, 0x26a–0x280, 0x28a–0x28f. Starsze tabele firmware (`0x00b0b980`, `0x00b0b99c`) są węższe. Dotyczy tylko ikon widżetów, nie paska stanu i wskaźników.
- **[F] kod** Wskaźniki (typy 1–3, `FUN_00a9f3a8`): rozmiar `_1454..1458`, ramka `TextWidth("1") × TextHeight("1")` `WDGT` jak ikona. Trzy glify w tym samym punkcie: podkład 0x1df (biały, dla wyjścia `#ff4d4d`), potem pomieszczenie 0x1fc w `#00d9a5` i pierścień 0x1e8 w czerni, wejście 0x1e0 w czerni, wyjście pierścień 0x1e8 w czerni. TColor `$BBGGRR` przeliczone. Kolory widżetu nie są używane. Podkład 0x1df to zaokrąglony kwadrat ([F] zrzut `e2.png`), nie koło.
- **[F] kod** Prostokąt (0x17, `FUN_00a9f63c` → `FUN_00a9f704`): wypełnienie bitmapą 24 bit w kolorze cl2, przycięte do ekranu, nałożone `AlphaBlend` ze stałą alfą = bajt przezroczystości (0x15), czyli krycie = bajt/255 (7 → prawie niewidoczne, [F] zrzut `e7.png`). Ramka (bajt 0x16 & 7, 0 = bez ramki): `Rectangle(x, y, x+w, y+h)` piórem w kolorze cl1 o grubości ramki, środek pióra na krawędzi.
- **[F] kod** Pozostałe typy to tekst (`FUN_00a9f048`): czcionka „Roboto Thin”, gdy rozmiar równa się `_1442` (rozmiar 2), inaczej „Roboto Light”. Tekst z `FUN_00a9d7e0`: 0x00 tekst, 0x05 data (niżej), 0x15/0x16 pierwszy tekst (nieaktywny), 0x30 „000”, „00.0”, „0.00”, „0.000” (miejsca po przecinku 0–3) i jednostka. Wyrównanie (`FUN_00a5cf9c`): bity 2–3 bajtu 7, tylko dla typów z mapy `0x00a5cff4` (0x00, 0x04, 0x05, 0x15, 0x16, 0x26, 0x28, 0x30); 1 = do prawej (lewa krawędź `x − w`), 2 = do środka (`0x08`, lewa krawędź `x − (w >> 1)`), 0 i 3 = do lewej. Tekst rysowany w `(lewa + 1, y)`, ramka `TextWidth × TextHeight`.
- **[F] kod** Ramka zaznaczenia: kolor tła ±0x32 (`FUN_00550110`), przy opcji siatki magentowe linie przez X. Edytor ma własne zaznaczenie.

**Ekrany** (`FUN_00aa064c` rysuje tło i woła `FUN_00aa7fe4` dla paska; typ rekordu w bajcie 17):
- **[F] kod** Pasek stanu (`FUN_00aa7fe4`) na ekranach użytkownika (typ 2 i 3) i dodatkowych (4): nazwa ekranu Roboto Light pogrubiona, kolor cl1, środek ekranu, y = odstęp; zegar `hh:mm:ss` tą samą czcionką, lewa krawędź `W − (TextWidth("00:00:00") + 3·ikona użytkownika)`, czyli prawa krawędź na `W − 90` (TSH2) / `W − 45` (TSG2); glif użytkownika 0x21 w `(W − 2·ikona, 7)`; linia 1 px w kolorze cl1 na y = `_1436` od 0 do W.
- **[F] kod** Ikony stanu 0xa4, 0xa2, 0xa6, 0xa8 tylko na TSH2 (warunek `szerokość ≠ 480`), na każdym ekranie z paskiem, nie tylko głównym ([F] zrzut `e2.png`, „Ekran 2”): x = 4 + i·60, y = 4, 40 px. TSG2 nigdy ([F] zrzut `tsg_scr.png`).
- **[F] kod** Wygaszacz (typ 1): TSH2 tylko cztery ikony stanu wyśrodkowane, x = (W − 240) / 2 + 4 + i·60, y = 4; bez nazwy, zegara paska, ikony użytkownika i linii. TSG2 bez niczego z paska.
- **[F] kod** Kropki stron tylko na ekranach użytkownika: glify `WDGT` 0x1f6 (bieżący ekran) i 0x1f7 (pozostałe), białe, 12 px (TSG2 6 px); odstęp `TextWidth(0x1f7) + 2` (14 / 8 px przy skali 1), początek `(W − n·odstęp) / 2`, y = `H − _1436 − odstęp / 2` (góra komórki glifu).
- **[F] kod** Siatka (`FUN_00aa0288`, ekrany typu > 1 z bitem 0x10): kolor cl1, linia 1 px, margines m = 20. Szerokość pola `(W − 6m) div 5` (180 / 72), wysokość `(H − _1436 − 3m) div 2` (244 / 93). Linia pozioma na y = `_1436 + (H − _1436) div 2` (326 / 149), w pięciu odcinkach od `m + k·(pole + m)` do `+ pole`; linie pionowe na x = `m/2 + k·(pole + m)`, k = 1–4 (210, 410, 610, 810 / 102, 194, 286, 378), w dwóch odcinkach od `_1436 + m` przez wysokość pola, z przerwą m na linii poziomej. Siatka rysuje też linię paska na y = `_1436`.
- **[F] kod** Zegar wygaszacza (gdy nie „Bez zegara”): tekst `FormatDateTime("hh:mm")`. Dwukropek Roboto Light `_1450 >> 1` w `((W − w(":")) div 2, (H − h(":")) div 2 − _1436)`. Godziny Roboto Thin `_1450`: `x = (W − w(":")) div 2 − w(hh)`, minuty `x = (W + w(":")) div 2`, oba `y = (H − h("00")) div 2 − _1436 + 8`. Sekundy (`"ss"`) Roboto Light `_1452` w `(Round(W · 0,83), Round(H · 0,45))` (stałe 80-bit `0xaa18e8` = 0,83, `0xaa18f4` = 0,45). Sprawdzone na `saver.png` (skala 0,6023, podgląd 617×361): ostatni wiersz tuszu cyfr 207, dwukropka 175, sekund 205, czyli wiersz nad obliczonymi liniami bazowymi 208, 176 i 206.
- **[F] kod** Tło białe (cl3 = `ffffff`) dostaje w podglądzie szarą ramkę `c0c0c0` (`FUN_00aa01f4`); edytor ma własną ramkę.

**Data/czas** (`FUN_00a9cc5c`): **[F] kod** format z widżetu najpierw przechodzi przez zamiany z rozróżnieniem wielkości liter, każda na całym tekście od lewej, bez ponownego skanowania wstawionego tekstu (`FUN_00a9ca98`), w tej kolejności: `dddddd` → `dd MMMM yyyy`, `ddddd` → `dd-MM-yyyy`, `mm` → `nn`, `m` → `n`, `tt` → `hh:nn:ss`, `t` → `hh:nn`, `c` → `yyyy-MM-dd hh:nn:ss`. Zamiany obejmują też tekst w cudzysłowach. Wynik idzie do Delphi `FormatDateTime` (`FUN_0042dd1c`) z ustawieniami regionalnymi TSH (`0xb0d668`). Gdy język TSH to „PL”, pierwsza znaleziona w wyniku mianownikowa nazwa miesiąca z tabeli `0x00ade260` jest zamieniana na dopełniacz (styczeń → stycznia … grudzień → grudnia), więc `MMMM` daje „listopada”. Małe `m` oznacza więc zawsze minuty, a miesiąc tylko wielkie `M` (Delphi zamienia `M` po `h` też na minuty). **[P]** skąd TSH bierze ustawienia regionalne (nazwy dni, `ddd`, separator `/`): edytor używa nazw według języka wejścia (`pl`: „sob.”, „sobota”, „lis”, separator daty `.`; inne: angielskie, `/`).

**Zostaje [P] / zrzuty z planu 4.4:** potrzebne nie są do metryk. Do ewentualnego sprawdzenia: zaokrąglenia GDI przy skali 1, pogrubienie syntetyczne paska, ustawienia regionalne dat (zrzut 5), wyrównanie do prawej (bity 2–3 = 1) w interfejsie TSH (zrzut 8: czy TSH w ogóle je ustawia).

## 3. Zasoby w exe (RT_RCDATA)

- `TFORMTSH2`: główny formularz edytora (492 KB, z obrazkami). `TFORMSD`: karta SD. `TFORMLANG`: wybór języka.
- `INIFILE`: około 20 motywów (`cl1`, `cl2`, `cl3`, `bg`). `BG_*`: 12 teł JPG.
- `ROBL`, `ROBT`: czcionki Roboto.
- `WDGT`: czcionka TrueType z ikonami widżetów, 620 znaków od 0x1a do 0x28f. **[F]** Id ikony w danych to kod znaku w tej czcionce, sprawdzone renderowaniem: 0x11d OFF, 0x11e ON, 0x121/0x123 czujka, 0x124/0x126 wyjście, 0xfa pinezka mapy, 0x249 krzyżyk, 0x28a–0x28f tarcze czuwania.
- `LAN/TSH_soft.XX`: biblioteki DLL Delphi z tłumaczeniami (19 języków).

## 4. Narzędzia i próbki

- `work/re-tsh/` (w `.gitignore`): kopia exe, próbki `samples/NNN.json` z opisami w `labels.txt`, skrypty do sterowania TSH pod wine (`loop-tsh.sh`, `x.py`, `ok.sh`, `addw2.sh`, `pos.sh`, `shot.sh`) i dekoder `parse.py`.
- Prefiks wine: `~/.local/share/wineprefixes/tsh`. Projekt Ghidry: `~/snap/ghidra/common/tsh` (snap nie widzi `/mnt`), uruchamiany z `GHIDRA_HEADLESS_MAXMEM=6G`, bo przy 2 GB brakuje pamięci.
- Kodek (dekoder i koder blobu) w `work/working/src/renderer/app/desktop/tshEditor/tshBlob.js`, próbki w `work/working/test/fixtures/tsh-samples.json`, testy: `npm --prefix work/working/tools test`. `work/working/tools/tsh-blob.mjs` zostaje dekoderem referencyjnym (wyrocznia testów).
- Funkcje TSH: `FUN_00aa1acc` (TSH2SetLCD, rozdzielczość), `FUN_00ab367c` (TSxInit), `FUN_00a5ed24` (`Fields_LBx2Bytes`, lista → bajty), `FUN_00a5e7c0` (`Fields_Bts2LBx`), `FUN_00aa1900` (kontrola CRC pola).

## 5. Do zrobienia przed portem

1. Pola, które zostały **[P]**: bajty 2–6 nagłówka ekranu (stałe `00 20 00 20 20`, wystarczy je kopiować), pierwsze 7 bajtów pól sceny i trybu (zawsze `00`), opcja „Niedostępne w czuwaniu” w widżetach czuwania (tam kliknięcie nie zmieniło danych), znaczenie bitów 0–1 „Stan”. Próbki 042–090 opisane w `labels.txt` mają po jednej zmianie właściwości.
2. Test na klawiaturze dopiero przy porcie, po zgodzie użytkownika na zapis. Odczytu z huba nie robimy.
3. Obrazy użytkownika: potwierdzić katalog `graphics` i nazwy plików (2.5).
4. Decyzja o kształcie portu: ekran React tylko dla desktopu, w miejscu dzisiejszej blokady TSH (przepis 01).
