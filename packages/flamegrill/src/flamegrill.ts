import mkdirp from 'mkdirp';
import path from 'path';
import { profile, ScenarioProfile } from './profile';
import { processProfiles, ProcessedScenario } from './process';
import { analyze, ScenarioAnalysis } from './analyze';

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

export interface CookResult {
  profile: ScenarioProfile;
  processed: ProcessedScenario;
  analysis?: ScenarioAnalysis;
}

export interface CookResults {
  [scenarioName: string]: CookResult;
}


/**
 * Function that takes a directory path
 * and creates the structure if it doesn't exist
 * @param {string} path directory path
 * @returns {string} the directory path
 */
function resolveDir(dirPath: string): string {
  mkdirp(dirPath, (err, made) => {
    if (made === null){
      console.log("Unable to create directory");
      console.error(err);
    }
  })
  return path.resolve(dirPath);
}


/**
 * 
 * @param {Scenarios} scenarios Scenarios under test.
 * @param {ScenarioConfig} userConfig Optional user configuration. Paths not provided default to working directory.
 */
export async function cook(scenarios: Scenarios, userConfig?: ScenarioConfig): Promise<CookResults> {
  const config = {
    outDir: userConfig && userConfig.outDir ? resolveDir(userConfig.outDir) : process.cwd(),
    tempDir: userConfig && userConfig.tempDir ? resolveDir(userConfig.tempDir) : process.cwd()
  }
  
  const profiles = await profile(scenarios, config);
  const processed = await processProfiles(profiles, config);
  const analyses = analyze(processed, config);

  const results: CookResults = {};

  Object.keys(scenarios).forEach(scenarioName => {
    results[scenarioName] = {
      profile: profiles[scenarioName],
      processed: processed[scenarioName],
      analysis: analyses[scenarioName],
    };
  });

  console.log('results: ');
  console.dir(results, { depth: null });

  return results;
};

export default {
  cook
};
