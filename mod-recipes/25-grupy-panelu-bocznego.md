# 25. Grupy panelu bocznego, „Monitoring” w Integracji i „Mój profil” w Użytkownikach

- **Wpisy rejestru:** 041, 042, 058
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** 1.2.0-port.2, oryginał 1.2.0; 058 niewydane (po 1.2.0-port.2)
- **Wymagania:** decyzje użytkownika z 2026-11-14 (punkty 5, 6, 7 i 9 listy zmian) i z 2026-11-15 (wpis 058: Awarie w Podsumowaniu, grupa „Pozostałe”, zagnieżdżony „Obiekt”)

## Cel
Panel boczny ustawień obiektu ma za dużo pozycji w grupie „Ustawienia”, a pozycje rzadko używane (zużycie energii, dane środowiskowe, monitoring, mój profil) zajmują miejsce. Na desktopie pozycje są przegrupowane według zadań, a monitoring i profil są dostępne z ekranów, do których tematycznie należą. Od wpisu 058 „Konfiguracja” ma tylko pozycje używane przy konfiguracji, rzadkie ustawienia są w zwiniętej grupie „Pozostałe”, ustawienia obiektu są razem z jego edycją i usuwaniem, a awarie są stałą pozycją panelu zamiast pomarańczowego paska nad menu.

## Zachowanie
- Panel boczny (okno ≥ 900 px) ma od wpisu 058 trzy grupy w tej kolejności (pozycje bez uprawnień nadal są pomijane przez `useHubSettingsMenu`; grupa i „Obiekt” bez pozycji nie są pokazywane):

| Grupa (`id`) | Pozycje (kolejność) |
|---|---|
| „Podsumowanie” (`summary`, `hub-settings.summary`) | Lista obiektów (`GroupComponent`, przepis 19), Dziennik zdarzeń (`EventLogList`), Awarie (`HubFailures`, tytuł „Awarie: N”, nowa pozycja desktopu, 058) |
| „Konfiguracja” (`configuration`, `device_table.menu_configuration`) | Integracja (`Integrations`), Harmonogramy (`ScheduleList`), Symulacja obecności (`HubPresenceSimulation`), Diagnostyka (`HubDiagnostics`) |
| „Pozostałe” (`other`, `device_table.menu_other`, domyślnie zwinięta) | Obiekt (`object`, `device_table.menu_object`, ikona `home-wifi`, domyślnie zwinięty) z dziećmi: Ustawienia obiektu (`HubConfiguration`), Edytuj obiekt, Usuń obiekt (na końcu za linią, czerwona ikona, przepis 23); dalej Dane instalatora, Klucz tokenów SATEL (`SatelTokenKey`), Użytkownicy (`HomeUsers`), Ustawienia e-mail (`EmailConfigScreen`), na końcu każda pozycja, której listy nie znają (najpierw z `screen`, potem bez) |

- Do wpisu 058 (stan 1.2.0-port.2) układ był: „Podsumowanie” = Lista obiektów, Dziennik zdarzeń; „Konfiguracja” = Ustawienia obiektu, Harmonogramy, Integracja, Ustawienia e-mail, Użytkownicy, Klucz tokenów, Dane instalatora, Edytuj obiekt, Usuń obiekt; „Ustawienia” (`settings`, `hub-settings.settings`) = Symulacja obecności, Diagnostyka i nieznane pozycje z `screen`. Grupa „Ustawienia” znikła.
- Znikają z panelu: Zużycie energii (`HubPowerConsumption`), Dane środowiskowe (`HubEnvironmentalData`). Monitoring (`HubMonitoring`) znika tylko, gdy użytkownik ma pozycję Integracja (rola administratora), a Mój profil (`UserProfile`) tylko, gdy ma pozycję Użytkownicy (`UsersConfiguration`): wtedy otwierają się z tych ekranów. Bez pozycji-gospodarza zostają zaraz za jej miejscem (Monitoring w „Konfiguracji” za miejscem Integracji, Mój profil w „Pozostałych” za miejscem Użytkowników), żeby nikt nie stracił dostępu. Grupa „Zarządzanie obiektem” (`hub-settings.object_management`) znika, bo jej pozycje są w „Obiekcie” i „Pozostałych”.
- Pozycje z `screen` rozpoznawane po `screen`. Pozycje bez `screen` po przetłumaczonym tytule, tak jak buduje je `useHubSettingsMenu`: Dane instalatora (`installer-data.title` dla administratora, `installer-data.help` dla pozostałych), Edytuj obiekt (`hub-settings.edit_object`), Usuń obiekt (`hub-settings.delete_object`).
- Pozycja „Awarie” (058): dodana w `useHubSettingsMenu` tylko na drodze desktopowej, za „Listą obiektów” (tytuł `device_table.menu_failures_plain` „Awarie”, ikona `danger`, `screen: HubFailures`, `onPress` → `callback(HubFailures)`). `DesktopSideMenu` zamienia tytuł na `device_table.menu_failures` z liczbą awarii i wyróżnia ją przy awariach; zwinięte „Podsumowanie” pokazuje `⚠ N` (przepis 23). Pomarańczowy pasek „Znaleziono awarie” nad panelem jest na desktopie ukryty (`HubAlerts` z `hideFailures`), na ekranie głównym zostaje.
- Ekran „Integracja” (desktop): na górze wiersz „Monitoring ›” (`hub-settings.monitoring`, `ActionButton` jak pozostałe wiersze), otwiera oryginalny ekran `HubMonitoring` (`navigate`, „Wstecz” wraca do Integracji). Widoczny przy uprawnieniu pozycji menu: `permissionGuard.MonitoringConfiguration === ResourceAccess.Full`.
- Ekran „Użytkownicy” (desktop): nad zakładkami wiersz „Mój profil ›” (`hub-settings.my_profile`), otwiera `UserProfile`. Uprawnienie jak pozycja menu: `permissionGuard.None === ResourceAccess.Full`.
- Telefon, tablet i okno < 900 px: menu z `useHubSettingsMenu` bez zmian (pozycje „Lista obiektów” i „Awarie” są tylko w gałęzi `isDesktopEditor()`), pasek awarii nad menu jest, ekrany Integracji i Użytkowników bez nowych wierszy.

