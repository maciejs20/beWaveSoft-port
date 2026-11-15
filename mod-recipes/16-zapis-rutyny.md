# 16. Zapis rutyny: jeden punkt, `Ctrl+Enter`, błąd zapisu, krótki komunikat

- **Wpisy rejestru:** 018, 021
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** 1.1.0-port.2
- **Wymagania:** 13 (ekran potwierdzenia zapisu); `PROJEKT-RUTYNY.md`, reguły bezpieczeństwa 1, 3, 4, 7 i decyzja 3 (`Ctrl+Enter` zapisuje na centrali)

## Cel
To konfiguracja prawdziwej centrali alarmowej. Skrót klawiszowy do zapisu nie może ominąć blokad przycisku, a przycisk powinien mówić, czego brakuje. Pytanie o niezapisane zmiany w oryginale nie wykrywało zmian robionych w miejscu. Błąd zapisu z „Spróbuj ponownie” zamykał edytor i rutyna przepadała. Po udanym zapisie pełny zielony ekran „Rutyna dodana” wymagał kliknięcia „Wróć”.

## Zachowanie
- **Jeden punkt zapisu (`trySave`):** przycisk „Zapisz” (`SAVE`) i skrót wołają tę samą funkcję. Nic nie jest wysyłane, gdy:
  - zapis już trwa (`savingRef` albo stan ładowania zapisu),
  - czegoś brakuje albo oryginalna blokada `IsSaveButtonDisabled(values, loading)` jest aktywna: wtedy pole nazwy jest oznaczane jako dotknięte i pojawia się czerwony komunikat `automation.picker.cannot_save` („Nie zapisano. Brakuje: {{missing}}”),
  - walidacja Formika (`validateForm`) zwraca błędy: blokada jest zdejmowana, nazwa oznaczana, bez wysyłki.
  Dopiero potem ustawiana jest flaga „akcja wykonana” (wyłącza pytanie o opuszczenie) i wywoływane `handleSubmit`.
- **„Brakuje: …”:** nad przyciskami strony, wyśrodkowany tekst 12 px w kolorze `secondary600`, `automation.picker.missing` („Brakuje: {{missing}}”), lista rozdzielona przecinkami z:
  - `missing_name` („nazwy”): pusta nazwa lub błąd pola nazwy,
  - `missing_condition` („warunku”): rutyna (nie scena) bez warunków,
  - `missing_action` („akcji”): brak akcji w „Wykonaj”,
  - `missing_panel` („zatwierdzenia panelu”): panel z niezatwierdzonymi zmianami (przepis 15).
  Gdy niczego nie brakuje, tekst znika. Przycisk zachowuje oryginalne wyszarzenie z `IsSaveButtonDisabled`.
- **Skrót:** `Ctrl+Enter`, a na macOS także `Cmd+Enter` (`event.ctrlKey || event.metaKey`), bez `event.repeat` (trzymany klawisz nie wysyła wielokrotnie) i bez kompozycji IME. Nasłuch w fazie capture na `window`, tylko gdy ekran rutyny ma fokus nawigacji. Zwykły `Enter` nigdy nie zapisuje rutyny.
- **Pytanie o niezapisane zmiany** (`leave_screen_alert.unsaved_changes`, „Zostań”/„Wyjdź”) porównuje z **osobną głęboką kopią** wartości początkowych (`cloneDeep` przy otwarciu), bo ekrany edytują obiekty w miejscu, oraz uwzględnia brudny panel.
- **Błąd zapisu na centrali:** okno błędu oryginału (`failed_to_add_…`/`editing_…_failed`) z „Spróbuj ponownie” (`try_again`) zamyka tylko okno błędu (`pop(1)`) i zdejmuje stan ładowania. Edytor z rutyną zostaje otwarty, można poprawić i zapisać ponownie. Po zakończeniu ładowania blokady `savingRef` i flaga „akcja wykonana” są kasowane, więc pytanie o opuszczenie znowu działa.
- **Udany zapis (021):** zamiast pełnego ekranu `Notification` typu `Success` aplikacja od razu wraca na listę automatyki (`ScreenName.Automation`) i pokazuje krótki zielony komunikat (`showToast`, `type: "success"`) z tekstem:
  - dodanie: `automation.add-edit.add-notification.success.<routine|scene>_has_been_succesfully_added` („Rutyna {{name}} została dodana.” / „Scena {{name}} została dodana.”),
  - edycja: `automation.add-edit.edit-notification.success.<…>_has_been_succesfully_edited` („Rutyna {{name}} została zmieniona.”),
  - duplikowanie: `automation.add-edit.duplicate-notification.success.<…>_has_been_succesfully_duplicated` („Rutyna {{name}} została zduplikowana.”).
- **Zmiana wyzwalacza lub akcji zachowuje pasujące urządzenia** z możliwością cofnięcia: opisane w przepisie 12 (funkcja `carryDevices` z przepisu 08).
- Usuwanie i duplikowanie bez zmian poza komunikatem po duplikowaniu.
- Poniżej 900 px przy otwarciu rutyny: oryginalny przycisk, pełny ekran sukcesu, „Spróbuj ponownie” jak w oryginale (na webie `pop(2)`).

