import * as tmp from 'tmp';
import { Browser, Page } from 'puppeteer';

import { __unitTestHooks, ProfilePage } from '../profile';

describe('profileUrl', () => {
  const { profileUrl } = __unitTestHooks;
  const testUrl = 'testUrl';
  const testMetrics = { metric1: 1, metric2: 2 };
  const testPage: Page = {
    close: jest.fn(() => Promise.resolve()),
    goto: jest.fn(() => {
      return Promise.resolve(null);
    }),
    metrics: jest.fn(() => Promise.resolve(testMetrics)),
    setDefaultTimeout: jest.fn(() => {}),
    waitForSelector: jest.fn(() => Promise.resolve()),
  } as unknown as Page;

  const testBrowser: Browser = {
    newPage: jest.fn(() => {
      logfile = tmp.fileSync({ dir: outdir.name });
      return Promise.resolve(testPage);
    })
  } as unknown as Browser;

  const testSelector = '#testSelector';

  let outdir: tmp.DirResult;
  let logfile: tmp.FileResult;

  beforeAll(() => {
    outdir = tmp.dirSync({ unsafeCleanup: true });
  });
  
  afterAll(() => {
    outdir.removeCallback();
  })

  it('performs expected operations', async () => {
    const executeBeforeMeasurement = async (page: ProfilePage) => { await page.waitForSelector(testSelector); } 

    const result = await profileUrl(testBrowser, testUrl, 'testScenario', outdir.name, executeBeforeMeasurement);

    expect((testPage.setDefaultTimeout as jest.Mock).mock.calls.length).toEqual(1);
    expect((testPage.setDefaultTimeout as jest.Mock).mock.calls[0][0]).toEqual(0);
    expect((testPage.goto as jest.Mock).mock.calls.length).toEqual(1);
    expect((testPage.goto as jest.Mock).mock.calls[0][0]).toEqual(testUrl);
    expect((testPage.close as jest.Mock).mock.calls.length).toEqual(1);
    expect((testPage.waitForSelector as jest.Mock).mock.calls.length).toEqual(1);
    expect((testPage.waitForSelector as jest.Mock).mock.calls[0][0]).toEqual(testSelector);

    expect(logfile).toBeDefined();
    expect(result.logFile).toEqual(logfile.name);
    expect(result.metrics).toEqual(testMetrics);
  });
});
