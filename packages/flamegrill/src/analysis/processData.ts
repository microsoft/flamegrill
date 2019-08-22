import path from 'path';
const { isFrameworkName, isSystemName } = require('../../assets/helpers');

// TODO: Improvements to Flamegraphs:
//  - Add ability to filter out Framework and System calls.
//  - Always show descendants regardless of width.
//  - Always make descendants show hover info and clickable regardless of width.
//  - Recalculate percentages when changing the top level function displayed.

// These types are modeled after the data output from the perf test, currently dictated by flamegraph implementation.
export interface PerfTestOutput {
  numTicks: number;
  names: string[];
  levels: number[][];
};

export interface FunctionsMap {
  [key: string]: FunctionData;
};

export interface FunctionsLevel {
  [key: string]: FunctionInstance;
};

export interface FunctionData {
  name: string;
  displayName: string;
  index: number;
  instances: FunctionInstance[];
  filtered?: boolean;
};

export interface FunctionInstance {
  level: number;
  name: string;
  ticks: number;
  ticksNormalized: number;
}

// TODO: get rid of name if not used
export interface FunctionRegression {
  name: string;
  displayName: string;
  // level: number;
}

export interface ProcessedData {
  functions: FunctionData[];
  functionsMap: FunctionsMap;
  // functionsByLevel: FunctionsLevel[];
  numLevels: number;
  numTicks: number;
}

export interface RegressionAnalysis {
  summary: string;
  isRegression: boolean;
}

/**
 * Analyzes processed perf.
 *
 * @param {string} datafileBefore Perf data input.
 */
