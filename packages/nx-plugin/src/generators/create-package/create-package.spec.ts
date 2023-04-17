import {
  joinPathFragments,
  readJson,
  readProjectConfiguration,
  Tree,
} from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Linter } from '@nx/linter';
import { PackageJson } from 'nx/src/utils/package-json';
import pluginGenerator from '../plugin/plugin';
import { createPackageGenerator } from './create-package';
import { CreatePackageSchema } from './schema';

const getSchema: (
  overrides?: Partial<CreatePackageSchema>
) => CreatePackageSchema = (overrides = {}) => ({
  name: 'create-package',
  project: 'my-plugin',
  compiler: 'tsc',
  skipTsConfig: false,
  skipFormat: false,
  skipLintChecks: false,
  linter: Linter.EsLint,
  unitTestRunner: 'jest',
  minimal: true,
  ...overrides,
});

describe('NxPlugin Create Package Generator', () => {
  let tree: Tree;

  beforeEach(async () => {
    tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
    await pluginGenerator(tree, {
      name: 'my-plugin',
      compiler: 'tsc',
      skipTsConfig: false,
      skipFormat: false,
      skipLintChecks: false,
      linter: Linter.EsLint,
      unitTestRunner: 'jest',
    });
  });

  it('should update the project.json file', async () => {
    await createPackageGenerator(tree, getSchema());
    const project = readProjectConfiguration(tree, 'create-package');
    expect(project.root).toEqual('libs/create-package');
    expect(project.sourceRoot).toEqual('libs/create-package/bin');
    expect(project.targets.build).toEqual({
      executor: '@nrwl/js:tsc',
      outputs: ['{options.outputPath}'],
      options: {
        outputPath: 'dist/libs/create-package',
        tsConfig: 'libs/create-package/tsconfig.lib.json',
        main: 'libs/create-package/bin/index.ts',
        assets: [],
        updateBuildableProjectDepsInPackageJson: false,
      },
    });
  });

  it('should place the create-package plugin in a directory', async () => {
    await createPackageGenerator(
      tree,
      getSchema({
        directory: 'plugins',
      } as Partial<CreatePackageSchema>)
    );
    const project = readProjectConfiguration(tree, 'plugins-create-package');
    expect(project.root).toEqual('libs/plugins/create-package');
  });

  it('should specify tsc as compiler', async () => {
    await createPackageGenerator(
      tree,
      getSchema({
        compiler: 'tsc',
      })
    );

    const { build } = readProjectConfiguration(tree, 'create-package').targets;

    expect(build.executor).toEqual('@nrwl/js:tsc');
  });

  it('should specify swc as compiler', async () => {
    await createPackageGenerator(
      tree,
      getSchema({
        compiler: 'swc',
      })
    );

    const { build } = readProjectConfiguration(tree, 'create-package').targets;

    expect(build.executor).toEqual('@nrwl/js:swc');
  });

  it("should use name as default for the package.json's name", async () => {
    await createPackageGenerator(tree, getSchema());

    const { root } = readProjectConfiguration(tree, 'create-package');
    const { name } = readJson<PackageJson>(
      tree,
      joinPathFragments(root, 'package.json')
    );

    expect(name).toEqual('create-package');
  });
});
