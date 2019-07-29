import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { Transform } from 'stream';
import concat from 'concat-stream';
import flamebearer from './flamebearer';

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
 * Takes in a v8 or node generated profile log and turn into flamegraph with flamebearer
 *
 * @param {string} logfile Log file input.
 * @param {string} outfile Flamegraph output.
 */
function generateFlamegraph(logfile: string, outfile: string) {
  const preprocessProc = spawn(process.execPath, ['--prof-process', '--preprocess', '-j', logfile]);

  if(!fs.existsSync(path.dirname(outfile))) {
    console.error(`Directory does not exist: ${path.dirname(outfile)}`);
  }

  // TODO: this just silently fails if the output directory doesn't exist
  const flamebearerPromise = new Promise((resolve, reject) => {
    const concatStream = concat(preprocessed => {
      const src = flamebearer(preprocessed);
      fs.writeFileSync(outfile, src);
      resolve();
    });

    preprocessProc.stdout.pipe(jsonCleanUp()).pipe(concatStream);
  });

  return flamebearerPromise;
}

export default generateFlamegraph;
