import fs from 'fs';
import path from 'path';
import { Browser }  from 'puppeteer';

import { arr_diff } from './util';

/**
 * Run profiler against provided URL and return resulting profiler output.
 * 
 * @param {*} browser Launched puppeteer instance.
 * @param {string} testUrl Base URL supporting 'scenario' and 'iterations' query parameters.
 * @param {string} scenarioName Name of scenario that will be used with baseUrl.
 * @param {string} logDir Absolute path to output log profiles.
 * @returns {string} Log file path associated with test.
 */
export async function runProfile(browser: Browser, testUrl: string, scenarioName: string, logDir: string): Promise<string> {
  const logFilesBefore = fs.readdirSync(logDir);

  const page = await browser.newPage();

  // Default timeout is 30 seconds. This is good for most tests except for problematic components like DocumentCardTitle.
  // Disable timeout for now and tweak to a maximum setting once server condtiions are better known.
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

  console.log(`Starting test for ${scenarioName} at ${testUrl}`);

  console.time('Ran profile in');
  await page.goto(testUrl);
  console.timeEnd('Ran profile in');

  console.log('testLogFile: ' + testLogFile[0]);

  await page.close();

  return path.join(logDir, testLogFile[0]);
}
