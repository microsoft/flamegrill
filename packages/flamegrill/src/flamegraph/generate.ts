import fs from 'fs';
import path from 'path';
import cp from 'child_process';
import { Transform } from 'stream';
import concat from 'concat-stream';
import flamebearer from './flamebearer';

export interface GeneratedFiles {
  dataFile?: string;
  errorFile?: string;
  flamegraphFile?: string;
}

const tickprocessor = require.resolve('../tickprocessor');

// TODO: no longer using Node's profile processor, remove this
function jsonCleanUp() {
  return new Transform({
    transform: (data, _, next) => {
      if (data.indexOf('Testing v8 version different from logging version') > -1) {
        next();
        return;
      }
      next(null, data);
    }
  });
}

/**
 * Takes in a v8 or node generated profile log and turn into flamegraph with flamebearer.
 * Generates files based on scenarioName: flamegraph (.html), JS data (.data.js), and error output (.err.txt)
 *
 * @param {string} logFile Log file path and base name input.
 * @param {string} outFile File path and base name for file output. Extensions will be added for each type of file output.
 * @returns {Promise<OutputFiles>} Promise resolving to generated files.
 */
// TODO: is file output good enough here as an API? should this return programmatic results?
export function generateFlamegraph(logFile: string, outFile: string): Promise<GeneratedFiles> {
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
  const flamebearerPromise = new Promise<GeneratedFiles>((resolve, reject) => {
    const outStream = concat(preprocessed => {
      if (preprocessed.length > 0) {
        // This line writes intermediate streaming output for troubleshooting:
        // fs.writeFileSync(flamegraphfile.split('.html').join('.preprocessed.log'), preprocessed);

        const [flamegraph, data] = flamebearer(preprocessed);
        fs.writeFileSync(flamegraphFile, flamegraph);
        fs.writeFileSync(dataFile, data);

        resolve({ dataFile, flamegraphFile });
      }
    });

    const errStream = concat(err => {
      if (err.length > 0) {
        fs.writeFileSync(errorFile, err);
        resolve({ errorFile });
      }
    });

    preprocessProc.stderr.pipe(jsonCleanUp()).pipe(errStream);
    preprocessProc.stdout.pipe(jsonCleanUp()).pipe(outStream);
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
export function generateSummary(logfile: string, outfile: string): Promise<string> {
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

    summaryProc.stdout.pipe(jsonCleanUp()).pipe(concatStream);
  });

  return flamebearerPromise;
}
