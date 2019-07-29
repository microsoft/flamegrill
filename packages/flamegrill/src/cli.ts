
// TODO: pass scenario data.. name, test URL, optional reference URL
// TODO: use approach similar to jest.. config file with URL targets
// TODO: recheck and remove unnecessary depedencies
// TODO: filters should be custom defined with names and regex... can't assume using minified React. get rid of helpers?
// Iterations:
//    The way perf-test is set up now, iterations are baked into page under target
//    TODO: is there a way to support iterations given a URL by rendering the URL multiple times? (avoid reload overhead)
//    TODO: standardize URL interface for passing iteration count?
//    TODO: leave it up to consumer?
// TODO: documentation should include
//  * development vs. production considerations (React, app, etc.)
//  * insight vs. additional overhead
//  * webpack production builds that do not minify for additional visibility
//  * filters
//  * iterations / rollup

/*
node .\bin\flamegrill.js -n SplitButtonNew -s "http://fabricweb.z5.web.core.windows.net/pr-deploy-site/refs/heads/master/perf-test/index.html?scenario=SplitButtonNew&iterations=5000"
node .\bin\flamegrill.js -n SplitButtonNew -s "C:\git\oufr-jg\apps\perf-test\dist\index.html?scenario=SplitButtonNew&iterations=5000" -r "http://fabricweb.z5.web.core.windows.net/pr-deploy-site/refs/heads/master/perf-test/index.html?scenario=SplitButtonNew&iterations=5000" -o dist -t logfiles
node .\bin\flamegrill.js -n SplitButtonNew -s "C:\Users\Jason\src\oufr-jg\apps\perf-test\dist\index.html?scenario=SplitButtonNew&iterations=5000" -r "http://fabricweb.z5.web.core.windows.net/pr-deploy-site/refs/heads/master/perf-test/index.html?scenario=SplitButtonNew&iterations=5000" 
node .\bin\flamegrill.js --name SplitButtonNew --scenario "C:\git\oufr-jg\apps\perf-test\dist\index.html?scenario=SplitButtonNew&iterations=5000" --reference "http://fabricweb.z5.web.core.windows.net/pr-deploy-site/refs/heads/master/perf-test/index.html?scenario=SplitButtonNew&iterations=5000"  --out-dir out --temp-dir temp
node .\bin\flamegrill.js -n SplitButtonNew -s "http://fabricweb.z5.web.core.windows.net/pr-deploy-site/refs/heads/master/perf-test/index.html?scenario=SplitButtonNew&iterations=5000" -o out -t temp
*/

import { CliOptions } from './CliOptions';
import flamegrill from './flamegrill';
import parser from 'yargs-parser';

let argv = process.argv.splice(2);
let args = parser(argv, {
  alias: {
    help: ['h', '?'],
    name: ['n'],
    outDir: ['o'],
    scenario: ['s'],
    reference: ['r'],
    tempDir: ['t']
  }
});

if (args.help) {
  showHelp();
  process.exit(0);
}

const defaultCommand = 'cook';
const options: CliOptions = {
  command: args._.length === 0 ? defaultCommand : args._[0],
  name: args.name,
  outDir: args.outDir,
  reference: args.reference || undefined,
  scenario: args.scenario,
  tempDir: args.tempDir
};

(async () => {
  console.log(`options: ${JSON.stringify(options)}`);

  // Validation Steps
  if (!options.scenario) {
    console.error('ERROR: The "scenario" argument is required.');
    process.exit(1);
  }    

  if (!options.name) {
    console.error('ERROR: The "name" argument is required.');
    process.exit(1);

  }    

  switch (options.command) {
    case 'cook':
    default:
      const { 
        name, 
        outDir,
        reference,
        scenario,
        tempDir
      } = options;
      flamegrill( [{ name, scenario, reference }], { outDir, tempDir } );
      break;
  }
})();

function showHelp() {
  const packageJson = require('../package.json');
  console.log(`flamegrill v${packageJson.version} - flame grill your web pages for easy digestion

Prerequisites:

  git and a remote named "origin"

Usage:

  flamegrill [command] [options]

Commands:

  cook (default)      - run flamegrill against specified input

Options:

  --name, -n          - name for scenario
  --scenario, -s      - URL for scenario to cook
  --reference, -r     - optional reference scenario to compare against
  --temp-dir, -t      - temporary directory for storing intermediate files (default: cwd)
  --out-dir, -o       - output directory for flamegraphs (default: cwd)

Examples:

$ flamegrill cook -n LocalHostTest -s http://localhost:4322
$ flamegrill cook -n LocalHostTest -s http://localhost:4322 -r http://some.url.com
$ flamegrill cook -n SplitButtonNew -s "http://fabricweb.z5.web.core.windows.net/pr-deploy-site/refs/heads/master/perf-test/index.html?scenario=SplitButtonNew&iterations=5000" -o out -t temp
`);
}
