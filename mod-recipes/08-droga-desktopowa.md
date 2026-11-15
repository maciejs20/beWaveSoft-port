# 08. Przełącznik drogi desktopowej (`isDesktopEditor`)

- **Wpisy rejestru:** 009
- **Platformy:** Linux, macOS
- **Wprowadzone:** 1.1.0-port.2
- **Wymagania:** zasada projektu „zmiany na desktop nie mogą zmieniać działania na telefonie i tablecie”, `PROJEKT-RUTYNY.md` (reguła bezpieczeństwa 8, decyzja 5)

## Cel
Jedno miejsce decydujące, czy pokazujemy nowe, desktopowe zachowanie, czy oryginalne. Ten sam kod renderera jest w aplikacji mobilnej Satel (React Native), więc każda zmiana interfejsu musi mieć warunek, który na telefonie i tablecie oraz w wąskim oknie daje dokładnie oryginał. Używają go przepisy 01 (edytor ekranów TSH) i 09–26.

## Zachowanie
- Droga desktopowa: szerokość okna `window.innerWidth >= 900` px (stała `DESKTOP_EDITOR_MIN_WIDTH = 900`).
- Poniżej 900 px, a także tam, gdzie nie ma `window` (natywna aplikacja mobilna), wszystko działa jak oryginał.
- Ekrany przełączające całe drzewo komponentów (edytor rutyn, listy wyboru, tabela obiektów, listy awarii i zdarzeń, lista rutyn) ustalają drogę **raz, przy montowaniu**, i zmiana rozmiaru okna jej nie przełącza. Drobne różnice wyglądu (odstępy, rozmiar zdjęcia pomieszczenia) mogą reagować na bieżącą szerokość (patrz „Ryzyka”).

## Punkty zaczepienia
Nowy moduł, bez kotwicy w kodzie Satel. Moduł korzysta z enumów `SceneScenario_Action_Type.SET_ON_OFF` i z `DeviceKeyEqual` (eksport modułu `GetDeviceKey`).

## Implementacja
Nowy plik `src/renderer/app/logic/DesktopEditor.js` (kopiuj bez zmian z `work/working/src`). Eksporty:

| Eksport | Działanie | Używa |
|---|---|---|
| `DESKTOP_EDITOR_MIN_WIDTH` | `900` | — |
| `isDesktopEditor()` | `typeof window !== "undefined" && window.innerWidth >= 900` | wszystkie przepisy 09–24 |
| `desktopInitialAction(action)` | na desktopie zmienia wartość nowej akcji „Włącz/wyłącz” z `"0"` na `"1"` | przepis 09 |
| `carryDevices(selected, allowed)` | zwraca `{ kept, removed }`: wybrane klucze urządzeń, które pasują do nowego wyzwalacza lub akcji (`DeviceKeyEqual(item.key ?? item, key)`), i liczbę usuniętych | przepisy 12 i 16 |

Wzorzec użycia w ekranie, który podmienia komponent:
```js
var desktopPath = (0, react.useRef)(DesktopEditor.isDesktopEditor()).current;
…
{desktopPath ? <NowyKomponent … /> : <dotychczasowy JSX bez zmian>}
```

## Zależności
Brak. To podstawa dla 09–24.

## Sprawdzenie
1. Okno szersze niż 900 px: nowe zachowania z przepisów 01 (edytor ekranów TSH) i 09–26.
2. Okno węższe niż 900 px przed otwarciem ekranu: każdy z tych ekranów wygląda i działa jak w oryginale (porównanie z buildem bez zmian).
3. Otwarta rutyna, zmniejszenie okna poniżej 900 px: edytor się nie przełącza i nie gubi danych.

## Ryzyka przy nowej wersji
- Projekt (`PROJEKT-RUTYNY.md`) mówi o warunku „`isWeb` **i** szerokość ≥ 900 px”, a kod sprawdza tylko szerokość. W aplikacji natywnej `window.innerWidth` jest niezdefiniowane, więc wynik jest `false`, ale jeśli React Native 0.86 zacznie udostępniać `window.innerWidth` (np. przez polyfill), tablet poziomy dostałby drogę desktopową. Bezpieczniej dodać `PlatformConstants.isWeb &&` przy przenoszeniu.
- Reguła „droga ustalana raz” nie jest stosowana wszędzie: `ConditionDevices`, `ConditionButtons`, `ActionCardDescription` (10), `InteractiveCard`, `InfoCard` (17), komunikaty po zapisie (09, 16), `HubChildTile` (24), panel boczny i pozycja „Lista obiektów” (19, 23), potwierdzenia (20) wołają `isDesktopEditor()` przy każdym renderze. Zmiana szerokości przez 900 px przełącza je na żywo. Przy przenoszeniu można to ujednolicić.
- React 19 nie zmienia `useRef(value).current`, ale w trybie Strict Mode efekty i inicjalizacje są wywoływane podwójnie w trybie deweloperskim; nie ma to wpływu na wynik.
