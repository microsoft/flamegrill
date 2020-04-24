import fs from 'fs';
import path from 'path';

import { ScenarioConfig } from '../flamegrill';
import { ScenarioProfileConfig } from '../profile';
import { ProcessedScenario, ProcessedScenarios } from '../process';

import { analyzeFunctions, FunctionalAnalysis } from './functional';

export interface Analysis {
  numTicks: number;
}

export interface RegressionAnalysis extends FunctionalAnalysis {
  regressionFile?: string;
};

export interface ScenarioAnalysis extends Analysis {
  baseline?: Analysis;
  regression?: RegressionAnalysis;
};

export interface ScenarioAnalyses {
  [scenarioName: string]: ScenarioAnalysis | undefined;
};

export function analyze(processedScenarios: ProcessedScenarios, config: ScenarioProfileConfig): ScenarioAnalyses {
  const scenarioAnalyses: ScenarioAnalyses = {};

  for (const scenarioName of Object.keys(processedScenarios)) {
    const processedScenario = processedScenarios[scenarioName];
    
    const analysis = analyzeScenario(processedScenario, scenarioName, config);

    scenarioAnalyses[scenarioName] = analysis;
  }
  
  return scenarioAnalyses;
}

/**
 * Process profiler output and check for regressions.
 */
function analyzeScenario(scenario: ProcessedScenario, scenarioName: string, config: ScenarioProfileConfig): ScenarioAnalysis | undefined {
  if (scenario.output) {
    let numTicks = getTicks(scenario.output.dataFile);

    if (scenario.baseline && scenario.baseline.output) {
      let numTicksBaseline = getTicks(scenario.baseline.output.dataFile);
      let analysis: RegressionAnalysis = analyzeFunctions(scenario.baseline.output.dataFile, scenario.output.dataFile);
      if (analysis.isRegression) {
        analysis.regressionFile = `${scenarioName}.regression.txt`;
        fs.writeFileSync(path.join(config.outDir, analysis.regressionFile), analysis.summary);
      }
      return {
        numTicks,
        baseline: { 
          numTicks: numTicksBaseline 
        },
        regression: analysis
      };
    }

    return { numTicks };
  }
  
  console.log('analyzeScenario: no output to analyze!')

  return undefined;
}

/**
 * Get ticks from flamegraph file.
 *
 * @param {string} resultsFile
 */
function getTicks(resultsFile: string): number {
  const numTicks = fs
    .readFileSync(resultsFile, 'utf8')
    .toString()
    .match(/numTicks\s?\=\s?([0-9]+)/);

  if (numTicks && numTicks[1]) {
    return Number.parseInt(numTicks[1]);
  } else {
    console.log('Could not read numTicks from ' + resultsFile);
    return -1;
  }
}
