import type { Tree } from '@nx/devkit';
import { joinPathFragments, readProjectConfiguration } from '@nx/devkit';
import type { Schema } from '../schema';

export function setupHostIfDynamic(tree: Tree, options: Schema) {
  if (options.federationType === 'static') {
    return;
  }

  const pathToMFManifest = joinPathFragments(
    readProjectConfiguration(tree, options.appName).sourceRoot,
    'assets/module-federation.manifest.json'
  );

  if (!tree.exists(pathToMFManifest)) {
    tree.write(pathToMFManifest, '{}');
  }
}