## Punkty zaczepienia
- `useHubSettingsMenu` (eksport): `groups: [{ info: { title }, items: [{ title, leftIcon, screen, onPress, hasPermission }] }]`; pozycje filtrowane przez `hasPermission` na końcu hooka.
- Nazwy ekranów `ScreenName.HubPowerConsumption`, `HubEnvironmentalData`, `HubMonitoring`, `UserProfile`, `GroupComponent`, `EventLogList`, `HubFailures`, `HubConfiguration`, `HubEdit`, `ScheduleList`, `Integrations`, `EmailConfigScreen`, `HomeUsers`, `SatelTokenKey`, `HubPresenceSimulation`, `HubDiagnostics`.
- Klucze tytułów pozycji bez `screen`: `installer-data.title`, `installer-data.help`, `hub-settings.edit_object`, `hub-settings.delete_object`.
- Pozycja „Lista obiektów” w `useHubSettingsMenu` (`title: r("device_table.menu")`, `forceTable: true`, przepis 19): za nią w tej samej gałęzi desktopowej pozycja „Awarie” (058).
- `IntegrationsScreen` (eksport; w 1.2.0 `logic/IntegrationsScreen.js`): `<module32.Page title={A("hub-settings.integrations")} … isModal={PlatformConstants.isWeb}>{… hasMqtt && <ActionButton …`.
- `HubUsersScreen` (eksport; `screens/HubUsersScreen.js`): `marginBottomByScreenType={…PageWithNavigationBar}><TabsListSelector.TabsList`.
- `usePermissionGuard` (eksport `usePermissionGuard`, `ResourceAccess`), `useAppNavigation` (w 1.2.0 `misc/module_21.js`).

## Implementacja
1. Nowy plik `desktop/shared/desktopMenuGroups.js` (kopiuj bez zmian): czysta funkcja `desktopGroups(groups, t)` → `[{ id, title, items }]` (`id`: `summary`, `configuration`, `other`; pozycja „Obiekt” to `{ id: "object", title, leftIcon: "home-wifi", children }`), listy `HIDDEN_SCREENS`, `SUMMARY_SCREENS` (`GroupComponent`, `EventLogList`, `HubFailures`), `CONFIGURATION_SCREENS` (`Integrations`, `HubMonitoring`, `ScheduleList`, `HubPresenceSimulation`, `HubDiagnostics`), `OTHER_SCREENS` (`SatelTokenKey`, `HomeUsers`, `UserProfile`, `EmailConfigScreen`), pary `MOVED_SCREENS` (`[HubMonitoring, Integrations]`, `[UserProfile, HomeUsers]`, funkcja `withoutMoved`) i `byTitle(items, title)` dla pozycji bez `screen`. Kod przed i po: wpisy 041 i 058.
2. `desktop/shared/DesktopSideMenu.js` (nasz) renderuje `desktopMenuGroups.desktopGroups(props.groups, t)` zamiast `props.groups`; tytuł z `group.title`, klucz i stan zwinięcia po `group.id`, pozycję z `children` jako zagnieżdżoną (przepis 23).
2a. `hooks/useHubSettingsMenu.js` (058): w gałęzi `DesktopEditor.isDesktopEditor() ? [<Lista obiektów>] : []` grupy `hub-settings.summary` druga pozycja `{ hasPermission: permissionGuard.None === ResourceAccess.Full, title: r("device_table.menu_failures_plain"), leftIcon: "danger", screen: ScreenName.HubFailures, onPress: () => callback(ScreenName.HubFailures) }`. To odstępstwo od zasady z 041 („`useHubSettingsMenu` bez zmian”), ale tylko na drodze desktopowej, jak pozycja z wpisu 025.
2b. Ukrycie paska awarii nad panelem (`HubAlerts`, `hideFailures`): przepis 23, krok 3.
3. `logic/IntegrationsScreen.js`: `require` `react`, `DesktopEditor`, `usePermissionGuard`; `desktopPath` z `useRef`, `showMonitoring`; przed pierwszym wierszem `{showMonitoring && <ActionButton2.ActionButton title={A("hub-settings.monitoring")} onPress={… navigate(ScreenName.ScreenName.HubMonitoring)} />}`.
4. `screens/HubUsersScreen.js`: `require` `react`, `DesktopEditor`, `usePermissionGuard`, `ActionButton`, `module_21` (`useAppNavigation`); `desktopPath`, `showProfile`; przed `<TabsListSelector.TabsList` `{showProfile && <ActionButton2.ActionButton title={A("hub-settings.my_profile")} onPress={… navigate(ScreenName.ScreenName.UserProfile)} />}`.
5. i18n w bloku `device_table`: `menu_configuration` („Konfiguracja” / „Configuration”); od 058 `menu_failures` („Awarie: {{failuresCount}}” / „Faults: {{failuresCount}}”), `menu_failures_plain` („Awarie” / „Faults”), `menu_other` („Pozostałe” / „Other”), `menu_object` („Obiekt” / „Object”).

