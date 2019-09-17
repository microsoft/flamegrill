---
title: 'Installation'
tags: overview
category: doc
---

There are a few options for installing `flamegrill`.

### Option 1: No Install

Thanks to `npx`, you can use `flamegrill` without any installation:

```bash
npx flamegrill --help
```
However, as flamegrill has some pretty weighty dependencies such as a puppeteer, which downloads a version of Chrome, it's recommended you install it locally.

### Option 2: Install and Run Globally (Manual Testing)

```bash
npm install -g flamegrill
```

### Option 3: Install as Package Dependency (Automated Testing)

To get started, place this in the `devDependencies` section of your `package.json`:

```bash
npm install -D flamegrill
```

or for yarn users:

```bash
yarn add -D flamegrill
```
