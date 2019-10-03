---
title: 'cook'
tags: cli
category: doc
---

Cook a page to generate flamegraph output. Optionally, provide a baseline URL and perform a regression analysis.

## Options

###### `--name, -n`

name for given scenario

###### `--scenario, -s`

URL for scenario under test

###### `--baseline, -b`

optional baseline scenario to compare against

###### `--temp-dir, -t`

location to store intermediate files (default: cwd)

###### `--out-dir, -o`

location to store test results (default: cwd)

###### `--help, -?, -h`

help message

## Examples

The following invocations perform the tests using a scenario that you can find [here](https://github.com/OfficeDev/office-ui-fabric-react/blob/master/apps/perf-test/src/scenarios/SplitButtonNew.tsx).

```
$ flamegrill cook -n SplitButton -s "http://fabricweb.z5.web.core.windows.net/pr-deploy-site/refs/heads/master/perf-test/index.html?scenario=SplitButtonNew&iterations=5000"

$ flamegrill cook -n SplitButton -s "http://fabricweb.z5.web.core.windows.net/pr-deploy-site/refs/heads/master/perf-test/index.html?scenario=SplitButtonNew&iterations=5000" -r "http://fabricweb.z5.web.core.windows.net/pr-deploy-site/refs/heads/master/perf-test/index.html?scenario=SplitButton&iterations=5000"

$ flamegrill cook -n SplitButtonNew -s "http://fabricweb.z5.web.core.windows.net/pr-deploy-site/refs/heads/master/perf-test/index.html?scenario=SplitButtonNew&iterations=5000" -o out -t temp
```
