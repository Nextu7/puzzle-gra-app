@echo off
title PUZZLE GRA - NAPRAWIONA WERSJA Z NGROK
color 0A
echo ========================================
echo  NAPRAWIONA APLIKACJA PUZZLE GRA  
echo  KROK 1: URUCHOM NGROK
echo ========================================
echo.
echo 1. Uruchom ngrok w OSOBNYM OKNIE:
echo    START_NGROK.bat
echo.
echo 2. Skopiuj URL z ngrok (np. https://abc123.ngrok-free.app)
echo.
echo 3. Zaktualizuj plik .env:
echo    SHOPIFY_APP_URL=https://twoj-ngrok-url.ngrok-free.app
echo    HOST=https://twoj-ngrok-url.ngrok-free.app
echo.
echo 4. Uruchom aplikacje: npm run dev
echo.
echo UWAGA: Aplikacja teraz dziala na localhost, ngrok tuneluje!
echo WebSocket dziala lokalnie - koniec z bledami EADDRNOTAVAIL!
echo.
pause