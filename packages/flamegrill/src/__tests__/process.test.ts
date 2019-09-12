import fs from 'fs';
import path from 'path';
import * as tmp from 'tmp';

import { generateFlamegraph } from '../flamegraph/generate';

const profiles = require('../fixtures/profiles.json');
const snapshotsDir = path.join(__dirname, '../fixtures/snapshots');

// TODO: these are black box tests for now but should be refactored to be unit tests
// TODO: modules that output files should be modified not to and wrapped by a centralized file output helper
// TODO: consider also making file output / github / CI integration another package within this repo

describe('process', () => {
  it('generates expected output', async () => {
    jest.setTimeout(30000);
    
    expect.assertions(84);
    
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

    const snapshotFiles = fs.readdirSync(snapshotsDir);
    const testFiles = fs.readdirSync(outdir.name);

    // TODO: re-enable once regression output is generated
    // expect(snapshotFiles).toEqual(testFiles);

    testFiles.forEach(file => {
      // Generated output uses just \n. Code committed in github also uses just \n.
      // However, Windows clients can be configured to translate to \r\n while working, 
      // so we must ignore line break types when comparing results.
      const analysis = fs.readFileSync(path.join(snapshotsDir, file), 'utf8').split(/\r?\n/g);
      const output = fs.readFileSync(path.join(outdir.name, file), 'utf8').split(/\r?\n/g);

      expect(analysis).toEqual(output);
    });

    outdir.removeCallback();
  });
});

