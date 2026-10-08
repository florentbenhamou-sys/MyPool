@echo off
rem Lanceur Windows (double-clic) : execute start.ps1 sans modifier la politique d'execution.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
if "%~1"=="" pause
