import {
  addDependenciesToPackageJson,
  convertNxGenerator,
  formatFiles,
  generateFiles,
  GeneratorCallback,
  normalizePath,
  readProjectConfiguration,
  runTasksInSerial,
  Tree,
  updateProjectConfiguration,
} from '@nx/devkit';
import { libraryGenerator as jsLibraryGenerator } from '@nx/js';
import { addSwcDependencies } from '@nx/js/src/utils/swc/add-swc-dependencies';
import { Linter } from '@nx/linter';
import { swcNodeVersion } from 'nx/src/utils/versions';
import * as path from 'path';

import { nxVersion, tsLibVersion } from '../../utils/versions';
import { e2eProjectGenerator } from '../e2e-project/e2e';
import { executorGenerator } from '../executor/executor';
import { generatorGenerator } from '../generator/generator';
import pluginLintCheckGenerator from '../lint-checks/generator';
import { NormalizedSchema, normalizeOptions } from './utils/normalize-schema';

import type { Schema } from './schema';

async function addFiles(host: Tree, options: NormalizedSchema) {
  host.delete(normalizePath(`${options.projectRoot}/src/lib`));

  generateFiles(
    host,
    path.join(__dirname, './files/plugin'),
    options.projectRoot,
    {
      ...options,
      tmpl: '',
    }
  );

  if (options.minimal) {
    return;
  }
  await generatorGenerator(host, {
    project: options.name,
    name: options.name,
    unitTestRunner: options.unitTestRunner,
  });
  await executorGenerator(host, {
    project: options.name,
    name: 'build',
    unitTestRunner: options.unitTestRunner,
    includeHasher: false,
  });
}

function updatePluginConfig(host: Tree, options: NormalizedSchema) {
  const project = readProjectConfiguration(host, options.name);

  if (project.targets.build) {
    project.targets.build.options.assets ??= [];

    project.targets.build.options.assets = [
      ...project.targets.build.options.assets,
      {
        input: `./${options.projectRoot}/src`,
        glob: '**/!(*.ts)',
        output: './src',
      },
      {
        input: `./${options.projectRoot}/src`,
        glob: '**/*.d.ts',
        output: './src',
      },
      {
        input: `./${options.projectRoot}`,
        glob: 'generators.json',
        output: '.',
      },
      {
        input: `./${options.projectRoot}`,
        glob: 'executors.json',
        output: '.',
      },
    ];

    updateProjectConfiguration(host, options.name, project);
  }
}

export async function pluginGenerator(host: Tree, schema: Schema) {
  const options = normalizeOptions(host, schema);
  const tasks: GeneratorCallback[] = [];

  tasks.push(
    await jsLibraryGenerator(host, {
      ...schema,
      config: 'project',
      bundler: options.bundler,
      publishable: true,
      importPath: options.npmPackageName,
      skipFormat: true,
    })
  );

  tasks.push(
    addDependenciesToPackageJson(
      host,
      {
        '@nx/devkit': nxVersion,
        tslib: tsLibVersion,
      },
      {
        '@nx/jest': nxVersion,
        '@nx/js': nxVersion,
        '@nx/nx-plugin': nxVersion,
        '@swc-node/register': swcNodeVersion,
      }
    )
  );

  // Ensures Swc Deps are installed to handle running
  // local plugin generators and executors
  tasks.push(addSwcDependencies(host));

  await addFiles(host, options);
  updatePluginConfig(host, options);

  if (options.e2eTestRunner !== 'none') {
    tasks.push(
      await e2eProjectGenerator(host, {
        pluginName: options.name,
        projectDirectory: options.projectDirectory,
        pluginOutputPath: `dist/${options.libsDir}/${options.projectDirectory}`,
        npmPackageName: options.npmPackageName,
        minimal: options.minimal ?? false,
        skipFormat: true,
        rootProject: options.rootProject,
      })
    );
  }

  if (options.linter === Linter.EsLint && !options.skipLintChecks) {
    await pluginLintCheckGenerator(host, { projectName: options.name });
  }

  if (!options.skipFormat) {
    await formatFiles(host);
  }

  return runTasksInSerial(...tasks);
}

export default pluginGenerator;
export const pluginSchematic = convertNxGenerator(pluginGenerator);
