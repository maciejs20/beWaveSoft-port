# TSH Screen Editor Redesign and Fix Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The desktop TSH screen editor draws INT-TSH2 and INT-TSG2 screens with TSH Soft's own metrics, never moves a widget on a plain click, and has a desktop layout where the preview fills the window, with a toolbar, a screens/layers panel, a scrollable inspector, undo/redo and keyboard shortcuts.

**Architecture:** Pure modules carry every rule: metric tables, layout, date formatting, pointer and hit-test math, history. React components only draw and wire events. The preview is split in two:
- a static `TshScreenRender`, also used for the screen thumbnails;
- an interactive `TshCanvas` that overlays selection and handles in CSS pixels.

All new UI lives in `work/working/src/renderer/app/desktop/tshEditor/`. The route is desktop-only (`DesktopEditor.isDesktopEditor()`, window ≥ 900 px), so phone and tablet stay unchanged.

**Tech Stack:** Node 22 (`node --test`), Electron 44.9.3 renderer (React Native Web from `src/renderer/lib`), esbuild through `work/working/tools/build-app.mjs`, Ghidra headless 11 (`/snap/bin/ghidra.analyzeHeadless`, project `~/snap/ghidra/common/tsh/tsh`), CDP harnesses as in the earlier tasks.

**Spec:** `PROJEKT-TSH-EDYTOR.md` ("Wierność podglądu", "Warstwy kodu"), `PROJEKT-TSH.md` 2.2–2.5. Read both. This plan replaces the TSG2 "half of TSH2" ruling (task 4/5) and the TSH2 medium/large guesses.

---

## 1. Diagnosis

The user ran the editor with a real INT-TSG2 hub layout and attached four screenshots. Reproduction:
- **Fixture.** `scratchpad/t8/gen.cjs` builds a TSG2 input like the user's from sample 084, with the Collage-like layout, a bottom strip, a screen name of 4 spaces, and saver widgets.
- **Pure model check.** `scratchpad/t8/repro.cjs`.
- **Built renderer.** The real `TshEditorRoute` ran in the built renderer: scratch build `scratchpad/t8/build` from `linux/build-linux.sh`, isolated `HOME`/`XDG_CONFIG_HOME`, CDP port 9358, harness `scratchpad/t8/h` + `scratchpad/t8/repro.mjs`.
- **Result.** The output `scratchpad/t8/shots/user.png` / `saver.png` matches the user's screenshots 2 and 3: oversized icons, cut-off "OFF" toggles, an empty list title, and the garbled date over the clock.

### Root causes

| # | Defect | Root cause (file:line, in `work/working/src/renderer/app/desktop/tshEditor/`) | Evidence |
|---|---|---|---|
| RC1 | Wrong font and icon sizes, TSG2 especially | `tshLayout.js:24-56`: TSG2 = TSH2 × 0.5 `[P]`, and TSH2 medium/large = ×2/×3 `[P]`. TSH has a per-resolution table in `FUN_00ab0cd4` (section 4.1). TSG2 icons: large 114 vs 84 (+36 %), medium 76 vs 54. TSG2 text: small 9 vs 12 (−25 %), medium 18 vs 15, large 27 vs 25. TSH2: icon medium 152 vs 115, large 228 vs 180; text medium 36 vs 33. | Ghidra dump; shot `tsg_scr.png` (TSG2 small text "Nowe pole tekstowe" ink 104 keypad px = 12 px font; bar clock 14 px; bar line at 26.6) |
| RC2 | Large text in the wrong face | `TshPreview.js:84-91` always uses `TEXT_FONT` (Roboto Light). In `FUN_00a9f048`, TSH sets `"Roboto Thin"` when the size is the large one and `"Roboto Light"` otherwise. | Ghidra `FUN_00a9f048` |
| RC3 | A click moves a widget | `TshPreview.js:329-343`: no movement threshold, so every `pointermove` (1 px trackpad jitter) runs `dragPosition`. `tshLayout.js:378-379` then clamps the whole layout box into the screen, and `TshPreview.js:350-351` commits on release. With the oversized RC1 box (large icon 114 px at y=211) the clamp gives y = 272 − 114 = 158. That is the user's 84,211 → 84,158. The jitter itself adds 1–3 px on x (the user's 2,232 → 5,230). | Built renderer: a press/release with 0 px movement leaves 84,211; with 1 px movement it gives 86,158. Pure: `dragPosition(layout, 0, 0)` → {84,158}. |
| RC4 | Clicks hit the wrong widget | `TshPreview.js:381-404`: each widget's whole box takes pointer events in list order. A later rectangle that frames a strip therefore swallows clicks meant for the buttons inside it. | Built renderer: a click on the button glyph at keypad 120,250 selected the rectangle |
| RC5 | Snap rules | `TshPreview.js:334-335`: snapping is tied to the keypad's saved "Pokaż siatkę" flag (`screen.grid`) and runs on any move. The distance is in keypad px (`tshLayout.js:60,362`), not screen px. This did not cause the user's moves (grid off), but it contradicts the requested behaviour. | code |
| RC6 | Garbled date "1414,14:1411.2026" | `tshLayout.js:160-174` `formatDate` knows only `yyyy yy MM dd hh HH mm ss`, case-sensitively. TSH formats with Delphi `FormatDateTime` (`FUN_0042dd1c`, the clock calls it with `"hh:mm"`), where `dddd` is the weekday name, `d` the day without zero, `mmmm` the month name, `nn` minutes, and `mm` after `h` minutes. In our editor `"dddd, d MMMM yyyy"` becomes `"1414, d 1111 2026"`. | `repro.cjs` |
| RC7 | Saver clock overlaps widgets | `tshLayout.js:44-49` plus `TshPreview.js:180-211`: the clock metrics were measured on one TSH2 shot and halved for TSG2 (147/39 px). TSH uses 120/36 (TSG2) and 256/77 (TSH2) and centres them from text extents (`FUN_00aa064c`). Widgets that the user placed in TSH around the real clock therefore overlap our 22 % larger clock. RC6 adds a wider date. | Ghidra `FUN_00aa064c` |
| RC8 | Bottom widgets overlap and are cut off | Follows from RC1 (toggle glyph 114 instead of 84) and RC2. | screenshot 3 vs repro |
| RC9 | Empty screen name in the list | The name is whitespace only: 4 B, decoded intact at `tshBlob.js:131`. `TshScreenList.js:79` renders it as a `Text` that collapses to zero height, so only the meta line shows. The status bar and the name field look blank too. There is no data loss; the bytes round-trip. | harness with name `"    "` reproduces screenshot 3 exactly |
| RC10 | Status icons on every screen | `TshPreview.js:148` draws alarm/eye/wrench/bell on all user and additional screens. In TSH shots they appear on the main screen (`now.png`, "Ekran główny" on) and not on a non-main one (`tsg_scr.png`). `[P]` until Task 1 confirms it. | shots |
| RC11 | Indicator look | `tshLayout.js:78-100`: the ring is drawn in cl1 and the lock in #00b27f. TSH (`FUN_00a9f3a8`) composes glyphs instead: 0x1df base (white, or #ff4d4d for output), then 0x1fc in #00d9a5 (room) or 0x1e0 in black (input), then a 0x1e8 ring in black (room, output). | Ghidra |
| RC12 | Small preview, empty space, footer "Zapisz", panel cut off | **Preview size.** `TshPreview.js:30-33,239-244` fits the preview to the middle column width, between two fixed columns (`TshScreenList.js:19` 260 px, `TshPropertyPanel.js:38` 380 px), and to `innerHeight − top − 24`. That ignores the Page footer. At a 1000 px window the preview is 355 px wide and leaves ~60 % empty space below. **Footer.** `TshEditorRoute.js:321` passes `actions` to `Page`, which renders the big footer button. **Scrolling.** There are no per-pane scroll containers, so the inspector runs under the footer (`TshEditorRoute.js:38-41`, `minHeight: 560`). **Status row.** It mixes the byte counter with "Karta SD"/"Anuluj" (`TshEditorRoute.js:321-330`). | screenshots 1–4, repro |
| RC13 | Raw lists | `TshPropertyPanel.js:360`: a widget row shows the type name and coordinates, with no glyph and no content (two "Tekst" rows cannot be told apart). `TshFormControls.js:185-193` shows the icon as `0x11d`. | screenshot 4 |

