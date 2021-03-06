import { Command, CommandOptions } from '@teambit/cli';
import { PubsubMain } from '@teambit/pubsub';
import { Logger } from '@teambit/logger';

import React from 'react';
import { render } from 'ink';

import type { UiMain } from '../ui.main.runtime';
import { CliOutput } from './cli-output';
import { report } from './report';

export class StartCmd implements Command {
  startingtimestamp;
  name = 'start [type] [pattern]';
  description = 'Start a dev environment for a workspace or a specific component';
  alias = 'c';
  group = 'component';
  shortDescription = '';
  options = [
    ['d', 'dev', 'start UI server in dev mode.'],
    ['p', 'port', 'port of the UI server.'],
    ['r', 'rebuild', 'rebuild the UI'],
    ['v', 'verbose', 'showing verbose output for inspection and prints stack trace'],
    ['', 'suppress-browser-launch', 'do not automatically open browser when ready'],
  ] as CommandOptions;

  constructor(
    /**
     * access to the extension instance.
     */
    private ui: UiMain,

    private logger: Logger,

    private pubsub: PubsubMain
  ) {}

  async report(
    [uiRootName, userPattern]: [string, string],
    {
      dev,
      port,
      rebuild,
    }: { dev: boolean; port: string; rebuild: boolean; verbose: boolean; suppressBrowserLaunch: boolean }
  ): Promise<string> {
    return report([uiRootName, userPattern], { dev, port, rebuild }, this.ui, this.logger, this.pubsub);
  }

  private asyncRender(startingTimestamp, pubsub, commandFlags, uiServer) {
    render(
      <CliOutput
        startingTimestamp={startingTimestamp}
        pubsub={pubsub}
        commandFlags={commandFlags}
        uiServer={uiServer}
      />
    );
  }

  async render(
    [uiRootName, userPattern]: [string, string],
    {
      dev,
      port,
      rebuild,
      verbose,
    }: { dev: boolean; port: string; rebuild: boolean; verbose: boolean; suppressBrowserLaunch: boolean }
  ): Promise<React.ReactElement> {
    // remove wds logs until refactoring webpack to a worker through the Worker aspect.
    const processWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (data, cb) => {
      if (data.includes('｢wds｣') && !verbose) return processWrite('', cb);
      return processWrite(data, cb);
    };

    this.startingtimestamp = Date.now();

    const pattern = userPattern && userPattern.toString();
    this.logger.off();

    this.ui
      .createRuntime({
        uiRootName,
        pattern,
        dev,
        port: port ? parseInt(port) : undefined,
        rebuild,
      })
      .then((uiServer) => {
        this.ui.clearConsole();
        const startingTimestamp = Date.now();
        const pubsub = this.pubsub;
        const commandFlags = { dev: !!dev, port, verbose: !!verbose, suppressBrowserLaunch: true };
        this.asyncRender(startingTimestamp, pubsub, commandFlags, uiServer);
      })
      .catch((e) => {
        throw e;
      });

    this.ui.clearConsole();

    return (
      <>
        <CliOutput
          startingTimestamp={Date.now()}
          pubsub={this.pubsub}
          // make sure browser doesn't open until making it work constantly and correctly.
          commandFlags={{ dev: !!dev, port, verbose: !!verbose, suppressBrowserLaunch: true }}
          uiServer={null} // Didn't start yet
        />
      </>
    );
  }
}
