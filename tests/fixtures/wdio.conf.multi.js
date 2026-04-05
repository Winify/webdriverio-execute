export const config = {
  capabilities: [
    { browserName: 'chrome' },
    { browserName: 'firefox' },
    { platformName: 'Android', 'appium:deviceName': 'emulator-5554' },
  ],
};