---

## 2. Global Constraints

- **Rules:** `CLAUDE.md` (project), the coding rules it imports, and `scratchpad/tsh-common.md`.
  - Linux + macOS only, with no `process.platform` branches. Modifier keys use `event.metaKey || event.ctrlKey`, which is not a platform branch.
  - Desktop-only: the editor route and all new components are reachable only from the "Edytuj ekrany" button shown under `isDesktopEditor()`. `KeypadSettingsScreen` and every phone/tablet screen stay byte-identical. Task 12 checks this with `git diff` on those files.
- **Source and build:**
  - Source of truth is `work/working/src`. Build with `work/working/linux/build-linux.sh <scratch dir>`, never `build/linux`.
  - Smoke tests run on an isolated `HOME` and `XDG_CONFIG_HOME` in the scratchpad, never on the real profile.
  - Never read from or write to the user's hub or keypad.
- **Code style:** as in `tshLayout.js` and `deviceTableModel.js`.
  - CommonJS with the `exports.a = exports.b = undefined` list, `var`, double quotes, 2 spaces.
  - Lines ≤ 120 columns in new pure modules; JSX files follow the existing editor style.
  - Header comment per file and one comment per function (why, returns).
  - Format facts are named constants with their source: Ghidra function address, shot name or sample number.
- **i18n:** every new UI text goes through `t("tsh_editor.…")`, in PL and EN, and `tshEditorI18n.test.js` keeps key parity.
- **Tests:**
  - `npm --prefix work/working/tools test`. Currently 210 pass; every task keeps all of them green.
  - New tests go in `work/working/test/unit/tshEditor/*.test.js`, helpers in `test/support/`, fixtures in `test/fixtures/`.
  - Assert whole objects; test limits below, at and above.
  - Coverage of changed lines: ≥ 90 % line, ≥ 80 % branch.
- **Change register:**
  - Every functional change goes in `REJESTR-ZMIAN.md` under the next number, from **044**: one entry per task that changes behaviour, with files, anchors, code before/after and verification, in the style of 036/037.
  - `CHANGELOG.md`: under `## [Unreleased]`, `### Changed`/`### Fixed` with the original version (BE WAVE Soft 1.2.0).
  - `mod-recipes/01-tsh-soft.md`: list the new register entries and update "Zachowanie".
- **Git:** commits go to `main`. Stage by path, use an imperative subject like `git log` ("TSH editor: …"), and add no `Co-Authored-By` or any AI mention. Use `git -c safe.directory='*'` on this NFS dir. Never touch the untracked `*_bewave.bac.management/` backup directory in the repository root.
- **Satel material:** TSH binaries, shots and extracted graphics stay out of git (`work/re-tsh/` is ignored). Tools that compare against shots read them from `work/re-tsh/shots` at run time.
- **GUI automation of TSH Soft under wine** is allowed only after it is announced to the user. Every new TSH shot in section 4.4 is optional. Ghidra is enough for most facts.

## Review Focus

- **No move without intent.** No code path may change X/Y on a press/release whose pointer travelled < 4 CSS px. Pinned by Task 7 unit tests and the built-renderer CDP check (jitter 0, 1 and 3 px).
- **Untouched widgets stay put.** Clamping must never rewrite a widget the user did not drag (a widget loaded partly off-screen stays as loaded). Pinned in Task 7.
- **Metrics come from the TSH table only, never ratios.** Pinned by whole-object tests of `metricsFor(1024,600)` and `metricsFor(480,272)` in Task 3.
- **Undo/redo restores the exact model.** The model is compared by deep equality, and the selection is clamped to existing widgets. Pinned in Task 8.
- **Phone/tablet unchanged.** Only `desktop/tshEditor/*` and i18n files change in the renderer.

---

## 3. UX Redesign (desktop editor)

### 3.1 Principles

1. **The keypad screen is the product.**
   - The canvas takes all space left by two slim side panels. It is centred on a neutral canvas background (`Color.secondary100`) with a 1 px border and a soft shadow, in the exact keypad aspect ratio, and zoomable.
2. **One place per job.**
   - **Toolbar:** document actions (undo/redo, add widget, grid, zoom, SD card, budget, Cancel/Save).
   - **Left panel:** structure (screens, then the layers of the selected screen).
   - **Right panel:** properties of the selection.
   - Nothing floats.
3. **Selection is shared.** Canvas, layers list and inspector always show the same selection, and every list row maps to one thing on the canvas.
4. **Direct manipulation is safe.**
   - Click selects and drag moves, with a 4 px threshold.
   - Snapping happens only while dragging with the grid on; Alt suspends it.
   - Everything is undoable, and Delete asks first.
5. **Human words, not codes.**
   - Rows show the widget's glyph and its content ("„Brama”", "Brama Wjazdowa", "Scena: Wyjście").
   - Icons are picked visually; the hex code appears only in a tooltip.
6. **App look.**
   - Colours only from `GetHexColorTransparent.Color`.
   - Spacing scale 4/8/12/16/24.
   - Section titles 11 px uppercase, letter-spacing 0.06em, `secondary600`.
   - Labels 13 px `secondary800`, values 13 px.
   - Controls 32 px high, radius 6, border `secondary300`, focus ring `primary500`.
   - The primary button uses the same colour tokens as `PageButtonPrimary`, in a compact 32 px variant.
   - Same idioms as `desktop/deviceTable` (toolbar row with a search/select look, `PressableOpacity` rows) and `desktop/shared`.

### 3.2 Wireframe (window 1440×900; minimum 900×600)

