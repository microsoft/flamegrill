
// TODO: use approach similar to jest.. config file with URL targets
// TODO: recheck and remove unnecessary dependencies
// TODO: filters should be custom defined with names and regex... can't assume using minified React. get rid of helpers?
// Iterations:
//    The way perf-test is set up now, iterations are baked into page under target
//    TODO: is there a way to support iterations given a URL by rendering the URL multiple times? (avoid reload overhead)
//    TODO: standardize URL interface for passing iteration count?
//    TODO: leave it up to consumer?
// TODO: documentation should include
//  * approaches for making flamegrill output readable via URL config
//    * Analyzing React perf and impact of component / app code on React perf (or other generic framework as defined by user)
//    * Layout and Recalculate Style (browser perf hits that don't seem to be part of JS domain)
//    * development vs. production considerations (React, app, etc.)
//    * insight vs. additional overhead
//    * webpack production builds that do not minify for additional visibility
//    * build configs vs. source maps?
//      * can users use full production builds but still get meaningful results using sourcemaps?
//        https://developer.mozilla.org/en-US/docs/Tools/Debugger/How_to/Use_a_source_map
//        https://stackoverflow.com/questions/30870830/how-do-i-generate-sourcemaps-when-using-babel-and-webpack
//  * filters
//  * iterations / rollup
// TODO: alternatives / improvements to flamegraphs:
//  * https://github.com/jlfwong/speedscope
// TODO: possible bugs to fix:
//  * https://github.com/mapbox/flamebearer/issues
//  * https://github.com/mapbox/flamebearer/issues/8
// TODO: add support for both displayName and identifier?

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
    baseline: ['b'],
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
  baseline: args.baseline || undefined,
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
        baseline,
        scenario,
        tempDir
      } = options;
      flamegrill.cook( { [name]: { scenario, baseline } }, { outDir, tempDir } );
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
  --baseline, -b      - optional baseline scenario to compare against
  --temp-dir, -t      - temporary directory for storing intermediate files (default: cwd)
  --out-dir, -o       - output directory for flamegraphs (default: cwd)

Examples:

$ flamegrill cook -n SplitButton -s "http://fabricweb.z5.web.core.windows.net/pr-deploy-site/refs/heads/master/perf-test/index.html?scenario=SplitButtonNew&iterations=5000"
$ flamegrill cook -n SplitButton -s "http://fabricweb.z5.web.core.windows.net/pr-deploy-site/refs/heads/master/perf-test/index.html?scenario=SplitButtonNew&iterations=5000" -r "http://fabricweb.z5.web.core.windows.net/pr-deploy-site/refs/heads/master/perf-test/index.html?scenario=SplitButton&iterations=5000"
$ flamegrill cook -n SplitButtonNew -s "http://fabricweb.z5.web.core.windows.net/pr-deploy-site/refs/heads/master/perf-test/index.html?scenario=SplitButtonNew&iterations=5000" -o out -t temp
`);
}
