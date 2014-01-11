wave-recorder
===

Pipe Web Audio API nodes into 16bit PCM Wave files.

## Install

```bash
$ npm install wave-recorder
```

## Example

```js
var fs = require('web-fs')
var WaveRecorder = require('wave-recorder')

var audioContext = new webkitAudioContext()

navigator.webkitGetUserMedia({audio:true}, function(stream) {
  
  // get the mic input
  var audioInput = audioContext.createMediaStreamSource(stream)
  var recorder = WaveRecorder(audioContext)

  audioInput.connect(recorder.input)

  var fileStream = fs.createWriteStream('test.wav')
  recorder.pipe(fileStream)

  // optionally go back and rewrite header with updated length
  recorder.on('header', function(header){ 
    fileStream.on('close', function(){
      var headerStream = fs.createWriteStream(filePath, {flags: 'r+', start:0})
      headerStream.write(header)
      headerStream.end()
    })
  })

  // record for 10 seconds then stop
  setTimeout(function(){
    recorder.end()
  }, 10000)
})

```