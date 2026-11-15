# 15. Jeden ekran: rutyna i panel warunku lub akcji

- **Wpisy rejestru:** 017
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** 1.1.0-port.2
- **Wymagania:** 5 (edycja od razu w szczegółach), 7; `PROJEKT-RUTYNY.md` („Pomysł: jeden ekran”, reguły bezpieczeństwa 2, 5, 6, 8)

## Cel
Edycja warunku to łańcuch modali jeden na drugim: rutyna → „Wybierz wyzwalacz” → „Ustaw warunek” → „Wybierz wartość”, każde okno ok. 800 px przy ekranie 1508 px. Rutyna znika z widoku. Nowe zachowanie: rutyna widoczna cały czas, a warunek lub akcja w panelu obok. Dane zapisywane na centrali powstają w tych samych ekranach i funkcjach co dawniej, więc format rutyny się nie zmienia.

## Zachowanie
- **Gdzie:** ekran „Nowa rutyna”/„Edytuj rutynę”, sceny tak samo (`AutomationAddEditScreen` obsługuje oba typy).
- **Otwarcie panelu:** kliknięcie „+ warunek”, istniejącego warunku, „+ akcja” lub istniejącej akcji nie otwiera nowego modala, tylko panel:
  - nowy warunek lub akcja: krok „Wybierz wyzwalacz”/„Wybierz akcję”;
  - edycja istniejącego: **od razu** „Ustaw warunek”/„Ustaw akcję” z danymi elementu;
  - edycja elementu, którego wyzwalacza lub akcji centrala nie oferuje: panel tylko do odczytu z tekstem `automation.picker.unavailable` („Ten wyzwalacz lub akcja jest niedostępna na tej centrali. Element nie zostanie zmieniony. Możesz go usunąć z rutyny.”), surowym JSON-em wyrażenia (12 px, szary) i odnośnikiem `automation.picker.close` („Zamknij”). Element nigdy nie jest podmieniany po cichu; usuwa się go ikoną kosza na karcie.
- **Układ:** od **1300 px** szerokości okna dwa panele obok siebie (formularz rutyny i panel, każdy `flex: 1`, maks. 800 px, odstęp 12 px, wyśrodkowane). Poniżej 1300 px (ale od 900) panel zastępuje formularz (formularz ukryty przez `display: none`, ale zamontowany). Zmiana rozmiaru przełącza układ na żywo bez utraty danych w żadnym z nich.
- **Panel jako modal bez cienia:** przy dwóch panelach strona panelu ma `boxShadow: "none"` (bez efektu warstwy nad rutyną).
- **Krok w panelu:** „Dalej” w kroku wyboru przechodzi w tym samym panelu do „Ustaw…”, a „Wstecz” (strzałka w „Ustaw…”) wraca do wyboru, też w panelu. Przycisk zapisu w „Ustaw…” ma w panelu napis `automation.picker.apply` („Zatwierdź” / „Apply”) zamiast „Zapisz”. Zatwierdzenie aktualizuje rutynę po lewej i zamyka panel (bez zielonego komunikatu, przepis 09).
- **Niezatwierdzone zmiany w panelu:** panel jest „brudny”, gdy wartości jego formularza różnią się od wartości z chwili otwarcia kroku. Wtedy X panelu, strzałka „Wstecz” w kroku wyboru, `Esc` oraz otwarcie innego elementu pytają w oknie `confirmDialog`: tytuł `automation.picker.discard_title` („Odrzucić zmiany w panelu?”), treść `automation.picker.discard_message` („Ten warunek lub akcja ma niezatwierdzone zmiany.”), przyciski `automation.picker.discard` („Odrzuć”) i `automation.picker.keep_editing` („Wróć do edycji”). Bez zmian panel zamyka się od razu.
- **`Esc`:** przy otwartym panelu `Esc` na stronie rutyny zamyka panel (z pytaniem jak wyżej), a nie rutynę. `Esc` w samej stronie panelu jest wyłączony, żeby jedno naciśnięcie nie zamknęło i panelu, i rutyny. Kolejność: szukanie w liście (czyści) → panel → rutyna.
- **Zapis rutyny** przy brudnym panelu jest zablokowany („Brakuje: zatwierdzenia panelu”, przepis 16), a pytanie o niezapisane zmiany przy zamykaniu rutyny uwzględnia brudny panel.
- **Inne podokna** (ikona, kolor, opóźnienie, potwierdzenia) dalej otwierają się jako zwykłe modale.
- Poniżej 900 px przy otwarciu rutyny: oryginalny łańcuch modali. Droga jest ustalana raz, przy otwarciu rutyny.

