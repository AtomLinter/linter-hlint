'use babel';

import * as path from 'path';

const concatPath = path.join(__dirname, 'fixtures', 'concat.hs');
const validPath = path.join(__dirname, 'fixtures', 'valid.hs');

describe('The hlint provider for Linter', () => {
  const lint = require('../lib/init.js').provideLinter().lint;

  beforeEach(() => {
    atom.workspace.destroyActivePaneItem();
    waitsForPromise(() =>
      Promise.all([
        atom.packages.activatePackage('linter-hlint'),
        atom.packages.activatePackage('language-haskell'),
      ]),
    );
  });

  it('bundles and works with stylelint-config-standard', () => {
    waitsForPromise(() =>
      atom.workspace.open(concatPath).then(editor => lint(editor)).then((messages) => {
        expect(messages[0].type).toBe('Warning');
        expect(messages[0].text).toBe('Use concatMap: concat (map op xs) ==> concatMap op xs');
        expect(messages[0].html).not.toBeDefined();
        expect(messages[0].filePath).toBe(concatPath);
        expect(messages[0].range).toEqual([[0, 9], [0, 28]]);

        expect(messages[1].type).toBe('Info');
        expect(messages[1].text).toBe('Use fmap');
        expect(messages[1].html).not.toBeDefined();
        expect(messages[1].filePath).toBe(concatPath);
        expect(messages[1].range).toEqual([[0, 17], [0, 20]]);
      }),
    );
  });

  it('finds nothing wrong with a valid file', () => {
    waitsForPromise(() =>
      atom.workspace.open(validPath).then(editor => lint(editor)).then((messages) => {
        expect(messages.length).toBe(0);
      }),
    );
  });
});
