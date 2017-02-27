'use babel';

// eslint-disable-next-line
import { CompositeDisposable } from 'atom';
import { exec, findCachedAsync } from 'atom-linter';
import { dirname, relative } from 'path';

const getProjectDir = (filePath) => {
  const projPath = atom.project.relativizePath(filePath)[0];
  if (projPath !== null) {
    // Atom found the path in one of the open projects
    return projPath;
  }
  if (typeof filePath === 'string') {
    // Fall back to the directory of the file
    return dirname(filePath);
  }
  // If Atom couldn't find a path, and we weren't given a string...
  return null;
};

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
        const fileDir = dirname(filePath);
        const baseArgs = [filePath, '--json'];
        const defaultHints = this.hlintHints.map(hint => (`--hint=${hint}`));
        let hints;
        // Find any HLint.hs files in the current or parent directories
        const hlintConfig = await findCachedAsync(fileDir, 'HLint.hs');
        const projPath = getProjectDir(filePath);
        if (hlintConfig !== null &&
          !relative(projPath, hlintConfig).startsWith('..')
        ) {
          // The HLint.hs found is in the current project
          hints = [`--hint=${hlintConfig}`];
        } else {
          // It's outside the project, or not found, just use the defaults
          hints = defaultHints;
          if (this.ignoreReduceDuplication) {
            hints.push('--ignore="Reduce duplication"');
          }
        }
        const execArgs = baseArgs.concat(hints);

        const execOpts = {
          ignoreExitCode: true,
          cwd: fileDir,
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
              [error.endLine - 1, error.endColumn - 1],
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