```
+--------------------------------------------------------------------------------------------------------------+
| <-  Edytor ekranów klawiatury      INT-TSG2 - 480 x 272                                                   X |  Page header (unchanged)
+--------------------------------------------------------------------------------------------------------------+
| [<-][->] | [+ Widżet v] | [# Siatka] | [-] [ Dopasuj v ] [+] | [Karta SD] |  ====------  1 024 / 65 535 B | [Anuluj] [Zapisz] |  toolbar 48
+----------------------+-------------------------------------------------------------+-------------------------+
| EKRANY          [+v] |                                                             | [ Ekran ] [ Widżet ]    |  tabs follow selection
| +------+ Motyw       |                                                             | Przycisk                |
| |~~~~~~| Collage     |                                                             | steruj Brama Wjazdowa   |
| +------+             |   +-----------------------------------------------------+   |-------------------------|
| +------+ Wygaszacz   |   | !  o  ~  ^                       22:25:38       (u) |   | v POŁOŻENIE I WIELKOŚĆ  |
| |~~~~~~|             |   |-----------------------------------------------------|   |  X [  84 ]   Y [ 211 ]  |
| +------+             |   |                                                     |   |  Wielkość (o)M  ( )Ś ( )D|
| UŻYTKOWNIKA  1/16    |   |       (shield)                       (lock)         |   |  [ ] Wyśrodkuj          |
| +------+ (bez nazwy) |   |                                                     |   | v URZĄDZENIE            |
|>|~~~~~~| * główny    |   |                    Sterowanie                        |   |  [ steruj Brama Wj.  v] |
| +------+             |   |  +-----------------------------------------------+  |   | v IKONY                 |
| DODATKOWE    0       |   |  | Brama (OFF)               Furtka (OFF)        |  |   |  Nieaktywna  [(OFF) v]  |
|                      |   +-----------------------------------------------------+   |  Aktywna     [(ON)  v]  |
+----------------------+                                                             | v KOLORY                |
| WARSTWY         [+v] |                                                             |  [x] Kolory ekranu      |
|  (sh) Załącz czuw.   |                                                             | v ZACHOWANIE            |
|  (sh) Wyłącz czuw.   |                                                             |  ...                    |
|> (OFF) Przycisk      |                                                             |                         |
|   T  „Brama”         |                                                             |                         |
|  [ ] Prostokąt 476x38|                                                             |                         |
|   T  „Sterowanie”    |                                                             |                         |
|   T  „Furtka”        |  84, 211   84 x 84   Przycisk        Siatka: wył.    140 %  |  [ Usuń widżet ]        |
+----------------------+-------------------------------------------------------------+-------------------------+
  left 264 px (screens list and layers, each scrolls)   canvas flex (scrolls when zoomed)   right 320 px (scrolls)
```

- **Below 1200 px** the right panel narrows to 280 px. **Below 1000 px** the screen thumbnails become 1-line rows (title + type badge). The canvas never goes below 360 px wide.
- **Canvas status line** (24 px, inside the canvas pane): pointer or selection position in keypad px, selection box size, type, grid state and zoom. It replaces the long hint paragraph; the shortcut list moves to a "?" popover in the toolbar.
- **Empty states:**
  - No screen selected: the canvas shows "Wybierz ekran".
  - Screen with no widgets: a centred hint "Dodaj widżet przyciskiem + Widżet" over the screen.
  - Card-only background: an inline banner on the canvas top edge (the current `bg_missing` text).

### 3.3 Components and behaviour

**Toolbar (`TshToolbar.js`)**, left to right:
- Undo/Redo (disabled when empty; tooltip with shortcut).
- "+ Widżet" menu: the 21 addable types in 6 groups (Tekst i wartości: Tekst, Data/czas, Wartość z urządzenia, Stan wyjścia (tekst) · Sterowanie: Sterowanie, Przycisk, Ikona wejścia/wyjścia · Alarm: Załącz/Wyłącz/Załącz-wyłącz czuwanie, Kasowanie alarmu, Napad/pożar/medyczny · Wskaźniki: Stan pomieszczenia/wejścia/wyjścia · Nawigacja: Odsyłacz, Uruchom/Zatrzymaj scenę · Kształty i informacja: Prostokąt, Informacja). Each item shows its default glyph. A new widget goes to the visible centre of the canvas, is selected, and the Widżet tab opens.
- Grid toggle (`G`).
- Zoom: −, a level menu (Dopasuj, 50, 75, 100, 150, 200, 300, 400 %), +.
- "Karta SD" (existing window).
- Budget meter: a 120 px bar in `primary500`, then `warning500` at ≥ 90 % and `danger500` over the limit, plus "1 024 / 65 535 B".
- "Anuluj", then "Zapisz" (primary).
- Validation errors appear as a red badge on Zapisz ("2 błędy") that opens a popover listing them. A click on an error selects the screen/widget it names.

**Left panel (`TshScreenList.js` rewrite + new `TshLayerList.js`)**
- **Screens**, grouped under headings: Motyw, Wygaszacz, Ekrany użytkownika `n/16`, Ekrany dodatkowe `n`.
  - Each row: a 96×54 (TSH2) / 96×54 letterboxed (TSG2) thumbnail from `TshScreenRender` at static scale, the title, and badges ("główny", "bez motywu").
  - The title falls back to "Ekran {n} (bez nazwy)" when the name has no visible character (fixes RC9).
  - Row hover shows ↑ ↓ and a "…" menu (Przenieś wyżej/niżej, Usuń…). Removing keeps the existing inline question.
  - "+" opens a menu (Ekran użytkownika, Ekran dodatkowy).
- **Layers:** the widgets of the selected screen in draw order (top of list = drawn first, as TSH stores them).
  - Each row: glyph (18 px WDGT glyph, or "T" for text kinds, a box for rectangle, a dot for indicators), then the human label (`tshWidgetLabel.js`), then the type in `secondary500` on hover.
  - Click selects; Delete on a focused row asks to remove; ↑/↓ move focus.
  - "Przenieś na wierzch/spód" goes in the row menu. It is a model reorder, which `tshEditorModel` lacks today (Task 10 adds `reorderWidget`).

**Canvas (`TshCanvas.js` over `TshScreenRender.js`)**
- **Stage:** the keypad screen in keypad pixels inside a `transform: scale(z)` box.
- **Overlay (CSS px, not scaled):**
  - hover outline (1 px `primary300`);
  - selection outline (2 px `primary500`) with the anchor marker at the stored X/Y;
  - snap guides (1 px `warning500`);
  - a drag tooltip with "x, y".
- **Zoom:** Fit is the default and fits the pane with 24 px padding. Ctrl/Cmd+wheel zooms around the pointer, Ctrl/Cmd+0 fits, Ctrl/Cmd+1 sets 100 %, Ctrl/Cmd+= / − step through the levels. When the stage is larger than the pane, the pane scrolls.
- **Interaction rules** are in section 5.

**Inspector (`TshInspector.js`, replaces the layout part of `TshPropertyPanel.js`)**
- **Tabs:** "Ekran" | "Widżet". The Widżet tab is enabled only with a selection; selecting a widget switches to it, and Esc returns to Ekran.
- **Header:** title (widget label or screen title) and a secondary line (type, and the device when it has one).
- **Sections** (collapsible, state kept per section in `localStorage` with try/catch) reuse the existing field components (`TshFormControls`):
  - **Screen:** Ogólne (name with a byte counter and a "same spacje" hint, type, main) · Wygląd (use theme, colours, keypad grid "Siatka na klawiaturze") · Tło (background picker) · Wygaszacz options on the saver.
  - **Widget:** Położenie i wielkość (X, Y as steppers; size as a 3-segment control M/Ś/D; Wyśrodkuj) · Treść / Urządzenie (type-specific fields) · Ikony (icon pickers, arm states) · Kolory · Zachowanie (code, long press, logout, not in arm…).
- **Footer:** "Usuń widżet" (danger outline). The panel body scrolls (`overflowY: auto`) with a sticky header.

**Icon picker (`TshIconPicker.js`)**
- A popover anchored to the field: 8 columns of 40 px cells with the glyph at 28 px, the current one ringed in `primary500`, and a "Użyte w tym układzie" row first.
- Keyboard: arrows, Enter and Esc.
- Tooltip "Kod 0x11d". The field itself shows the glyph only (fixes RC13). Honours the existing `max` (link icon ≤ 0xff).

---

## 4. Rendering Fidelity

