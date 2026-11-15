# 09. Domyślne „Włącz” i „Stan wejścia”, bez zielonego komunikatu

- **Wpisy rejestru:** 010, 011, 023
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** 1.1.0-port.2
- **Wymagania:** 3, 9 (domyślne „Włącz”, komunikat po zapisie akcji), decyzja użytkownika dla 023 („Stan wejścia” to najczęstszy wyzwalacz: 16 z 25 warunków w danych z logu)

## Cel
Trzy drobne poprawki kroków „Wybierz wyzwalacz/akcję” i „Ustaw warunek/akcję”, które przyspieszają typową pracę:
1. Nowa akcja „Włącz/wyłącz” zaczynała od „Wyłącz”, bo aplikacja bierze pierwszą opcję listy, a ta zaczyna się od „off”.
2. Po „Zapisz” w warunku lub akcji zielony komunikat zakrywał dół ekranu, a zmianę i tak widać w podsumowaniu rutyny.
3. Nowy warunek zaczynał od pierwszego wyzwalacza listy, a najczęściej wybierany jest „Stan wejścia”.

## Zachowanie
- **010, akcja „Włącz/wyłącz” (`SET_ON_OFF`):** nowa akcja (albo zmiana typu akcji na „Włącz/wyłącz”) ma wartość `"1"` („Włącz”). Kolejność opcji na liście zostaje oryginalna. Edycja istniejącej akcji zachowuje jej zapisaną wartość (`params.action` ma pierwszeństwo).
- **011, komunikat:** po „Zapisz” w „Ustaw warunek” i „Ustaw akcję” ekran wraca do rutyny (`pop(2)`) **bez** komunikatu `automation.condition.set.success.condition_has_been_succesfully_added`/`…_edited` („Warunek "{{name}}" został dodany.”/„…zmieniony.”) i `automation.action.set.success.action_has_been_succesfully_added`/`…_edited` („Akcja "{{name}}" została dodana do sceny / rutyny”/„…zmieniona.”). Komunikaty błędów i zapisu całej rutyny zostają (zapis rutyny: przepis 16).
- **023, nowy warunek:** „Wybierz wyzwalacz” przy dodawaniu warunku ma zaznaczony „Stan wejścia” (`SceneScenario_Condition_Trigger.INPUT_STATE` = 26), o ile centrala go oferuje. Jeśli nie, pierwszy wyzwalacz z listy jak w oryginale. Edycja istniejącego warunku pokazuje jego wyzwalacz.
- Poniżej 900 px wszystko jak w oryginale.

## Punkty zaczepienia
- `AutomationActionSelectTriggerScreen` (eksport o tej nazwie): `GetInitialAction.BuildViewModel)(actions2[0])` w inicjalizacji `useState` (`params.action ?? …`) i `GetInitialAction.GetInitialAction)(n)` w `onChange` radia typu akcji. Eksporty `BuildViewModel`, `GetInitialAction`, `GetAutomationActionTriggerButtonsInfo` modułu `GetInitialAction`.
- `AutomationConditionSetScreen`, `AutomationActionSetScreen`: `appNavigation.pop(2);` tuż przed `showToast({ type: "success", message: … "condition_has_been_succesfully_added" … })` i odpowiednio `"action_has_been_succesfully_added"`. W 1.2.0 te klucze występują po 23 razy (głównie w tłumaczeniach), w ekranach po jednym wywołaniu.
- `AutomationConditionSelectTriggerScreen`: `GetInitialConditionExpression.BuildViewModel)(triggers[0], params.isFirstCondition)` w gałęzi bez `params.condition`. Enum `SceneScenario_Condition_Trigger.INPUT_STATE`.

## Implementacja
1. **010:** funkcja `desktopInitialAction(action)` z `DesktopEditor` (przepis 08): jeśli `isDesktopEditor()`, `action.type === SET_ON_OFF` i `action.value === "0"`, zwraca kopię z `value: "1"`, inaczej `action` bez zmian. Owiń nią oba miejsca tworzenia nowej akcji:
   ```js
   return params.action ?? DesktopEditor.desktopInitialAction((0, GetInitialAction.BuildViewModel)(actions2[0]));
   V(DesktopEditor.desktopInitialAction((0, GetInitialAction.GetInitialAction)(n)));
   ```
   Nie zmieniaj `GetInitialAction` ani listy opcji: są współdzielone. W przepisie 12 ta sama funkcja jest w `onSelect` nowej listy akcji.
2. **011:** przed wywołaniem `showToast` sukcesu w obu ekranach „Ustaw…” dodaj `if (!DesktopEditor.isDesktopEditor())`.
3. **023:** przed `return` gałęzi nowego warunku:
   ```js
   var initialTrigger = DesktopEditor.isDesktopEditor() && triggers.find(function (item) {
     return item.type === ExpanderInputType.SceneScenario_Condition_Trigger.INPUT_STATE;
   }) || triggers[0];
   return (0, GetInitialConditionExpression.BuildViewModel)(initialTrigger, params.isFirstCondition);
   ```

## Zależności
Przepis 08.

## Sprawdzenie
1. Nowa rutyna → „Wykonaj” → „Włącz/wyłącz” → dalej: zaznaczone „Włącz”. Edycja istniejącej akcji „Wyłącz”: zostaje „Wyłącz”.
2. Zapisz warunek i akcję: powrót do rutyny bez zielonego komunikatu, zmiana widoczna w podsumowaniu.
3. Nowy warunek: zaznaczony „Stan wejścia”.
4. To samo przy oknie < 900 px: „Wyłącz”, komunikaty są, pierwszy wyzwalacz z listy.
5. Dane: zapisana na centrali akcja ma wartość `1` dla „Włącz” (porównanie `UpsertSceneCommand` jak w `PROJEKT-RUTYNY.md`, tylko na testowej rutynie, zapis robi użytkownik).

## Ryzyka przy nowej wersji
- Satel może zmienić kolejność opcji `SET_ON_OFF` albo kodowanie wartości (`"0"`/`"1"`). Sprawdź listę opcji akcji w 1.2.0; jeśli „Włącz” jest już pierwsze, 010 jest zbędne.
- Jeśli w 1.2.0 wartość początkowa nowej akcji powstaje w innym miejscu (np. w `GetInitialAction` z parametrem), owiń wynik tam, gdzie ekran go odbiera, nie w funkcji współdzielonej.
- Gdy komunikat sukcesu zostanie przeniesiony do wspólnej funkcji zapisu warunku/akcji, warunek trzeba dodać tam, uważając, by nie wyłączyć komunikatu zapisu całej rutyny.
