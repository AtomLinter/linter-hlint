'use babel';

import * as path from 'path';

const concatPath = path.join(__dirname, 'fixtures', 'concat.hs');
const validPath = path.join(__dirname, 'fixtures', 'valid.hs');
const configPath = path.join(__dirname, 'fixtures', 'config', 'concat.hs');

describe('The hlint provider for Linter', () => {
  const { lint } = require('../lib/init.js').provideLinter();

  beforeEach(() => {
    atom.workspace.destroyActivePaneItem();
    waitsForPromise(() =>
      Promise.all([
        atom.packages.activatePackage('linter-hlint'),
        atom.packages.activatePackage('language-haskell'),
      ]));
  });

  it('works with default lints', () => {
    waitsForPromise(() =>
      atom.workspace.open(concatPath).then(editor => lint(editor)).then((messages) => {
        expect(messages[0].type).toBe('Warning');
        expect(messages[0].severity).toBe('warning');
        expect(messages[0].text).toBe('Use concatMap: concat (map op xs) ==> concatMap op xs');
        expect(messages[0].html).not.toBeDefined();
        expect(messages[0].filePath).toBe(concatPath);
        expect(messages[0].range).toEqual([[0, 9], [0, 27]]);
      }));
  });

  it('finds nothing wrong with a valid file', () => {
    waitsForPromise(() =>
      atom.workspace.open(validPath).then(editor => lint(editor)).then((messages) => {
        expect(messages.length).toBe(0);
      }));
  });

  it('works with configuration files', () => {
    waitsForPromise(() =>
      atom.workspace.open(configPath).then(editor => lint(editor)).then((messages) => {
        // The config should enable an fmap suggestion
        expect(messages.length).toBe(2);

        expect(messages[0].type).toBe('Warning');
        expect(messages[0].severity).toBe('warning');
        expect(messages[0].text).toBe('Use concatMap: concat (map op xs) ==> concatMap op xs');
        expect(messages[0].html).not.toBeDefined();
        expect(messages[0].filePath).toBe(configPath);
        expect(messages[0].range).toEqual([[0, 9], [0, 27]]);

        expect(messages[1].type).toBe('Warning');
        expect(messages[1].severity).toBe('warning');
        expect(messages[1].text).toBe('Use fmap: map ==> fmap');
        expect(messages[1].html).not.toBeDefined();
        expect(messages[1].filePath).toBe(configPath);
        expect(messages[1].range).toEqual([[0, 17], [0, 20]]);
      }));
  });
});