### 4.1 TSH metric table (Ghidra `FUN_00ab0cd4`, called with the keypad width/height)

`FUN_00ab0cd4` branches on `width < 0x321` (≤ 800 → TSG2) and fills globals at `0xb0c0c4..0xb0c0da`. Users in TSH_soft.exe:

| Global | Meaning (user function) | TSH2 1024×600 | TSG2 480×272 | Ours today TSH2 / TSG2 |
|---|---|---|---|---|
| `_1436` | status bar height (`FUN_00a9b794`, `FUN_00aac538`) | 52 | 26 | 53 / 26.5 |
| `_1438/_1440/_1442` | text font em px, size 0/1/2 (`FUN_00a9f048`). Size 2 uses **Roboto Thin**, sizes 0–1 Roboto Light. Alignment arg: 0 left, 1 right (x − w), 2 centre (x − w/2). Drawn at x + 1. | 18 / 33 / 54 | 12 / 15 / 25 | 18/36/54 / 9/18/27 |
| `_1444/_1446/_1448` | icon em px, size 0/1/2 (`FUN_00a9f270`, WDGT font face `"u"`). Box = `TextWidth("1")` × `TextHeight("1")`. | 77 / 115 / 180 | 36 / 54 / 84 | 76/152/228 / 38/76/114 |
| `_1450` | screensaver clock hh:mm, Roboto Thin (`FUN_00aa064c`); also Light at `_1450 >> 1` (128/60) for a measured string | 256 | 120 | 294 / 147 |
| `_1452` | screensaver seconds, Roboto Light (`FUN_00aa064c`) | 77 | 36 | 78 / 39 |
| `_1454/_1456/_1458` | indicator em px, size 0/1/2 (`FUN_00a9f3a8`) | 20 / 36 / 52 | 10 / 16 / 24 | 20/40/60 / 10/20/30 |

**Widget drawing in `FUN_00a9f9d0` (dispatcher):**
- **Icon glyph.** u16 at payload 0x13, or 0x15 when "active" (preview passes inactive). Overrides by type:
  - 0x23 panic: 0x105/0x106/0x107 by kind.
  - 0x24 info: 0x11b.
  - 0x25 link: u16 at 0x11.
  - 0x21: 0x15/0x17.
  - 0x31 and 0x33–0x37: state icon + colour from the state table at 0x19/0x1b/0x20/0x25/0x2a/0x2f.
  - Glyph 0 is drawn as 0x22.
- **Indicators.** Types 1–3 go to `FUN_00a9f3a8`. Glyph 0x1df is drawn first as a base: white, or `#ff4d4d` for output. Then:
  - room: 0x1fc in `#00d9a5`, then the 0x1e8 ring in black;
  - input: 0x1e0 in black;
  - output: the 0x1e8 ring in black.
  - (TColor `$BBGGRR` decoded.)
- **Rectangle.** 0x17 goes to `FUN_00a9f63c`.
- **Text kinds.** Text from `FUN_00a9d7e0`, alignment from `FUN_00a5cf9c`.
- **Selection frame.** The background colour ±0x32 (`FUN_00550110`), and magenta guide lines when the grid option is on.

**Measured fixed geometry kept from task 4/5 (TSH2, `[F]` from shots):**
- status icons 0xa4/0xa2/0xa6/0xa8 at x 6/68/127/187, 40 px;
- user icon 0x21 30 px at 968/8;
- clock right edge 935;
- page dots y 550, pitch 15, size 11;
- grid 5×2, margin and gap 20.

**TSG2 from `tsg_scr.png`** (preview scale 632/480 = 1.3167, origin 238/80):
- bar line at keypad 26.6;
- bar clock ink 50.9 px wide (≈ 14 px Roboto), right ink edge at 434;
- page dot at y ≈ 245;
- no status icons on the non-main screen.

Everything else for TSG2 is `[P]` until Task 1 reads it from code.

### 4.2 Target layout per widget kind (implemented in Tasks 3–4)

| Kind (types) | Box | Drawn content |
|---|---|---|
| text (0x00, 0x05 date, 0x30 value, 0x03 output text) | width = text advance at `font[s]` (Roboto Light/Thin advance tables), height = `TextHeight` = font × 1.172 (Roboto ascent+descent 2400/2048); left = x − 0 / w / w/2 by alignment | text at (left + 1, top), face Light for s 0–1, Thin for s 2 |
| icon (control, button, input/output icon, scenes, arm family, link, panic, info) | `TextWidth("1")` × `TextHeight("1")` of WDGT at `icon[s]` (Task 1 reads the advance of glyph 0x31; until then em × em) | glyph by the dispatcher rules above, colour cl1 or state colour |
| indicator (0x01, 0x02, 0x03 icon variant) | as icon with `indicator[s]` and glyph `"1"` | composed glyphs and colours above |
| rect (0x17) | data width × height | border cl1 `border` px, fill cl2 with the rule of `FUN_00a9f63c` (Task 1 replaces the `[P]` alpha = transparency/255) |
| raw / 0x15 | 48 × 48 TSH2, 24 × 24 TSG2 (table bar/2 ratio, `[P]`) | hatched box, not movable |

**Screens:**
- **Status bar** on user and additional screens: height `_1436`. The name, clock and user icon use the geometry from Task 1. The four status icons appear only where Task 1 shows TSH draws them (expected: main screen).
- **Page dots:** user screens only.
- **Keypad grid:** drawn when the screen's grid flag is on.
- **Screensaver:** clock and seconds from `_1450/_1452` with TSH's centring from `FUN_00aa064c`.
- **Date** text: Delphi `FormatDateTime` semantics (Task 5), with day and month names in the blob's `lang` (pl/en; others en).

### 4.3 How fidelity is verified

- **Comparison tool.** `work/working/tools/tsh-preview-compare.mjs` (Task 2) runs against the built app over CDP:
  - It injects a harness that renders one blob with `TshScreenRender` at TSH's preview scale: 0.6 for TSH2 and 632/480 for TSG2. The TSH preview is 614×360 / 632×358 at origin 238/80 in a 1123×663 shot.
  - It loads the TSH shot into the page as a data URL and crops the preview.
  - Comparison runs in the page (canvas `getImageData`), with no new npm packages: an ink bounding box per widget region, given in the case file as keypad rects. Tolerances are ±2 keypad px for edges and ±3 % for width/height.
  - It writes `report.json` and a side-by-side PNG (TSH | editor | diff) to an output dir in the scratchpad.
- **Case file** `work/working/tools/tsh-compare-cases.json`: shot name, sample number, record index, regions with labels. It references only file names, not images.
- **TSH2 cases** (existing shots): `e2…e12`, `s_s*`, `now.png`, saver shot. These are the cases of `cmp-tsh2-a…d`, `saver`.
- **TSG2 cases:** `tsg_scr.png` + sample 084 (small text at 100/100, status bar name/clock/user icon, page dot).
- **Baseline.** Task 2 records today's numbers; Tasks 3–4 must bring every region within tolerance. A region without a shot is listed as "not verified", never as passed.

### 4.4 Extra TSH Soft shots (OPTIONAL; wine GUI automation only after announcing it to the user)

Task 1 (Ghidra) should make most of these unnecessary. Take them only for facts Task 1 leaves `[P]`. Use the existing `work/re-tsh/run-tsh.sh`/`shot.sh` with one change per sample, as before.

