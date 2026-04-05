import path from 'node:path';
import readline from 'node:readline/promises';
import { createJiti } from 'jiti';

export async function loadWdioConfig(configPath: string): Promise<WebdriverIO.Config> {
  const absolutePath = path.resolve(configPath);
  const jiti = createJiti(import.meta.url);

  let mod: unknown;
  try {
    mod = await jiti.import(absolutePath);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes('ENOENT') ||
      message.includes('Cannot find module') ||
      message.includes('MODULE_NOT_FOUND')
    ) {
      throw new Error(`Config file not found: ${configPath}`);
    }
    throw err;
  }

  const config = (mod as Record<string, unknown>)?.config;
  if (!config || typeof config !== 'object') {
    throw new Error(`${configPath} does not export a 'config' object`);
  }

  return config as WebdriverIO.Config;
}

export async function pickCapabilities(config: WebdriverIO.Config): Promise<WebdriverIO.Capabilities> {
  const { capabilities } = config;

  if (!capabilities || (Array.isArray(capabilities) && capabilities.length === 0)) {
    throw new Error('No capabilities found in config');
  }

  if (!Array.isArray(capabilities)) {
    return capabilities as WebdriverIO.Capabilities;
  }

  if (capabilities.length === 1) {
    return capabilities[0] as WebdriverIO.Capabilities;
  }

  console.log('Multiple capabilities found:');
  capabilities.forEach((cap, i) => {
    const c = cap as Record<string, unknown>;
    const label = (c.browserName as string) || (c.platformName as string) || `capability ${i + 1}`;
    console.log(`  ${i + 1}. ${label}`);
  });

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('Pick one [1]: ');
  rl.close();

  const index = parseInt(answer.trim() || '1', 10) - 1;
  const safeIndex = isNaN(index) || index < 0 || index >= capabilities.length ? 0 : index;
  return capabilities[safeIndex] as WebdriverIO.Capabilities;
}
