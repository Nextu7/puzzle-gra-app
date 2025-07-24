@echo off
REM Cloudflare Tunnel Service Installation Script
REM Run as Administrator

set TUNNEL_CONFIG=%~dp0..\cloudflare-tunnel.yml
set SERVICE_NAME=CloudflaredPuzzleGra

echo ========================================
echo  Cloudflare Tunnel Service Installer
echo ========================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo ✅ Running as Administrator
) else (
    echo ❌ This script must be run as Administrator
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo.
echo Installing Cloudflare Tunnel as Windows Service...
echo Config file: %TUNNEL_CONFIG%

if not exist "%TUNNEL_CONFIG%" (
    echo ❌ Configuration file not found: %TUNNEL_CONFIG%
    echo Please run setup-cloudflare-tunnel.ps1 first
    pause
    exit /b 1
)

REM Install the service
cloudflared service install --config "%TUNNEL_CONFIG%"

if %errorLevel% == 0 (
    echo ✅ Service installed successfully
) else (
    echo ❌ Service installation failed
    pause
    exit /b 1
)

echo.
echo Starting service...
net start "%SERVICE_NAME%"

echo.
echo Service status:
sc query "%SERVICE_NAME%"

echo.
echo ========================================
echo  Service Management Commands:
echo ========================================
echo  Start:   net start "%SERVICE_NAME%"
echo  Stop:    net stop "%SERVICE_NAME%"
echo  Status:  sc query "%SERVICE_NAME%"
echo  Remove:  sc delete "%SERVICE_NAME%"
echo ========================================

pause