1. TSG2: one widget per type at 100/100, size small (the TSG2 counterpart of samples 024–040), one screen each.
2. TSG2: the same for sizes medium and large for text, button, room indicator and arm.
3. TSH2: medium and large for button, room indicator and text (checks 33/115/180, 36/52).
4. TSG2 screensaver with clock, with and without a Date widget.
5. TSH2 screensaver with a Date widget formatted `dddd, d mmmm yyyy` and `ddd dd.mm.yy hh:nn`.
6. TSG2 main screen and TSH2 non-main user screen (status icons rule); TSG2 grid on.
7. TSG2 additional screen (status bar on additional screens).
8. Date and Value with centre alignment on TSG2; any type that offers right alignment.
9. A rectangle drawn over a button (z-order and the selection frame).

---

## 5. Interaction Specification

- **Coordinates.** All math is in keypad px:
  - `toKeypad(clientX, clientY, stageRect, z) = ((clientX − stageRect.left) / z, (clientY − stageRect.top) / z)`, with `stageRect` the live `getBoundingClientRect()` of the scaled stage.
  - This mapping is correct at any zoom, scroll position or window size. No captured scale, and no deltas accumulated across re-renders.
- **Press.**
  - Hit-test in keypad px (`hitTest`, Task 7). Topmost first, over widgets whose box contains the point.
  - A rectangle is hit only within `max(border, 4 / z)` of its edge, unless nothing else is under the pointer.
  - Alt+press cycles through all widgets under the pointer.
  - The press selects the widget (or clears the selection on empty canvas) and focuses the canvas. It does not move anything.
- **Drag.**
  - Starts only after the pointer travels ≥ 4 CSS px from the press point (`DRAG_THRESHOLD_PX`). Pointer capture is taken at that moment.
  - During the drag: new anchor = pointer − grab offset, where the grab offset is the pointer minus the anchor at the press. The widget's stored X/Y is the anchor; for centred widgets it is the middle.
- **Snapping.**
  - Only during a drag, only with the toolbar grid on, and suspended while Alt is held.
  - Targets: TSH grid cell edges (5×2 with margins), screen edges, screen centre lines.
  - The box edges and box centre snap to the nearest target within `SNAP_PX / z` keypad px (`SNAP_PX = 6` CSS px), and a guide line is shown.
- **Clamp.**
  - Only the anchor is clamped, to 0…width−1 and 0…height−1, as `moveWidget` already does.
  - Boxes may extend past the edge, as in TSH and in user layouts.
  - A widget that is not dragged is never rewritten.
- **Commit.** One `moveWidget` per drag on release, and only when X/Y changed. Esc during a drag cancels it and restores the original X/Y.
- **Keyboard on the focused canvas:**
  - Arrows nudge 1 px, Shift+arrows 8 px (as today), clamping only the anchor. A held arrow coalesces into one undo step.
  - Delete/Backspace asks `confirmDialog` "Usunąć widżet „Brama”?", then Usuń/Anuluj.
  - Esc clears the selection, or cancels the drag.
  - Tab and Shift+Tab select the next and previous widget.
  - Ctrl/Cmd+Z undoes; Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y redo; G toggles the grid.
  - Ctrl/Cmd+0, +1, =, − control zoom.
  - Shortcuts are ignored while focus is in an `input`, `select` or `textarea`, so native text undo stays.
- **Selection sync.**
  - Canvas → layers: the row scrolls into view.
  - Layers → canvas: the stage scrolls the box into view when zoomed.
  - Inspector edits keep the selection. Undo/redo clamps the selection: a missing widget index becomes null, and a missing screen uid falls back to the first user screen.
- **History** (`tshHistory.js`):
  - Snapshots of the immutable `TshEditorState`, at most 100.
  - Consecutive changes with the same coalescing key within 1000 ms merge into one step. Keys are `field:<uid>:<widget>:<path>` for typing and `nudge:<uid>:<widget>` for arrows.
  - Drags and discrete actions never merge.
  - "Unsaved changes" means `present !== loadedState`.

---

## 6. Tasks

### Task 1: Read TSH Soft's preview geometry from the exe (docs only)

**Files:**
- Modify: `PROJEKT-TSH.md`, new section 2.6 "Podgląd TSH Soft: metryki i rysowanie", with [F]/[P] like 2.5.
- Scratch: new Ghidra scripts in `~/snap/ghidra/common/tsh/scripts`, outputs in `~/snap/ghidra/common/tsh/`. Not committed.

- [ ] **Step 1: Record what this plan already established.**
  - Table 4.1, the dispatcher rules and the indicator composition, with function addresses.
  - Command used: `/snap/bin/ghidra.analyzeHeadless ~/snap/ghidra/common/tsh tsh -process TSH_soft.exe -noanalysis -readOnly -scriptPath ~/snap/ghidra/common/tsh/scripts -postScript DumpRange.java <out> <start> <end>`. One run takes ~1–2 min.
  - Existing dumps: `r_ab0cd4.txt`, `ptr8.txt` (users of the table), `r_a9f9d0.txt`, `r_aac538.txt`, `aa064c.c`.
- [ ] **Step 2: Decompile and document the following.**
  - `FUN_00aac538`: status bar. Name/clock font and size index, x positions, user icon, status icons, and the condition for the four status icons (main screen?).
  - `FUN_00aa064c` lines ~400–800: saver clock, seconds and date positions from `TextWidth/TextHeight(":")`, `("00")`, and the 80-bit constants at `0xaa18e8`/`0xaa18f4`.
  - `FUN_00a5cf9c`: alignment from the widget flags; which bit gives right alignment.
  - `FUN_00a9d7e0`: the text per type: value sample, output text, date format call.
  - `FUN_00a9f63c`: rectangle fill and border.
  - The WDGT advance of glyph 0x31 (icon/indicator box), from `wdgt.ttf` hmtx via the build's extracted font. Use a small node script reading `hmtx`; no new npm packages.
  - The grid on TSG2 (`FUN_00aa064c` grid branch) and the page dots.
- [ ] **Step 3: Write section 2.6** with a "[F] from code / [F] from shot / [P]" column. List the section 4.4 shots that are still needed.
- [ ] **Step 4: Commit.**
  - `git add PROJEKT-TSH.md`
  - `git commit -m "TSH Soft: preview metrics and drawing rules read from the exe"`

### Task 2: Fidelity comparison tool and baseline

**Files:**
- Create: `work/working/tools/tsh-preview-compare.mjs`: CDP client plus in-page comparison, with usage in its header.
- Create: `work/working/tools/tsh-compare-cases.json`.
- Create: `work/working/tools/tsh-preview-harness.js`: harness entry, bundled by the tool with esbuild as `scratchpad/h45/build.mjs` does.
- Create: `work/working/test/unit/tshEditor/tshCompare.test.js`: tests the pure helpers (ink box, tolerance check) exported from `work/working/tools/tshCompareCore.mjs`.

**Interfaces:**
```js
// tshCompareCore.mjs (pure, used in the page and in tests)
export function inkBox(rgba, width, height, region, background) // -> {left, top, right, bottom} | null
export function compareRegion(tsh, editor, tolerance)            // -> {ok, dLeft, dTop, dWidthPct, dHeightPct}
```

- [ ] **Step 1: Tests first** for `inkBox`: an empty region gives null; one pixel; an anti-aliased edge at threshold 140; a region touching the border. Tests for `compareRegion`: at, below and above ±2 px and ±3 %.
- [ ] **Step 2: Implement the core and the tool.**
  - Usage: `node tools/tsh-preview-compare.mjs <ws-url> <cases.json> <out dir> [case…]`.
  - The tool reads shots from `work/re-tsh/shots` and fails with a clear message if they are missing.