export function checkForRegressions(datafileBefore: string, datafileAfter: string): RegressionAnalysis {
  let summary = '';
  let isRegression = false;
  const dataBefore = processFile(datafileBefore);
  const dataAfter = processFile(datafileAfter);

  // TODO: UNIT TESTS FOR EVERYONE!
  // * function removed making other functions seem to be regressions when overall perf improves
  //    * combined with variance this may not be possible to detect. 
  //    * output regression analysis showing detection of functions removed?
  // * function present multiple times at same level but part of different call hierarchies
  // * recursive cases (improvements and regressions)
  // * system/framework regressions

  // TODO: analysis. sort by samples, level, alphabetical? multiple?
  // TODO: make analysis dynamic? (part of "summary page"). dynamic sliders for tick and diff thresholds.
  // TODO: at least have options to see unfiltered results.
  // TODO: show only diffs instead of all? also could be dynamic / selectable
  // TODO: side-by-side flamegraphs? 
  // TODO: flamegraph server that regenerates on code change?
  // TODO: need to account for similarities that only differ by level
  // TODO: ignore or filter out functions with varying indices, like fabric_icons_16_initializeIcons

  // TODO: Should calculate difference thresholds as a function of:
  //    Total samples: i.e. 26 total samples means one tick accounts for almost 4% variation
  //    Iterations: 1 tick in 5,000 iterations is meaningless

  const regressionNewBase = 0.05;  // required percentage to report new functions
  const regressionDiffBase = 0.10;  // required percentage difference after normalization

  // TODO: Can't simply accumulate total ticks without double-counting ticks up the stack, particularly for recursive functions like extractRules.
  // TODO: should be able to print out results with call hierarchy, not just level number

  const newFunctions: FunctionRegression[] = [];
  const regressions: FunctionRegression[] = [];

  // Analyze data to find new functions and regressions.
  Object.keys(dataAfter.functionsMap).forEach(name => {
    // In some scenarios (such as native button), a tick can represent more time than our base thresholds. 
    // In these cases, elevate the base threshold to the tick base * 2.
    // For example, if base threshold reports new functions at 2% time consumed, but 1 tick is 4% time, 
    // then new functions will only be reported when > 8%.
    const minTicks = Math.min(dataBefore.numTicks, dataAfter.numTicks);
    const regressionNew = Math.max(1 / minTicks * 2, regressionNewBase);
    const regressionDiff = Math.max(1 / minTicks * 2, regressionDiffBase);

    // TODO: make this part of a unit test
    // if (regressionNew !== regressionNewBase || regressionDiff !== regressionDiffBase) {
    //   console.log(`Modified base thresholds: regressionNew = ${regressionNew}, regressionDiff = ${regressionDiff}`);
    // }

    const after = dataAfter.functionsMap[name];
    const before = dataBefore.functionsMap[name];

    // TODO: This analysis should really account for the entire call hierarchy when comparing rather than just averaging.
    // For now just ignore spurious 1 tick instances by using the same number of instances for both.
    const instances = before ? Math.min(before.instances.length, after.instances.length) : after.instances.length;
    const afterTicksNormalized = calcTotalTicksNormalized(after.instances) / instances;

    if (!before) {
      if(afterTicksNormalized > regressionNew) {
        newFunctions.push({ name, displayName: after.displayName });
      }
    } else {
      const beforeTicksNormalized = calcTotalTicksNormalized(before.instances) / instances;
      const percDiff = afterTicksNormalized - beforeTicksNormalized;

      if (percDiff > regressionDiff) {
        regressions.push({ name, displayName: after.displayName });
      }
    }

  });

  summary += `Results for ${datafileBefore} => ${datafileAfter}\n\n`;
  summary += `numTicks: ${dataBefore.numTicks} => ${dataAfter.numTicks}\n\n`;

  if (regressions.length === 0 && newFunctions.length === 0) {
    console.log('OK!');
  }

  if (regressions.length > 0) {
    isRegression = true;
    summary += 'Potential Regressions: \n';
    regressions.forEach(regression => {
      const after = dataAfter.functionsMap[regression.displayName];
      const before = dataBefore.functionsMap[regression.displayName];
  
      // Averaging prevents overexaggeration of recurisve functions, but can also underexaggerate their impact.
      // Averaging can also cause spurious (1 tick samples of obj.computed, what causes these?) of functions to underexaggerate impact.
      // TODO: Remove averaging when analysis takes into account call hierarchy.
      // For now just ignore spurious 1 tick instances by using the same number of instances for both.
      const instances = before ? Math.min(before.instances.length, after.instances.length) : after.instances.length;
      const afterTicksNormalized = calcTotalTicksNormalized(after.instances) / instances;
      const beforeTicksNormalized = before && calcTotalTicksNormalized(before.instances) / instances;
  
      const beforeTicksDisplay = beforeTicksNormalized ? (beforeTicksNormalized * 100).toFixed(0) : 'not present';
      const afterTicksDisplay = afterTicksNormalized && (afterTicksNormalized * 100).toFixed(0);

      summary += ` ${regression.displayName}` +
        `, time consumed: ${beforeTicksDisplay}% => ` +
        `${afterTicksDisplay}% \n`;
    });
  }

  if (newFunctions.length > 0) {
    isRegression = true;
    summary += '\nNew Functions: \n';
    newFunctions.forEach(newFunction => {
      const ticksNormalized = calcTotalTicksNormalized(dataAfter.functionsMap[newFunction.displayName].instances);
      summary += ` ${newFunction.displayName}, time consumed = ${(ticksNormalized * 100).toFixed(0)}%\n`;
    });
  }

  return { summary, isRegression };
}

