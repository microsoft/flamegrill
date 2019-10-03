import fs from 'fs';
const flamebearerModule = require('flamebearer');

function flamebearer(buf: Buffer): string[] {
  console.time('Parsed JSON in');
  let json = {} as { code: {}, ticks: {} };
  try {
    json = JSON.parse(buf.toString('utf8'));
  } catch (e) {
    // noop
  }
  if (!json.code || !json.ticks) {
    console.log('Invalid input; expected a V8 log in JSON format. Produce one with:');
    console.log('node --prof-process --preprocess -j isolate*.log');
    return [];
  }
  console.timeEnd('Parsed JSON in');

  console.time('Processed V8 log in');

  // TODO: can level be shuffled so that it appears in the same order before and after?
  const { names, stacks } = flamebearerModule.v8logToStacks(json);
  const levels = flamebearerModule.mergeStacks(stacks);
  console.timeEnd('Processed V8 log in');

  const vizSrc = fs.readFileSync(require.resolve('../../assets/viz.js'), 'utf8');
  const helperSrc = fs.readFileSync(require.resolve('../../assets/helpers.js'), 'utf8');

  let data = `names = ${JSON.stringify(names)};\n`;
  data += `levels = ${JSON.stringify(levels)};\n`;
  data += `numTicks = ${stacks.length};\n`;

  // This code constructs a flamegraph using HTML template and shared JS helper files.
  // It uses split points in those files to keep and remove source, as needed.
  const flamegraph = fs
    .readFileSync(require.resolve('../../assets/index.html'), 'utf8')
    .toString()
    .split('<script src="viz.js"></script>')
    .join(`<script>${helperSrc}${vizSrc}</script>`)
    .split('/* BIN_SPLIT */')
    .filter((str, i) => i % 2 === 0)
    .join('')
    // Remove exports that cause errors in generated index.html file.
    .split('/* MODULE_EXPORT */')
    .filter((str, i) => i % 2 === 0)
    .join('')
    .split('/* BIN_PLACEHOLDER */')
    .join(data);

  data += 'module.exports = { names, levels, numTicks };';
  return [flamegraph, data];
};

export default flamebearer;