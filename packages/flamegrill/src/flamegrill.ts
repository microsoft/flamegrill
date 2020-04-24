import fs from 'fs';
import path from 'path';
import { profile, ScenarioProfile, ProfilePage } from './profile';
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

export interface PageActionOptions {
  /** URL the page will navigate to. */
  url: string;
}

/**
 * Async page operations which will be execute before taking metrics.
 * This will override default page operations done by flamegrill before page.metrics().
 */
export type PageActions = (page: ProfilePage, options: PageActionOptions) => Promise<void>;

export interface ScenarioConfig {
  outDir?: string;
  tempDir?: string;
  pageActions?: PageActions;
}

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
  if(!fs.existsSync(dirPath)){
    fs.mkdirSync(dirPath);
  }
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
    tempDir: userConfig && userConfig.tempDir ? resolveDir(userConfig.tempDir) : process.cwd(),
    pageActions: userConfig && userConfig.pageActions,
  };
  
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

  fs.writeFileSync(path.join(config.outDir, 'results.json'), JSON.stringify(results));
  
  console.log('results: ');
  console.dir(results, { depth: null });

  return results;
};

export default {
  cook
};
