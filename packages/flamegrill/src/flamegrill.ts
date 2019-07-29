import fs from 'fs';
import path from 'path';
import puppeteer, { Browser }  from 'puppeteer';
import generateFlamegraph from './flamegraph/generateFlamegraph';

// Chrome command for running similarly configured instance of Chrome as puppeteer is configured here:
// "C:\Program Files (x86)\Google\Chrome\Application\chrome" --no-sandbox --js-flags=" --logfile=C:\git\perf\output\chrome.log --prof --jitless --no-opt" --user-data-dir="C:\git\perf\user" http://localhost:4322

// TODO: reorganize to match cli.. export object with similarly named functions such as cook

export type Scenario = {
  name: string;
  scenario: string;
  reference?: string;
};

export type ScenarioConfig = {
  outDir?: string;
  tempDir?: string;
};

// TODO: rename / optionalize
export interface ScenarioTest extends Scenario {
  logfileMaster?: string;
  outfileMaster: string;
  logfilePR: string;
  outfilePR: string;
};

export interface ScenarioAnalysis extends ScenarioTest {
  numTicksMaster?: number;
  numTicksPR?: number;
};

export async function flamegrill(scenarios: Scenario[], config: ScenarioConfig) {
  // const extraV8Flags = '--log-source-code --log-timer-events';
  // const extraV8Flags = '--log-source-code';
  const extraV8Flags = '';
  // TODO: test with no path, relative path, and absolute path
  const outDir = config.outDir ? path.resolve(config.outDir) : process.cwd();
  const tempDir = config.tempDir ? path.resolve(config.tempDir) : process.cwd();
  const logFilePath = path.join(tempDir, '/puppeteer.log');
  console.log(`logFilePath: ${logFilePath}`);
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--flag-switches-begin',
      '--no-sandbox',
      '--js-flags=--logfile=' + logFilePath + ' --prof --jitless --no-opt ' + extraV8Flags,
      '--flag-switches-end'
    ]
  });

  // A log file is made for each new tab/page.
  // Make an initial page here to force generation of initial system logs that we are not concerned with.
  // This allows us to associate newly created log files with tests as we run each scenario in a new tab.
  await browser.newPage();

  // TODO: Need to decide whether it's ok to run tests in parallel. Variance from results seems to indicate
  // not, but then again other things outside of our control will also affect CPU load and results.
  // Run tests sequentially for now, at least as a chance of getting more consistent results when run locally.
  const testResults: ScenarioTest[] = [];

  for (const scenario of scenarios) {
    let logfilePR = await runPerfTest(browser, scenario.scenario, scenario.name, tempDir);
    let logfileMaster;
    if (scenario.reference) {
      logfileMaster = await runPerfTest(browser, scenario.reference, scenario.name, tempDir);
    }

    let outfileMaster = path.join(outDir, `${scenario.name}_master.html`);
    let outfilePR = path.join(outDir, `${scenario.name}_pr.html`);

    testResults.push({
      ...scenario,
      logfileMaster,
      outfileMaster,
      logfilePR,
      outfilePR
    });
  }

  console.log('testResults: ' + JSON.stringify(testResults));

  // Clean up
  await browser.close();

  // Serialize a bunch of async generation of flamegraphs
  for (const result of testResults) {
    await generateFlamegraph(result.logfilePR, result.outfilePR);
    if(result.logfileMaster) {
      await generateFlamegraph(result.logfileMaster, result.outfileMaster);
    }
  }

  const scenarioAnalysis = processResults(testResults);

  return scenarioAnalysis;
};

/**
 *
 * @param {*} browser Launched puppeteer instance.
 * @param {string} testUrl Base URL supporting 'scenario' and 'iterations' query parameters.
 * @param {string} scenarioName Name of scenario that will be used with baseUrl.
 * @param {string} logPath Absolute path to output log profiles.
 */
async function runPerfTest(browser: Browser, testUrl: string, scenarioName: string, logPath: string) {
  const logFilesBefore = fs.readdirSync(logPath);

  const page = await browser.newPage();

  // Default timeout is 30 seconds. This is good for most tests except for problematic components like DocumentCardTitle.
  // Disable timeout for now and tweak to a maximum setting once server condtiions are better known.
  // TODO: argument? should probably default to 30 seconds
  page.setDefaultTimeout(0);

  const logFilesAfter = fs.readdirSync(logPath);

  const testLogFile = arr_diff(logFilesBefore, logFilesAfter);

  if (testLogFile.length !== 1) {
    // We have to be able to identify log file associated with tab. Throw error if we can't.
    // TODO: what should be the standard for erroring? console.error? throw? return failure?
    // TODO: make sure all async function calls have catch blocks
    // TODO: make sure invalid URLs (and other inputs) don't hang result
    throw new Error(`Could not determine log file for ${testUrl}. Log files detected: [ ${testLogFile} ]`);
  }

  console.log(`Starting test for ${scenarioName} at ${testUrl}`);

  console.time('Ran perf test in');
  await page.goto(testUrl);
  console.timeEnd('Ran perf test in');

  console.log('testLogFile: ' + testLogFile[0]);

  await page.close();

  return path.join(logPath, testLogFile[0]);
}

/**
 * Create test summary based on test results.
 */
function processResults(scenarioConfigs: ScenarioTest[]): ScenarioAnalysis[] {
  const scenarioResults: ScenarioAnalysis[] = [];

  scenarioConfigs.forEach(scenarioConfig => {
    let numTicksMaster;
    if (scenarioConfig.reference) {
      numTicksMaster = getTicks(scenarioConfig.outfileMaster);
    }
    let numTicksPR = getTicks(scenarioConfig.outfilePR);
    let scenarioResult: ScenarioAnalysis = {
      ...scenarioConfig,
      numTicksMaster,
      numTicksPR
    }
    scenarioResults.push(scenarioResult);
  });

  return scenarioResults;
}

/**
 * Get ticks from flamegraph file.
 *
 * @param {string} resultsFile
 */
function getTicks(resultsFile: string): number | undefined {
  const numTicks = fs
    .readFileSync(resultsFile, 'utf8')
    .toString()
    .match(/numTicks\s?\=\s?([0-9]+)/);

  if (numTicks && numTicks[1]) {
    return Number.parseInt(numTicks[1]);
  } else {
    console.log('Could not read numTicks from ' + resultsFile);
    return undefined;
  }
}

/**
 * Array diff utility that returns a list of elements that are not present in both arrays.
 *
 * @param {Array} a1 First array
 * @param {Array} a2 Second array
 */
function arr_diff(a1: string[], a2: string[]): string[] {
  let a = {} as any;
  let diff: string[] = [];

  for (var i = 0; i < a1.length; i++) {
    a[a1[i]] = true;
  }

  for (var i = 0; i < a2.length; i++) {
    if (a[a2[i]]) {
      delete a[a2[i]];
    } else {
      a[a2[i]] = true;
    }
  }

  for (var k in a) {
    diff.push(k);
  }

  return diff;
}

export default flamegrill;