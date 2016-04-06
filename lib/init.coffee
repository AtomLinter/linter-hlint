{BufferedProcess, CompositeDisposable} = require 'atom'

module.exports =
  config:
    hlintExecutablePath:
      title: 'The hlint executable path.'
      type: 'string'
      default: 'hlint'
    hlintHints:
      title: 'List of hints to use'
      type: 'array'
      default: ['Default', 'Dollar', 'Generalise']
      items:
        type: 'string'

  activate: ->
    @subscriptions = new CompositeDisposable
    @subscriptions.add atom.config.observe 'linter-hlint.hlintExecutablePath',
      (executablePath) =>
        @executablePath = executablePath
    @subscriptions.add atom.config.observe 'linter-hlint.hlintHints',
      (hlintHints) =>
        @hlintHints = hlintHints

  deactivate: ->
    @subscriptions.dispose()

  provideLinter: ->
    provider =
      grammarScopes: ['source.haskell', 'text.tex.latex.haskell']
      scope: 'file' # or 'project'
      lintOnFly: true # must be false for scope: 'project'
      lint: (textEditor) =>
        return new Promise (resolve, reject) =>
          filePath = textEditor.getPath()
          json = []
          hints = (('--hint=' + h) for h in @hlintHints)
          process = new BufferedProcess
            command: @executablePath
            args: [filePath, '--json'].concat hints 
            stdout: (data) ->
              json.push data
            exit: (code) ->
              # return resolve [] unless code is 0
              # hlint returns exit status 1 on normal usage...not sure why
              info = try JSON.parse json.join('\n')
              return resolve [] unless info?
              # return resolve [] if info.passed
              resolve info.map (error) ->
                type: error.severity.toLowerCase(),
                text: [error.hint, "#{error.from} ==>", "#{ error.to}"].join "\n"
                # html: [error.hint, "#{error.from} ==>", "#{ error.to}"].join "<br/>"
                filePath: error.file or filePath,
                range: [
                  # Atom expects ranges to be 0-based
                  [error.startLine - 1, error.startColumn - 1],
                  [error.endLine - 1, error.endColumn]
                ]

          process.onWillThrowError ({error,handle}) ->
            atom.notifications.addError "Failed to run #{@executablePath}",
              detail: "#{error.message}"
              dismissable: true
            handle()
            resolve []