## Punkty zaczepienia
- `AutomationAddEditScreen`: `IsSaveButtonDisabled` (eksport modułu `NavigateToSelectAutomationIcon`), `usePreventLeave({ condition: !isEqual(A.initialValues, values) && !A.isActionCalled.current, leaveText: e("leave_screen_alert.leave"), message: e("leave_screen_alert.unsaved_changes"), stayText: … })`, przycisk `title={e("SAVE")}` z `handleSubmitWithScroll(isValid, errors, handleSubmit)`, ref „akcja wykonana” (`ref2.current = true`), stan ładowania zapisu (`tA` z `useState(false)`), komponent `<EA initialValues={dA} isActionCalled={ref2} />`.
- Moduł `NavigateToSelectAutomationIcon` (eksport o tej nazwie, w 1.2.0: 3 trafienia): funkcje dodania (`scene.create`), edycji (`scene.update`) i duplikowania; w każdej `navigate(ScreenName.Notification, { type: OperationType.CommonScreenType.Success, title: t("…_has_been_added"|"…_has_been_edited"|"…_has_been_duplicated"), … })`. W gałęzi błędu przycisk `try_again` z `if (PlatformConstants.isWeb) { n.pop(2); } else { n.navigate(ScreenName.Automation); }`.
- Klucze `_has_been_succesfully_added` (w 1.2.0: 114 trafień, głównie tłumaczenia), `try_again` (43).

## Implementacja
1. **`AutomationAddEditScreen`** (formularz z przepisu 15):
   - `var editor = useEditorState(); var savingRef = useRef(false);`
   - `var baseline = useRef(cloneDeep(dA)).current;` i `<EA initialValues={editor ? baseline : dA} …/>`; w `EA` warunek pytania: `(!isEqual(A.initialValues, values) || !!editor?.dirty) && !A.isActionCalled.current`;
   - `useEffect(() => { if (!tA) { savingRef.current = false; if (editor) ref2.current = false; } }, [tA]);`
   - w funkcji renderującej Formika: tablica `missing` (tylko gdy `editor`), funkcja `trySave` jak w „Zachowanie”, tekst „Brakuje” jako pierwszy element `actions`, a `onPress` przycisku `SAVE`: `if (editor) { trySave(); return; }` przed oryginalnym kodem;
   - komponent `SaveShortcut({ onSave })` z `useFocusEffect` i nasłuchem `keydown` (capture), renderowany jako `{!!editor && <SaveShortcut onSave={trySave} />}` obok `EA`.
2. **`NavigateToSelectAutomationIcon`:**
   - w gałęzi błędu dodawania i edycji, w akcji `try_again`: `if (DesktopEditor.isDesktopEditor()) { n.pop(1); t(false); } else if (PlatformConstants.isWeb) { n.pop(2); } else { … }` (`t` to setter stanu ładowania przekazany do funkcji);
   - przed każdym `navigate(ScreenName.Notification, { type: …Success …})` w dodawaniu, edycji i duplikowaniu (w duplikowaniu obiekt nawigacji to `t`, a nazwa w zmiennej `o`):
     ```js
     if (DesktopEditor.isDesktopEditor()) {
       n.navigate(ScreenName.ScreenName.Automation);
       showToast({ type: "success", message: t(`automation.add-edit.add-notification.success.${a}_has_been_succesfully_added`, { name: e.name }) });
       return;
     }
     ```
3. **i18n `automation.picker`:**

| Klucz | pl | en |
|---|---|---|
| `missing_name` | nazwy | name |
| `missing_condition` | warunku | condition |
| `missing_action` | akcji | action |
| `missing_panel` | zatwierdzenia panelu | applying the panel |
| `missing` | Brakuje: {{missing}} | Missing: {{missing}} |
| `cannot_save` | Nie zapisano. Brakuje: {{missing}} | Not saved. Missing: {{missing}} |

(`devices_removed` należy do przepisu 12.)

## Zależności
Przepisy 08, 12 (cofanie usuniętych urządzeń), 15 (`useEditorState`, flaga `dirty`).

## Sprawdzenie
1. Nowa rutyna bez nazwy i akcji: nad przyciskiem „Brakuje: nazwy, warunku, akcji”. `Ctrl+Enter`: czerwony komunikat „Nie zapisano. Brakuje: …”, nic nie wysłane (podgląd ruchu albo log `transport`).
2. Trzymany `Ctrl+Enter` przy kompletnej rutynie: najwyżej jedno wysłanie (test z bramką testową, bez centrali).
3. Panel z niezatwierdzoną zmianą: „Brakuje: zatwierdzenia panelu”.
4. Zmiana w rutynie i X: pytanie o niezapisane zmiany; bez zmian: zamyka od razu.
5. Symulowany błąd centrali (np. rozłączenie przed zapisem): okno błędu, „Spróbuj ponownie” zostawia edytor z danymi.
6. **Prawdziwy zapis tylko przez użytkownika**, na testowej rutynie z nieszkodliwym wyjściem: powrót na listę i krótki komunikat „Rutyna X została dodana.”.
7. Okno < 900 px: pełny ekran „Rutyna dodana” z „Wróć”.

## Ryzyka przy nowej wersji
- Jeśli nowe wydanie doda własny skrót zapisu lub zmieni `usePreventLeave`, sprawdź, czy nie ma podwójnej wysyłki i czy pytanie nadal wykrywa zmiany w miejscu.
- Zmiana sygnatur funkcji zapisu w `NavigateToSelectAutomationIcon` (kolejność argumentów `e, t, n, i, r, o`) zmienia, która zmienna jest nawigacją i setterem ładowania; ustal to z kodu nowego wydania, nie z nazw.
- `showToast` (moduł 93 w 1.1.0) może zmienić API; komunikat ma być krótki i nie blokować ekranu.
- Ekran listy po zapisie (`ScreenName.Automation`) musi istnieć; jeśli nowe wydanie rozdzieli sceny i rutyny na osobne trasy, wybierz trasę wg typu.
