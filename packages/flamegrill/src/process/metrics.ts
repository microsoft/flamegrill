import { Metrics } from 'puppeteer';

export function addMetrics(flamegraph: string, metrics: Metrics): string {
  const metricsTableHeader = `
    <details>
      <summary>Metrics</summary>
      <table>
        <tr>
          <th>
            <a href="https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagemetrics">Metric</a>
          </th>
          <th>Value</th>
        </tr>
    `;
  const metricsTableFooter = `
      </table>
    </details>  
  `;
  

  const metricsTableContents = Object
    .keys(metrics)
    .map(key => {
      return `
          <tr>
            <td>${key}</td>
            <td>${getFormattedValue(metrics[key as keyof Metrics], key as keyof Metrics)}</td>
          </tr>
      `;
    })
    .join('');

  const metricsTable = metricsTableHeader + metricsTableContents + metricsTableFooter;

  // Use placeholder in string to add metrics.
  flamegraph = flamegraph
    .split('<!-- /* METRICS_PLACEHOLDER */ -->')
    .join(metricsTable);

  return flamegraph;
};

function getFormattedValue(value: number, key: keyof Metrics): string {
  switch(key) {
    case 'JSHeapUsedSize':
    case 'JSHeapTotalSize':
      return value.toLocaleString('en') + ' bytes';
    case 'LayoutDuration':
    case 'RecalcStyleDuration':
    case 'ScriptDuration':
    case 'TaskDuration':
      return value.toLocaleString('en', { maximumSignificantDigits: 3 }) + ' s';
    default:
      return value.toString();
  }
}