@echo off
title CLOUDFLARE TUNNEL - NIE ZAMYKAJ!
echo ========================================
echo  CLOUDFLARE TUNNEL - ZOSTAW WLACZONE!
echo ========================================
echo.
cd /d "D:\puzzle-gra"
echo Sprawdzam konfiguracje tunnel...
echo.

REM Check if tunnel config exists
if not exist "cloudflare-tunnel.yml" (
    echo BLAD: Brak pliku konfiguracyjnego cloudflare-tunnel.yml
    echo Uruchom najpierw: npm run tunnel:setup
    pause
    exit /b 1
)

REM Check if tunnel ID is configured
findstr /C:"YOUR_TUNNEL_ID" cloudflare-tunnel.yml >nul
if %errorlevel% == 0 (
    echo BLAD: Tunnel nie jest skonfigurowany!
    echo Uruchom: npm run tunnel:setup
    pause
    exit /b 1
)

echo Uruchamiam Cloudflare tunnel...
echo.
cloudflared tunnel run --config cloudflare-tunnel.yml puzzle-gra-tunnel

if %errorlevel% neq 0 (
    echo.
    echo BLAD: Tunnel sie nie uruchomil!
    echo Sprawdz czy:
    echo 1. cloudflared jest zainstalowany
    echo 2. Tunnel jest poprawnie skonfigurowany
    echo 3. Masz polaczenie z internetem
    pause
)