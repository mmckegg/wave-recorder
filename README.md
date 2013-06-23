wave-recorder
===

Record WAVE files using Web Audio API and persist with Web FileSystem API. 

## Install

```bash
$ npm install wave-recorder
```

## Example

```js
var WaveRecorder = require('wave-recorder')

var audioContext = new webkitAudioContext()

navigator.webkitGetUserMedia({audio:true}, function(stream) {
  
  // get the mic input
  var audioInput = audioContext.createMediaStreamSource(stream)

  // hacks for Web Audio API bugs - something must be connected to destination
  var zeroGain = audioContext.createGainNode()
  zeroGain.gain.value = 0.0
  audioInput.connect( zeroGain )
  zeroGain.connect( audioContext.destination )

  var recorder = WaveRecorder(audioInput)

  var r = recorder.record('/test.wav', function(err, url){
    // this callback is triggered when recording has stopped
    // returns url that can be loaded into media element etc
  })

  // record for 10 seconds then stop
  setTimeout(r.stop, 10000)
})

```