# Cloudflare Tunnel Setup Script for Windows
# Run as Administrator: powershell -ExecutionPolicy Bypass -File setup-cloudflare-tunnel.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$TunnelName = "puzzle-gra-tunnel",
    
    [Parameter(Mandatory=$true)]
    [string]$Domain,
    
    [Parameter(Mandatory=$false)]
    [string]$CloudflareEmail,
    
    [Parameter(Mandatory=$false)]
    [string]$CloudflareAPIKey
)

Write-Host "🚀 Setting up Cloudflare Tunnel for Puzzle Gra App" -ForegroundColor Green
Write-Host "Domain: $Domain" -ForegroundColor Yellow
Write-Host "Tunnel Name: $TunnelName" -ForegroundColor Yellow

# Check if cloudflared is installed
$cloudflaredPath = Get-Command cloudflared -ErrorAction SilentlyContinue

if (-not $cloudflaredPath) {
    Write-Host "❌ cloudflared not found. Installing..." -ForegroundColor Red
    
    # Check if Chocolatey is available
    $chocoPath = Get-Command choco -ErrorAction SilentlyContinue
    
    if ($chocoPath) {
        Write-Host "📦 Installing cloudflared via Chocolatey..." -ForegroundColor Blue
        choco install cloudflared -y
    } else {
        Write-Host "📥 Downloading cloudflared manually..." -ForegroundColor Blue
        $downloadUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
        $outputPath = "$env:TEMP\cloudflared.exe"
        
        try {
            Invoke-WebRequest -Uri $downloadUrl -OutFile $outputPath -UseBasicParsing
            $installPath = "$env:ProgramFiles\cloudflared"
            New-Item -ItemType Directory -Path $installPath -Force
            Move-Item -Path $outputPath -Destination "$installPath\cloudflared.exe" -Force
            
            # Add to PATH
            $currentPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
            if ($currentPath -notlike "*$installPath*") {
                [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$installPath", "Machine")
            }
            
            Write-Host "✅ cloudflared installed successfully" -ForegroundColor Green
        } catch {
            Write-Host "❌ Failed to download cloudflared: $_" -ForegroundColor Red
            exit 1
        }
    }
}

# Authenticate with Cloudflare
Write-Host "🔐 Authenticating with Cloudflare..." -ForegroundColor Blue
Write-Host "Please complete the authentication in your browser..." -ForegroundColor Yellow

try {
    & cloudflared tunnel login
    Write-Host "✅ Authentication successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Authentication failed: $_" -ForegroundColor Red
    exit 1
}

# Create tunnel
Write-Host "🔧 Creating tunnel: $TunnelName" -ForegroundColor Blue

try {
    $tunnelOutput = & cloudflared tunnel create $TunnelName 2>&1
    $tunnelId = ($tunnelOutput | Select-String "Created tunnel .* with id (.+)").Matches[0].Groups[1].Value
    
    if (-not $tunnelId) {
        # Tunnel might already exist, try to get its ID
        $listOutput = & cloudflared tunnel list 2>&1
        $existingTunnel = $listOutput | Select-String "$TunnelName\s+([a-f0-9-]+)"
        
        if ($existingTunnel) {
            $tunnelId = $existingTunnel.Matches[0].Groups[1].Value
            Write-Host "ℹ️ Using existing tunnel: $tunnelId" -ForegroundColor Yellow
        } else {
            Write-Host "❌ Failed to create or find tunnel" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "✅ Tunnel created: $tunnelId" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Failed to create tunnel: $_" -ForegroundColor Red
    exit 1
}

# Update configuration file
Write-Host "📝 Updating tunnel configuration..." -ForegroundColor Blue

$configContent = @"
tunnel: $tunnelId
credentials-file: C:\Users\$env:USERNAME\.cloudflared\$tunnelId.json

ingress:
  # Main app traffic
  - hostname: puzzle-gra.$Domain
    service: http://localhost:3000
    originRequest:
      httpHostHeader: puzzle-gra.$Domain
      connectTimeout: 30s
      tlsTimeout: 10s
      tcpKeepAlive: 30s
      keepAliveConnections: 100
      keepAliveTimeout: 90s

  # Development subdomain for testing
  - hostname: dev-puzzle-gra.$Domain
    service: http://localhost:3000
    originRequest:
      httpHostHeader: dev-puzzle-gra.$Domain

  # HMR WebSocket traffic for development
  - hostname: hmr-puzzle-gra.$Domain
    service: http://localhost:8002
    originRequest:
      httpHostHeader: hmr-puzzle-gra.$Domain

  # Catch-all rule (required)
  - service: http_status:404
"@

$configPath = ".\cloudflare-tunnel.yml"
Set-Content -Path $configPath -Value $configContent -Encoding UTF8

Write-Host "✅ Configuration file updated: $configPath" -ForegroundColor Green

# Create DNS records
Write-Host "🌐 Creating DNS records..." -ForegroundColor Blue

$hostnames = @(
    "puzzle-gra.$Domain",
    "dev-puzzle-gra.$Domain", 
    "hmr-puzzle-gra.$Domain"
)

foreach ($hostname in $hostnames) {
    try {
        & cloudflared tunnel route dns $TunnelName $hostname
        Write-Host "✅ DNS record created for: $hostname" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ DNS record creation failed for $hostname (might already exist): $_" -ForegroundColor Yellow
    }
}

# Update .env file
Write-Host "📄 Updating .env configuration..." -ForegroundColor Blue

$envPath = ".\.env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath
    
    # Update or add Cloudflare configuration
    $newEnvContent = @()
    $updatedCloudflareURL = $false
    $updatedShopifyURL = $false
    $updatedHOST = $false
    
    foreach ($line in $envContent) {
        if ($line -match "^CLOUDFLARE_TUNNEL_URL=") {
            $newEnvContent += "CLOUDFLARE_TUNNEL_URL=https://puzzle-gra.$Domain"
            $updatedCloudflareURL = $true
        } elseif ($line -match "^SHOPIFY_APP_URL=") {
            $newEnvContent += "SHOPIFY_APP_URL=https://puzzle-gra.$Domain"
            $updatedShopifyURL = $true
        } elseif ($line -match "^HOST=") {
            $newEnvContent += "HOST=https://puzzle-gra.$Domain"
            $updatedHOST = $true
        } elseif ($line -match "^CLOUDFLARE_TUNNEL_TOKEN=") {
            $newEnvContent += "CLOUDFLARE_TUNNEL_TOKEN=$tunnelId"
        } else {
            $newEnvContent += $line
        }
    }
    
    # Add missing configurations
    if (-not $updatedCloudflareURL) {
        $newEnvContent += "CLOUDFLARE_TUNNEL_URL=https://puzzle-gra.$Domain"
    }
    if (-not $updatedShopifyURL) {
        $newEnvContent += "SHOPIFY_APP_URL=https://puzzle-gra.$Domain"  
    }
    if (-not $updatedHOST) {
        $newEnvContent += "HOST=https://puzzle-gra.$Domain"
    }
    
    Set-Content -Path $envPath -Value $newEnvContent -Encoding UTF8
    Write-Host "✅ .env file updated" -ForegroundColor Green
} else {
    Write-Host "⚠️ .env file not found, please update manually" -ForegroundColor Yellow
}

# Create Windows service script
Write-Host "🔧 Creating Windows service script..." -ForegroundColor Blue

$serviceScript = @"
@echo off
REM Cloudflare Tunnel Service Script
REM Run as Administrator to install/start service

set TUNNEL_CONFIG=%~dp0cloudflare-tunnel.yml
set SERVICE_NAME=CloudflaredPuzzleGra

echo Installing Cloudflare Tunnel as Windows Service...
cloudflared service install --config "%TUNNEL_CONFIG%"

echo Starting service...
net start "%SERVICE_NAME%"

echo Service status:
sc query "%SERVICE_NAME%"

pause
"@

Set-Content -Path ".\scripts\install-cloudflare-service.bat" -Value $serviceScript -Encoding ASCII

Write-Host "🎉 Cloudflare Tunnel setup completed!" -ForegroundColor Green
Write-Host "" -ForegroundColor White
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update Shopify app configuration with new URLs" -ForegroundColor White
Write-Host "2. Run tunnel: cloudflared tunnel run --config cloudflare-tunnel.yml $TunnelName" -ForegroundColor White
Write-Host "3. Or install as service: .\scripts\install-cloudflare-service.bat (as Administrator)" -ForegroundColor White
Write-Host "4. Test the application at: https://puzzle-gra.$Domain" -ForegroundColor White

Write-Host "" -ForegroundColor White
Write-Host "📝 Configuration saved to:" -ForegroundColor Yellow
Write-Host "   - cloudflare-tunnel.yml" -ForegroundColor White
Write-Host "   - .env (updated)" -ForegroundColor White
Write-Host "   - scripts\install-cloudflare-service.bat" -ForegroundColor White