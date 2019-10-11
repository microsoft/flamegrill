import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { Browser, Metrics }  from 'puppeteer';

import { Scenarios, ScenarioConfig } from '../flamegrill';

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

// const extraV8Flags = '--log-source-code --log-timer-events';
// const extraV8Flags = '--log-source-code';
const extraV8Flags = '';

/**
 * Profiles scenarios and generates profile (V8) logs.
 * 
 * @param config 
 * @param scenarios 
 */
export async function profile(scenarios: Scenarios, config: Required<ScenarioConfig>): Promise<ScenarioProfiles> {
  const logFile = path.join(config.tempDir, '/puppeteer.log');
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

    let profileResults: ScenarioProfile = await profileUrl(browser, scenario.scenario, scenarioName, config.tempDir);

    if (scenario.baseline) {
      profileResults.baseline = await profileUrl(browser, scenario.baseline, scenarioName, config.tempDir);
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
 * @returns {string} Log file path associated with test.
 */
async function profileUrl(browser: Browser, testUrl: string, profileName: string, logDir: string): Promise<Profile> {
  const logFilesBefore = fs.readdirSync(logDir);

  const page = await browser.newPage();

  // Default timeout is 30 seconds. This is good for most tests except for problematic components like DocumentCardTitle.
  // Disable timeout for now and tweak to a maximum setting once server conditions are better known.
  // TODO: argument? should probably default to 30 seconds
  page.setDefaultTimeout(0);

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
  // TODO: consider using or exposing other load finished options:
  // https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagegotourl-options
  await page.goto(testUrl);
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