## Punkty zaczepienia
- Eksport `AutomationAddEditScreen` (w 1.2.0: 3 trafienia): komponent formularza Formika z `module32.Page`, przyciskami `Duplicate`, `DELETE`, `SAVE`, `usePreventLeave`, `IsSaveButtonDisabled`. Nawigacja przez `useAppNavigation()` (moduł 21 w 1.1.0).
- Eksport `AutomationConditionInteractiveCard` (lista warunków z grupami): woła `appNavigation.navigate(ScreenName.AutomationConditionSelectTrigger, …)`.
- Ekrany kroków (eksporty `AutomationConditionSelectTriggerScreen`, `AutomationConditionSetScreen`, `AutomationActionSelectTriggerScreen`, `AutomationActionSetScreen`): `useAppNavigation()`, `useScreenRoute().params` (pola `condition`, `triggers`, `action`, `actions`, `operationType`, `isFirstCondition`, `allowToAddConditionGroup`, funkcje zwrotne zapisu), `module32.Page`, `module261.Stepper`.
- Nazwy ekranów `ScreenName.AutomationConditionSelectTrigger`, `AutomationConditionSet`, `AutomationActionSelectTrigger`, `AutomationActionSet`.
- Strona webowa `webPageStyle`: `maxWidth: "800px"` (w 1.2.0: 3 trafienia `maxWidth:"800px"`), blok z `borderRadius: 6`, `useEscapeHandler)(…)`.
- `confirmDialog(title, description, confirmText, cancelText)` (eksport z modułu dialogu, w 1.1.0 `module_623` → `showConfirmDialog`), zwraca `Promise<boolean>`.

## Implementacja
1. **Nowy plik** `src/renderer/app/logic/DesktopRoutinePanel.js` (kopiuj bez zmian). Zawiera dwa konteksty React (`EditorContext` dla rutyny, `PanelScreenContext` dla ekranu w panelu) i eksporty:
   - `DesktopRoutineEditor({ screens, children })`: stan panelu `{ id, screen, params }`, flaga `dirty`, szerokość okna (nasłuch `resize`), `twoPanes = width >= 1300`. Funkcje: `open(name, params)` (po `confirmDiscard`, `screen = resolveOpen(name, params)`), `requestClose()` (pytanie, potem zamknięcie), `closePanel()`. Dla ekranu w panelu tworzy obiekt nawigacji: `navigate(Set…)` i `popTo()` zmieniają krok w panelu, inne nazwy idą do nawigacji aplikacji, `pop` zamyka panel, `goBack` i `requestClose` pytają, plus `twoPanes`. Ekran panelu renderowany jako `<PanelScreen key={`${id}-${screen}`} />` (świeży stan przy każdym kroku).
   - `resolveOpen`: dla warunku bez wyrażenia → wybór wyzwalacza; z wyrażeniem → „Ustaw warunek”, jeśli `params.triggers` zawiera jego `trigger`, inaczej `"unavailable"`. Dla akcji analogicznie z `params.actions` i `action.type`.
   - `useEditorNavigation()`: nawigacja aplikacji, a w edytorze `navigate(AutomationConditionSelectTrigger | AutomationActionSelectTrigger, params)` → `editor.open(...)`.
   - `useEditorState()`: `{ open, panelOpen, dirty, requestClose }` albo `null` poza edytorem.
   - `usePanelNavigation()` / `usePanelRoute()`: w panelu nawigacja i `params` panelu, poza nim `useAppNavigation()` / `useScreenRoute()`.
   - `PanelDirtyReporter({ values })`: porównuje `values` Formika z kopią z montowania (`cloneDeep`/`isEqual`) i przy różnicy woła `markDirty()`.
2. **`AutomationAddEditScreen`:**
   - dotychczasowy komponent przemianuj na lokalny `AutomationAddEditForm` i nawigację pobieraj przez `useEditorNavigation()`;
   - na `<module32.Page` dodaj `escapeHandler={editor?.panelOpen ? editor.requestClose : undefined}` (`editor = useEditorState()`);
   - na końcu pliku mapa ekranów i nowy eksport:
     ```js
     var panelScreens = { [ScreenName.AutomationConditionSelectTrigger]: AutomationConditionSelectTriggerScreen,
       [ScreenName.AutomationConditionSet]: AutomationConditionSetScreen,
       [ScreenName.AutomationActionSelectTrigger]: AutomationActionSelectTriggerScreen,
       [ScreenName.AutomationActionSet]: AutomationActionSetScreen };
     exports.AutomationAddEditScreen = function () {
       var desktop = useRef(DesktopEditor.isDesktopEditor()).current;
       return desktop ? <DesktopRoutineEditor screens={panelScreens}><AutomationAddEditForm /></DesktopRoutineEditor> : <AutomationAddEditForm />;
     };
     ```
