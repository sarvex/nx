import { GeneratorsJson, joinPathFragments, Tree, writeJson } from '@nx/devkit';
import {
  convertNxGenerator,
  generateFiles,
  getWorkspaceLayout,
  names,
  readJson,
  readProjectConfiguration,
  updateJson,
  formatFiles,
} from '@nx/devkit';
import { PackageJson } from 'nx/src/utils/package-json';
import * as path from 'path';
import type { Schema } from './schema';

interface NormalizedSchema extends Schema {
  fileName: string;
  className: string;
  projectRoot: string;
  projectSourceRoot: string;
  npmScope: string;
  npmPackageName: string;
}

function normalizeOptions(host: Tree, options: Schema): NormalizedSchema {
  const { npmScope } = getWorkspaceLayout(host);
  const { fileName, className } = names(options.name);

  const { root: projectRoot, sourceRoot: projectSourceRoot } =
    readProjectConfiguration(host, options.project);

  const npmPackageName = readJson<{ name: string }>(
    host,
    path.join(projectRoot, 'package.json')
  ).name;

  let description: string;
  if (options.description) {
    description = options.description;
  } else {
    description = `${options.name} generator`;
  }

  return {
    ...options,
    fileName,
    className,
    description,
    projectRoot,
    projectSourceRoot,
    npmScope,
    npmPackageName,
  };
}

function addFiles(host: Tree, options: NormalizedSchema) {
  const indexPath = `${options.projectSourceRoot}/generators/${options.fileName}/files/src/index.ts__template__`;

  if (!host.exists(indexPath)) {
    host.write(indexPath, 'const variable = "<%= projectName %>";');
  }

  generateFiles(
    host,
    path.join(__dirname, './files/generator'),
    `${options.projectSourceRoot}/generators`,
    {
      ...options,
      tmpl: '',
    }
  );

  if (options.unitTestRunner === 'none') {
    host.delete(
      path.join(
        options.projectSourceRoot,
        'generators',
        options.fileName,
        `generator.spec.ts`
      )
    );
  }
}

function createGeneratorsJson(host: Tree, options: NormalizedSchema) {
  updateJson<PackageJson>(
    host,
    joinPathFragments(options.projectRoot, 'package.json'),
    (json) => {
      json.generators ??= './generators.json';
      return json;
    }
  );
  writeJson<GeneratorsJson>(
    host,
    joinPathFragments(options.projectRoot, 'generators.json'),
    {
      generators: {},
    }
  );
}

function updateGeneratorJson(host: Tree, options: NormalizedSchema) {
  const packageJson = readJson<PackageJson>(
    host,
    joinPathFragments(options.projectRoot, 'package.json')
  );
  const packageJsonGenerators =
    packageJson.generators ?? packageJson.schematics;
  let generatorsPath = packageJsonGenerators
    ? joinPathFragments(options.projectRoot, packageJsonGenerators)
    : null;

  if (!generatorsPath) {
    generatorsPath = joinPathFragments(options.projectRoot, 'generators.json');
  }
  if (!host.exists(generatorsPath)) {
    createGeneratorsJson(host, options);
  }

  return updateJson<GeneratorsJson>(host, generatorsPath, (json) => {
    let generators = json.generators ?? json.schematics;
    generators = generators || {};
    generators[options.name] = {
      factory: `./src/generators/${options.fileName}/generator`,
      schema: `./src/generators/${options.fileName}/schema.json`,
      description: options.description,
    };
    // @todo(v17): Remove this, prop is defunct.
    if (options.name === 'preset') {
      generators[options.name]['x-use-standalone-layout'] = true;
    }
    json.generators = generators;

    return json;
  });
}

export async function generatorGenerator(host: Tree, schema: Schema) {
  const options = normalizeOptions(host, schema);

  addFiles(host, options);

  if (!schema.skipFormat) {
    await formatFiles(host);
  }

  updateGeneratorJson(host, options);
}

export default generatorGenerator;
export const generatorSchematic = convertNxGenerator(generatorGenerator);
