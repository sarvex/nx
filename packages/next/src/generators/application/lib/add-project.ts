import { NormalizedSchema } from './normalize-options';
import {
  addProjectConfiguration,
  joinPathFragments,
  ProjectConfiguration,
  Tree,
} from '@nx/devkit';

export function addProject(host: Tree, options: NormalizedSchema) {
  const targets: Record<string, any> = {};

  targets.build = {
    executor: '@nrwl/next:build',
    outputs: ['{options.outputPath}'],
    defaultConfiguration: 'production',
    options: {
      root: options.appProjectRoot,
      outputPath: joinPathFragments('dist', options.appProjectRoot),
    },
    configurations: {
      development: {
        outputPath: options.appProjectRoot,
      },
      production: {},
    },
  };

  targets.serve = {
    executor: '@nrwl/next:server',
    defaultConfiguration: 'development',
    options: {
      buildTarget: `${options.projectName}:build`,
      dev: true,
    },
    configurations: {
      development: {
        buildTarget: `${options.projectName}:build:development`,
        dev: true,
      },
      production: {
        buildTarget: `${options.projectName}:build:production`,
        dev: false,
      },
    },
  };

  targets.export = {
    executor: '@nrwl/next:export',
    options: {
      buildTarget: `${options.projectName}:build:production`,
    },
  };

  const project: ProjectConfiguration = {
    root: options.appProjectRoot,
    sourceRoot: options.appProjectRoot,
    projectType: 'application',
    targets,
    tags: options.parsedTags,
  };

  addProjectConfiguration(host, options.projectName, {
    ...project,
  });
}
