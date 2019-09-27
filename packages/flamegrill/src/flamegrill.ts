import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

import { runProfile } from './profile';
import { generateFlamegraph, GeneratedFiles } from './flamegraph/generate';
import { checkForRegressions } from './analysis/processData';

// Chrome command for running similarly configured instance of Chrome as puppeteer is configured here:
// "C:\Program Files (x86)\Google\Chrome\Application\chrome" --no-sandbox --js-flags=" --logfile=C:\git\perf\output\chrome.log --prof --jitless --no-opt" --user-data-dir="C:\git\perf\user" http://localhost:4322

// TODO: overhaul types and reconcile with processData types
// TODO: get rid of !'s in this file
export type Scenario = {
  name: string;
  scenario: string;
  reference?: string;
};

export type ScenarioConfig = {
  outDir?: string;
  tempDir?: string;
};

export interface PerfTest {
  logFile: string;
  outFile: string;
  reference: {
    logFile?: string;
    outFile: string;
  }
};

export interface PerfTests {
  [key: string]: PerfTest;
};

export interface OutputFiles extends GeneratedFiles {
  regressionFile?: string;
};

export interface Analysis {
  numTicks?: number;
  files?: OutputFiles;
  isRegression?: boolean;
  reference?: {
    files?: OutputFiles;
    numTicks?: number;
  }
};

export interface Analyses {
  [key: string]: Analysis;
};

export async function cook(scenarios: Scenario[], config: ScenarioConfig): Promise<Analyses> {
  // const extraV8Flags = '--log-source-code --log-timer-events';
  // const extraV8Flags = '--log-source-code';
  const extraV8Flags = '';

  const outDir = config.outDir ? path.resolve(config.outDir) : process.cwd();
  const tempDir = config.tempDir ? path.resolve(config.tempDir) : process.cwd();
  const logFile = path.join(tempDir, '/puppeteer.log');

  console.log(`logFile: ${logFile}`);

  const browser = await puppeteer.launch({
    headless: true,
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
  const perfTests: PerfTests = {};

  for (const scenario of scenarios) {
    let logFile = await runProfile(browser, scenario.scenario, scenario.name, tempDir);
    let logFileRef;
    if (scenario.reference) {
      logFileRef = await runProfile(browser, scenario.reference, scenario.name, tempDir);
    }

    let outFileRef = path.join(outDir, `${scenario.name}_ref`);
    let outFile = path.join(outDir, `${scenario.name}`);

    perfTests[scenario.name] = {
      logFile,
      outFile,
      reference: {
        logFile: logFileRef,
        outFile: outFileRef
      }
    };
  }

  console.log('perfTests: ' + JSON.stringify(perfTests));

  // Clean up
  await browser.close();

  const analyses: Analyses = {}

  // Serialize a bunch of async generation of flamegraphs
  // TODO: need an API story here. how will users get output? data structures? files? both?
  // TODO: break out as separate module reusable by tests.
  for (const scenario of scenarios) {
    const result = perfTests[scenario.name];
    const analysis: Analysis = {};
    analysis.files = await generateFlamegraph(result.logFile, result.outFile);
    // await generateSummary(result.logFile, result.outFile);
    if(result.reference.logFile) {
      analysis.reference = {};
      analysis.reference.files = await generateFlamegraph(result.reference.logFile, result.reference.outFile);
      analysis.files.regressionFile = path.join(outDir, `${scenario.name}.regression.txt`);
      // await generateSummary(result.logFileRef, result.outFileRef);    
    }

    processResults(analysis);

    analyses[scenario.name] = analysis;
  }

  console.log('analyses: ' + JSON.stringify(analyses));

  return analyses;
};

/**
 * Create test summary based on test results.
 */
// TODO: don't take in and return same structure. it's too hard to tell what this function needs and what it adds.
function processResults(analysis: Analysis): Analysis {
  const dataFileAfter = analysis.files && analysis.files.dataFile;
  const dataFileBefore = analysis.reference && analysis.reference.files && analysis.reference.files.dataFile;

  if (dataFileAfter) {
    analysis.numTicks = getTicks(dataFileAfter);
  }
  if (dataFileBefore) {
    analysis.reference!.numTicks = getTicks(dataFileBefore);

    if (dataFileAfter) {
      const regressionAnalysis = checkForRegressions(dataFileBefore, dataFileAfter);
      analysis.isRegression = regressionAnalysis.isRegression;
      if (regressionAnalysis.isRegression) {
        console.log(`regressionFile: ${JSON.stringify(analysis)}`);
        fs.writeFileSync(analysis.files!.regressionFile!, regressionAnalysis.summary);
      }
    }
  }

  return analysis;
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

export default {
  cook
};
