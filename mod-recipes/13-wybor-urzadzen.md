# 13. Wybór urządzeń z szukaniem, zwiniętymi pomieszczeniami i etykietami

- **Wpisy rejestru:** 015
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** 1.1.0-port.2
- **Wymagania:** 2, 9 (wybór elementu dla akcji bez przewijania)

## Cel
W „Ustaw warunek” i „Ustaw akcję” lista pomieszczeń z urządzeniami (`RoomWithDeviceGroup`) miała wszystkie pomieszczenia rozwinięte (na centrali testowej autora 16 pomieszczeń, 46 urządzeń przy „Stan wejścia”), duże wiersze ok. 48 px i duże litery, bez szukania. Widać było ok. 2 pomieszczenia naraz.

## Zachowanie
- **Pole szukania** `automation.picker.search_devices` („Szukaj urządzenia lub pomieszczenia…” / „Search device or room…”), fokus po otwarciu (po 80 ms, jeśli fokus nie jest już w innym polu). Filtruje po fragmencie nazwy urządzenia **albo** pomieszczenia (`deburr`, bez wielkości liter). Pasujące pomieszczenie pokazuje wszystkie swoje urządzenia. Pomieszczenia bez trafień znikają. Brak trafień: `automation.picker.no_results` („Brak wyników”).
- **Elementy formularza przekazane jako `children`** (przełącznik operatora urządzeń „Lub/Oraz/Suma”, `AutomationConditionDeviceOperator`) pokazują się pod polem szukania, z odstępem 12 px.
- **Etykiety wybranych** nad listą: każda wybrana pozycja jako zaokrąglona etykieta (24 px) z nazwą i `×`; klik usuwa ją z wyboru. Urządzenie wybrane, ale niepasujące do bieżącego filtra (np. do wartości „Maskowanie”), ma pomarańczową ramkę i dopisek `(nie pasuje)` (`automation.picker.not_matching`: „nie pasuje” / „does not match”). Nieznane urządzenie: `?`.
- **Pomieszczenia zwinięte**, z nagłówkiem 32 px: `▸`/`▾`, nazwa (14 px, pogrubiona), licznik `wybrane/wszystkie` (np. `1/2`). Na starcie rozwinięte są tylko pomieszczenia z wybranymi urządzeniami. Podczas szukania wszystkie pasujące są rozwinięte. Klik w nazwę zwija lub rozwija. Zaznaczenie urządzenia w zwiniętym pomieszczeniu (np. przez szukanie) rozwija je.
- **Zaznacz/odznacz widoczne:** w nagłówku rozwiniętego pomieszczenia odnośnik `automation.picker.select_visible` („zaznacz ({{count}})”) albo `automation.picker.deselect_visible` („odznacz ({{count}})”), działający tylko na **widoczne** urządzenia tego pomieszczenia (przy szukaniu: tylko trafienia).
- **Wiersze urządzeń** w dwóch kolumnach, 30 px, pole wyboru 16 px z `✓`, nazwa 13 px w jednej linii.
- **Klawisze** (capture na `window`, przy fokusie ekranu, bez kompozycji IME):

| Klawisz | Działanie |
|---|---|
| `/` poza polem edycyjnym | fokus w polu szukania |
| `↑` `↓` (w polu szukania albo poza polami) | ruch podświetlenia po widocznych urządzeniach, z przewinięciem do widoku |
| `Enter` w polu szukania (bez `repeat`) | przełącza zaznaczenie podświetlonego urządzenia (przy szukaniu pierwsze trafienie jest podświetlone) |
| `Spacja` poza polem edycyjnym | przełącza zaznaczenie podświetlonego urządzenia |
| `Esc` przy tekście | czyści szukanie |
| `Esc` w pustym polu | oddaje `Esc` stronie (zamyka krok lub panel) |

- `Enter` w szukaniu nigdy nie zatwierdza formularza.
- Przy wyzwalaczu „Przycisk” (`BUTTON`) zostaje stara lista przycisków (`DeviceButtons`), bo ekran i tak nie renderuje tam `RoomWithDeviceGroup`.
- Reguły, które urządzenia pasują do wyzwalacza lub akcji (`filter`), bez zmian.
- Poniżej 900 px przy otwarciu: oryginalny `RoomWithDeviceGroup`.

