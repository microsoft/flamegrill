import fs from 'fs';
import path from 'path';

import { ScenarioConfig } from '../flamegrill';
import { ProcessedScenario, ProcessedScenarios } from '../process';

import { findRegressions, RegressionOutput } from './regression';

// TODO: check all types for usage and consistency across modules.
export interface Analysis {
  numTicks: number;
}

export interface RegressionAnalysis extends RegressionOutput {
  regressionFile?: string;
};

export interface ScenarioAnalysis extends Analysis {
  baseline?: Analysis;
  regression?: RegressionOutput;
};

export interface ScenarioAnalyses {
  [scenarioName: string]: ScenarioAnalysis;
};

export function analyze(processedScenarios: ProcessedScenarios, config: Required<ScenarioConfig>): ScenarioAnalyses {
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
function analyzeScenario(scenario: ProcessedScenario, scenarioName: string, config: Required<ScenarioConfig>): ScenarioAnalysis {
  let numTicks = -1;

  if (scenario.output) {
    numTicks = getTicks(scenario.output.dataFile);

    if (scenario.baseline && scenario.baseline.output) {
      let numTicksBaseline = getTicks(scenario.baseline.output.dataFile);
      let analysis: RegressionAnalysis = findRegressions(scenario.baseline.output.dataFile, scenario.output.dataFile);
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
  } else {
    console.log('analyzeScenario: no output to analyze!')
  }

  return {
    numTicks
  };
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