- [ ] **Step 3: Record the baseline.**
  - Build to `<scratch>/build` and run the app on an isolated HOME with `--remote-debugging-port`.
  - Record the baseline report in the task report (expected: TSG2 text and bar regions out of tolerance, TSH2 small sizes within).
- [ ] **Step 4: Commit** — "TSH editor: preview comparison tool against TSH Soft shots".

### Task 3: Metric tables per resolution

**Files:**
- Create: `desktop/tshEditor/tshMetrics.js`. `TSH2_METRICS` and `TSG2_METRICS` hold the table 4.1 values plus the measured fixed geometry. `metricsFor(width, height)` returns the matching table, with `width`/`height`; an unknown resolution falls back to the nearest model by width (≤ 800 → TSG2).
- Modify: `tshLayout.js`. Remove `TSH2_METRICS`, `RESOLUTION_SCALE` and `metricsFor`, and re-export `metricsFor` from `tshMetrics.js` so callers stay. `UNKNOWN_BOX` and `SNAP_DISTANCE` become per-table values.
- Test: `test/unit/tshEditor/tshMetrics.test.js`. Update `tshLayout.test.js` expectations that encoded the old sizes, and record each changed expectation in the report.

- [ ] **Step 1: Failing tests.**
  - Whole-object `metricsFor(1024,600)` and `metricsFor(480,272)`.
  - The user case: TSG2 button size 2 → box 84×84, and `dragPosition` with 0 movement keeps 84,211 (a regression pin, still with the old clamp, to show the metrics alone fix the user's case).
  - TSG2 text size 0 "Nowe pole tekstowe" width within 2 px of 104 (`tsg_scr.png`).
- [ ] **Step 2: Implement** until all tests pass.
- [ ] **Step 3: Compare.** Run the Task 2 tool. TSG2 small text and bar regions are now within tolerance.
- [ ] **Step 4: Docs.**
  - REJESTR-ZMIAN 044 "Edytor TSH: metryki podglądu z tabeli TSH Soft (TSH2 i TSG2)".
  - CHANGELOG `### Fixed` "Edytor ekranów: rozmiary czcionek i ikon jak w TSH Soft, także dla INT-TSG2".
  - mod-recipes/01.
- [ ] **Step 5: Commit** — "TSH editor: preview metrics from TSH Soft's table for TSH2 and TSG2".

### Task 4: Widget and screen drawing as TSH draws them

**Files:**
- Modify: `tshLayout.js`:
  - `widgetLayout`: text face per size (`font: {size, face: "light"|"thin"}`), +1 px text offset, alignment left/right/centre from the model (add `align` decode only if Task 1 finds a right-align bit; otherwise centre as today), icon box from the 0x31 advance, default glyph 0x22, panic/info/link/arm glyph rules per 4.1.
  - Thin advance table (ROBT `hmtx`, the same charset as ROBL) for size 2 widths.
  - Indicator composition data.
  - Status icon rule.
  - Saver geometry from Task 1.
- Modify: `TshPreview.js` (or the Task 6 renderer when it lands first): draw the composed indicators, the Thin face, and the status icons only where the rule says.
- Modify: `tshAssets.js`, only if the Thin face is not yet installed for widgets (it is installed for the saver).
- Test: `tshLayout.test.js`, new cases per kind and per resolution.

- [ ] **Step 1: Failing tests, one per rule:**
  - size 2 text uses Thin and its width comes from the Thin table;
  - text left = x + 0 and draw offset 1;
  - centred date box left = x − round(w/2);
  - room indicator layers `[{glyph:0x1df,color:"#ffffff"},{glyph:0x1fc,color:"#00d9a5"},{glyph:0x1e8,color:"#000000"}]`;
  - output `[0x1df #ff4d4d, 0x1e8 #000000]`;
  - icon 0 → 0x22;
  - TSG2 saver clock font 120, seconds 36, positions per Task 1;
  - status icons absent on a non-main user screen (if Task 1 confirms).
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Compare.** Run the tool on all TSH2 and TSG2 cases; all regions with a shot must be within tolerance. Attach side-by-side PNG paths to the report.
- [ ] **Step 4: Docs.** REJESTR 045, CHANGELOG `### Fixed` (large text face, indicators, status bar icons, saver clock), mod-recipes/01.
- [ ] **Step 5: Commit** — "TSH editor: draw text faces, icons, indicators and the screensaver like TSH Soft".

### Task 5: Delphi date/time formatting

**Files:**
- Create: `desktop/tshEditor/tshDateFormat.js` with `formatTshDate(format, date, lang)`. It implements the Delphi `FormatDateTime` tokens:
  - `c`, `d`, `dd`, `ddd`, `dddd`, `ddddd` (short date), `m`, `mm`, `mmm`, `mmmm` (`m`/`mm` right after an `h`/`hh` token = minutes), `yy`, `yyyy`, `h`, `hh`, `n`, `nn`, `s`, `ss`, `z`, `zzz`, `am/pm`, `a/p`, `t`, `tt`, `/` and `:` separators (Polish locale: `.` and `:`);
  - literals in `"…"` and `'…'`;
  - all tokens case-insensitive.
  - Day and month names are PL and EN constants, chosen by the blob's `lang`.
- Modify: `tshLayout.js` (`formatDate` delegates; `widgetText` passes `state.input.lang`). The `lang` reaches `widgetLayout` through an options argument `{ now, lang }`, and every caller is updated.
- Test: `test/unit/tshEditor/tshDateFormat.test.js`.

- [ ] **Step 1: Failing tests** at 2026-11-14 22:25:26:
  - `dd.MM.yyyy hh:mm:ss` → `14.11.2026 22:25:26`;
  - `dddd, d MMMM yyyy` → `sobota, 14 listopada 2026` (pl) and `Saturday, 14 November 2026` (en);
  - `hh:nn` → `22:25`;
  - `ddd dd.mm.yy` → `sob. 14.11.26`;
  - quoted literal `'godz.' hh` → `godz. 22`;
  - empty format → `""`;
  - unknown letters pass through.
- [ ] **Step 2: Implement.**
  - Month names in Polish: whether the genitive is used in `mmmm` follows Delphi's `LongMonthNames` under the Polish locale (Windows `pl-PL` gives "listopad"). Task 1 or optional shot 5 decides.
  - Until then, use the nominative and record a `[P]` ruling.
- [ ] **Step 3: Docs and commit.**
  - REJESTR 046, CHANGELOG `### Fixed` "data w widżecie Data/czas formatowana jak w TSH Soft".
  - Commit "TSH editor: format Date/time widgets with TSH Soft's date tokens".

### Task 6: Split the static screen renderer

**Files:**
- Create: `desktop/tshEditor/TshScreenRender.js`. `TshScreenRender({ state, screen, themes, customImages, scale, now, lang })` renders background, grid, status bar, dots, saver and widgets. It has no event handlers and is `React.memo` on `screen` identity + scale.
- Modify: `TshPreview.js` becomes `TshCanvas.js` (interaction, Task 7) and uses `TshScreenRender`. Keep `TshPreview.js` as a thin re-export until the route switches in Task 9, then delete it.
- Test: `tshScreenRender.test.js` with `react-test-renderer`? Not available. Instead, extract `screenDrawList(state, screen, opts)` (pure: an ordered list of draw items with their layouts) into `tshLayout.js` and test that; the component maps items to DOM.

- [ ] **Step 1: Failing tests** for `screenDrawList`:
  - user screen order: background, keypad grid, status bar, dots, widgets;
  - saver: no bar, clock items;
  - theme record: background only.
- [ ] **Step 2: Implement and switch the preview** to the renderer. Run the Task 2 tool to confirm no visual change.
- [ ] **Step 3: Commit** — "TSH editor: static screen renderer for the canvas and thumbnails" (refactor, no register entry).

### Task 7: Pointer interaction without accidental moves

**Files:**
- Create: `desktop/tshEditor/tshPointer.js` (pure):
```js
exports.DRAG_THRESHOLD_PX = 4;  // CSS px before a press becomes a drag
exports.SNAP_PX = 6;            // CSS px snap distance
exports.toKeypad = function (clientX, clientY, stageRect, zoom) {}            // -> { x, y } floats
exports.passedThreshold = function (start, point) {}                          // CSS px, -> boolean
exports.hitTest = function (layouts, point, zoom, cycleFrom) {}               // -> index | null
exports.dragAnchor = function (grab, point, layout, m, opts) {}               // opts { snap, zoom } -> { x, y, guides }
exports.nudgeAnchor = function (w, delta, m) {}                               // -> { x, y } (anchor clamp only)
```
- Create: `desktop/tshEditor/TshCanvas.js`. Pointer handlers on the stage container, not per widget, plus the selection/hover/guide overlay and the status line.
- Modify: `tshLayout.js`. Remove `dragPosition`'s whole-box clamp (keep `snapToGrid` geometry, used by `dragAnchor`).
- Test: `test/unit/tshEditor/tshPointer.test.js`.

- [ ] **Step 1: Failing tests:**
  - **Threshold:** 3.9 px → false, 4 px → true, diagonal 3,3 → true.
  - **toKeypad:** at zoom 0.65, 1.3167, 2; with scroll (stageRect.left negative).
  - **hitTest:**
    - topmost wins;
    - a rectangle interior lets the button under it win (the user's strip case: rect 2,232 476×38 over button 84,211 size 2 TSG2 → the button at point 120,250);
    - the rectangle border is hit;
    - Alt cycling order;
    - empty space → null.
  - **dragAnchor:**
    - no snap when `snap:false`;
    - snaps the box edge to a cell edge within 6/zoom px, not at 6/zoom + 1;
    - snaps the centre to the screen centre;
    - the anchor clamps to 0…479/0…271;
    - a box past the edge is allowed.
  - **nudgeAnchor:** an oversized widget nudged by +1 moves by exactly 1.
  - **The user regression:** press/release without passing the threshold → no `onMoveWidget` call. This is a component-level guard, tested through an exported pure reducer `pointerReducer(state, event)` that `TshCanvas` uses, with events `down`/`move`/`up`/`cancel`/`key`.
- [ ] **Step 2: Implement `tshPointer.js` and `TshCanvas.js`.**
  - Snap uses the toolbar grid state, passed as prop `snapEnabled`.
  - Alt suspends snapping.
  - Esc cancels the drag.
- [ ] **Step 3: Built renderer check (CDP).**
  - Adapt `scratchpad/t8/repro.mjs`: TSG2 user-like input; press/release with 0, 1 and 3 px jitter on the button and on the rectangle → X/Y unchanged.
  - Drag +60/+30 CSS px at zoom Fit and at 200 % → expected anchors.
  - Grid on: snap observed.
  - Alt: no snap.
- [ ] **Step 4: Docs.** REJESTR 047, CHANGELOG `### Fixed` "kliknięcie widżetu nie przesuwa go; przyciąganie tylko przy przeciąganiu z włączoną siatką".
- [ ] **Step 5: Commit** — "TSH editor: drag threshold, hit testing and snapping only while dragging".

### Task 8: Undo/redo and keyboard shortcuts

**Files:**
- Create: `desktop/tshEditor/tshHistory.js`:
```js
exports.HISTORY_LIMIT = 100;
exports.COALESCE_MS = 1000;
exports.createHistory = function (state) {}            // -> { past: [], present, future: [], key: null, at: 0 }
exports.record = function (h, next, key, at) {}        // -> history (coalesces same key within COALESCE_MS)
exports.undo = function (h) {}                         // -> history
exports.redo = function (h) {}                         // -> history
exports.clampSelection = function (state, selection) {}// -> selection valid in state
exports.shortcutFor = function (event) {}              // -> "undo"|"redo"|"delete"|"grid"|"zoomIn"|… | null
```
- Modify: `TshEditorRoute.js`. Editor state goes through history; `apply(result, key)`; a window-level keydown listener calls `shortcutFor` and ignores events from form fields. Delete uses `module623.confirmDialog`.
- Modify: `TshInspector`/field components pass coalescing keys.
- Test: `test/unit/tshEditor/tshHistory.test.js`.

- [ ] **Step 1: Failing tests:**
  - record/undo/redo deep equality;
  - redo cleared after a new record;
  - limit 100 drops the oldest (99, 100, 101);
  - coalescing at 999 ms vs 1001 ms;
  - a different key never coalesces;
  - `clampSelection` for a removed widget and a removed screen;
  - `shortcutFor`:
    - Ctrl+Z, Meta+Z, Ctrl+Shift+Z, Meta+Shift+Z, Ctrl+Y, Delete, Backspace, G → their actions;
    - Ctrl+Alt+Z, Ctrl+Shift+Y → null;
    - target INPUT/SELECT/TEXTAREA → null.
- [ ] **Step 2: Implement.**
  - "Unsaved changes" (`usePreventLeave`) uses `history.present !== loaded`.
- [ ] **Step 3: Built renderer check.**
  - Move, then edit text, then delete (confirm), then Ctrl+Z ×3: the model equals the initial one (compare `buildOutput` base64).
  - Ctrl+Shift+Z ×3: equals the final one.
- [ ] **Step 4: Docs.** REJESTR 048, CHANGELOG `### Added` (undo/redo, Delete with a question, Tab through widgets).
- [ ] **Step 5: Commit** — "TSH editor: undo and redo, Delete with a question, keyboard shortcuts".

### Task 9: Editor shell, toolbar and zoom

**Files:**
- Create: `desktop/tshEditor/TshToolbar.js` (section 3.3) and `desktop/tshEditor/tshZoom.js` (pure):
```js
exports.ZOOM_LEVELS = [0.5, 0.75, 1, 1.5, 2, 3, 4];
exports.fitZoom = function (pane, m, padding) {}     // -> number (pane {width,height} CSS px)
exports.stepZoom = function (current, dir) {}        // -> next level (from Fit: nearest level in dir)
exports.zoomAround = function (scroll, point, from, to) {} // -> new scroll {left, top} keeping point fixed
```
- Create: `desktop/tshEditor/TshEditorShell.js`. Three panes on a full-height grid:
  - height = `innerHeight − shell.top − 16`, measured with a `ResizeObserver` on the shell;
  - the panes use `overflow: auto`;
  - the canvas pane measures itself for Fit.
- Modify: `TshEditorRoute.js`.
  - `Page` gets no `actions` (removes the footer "Zapisz"), so Save/Cancel live in the toolbar.
  - Status row removed; validation goes to the Save badge popover.
  - The model name and resolution go next to the title (`params` title stays; the subtitle is in the toolbar's left end if `Page` has no slot).
- Test: `test/unit/tshEditor/tshZoom.test.js`:
  - fit for TSH2/TSG2 in 1100×700 and 400×300 panes;
  - step from Fit both ways;
  - step at the ends (0.5 down, 4 up);
  - `zoomAround` keeps the pointer's keypad point fixed.

- [ ] **Step 1: Failing tests, then implement.**
- [ ] **Step 2: Built renderer screenshots** with the real `Page` (do not stub `module_32.js` in this harness), at 900×600, 1280×800 and 1920×1080, for TSH2 (sample 054) and TSG2 (`t8/input.json`). Check:
  - the canvas ≥ 60 % of the window width at 1280;
  - no page-level scrollbar;
  - the inspector scrolls;
  - no footer button.
- [ ] **Step 3: Docs.** REJESTR 049, CHANGELOG `### Changed` (new editor layout, toolbar, zoom).
- [ ] **Step 4: Commit** — "TSH editor: full-window layout with toolbar, zoom and budget meter".

### Task 10: Screens and layers panel

**Files:**
- Create: `desktop/tshEditor/tshWidgetLabel.js` (pure). `widgetLabel(w, state, t)` returns `{ glyph, glyphKind: "icon"|"text"|"rect"|"dot", title, subtitle }`:
  - text: `„<text>”`, truncated to 32 chars;
  - date: format;
  - value: device · value name;
  - control/button/icons: device name;
  - scenes: scene name;
  - arm family: alarm mode or room;
  - link: target screen title;
  - rectangle: `Prostokąt W×H`;
  - raw: "Nieobsługiwany".
- Also `screenTitle(entry, index, t)`, with the RC9 fallback when `!/[^\s\u0000-\u001f​-‍﻿]/.test(name)`.
- Create: `desktop/tshEditor/TshLayerList.js`. Modify: `TshScreenList.js` (rewrite to 3.3, thumbnails via `TshScreenRender`).
- Modify: `tshEditorModel.js`. New `reorderWidget(state, uid, index, toIndex)`, with tests.
- Test: `tshWidgetLabel.test.js` (every addable type, empty and whitespace names, missing device), and `tshEditorModel.test.js` (`reorderWidget`: bounds below, at and above, same index).

- [ ] **Step 1: Failing tests, then implement.**
- [ ] **Step 2: Built renderer check.**
  - The user-like TSG2 input shows "Ekran 1 (bez nazwy)".
  - The layer rows show glyphs and „Brama”/„Furtka”/„Sterowanie”.
  - Clicking a row selects it on the canvas and vice versa.
- [ ] **Step 3: Docs.** REJESTR 050, CHANGELOG `### Changed`.
- [ ] **Step 4: Commit** — "TSH editor: screens with thumbnails and a layers list with icons and names".

### Task 11: Inspector, icon picker and add-widget menu

**Files:**
- Create: `desktop/tshEditor/TshInspector.js` (tabs, collapsible sections, sticky header, scroll body; sections per 3.3).
- Create: `desktop/tshEditor/TshIconPicker.js` (popover, keyboard).
- Create: `desktop/tshEditor/tshWidgetGroups.js` (pure): add-menu groups for the 21 addable types, each with its default glyph from `TshTemplates.newWidget`.
- Modify:
  - `TshPropertyPanel.js`: field rendering stays and is reused by sections. The layout and widget list move out; delete what becomes unused.
  - `TshFormControls.js`: `IconField` uses the picker and shows no hex.
  - `TshToolbar.js`: "+ Widżet" menu.
- Test:
  - `tshWidgetGroups.test.js`: every addable type exactly once; no non-addable type.
  - `tshEditorI18n.test.js`: new keys in PL and EN.

- [ ] **Step 1: Failing tests, then implement.**
- [ ] **Step 2: Built renderer check.**
  - The inspector at 600 px window height scrolls to "Ikona: aktywne".
  - Picking an icon by keyboard sets `iconOff`.
  - Add "Przycisk" from the menu: it appears at the visible centre and is selected.
- [ ] **Step 3: Docs.** REJESTR 051, CHANGELOG `### Changed`.
- [ ] **Step 4: Commit** — "TSH editor: grouped scrollable inspector, visual icon picker, add-widget menu".

### Task 12: Final verification and docs

**Files:**
- Modify: `PROJEKT-TSH-EDYTOR.md`: "Wierność podglądu" now says the metrics come from TSH's table; the layout and interaction rules; the open [P] list.
- Modify: `mod-recipes/01-tsh-soft.md`: entries 044–051 and behaviour.
- Modify: `CHANGELOG.md`: Summary lines with what was verified and not verified.

- [ ] **Step 1: Full test suite.** Record the count, and coverage of changed modules before → after.
- [ ] **Step 2: Build and run.**
  - Build to a scratch dir and run on an isolated HOME.
  - Run the Task 2 tool on all cases and attach the report and side-by-side PNGs (TSH2 and TSG2).
  - Run the Task 7–11 CDP checks again.
- [ ] **Step 3: Desktop-only check.**
  - `git diff <start>..HEAD --stat -- work/working/src` lists only `desktop/tshEditor/*` and i18n files.
  - At 800 px window width the keypad settings show no "Edytuj ekrany" button, as before.
- [ ] **Step 4: Commit** — "Docs: TSH editor redesign state and verification".

---

## 7. Rulings

- **TSH metrics.** Ruling: take sizes from TSH_soft.exe's table (`FUN_00ab0cd4`), not from ratios or shots. Why: the code is the source TSH draws with; the shots agree for every measured value except the saver clock (294 measured vs 256 in the table; Task 1 resolves this through the centring code). Cost if wrong: one table constant per value.
- **Keypad grid vs editor grid.** Ruling: the toolbar grid toggle is an editor overlay that drives snapping and is not saved. "Siatka na klawiaturze" in the inspector stays the screen's saved flag (byte 7 bit 0x10) and draws TSH's grid lines in the screen. The toolbar toggle starts on when the screen's flag is on. Why: the saved flag changes what the keypad shows, so it must not be a side effect of an editing aid. Cost if wrong: one extra toggle.
- **Clamp.** Ruling: clamp only the anchor X/Y to the screen and allow boxes past the edge. Why: TSH-made layouts already have such widgets, and the box clamp caused RC3. Cost if wrong: a widget can be dragged mostly off-screen, but the anchor stays visible and selectable from the layers list.
- **Nudge step.** Ruling: keep 1 / 8 px. Why: the existing hint and users' habits; no evidence that 10 is better on 480 px screens. Cost if wrong: one constant.
- **Hit test on rectangles.** Ruling: rectangle interiors are transparent to clicks when another widget is under the pointer. Why: rectangles are used as frames behind controls (the user's strip). Cost if wrong: Alt+click or the layers list selects the rectangle.
- **Delete confirmation.** Ruling: confirm through `confirmDialog` even though undo exists. Why: the brief asks for it. Cost if wrong: one extra click.
- **Thumbnails.** Ruling: live DOM renders of `TshScreenRender` at static scale, memoised per record. Why: no canvas rasteriser to maintain, and the same code as the canvas. Cost if wrong: render time with 19 screens × ~20 widgets, measured in Task 10 (budget < 50 ms per change).
- **Polish month names in `mmmm`.** Ruling: nominative until Task 1 or optional shot 5 shows otherwise. Cost if wrong: a word form in the preview only (the keypad formats on its own).
