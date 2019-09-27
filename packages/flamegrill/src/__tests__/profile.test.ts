import * as tmp from 'tmp';
import { Browser, Page } from 'puppeteer';

import { runProfile } from '../profile';

describe('runProfile', () => {
  let outdir: tmp.DirResult;
  let logfile: tmp.FileResult;

  const testUrl = 'testUrl';
  const testPage: Page = {
    close: jest.fn(() => Promise.resolve()),
    goto: jest.fn(() => {
      return Promise.resolve(null);
    }),
    setDefaultTimeout: jest.fn(() => {})
  } as unknown as Page;

  const testBrowser: Browser = {
    newPage: jest.fn(() => {
      logfile = tmp.fileSync({ dir: outdir.name });
      return Promise.resolve(testPage);
    })
  } as unknown as Browser;

  beforeAll(() => {
    outdir = tmp.dirSync({ unsafeCleanup: true });
  });
  
  afterAll(() => {
    outdir.removeCallback();
  })

  it('performs expected operations', async () => {
    const result = await runProfile(testBrowser, testUrl, 'testScenario', outdir.name);

    expect((testPage.setDefaultTimeout as jest.Mock).mock.calls.length).toEqual(1);
    expect((testPage.setDefaultTimeout as jest.Mock).mock.calls[0][0]).toEqual(0);
    expect((testPage.goto as jest.Mock).mock.calls.length).toEqual(1);
    expect((testPage.goto as jest.Mock).mock.calls[0][0]).toEqual(testUrl);
    expect((testPage.close as jest.Mock).mock.calls.length).toEqual(1);

    expect(logfile).toBeDefined();
    expect(result).toEqual(logfile.name);
  });
});
