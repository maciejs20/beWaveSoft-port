# 23. Panel boczny ze zwijanymi sekcjami

- **Wpisy rejestru:** 029, 058 (wygląd nagłówków, zagnieżdżony „Obiekt”, domyślne zwinięcie, licznik awarii; układ grup z wpisów 041 i 058: przepis 25)
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** 1.1.0-port.2 (commit `5a50186`); 058 niewydane (po 1.2.0-port.2), oryginał 1.2.0
- **Wymagania:** 15 („Panel boczny: zwijane sekcje i oddzielenie »Usuń obiekt«”)

> **Od wpisu 041** panel nie pokazuje grup z `useHubSettingsMenu` wprost, tylko grupy z `desktopMenuGroups.desktopGroups` (przepis 25). Stan zwinięcia jest zapisywany po stałym `id` zamiast po tytule, pod tym samym kluczem `sideMenu.collapsed`; stare wpisy po tytułach są ignorowane.
>
> **Od wpisu 058** grupy to „Podsumowanie”, „Konfiguracja” i „Pozostałe” (`summary`, `configuration`, `other`), a w „Pozostałych” jest zagnieżdżona pozycja „Obiekt” (`id` `object`) z ustawieniami obiektu, edycją i usuwaniem. Opis niżej podaje stan po wpisie 058.

## Cel
Panel boczny ustawień obiektu (na webie stale widoczny po lewej) to długa lista pozycji w kilku grupach, a „Usuń obiekt” wygląda jak zwykła pozycja, tuż obok innych.

## Zachowanie
- Każda grupa ma klikalny nagłówek (min. 40 px wysokości, odstęp pionowy 6 px): tytuł grupy (15 px, pogrubiony, biały) i po prawej ikona `chevron-down` (rozwinięta) lub `chevron-right` (zwinięta), `Icon` 18 px, `IconFontWeight.Regular`, biała, w polu 28×28 (wpis 058; wcześniej 14 px i znaki `▾`/`▸`).
- Zwinięta grupa z pozycją awarii (`HubFailures`) przy `failuresCount > 0` ma za tytułem plakietkę `⚠ N` (14 px, pogrubiona, `warning500`); `failuresCount` z `useRoomContainer()` (058).
- Kliknięcie nagłówka zwija lub rozwija grupę. Stan zwinięcia jest zapamiętany w `localStorage` pod kluczem `sideMenu.collapsed` (obiekt JSON `{ "<id>": true|false }`, odczyt i zapis w `try/catch`). Bez zapisu domyślnie zwinięte są `other` („Pozostałe”) i `object` („Obiekt”), reszta rozwinięta (`DEFAULT_COLLAPSED`, 058).
- Pozycje grupy wyglądają i działają jak w oryginale (`ActionButton` z ikoną, zaznaczenie bieżącej trasy, ten sam `onPress`). Pozycja awarii ma tytuł `device_table.menu_failures` („Awarie: N”) i wyróżnienie błędu (`hasError`) przy `failuresCount > 0` (058).
- Pozycja zagnieżdżona (z `children`, dziś tylko „Obiekt”, 058): `ActionButton` z ikoną i `rightIcon` `chevron-up`/`chevron-down`, klik zwija lub rozwija; dzieci we wcięciu 16 px z linią po lewej (1 px, `secondary600`). Wejście na trasę `HubConfiguration` albo `HubEdit` rozwija „Obiekt” i jego grupę i zapisuje to (`OBJECT_ROUTES`).
- Pozycja „Usuń obiekt” (`hub-settings.delete_object`) jest zawsze na końcu „Obiektu”, oddzielona linią (1 px, `secondary600`) z odstępem 16 px nad i 10 px pod linią, z czerwoną ikoną `danger` (`Color.danger500`, 058).
- Nad panelem nie ma pomarańczowego paska „Znaleziono awarie” (`HubAlerts` z `hideFailures`, 058); pasek na ekranie głównym zostaje.
- Przycisk dodawania urządzenia, menu i wersja aplikacji pod listą bez zmian.
- Pozycja „Lista obiektów” na początku „Podsumowania” pochodzi z przepisu 19.
- Poniżej 900 px: oryginalna lista z `SectionTitle`.

