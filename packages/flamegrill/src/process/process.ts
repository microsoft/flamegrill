import fs from 'fs';
import path from 'path';
import cp from 'child_process';
import concat from 'concat-stream';
import flamebearer from './flamebearer';

import { ScenarioConfig } from '../flamegrill';
import { ScenarioProfiles } from '../profile';

// TODO: is file output good enough here as an API? should this return programmatic results?
export interface ProcessedOutput {
  dataFile: string;
  flamegraphFile: string;
}

export interface ProcessedError {
  errorFile: string;
}

export interface Processed {
  output?: ProcessedOutput;
  error?: ProcessedError;
}

export interface ProcessedScenario extends Processed {
  baseline?: Processed;
}

export interface ProcessedScenarios {
  [scenarioName: string]: ProcessedScenario;
};

const tickprocessor = require.resolve('../tickprocessor');

export async function processProfiles(profiles: ScenarioProfiles, config: Required<ScenarioConfig>): Promise<ProcessedScenarios> {
  const processedScenarios: ProcessedScenarios = {};

  // Serialize a bunch of async generation of flamegraphs
  // TODO: need an API story here. how will users get output? data structures? files? both?
  for (const scenarioName of Object.keys(profiles)) {
    const outFile = path.join(config.outDir, `${scenarioName}`);
    const outFileBaseline = path.join(config.outDir, `${scenarioName}_base`);
    const result = profiles[scenarioName];

    const processedScenario: ProcessedScenario = await processProfile(result.logFile, outFile);

    if(result.baseline) {
      processedScenario.baseline = await processProfile(result.baseline.logFile, outFileBaseline);
    }

    processedScenarios[scenarioName] = processedScenario;
  }

  return processedScenarios;
}

async function processProfile(logFile: string, outFile: string): Promise<Processed> {
  return generateFlamegraph(logFile, outFile);
}

/**
 * Takes in a v8 or node generated profile log and turn into flamegraph with flamebearer.
 * Generates files based on scenarioName: flamegraph (.html), JS data (.data.js), and error output (.err.txt)
 *
 * @param {string} logFile Profile log file path and base name input.
 * @param {string} outFile File path and base name for file output. Extensions will be added for each type of file output.
 * @returns {Promise<OutputFiles>} Promise resolving to generated files.
 */
async function generateFlamegraph(logFile: string, outFile: string): Promise<Processed> {
  // TODO: account for --windows, --unix and --mac arguments? what is the output difference with and without these args?
  // TODO: use cli
  const preprocessProc = cp.spawn(process.execPath, [tickprocessor, '--preprocess', '-j', logFile]);
  const flamegraphFile = outFile + '.html'
  const dataFile = outFile + '.data.js';
  const errorFile = outFile + '.err.txt';

  // TODO: return early?
  if (!fs.existsSync(path.dirname(outFile))) {
    console.error(`Directory does not exist: ${path.dirname(outFile)}`);
  }

  // TODO: this just silently fails if the output directory doesn't exist
  const flamebearerPromise = new Promise<Processed>((resolve, reject) => {
    const outStream = concat(preprocessed => {
      if (preprocessed.length > 0) {
        // This line writes intermediate streaming output for troubleshooting:
        // fs.writeFileSync(flamegraphfile.split('.html').join('.preprocessed.log'), preprocessed);

        const [flamegraph, data] = flamebearer(preprocessed);
        fs.writeFileSync(flamegraphFile, flamegraph);
        fs.writeFileSync(dataFile, data);

        resolve({ output: { dataFile, flamegraphFile } });
      }
    });

    const errStream = concat(err => {
      if (err.length > 0) {
        fs.writeFileSync(errorFile, err);
        resolve({ error: { errorFile } });
      }
    });

    preprocessProc.stderr.pipe(errStream);
    preprocessProc.stdout.pipe(outStream);
  });

  return flamebearerPromise;
}

/**
 * Takes in a v8 or node generated profile log and generate a summary text file (.summary.log)
 *
 * @param {string} logfile Log file input.
 * @param {string} outfile File path and base name for file output. Extensions will be added for each type of file output.
 * @returns {string} Summary file path.
 */
async function generateSummary(logfile: string, outfile: string): Promise<string> {
  // TODO: account for --windows, --unix and --mac arguments? what is the output difference with and without these args?
  // TODO: use cli
  const summaryProc = cp.spawn(process.execPath, [tickprocessor, logfile]);
  const summaryFile = outfile + '.summary.log';

  const flamebearerPromise = new Promise<string>((resolve, reject) => {
    const concatStream = concat(preprocessed => {
      // TODO: this code just blindly assumes flamegraphfile has an html extension
      fs.writeFileSync(summaryFile, preprocessed);
      resolve(summaryFile);
    });

    summaryProc.stdout.pipe(concatStream);
  });

  return flamebearerPromise;
}

export const __unitTestHooks = {
  processProfile
};
