"use strict";

(function setup_global_audio_context() {
  if (window.context === undefined) {
    console.log('creating new window.AudioContext()')
    window.AudioContext = (
      window.AudioContext ||
      window.webkitAudioContext ||
      window.mozAudioContext ||
      window.msAudioContext
    )
    window.context = new window.AudioContext()
  }
})()

module.exports.modem = modem

function modem(options) {

  var id = options.id
  var name = options.name
  var type = options.type


  var programmed_freqs = (function create_frequencies() {

    var n_oscs = 10
    var return_array = []
    do {
      return_array.push(n_oscs * 1000 + 1000)
    } while (--n_oscs)
    return return_array
  })()

  programmed_freqs = [1000, 2000, 3000, 4000, 5000]

  // transmitter
  var osc_bank = []
  var filter_bank = []
  var gain_bank = []
  var master_gain

  // mic

  function setup_transmitter() {

    if (type === 'mic') {

      navigator.getMedia = (
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia
      );

      navigator.getMedia(
        // constraints: audio and video for this app
        {
          audio: true,
          video: false
        },

        // Success callback
        function (stream) {

          var source = context.createMediaStreamSource(stream);
          source.connect(analyser)
          CURRENT_STATE = 0
          console.log('done connecting ', name)

        },

        // Error callback
        function (err) {
          console.log('The following gUM error occured: ' + err);
        }
      );

    }

    master_gain = context.createGain()
    master_gain.gain.value = 0.0

    // programmed_freqs.forEach(function(hz){
    //   var osc = context.createOscillator()
    //
    //   osc.type = 'sine'
    //   osc.frequency.value = hz
    //
    //   var filter = context.createBiquadFilter()
    //   var gain = context.createGain()
    //
    //   osc.start(0)
    //
    //   osc.connect(gain)
    //   gain.connect(master_gain)
    //
    //   osc_bank.push(osc)
    //   filter_bank.push(filter)
    //   gain_bank.push(gain)
    // })



    ////////////////////////////////////////
    var sample_idx = 0
    var bufferSize = 16384
    window.scriptProcessor = context.createScriptProcessor(bufferSize, 1, 1)

    var g = context.createGain()
    g.gain.value = 0.2
    var osc = context.createOscillator()
    osc.start(0)
    osc.connect(scriptProcessor)
    scriptProcessor.connect(analyser)

    // Give the node a function to process audio events

    // var freqs = [1000, 2000, 3000, 4000, 5000, 6000]
    var freqs_running_idx = [0, 0]

    scriptProcessor.onaudioprocess = function (audioProcessingEvent) {

      console.log('here' + audioProcessingEvent.outputBuffer.length)

      // The input buffer is the song we loaded earlier
      var inputBuffer = audioProcessingEvent.inputBuffer;

      // The output buffer contains the samples that will be modified and played
      var outputBuffer = audioProcessingEvent.outputBuffer;

      // Loop through the output channels (in this case there is only one)
      for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {

        var inputData = inputBuffer.getChannelData(channel);
        var outputData = outputBuffer.getChannelData(channel);

        var multi
        for (var sample = 0; sample < inputBuffer.length; sample++) {

          outputData[sample] = 0

          programmed_freqs.forEach(function (hz, idx) {
            multi = (context.sampleRate / 2) / hz / Math.PI
            outputData[sample] += Math.sin(sample_idx / multi)
            freqs_running_idx[idx]++
          })

          outputData[sample] *= 1 / (programmed_freqs.length + 1)

          sample_idx++

          // determine what bits need to be encoded


        }

      }


    }



  }

  // encoder

  // receiver

  // decoder
  var analyser
  var analysisTimeBuffer
  var analysisFrequencyBuffer

  var peaks = []

  function setup_analyser() {

    console.log(id + '\t' + 'setting up analyser')

    analyser = context.createAnalyser()
    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0.00

    analysisTimeBuffer = new Uint8Array(analyser.frequencyBinCount)
    analysisFrequencyBuffer = new Uint8Array(analyser.frequencyBinCount)

    osc_bank.forEach(function () {
      peaks.push(0)
    })

  }

  function analyse() {
    analyser.getByteTimeDomainData(analysisTimeBuffer)
    analyser.getByteFrequencyData(analysisFrequencyBuffer)
    fill_peaks()
  }

  function fill_peaks() {

    programmed_freqs.forEach(function (hz, osc_idx) {
      peaks[osc_idx] = getFrequencyValue(hz)
    })

    function getFrequencyValue(frequency) {
      var nyquist = context.sampleRate / 2;
      var index = Math.round(frequency / nyquist * analysisFrequencyBuffer.length);
      return analysisFrequencyBuffer[index];
    }

    window.gf = getFrequencyValue

  }


  function get_interfaces() {
    return {
      analyser: analyser,
      gain_bank: gain_bank,
      master_gain: master_gain,
      osc_bank: osc_bank,
      peaks: peaks
    }
  }

  function get_buffers() {
    return {
      time: analysisTimeBuffer,
      freq: analysisFrequencyBuffer
    }
  }

  return {
    analyse: analyse,
    setup_analyser: setup_analyser,
    setup_transmitter: setup_transmitter,
    get_buffers: get_buffers,
    get_interfaces: get_interfaces
  }

}