## Punkty zaczepienia
- Ekran ustawień obiektu (w 1.1.0 `components/unnamed/module_843.js`, trasa `ScreenName.HomeSettings`): `nativeID="dark-scroll-view-settings">{hubSettingsMenu.groups.map(function (item5) { return <View key={item5.info.title}><module115.SectionTitle title={item5.info.title} …/>{item5.items.map(… ActionButton … selected: routeName === item4.screen …)}`.
- `useHubSettingsMenu` (eksport): `groups: [{ info: { title, titleStyle }, items: [{ title, leftIcon, screen, onPress, hasPermission }] }]`.
- Klucz `hub-settings.delete_object` (w 1.2.0: 1 trafienie), `ActionButton` (eksport, właściwości `rightIcon`, `leftIconColor`, `hasError`), `BackgroundColorButtonThemeStyle` (eksport modułu `PrimaryButtonThemeStyle`), `Icon` (`logic/Icon.js`), `IconFontWeight`, `useRoomContainer` (eksport `logic/hubVirtualDevicesChangeListener.js`, pole `failuresCount`).
- `HubAlerts` (eksport `components/HubAlerts.js`), kotwica `U("FAILURES_FOUND", {`; w ekranie ustawień `<HubAlerts2.HubAlerts hubInfo={A} hidePresenceSimulationStatus={!PlatformConstants.isWeb} />` w `titleComponent`.

## Implementacja
1. Nowy plik `src/renderer/app/desktop/shared/DesktopSideMenu.js` (kopiuj bez zmian). Eksport `DesktopSideMenu({ groups, routeName })`. Pozycję usuwania rozpoznaje po tytule równym `t("hub-settings.delete_object")`, pozycję awarii po `screen === HubFailures`, pozycję zagnieżdżoną po polu `children`. Stałe `STORAGE_KEY`, `DEFAULT_COLLAPSED = { other: true, object: true }`, `OBJECT_ROUTES = [HubConfiguration, HubEdit]`; funkcje `isCollapsed(stored, id)` (zapis albo domyślne) i `saveCollapsed(next)`.
2. W ekranie ustawień: `{hubSettingsMenu.groups.map(…)}` → `{DesktopEditor.isDesktopEditor() ? <DesktopSideMenu2.DesktopSideMenu groups={hubSettingsMenu.groups} routeName={routeName} /> : hubSettingsMenu.groups.map(…)}`.
3. Pasek awarii nad panelem (058): w `components/HubAlerts.js` warunek `failuresCount > 0 ?` → `failuresCount > 0 && !props.hideFailures ?`; w ekranie ustawień do `<HubAlerts2.HubAlerts … />` dopisz `hideFailures={DesktopEditor.isDesktopEditor()}`. Kod przed i po: wpis 058.
4. i18n: `device_table.menu_failures` („Awarie: {{failuresCount}}” / „Faults: {{failuresCount}}”); pozostałe klucze grup w przepisie 25.

## Zależności
Przepis 08. Przepis 19 dodaje pozycję „Lista obiektów”, ale ten przepis działa bez niego.

## Sprawdzenie
1. Panel boczny: nagłówki grup z ikonami strzałek 18 px; przy pierwszym uruchomieniu „Pozostałe” i „Obiekt” zwinięte; klik zwija grupę; po restarcie aplikacji stan zostaje.
2. „Usuń obiekt” na końcu „Obiektu”, za linią, z czerwoną ikoną. **Nie klikać** (usuwa obiekt z aplikacji).
3. Zaznaczenie bieżącej pozycji działa (np. po wejściu w „Użytkownicy”).
4. Okno < 900 px: oryginalna lista i pomarańczowy pasek awarii.
5. Przy aktywnych awariach: „Awarie: N” wyróżnione, zwinięte „Podsumowanie” ma `⚠ N`, nad panelem brak pomarańczowego paska, na ekranie głównym pasek jest.
6. Wejście w Ustawienia obiektu (np. z ekranu głównego) rozwija „Pozostałe” i „Obiekt”.

## Ryzyka przy nowej wersji
- Rozpoznawanie „Usuń obiekt” działa po **przetłumaczonym tytule**: zmiana tekstu w nowym wydaniu wyłączy oddzielenie i czerwoną ikonę. Zapamiętywanie zwinięcia od wpisu 041 działa po `id` grupy i nie zależy od języka. Lepiej rozpoznawać po `screen`/`leftIcon`, jeśli 1.2.0 da stabilny identyfikator.
- `DesktopSideMenu` nie sprawdza `item.hasPermission`, tak jak oryginalne renderowanie; jeśli 1.2.0 zacznie filtrować pozycje przy renderowaniu, przenieś ten filtr.
- Licznik awarii bierze `failuresCount` z `useRoomContainer()`, tak jak oryginalny `HubAlerts`; jeśli nowe wydanie zmieni to źródło, licznik i plakietka pokażą 0.
- `HubAlerts` dostaje nową właściwość `hideFailures`; przy przepisaniu komponentu przez Satel nanieś warunek ręcznie, inaczej nad panelem wróci pasek awarii (bez szkody dla działania).
- Wywołanie `isDesktopEditor()` przy każdym renderze: panel przełącza się na żywo przy zmianie szerokości okna.
