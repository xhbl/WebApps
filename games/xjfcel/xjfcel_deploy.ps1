<#
.SYNOPSIS
Deploy xjfcel PWA build to MSV server share.

.DESCRIPTION
This script performs:
1. Bump version
2. Backup and replace SVG files
3. Build the project (1st pass)
4. Deploy to target
5. Restore original SVG files
6. Build the project (2nd pass)

.PARAMETER Raw
If specified, skip SVG replacement steps (2,3,5,6), only run:
1. Bump version
2. Build the project
3. Deploy to target

.EXAMPLE
.\xjfcel_deploy.ps1
Full build and deployment.

.EXAMPLE
.\xjfcel_deploy.ps1 -Raw
Build and deploy without SVG replacement.
#>
param(
    [switch]$Raw
)

$ErrorActionPreference = "Stop"

# Path configuration
$ProjectRoot = $PSScriptRoot
$DistPath = Join-Path $ProjectRoot "dist"
$TargetRoot = "\\MSV\web\games\xjfcel"
$ImagePathSrc = Join-Path $ProjectRoot "..\res\images"
$ImagePathDst = Join-Path $ProjectRoot "src\assets"
$BackupPath = Join-Path $ProjectRoot ".deploy_backup"

# SVG file mapping (source filename -> destination filename)
$SvgMap = @{
    'fam-pkp_jc.svg' = 'pkp_jc.svg'
    'fam-pkp_jd.svg' = 'pkp_jd.svg'
    'fam-pkp_jh.svg' = 'pkp_jh.svg'
    'fam-pkp_js.svg' = 'pkp_js.svg'
    'fam-pkp_kc.svg' = 'pkp_kc.svg'
    'fam-pkp_kd.svg' = 'pkp_kd.svg'
    'fam-pkp_kh.svg' = 'pkp_kh.svg'
    'fam-pkp_ks.svg' = 'pkp_ks.svg'
    'fam-pkp_qc.svg' = 'pkp_qc.svg'
    'fam-pkp_qd.svg' = 'pkp_qd.svg'
    'fam-pkp_qh.svg' = 'pkp_qh.svg'
    'fam-pkp_qs.svg' = 'pkp_qs.svg'
}

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

function Write-Warning($Message) {
    Write-Host $Message -ForegroundColor Yellow
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

# Backup SVG files
function Backup-SvgFiles {
    Write-Step "Backing up original SVG files..."
    if (-not (Test-Path $BackupPath)) {
        New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
    }
    foreach ($destName in $SvgMap.Values) {
        $srcFile = Join-Path $ImagePathDst $destName
        $backupFile = Join-Path $BackupPath $destName
        if (Test-Path $srcFile) {
            Copy-Item -Path $srcFile -Destination $backupFile -Force
            Write-Success "Backed up $destName"
        }
    }
}

# Replace SVG files
function Replace-SvgFiles {
    Write-Step "Copying additional SVG files to src\assets..."
    if (-not (Test-Path $ImagePathSrc)) {
        throw "Image directory not found: $ImagePathSrc"
    }
    foreach ($srcName in $SvgMap.Keys) {
        $srcFile = Join-Path $ImagePathSrc $srcName
        $destFile = Join-Path $ImagePathDst $SvgMap[$srcName]
        if (Test-Path $srcFile) {
            Copy-Item -Path $srcFile -Destination $destFile -Force
            Write-Success "Copied $srcName to $($SvgMap[$srcName])"
        } else {
            Write-Error "Source SVG not found: $srcFile"
        }
    }
}

# Restore SVG files
function Restore-SvgFiles {
    Write-Step "Restoring original SVG files..."
    foreach ($destName in $SvgMap.Values) {
        $backupFile = Join-Path $BackupPath $destName
        $destFile = Join-Path $ImagePathDst $destName
        if (Test-Path $backupFile) {
            Copy-Item -Path $backupFile -Destination $destFile -Force
            Write-Success "Restored $destName"
        }
    }
}

# Clear backup directory
function Clear-Backup {
    if (Test-Path $BackupPath) {
        Remove-Item -Path $BackupPath -Recurse -Force
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

    if (-not $Raw) {
        Backup-SvgFiles
        Replace-SvgFiles
    }

    $buildDesc = if ($Raw) { "Building project" } else { "Building project (mod)" }
    Invoke-NpmCommand "build:pwa" $buildDesc

    Deploy-ToTarget

    if (-not $Raw) {
        Restore-SvgFiles
        Invoke-NpmCommand "build:pwa" "Building project (raw)"
        Clear-Backup
    }

    Write-Host "`n=== Deployment completed successfully ===" -ForegroundColor Green
} catch {
    Write-Error "Deployment failed: $_"
    Write-Host "Error details:" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray

    # Rollback on failure (only in non-Raw mode)
    if (-not $Raw -and (Test-Path $BackupPath)) {
        Write-Warning "`nRolling back SVG files from backup..."
        foreach ($destName in $SvgMap.Values) {
            $backupFile = Join-Path $BackupPath $destName
            $destFile = Join-Path $ImagePathDst $destName
            if (Test-Path $backupFile) {
                Copy-Item -Path $backupFile -Destination $destFile -Force
                Write-Warning "Restored $destName"
            }
        }
        Clear-Backup
        Write-Warning "Backup cleaned up."
    }

    exit 1
}
