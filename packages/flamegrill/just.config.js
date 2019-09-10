const { tscTask, series, task } = require('just-scripts');
const tickprocessorGenerator = require('./tasks/tickprocessorGenerator');

task('ts', tscTask());
task('generate', tickprocessorGenerator);

task('build', series('ts', 'generate'));
