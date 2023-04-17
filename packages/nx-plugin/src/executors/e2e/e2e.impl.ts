import 'dotenv/config';

import type { ExecutorContext } from '@nx/devkit';

import {
  logger,
  parseTargetString,
  readTargetOptions,
  runExecutor,
} from '@nx/devkit';
import { JestExecutorOptions } from '@nx/jest/src/executors/jest/schema';
import { jestExecutor } from '@nx/jest/src/executors/jest/jest.impl';
import type { NxPluginE2EExecutorOptions } from './schema';

// TODO(Caleb & Craigory): can we get rid of this and just use @nx/jest directly?
export async function* nxPluginE2EExecutor(
  options: NxPluginE2EExecutorOptions,
  context: ExecutorContext
): AsyncGenerator<{ success: boolean }> {
  const { target, ...jestOptions } = options;

  let success: boolean;
  for await (const _ of runBuildTarget(target, context)) {
    try {
      success = await runTests(jestOptions, context);
    } catch (e) {
      logger.error(e.message);
      success = false;
    }
  }

  return { success };
}

async function* runBuildTarget(
  buildTarget: string,
  context: ExecutorContext
): AsyncGenerator<boolean> {
  const { project, target, configuration } = parseTargetString(buildTarget);
  const buildTargetOptions = readTargetOptions(
    { project, target, configuration },
    context
  );
  const targetSupportsWatch = Object.keys(buildTargetOptions).includes('watch');

  for await (const output of await runExecutor<{ success: boolean }>(
    { project, target, configuration },
    targetSupportsWatch ? { watch: false } : {},
    context
  )) {
    if (!output.success)
      throw new Error('Could not compile application files.');
    yield output.success;
  }
}

async function runTests(
  jestOptions: JestExecutorOptions,
  context: ExecutorContext
): Promise<boolean> {
  const { success } = await jestExecutor(
    { ...jestOptions, watch: false, runInBand: true },
    context
  );

  return success;
}

export default nxPluginE2EExecutor;
