# Starting a Mobile Environment

Step-by-step instructions for launching an Android emulator or iOS simulator, starting Appium, then attaching with `wdiox`.

---

## Android

### Step 1 — Start the emulator

```bash
# List available AVDs
emulator -list-avds

# Launch (clean state — recommended for automation)
emulator -avd "Pixel_9" -wipe-data -no-snapshot-load

# Launch (preserve existing state — faster restarts)
emulator -avd "Pixel_9"
```

> `emulator` lives in `$ANDROID_HOME/emulator/`. Add it to `PATH` if the command isn't found:
> ```bash
> export PATH="$ANDROID_HOME/emulator:$PATH"
> ```

Wait until the emulator is fully booted before proceeding. Poll with:

```bash
until adb shell getprop sys.boot_completed 2>/dev/null | grep -q "1"; do sleep 1; done
echo "Emulator ready"
```

### Step 2 — Start Appium

```bash
npx appium --port 4723
# or, if installed globally:
appium --port 4723
```

Verify the required driver is installed:

```bash
appium driver list --installed
# Should show: uiautomator2
```

Install if missing:

```bash
appium driver install uiautomator2
```

### Step 3 — Attach with wdiox

**Install and launch the app:**

```bash
wdiox open --app ./app.apk --device "emulator-5554" --platform android
```

**Or attach to the app already running on the emulator (`noReset: true`):**

```bash
wdiox open --attach --device "emulator-5554" --platform android
```

---

## iOS Simulator

### Step 1 — Start the simulator

```bash
# List available simulators
xcrun simctl list devices available

# Boot a specific device
xcrun simctl boot "iPhone 16 Pro"

# Open Simulator.app (shows the booted device)
open -a Simulator
```

Wait until the simulator is ready:

```bash
until xcrun simctl list devices | grep "iPhone 16 Pro" | grep -q "Booted"; do sleep 1; done
echo "Simulator ready"
```

### Step 2 — Start Appium

```bash
npx appium --port 4723
```

Verify XCUITest driver is installed:

```bash
appium driver list --installed
# Should show: xcuitest
```

Install if missing:

```bash
appium driver install xcuitest
```

### Step 3 — Attach with wdiox

**Install and launch the app:**

```bash
wdiox open --app ./app.app --device "iPhone 16 Pro" --platform ios
```

**Or attach to the app already running on the simulator:**

```bash
wdiox open --attach --device "iPhone 16 Pro" --platform ios
```

---

## Common Issues

| Symptom | Fix |
|---------|-----|
| `emulator: command not found` | Add `$ANDROID_HOME/emulator` to `PATH` |
| `adb: command not found` | Add `$ANDROID_HOME/platform-tools` to `PATH` |
| Appium: `uiautomator2 driver not found` | Run `appium driver install uiautomator2` |
| Appium: `xcuitest driver not found` | Run `appium driver install xcuitest` |
| iOS: `Unable to find booted device` | Run `xcrun simctl boot "<name>"` first |
| Android: `Session not created` with new emulator | Wait for full boot; use the `adb poll` snippet above |
| `wdiox open --attach` fails immediately | Appium isn't running, or the app isn't in the foreground |

---

## Full Android workflow (one-liner chain)

```bash
emulator -avd "Pixel_9" -wipe-data -no-snapshot-load &
until adb shell getprop sys.boot_completed 2>/dev/null | grep -q "1"; do sleep 1; done
npx appium --port 4723 &
sleep 2
wdiox open --app ./app.apk --device "emulator-5554" --platform android
```