## Zależności
Przepisy 08 i 23 (`DesktopSideMenu`); 19 dla pozycji „Lista obiektów” (bez niej „Podsumowanie” ma sam dziennik).

## Sprawdzenie
- `npm --prefix work/working/tools test` (`test/unit/desktop/desktopMenuGroups.test.js`, przepisany przy 058: trzy grupy z zagnieżdżonym „Obiektem”, ikona „Obiektu” i „Usuń obiekt” na końcu, Dane instalatora po tytule `installer-data.help`, nieznane pozycje na końcu „Pozostałych”, pozycje bez uprawnień, pusty „Obiekt” i puste grupy pominięte, Monitoring i Mój profil bez pozycji-gospodarza, przekazanie oryginalnych obiektów pozycji).
- Okno ≥ 900 px, konto administratora: grupy „Podsumowanie”, „Konfiguracja”, „Pozostałe” z pozycjami jak w tabeli, „Pozostałe” i „Obiekt” zwinięte przy pierwszym uruchomieniu; brak zużycia energii, danych środowiskowych, monitoringu, mojego profilu i grupy „Ustawienia”; „Usuń obiekt” na końcu „Obiektu” za linią z czerwoną ikoną (**nie klikać**). „Awarie: N” otwiera listę awarii. Integracja → „Monitoring ›” otwiera ekran monitoringu, „Wstecz” wraca. Użytkownicy → „Mój profil ›” otwiera profil.
- Konto bez uprawnienia monitoringu: brak wiersza „Monitoring” w Integracji. Konto bez roli administratora z uprawnieniem monitoringu: Monitoring w „Konfiguracji” panelu; Dane instalatora (tytuł `installer-data.help`) w „Pozostałych”.
- Okno < 900 px: oryginalne menu z „Zarządzaniem obiektem”, monitoringiem i profilem, bez „Awarii” w menu, z paskiem awarii; Integracja i Użytkownicy bez nowych wierszy.

## Ryzyka przy nowej wersji
- Nowa pozycja Satel (z `screen` albo bez) trafi na koniec „Pozostałych”; zdecyduj z użytkownikiem, czy przenieść ją do innej grupy. „Usuń obiekt” zostaje ostatni w „Obiekcie”, bo „Obiekt” ma stałą listę dzieci.
- Pozycje bez `screen` są dopasowywane po przetłumaczonym tytule (`installer-data.title`, `installer-data.help`, `hub-settings.edit_object`, `hub-settings.delete_object`). Zmiana klucza albo tekstu w nowym wydaniu przeniesie pozycję na koniec „Pozostałych” (nic nie zginie, ale „Edytuj obiekt” lub „Usuń obiekt” wypadnie z „Obiektu”). Sprawdź, czy nowe wydanie nie daje tym pozycjom `screen`.
- Pozycja „Awarie” zależy od nazwy ekranu `HubFailures` i od tego, że `callback(HubFailures)` otwiera listę awarii bez parametrów (tak otwiera ją oryginalny pasek w `HubAlerts`).
- `UserProfile` jest w oryginale modalem przezroczystym otwieranym z menu przez `reset` stosu; z ekranu Użytkowników idzie przez `navigate` (na stos). Sprawdź wygląd i „Wstecz” na oko.
- Jeśli Satel zmieni uprawnienia pozycji Monitoring lub Mój profil w `useHubSettingsMenu`, przenieś je do warunków `showMonitoring` i `showProfile`.
