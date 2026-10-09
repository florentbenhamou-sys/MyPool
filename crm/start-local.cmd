@echo off
rem ============================================================================
rem  CRM - demarrage SANS Docker (Windows). Double-cliquer sur ce fichier.
rem  Seul Node.js est necessaire : la base PostgreSQL est fournie par le projet.
rem    start-local.cmd          demarre (fermer la fenetre ou Ctrl+C pour arreter)
rem    start-local.cmd demo     ajoute les donnees de demonstration (base vide)
rem    start-local.cmd backup   sauvegarde (application arretee)
rem ============================================================================
setlocal
cd /d "%~dp0"
title CRM (mode local)

where node >nul 2>nul
if errorlevel 1 goto :nonode

node scripts\local.mjs %*
if "%~1"=="" pause
exit /b

:nonode
echo.
echo Node.js n'est pas installe sur ce PC.
where winget >nul 2>nul
if errorlevel 1 goto :manual
set /p REP="Installer Node.js LTS maintenant avec winget ? [o/N] "
if /i not "%REP%"=="o" goto :manual
winget install --exact --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
echo.
echo Node.js est installe. FERMEZ cette fenetre puis double-cliquez a nouveau sur start-local.cmd.
pause
exit /b

:manual
echo Installez la version LTS depuis https://nodejs.org puis relancez start-local.cmd.
start "" https://nodejs.org/fr/download
pause
exit /b 1
