export type TabSnapshot = { activeTabUrl: string | undefined; allTabUrls: string[] };

type CdpTarget = { id: string; title: string; type: string; url: string };

/**
 * Polls Chrome's CDP endpoint until it responds, or throws after timeoutMs.
 * Chrome-specific: uses the /json/version endpoint exposed by --remote-debugging-port.
 */
export async function waitForCDP(host: string, port: number, timeoutMs = 10000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://${host}:${port}/json/version`);
      if (res.ok) {
        return;
      }
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Chrome did not expose CDP on ${host}:${port} within ${timeoutMs}ms`);
}

/**
 * Closes stale BiDi mapper targets left over from a previous WebdriverIO session,
 * and returns a snapshot of the remaining page tabs.
 * Chrome-specific: queries /json and /json/close endpoints.
 */
export async function closeStaleMappers(host: string, port: number): Promise<TabSnapshot> {
  try {
    const res = await fetch(`http://${host}:${port}/json`);
    const targets = await res.json() as CdpTarget[];
    const mappers = targets.filter((t) => t.title?.includes('BiDi'));
    await Promise.all(mappers.map((t) => fetch(`http://${host}:${port}/json/close/${t.id}`)));
    const pages = targets.filter((t) => t.type === 'page' && !t.title?.includes('BiDi'));
    return { activeTabUrl: pages[0]?.url, allTabUrls: pages.map((t) => t.url) };
  } catch {
    return { activeTabUrl: undefined, allTabUrls: [] };
  }
}

/**
 * After attaching to Chrome, BiDi may have remapped some existing tabs to about:blank.
 * This restores their original URLs and switches focus to the previously active tab.
 */
export async function restoreAndSwitchToActiveTab(
  browser: WebdriverIO.Browser,
  activeTabUrl: string,
  allTabUrls: string[],
): Promise<void> {
  const handles = await browser.getWindowHandles();
  const currentUrls: string[] = [];
  for (const handle of handles) {
    await browser.switchToWindow(handle);
    currentUrls.push(await browser.getUrl());
  }

  const missingUrls = allTabUrls.filter((u) => !currentUrls.includes(u));
  let missingIdx = 0;
  for (let i = 0; i < handles.length; i++) {
    if (currentUrls[i] === 'about:blank' && missingIdx < missingUrls.length) {
      await browser.switchToWindow(handles[i]);
      await browser.url(missingUrls[missingIdx]);
      currentUrls[i] = missingUrls[missingIdx++];
    }
  }

  for (let i = 0; i < handles.length; i++) {
    if (currentUrls[i] === activeTabUrl) {
      await browser.switchToWindow(handles[i]);
      break;
    }
  }
}
