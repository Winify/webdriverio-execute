export const config = {
  hostname: 'localhost',
  port: 4723,
  path: '/',
  capabilities: {
    platformName: 'Android',
    'appium:deviceName': 'Pixel 6',
    'appium:app': '/original/app.apk',
    'appium:automationName': 'UiAutomator2',
    'appium:newCommandTimeout': 300,
  },
};
