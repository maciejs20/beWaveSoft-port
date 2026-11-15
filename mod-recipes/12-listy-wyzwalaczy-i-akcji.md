# 12. Listy „Wybierz wyzwalacz” i „Wybierz akcję”

- **Wpisy rejestru:** 014, 019
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** 1.1.0-port.2 (014 jako dwie kolumny, 019 zmienia na jedną)
- **Wymagania:** 1, 5, 6, 8, 11

## Cel
Lista wyzwalaczy miała 22 pozycje w jednej kolumnie z dużymi radiami, widać było ok. 10, „Stan wejścia” był szesnasty, a „Naruszenie” ostatnie. Lista akcji podobnie. Okna nie miały skrótów klawiszowych. Przy edycji wybrana pozycja mogła być poza widokiem.

## Zachowanie
Na ekranach „Wybierz wyzwalacz” (`automation.condition.select-trigger.select_trigger`) i „Wybierz akcję” (`automation.action.select-trigger.select_action`) lista radiów jest zastąpiona zwartą listą:
- **Pole szukania** na górze (`automation.picker.search`: „Szukaj…” / „Search…”), z fokusem po otwarciu (po 50 ms). Filtruje od razu po fragmencie nazwy, bez znaczenia wielkości liter i polskich znaków (`lodash.deburr`: „lazienka” = „Łazienka”).
- **Sekcja „Częste”** (`automation.picker.frequent`: „Częste” / „Frequent”) ze stałą listą, w tej kolejności, z pominięciem pozycji niedostępnych na centrali:
  - wyzwalacze: Stan wejścia (`INPUT_STATE` 26), Naruszenie (`VIOLATION` 37), Detekcja ruchu (`SENSOR_MOTION` 6), Detekcja otwarcia (`SENSOR_MAGNETIC` 10), Data i czas (`CRON_EXPRESSION` 4);
  - akcje: Włącz/wyłącz (`SET_ON_OFF` 0), Uruchom scenę (`RUN_SCENE` 20), Powiadomienie (`INVOKE_NOTIFICATION` 22), Generuj gong (`INVOKE_CHIME` 23).
  - Przy każdej częstej pozycji etykieta `Alt+1` … `Alt+9`.
- **Sekcja „Wszystkie”** (`automation.picker.all`: „Wszystkie” / „All”) z pozostałymi pozycjami w kolejności z centrali. Rozwinięta od razu, gdy pozostałych jest najwyżej 30 (praktycznie zawsze) albo gdy wybrana pozycja jest wśród nich. W przeciwnym razie odnośnik `automation.picker.show_all` („Pokaż wszystkie ({{count}})”).
- **Wiersz:** jedna kolumna (szerokość 100 %), wysokość 32 px, ikona 16 px, nazwa 14 px w jednej linii, po prawej kółko 12 px wypełnione przy wybranej pozycji. Wybrany wiersz ma ciemną ramkę i tło tła strony, podświetlony (klawiaturą) szarą ramkę, pozostałe jasne tło `secondary50`.
- **Podczas szukania** widać tylko trafienia, bez podziału na sekcje, a pierwsze trafienie jest podświetlone. Brak trafień: pusta lista.
- **Wybrana pozycja na widoku:** podświetlenie startuje od wybranej pozycji i jest przewijane do widoku (`scrollIntoView({ block: "nearest" })`).
- **Klawisze** (nasłuch na `window` w fazie capture, tylko gdy ekran ma fokus nawigacji; ignorowane podczas kompozycji IME):

