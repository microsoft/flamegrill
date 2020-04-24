import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { Browser, Metrics }  from 'puppeteer';

import { Scenarios, ScenarioConfig, PageActions } from '../flamegrill';

import { arr_diff } from '../util';

export interface Profile {
  logFile: string;
  metrics: Metrics;
}

export interface ScenarioProfile extends Profile {
  baseline?: Profile
};

export interface ScenarioProfiles {
  [scenarioName: string]: ScenarioProfile;
};

export type ProfilePage = puppeteer.Page;

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<T>;

export type ScenarioProfileConfig = Optional<Required<ScenarioConfig>, 'pageActions'>;

// const extraV8Flags = '--log-source-code --log-timer-events';
// const extraV8Flags = '--log-source-code';
const extraV8Flags = '';

/**
 * Profiles scenarios and generates profile (V8) logs.
 * 
 * @param config 
 * @param scenarios 
 */
export async function profile(scenarios: Scenarios, config: ScenarioProfileConfig): Promise<ScenarioProfiles> {
  const { tempDir, pageActions } = config;

  const logFile = path.join(tempDir, '/puppeteer.log');
  console.log(`profile logFile: ${logFile}`);

  const browser = await puppeteer.launch({
    headless: true,
    // TODO: use --single-process arg?
    args: [
      '--flag-switches-begin',
      '--no-sandbox',
      '--js-flags=--logfile=' + logFile + ' --prof --jitless --no-opt ' + extraV8Flags,
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
  const profiles: ScenarioProfiles = {};
  for (const scenarioName of Object.keys(scenarios)) {
    const scenario = scenarios[scenarioName];

    let profileResults: ScenarioProfile = await profileUrl(browser, scenario.scenario, scenarioName, tempDir, pageActions);

    if (scenario.baseline) {
      profileResults.baseline = await profileUrl(browser, scenario.baseline, scenarioName, tempDir, pageActions);
    }

    profiles[scenarioName] = profileResults;
  }

  // Clean up
  await browser.close();

  return profiles;
}

/**
 * Run profiler against provided URL and return resulting profiler output.
 * 
 * @param {*} browser Launched puppeteer instance.
 * @param {string} testUrl Base URL supporting 'scenario' and 'iterations' query parameters.
 * @param {string} profileName Name of scenario that will be used with baseUrl.
 * @param {string} logDir Absolute path to output log profiles.
 * @param {PageActions} pageActions Async opertaion that is executed before taking metrics.
 * @returns {string} Log file path associated with test.
 */
async function profileUrl(
  browser: Browser,
  testUrl: string,
  profileName: string,
  logDir: string,
  pageActions?: PageActions
): Promise<Profile> {
  const logFilesBefore = fs.readdirSync(logDir);

  const page = await browser.newPage();

  const logFilesAfter = fs.readdirSync(logDir);

  const testLogFile = arr_diff(logFilesBefore, logFilesAfter);

  if (testLogFile.length !== 1) {
    // We have to be able to identify log file associated with tab. Throw error if we can't.
    // TODO: what should be the standard for erroring? console.error? throw? return failure?
    // TODO: make sure all async function calls have catch blocks
    // TODO: make sure invalid URLs (and other inputs) don't hang result
    throw new Error(`Could not determine log file for ${testUrl}. Log files detected: [ ${testLogFile} ]`);
  }

  console.log(`Starting test for ${profileName} at ${testUrl}`);

  console.time('Ran profile in');

  if (pageActions) {
    console.log("Started executing user-defined page operations.");
    await pageActions(page, { url: testUrl });
    console.log("Finished executing user-defined page operations.");
  } else {
    await page.goto(testUrl);
  }

  console.timeEnd('Ran profile in');

  let metrics = await page.metrics();
  
  console.log('testLogFile: ' + testLogFile[0]);

  await page.close();

  return {
    logFile: path.join(logDir, testLogFile[0]),
    metrics
  }
}

export const __unitTestHooks = {
  profileUrl
};