## Punkty zaczepienia
- `AutomationConditionSetScreen` i `AutomationActionSetScreen`: `<RoomWithDeviceGroup2.RoomWithDeviceGroup setAllSwitch={false} setGroupSwitch={true} showNoDevicesInfo={false} selected={values.deviceIds} setSelected={…} filter={…}>…</RoomWithDeviceGroup2.RoomWithDeviceGroup>` (w warunku z dziećmi: operator urządzeń za `sceneExpressionDevOperator`). Eksport `RoomWithDeviceGroup` (w 1.2.0: 8 trafień).
- Dane urządzeń: `hubDevicesBaseChangeListener()` (eksport modułu `hubVirtualDevicesChangeListener`), pola `device.key` (`uuid`, `uuidChannel`), `device.name`, `device.room.{id,name}`. Porównanie kluczy `DeviceKeyEqual` (porównuje `uuid` i `uuidChannel`).

## Implementacja
1. Nowy plik `src/renderer/app/logic/DesktopDevicePicker.js` (kopiuj bez zmian). Eksport `DesktopDevicePicker` z tym samym kontraktem co `RoomWithDeviceGroup`: `selected` (tablica kluczy), `setSelected(keys)`, `filter(device)`, `children`. Pozostałe właściwości (`setAllSwitch`, `setGroupSwitch`, `showNoDevicesInfo`) są ignorowane.
   - Lista: `hubDevicesBaseChangeListener().filter(filter)`, grupowanie po `device.room.id` w kolejności występowania.
   - Stan: zapytanie, zbiór rozwiniętych pomieszczeń (inicjalnie te z wybranymi), klucz podświetlenia.
2. W obu ekranach „Ustaw…”, zaraz po `var appNavigation = …`:
   ```js
   var DevicePicker = (0, react.useRef)(DesktopEditor.isDesktopEditor() ? DesktopDevicePicker2.DesktopDevicePicker : RoomWithDeviceGroup2.RoomWithDeviceGroup).current;
   ```
   i znacznik `<RoomWithDeviceGroup2.RoomWithDeviceGroup …>…</RoomWithDeviceGroup2.RoomWithDeviceGroup>` zamień na `<DevicePicker …>…</DevicePicker>` (wszystkie właściwości bez zmian). `RoomWithDeviceGroup` nie jest modyfikowany, bo używają go też inne ekrany.
3. i18n `automation.picker`:

| Klucz | pl | en |
|---|---|---|
| `search_devices` | Szukaj urządzenia lub pomieszczenia… | Search device or room… |
| `not_matching` | nie pasuje | does not match |
| `no_results` | Brak wyników | No results |
| `select_visible` | zaznacz ({{count}}) | select ({{count}}) |
| `deselect_visible` | odznacz ({{count}}) | deselect ({{count}}) |

## Zależności
Przepis 08. Przepis 12 (zmiana wyzwalacza zachowuje pasujące urządzenia) i 15 (panel) z nim współpracują.

## Sprawdzenie
1. „Ustaw warunek” dla „Stan wejścia”: pomieszczenia zwinięte z licznikami, pole szukania z fokusem.
2. Wpisanie „okno”: tylko pasujące urządzenia, pierwsze podświetlone; `Enter` zaznacza, `↓` + `Enter` zaznacza kolejne, etykiety nad listą. `Esc` czyści szukanie.
3. Wartość „Maskowanie” przy wybranych urządzeniach: etykieta „(nie pasuje)” z pomarańczową ramką.
4. „zaznacz (3)” w pomieszczeniu podczas szukania zaznacza tylko trzy widoczne.
5. Wyzwalacz „Przycisk”: stara lista przycisków.
6. Okno < 900 px: oryginalna lista.

## Ryzyka przy nowej wersji
- Jeśli `RoomWithDeviceGroup` zmieni kontrakt (np. `filter` dostanie inny obiekt albo `setSelected` przyjmie funkcję aktualizującą), dopasuj `DesktopDevicePicker`.
- Pole `device.room` z `hubDevicesBaseChangeListener` może zmienić kształt; zgrupuj wtedy przez `ResolveRoomName` jak w tabeli obiektów (przepis 19).
- `scrollIntoView` na elemencie `View` wymaga, by RNW przekazywał `ref` do węzła DOM. W RNW 0.21 tak jest, ale sprawdź.
