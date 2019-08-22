# flamegrill

flame grill your webpages for easy digestion

## Prerequisites

web page to test

## Usage

```
flamegrill [command] [options]
```

## Commands

### cook (default)

run flamegrill against specified input

## Options

### --name, -n

name for given scenario

### --scenario, -s

URL for scenario under test

### --reference, -r

optional reference scenario to compare against

### --temp-dir, -t

location to store intermediate files (default: cwd)

### --out-dir, -o

location to store test results (default: cwd)

### --help, -?, -h

help message

## Examples

```
$ flamegrill cook -n SplitButton -s "http://fabricweb.z5.web.core.windows.net/pr-deploy-site/refs/heads/master/perf-test/index.html?scenario=SplitButtonNew&iterations=5000"

$ flamegrill cook -n SplitButton -s "http://fabricweb.z5.web.core.windows.net/pr-deploy-site/refs/heads/master/perf-test/index.html?scenario=SplitButtonNew&iterations=5000" -r "http://fabricweb.z5.web.core.windows.net/pr-deploy-site/refs/heads/master/perf-test/index.html?scenario=SplitButton&iterations=5000"

$ flamegrill cook -n SplitButtonNew -s "http://fabricweb.z5.web.core.windows.net/pr-deploy-site/refs/heads/master/perf-test/index.html?scenario=SplitButtonNew&iterations=5000" -o out -t temp
```

## Open Source Credits

[Flamebearer](https://github.com/mapbox/flamebearer) is an inspiration for this project and is used to generate flamegraphs. Parts of Flamebearer have been modified and expanded upon to add more functionality to the flamegraphs.
