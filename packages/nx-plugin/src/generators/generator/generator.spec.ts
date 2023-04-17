import {
  GeneratorsJson,
  readJson,
  readProjectConfiguration,
  Tree,
} from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { libraryGenerator as jsLibraryGenerator } from '@nx/js';
import { pluginGenerator } from '../plugin/plugin';
import { generatorGenerator } from './generator';

describe('NxPlugin Generator Generator', () => {
  let tree: Tree;
  let projectName: string;

  beforeEach(async () => {
    projectName = 'my-plugin';
    tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
    await pluginGenerator(tree, {
      name: projectName,
    } as any);
  });

  it('should generate files', async () => {
    await generatorGenerator(tree, {
      project: projectName,
      name: 'my-generator',
      unitTestRunner: 'jest',
    });

    expect(
      tree.exists('libs/my-plugin/src/generators/my-generator/schema.d.ts')
    ).toBeTruthy();
    expect(
      tree.exists('libs/my-plugin/src/generators/my-generator/schema.json')
    ).toBeTruthy();
    expect(
      tree.exists('libs/my-plugin/src/generators/my-generator/generator.ts')
    ).toBeTruthy();
    expect(
      tree.exists(
        'libs/my-plugin/src/generators/my-generator/generator.spec.ts'
      )
    ).toBeTruthy();
  });

  it('should update generators.json', async () => {
    await generatorGenerator(tree, {
      project: projectName,
      name: 'my-generator',
      description: 'my-generator description',
      unitTestRunner: 'jest',
    });

    const generatorJson = readJson(tree, 'libs/my-plugin/generators.json');

    expect(generatorJson.generators['my-generator'].factory).toEqual(
      './src/generators/my-generator/generator'
    );
    expect(generatorJson.generators['my-generator'].schema).toEqual(
      './src/generators/my-generator/schema.json'
    );
    expect(generatorJson.generators['my-generator'].description).toEqual(
      'my-generator description'
    );
  });

  it('should update generators.json with the same path as where the generator files folder is located', async () => {
    const generatorName = 'myGenerator';
    const generatorFileName = 'my-generator';

    await generatorGenerator(tree, {
      project: projectName,
      name: generatorName,
      description: 'my-generator description',
      unitTestRunner: 'jest',
    });

    const generatorJson = readJson(tree, 'libs/my-plugin/generators.json');

    expect(
      tree.exists(
        `libs/my-plugin/src/generators/${generatorFileName}/schema.d.ts`
      )
    ).toBeTruthy();

    expect(generatorJson.generators[generatorName].factory).toEqual(
      `./src/generators/${generatorFileName}/generator`
    );
    expect(generatorJson.generators[generatorName].schema).toEqual(
      `./src/generators/${generatorFileName}/schema.json`
    );
    expect(generatorJson.generators[generatorName].description).toEqual(
      `${generatorFileName} description`
    );
  });

  it('should create generators.json if it is not present', async () => {
    await jsLibraryGenerator(tree, {
      name: 'test-js-lib',
      bundler: 'tsc',
    });
    const libConfig = readProjectConfiguration(tree, 'test-js-lib');
    await generatorGenerator(tree, {
      project: 'test-js-lib',
      name: 'test-generator',
      unitTestRunner: 'jest',
    });

    expect(() =>
      tree.exists(`${libConfig.root}/generators.json`)
    ).not.toThrow();
    expect(readJson(tree, `${libConfig.root}/package.json`).generators).toBe(
      './generators.json'
    );
  });

  it('should generate default description', async () => {
    await generatorGenerator(tree, {
      project: projectName,
      name: 'my-generator',
      unitTestRunner: 'jest',
    });

    const generatorJson = readJson(tree, 'libs/my-plugin/generators.json');

    expect(generatorJson.generators['my-generator'].description).toEqual(
      'my-generator generator'
    );
  });

  it('should generate custom description', async () => {
    await generatorGenerator(tree, {
      project: projectName,
      name: 'my-generator',
      description: 'my-generator custom description',
      unitTestRunner: 'jest',
    });

    const generatorJson = readJson(tree, 'libs/my-plugin/generators.json');

    expect(generatorJson.generators['my-generator'].description).toEqual(
      'my-generator custom description'
    );
  });

  describe('--unitTestRunner', () => {
    describe('none', () => {
      it('should not generate files', async () => {
        await generatorGenerator(tree, {
          project: projectName,
          name: 'my-generator',
          description: 'my-generator custom description',
          unitTestRunner: 'none',
        });

        expect(
          tree.exists('libs/my-plugin/src/generators/my-generator/generator.ts')
        ).toBeTruthy();
        expect(
          tree.exists(
            'libs/my-plugin/src/generators/my-generator/generator.spec.ts'
          )
        ).toBeFalsy();
      });
    });
  });

  describe('preset generator', () => {
    it('should default to standalone layout: true', async () => {
      await generatorGenerator(tree, {
        project: projectName,
        name: 'preset',
        unitTestRunner: 'none',
      });

      const generatorJson = readJson<GeneratorsJson>(
        tree,
        'libs/my-plugin/generators.json'
      );

      expect(
        generatorJson.generators['preset']['x-use-standalone-layout']
      ).toEqual(true);
    });
  });
});
