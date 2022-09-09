import * as tmp from 'tmp';
import { Browser, Page } from 'puppeteer';

import { __unitTestHooks, ProfilePage } from '../profile';
import { PageActions, PageActionOptions } from '../../flamegrill';

tmp.setGracefulCleanup();

describe('profileUrl', () => {
  const { profileUrl } = __unitTestHooks;
  const testUrl = 'testUrl';
  const testMetrics = { metric1: 1, metric2: 2 };
  let testPage: Page;

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
  });

  beforeEach(() => {
    testPage = {
      close: jest.fn(() => Promise.resolve()),
      goto: jest.fn(() => {
        return Promise.resolve(null);
      }),
      metrics: jest.fn(() => Promise.resolve(testMetrics)),
      setDefaultTimeout: jest.fn(() => {}),
      waitForSelector: jest.fn(() => Promise.resolve()),
    } as unknown as Page;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('performs expected operations', async () => {
    const result = await profileUrl(testBrowser, testUrl, 'testScenario', outdir.name);

    expect((testPage.goto as jest.Mock).mock.calls.length).toEqual(1);
    expect((testPage.goto as jest.Mock).mock.calls[0][0]).toEqual(testUrl);
    expect((testPage.close as jest.Mock).mock.calls.length).toEqual(1);

    expect(logfile).toBeDefined();
    expect(result.logFile).toEqual(logfile.name);
    expect(result.metrics).toEqual(testMetrics);
  });

  it('performs expected operations when user defined page actions', async () => {
    const pageActions: PageActions = async (page: ProfilePage, options: PageActionOptions) => {
      await page.setDefaultTimeout(0);
      await page.goto(options.url);
      await page.waitForSelector(testSelector);
    };

    const result = await profileUrl(testBrowser, testUrl, 'testScenario', outdir.name, pageActions);

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