3. **`AutomationConditionInteractiveCard`:** `useAppNavigation()` → `useEditorNavigation()`.
4. **Cztery ekrany kroków:**
   - `useAppNavigation()` → `usePanelNavigation()`, `useScreenRoute()` → `usePanelRoute()`;
   - na `<module32.Page`: `noScrim={!!appNavigation.twoPanes}`, `escapeDisabled={!!appNavigation.requestClose}`, `closeHandler={appNavigation.requestClose || (isDesktopEditor() ? () => appNavigation.pop(N) : undefined)}` (N z przepisu 11); na ekranach wyboru także `goBack={appNavigation.requestClose}` (poza panelem `undefined`, czyli oryginalne `goBack`);
   - jako pierwsze dziecko strony, przed `<module261.Stepper`: `<PanelDirtyReporter values={values} />`;
   - na ekranach „Ustaw…” tytuł przycisku: `appNavigation.requestClose ? t("automation.picker.apply") : <dotychczasowy>` (`SAVE` w warunku, `common.save` w akcji).
5. **`webPageStyle` (strona), dodatki bez zmiany domyślnego działania:**
   - `useEscapeHandler)(A.escapeDisabled ? function () {} : A.escapeHandler || A.closeHandler)`;
   - `maxWidth: A.modalMaxWidth || "800px"` (używa też tabela obiektów, przepis 19);
   - po bloku z `borderRadius: 6` kolejny argument scalania `A.noScrim ? { boxShadow: "none" } : {}`.
6. **i18n `automation.picker`:**

| Klucz | pl | en |
|---|---|---|
| `apply` | Zatwierdź | Apply |
| `discard_title` | Odrzucić zmiany w panelu? | Discard panel changes? |
| `discard_message` | Ten warunek lub akcja ma niezatwierdzone zmiany. | This condition or action has unapplied changes. |
| `discard` | Odrzuć | Discard |
| `keep_editing` | Wróć do edycji | Keep editing |
| `unavailable` | Ten wyzwalacz lub akcja jest niedostępna na tej centrali. Element nie zostanie zmieniony. Możesz go usunąć z rutyny. | This trigger or action is unavailable on this hub. It will not be changed. You can remove it from the routine. |
| `close` | Zamknij | Close |

## Zależności
Przepisy 08, 11 (`closeHandler`, `onClose`, parametr `useEscapeHandler`), 12–14 (komponenty wewnątrz kroków). Przepisy 16 i 17 korzystają z `useEditorState()`.

## Sprawdzenie
1. Okno 1508 px: edycja warunku otwiera „Ustaw warunek” od razu po prawej, rutyna widoczna po lewej.
2. Nowa akcja: „Wybierz akcję” w panelu, „Dalej” → „Ustaw akcję” w tym samym panelu, „Zatwierdź” aktualizuje rutynę i zamyka panel.
3. Zmiana wartości w panelu, potem X / `Esc` / kliknięcie innego warunku: pytanie „Odrzucić zmiany w panelu?”. „Wróć do edycji” zostawia panel, „Odrzuć” zamyka.
4. Zmniejszenie okna do 1100 px przy otwartym panelu: panel zastępuje formularz, dane panelu i rutyny zostają; powrót do 1508 px: oba widoczne.
5. Rutyna z wyzwalaczem niedostępnym na centrali (np. z innej centrali/kopii): panel tylko do odczytu.
6. `Esc` z panelem bez zmian: zamyka panel, drugi `Esc`: pytanie o rutynę/zamknięcie.
7. Okno < 900 px przy otwarciu rutyny: oryginalne modale.
8. Dane: porównanie `UpsertSceneCommand` ze starej i nowej drogi dla tej samej rutyny (bez zapisu na centrali; prawdziwy zapis tylko użytkownik, na testowej rutynie).

## Ryzyka przy nowej wersji
- To najbardziej inwazyjny przepis: opiera się na tym, że cztery ekrany kroków pobierają nawigację i parametry przez hooki, a wynik oddają funkcją zwrotną z `params` i `pop(2)`. Jeśli nowe wydanie przekazuje wynik inaczej (np. `navigation.navigate(AutomationAddEdit, { condition })` albo kontekst formularza), panel trzeba dopasować. Najpierw prześledź w nowym wydaniu, jak „Ustaw warunek” zwraca dane do rutyny.
- `useFormContext` (`FormProvider`) w ekranach „Ustaw…” korzysta z `pageRef` strony; w panelu działa, bo ekran jest renderowany w drzewie rutyny. Zmiana dostawcy kontekstu w nowym wydaniu może to zepsuć.
- React 19: kontekst można renderować jako `<Context>` zamiast `<Context.Provider>`; stara forma nadal działa. `useMemo` z zależnością `counter.current` (ref) jest kruche; przy przenoszeniu lepiej trzymać `id` panelu w stanie.
- Nowe ekrany kroków w nowym wydaniu (np. osobny krok grupy warunków) trzeba dopisać do `panelScreens` i `resolveOpen`, inaczej otworzą się jako modal nad panelem.
- `display: "none"` na ukrytym formularzu: RNW 0.21 przepuszcza tę wartość, ale sprawdź, że nasłuchy klawiatury ukrytego formularza (np. `Ctrl+Enter` z przepisu 16) nie działają niechcący.
