{BufferedProcess, CompositeDisposable} = require 'atom'

module.exports =
  config:
    hlintExecutablePath:
      title: 'The hlint executable path.'
      type: 'string'
      default: 'hlint'

  activate: ->
    @subscriptions = new CompositeDisposable
    @subscriptions.add atom.config.observe 'linter-hlint.hlintExecutablePath',
      (executablePath) =>
        @executablePath = executablePath

  deactivate: ->
    @subscriptions.dispose()

  provideLinter: ->
    provider =
      grammarScopes: ['source.haskell']
      scope: 'file' # or 'project'
      lintOnFly: true # must be false for scope: 'project'
      lint: (textEditor) =>
        return new Promise (resolve, reject) =>
          filePath = textEditor.getPath()
          json = []
          process = new BufferedProcess
            command: @executablePath
            args: [filePath, '--json']
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
                html: [error.hint, "#{error.from} ==>", "#{ error.to}"].join "<br/>"
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
