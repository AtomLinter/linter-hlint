'use babel';

// eslint-disable-next-line
import { CompositeDisposable } from 'atom';
import { exec } from 'atom-linter';

export default {
  activate() {
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(
      atom.config.observe('linter-hlint.hlintExecutablePath', (value) => {
        this.executablePath = value;
      }),
    );
    this.subscriptions.add(
      atom.config.observe('linter-hlint.hlintHints', (value) => {
        this.hlintHints = value;
      }),
    );
    this.subscriptions.add(
      atom.config.observe('linter-hlint.ignoreReduceDuplication', (value) => {
        this.ignoreReduceDuplication = value;
      }),
    );
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  provideLinter() {
    return {
      grammarScopes: ['source.haskell', 'text.tex.latex.haskell'],
      scope: 'file',
      lintOnFly: false,
      lint: async (textEditor) => {
        const filePath = textEditor.getPath();
        const baseArgs = [filePath, '--json'];
        const hints = this.hlintHints.map(hint => (`--hint=${hint}`));
        const execArgs = baseArgs.concat(hints);
        if (this.ignoreReduceDuplication) {
          execArgs.push('--ignore="Reduce duplication"');
        }
        const execOpts = {
          ignoreExitCode: true,
        };
        const output = await exec(this.executablePath, execArgs, execOpts);
        let info;
        try {
          info = JSON.parse(output);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Unable to parse output:', output);
          return null;
        }
        return info.map((error) => {
          const message = {
            text: `${error.hint}: ${error.from} ==> ${error.to}`,
            filePath,
            range: [
              [error.startLine - 1, error.startColumn - 1],
              [error.endLine - 1, error.endColumn],
            ],
          };
          switch (error.severity.toLowerCase()) {
            case 'error':
              message.type = 'Error';
              message.severity = 'error';
              break;
            case 'suggestion':
              message.type = 'Info';
              message.severity = 'info';
              break;
            case 'warning':
            default:
              message.type = 'Warning';
              message.severity = 'warning';
              break;
          }
          return message;
        });
      },
    };
  },
};
