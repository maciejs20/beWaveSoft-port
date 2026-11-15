# Wydawanie nowej wersji (dla opiekuna)

Procedura opiekuna repozytorium: od skończonych zmian do wydania z instalatorami na GitHubie. Budowanie dla siebie opisuje [README.md](../README.md).

1. Zmiany skończone: testy przechodzą, wpisy w `REJESTR-ZMIAN.md`, przepisy w `mod-recipes/`, sekcja w
   `CHANGELOG.md` z datą i podsumowaniem „sprawdzone / niesprawdzone”.
2. Wersja w `work/working/VERSION`: `<wersja Satel>-modX.Y` (X rośnie przy nowych funkcjach, Y przy poprawkach), np.
   `1.2.0-mod3.0`; commit i tag `1.2.0-mod3.0` w repozytorium roboczym. Paczka `.deb` ma wersję z epoką
   (`1:1.2.0+mod3.0`), bo dpkg uznałby `+mod` za starsze od dawnego `+port`; `.pkg` ma `1.2.0.3.0`.
3. Instalatory (dane pakietu bez prywatnego e-maila; własny opis opiekuna przez `BW_MAINTAINER="Nazwa <adres>"`):
   ```bash
   work/working/linux/package-deb.sh && work/working/mac/package-mac.sh
   ```
4. Sumy kontrolne:
   ```bash
   (cd work/working/build/release && sha256sum bewave-soft_1.2.0+mod3.0_amd64.deb BE-WAVE-Soft-1.2.0-mod3.0-arm64.pkg > SHA256SUMS.txt)
   ```
5. Eksport do repozytorium publicznego. Skrypt kopiuje tylko pliki z `work/working/tools/public-files.txt` i odrzuca
   eksport, gdy znajdzie dane osobowe z `~/.config/bewave-soft/leak-patterns` (wzorce trzymane poza repozytorium):
   ```bash
   BW_PUBLIC_AUTHOR="login <id+login@users.noreply.github.com>" work/working/tools/export-public.sh ../beWaveSoft-public --commit "1.2.0-mod3.0"
   ```
   Eksport bierze tylko zacommitowany `HEAD`; `--untracked` pokazuje podgląd drzewa roboczego.
   Potem `git -C ../beWaveSoft-public push`.
6. Tag i wydanie w repozytorium publicznym (opis z CHANGELOG):
   ```bash
   work/working/tools/release-notes.sh 1.2.0-mod3.0 > /tmp/notes.md
   ```
   ```bash
   cd ../beWaveSoft-public && git tag 1.2.0-mod3.0 && git push origin main --tags && gh release create 1.2.0-mod3.0 --title "BE WAVE Soft 1.2.0-mod3.0" --notes-file /tmp/notes.md ../beWaveSoft/work/working/build/release/{bewave-soft_1.2.0+mod3.0_amd64.deb,BE-WAVE-Soft-1.2.0-mod3.0-arm64.pkg,SHA256SUMS.txt}
   ```

