import { FunctionData, __unitTestHooks } from '../regression';

const { filterMinifiedNames, filterSystemNames } = __unitTestHooks;

function constructFunctionData(names: string[], defaultFiltered?: boolean): FunctionData[] {
  return names.map(name => ({
    name,
    displayName: '',
    filtered: defaultFiltered,
    index: 0,
    instances: []
  }));
}

describe('regression', () => {
  describe('filterMinifiedNames', () => {
    const testMinifiedNames = [ 
      '~j ', 
      '~Rp ',
      '~z.J ',
      '~render ', 
      '~(anonymous)', 
      'validFunction',
      '(unknown)',
      '~webpack' 
    ];

    it('filters out minified names', () => {
      const testFunctions = constructFunctionData(testMinifiedNames);
      const filteredNames = filterMinifiedNames(testFunctions);

      expect(filteredNames).toHaveLength(8);
      expect(filteredNames.filter(item => !item.filtered)).toHaveLength(1);
      expect(filteredNames.filter(item => item.name === 'validFunction' && !item.filtered)).toHaveLength(1);
    });

    it('respects previously filtered names', () => {
      const testFunctions = constructFunctionData(testMinifiedNames, true);
      const filteredNames = filterMinifiedNames(testFunctions);

      expect(filteredNames).toHaveLength(8);
      expect(filteredNames.filter(item => !item.filtered)).toHaveLength(0);
    });
  });

  describe('filterSystemNames', () => {
    const testSystemNames = [ '(C++)', '(lib)', 'validFunction' ];

    it('filters out system names', () => {
      const testFunctions = constructFunctionData(testSystemNames);
      const filteredNames = filterSystemNames(testFunctions);

      expect(filteredNames).toHaveLength(3);
      expect(filteredNames.filter(item => !item.filtered)).toHaveLength(1);
      expect(filteredNames.filter(item => item.name === 'validFunction' && !item.filtered)).toHaveLength(1);
    });

    it('respects previously filtered names', () => {
      const testFunctions = constructFunctionData(testSystemNames, true);
      const filteredNames = filterSystemNames(testFunctions);

      expect(filteredNames).toHaveLength(3);
      expect(filteredNames.filter(item => !item.filtered)).toHaveLength(0);
    });
  });
});
