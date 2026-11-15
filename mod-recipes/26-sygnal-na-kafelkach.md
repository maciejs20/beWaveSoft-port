# 26. Sygnał radiowy na kafelkach urządzeń w pomieszczeniu

- **Wpisy rejestru:** 043
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** 1.2.0-port.2, oryginał 1.2.0
- **Wymagania:** decyzja użytkownika z 2026-11-14 (punkt 8 listy zmian)

## Cel
Siłę sygnału urządzenia bezprzewodowego widać dziś tylko w jego szczegółach („Sygnał 45%” z kolorową ikoną Wi-Fi). Na desktopie kafelek urządzenia w widoku pomieszczenia pokazuje ją od razu, a urządzenie bez łączności jest widoczne na czerwono.

## Zachowanie
- Widok pomieszczenia (`RoomDashboardScreen`, karta „Sterowanie”, lista „Urządzenia”), okno ≥ 900 px: kafelek urządzenia radiowego ma na dole wiersz „Sygnał” (`device.details.common.signal`) z wartością jak w szczegółach: komponent Satel `Signal` (procent i ikona `wifi` zielona > 60, pomarańczowa > 40, czerwona poniżej; „---” przy 0).
- Gdy kody błędów urządzenia zawierają `ConnectionErrorCodes` (`CONNECTION_FAILURE`, `CONNECTION_DISCONNECTED`): czerwony napis „Brak połączenia” (`device_table.no_connection`, nowy klucz, Satel nie ma takiego tekstu) i czerwona ikona `wifi`.
- Które urządzenia: `data.product === HubDeviceProduct.BE_WAVE` (radio BE WAVE; to te, które użytkownik nazywa „ABAX”). „Brak połączenia” pokazuje się przy kodzie połączenia także wtedy, gdy stan nie ma `settings.signal`; wiersz sygnału wymaga `settings.signal` różnego od `undefined`/`null`. Ekran szczegółów pokazuje sygnał przy tym samym warunku `signal`, a dla `BUS_DEVICE` (przewodowe moduły i ich wejścia) używa innego komponentu (`SignalExpanders`); te i urządzenia `EXTERNAL` (kamery), a także wirtualne bez sygnału nie dostają wiersza.
- Dane: te same co ekran szczegółów (`DeviceCommonDetails` → `toHubComponent`): struktura urządzenia (`hubDeviceStructureChangeListener(key).data`) i stan `useDeviceState(GetDeviceKey(key))` (`settings.signal`, `errorCodes`), które karta i tak już czyta. Tylko odczyt, bez nowych zapytań do centrali.
- Inne listy kart (ulubione, grupy, szczegóły) i telefon, tablet, okno < 900 px: bez zmian.

## Punkty zaczepienia
- `RoomDashboardScreen`: `<VisibleConfig.DevicesControlWidget data={item5.data} schedules={iA} fullScreen={false} showHeader={true} isGroupControlEnabled={true} … onCollapseScrollTo={callback} />`.
- `DevicesControlCardList` (eksport, `logic/DevicesControlCardList.js`): `<DeviceControlCard2.DeviceControlCard data={item} … autoPlay={props.autoPlay} key=…`. `DevicesControlGroupCard` przekazuje swoje propsy do listy przez `objectSpread({}, props)`, a `DevicesControlWidget` do obu.
- `DeviceControlCard` (eksport, `components/DeviceControlCard.js`): `{!!j && j}</Card2.Card>`, zmienne `R` (`hubDeviceStructureChangeListener`) i `deviceState` (`useDeviceState`).
- `Signal` (eksport, `logic/Signal.js`), `StatusValueWithLabel`, `ValueWithLabel`, `StructureContainer.ConnectionErrorCodes`, `HubDeviceProduct.BE_WAVE`, `toHubComponent` (`signal: r.signal` z `A.settings`).

## Implementacja
1. Nowy plik `desktop/shared/deviceSignal.js` (kopiuj bez zmian): czysta funkcja `signalRowState(data, deviceState, connectionErrorCodes)` → `null`, `{ connected: false }` albo `{ connected: true, signal }`.
2. Nowy plik `desktop/shared/DesktopSignalRow.js` (kopiuj bez zmian): `DesktopSignalRow({ data, deviceState })`, `ValueWithLabel` z etykietą `device.details.common.signal`, wartość `Signal` albo czerwony tekst i `StatusValueWithLabel` (`color` `danger500`, `iconType="wifi"`); odstęp 16 px w poziomie, 8 px w pionie.
3. `components/DeviceControlCard.js`: `require` `DesktopSignalRow`, `var showSignal = props.showSignal;`, za `{!!j && j}` dodaj `{showSignal && <DesktopSignalRow2.DesktopSignalRow data={R.data} deviceState={deviceState} />}`.
4. `logic/DevicesControlCardList.js`: przekaż `showSignal={props.showSignal}` do `DeviceControlCard`.
5. `screens/RoomDashboardScreen.js`: do `DevicesControlWidget` w karcie „Sterowanie” dodaj `showSignal={DesktopEditor.isDesktopEditor()}`.
6. i18n `device_table.no_connection`: „Brak połączenia” / „No connection”.

## Zależności
Przepis 08.

## Sprawdzenie
- `npm --prefix work/working/tools test` (`test/unit/desktop/deviceSignal.test.js`).
- Okno ≥ 900 px, pomieszczenie z czujką bezprzewodową (np. „Dach”, kafelek „Dach-speed / Z1”): wiersz „Sygnał 45%” z tą samą ikoną i kolorem co w szczegółach urządzenia. Urządzenie bez łączności: czerwone „Brak połączenia”. Wejście przewodowe (moduł na magistrali) i kamera: bez wiersza. Okno < 900 px i ulubione na pulpicie: bez wiersza.

## Ryzyka przy nowej wersji
- Jeśli Satel doda inny rodzaj urządzeń radiowych (nowa wartość `HubDeviceProduct`), dopisz ją w `signalRowState` po sprawdzeniu, którego komponentu sygnału używają szczegóły.
- `DeviceControlCard` jest współdzielony: zmiana tylko dodatkowa (bez `showSignal` karta jak w oryginale).
- Wygląd wiersza (odstępy, rozmiar tekstu) nie był oglądany w działającej aplikacji przy wprowadzeniu; dopasuj na oko.