function processFile(datafile: string): ProcessedData {
  // Levels:
  // Index - level of flamegraph, from top down
  // Data - [0, 1, 0, 0, 758, 5]
  // Sets of 3:
  // 0 - start sample to show horizontally where sample = 0 to numTicks
  // 758 - number of samples
  // 5 - index into names array

  const { names, levels, numTicks } = require(datafile) as PerfTestOutput;

  // TODO: if cleaning names, write checkDuplicateNames utility to make sure duplicates don't appear in filtered name set.
  // TODO: also clean out ~
  const cleanedNames = names.map(name => {
    const matchedName = name.match(/^(.*) /) 
    return matchedName && matchedName[1] || name;
  });

  let functions: FunctionData[] = names.map((name, index) => ({ 
    name, 
    displayName: cleanedNames[index], 
    index, 
    instances: [], 
    totalTicks: 0, 
    totalTicksNormalized: 0 
  }));

  // Find functions in all of the levels and write them into the functions structure for analysis.
  levels.forEach((level, levelIndex) => {
    for (let i = 0; i < level.length; i += 3) {
      let ticks = level[i + 1];
      // TODO: account for missing functions in both directions when calculating normalized values.
      //        i.e. determine actual variance due to missing functions and use the new "total ticks" to normalize values.
      //        probably have to do this later, not here.
      let ticksNormalized = ticks / numTicks;
      let functionIndex = level[i + 2];

      // levels refers to functions in the names (and by extension, funcions) array by index, 
      // making functionIndex a valid lookup on the functions array.
      functions[functionIndex].instances.push({ ticks, ticksNormalized, level: levelIndex, name: names[functionIndex] });
    }
  });

  functions = filterMinifiedNames(functions);
  functions = filterSystemNames(functions);

  // TODO: is there a need to keep sorting?
  const sortKey = 'displayName';
  functions.sort(function (a, b) {
    if (a[sortKey] < b[sortKey]) { return -1; }
    if (a[sortKey] > b[sortKey]) { return 1; }
    return 0;
  });

  const functionsMap: FunctionsMap = {};
  // const functionsByLevel: FunctionsLevel[] = [];

  functions.forEach(entry => {
    if (!entry.filtered) {
      // Some functions like ~result will appear from multiple components at different line numbers, resulting in multiple entries in names
      // like "~result :35:27" and "~result :77:27". Merge them for now and treat them as the same function.
      // We have to use displayName as a key because line numbers can change before and after, which would appear as different functions.
      if (functionsMap[entry.displayName]) {
        functionsMap[entry.displayName].instances = functionsMap[entry.displayName].instances.concat(entry.instances);
      } else {
        functionsMap[entry.displayName] = entry;
      }

      // entry.instances.forEach(instance => {
      //   if (!functionsByLevel[instance.level]) {
      //     functionsByLevel[instance.level] = {};
      //   }
      //   // TODO: need to support multiple function instances per level
      //   if(functionsByLevel[instance.level][entry.name]) {
      //     console.error(`Function already exists in functionsByLevel: ${entry.name}`);
      //   }
      //   functionsByLevel[instance.level][entry.name] = instance;
      // })
    }
  });

  return { numLevels: levels.length, numTicks, functions, functionsMap };
}

function calcTotalTicks(levels: FunctionInstance[]): number {
  return levels.map(el => el.ticks).reduce((acc, ticks) => acc + ticks);
}

function calcTotalTicksNormalized(levels: FunctionInstance[]): number {
  return levels.map(el => el.ticksNormalized).reduce((acc, ticks) => acc + ticks);
}

function filterMinifiedNames(functions: FunctionData[]): FunctionData[] {
  functions = functions.map(entry => {
    entry.filtered = entry.filtered || isFrameworkName(entry.name);
    return entry;
  });

  return functions;
}

function filterSystemNames(functions: FunctionData[]): FunctionData[] {
  functions = functions.map(entry => {
    entry.filtered = entry.filtered || isSystemName(entry.name);
    return entry;
  });

  return functions;
}

if (require.main === module) {
  // From directory with output:
  // node ..\..\..\node_modules\flamegrill\lib\analysis\processData.js > ../analysis.txt
  // const coreScenarios = [
  //   'BaseButton',
  //   'BaseButtonNew',
  //   'button',
  //   'DefaultButton',
  //   'DefaultButtonNew',
  //   'DetailsRow',
  //   'DetailsRowNoStyles',
  //   'DocumentCardTitle',
  //   'MenuButton',
  //   'MenuButtonNew',
  //   'PrimaryButton',
  //   'PrimaryButtonNew',
  //   'SplitButton',
  //   'SplitButtonNew',
  //   'Stack',
  //   'StackWithIntrinsicChildren',
  //   'StackWithTextChildren',
  //   'Text',
  //   'Toggle',
  //   'ToggleNew'
  // ];
  const coreScenarios = ['Toggle'];
  const scenarios: string[] = [];
  
  coreScenarios.forEach((scenario, index) => {
    // Array.from({ length: 20 }, (entry, index) => {
    //   scenarios.push(scenario + index);
    // });
    scenarios.push(scenario);
  });

  scenarios.forEach(scenario => {
    const analysis = checkForRegressions(path.join(process.cwd(), `${scenario}_ref.data.js`), path.join(process.cwd(), `${scenario}.data.js`));
    console.log(JSON.stringify(analysis));
    // processPerfData(path.join(process.cwd(), `${scenario}_ref.js`), path.join(process.cwd(), `${scenario}.js`));
  });
}
