<#
.SYNOPSIS
Deploy xjswpr PWA build to MSV server share.

.DESCRIPTION
This script performs:
1. Bump version
2. Build the project
3. Deploy to target

.EXAMPLE
.\xjswpr_deploy.ps1
Full build and deployment.
#>

$ErrorActionPreference = "Stop"

# Path configuration
$ProjectRoot = $PSScriptRoot
$DistPath = Join-Path $ProjectRoot "dist"
$TargetRoot = "\\MSV\web\games\xjswpr"

# Output functions
function Write-Step($Message) {
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Write-Success($Message) {
    Write-Host "+ $Message" -ForegroundColor Green
}

function Write-Error($Message) {
    Write-Host "x $Message" -ForegroundColor Red
}

# Execute npm command
function Invoke-NpmCommand($Command, $Description) {
    Write-Step "$Description..."
    Push-Location $ProjectRoot
    try {
        Invoke-Expression "npm run $Command"
        if ($LASTEXITCODE -ne 0) {
            throw "npm $Command failed with exit code $LASTEXITCODE"
        }
        Write-Success "$Description completed successfully."
    } finally {
        Pop-Location
    }
}

# Deploy to target directory
function Deploy-ToTarget {
    Write-Step "Cleaning target directory: $TargetRoot"
    if (-not (Test-Path $TargetRoot)) {
        throw "Target directory does not exist: $TargetRoot"
    }
    $items = Get-ChildItem -Path $TargetRoot
    foreach ($item in $items) {
        Remove-Item -Path $item.FullName -Recurse -Force -Confirm:$false
    }
    Write-Success "Target directory cleaned."

    Write-Step "Copying dist contents to target..."
    if (-not (Test-Path $DistPath)) {
        throw "Dist directory does not exist: $DistPath"
    }
    $items = Get-ChildItem -Path $DistPath
    foreach ($item in $items) {
        $dest = Join-Path $TargetRoot $item.Name
        Copy-Item -Path $item.FullName -Destination $dest -Recurse -Force
    }
    Write-Success "Files copied successfully."
}

# Main process
try {
    Invoke-NpmCommand "bump:version" "Bumping version"
    Invoke-NpmCommand "build:pwa" "Building project"
    Deploy-ToTarget

    Write-Host "`n=== Deployment completed successfully ===" -ForegroundColor Green
} catch {
    Write-Error "Deployment failed: $_"
    Write-Host "Error details:" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
    exit 1
}
