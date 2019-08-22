const { tscTask } = require('just-scripts');
const { logger, series, task } = require('just-task');
const tickprocessorGenerator = require('./tasks/tickprocessorGenerator');

task('sayhello', function() {
  logger.error('intentional logger error');
  // throw new Error('an intentionally thrown error');
});

task('ts', tscTask());
task('generate', tickprocessorGenerator);

task('build', series('ts', 'sayhello', 'generate'));