| Klawisz | Działanie |
|---|---|
| `Alt+1` … `Alt+9` (przez `event.code` `Digit1`…`Digit9`) | wybiera n-tą częstą pozycję (również w polu szukania) |
| `/` poza polem edycyjnym | fokus w polu szukania |
| `↑` `↓` (w polu szukania albo poza polami) | ruch podświetlenia po widocznych pozycjach |
| `Enter` (bez `repeat`, w polu szukania albo poza polami) | podświetlona ≠ wybrana: wybiera ją; podświetlona = wybrana i bez szukania: przechodzi dalej (jak przycisk „Dalej”) |
| `Esc` przy tekście w polu | czyści szukanie (zatrzymuje `Esc`) |
| `Esc` w pustym polu | oddaje `Esc` stronie, czyli zamyka krok (przepis 11) lub panel (przepis 15) |

- **Zmiana wyzwalacza lub akcji zachowuje pasujące urządzenia** (reguła bezpieczeństwa 3): przy wyborze innej pozycji nowe wyrażenie dostaje `deviceIds` przefiltrowane przez `carryDevices` (urządzenia, które nowy wyzwalacz/akcja akceptuje). Gdy coś usunięto, pod polem szukania pojawia się klikalny tekst `automation.picker.devices_removed` („Usunięto niepasujące urządzenia: {{count}}. Kliknij, aby cofnąć.”), który przywraca poprzednie wyrażenie. Oryginał zerował wybór urządzeń bez śladu.
- Na liście akcji wybór przechodzi przez `desktopInitialAction` (przepis 09), więc „Włącz/wyłącz” startuje od „Włącz”.
- Zakładki „Warunek / Grupa warunków” i reszta ekranu bez zmian. Przycisk „Dalej” (`NEXT` / `common.next`) działa jak dawniej.
- Poniżej 900 px przy otwarciu ekranu: lista radiów jak w oryginale.

## Punkty zaczepienia
- `AutomationConditionSelectTriggerScreen`: `{W.map(function (item6) { return <RadioButton2.RadioButton value={`${item6.conditionTrigger}`} title={item6.name} leftIcon={item6.icon} isChecked={item6.conditionTrigger === values.expression?.trigger} …`; dane z `GetAutomationConditionTriggerButtonsInfo(triggers)` (eksport modułu `GetInitialConditionExpression`), zmiana przez `setFieldValue("expression", GetInitialConditionExpression(r))`.
- `AutomationActionSelectTriggerScreen`: `{Z.map(function (item5) { return <RadioButton2.RadioButton value={item5.type.toString()} … isChecked={item5.type === values.type}`; dane z `GetAutomationActionTriggerButtonsInfo(actions2)`, zmiana przez `V(GetInitialAction(n))` (setter stanu początkowego Formika z `enableReinitialize`).
- Nazwy enumów `SceneScenario_Condition_Trigger.*`, `SceneScenario_Action_Type.*`.

## Implementacja
1. Nowy plik `src/renderer/app/logic/DesktopOptionPicker.js` (kopiuj bez zmian). Eksporty `DesktopOptionPicker`, `CONDITION_FREQUENT_TRIGGERS`, `ACTION_FREQUENT_TYPES`. Właściwości komponentu:
   - `items`: `[{ key, name, icon }]`,
   - `selectedKey`, `frequentKeys`,
   - `onSelect(key)`: to, co robiło `onChange` radia,
   - `onConfirm()`: `handleSubmit` Formika (przycisk „Dalej”),
   - `notice`: `{ count, undo }` albo `null`.
   Stałe: `MAX_COLLAPSED_REST = 30` (019; w 014 było 6), `cell.width = "100%"` (019; w 014 `"50%"`).
