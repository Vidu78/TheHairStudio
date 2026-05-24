@echo off
title The Hair Studio - App Demo
color 0A
cls
echo.
echo  ============================================
echo   THE HAIR STUDIO - Avvio App Demo
echo  ============================================
echo.
echo  Avvio server Expo...
echo  Poi scansiona il QR code con EXPO GO
echo  (disponibile su App Store e Google Play)
echo.
echo  Credenziali Demo:
echo    Admin: admin@thehairstudio.it / THS2024!
echo    Cliente: qualsiasi nome + telefono
echo.
echo  ============================================
echo.

cd /d "%~dp0"

:: Mostra QR code
node show-qr.js

echo.
echo  Avvio server Metro (attendi 10-15 secondi)...
echo.

:: Avvia Expo
npx expo start --lan

pause
