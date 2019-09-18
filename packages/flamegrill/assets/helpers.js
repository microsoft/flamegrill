const frameworkName = /~([a-zA-Z]{1,2}|[a-zA-Z]{1}\.[a-zA-Z]{1})[\. ]|~render |~\(anonymous\)|\(unknown\)|\~_{0,2}webpack/;
const systemName = /\(C\+\+\)|\(lib\)/;

function isFrameworkName(name) {
  return frameworkName.test(name);
}

function isSystemName(name) {
  return systemName.test(name);
}

/* MODULE_EXPORT */
module.exports = { isFrameworkName, isSystemName };
/* MODULE_EXPORT */
