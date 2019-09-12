import fs from 'fs';
import path from 'path';
import * as tmp from 'tmp';

import { generateFlamegraph } from '../flamegraph/generate';
import { checkForRegressions } from '../analysis/processData';

const profiles = require('../fixtures/profiles.json');
const snapshotsDir = path.join(__dirname, '../fixtures/snapshots');

// TODO: these are black box tests for now but should be refactored to be unit tests
// TODO: modules that output files should be modified not to and wrapped by a centralized file output helper
// TODO: consider also making file output / github / CI integration another package within this repo

describe('flamegrill', () => {
  it('generates expected output', async () => {
    jest.setTimeout(30000);
    
    expect.assertions(89);
    
    const outdir = tmp.dirSync({ unsafeCleanup: true });

    await Promise.all(Object.keys(profiles).map(key => {
      let logfile = require.resolve(path.join('../fixtures', profiles[key].logFile));
      let outfile = path.join(outdir.name, key);
      return generateFlamegraph(logfile, outfile)
    }));

    await Promise.all(Object.keys(profiles).map(key => {
      let logfile = require.resolve(path.join('../fixtures', profiles[key].reference.logFile));
      let outfile = path.join(outdir.name, key + '_ref');
      return generateFlamegraph(logfile, outfile)
    }));

    Object.keys(profiles).forEach(key => {
      // TODO: this code block is duplicating code in flamegrill.ts and should be removed as code is refactored.
      let datafileBefore = path.join(outdir.name, key + '_ref.data.js');
      let datafileAfter = path.join(outdir.name, key + '.data.js');
      let regressionfile = path.join(outdir.name, key + '.regression.txt');

      const analysis = checkForRegressions(datafileBefore, datafileAfter);

      if(analysis.isRegression) {
        fs.writeFileSync(regressionfile, analysis.summary);
      }
    });

    const snapshotFiles = fs.readdirSync(snapshotsDir);
    const testFiles = fs.readdirSync(outdir.name);

    expect(testFiles).toEqual(snapshotFiles);

    testFiles.forEach(file => {
      const analysis = fs.readFileSync(path.join(snapshotsDir, file), 'utf8');
      const output = fs.readFileSync(path.join(outdir.name, file), 'utf8');

      expect(output).toEqual(analysis);
    });

    outdir.removeCallback();
  });
});
