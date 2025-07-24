@echo off
echo ========================================
echo GOTOWE! URUCHAMIAM WSZYSTKO...
echo ========================================
echo.

echo INSTRUKCJA:
echo 1. Uruchomi sie ngrok - SKOPIUJ HTTPS URL
echo 2. Uruchomi sie aplikacja Shopify
echo 3. Shopify automatycznie zaktualizuje URLs
echo.
echo UWAGA: NIE ZAMYKAJ OKNA Z NGROK!
echo.

REM Start ngrok w tle  
echo Uruchamiam ngrok...
start cmd /c "START_NGROK.bat"

REM Czekaj 5 sekund na ngrok
echo Czekam na uruchomienie ngrok...
timeout /t 5 /nobreak >nul

echo.
echo Uruchamiam aplikacje Shopify...
echo SHOPIFY AUTOMATYCZNIE ZAKTUALIZUJE URLS!
echo.

REM Start aplikacji - Shopify CLI automatycznie wykryje ngrok
npm run dev

pause