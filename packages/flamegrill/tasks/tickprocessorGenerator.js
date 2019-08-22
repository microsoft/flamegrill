const fs = require('fs');
const path = require('path');

// V8's tick processor uses 32-bit rotation which breaks resolution of Fabric functions resulting in excessive "unknowns".
// More details here: https://bugs.chromium.org/p/v8/issues/detail?id=9578

// This file generates a patched V8 processor file which is used by flamegrill to eliminate the "unknowns".
// In V8's repo, these files are "merged" together in V8's tick process batch files and passed to the D8 executable.
// This file approximates the behavior by importing all of the files together and creating an entry point for Node.

// Other Fix Considerations
//  V8 fix would have to be absorbed by Node before node --prof-process can be used.
//    Node's absorption of V8 changes seems to be a couple of months behind:
//    https://github.com/nodejs/node/tree/master/deps/v8/tools vs. https://github.com/v8/v8/releases
//    Even if a fix could be used from node, can we use newer versions of node?
//  Monkey Patch Node:
//    Is there any way to pass a tick processor implementation to Node?
//  Absorb via puppeteer:
//    Is D8 available in puppeteer? Or any method for processing log?
//    If D8 is used to profile and process logs, can tick processor impl / process flags be passed to v8 via chrome?
//    Is there any way to "monkey patch" the Node implementation without duplicating code?
//    Ways to overload ">>>", patch functions, use a higher order parser, etc.
//    https://github.com/nodejs/node/blob/master/lib/internal/v8_prof_processor.js
//    https://github.com/nodejs/node/blob/master/lib/internal/main/prof_process.js
//    https://github.com/nodejs/node/blob/master/lib/internal/v8_prof_polyfill.js

// TODO: account for --windows, --unix and --mac arguments? what is the output difference with and without these args?
// TODO: pin version of puppeteer and version of V8 tick processor together. 
// TODO: compare version of V8 in puppeteer against V8 tick processor source somehow?
// TODO: does it make sense to convert repo to just monorepo config?
// TODO: Once it's working, push simple example script to just-stack-monorepo (and maybe lerna-template)
// https://github.com/kenotron/lerna-template
// https://github.com/kenotron/single-template

const scriptNames = fs.readdirSync(path.join(__dirname, '../assets/v8'));

// Entry point script must come after all other scripts.
scriptNames.push(scriptNames.splice(scriptNames.indexOf('tickprocessor-driver.js'), 1)[0]);

// The V8 tick processor script expects certain functions to be made available by d8.
// In order to easily adopt new versions of tick processor code and use it unmodified, we provide these
// functions here:
//    readline: blocking function which returns log file info line by line.
//    print: general purpose logging function.
//    printErr: error logging function.
//    quit: quit with error.
//    write: write output.
// Additionally, the patched V8 processor uses these definitions:
//    enableFix: enables tick processing fixes made to original V8 code.
//    printDebug: debug print utility.
let scriptHeader = '';
scriptHeader += 'arguments = process.argv;\n';
scriptHeader += 'enableFix = true;\n';
scriptHeader += 'print = console.log;\n';
scriptHeader += 'printDebug = () => {};\n';
scriptHeader += 'printErr = () => {};\n\n';
scriptHeader += 'treesPrinted = false;\n';
scriptHeader += 'write = print;\n';
scriptHeader += `
const lineByLine = require('n-readlines');
const liner = new lineByLine(arguments[arguments.length - 1]);

function readline() {
  const line = liner.next();
  if (line) {
    return line.toString('ascii');
  } else {
    return false;
  }
}
`;

const scripts = scriptNames.map(scriptName => {
  return fs.readFileSync(require.resolve(`../assets/v8/${scriptName}`), 'utf8');
});

module.exports = function generateTickProcessor() {
  // TODO: way to pass output argument from just task?
  fs.writeFileSync('./lib/tickprocessor.js', scriptHeader.concat(scripts.join("")));
}

