'use babel';

// eslint-disable-next-line no-unused-vars
import { it, fit, wait, beforeEach, afterEach } from 'jasmine-fix';
import * as path from 'path';

const { lint } = require('../lib/init.js').provideLinter();

const concatPath = path.join(__dirname, 'fixtures', 'concat.hs');
const validPath = path.join(__dirname, 'fixtures', 'valid.hs');
const configPath = path.join(__dirname, 'fixtures', 'config', 'concat.hs');

describe('The hlint provider for Linter', () => {
  beforeEach(async () => {
    atom.workspace.destroyActivePaneItem();
    await atom.packages.activatePackage('linter-hlint');
    await atom.packages.activatePackage('language-haskell');
  });

  it('works with default lints', async () => {
    const editor = await atom.workspace.open(concatPath);
    const messages = await lint(editor);

    expect(messages[0].severity).toBe('warning');
    expect(messages[0].excerpt).toBe('Use concatMap: concat (map op xs) ==> concatMap op xs');
    expect(messages[0].location.file).toBe(concatPath);
    expect(messages[0].location.position).toEqual([[0, 9], [0, 27]]);
  });

  it('finds nothing wrong with a valid file', async () => {
    const editor = await atom.workspace.open(validPath);
    const messages = await lint(editor);

    expect(messages.length).toBe(0);
  });

  it('works with configuration files', async () => {
    const editor = await atom.workspace.open(configPath);
    const messages = await lint(editor);

    // The config should enable an fmap suggestion
    expect(messages.length).toBe(2);

    expect(messages[0].severity).toBe('warning');
    expect(messages[0].excerpt).toBe('Use concatMap: concat (map op xs) ==> concatMap op xs');
    expect(messages[0].location.file).toBe(configPath);
    expect(messages[0].location.position).toEqual([[0, 9], [0, 27]]);

    expect(messages[1].severity).toBe('warning');
    expect(messages[1].excerpt).toBe('Use fmap: map ==> fmap');
    expect(messages[1].location.file).toBe(configPath);
    expect(messages[1].location.position).toEqual([[0, 17], [0, 20]]);
  });
});
