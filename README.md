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
$ flamegrill cook -s http://localhost:4322

$ flamegrill cook -s http://localhost:4322 -r http://some.url.com

$ flamegrill cook -n SplitButtonNew -s "http://fabricweb.z5.web.core.windows.net/pr-deploy-site/refs/heads/master/perf-test/index.html?scenario=SplitButtonNew&iterations=5000" -o out -t temp

```
