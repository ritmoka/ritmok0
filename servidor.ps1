param([int]$Porta = 8080)

# Servidor HTTP mínimo usando .NET (sem instalar Node/Python)
$Raiz = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Porta/")

try {
    $listener.Start()
} catch {
    Write-Host "Nao foi possivel abrir a porta $Porta. Tentando http://127.0.0.1:$Porta/"
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://127.0.0.1:$Porta/")
    $listener.Start()
}

Write-Host "RitmoK rodando em http://localhost:$Porta" -ForegroundColor Green
Write-Host "Pasta servida: $Raiz"
Write-Host "Pressione Ctrl+C para encerrar."

$mimes = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.webp' = 'image/webp'
    '.ico'  = 'image/x-icon'
    '.mp4'  = 'video/mp4'
    '.webm' = 'video/webm'
    '.mp3'  = 'audio/mpeg'
    '.woff2'= 'font/woff2'
}

while ($listener.IsListening) {
    try {
        $ctx = $listener.GetContext()
        $req = $ctx.Request
        $res = $ctx.Response

        $caminho = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart('/'))
        if ([string]::IsNullOrWhiteSpace($caminho)) { $caminho = 'index.html' }
        if ($caminho.EndsWith('/')) { $caminho += 'index.html' }

        $arquivo = Join-Path $Raiz $caminho
        if (-not (Test-Path -LiteralPath $arquivo -PathType Leaf)) {
            $res.StatusCode = 404
            $bytes = [System.Text.Encoding]::UTF8.GetBytes("<h1>404 - Pagina nao encontrada</h1><p><a href='/'>Voltar ao inicio</a></p>")
            $res.ContentType = 'text/html; charset=utf-8'
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        $ext = [System.IO.Path]::GetExtension($arquivo).ToLower()
        $res.StatusCode = 200
        $res.ContentType = if ($mimes.ContainsKey($ext)) { $mimes[$ext] } else { 'application/octet-stream' }
        $res.AddHeader('Cache-Control', 'no-store')
        $fs = [System.IO.File]::OpenRead($arquivo)
        $fs.CopyTo($res.OutputStream)
        $fs.Close()
        $res.Close()
    } catch {
        try { $res.Close() } catch {}
    }
}
