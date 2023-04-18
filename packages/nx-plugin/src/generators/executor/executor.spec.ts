import { Tree, readJson, readProjectConfiguration } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { executorGenerator } from './executor';
import { pluginGenerator } from '../plugin/plugin';
import { libraryGenerator as jsLibraryGenerator } from '@nx/js';

describe('NxPlugin Executor Generator', () => {
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
    await executorGenerator(tree, {
      project: projectName,
      name: 'my-executor',
      unitTestRunner: 'jest',
      includeHasher: false,
      skipFormat: true,
    });

    expect(
      tree.exists('libs/my-plugin/src/executors/my-executor/schema.d.ts')
    ).toBeTruthy();
    expect(
      tree.exists('libs/my-plugin/src/executors/my-executor/schema.json')
    ).toBeTruthy();
    expect(
      tree.exists('libs/my-plugin/src/executors/my-executor/executor.ts')
    ).toBeTruthy();
    expect(
      tree.exists('libs/my-plugin/src/executors/my-executor/executor.spec.ts')
    ).toBeTruthy();
  });

  it('should update executors.json', async () => {
    await executorGenerator(tree, {
      project: projectName,
      name: 'my-executor',
      description: 'my-executor description',
      unitTestRunner: 'jest',
      includeHasher: false,
      skipFormat: true,
    });

    const executorJson = readJson(tree, 'libs/my-plugin/executors.json');

    expect(executorJson.executors['my-executor'].implementation).toEqual(
      './src/executors/my-executor/executor'
    );
    expect(executorJson.executors['my-executor'].schema).toEqual(
      './src/executors/my-executor/schema.json'
    );
    expect(executorJson.executors['my-executor'].description).toEqual(
      'my-executor description'
    );
  });

  it('should generate default description', async () => {
    await executorGenerator(tree, {
      project: projectName,
      name: 'my-executor',
      unitTestRunner: 'jest',
      includeHasher: false,
      skipFormat: true,
    });

    const executorsJson = readJson(tree, 'libs/my-plugin/executors.json');

    expect(executorsJson.executors['my-executor'].description).toEqual(
      'my-executor executor'
    );
  });

  it('should generate custom description', async () => {
    await executorGenerator(tree, {
      project: projectName,
      name: 'my-executor',
      description: 'my-executor custom description',
      unitTestRunner: 'jest',
      includeHasher: false,
      skipFormat: true,
    });

    const executorsJson = readJson(tree, 'libs/my-plugin/executors.json');

    expect(executorsJson.executors['my-executor'].description).toEqual(
      'my-executor custom description'
    );
  });

  it('should create executors.json if it is not present', async () => {
    await jsLibraryGenerator(tree, {
      name: 'test-js-lib',
      bundler: 'tsc',
    });
    const libConfig = readProjectConfiguration(tree, 'test-js-lib');
    await executorGenerator(tree, {
      project: 'test-js-lib',
      includeHasher: false,
      name: 'test-executor',
      unitTestRunner: 'jest',
      skipFormat: true,
    });

    expect(() => tree.exists(`${libConfig.root}/executors.json`)).not.toThrow();
    expect(readJson(tree, `${libConfig.root}/package.json`).executors).toBe(
      './executors.json'
    );
  });

  describe('--unitTestRunner', () => {
    describe('none', () => {
      it('should not generate unit test files', async () => {
        await executorGenerator(tree, {
          project: projectName,
          name: 'my-executor',
          description: 'my-executor description',
          unitTestRunner: 'none',
          includeHasher: true,
          skipFormat: true,
        });

        expect(
          tree.exists(
            'libs/my-plugin/src/executors/my-executor/executor.spec.ts'
          )
        ).toBeFalsy();
        expect(
          tree.exists('libs/my-plugin/src/executors/my-executor/hasher.spec.ts')
        ).toBeFalsy();
      });
    });
  });

  describe('--includeHasher', () => {
    it('should generate hasher files', async () => {
      await executorGenerator(tree, {
        project: projectName,
        name: 'my-executor',
        includeHasher: true,
        unitTestRunner: 'jest',
        skipFormat: true,
      });
      expect(
        tree.exists('libs/my-plugin/src/executors/my-executor/hasher.spec.ts')
      ).toBeTruthy();
      expect(
        tree
          .read('libs/my-plugin/src/executors/my-executor/hasher.ts')
          .toString()
      ).toMatchInlineSnapshot(`
        "import { CustomHasher } from '@nx/devkit';

        /**
         * This is a boilerplate custom hasher that matches
         * the default Nx hasher. If you need to extend the behavior,
         * you can consume workspace details from the context.
         */
        export const myExecutorHasher: CustomHasher = async (task, context) => {
            return context.hasher.hashTask(task)
        };

        export default myExecutorHasher;
        "
      `);
    });

    it('should update executors.json', async () => {
      await executorGenerator(tree, {
        project: projectName,
        name: 'my-executor',
        includeHasher: true,
        unitTestRunner: 'jest',
        skipFormat: true,
      });

      const executorsJson = readJson(tree, 'libs/my-plugin/executors.json');
      expect(executorsJson.executors['my-executor'].hasher).toEqual(
        './src/executors/my-executor/hasher'
      );
    });
  });
});
