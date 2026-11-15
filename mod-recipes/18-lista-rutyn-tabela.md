# 18. Lista rutyn i scen jako tabela

- **Wpisy rejestru:** 022
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** 1.1.0-port.2; w 1.2.0-port.1 bez własnego pola szukania (decyzja użytkownika 2026-11-13, wdrożona)
- **Wymagania:** 14; 15 (uruchamianie rutyn i scen celowo bez potwierdzenia)

## Cel
Ekran „Automatyka” → „Sceny”/„Rutyny” pokazywał siatkę dużych kafelków (`AutomationCard`, min. 246 px), z których nie widać, co rutyna robi. Na desktopie lepsza jest tabela z warunkami i akcjami.

## Zachowanie
- **Szukanie:** tylko pole Satel z 1.2.0 (`module544.SearchBar` nad listą, dopasowanie `CreateAutomationSearchMatcher` po nazwie i urządzeniach). Tabela dostaje listę już po tym filtrze (`T`) i nie ma własnego pola ani skrótów klawiszowych. Do `1.1.0-port.3` tabela miała własne pole `automation.picker.search_list` (filtr po nazwie, litera przenosiła fokus do pola, `Esc` czyścił); w `1.2.0-port.1` usunięte, żeby nie dublować pola Satel.
- Zamiast siatki kafelków:
  - **nagłówek** (12 px, szary): kolumny `automation.picker.column_name` („Nazwa”), dla rutyn `column_if` („Jeżeli”), `column_then` („Wykonaj”), dla rutyn `column_enabled` („Aktywna”), pusta kolumna przycisków;
  - **wiersz** (min. 44 px, linia dolna): ikona automatyki (28 px), nazwa (podstawa 240 px, jedna linia), dla rutyn podsumowanie warunków, podsumowanie akcji (12 px, szare, maks. 2 linie), dla rutyn przełącznik aktywności, po prawej przyciski akcji automatyki (uruchom/zatrzymaj itp., te same co na kafelku);
  - brak wyników: pusty stan Satel z `AutomationList` (przy pustym `T` tabela nie jest renderowana).
- **Podsumowanie warunków** („Jeżeli”): wszystkie wyrażenia warunków, także z grup zagnieżdżonych, jako nazwy wyzwalaczy z `automation.condition.trigger-type.<nazwa enumu małymi literami>` (np. „Stan wejścia”) i liczbą urządzeń w nawiasie, rozdzielone przecinkami: „Stan wejścia (2), Data i czas”. Nieznany wyzwalacz: `?`.
- **Podsumowanie akcji** („Wykonaj”): akcje bez opóźnień (`DELAY`), tytuł z `GetActionCardTitle(action)` i liczba urządzeń: „Włącz (3), Uruchom scenę”.
- **Kliknięcie** w nazwę lub podsumowanie otwiera edycję (`ScreenName.AutomationAddEdit`, `operationType: Edit`, `automationType`, `automation`) i **nie** uruchamia rutyny. Przy `isReadOnly` wiersz nie otwiera edycji.
- **Przełącznik „Aktywna”** i **przyciski akcji** działają dokładnie jak na kafelku: `SetRoutineState(automation, value, state, hub)` i `ExecuteSceneAction(automation, button, state, hub)`, przyciski z `hub.scene.states(automation)` i ikoną `GetAutomationActionIcon`. **Bez potwierdzenia** (decyzja użytkownika).
- Komunikat o limicie scen i rutyn (`common.messages.limit.max_number_of_scenes`) i układ poniżej bez zmian.
- Poniżej 900 px przy otwarciu: siatka kafelków.

## Punkty zaczepienia
- `AutomationList` (eksport): `gridTemplateColumns: "repeat(auto-fill, minmax(246px, 1fr))"` (w 1.2.0: 1 trafienie), `display: "grid"`, `AutomationCard2.AutomationCard automation={…} isReadOnly={…}`, lista `hubScenesChangeListener()` filtrowana po typie (`T`), właściwości `automationsType`, `isReadOnly`.
- `AutomationCard` (eksport): przełącznik przez `SetRoutineState`, przyciski przez `ExecuteSceneAction` i `hub.scene.states(automation)` (moduł enumów `SetRoutineState` eksportuje `SetRoutineState`, `ExecuteSceneAction`, `GetAutomationActionIcon`), `AutomationActionButton`.
- `GetActionCardTitle` (eksport), `Scene_Type.CONDITION` (rutyna), `SceneScenario_Action_Type.DELAY`.

## Implementacja
1. Nowy plik `src/renderer/app/logic/DesktopAutomationList.js` (kopiuj bez zmian). Eksport `DesktopAutomationList({ automations, automationsType, isReadOnly })`; `isRoutine = automationsType === Scene_Type.CONDITION`. Wiersz to osobny komponent z `useMemo(() => hub.scene.states(automation), [automation.status, automation.isEnabled])`.
2. W `AutomationList`: `var desktopPath = useRef(DesktopEditor.isDesktopEditor()).current;`, a element siatki (`<View style={… display: "grid" … gridTemplateColumns …}>…</View>`) owiń:
   ```js
   {desktopPath ? <DesktopAutomationList automations={T} automationsType={automationsType} isReadOnly={isReadOnly2} /> : <dotychczasowa siatka>}
   ```
   Gałąź mobilna (`FormGroup` z kartami jedna pod drugą) zostaje bez zmian.
3. i18n `automation.picker`:

| Klucz | pl | en |
|---|---|---|
| `column_name` | Nazwa | Name |
| `column_if` | Jeżeli | If |
| `column_then` | Wykonaj | Then |
| `column_enabled` | Aktywna | Enabled |

## Zależności
Przepis 08.

## Sprawdzenie
1. „Automatyka” → „Rutyny”: tabela z kolumnami Nazwa, Jeżeli, Wykonaj, Aktywna; „Sceny”: bez Jeżeli i Aktywna.
2. Nad tabelą tylko pole Satel; wpisanie nazwy rutyny lub urządzenia zawęża wiersze tabeli.
3. Klik w nazwę: edycja rutyny, bez uruchamiania.
4. Przełącznik i przyciski uruchamiania tylko na testowej rutynie/scenie i tylko przez użytkownika (sterują centralą).
5. Okno < 900 px: kafelki.

## Ryzyka przy nowej wersji
- Klucze `automation.condition.trigger-type.*` są budowane z nazw enumu małymi literami; nowe wyzwalacze bez tłumaczenia pokażą klucz. Sprawdź listę w nowym wydaniu.
- `AutomationCard` może dostać nowe działania (np. menu, duplikowanie); wiersz tabeli powinien je mieć lub świadomie pominąć.
- Pole wyrażeń w grupach: kod obsługuje `conditions` i `Conditions`; jeśli nowe wydanie zmieni strukturę grup, podsumowanie pominie zagnieżdżone warunki.
- `module231.Switch` (przełącznik) w RNW 0.21 może zmienić wygląd lub właściwości (`onValueChange`).
