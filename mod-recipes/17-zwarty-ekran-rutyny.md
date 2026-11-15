# 17. Zwarty ekran rutyny

- **Wpisy rejestru:** 020
- **Platformy:** Linux, macOS (droga desktopowa)
- **Wprowadzone:** 1.1.0-port.2
- **Wymagania:** 12

## Cel
Ekran „Nowa rutyna”/„Edytuj rutynę” miał duże odstępy (44, 32, 24 px) i puste karty z dużym wypełnieniem („Dodaj warunek” jako karta ok. 100 px wysokości), więc żeby zobaczyć całą rutynę, np. „W przeciwnym razie wykonaj”, trzeba było przewijać.

## Zachowanie
- Odstępy pod grupami formularza rutyny w edytorze desktopowym:
  - nazwa z ikoną, pomieszczenie (sceny), przełącznik „Powiadom o uruchomieniu” (`automation.add-edit.send_execution_notification`): 12 px zamiast 32/24 px,
  - sekcje „Jeżeli” (`automation.add-edit.if`), „Wykonaj”, „W przeciwnym razie wykonaj” (`automation.add-edit.otherwise_execute`): 16 px zamiast 44 px.
- **Pusta karta i przycisk dodawania** (`InteractiveCard`): zamiast karty z ikoną zwykły wiersz 32 px z przerywaną ramką (1 px, `secondary400`, zaokrąglenie 6 px), tekstem 13 px „+ {emptyStateMessage}” (np. „+ Dodaj warunek”, `automation.add-edit.add_condition`) i tą samą akcją co ikona karty (`iconButton.onPress`), z etykietą dostępności równą tekstowi. Jeśli karta ma zawartość (lista warunków lub akcji), zawartość jest nad wierszem, z odstępem 6 px.
- **Karty warunków i akcji** (`InfoCard`): wypełnienie 8 px zamiast 16 px (jeśli wywołanie nie podaje własnego), opis 2 px pod tytułem.
- Wymagany efekt: nowa rutyna z jednym warunkiem i jedną akcją mieści się bez przewijania w oknie 1508×939 (ekran autora).
- Poniżej 900 px: oryginalne odstępy i karty.

## Punkty zaczepienia
- `AutomationAddEditScreen`: `<module43.FormGroup … marginBottom={Spacing.Spacing._32}` (nazwa, pomieszczenie), `marginBottom={Spacing.Spacing._24}` (przełącznik powiadomienia), `marginBottom={Spacing.Spacing._44}` (sekcje „Jeżeli”, „Wykonaj”, „W przeciwnym razie”). Enum odstępów `Spacing` z wartościami `_0 … _44`.
- `InteractiveCard` (eksport): destrukturyzacja `["emptyStateMessage", "iconButton", "children"]`, `S.padding ?? (children ? Spacing._12 : Spacing._16)`, `return …(0, jsxRuntime.jsx)(Card.Card, objectSpread(objectSpread({}, S), {}, {`.
- `InfoCard` (eksport): `S.padding ?? Spacing.Spacing._16`, `module3829.default.descriptionContainer` (styl opisu), `InfoCardHeader`.

## Implementacja
1. **`AutomationAddEditScreen`:** każdy z wymienionych `marginBottom` w formularzu rutyny zamień na `editor ? <mniejszy> : <oryginalny>` (`editor` z `useEditorState()`, przepis 15): `_32` → `_12`, `_24` → `_12`, `_44` → `_16`. Warunek oparty na `editor`, a nie na `isDesktopEditor()`, więc odstępy są ustalone przy otwarciu.
2. **`InteractiveCard`:** przed `return` oryginału:
   ```js
   if (DesktopEditor.isDesktopEditor()) {
     return <View>{!!children && <View style={{ marginBottom: 6 }}>{children}</View>}
       <PressableOpacity accessibilityLabel={emptyStateMessage} onPress={iconButton?.onPress}>
         <View style={{ flexDirection: "row", alignItems: "center", height: 32, paddingHorizontal: 12,
           borderWidth: 1, borderStyle: "dashed", borderColor: Color.secondary400, borderRadius: 6 }}>
           <Text style={{ fontSize: 13, color: Color.secondary800 }}>+ {emptyStateMessage}</Text>
         </View></PressableOpacity></View>;
   }
   ```
3. **`InfoCard`:** `S.padding ?? (DesktopEditor.isDesktopEditor() ? Spacing._8 : Spacing._16)` i styl opisu `[descriptionContainer, DesktopEditor.isDesktopEditor() && { marginTop: 2 }]`.

## Zależności
Przepisy 08 i 15 (`useEditorState`).

## Sprawdzenie
1. Okno 1508×939, nowa rutyna z jednym warunkiem i jedną akcją: cała rutyna z „W przeciwnym razie” widoczna bez przewijania.
2. Pusta sekcja: wiersz „+ Dodaj …” z przerywaną ramką, klik otwiera wybór (panel z przepisu 15).
3. Okno < 900 px: oryginalne karty.

## Ryzyka przy nowej wersji
- **`InteractiveCard` i `InfoCard` są współdzielone** z innymi ekranami (np. listy w ustawieniach). Zmiana działa na desktopie wszędzie, gdzie występują, a nie tylko w edytorze rutyn. W 1.1.0 nie zauważono problemów, ale w 1.2.0 sprawdź inne ekrany z tymi kartami albo zawęź warunek do `useEditorState()`.
- Oba komponenty wołają `isDesktopEditor()` przy każdym renderze, więc reagują na zmianę szerokości na żywo (patrz przepis 08).
- Jeśli 1.2.0 zmieni skalę `Spacing` albo układ sekcji, celem jest efekt (rutyna 1 warunek + 1 akcja bez przewijania w 1508×939), a nie konkretne liczby.
