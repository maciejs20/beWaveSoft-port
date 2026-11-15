# 11. X i `Esc` zamykają tylko bieżący krok warunku lub akcji

- **Wpisy rejestru:** 013
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** 1.1.0-port.2
- **Wymagania:** 7; `PROJEKT-RUTYNY.md`, reguła bezpieczeństwa 6

## Cel
Na webie każdy krok jest modalem z przyciskiem X (`CloseButton`), a X i `Esc` wołają `closeModalStack`, czyli zamykają cały stos: rutynę razem z warunkiem. Niezapisana rutyna przepadała. Na desktopie X i `Esc` mają zamykać tylko bieżący krok.

## Zachowanie
- Na ekranach „Wybierz wyzwalacz” i „Wybierz akcję” X oraz `Esc` cofają o jeden ekran (`pop(1)`) do „Nowa rutyna”/„Edytuj rutynę”.
- Na ekranach „Ustaw warunek” i „Ustaw akcję” X oraz `Esc` cofają o dwa ekrany (`pop(2)`), też do rutyny, z pominięciem kroku wyboru.
- Rutyna zostaje otwarta z dotychczasowymi zmianami. X na samej rutynie zamyka ją jak dawniej, pytając o niezapisane zmiany (`leave_screen_alert.*`, mechanizm `usePreventLeave`).
- Po wdrożeniu przepisu 15 te ekrany są w panelu, a X i `Esc` zamykają panel (z pytaniem o niezatwierdzone zmiany). Ten przepis daje mechanizm, z którego 15 korzysta.
- Inne modale aplikacji bez zmian (X i `Esc` zamykają stos).
- Poniżej 900 px jak w oryginale.

## Punkty zaczepienia
- `PageHeader` (eksport): `<CloseButton2.CloseButton onPress={closeModalStack} />` za warunkiem `PlatformConstants.isWeb && isModal`.
- Komponent strony webowej (`webPageStyle`, `forwardRef`, używany jako `module32.Page`): wywołanie `useEscapeHandler)()` zaraz po `useAutoFocusFirst)(ref)`, `<PageHeader … goBack={goBack2 || appNavigation.goBack} />`.
- `useEscapeHandler` (eksport): nasłuch `keydown` na `window` w `useFocusEffect`, przy `Escape` `preventDefault()` gdy `canGoBack()`, potem `closeModalStack()`.
- Ekrany: eksporty `AutomationConditionSelectTriggerScreen`, `AutomationActionSelectTriggerScreen`, `AutomationConditionSetScreen`, `AutomationActionSetScreen`, każdy renderuje `<module32.Page …>` (tytuły `automation.condition.select-trigger.select_trigger` „Wybierz wyzwalacz”, `automation.action.select-trigger.select_action` „Wybierz akcję”, `automation.condition.set.set_condition` „Ustaw warunek”, `automation.action.set.set_action` „Ustaw akcję”).

## Implementacja
Pliki współdzielone dostają tylko opcjonalne parametry (bez nich zachowanie oryginału):
1. `useEscapeHandler`: `function (closeHandler)` i `(closeHandler || closeModalStack)();`.
2. `PageHeader`: `onPress={props.onClose || closeModalStack}` na `CloseButton`.
3. `webPageStyle` (strona): `useEscapeHandler)(A.closeHandler)` oraz `onClose={A.closeHandler}` przekazane do `PageHeader`. (Przepis 15 rozszerza to do `A.escapeDisabled ? noop : A.escapeHandler || A.closeHandler`.)
4. Na `<module32.Page` w czterech ekranach:
   ```js
   closeHandler={DesktopEditor.isDesktopEditor() ? function () { return appNavigation.pop(N); } : undefined}
   ```
   `N = 1` na ekranach „Wybierz…”, `N = 2` na ekranach „Ustaw…”. Po przepisie 15: `closeHandler={appNavigation.requestClose || (…to samo…)}`.

## Zależności
Przepis 08. Przepis 15 rozbudowuje ten mechanizm.

## Sprawdzenie
1. Nowa rutyna z nazwą → dodaj warunek → „Wybierz wyzwalacz” → X: powrót do rutyny, nazwa zachowana. Tak samo `Esc`.
2. „Ustaw warunek” → X / `Esc`: powrót do rutyny.
3. X na rutynie ze zmianami: pytanie o niezapisane zmiany.
4. Inny modal (np. ustawienia użytkownika): X zamyka stos jak dawniej.
5. Okno < 900 px: X na „Wybierz wyzwalacz” zamyka wszystko (oryginał).

## Ryzyka przy nowej wersji
- Jeśli Satel zmieni `useEscapeHandler` (np. doda `stopPropagation` albo nasłuch w fazie capture), obejścia `Esc` z przepisów 12, 13, 18, 19 (które przekazują `Esc` dalej przez sztuczne `KeyboardEvent`) mogą zacząć zamykać za dużo albo za mało. Przetestuj kolejność: podokno → szukanie → panel → rutyna.
- `forwardRef` w React 19 jest przestarzały, ale działa. Jeśli Satel przepisze `Page` na `ref` jako zwykłą właściwość, dodatki przenieś do nowej sygnatury.
- Zmiana nawigacji (`@react-navigation` w nowej wersji): `pop(N)` musi nadal istnieć w obiekcie z `useAppNavigation`.
