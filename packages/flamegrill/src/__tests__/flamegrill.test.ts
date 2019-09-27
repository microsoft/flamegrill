import fs from 'fs';
import path from 'path';
import * as tmp from 'tmp';
import puppeteer, { Browser, Page } from 'puppeteer';

import { cook, OutputFiles, Scenario, ScenarioConfig } from '../flamegrill';
import { generateFlamegraph } from '../flamegraph/generate';
import { checkForRegressions } from '../analysis/processData';

// TODO: these are black box tests for now but should be refactored to be unit tests
// TODO: modules that output files should be modified not to and wrapped by a centralized file output helper
// TODO: consider also making file output / github / CI integration another package within this repo

describe('flamegrill', () => {
  describe('cook', () => {
    const profiles = require('../fixtures/profiles.json');
    const expectedResults = require('../fixtures/results.json');
    const util = require('../util');
    const fixturesDir = path.join(__dirname, '../fixtures');
    const snapshotsDir = path.join(__dirname, '../fixtures/snapshots');

    let scenarios: Scenario[];
    let scenarioNames: string[];
    let outdir: tmp.DirResult;
    let scenarioConfig: ScenarioConfig;
    let scenarioIndex: number = 0;

    const testPage: Page = {
      close: jest.fn(() => Promise.resolve()),
      goto: jest.fn(() => {
        return Promise.resolve(null);
      }),
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

      jest.spyOn(util, 'arr_diff').mockImplementation(() => {
        let logfile;
        // This code assumes scenarios are processed in the same order passed into cook, which
        // is true as of writing.
        const scenarioName = scenarioNames[Math.floor(scenarioIndex / 2)];
        if (scenarioIndex % 2) {
          logfile = profiles[scenarioName].reference.logFile;
        } else {
          logfile = profiles[scenarioName].logFile;
        }
        scenarioIndex += 1;
        
        return [logfile];
      });

      outdir = tmp.dirSync({ unsafeCleanup: true });
      scenarioConfig = {
        outDir: outdir.name,
        tempDir: fixturesDir
      };

      scenarioNames = Object.keys(profiles);
      scenarios = scenarioNames.map(scenarioName => {
        return {
          name: scenarioName,
          scenario: scenarioName + ".url",
          reference: scenarioName + "_ref.url"
        }
      });
    });
    
    afterAll(() => {
      jest.resetAllMocks();
      outdir.removeCallback();
    })

    it('generates expected output', async () => {
      const testResults = await cook(scenarios, scenarioConfig);

      // The path will differ for every test run, so remove it before comparing results.
      // TODO: remove these !s after types are cleaned up
      Object.keys(testResults).forEach(result => {
        Object.keys(testResults[result].files!).forEach(file => {
          testResults[result].files![file as keyof OutputFiles] 
            = path.basename(testResults[result].files![file as keyof OutputFiles]!);
        })
        Object.keys(testResults[result].reference!.files!).forEach(file => {
          testResults[result].reference!.files![file as keyof OutputFiles] 
            = path.basename(testResults[result].reference!.files![file as keyof OutputFiles]!);
        })
      });

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
  });
  
  // These tests are technically redundant with cook tests but are left for now as they may be useful 
  // as unit tests are added.
  describe('generateFlamegraph, checkForRegressions', () => {
    const profiles = require('../fixtures/profiles.json');
    const snapshotsDir = path.join(__dirname, '../fixtures/snapshots');
    
    it('generates expected output', async () => {
      // Processing all profiles takes more than the default 5 seconds.
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
