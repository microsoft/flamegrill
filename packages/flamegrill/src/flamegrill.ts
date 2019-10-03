import path from 'path';

import { profile } from './profile';
import { processProfiles } from './process';
import { analyze } from './analyze';

// Chrome command for running similarly configured instance of Chrome as puppeteer is configured here:
// "C:\Program Files (x86)\Google\Chrome\Application\chrome" --no-sandbox --js-flags=" --logfile=C:\git\perf\output\chrome.log --prof --jitless --no-opt" --user-data-dir="C:\git\perf\user" http://localhost:4322

export type Scenario = {
  scenario: string;
  baseline?: string;
};

export interface Scenarios {
  [scenarioName: string]: Scenario;
};

export type ScenarioConfig = {
  outDir?: string;
  tempDir?: string; 
};

// TODO: this should reuse existing structures as much as possible. profile, process, analysis.
export interface CookBaselineResult {
  files: CookOutput;
  numTicks: number;
}

// TODO: this should reuse existing structures as much as possible. profile, process, analysis.
export interface CookResult {
  numTicks: number;
  files: CookOutput;
  isRegression: boolean;
  regressionFile: string;
  baseline?: CookBaselineResult;
};

export interface CookResults {
  [scenarioName: string]: CookResult;
}

// TODO: this is redundant with ProcessedOutput
export interface CookOutput {
  dataFile?: string;
  errorFile?: string;
  flamegraphFile?: string;
}

/**
 * 
 * @param {Scenarios} scenarios Scenarios under test.
 * @param {ScenarioConfig} userConfig Optional user configuration. Paths not provided default to working directory.
 */
export async function cook(scenarios: Scenarios, userConfig?: ScenarioConfig): Promise<CookResults> {
  const config = {
    outDir: userConfig && userConfig.outDir ? path.resolve(userConfig.outDir) : process.cwd(),
    tempDir: userConfig && userConfig.tempDir ? path.resolve(userConfig.tempDir) : process.cwd()
  }
  
  const profiles = await profile(scenarios, config);
  console.log('profiles: ' + JSON.stringify(profiles));

  const processedScenarios = await processProfiles(profiles, config);
  const scenarioAnalyses = analyze(processedScenarios, config);

  const analyses: CookResults = {};

  for (const scenarioName of Object.keys(scenarios)) {
    const processedScenario = processedScenarios[scenarioName];
    const analysis = scenarioAnalyses[scenarioName];
    // TODO: remove dis
    const regressionFile = `${scenarioName}.regression.txt`;
  
    // TODO: delete this mess when cook return types are aligned with module types (profile, process, analyze)
    const tempFiles: CookOutput = {};
    if (processedScenario.output) {
      tempFiles.dataFile = processedScenario.output.dataFile;
      tempFiles.flamegraphFile = processedScenario.output.flamegraphFile;
    }
    if (processedScenario.error) {
      tempFiles.errorFile = processedScenario.error.errorFile
    }
    // TODO: delete this mess when cook return types are aligned with module types (profile, process, analyze)
    const tempFilesBaseline: CookOutput = {};
    if (processedScenario.baseline && processedScenario.baseline.output) {
      tempFilesBaseline.dataFile = processedScenario.baseline.output.dataFile;
      tempFilesBaseline.flamegraphFile = processedScenario.baseline.output.flamegraphFile;
    }
    if (processedScenario.baseline && processedScenario.baseline.error) {
      tempFilesBaseline.errorFile = processedScenario.baseline.error.errorFile
    }

    if (processedScenario.output) {
      analyses[scenarioName] = {
        numTicks: analysis.numTicks,
        isRegression: analysis.regression ? analysis.regression.isRegression : false,
        // TODO: this should be an input to processFile?
        regressionFile,
        files: tempFiles,
        baseline: processedScenario.baseline && analysis.baseline ? {
          numTicks: analysis.baseline.numTicks,
          files: tempFilesBaseline
        } : undefined
      };
    } else {
      analyses[scenarioName] = {
        numTicks: -1,
        isRegression: false,
        regressionFile,
        files: tempFiles,
      };
    }
  }

  console.log('analyses: ' + JSON.stringify(analyses));

  return analyses;
};

export default {
  cook
};
