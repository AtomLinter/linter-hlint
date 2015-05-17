module.exports =
  config:
    hlintExecutablePath: 
      type: 'string'
      default: 'hlint'
  activate: ->
    console.log 'activate linter-hlint'
