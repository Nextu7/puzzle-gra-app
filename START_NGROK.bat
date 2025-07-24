@echo off
title NGROK TUNNEL - NIE ZAMYKAJ!
echo ========================================
echo  NGROK TUNNEL - ZOSTAW WLACZONE!
echo ========================================
echo.
cd /d "D:\puzzle-gra"
echo Uruchamiam ngrok na porcie 3000...
echo.
echo UWAGA: Po uruchomieniu skopiuj HTTPS URL!
echo.
ngrok http 3000
pause