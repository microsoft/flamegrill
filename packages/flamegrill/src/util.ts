
/**
 * Array diff utility that returns a list of elements that are not present in both arrays.
 *
 * @param {Array} a1 First array
 * @param {Array} a2 Second array
 */
export function arr_diff(a1: string[], a2: string[]): string[] {
  let a = {} as any;
  let diff: string[] = [];

  for (var i = 0; i < a1.length; i++) {
    a[a1[i]] = true;
  }

  for (var i = 0; i < a2.length; i++) {
    if (a[a2[i]]) {
      delete a[a2[i]];
    } else {
      a[a2[i]] = true;
    }
  }

  for (var k in a) {
    diff.push(k);
  }

  return diff;
}