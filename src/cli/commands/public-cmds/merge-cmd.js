/** @flow */
import chalk from 'chalk';
import Command from '../../command';
import { merge } from '../../../api/consumer';
import type { ApplyVersionResults, ApplyVersionResult } from '../../../consumer/versions-ops/merge-version';
import { getMergeStrategy, FileStatus } from '../../../consumer/versions-ops/merge-version';
import { BitId } from '../../../bit-id';

export const applyVersionReport = (components: ApplyVersionResult[], addName: boolean = true): string => {
  const tab = addName ? '\t' : '';
  return components
    .map((component: ApplyVersionResult) => {
      const name = addName ? component.id.toStringWithoutVersion() : '';
      const files = Object.keys(component.filesStatus)
        .map((file) => {
          const note =
            component.filesStatus[file] === FileStatus.manual
              ? chalk.white('automatic merge failed. please fix conflicts manually and then tag the results.')
              : '';
          return `${tab}${component.filesStatus[file]} ${chalk.bold(file)} ${note}`;
        })
        .join('\n');
      return `${name}\n${chalk.cyan(files)}`;
    })
    .join('\n\n');
};

export default class Merge extends Command {
  name = 'merge <version> <ids...>';
  description = 'merge specified version into current version';
  alias = '';
  opts = [
    ['o', 'ours', 'in case of a conflict, use ours (current version)'],
    ['t', 'theirs', 'in case of a conflict, use theirs (specified version)'],
    ['m', 'manual', 'in case of a conflict, leave the files with a conflict state to resolve them manually later']
  ];
  loader = true;

  action(
    [version, ids]: [string, string[]],
    {
      ours = false,
      theirs = false,
      manual = false
    }: {
      ours?: boolean,
      theirs?: boolean,
      manual?: boolean
    }
  ): Promise<ApplyVersionResults> {
    const bitIds = ids.map(id => BitId.parse(id));
    const mergeStrategy = getMergeStrategy(ours, theirs, manual);
    return merge(version, bitIds, mergeStrategy);
  }

  report({ components, version }: ApplyVersionResults): string {
    const title = `successfully merged components from version ${chalk.bold(version)}\n`;
    const componentsStr = applyVersionReport(components);
    return chalk.underline(title) + chalk.green(componentsStr);
  }
}
