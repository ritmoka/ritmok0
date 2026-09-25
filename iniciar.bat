@echo off
chcp 65001 > nul
title RitmoK - Prof. Kennedy
cd /d "%~dp0"

echo.
echo  ============================================
echo     RITMOK - Prof. Kennedy
echo     Iniciando a plataforma...
echo  ============================================
echo.

REM --- 1) Tenta o servidor em PowerShell (funciona sem instalar nada) ---
where powershell >nul 2>nul
if %errorlevel%==0 (
  echo  Servidor local sera iniciado em http://localhost:8080
  echo  Para encerrar, feche esta janela do console.
  echo.
  start "" "http://localhost:8080"
  timeout /t 2 /nobreak > nul
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor.ps1" -Porta 8080
  goto :fim
)

REM --- 2) Se nao tiver PowerShell, tenta Node.js ---
where node >nul 2>nul
if %errorlevel%==0 (
  echo  Node.js encontrado.
  start "" "http://localhost:8080"
  npx --yes serve -l 8080 .
  goto :fim
)

REM --- 3) Se nao tiver PowerShell nem Node, tenta Python ---
where py >nul 2>nul
if %errorlevel%==0 (
  echo  Python encontrado.
  start "" "http://localhost:8080"
  py -m http.server 8080
  goto :fim
)

REM --- 4) Ultimo recurso: abre o arquivo direto ---
echo  Nenhum servidor encontrado.
echo  Abrindo o site direto no navegador.
echo.
echo  ATENCAO: aulas do YouTube so funcionam com servidor local.
echo.
start "" "index.html"

:fim
echo.
echo  Servidor encerrado. Ate logo!
timeout /t 5 /nobreak > nul
