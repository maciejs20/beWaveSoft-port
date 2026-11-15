# 20. Potwierdzenie poleceń grupowych

- **Wpisy rejestru:** 026, 038
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** 1.1.0-port.2 (026, commit `5a50186`); 1.2.0-port.2 (038), oryginał 1.2.0
- **Wymagania:** 15 („Sterowanie wyjściem i polecenia grupowe: potwierdzenie przed wykonaniem”; „Rutyny: uruchamianie zostaje bez potwierdzenia”); `PROJEKT-TABELA-OBIEKTOW.md`, pytanie 3; decyzja użytkownika z 2026-11-14: pojedyncze wyjścia bez potwierdzenia (wpis 038)
- **Historia:** wpis 026 dodał potwierdzenie także przełącznikowi na karcie urządzenia i wierszom przełączników w szczegółach; wpis 038 je usunął (te komponenty są znów równe oryginałowi). Przepis opisuje tylko stan obecny.

## Cel
Przyciski nad listą grupy („Włącz wszystko” itd.) jednym kliknięciem sterują wieloma prawdziwymi urządzeniami centrali alarmowej. Na desktopie łatwo o przypadkowe kliknięcie (np. podwójne). Potrzebne jest potwierdzenie przed wysłaniem polecenia grupowego.

## Zachowanie
- Przed wysłaniem polecenia grupowego pojawia się okno dialogowe aplikacji (`confirmDialog`):
  - tytuł `device_table.confirm_title` („Potwierdź sterowanie” / „Confirm control”),
  - treść: etykieta przycisku `hub-groups.actions.<etykieta>`: „Włącz wszystko”/„Wyłącz wszystko”, „Rozwiń wszystko”/„Zwiń wszystko”, „Otwórz wszystko”/„Zamknij wszystko” (wg kategorii grupy),
  - przyciski `device_table.confirm_yes` („Wykonaj” / „Run”) i `device_table.confirm_no` („Anuluj” / „Cancel”, styl anulowania).
- „Anuluj” niczego nie wysyła. „Wykonaj” wykonuje dokładnie to, co oryginał.
- Miejsce: przyciski nad listą grupy (`GroupScreen`), komponent `HeaderActionContainer`.
- **Bez potwierdzenia (celowo):** pojedyncze wyjścia, czyli przełącznik obok nazwy na karcie urządzenia (`CommandOnOffSwitch`) i wiersze przełączników w szczegółach urządzenia (`CommandSwitchController`), sterują od razu jak w oryginale; uruchamianie i zatrzymywanie scen i rutyn, przełącznik aktywności rutyny (przepis 18).
- **Poza zakresem:** inne widżety sterujące (rolety, termostaty, światło z jasnością, kolor), uzbrajanie i rozbrajanie.
- Poniżej 900 px (i na telefonie) potwierdzenia nie ma: `confirmControl` od razu zwraca `true`.

## Punkty zaczepienia
- `HeaderActionContainer` (eksport, w 1.2.0: 3 trafienia): `getActionLabels(category)` (zwraca `{ left, right }` np. `enable_all`/`disable_all`), funkcja akcji `async function (e) { await (0, getDevicesCapabilities.executeCommand)(e, control, devicesCapabilities); }`; klucze `hub-groups.actions.` (2 trafienia w 1.2.0).
- `confirmDialog(title, description, confirmText, cancelText)` → `Promise<boolean>` (eksport, w 1.2.0: 10 trafień).

## Implementacja
1. Nowy plik `src/renderer/app/logic/DesktopConfirm.js` (kopiuj bez zmian):
   ```js
   exports.confirmControl = function (message) {
     if (!DesktopEditor.isDesktopEditor()) return Promise.resolve(true);
     return confirmDialog(t("device_table.confirm_title"), message, t("device_table.confirm_yes"), t("device_table.confirm_no"));
   };
   ```
2. `HeaderActionContainer`, w funkcji akcji przed `executeCommand`: `if (!(await DesktopConfirm.confirmControl(r(`hub-groups.actions.${e ? actionLabels.left : actionLabels.right}`)))) { return; }` (`e === true` to akcja lewa; `r` to funkcja tłumacząca komponentu, w 1.2.0 tak nazwana lokalnie).
3. i18n, blok `device_table`:

| Klucz | pl | en |
|---|---|---|
| `confirm_title` | Potwierdź sterowanie | Confirm control |
| `confirm_yes` | Wykonaj | Run |
| `confirm_no` | Anuluj | Cancel |

`CommandOnOffSwitch` i `CommandSwitchController` zostają bez zmian względem oryginału. Kluczy `confirm_on` i `confirm_off` nie dodajemy.

## Zależności
Przepis 08. Blok `device_table` z przepisu 19 (jeśli 19 nie jest naniesiony, utwórz blok z samymi kluczami `confirm_*`).

## Sprawdzenie
**Tylko na nieszkodliwym wyjściu i tylko przez użytkownika** (np. wyjście bez podłączonego odbiornika, bez syreny):
1. Karta urządzenia → przełącznik: bez okna, wyjście przełącza się od razu.
2. Szczegóły → wiersz „Wyłączone/Włączone”: bez okna.
3. Grupa → „Wyłącz wszystko”: okno z „Wyłącz wszystko”. „Anuluj”: nic nie wysłane (log transportu). „Wykonaj”: polecenie idzie do urządzeń.
4. Uruchomienie sceny: bez okna.
5. Okno < 900 px: bez okien.

## Ryzyka przy nowej wersji
- Przy scalaniu nie przenoś `DesktopConfirm` do `CommandOnOffSwitch` ani `CommandSwitchController` (stan sprzed wpisu 038).
- Jeśli Satel doda własne potwierdzenie (np. dla grup), nie dubluj okien.
- Zmiana API `confirmDialog` w nowym wydaniu (np. obiekt opcji zamiast argumentów) wymaga dopasowania `confirmControl`.
- Nowe miejsca sterowania grupowego nie są objęte; przejrzyj wywołania `executeCommand` w komponentach sterujących nowego wydania i zdecyduj z użytkownikiem.
