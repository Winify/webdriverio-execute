---
name: wdiox-usage
description: Use when automating a browser or mobile app from the CLI via snapshot element refs, attaching to a running Chrome instance via CDP remote debugging, controlling an Android emulator or iOS simulator via Appium, or scripting multi-step UI workflows without writing test code.
---

# wdiox — WebdriverIO Execute

CLI tool for interactive browser and Appium automation. Sessions persist on disk in `.wdiox/` in the CWD.

## Install

```bash
npm install -g webdriverio-execute
```

Verify before first use:
```bash
which wdiox && wdiox --version
```

## Quick Start

```bash
wdiox open https://example.com   # start session
wdiox snapshot                   # capture elements → e1, e2, …
wdiox click e3                   # interact by ref
wdiox close                      # end session
```

## Discover capabilities

```bash
wdiox skills                     # list all topics
wdiox skills <topic>             # full guide for that topic
wdiox skills <topic> --flags     # flags reference only
```

**Topics include:** open, close, snapshot, click, type, navigate, scroll, execute, screenshot, steps, sessions, refs, chrome-attach, mobile-setup, overview