2. W obu ekranach: `var desktopPath = useRef(DesktopEditor.isDesktopEditor()).current;` oraz `var removedNotice = useState(null);`, a lista radiów:
   ```js
   {desktopPath ? <DesktopOptionPicker
       items={W.map((i) => ({ key: i.conditionTrigger, name: i.name, icon: i.icon }))}
       selectedKey={values.expression?.trigger}
       frequentKeys={CONDITION_FREQUENT_TRIGGERS}
       onConfirm={handleSubmit}
       onSelect={(n) => { if (values.expression?.trigger !== n) {
         var r = triggers.find((t) => t.type === n);
         var previous = values.expression;
         var carried = DesktopEditor.carryDevices(previous?.deviceIds, r.devices);
         setFieldValue("expression", Object.assign({}, GetInitialConditionExpression(r), { deviceIds: carried.kept }));
         removedNotice[1](carried.removed > 0 ? { count: carried.removed, undo: () => { setFieldValue("expression", previous); removedNotice[1](null); } } : null);
       } }}
       notice={removedNotice[0]} />
     : <dotychczasowe W.map(...RadioButton...)>}
   ```
   Dla akcji: `key: item.type`, `selectedKey={values.type}`, `ACTION_FREQUENT_TYPES`, `n = actions2.find(a => a.type === e)`, `carryDevices(previous.deviceIds, n.devices)`, nowa wartość `Object.assign({}, desktopInitialAction(GetInitialAction(n)), { deviceIds: carried.kept })` przez `V(...)`, cofnięcie `V(previous)`.
3. i18n, blok `automation.picker` (cały blok opisany w przepisach 12–18; tu klucze tego przepisu):

| Klucz | pl | en |
|---|---|---|
| `search` | Szukaj… | Search… |
| `frequent` | Częste | Frequent |
| `all` | Wszystkie | All |
| `show_all` | Pokaż wszystkie ({{count}}) | Show all ({{count}}) |
| `devices_removed` | Usunięto niepasujące urządzenia: {{count}}. Kliknij, aby cofnąć. | Removed non-matching devices: {{count}}. Click to undo. |

## Zależności
Przepisy 08 (`isDesktopEditor`, `carryDevices`), 09 (`desktopInitialAction`). Przepis 15 osadza te ekrany w panelu.

## Sprawdzenie
1. „Wybierz wyzwalacz”: sekcja „Częste” z pięcioma pozycjami i etykietami `Alt+1`…`Alt+5`, pod nią „Wszystkie”, jedna kolumna, kropka przy wybranej.
2. Wpisanie „stan”: lista zawęża się do „Stan wejścia”, pierwsze trafienie podświetlone; `Enter` wybiera, drugi `Enter` (po wyczyszczeniu lub gdy wybrana = podświetlona i bez szukania) przechodzi dalej. `Esc` czyści szukanie, drugi `Esc` zamyka krok.
3. `Alt+2` wybiera „Naruszenie”.
4. Edycja warunku z rzadkim wyzwalaczem: pozycja widoczna i podświetlona bez przewijania.
5. Warunek „Stan wejścia” z urządzeniami → zmiana na „Detekcja ruchu”: pasujące urządzenia zostają, komunikat o usuniętych, klik cofa.
6. „Wybierz akcję”: częste Włącz/wyłącz, Uruchom scenę, Powiadomienie, Generuj gong.
7. Okno < 900 px: radia jak w oryginale.

## Ryzyka przy nowej wersji
- Numery enumów mogą się zmienić, ale stałe są oparte na nazwach (`Trigger.INPUT_STATE`), więc wystarczy, że nazwy zostaną. Sprawdź, czy nowe wyzwalacze lub akcje nie powinny trafić do „Częstych” (decyzja użytkownika: stała lista).
- `TextInput` z RNW 0.21: obejście `Esc` zakłada, że `TextInput` zatrzymuje propagację `keydown`; jeśli przestanie, `Esc` w pustym polu zamknie krok dwa razy (nasze sztuczne zdarzenie i oryginalne). Sprawdź i ewentualnie usuń sztuczne `dispatchEvent`.
- `accessibilityRole="radio"`/`accessibilityState` mogą wymagać zamiany na `role`/`aria-checked` w RNW 0.21.
- `useFocusEffect` (`@react-navigation`) bez tablicy zależności rejestruje nasłuch przy każdym renderze; w nowej wersji nawigacji może to wymagać `useCallback`.
