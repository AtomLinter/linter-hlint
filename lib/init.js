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
      name: 'HLint',
      grammarScopes: ['source.haskell', 'text.tex.latex.haskell'],
      scope: 'file',
      lintsOnChange: false,
      lint: async (textEditor) => {
        const filePath = textEditor.getPath();
        const fileDir = dirname(filePath);
        const baseArgs = [filePath, '--json'];
        let hints;
        // Find any .hlint.yaml files in the current or parent directories
        const hlintConfig = await findCachedAsync(fileDir, '.hlint.yaml');
        const projPath = getProjectDir(filePath);
        if (hlintConfig !== null &&
          !relative(projPath, hlintConfig).startsWith('..')
        ) {
          // The .hlint.yaml found is in the current project
          hints = [`--hint=${hlintConfig}`];
        } else {
          // It's outside the project, or not found
          hints = [];
        }
        if (this.ignoreReduceDuplication) {
          hints.push('--ignore="Reduce duplication"');
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
            excerpt: `${error.hint}: ${error.from} ==> ${error.to}`,
            location: {
              file: filePath,
              position: [
                [error.startLine - 1, error.startColumn - 1],
                [error.endLine - 1, error.endColumn - 1],
              ],
            },
          };
          switch (error.severity.toLowerCase()) {
            case 'error':
              message.severity = 'error';
              break;
            case 'suggestion':
              message.severity = 'info';
              break;
            default:
              // warning and others
              message.severity = 'warning';
              break;
          }
          return message;
        });
      },
    };
  },
};
