import fs from 'fs';
import path from 'path';
import * as tmp from 'tmp';
import puppeteer, { Browser, Metrics, Page } from 'puppeteer';

import { cook, Scenarios, ScenarioConfig } from '../flamegrill';
import { ScenarioProfile } from '../profile';
import { __unitTestHooks } from '../process/process';
import { analyzeFunctions } from '../analyze/functional';

// TODO: these are black box tests for now but should be refactored to be unit tests
// TODO: modules that output files should be modified not to and wrapped by a centralized file output helper
// TODO: consider also making file output / github / CI integration another package within this repo

describe('flamegrill', () => {
  const testMetrics: Metrics = {
    Timestamp: 0,
    Documents: 1,
    Frames: 2,
    JSEventListeners: 3,
    Nodes: 4,
    LayoutCount: 5,
    RecalcStyleCount: 6,
    LayoutDuration: 7,
    RecalcStyleDuration: 8,
    ScriptDuration: 9,
    TaskDuration: 10,
    JSHeapUsedSize: 11,
    JSHeapTotalSize: 12
  }

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
      metrics: jest.fn(() => Promise.resolve(testMetrics)),
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
      const expectedResults = require(path.join(snapshotsDir, 'results.json'));

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
      removePaths(expectedResults);
      removePaths(testResults);

      // Convenience line left commented out for updating expected output.
      fs.writeFileSync(path.join(outdir.name, "results.json"), JSON.stringify(testResults));

      expect(testResults).toEqual(expectedResults);

      const snapshotFiles = fs.readdirSync(snapshotsDir);
      const testFiles = fs.readdirSync(outdir.name);

      expect(testFiles).toEqual(snapshotFiles);

      testFiles.forEach(file => {
        let expectedFileContents;
        let testFileContents;

        if(file.includes('.json')) {
          expectedFileContents = require(path.join(snapshotsDir, file));
          testFileContents = require(path.join(outdir.name, file));

          // The path will differ for every test run, so remove it before comparing results.
          removePaths(expectedFileContents);
          removePaths(testFileContents);
        } else {
          // Some generated output creates files with \r\n. Some environments spit out \n.
          // Ignore line break types when comparing results.
          expectedFileContents = fs.readFileSync(path.join(snapshotsDir, file), 'utf8').split(/\r?\n/g);
          testFileContents = fs.readFileSync(path.join(outdir.name, file), 'utf8').split(/\r?\n/g);
        }

        expect(testFileContents).toEqual(expectedFileContents);
      });

      expect((testBrowser.close as jest.Mock).mock.calls.length).toEqual(1);
    });

    it('errors on invalid profile logs', async () => {
      const snapshotsDir = path.join(__dirname, '../fixtures/errors/snapshots');
      const expectedResults = require(path.join(snapshotsDir, 'results.json'));

      // Set up arr_diff to feed in predefined profiler log fixtures.
      jest.spyOn(util, 'arr_diff').mockImplementation(() => {
        let logfile = "errors/error.prof";
        return [logfile];
      });

      const testResults = await cook({ 'test': { scenario: 'testUrl' } }, scenarioConfig);

      // The path will differ for every test run, so remove it before comparing results.
      removePaths(expectedResults);
      removePaths(testResults);

      // Convenience line left commented out for updating expected output.
      // fs.writeFileSync(path.join(outdir.name, "errors.json"), JSON.stringify(testResults));

      expect(testResults).toEqual(expectedResults);

      const snapshotFiles = fs.readdirSync(snapshotsDir);
      const testFiles = fs.readdirSync(outdir.name);

      expect(testFiles).toEqual(snapshotFiles);
      
      testFiles.forEach(file => {
        let expectedFileContent;
        let testFileContent;

        if(file.includes('.json')) {
          expectedFileContent = require(path.join(snapshotsDir, file));
          testFileContent = require(path.join(outdir.name, file));

          // The path will differ for every test run, so remove it before comparing results.
          removePaths(expectedFileContent);
          removePaths(testFileContent);

          expect(testFileContent).toEqual(expectedFileContent);
        } else if (file === 'test.err.txt') {
          const errorFile = fs.readFileSync(path.join(outdir.name, 'test.err.txt'));
          expect(errorFile.includes('Error: dispatchLogRow_: Can\'t parse tick,0xfffffffdeb11c0e4,55914,0,0x0,6, integer too large.')).toBeTruthy();
        } else {
          // Unknown file, test should be updated to check results.
          expect(file).toEqual('');
        }
      });

      expect((testBrowser.close as jest.Mock).mock.calls.length).toEqual(1);
    });
  });
  
  // These tests are technically redundant with cook tests but are left for now as they may be useful 
  // as unit tests are added.
  describe('generateFlamegraph, analyzeFunctions', () => {
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
        const profile: ScenarioProfile = {
          logFile: require.resolve(path.join('../fixtures', profiles[key].logFile)),
          metrics: testMetrics
        };
        const outfile = path.join(outdir.name, key);
        return processProfile(profile, outfile)
      }));

      await Promise.all(Object.keys(profiles).map(key => {
        const profile: ScenarioProfile = {
          logFile: require.resolve(path.join('../fixtures', profiles[key].baseline.logFile)),
          metrics: testMetrics
        };
        const outfile = path.join(outdir.name, key + '_base');
        return processProfile(profile, outfile)
      }));

      Object.keys(profiles).forEach(key => {
        // TODO: this code block is duplicating code in flamegrill.ts and should be removed as code is refactored.
        let datafileBasline = path.join(outdir.name, key + '_base.data.js');
        let datafile = path.join(outdir.name, key + '.data.js');
        let regressionfile = path.join(outdir.name, key + '.regression.txt');

        const analysis = analyzeFunctions(datafileBasline, datafile);

        if(analysis.isRegression) {
          fs.writeFileSync(regressionfile, analysis.summary);
        }
      });

      const snapshotFiles = fs.readdirSync(snapshotsDir).filter(file => file !== 'results.json');
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
      obj[key as keyof T] = path.basename(obj[key as keyof T] as any) as any;
    } else if (obj[key as keyof T] instanceof Object) {
      removePaths(obj[key as keyof T]);
    }
  });
}
