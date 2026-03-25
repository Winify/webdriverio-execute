# Prepares a Chrome debug profile at $env:TEMP\chrome-debug from the real Chrome profile.
# Copies cookies/logins, removes lock files and session state so the copy opens cleanly.

$chromeSrc = "$env:LOCALAPPDATA\Google\Chrome\User Data"
$debugDir = "$env:TEMP\chrome-debug"

Remove-Item -Recurse -Force $debugDir -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $debugDir | Out-Null

Copy-Item "$chromeSrc\Local State" "$debugDir\Local State"
Copy-Item -Recurse "$chromeSrc\Default" "$debugDir\Default"

# Remove singleton locks
"SingletonLock","SingletonCookie","SingletonSocket" | ForEach-Object {
  Remove-Item "$debugDir\$_" -Force -ErrorAction SilentlyContinue
}

# Remove session files
"Current Session","Current Tabs","Last Session","Last Tabs" | ForEach-Object {
  Remove-Item "$debugDir\Default\$_" -Force -ErrorAction SilentlyContinue
}

# Reset exit_type so Chrome doesn't show "Something went wrong with your profile"
$prefsPath = "$debugDir\Default\Preferences"
$prefs = Get-Content $prefsPath | ConvertFrom-Json
if (-not $prefs.profile) { $prefs | Add-Member -NotePropertyName profile -NotePropertyValue @{} }
$prefs.profile.exit_type = "Normal"
$prefs.profile.exited_cleanly = $true
$prefs | ConvertTo-Json -Depth 100 | Set-Content $prefsPath

# Suppress first-run dialogs
New-Item -ItemType File -Path "$debugDir\First Run" | Out-Null

Write-Host "Chrome debug profile ready at $debugDir"
