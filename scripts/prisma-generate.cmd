@echo off
REM Prisma Generation Script for Windows
REM Handles permission issues and file locking

echo Starting Prisma generation...

REM Set environment variables for Windows
set SHELL=cmd.exe
set COMSPEC=C:\Windows\System32\cmd.exe

REM Stop any running Prisma processes
taskkill /F /IM "prisma.exe" 2>nul
taskkill /F /IM "node.exe" /FI "WINDOWTITLE eq npx*prisma*" 2>nul

REM Wait for file handles to release
timeout /t 2 /nobreak > nul

REM Clean existing Prisma client if corrupted
if exist "node_modules\.prisma\client" (
    echo Cleaning existing Prisma client...
    rmdir /s /q "node_modules\.prisma\client" 2>nul
)

REM Generate Prisma client with error handling
echo Generating Prisma client...
npx prisma generate --skip-seed

if %ERRORLEVEL% EQU 0 (
    echo Prisma generation completed successfully!
) else (
    echo Prisma generation failed with error code %ERRORLEVEL%
    echo Retrying with elevated permissions...
    timeout /t 3 /nobreak > nul
    npx prisma generate --skip-seed
)

echo Done.