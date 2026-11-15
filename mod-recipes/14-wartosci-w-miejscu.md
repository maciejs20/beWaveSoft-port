# 14. Wartość i opcja wybierane w miejscu

- **Wpisy rejestru:** 016
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** 1.1.0-port.2
- **Wymagania:** 2 („Normalny” otwierał okno „Wybierz wartość”), 9 (wybór opcji akcji otwierał kolejne okno)

## Cel
`SelectOption` w aplikacji to przycisk otwierający osobne okno z listą opcji. W edytorze rutyn każda wartość warunku i opcja akcji wymagała więc dodatkowego okna i kliknięcia.

## Zachowanie
- W „Ustaw warunek” i „Ustaw akcję” każdy wybór opcji jest w miejscu:
  - **do 8 opcji**: rząd przycisków (zawijany), każdy z ramką 1 px i zaokrągleniem 6 px, tekst 13 px; wybrany ciemny z jasnym tekstem; nad nimi etykieta pola (`buttonLabel`) 12 px;
  - **powyżej 8 opcji**: natywna lista rozwijana `<select>` (wysokość 36 px, szerokość 100 %), z pustą pozycją na początku, gdy nic nie jest wybrane.
- Komunikat błędu pola (`error`) pod kontrolką, w kolorze ostrzeżenia.
- Dotyczy pól: wartość warunku (`automation.condition.set.value` „Wartość”), wartość akcji (etykieta z definicji akcji), usterki systemowe (`system_failures`), karta NFC, użytkownik (`USER`) i kategoria powiadomienia push w akcji powiadomienia.
- Dostępność: grupa `radiogroup`, przyciski `radio` z `checked`, `aria-label` listy.
- Poniżej 900 px przy otwarciu: oryginalny `SelectOption` z oknem.

## Punkty zaczepienia
- `<SelectOption2.SelectOption` (eksport `SelectOption`, w 1.2.0: 33 trafienia; zmieniamy tylko wystąpienia w czterech plikach poniżej):
  - `AutomationConditionValueInput` (eksport), kotwica `buttonLabel={p("automation.condition.set.value")} modalHeader={p("automation.condition.set.select_value")}`,
  - `AutomationActionValueInput` (eksport), gałąź `options2 != null && options2.length` (po gałęzi koloru `GetColorActionValue`),
  - `AutomationConditionSetScreen`: `vA.additionalOptions` z `buttonLabel={oA("system_failures")}` oraz pole NFC (`NFC_CARD_READ`, `encodeByteArrayToHex`, `` `${cardName} [${login}]` ``),
  - `AutomationActionSetScreen`: pola użytkownika (`buttonLabel={H("USER")}`) i kategorii push (`HubEvent_Type`).
- Kontrakt `SelectOption`: `selectedOptionKey`, `options` (`[{ key, label }]`), `onChange(option)`, `error`, `buttonLabel`, `modalHeader`.

## Implementacja
1. Nowy plik `src/renderer/app/logic/DesktopValuePicker.js` (kopiuj bez zmian). Eksporty:
   - `DesktopValuePicker(props)`: kontrolka w miejscu jak w „Zachowanie”; `MAX_BUTTONS = 8`; `onChange` dostaje cały obiekt opcji (porównanie klucza przez `String(entry.key) === event.target.value` dla `<select>`).
   - `AdaptiveSelectOption(props)`: `useRef(isDesktopEditor()).current ? <DesktopValuePicker {...props} /> : <SelectOption {...props} />`.
2. We wszystkich wymienionych wystąpieniach zamień `<SelectOption2.SelectOption` na `<DesktopValuePicker2.AdaptiveSelectOption` i dodaj `require("./DesktopValuePicker.js")` (z ekranów `../logic/DesktopValuePicker.js`). Właściwości bez zmian. `SelectOption` się nie zmienia.

## Zależności
Przepis 08.

## Sprawdzenie
1. „Ustaw warunek” dla „Stan wejścia”: wartości (Normalny, Naruszenie, Sabotaż, …) jako przyciski, klik zmienia wybór bez okna.
2. Akcja „Włącz/wyłącz”: przyciski „Włącz”, „Wyłącz”, „Przełącz” (lub z centrali).
3. Pole z ponad 8 opcjami (np. kategoria powiadomienia push): lista rozwijana.
4. Formularz z błędem walidacji: komunikat pod kontrolką.
5. Okno < 900 px: przycisk otwierający okno jak w oryginale.

## Ryzyka przy nowej wersji
- Natywny `<select>` w RNW: piszemy go wprost jako element DOM w JSX (`select`, `option`), co działa, bo renderer to React DOM. React 19 nie zmienia obsługi `value` w `<select>`.
- Jeśli `SelectOption` w 1.2.0 dostanie nowe właściwości (np. `disabled`, grupy opcji, wyszukiwanie), `DesktopValuePicker` musi je obsłużyć albo w takim przypadku oddawać sterowanie oryginałowi.
- Nowe pola z `SelectOption` w tych ekranach trzeba świadomie dodać lub pominąć. Wyszukaj wszystkie `SelectOption` w czterech plikach.
