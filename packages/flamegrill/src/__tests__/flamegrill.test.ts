import fs from 'fs';
import path from 'path';
import * as tmp from 'tmp';
import puppeteer, { Browser, Page } from 'puppeteer';

import { cook, CookResult, Scenarios, ScenarioConfig } from '../flamegrill';
import { __unitTestHooks } from '../process/process';
import { findRegressions } from '../analyze/regression';

// TODO: these are black box tests for now but should be refactored to be unit tests
// TODO: modules that output files should be modified not to and wrapped by a centralized file output helper
// TODO: consider also making file output / github / CI integration another package within this repo

describe('flamegrill', () => {
  describe('cook', () => {
    const profiles = require('../fixtures/profiles.json');
    const util = require('../util');
    const fixturesDir = path.join(__dirname, '../fixtures');

    let scenarios: Scenarios = {};
    let scenarioNames: string[];
    let outdir: tmp.DirResult;
    let scenarioConfig: ScenarioConfig;
    let scenarioIndex: number = 0;

    const testPage: Page = {
      close: jest.fn(() => Promise.resolve()),
      goto: jest.fn(() => {
        return Promise.resolve(null);
      }),
      metrics: jest.fn(() => Promise.resolve({})),
      setDefaultTimeout: jest.fn(() => {})
    } as unknown as Page;

    const testBrowser: Browser = {
      newPage: jest.fn(() => {
        return Promise.resolve(testPage);
      }),
      close: jest.fn(() => {})
    } as unknown as Browser;
    
    beforeAll(() => {
      // Processing all profiles takes more than the default 5 seconds.
      jest.setTimeout(60000);

      jest.spyOn(puppeteer, 'launch').mockImplementation(() => {
        return Promise.resolve(testBrowser);
      });

      scenarioNames = Object.keys(profiles);
      scenarioNames.forEach(scenarioName => {
        scenarios[scenarioName] = {
          scenario: scenarioName + ".url",
          // TODO: changing this value doesn't matter. is this setup needed?
          baseline: scenarioName + "_base.url"
        }
      });
    });

    beforeEach(() => {
      jest.clearAllMocks();
      outdir = tmp.dirSync({ unsafeCleanup: true });
      scenarioConfig = {
        outDir: outdir.name,
        tempDir: fixturesDir
      };
    });
    
    afterAll(() => {
      jest.resetAllMocks();
      outdir.removeCallback();
    })

    it('generates expected output', async () => {
      const snapshotsDir = path.join(__dirname, '../fixtures/snapshots');
      const expectedResults = require('../fixtures/results.json');

      // Set up arr_diff to feed in predefined profiler log fixtures.
      jest.spyOn(util, 'arr_diff').mockImplementation(() => {
        let logfile;
        // This code assumes scenarios are processed in the same order passed into cook, which
        // is true as of writing.
        const scenarioName = scenarioNames[Math.floor(scenarioIndex / 2)];
        if (scenarioIndex % 2) {
          logfile = profiles[scenarioName].baseline.logFile;
        } else {
          logfile = profiles[scenarioName].logFile;
        }
        scenarioIndex += 1;
        
        return [logfile];
      });

      const testResults = await cook(scenarios, scenarioConfig);

      // The path will differ for every test run, so remove it before comparing results.
      removePaths(testResults);

      // Convenience line left commented out for updating expected output.
      // fs.writeFileSync(path.join(outdir.name, "results.json"), JSON.stringify(testResults));

      expect(testResults).toEqual(expectedResults);

      const snapshotFiles = fs.readdirSync(snapshotsDir);
      const testFiles = fs.readdirSync(outdir.name);

      expect(testFiles).toEqual(snapshotFiles);

      testFiles.forEach(file => {
        // Some generated output creates files with \r\n. Some environments spit out \n.
        // Ignore line break types when comparing results.
        const analysis = fs.readFileSync(path.join(snapshotsDir, file), 'utf8').split(/\r?\n/g);
        const output = fs.readFileSync(path.join(outdir.name, file), 'utf8').split(/\r?\n/g);

        expect(output).toEqual(analysis);
      });

      expect((testBrowser.close as jest.Mock).mock.calls.length).toEqual(1);
    });

    it('errors on invalid profile logs', async () => {
      const expectedResults = require('../fixtures/errors/errors.json');

      // Set up arr_diff to feed in predefined profiler log fixtures.
      jest.spyOn(util, 'arr_diff').mockImplementation(() => {
        let logfile = "errors/error.prof";
        return [logfile];
      });

      const testResults = await cook({ 'test': { scenario: 'testUrl' } }, scenarioConfig);

      // The path will differ for every test run, so remove it before comparing results.
      removePaths(testResults);

      // Convenience line left commented out for updating expected output.
      // fs.writeFileSync(path.join(outdir.name, "errors.json"), JSON.stringify(testResults));

      expect(testResults).toEqual(expectedResults);

      const testFiles = fs.readdirSync(outdir.name);
      expect(testFiles).toEqual(['test.err.txt']);
      
      const errorFile = fs.readFileSync(path.join(outdir.name, 'test.err.txt'));
      expect(errorFile.includes('Error: dispatchLogRow_: Can\'t parse tick,0xfffffffdeb11c0e4,55914,0,0x0,6, integer too large.')).toBeTruthy();
      
      expect((testBrowser.close as jest.Mock).mock.calls.length).toEqual(1);
    });
  });
  
  // These tests are technically redundant with cook tests but are left for now as they may be useful 
  // as unit tests are added.
  describe('generateFlamegraph, findRegressions', () => {
    const { processProfile } = __unitTestHooks;
    const profiles = require('../fixtures/profiles.json');
    const snapshotsDir = path.join(__dirname, '../fixtures/snapshots');
    
    it('generates expected output', async () => {
      // Processing all profiles takes more than the default 5 seconds.
      jest.setTimeout(30000);
      
      expect.assertions(89);
      
      const outdir = tmp.dirSync({ unsafeCleanup: true });

      // TODO: replace with processProfiles?
      await Promise.all(Object.keys(profiles).map(key => {
        let logfile = require.resolve(path.join('../fixtures', profiles[key].logFile));
        let outfile = path.join(outdir.name, key);
        return processProfile(logfile, outfile)
      }));

      await Promise.all(Object.keys(profiles).map(key => {
        let logfile = require.resolve(path.join('../fixtures', profiles[key].baseline.logFile));
        let outfile = path.join(outdir.name, key + '_base');
        return processProfile(logfile, outfile)
      }));

      Object.keys(profiles).forEach(key => {
        // TODO: this code block is duplicating code in flamegrill.ts and should be removed as code is refactored.
        let datafileBefore = path.join(outdir.name, key + '_base.data.js');
        let datafileAfter = path.join(outdir.name, key + '.data.js');
        let regressionfile = path.join(outdir.name, key + '.regression.txt');

        const analysis = findRegressions(datafileBefore, datafileAfter);

        if(analysis.isRegression) {
          fs.writeFileSync(regressionfile, analysis.summary);
        }
      });

      const snapshotFiles = fs.readdirSync(snapshotsDir);
      const testFiles = fs.readdirSync(outdir.name);

      expect(testFiles).toEqual(snapshotFiles);

      testFiles.forEach(file => {
        // Some generated output creates files with \r\n. Some environments spit out \n.
        // Ignore line break types when comparing results.
        const analysis = fs.readFileSync(path.join(snapshotsDir, file), 'utf8').split(/\r?\n/g);
        const output = fs.readFileSync(path.join(outdir.name, file), 'utf8').split(/\r?\n/g);

        expect(output).toEqual(analysis);
      });

      outdir.removeCallback();
    });
  });
});

/**
 * Helper to remove paths from filenames, leaving just base filename.
 */ 
function removePaths<T>(obj: T) {
  Object.keys(obj).forEach(key => {
    if (key.includes('File')) {
      console.log(`key = ${key}`);
      obj[key as keyof T] = path.basename(obj[key as keyof T] as any) as any;
    } else if (obj[key as keyof T] instanceof Object) {
      removePaths(obj[key as keyof T]);
    }
  });
}
