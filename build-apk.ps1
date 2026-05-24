# Script per build APK di The Hair Studio
# Esegui dopo che il download degli Android Tools e' completo

$projectDir = "C:\Users\Vincenzo Durante\Desktop\TheHairStudio"
$sdkDir = "C:\Users\Vincenzo Durante\AppData\Local\Android\Sdk"
$zip = "$env:TEMP\android-cmdline-tools.zip"
$javaHome = "C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot"

Write-Host "=== Build APK The Hair Studio ===" -ForegroundColor Cyan

# 1. Estrai cmdline-tools se non ancora fatto
if (!(Test-Path "$sdkDir\cmdline-tools\latest\bin\sdkmanager.bat")) {
    Write-Host "Estrazione Android cmdline-tools..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path "$sdkDir\cmdline-tools\latest" | Out-Null
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $tmpExtract = "$env:TEMP\android-tools-extract"
    [System.IO.Compression.ZipFile]::ExtractToDirectory($zip, $tmpExtract)
    Move-Item "$tmpExtract\cmdline-tools\*" "$sdkDir\cmdline-tools\latest\"
    Write-Host "Estratto correttamente" -ForegroundColor Green
}

# 2. Imposta variabili d'ambiente
$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $sdkDir
$env:PATH = "$javaHome\bin;$sdkDir\cmdline-tools\latest\bin;$sdkDir\platform-tools;$env:PATH"

# 3. Accetta licenze SDK
Write-Host "Accettazione licenze Android SDK..." -ForegroundColor Yellow
$licenseResponse = "y`ny`ny`ny`ny`ny`ny`n"
$licenseResponse | & "$sdkDir\cmdline-tools\latest\bin\sdkmanager.bat" --licenses

# 4. Installa componenti SDK necessari
Write-Host "Installazione Android SDK components..." -ForegroundColor Yellow
& "$sdkDir\cmdline-tools\latest\bin\sdkmanager.bat" "platforms;android-34" "build-tools;34.0.0" "platform-tools"

# 5. Prebuild Expo
Write-Host "Expo prebuild..." -ForegroundColor Yellow
Set-Location $projectDir
npx expo prebuild --platform android --clean

# 6. Build APK
Write-Host "Build APK..." -ForegroundColor Yellow
Set-Location "$projectDir\android"
.\gradlew assembleDebug --no-daemon

$apkPath = "$projectDir\android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    $size = [math]::Round((Get-Item $apkPath).Length / 1MB, 1)
    Write-Host "SUCCESS! APK generato: $apkPath ($size MB)" -ForegroundColor Green
    # Copia sul Desktop
    Copy-Item $apkPath "C:\Users\Vincenzo Durante\Desktop\TheHairStudio-demo.apk"
    Write-Host "APK copiato sul Desktop come: TheHairStudio-demo.apk" -ForegroundColor Green
} else {
    Write-Host "ERRORE: APK non generato. Controlla i log sopra." -ForegroundColor Red
}
