# Windows system integration script for Gon Voice Assistant
# This script helps integrate the app with Windows

param(
    [switch]$Install,
    [switch]$Uninstall
)

$AppName = "Gon Voice Assistant"
$AppId = "com.voice.assistant"
$StartMenuDir = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\$AppName"
$DesktopShortcut = "$env:USERPROFILE\Desktop\$AppName.lnk"

function Install-App {
    Write-Host "🪟 Setting up Windows integration for $AppName..." -ForegroundColor Green

    # Create Start Menu directory
    if (!(Test-Path $StartMenuDir)) {
        New-Item -ItemType Directory -Path $StartMenuDir -Force | Out-Null
        Write-Host "✅ Created Start Menu directory: $StartMenuDir"
    }

    # Create Start Menu shortcut
    $WshShell = New-Object -comObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut("$StartMenuDir\$AppName.lnk")
    $Shortcut.TargetPath = "$PWD\dist\win-unpacked\$AppName.exe"
    $Shortcut.WorkingDirectory = "$PWD\dist\win-unpacked"
    $Shortcut.Description = "Your personal AI voice assistant"
    $Shortcut.IconLocation = "$PWD\build\icon.ico"
    $Shortcut.Save()

    Write-Host "✅ Created Start Menu shortcut"

    # Create Desktop shortcut
    $DesktopShortcut = $WshShell.CreateShortcut($DesktopShortcut)
    $DesktopShortcut.TargetPath = "$PWD\dist\win-unpacked\$AppName.exe"
    $DesktopShortcut.WorkingDirectory = "$PWD\dist\win-unpacked"
    $DesktopShortcut.Description = "Your personal AI voice assistant"
    $DesktopShortcut.IconLocation = "$PWD\build\icon.ico"
    $DesktopShortcut.Save()

    Write-Host "✅ Created Desktop shortcut"

    # Add to Windows registry for file associations (optional)
    try {
        $RegPath = "HKCU:\Software\Classes\$AppId"
        New-Item -Path $RegPath -Force | Out-Null
        Set-ItemProperty -Path $RegPath -Name "(Default)" -Value $AppName
        Set-ItemProperty -Path $RegPath -Name "FriendlyTypeName" -Value $AppName

        Write-Host "✅ Added registry entries"
    }
    catch {
        Write-Host "⚠️  Could not add registry entries: $($_.Exception.Message)" -ForegroundColor Yellow
    }

    Write-Host "🎉 Windows integration complete!" -ForegroundColor Green
    Write-Host "📝 The app should now appear in your Start Menu and Desktop"
}

function Uninstall-App {
    Write-Host "🗑️  Removing Windows integration for $AppName..." -ForegroundColor Yellow

    # Remove Start Menu shortcut
    if (Test-Path "$StartMenuDir\$AppName.lnk") {
        Remove-Item "$StartMenuDir\$AppName.lnk" -Force
        Write-Host "✅ Removed Start Menu shortcut"
    }

    # Remove Desktop shortcut
    if (Test-Path $DesktopShortcut) {
        Remove-Item $DesktopShortcut -Force
        Write-Host "✅ Removed Desktop shortcut"
    }

    # Remove Start Menu directory if empty
    if (Test-Path $StartMenuDir) {
        $Items = Get-ChildItem $StartMenuDir
        if ($Items.Count -eq 0) {
            Remove-Item $StartMenuDir -Force
            Write-Host "✅ Removed empty Start Menu directory"
        }
    }

    # Remove registry entries
    try {
        $RegPath = "HKCU:\Software\Classes\$AppId"
        if (Test-Path $RegPath) {
            Remove-Item $RegPath -Recurse -Force
            Write-Host "✅ Removed registry entries"
        }
    }
    catch {
        Write-Host "⚠️  Could not remove registry entries: $($_.Exception.Message)" -ForegroundColor Yellow
    }

    Write-Host "🎉 Windows integration removed!" -ForegroundColor Green
}

# Main execution
if ($Install) {
    Install-App
}
elseif ($Uninstall) {
    Uninstall-App
}
else {
    Write-Host "Usage:" -ForegroundColor Cyan
    Write-Host "  .\windows-integration.ps1 -Install    # Install app integration"
    Write-Host "  .\windows-integration.ps1 -Uninstall  # Remove app integration"
}
