# 10. Pełne nazwy i operator w podsumowaniu

- **Wpisy rejestru:** 012
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** 1.1.0-port.2
- **Wymagania:** 4, 9 (podsumowanie akcji)

## Cel
Karty warunków i akcji na ekranie „Nowa rutyna”/„Edytuj rutynę” pokazywały tylko pierwszą nazwę urządzenia i odznakę `+N` (np. „Normalny (Okno Sypialnia +3)”, „Dzwonek +3”), a operatora łączenia urządzeń (Lub/Oraz/Suma) wcale. Na ekranie komputera jest miejsce na pełną listę.

## Zachowanie
- **Warunek z urządzeniami** (`ConditionDevices`) i **warunek „Przycisk”** (`ConditionButtons`): w nawiasie pełna lista nazw rozdzielonych przecinkami, zawijana w wierszach. Przy więcej niż jednym urządzeniu przed listą przedrostek operatora:
  - `deviceOperator` 0 → `automation.summary.all_of` („wszystkie z:” / „all of:”),
  - 1 → `automation.summary.any_of` („dowolne z:” / „any of:”),
  - 2 → `automation.summary.sum_of` („suma z:” / „sum of:”),
  - brak operatora → „dowolne z:”, ale tylko gdy centrala ma funkcję `sceneExpressionDevOperator` (formularz pokazuje wtedy „Lub”); bez tej funkcji brak przedrostka.
  - Przykład: „(dowolne z: Okno Sypialnia, Ruch Sypialnia, Okno Kuchnia)”. Jedno urządzenie: „(Okno Sypialnia)”.
- **Akcja z urządzeniami** (`ActionCardDescription`): pełna lista nazw bez nawiasu i bez przedrostka.
- Powyżej **12** pozycji widać pierwsze 12 i odnośnik `automation.summary.show_all` („ pokaż wszystkie ({{count}})” / „show all ({{count}})”), który rozwija całą listę.
- Pozostałe elementy kart (wartość warunku, alarm, nazwa sceny w akcji, powiadomienie) bez zmian.
- Poniżej 900 px: pierwsza nazwa i odznaka `+ N` jak w oryginale.

## Punkty zaczepienia
- Eksporty `ConditionDevices`, `ConditionButtons`, `ActionCardDescription`.
- Literał odznaki: ``label={`+ ${n}`}`` (w minifikacie ``"+ ".concat(n)``) oraz `deviceIds.length - 1`.
- Komponenty nazw: `DeviceName` (`deviceKey`), `DeviceButtonsName` (`deviceButtonsKeys`).
- Funkcja centrali: `hubInfoChangeListener()?.info?.features?.sceneExpressionDevOperator` (w 1.2.0: 14 trafień).
- i18n: blok `automation: {` w `pl.js` i `en.js`.

## Implementacja
1. Nowy plik `src/renderer/app/logic/DesktopNameList.js` (kopiuj bez zmian). Eksporty:
   - `DesktopNameList({ keys, renderName(key), prefix, parenthesized, style })`: wiersz `flexWrap: "wrap"`, opcjonalne `(`, `prefix + " "`, nazwy z `", "`, odnośnik „pokaż wszystkie” przy `keys.length > 12` (stan lokalny), opcjonalne `)`.
   - `deviceOperatorPrefix(t, deviceOperator, hasOperatorFeature)`: mapa jak w „Zachowanie”.
2. W `ConditionDevices` i `ConditionButtons`, w gałęzi `condition.expression.deviceIds.length > 0`, przed obliczeniem licznika:
   ```js
   if (DesktopEditor.isDesktopEditor()) {
     return <DesktopNameList parenthesized={true} style={themeStyle.description}
       keys={condition.expression.deviceIds}
       prefix={condition.expression.deviceIds.length > 1 ? deviceOperatorPrefix(t, condition.expression.deviceOperator, hasOperatorFeature) : ""}
       renderName={(key) => <DeviceName style={themeStyle.description} deviceKey={key} />} />;
   }
   ```
   W `ConditionButtons` nazwa przez `<DeviceButtonsName deviceButtonsKeys={[key]} />`. `t` z `useTranslation()`, `hasOperatorFeature` jak w punktach zaczepienia. Hooki wywołaj na początku komponentu, przed warunkami.
3. W `ActionCardDescription`: element `{action.deviceIds.length > 0 && <View …>…</View>}` zamień na `desktop ? <DesktopNameList keys={action.deviceIds} renderName={…DeviceName…} /> : <dotychczasowy View>`.
4. i18n: w `automation` dodaj blok `summary`:

| Klucz | pl | en |
|---|---|---|
| `automation.summary.any_of` | dowolne z: | any of: |
| `automation.summary.all_of` | wszystkie z: | all of: |
| `automation.summary.sum_of` | suma z: | sum of: |
| `automation.summary.show_all` | pokaż wszystkie ({{count}}) | show all ({{count}}) |

Pozostałe języki aplikacji nie dostały tłumaczeń; i18next pokaże wtedy klucz albo język zapasowy (sprawdź `fallbackLng`).

## Zależności
Przepis 08.

## Sprawdzenie
1. Warunek „Stan wejścia” z dwoma urządzeniami i operatorem „Lub”: „(dowolne z: A, B)”. Z „Oraz”: „(wszystkie z: A, B)”. Moc z „Suma”: „(suma z: …)”.
2. Akcja z czterema urządzeniami: wszystkie nazwy.
3. 13 urządzeń: 12 nazw i „pokaż wszystkie (13)”, po kliknięciu wszystkie.
4. Okno < 900 px: „(A +1)” jak w oryginale.

## Ryzyka przy nowej wersji
- Mapowanie liczb operatora (0 = Oraz, 1 = Lub, 2 = Suma) wzięte z `SceneScenario_Condition_Operator` w 1.1.0. Sprawdź enum w 1.2.0 (nazwy `AND`, `OR`, `SUM`) i w razie zmiany oprzyj mapę na nazwach enumu.
- Jeśli Satel sam zacznie pokazywać pełne nazwy albo operator, porównaj i nie dubluj.
- RNW 0.21: zawijanie `flexWrap` w `Text` zagnieżdżonych w `View` działa tak samo, ale sprawdź odstępy po przecinkach.
