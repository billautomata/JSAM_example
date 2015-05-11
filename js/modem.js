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

  var dft_size = 2048

  var programmed_freqs = [1000, 2000]

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


    var dft_buffer = new Float32Array(dft_size)

    scriptProcessor.onaudioprocess = function (audioProcessingEvent) {

      console.log('here' + audioProcessingEvent.outputBuffer.length)

      // The output buffer contains the samples that will be modified and played
      var outputBuffer = audioProcessingEvent.outputBuffer;

      // Loop through the output channels (in this case there is only one)
      for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {

        // var inputData = inputBuffer.getChannelData(channel);
        var outputData = outputBuffer.getChannelData(channel);

        var multi
        for (var sample = 0; sample < outputBuffer.length; sample++) {

          outputData[sample] = 0

          programmed_freqs.forEach(function (hz, idx) {
            multi = (context.sampleRate / 2) / hz / Math.PI
            outputData[sample] += Math.sin(sample_idx / multi)
          })

          outputData[sample] *= 1 / (programmed_freqs.length + 1)

          dft_buffer[sample_idx%dft_size] = outputData[sample]

          sample_idx++

        }
      }

      // do fft on outputData
      dft.forward(dft_buffer)

    }

    // where I do I go?
    

  }

  // encoder

  // receiver

  // decoder

  var dft

  var analyser
  var analysisTimeBuffer
  var analysisFrequencyBuffer

  var peaks = []

  function setup_analyser() {

    dft = new DFT(dft_size,44100)

    console.log(id + '\t' + 'setting up analyser')

    analyser = context.createAnalyser()
    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0.00

    analysisTimeBuffer = new Uint8Array(analyser.frequencyBinCount)
    analysisFrequencyBuffer = new Uint8Array(analyser.frequencyBinCount)

    programmed_freqs.forEach(function () {
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

  }


  function get_interfaces() {
    return {
      analyser: analyser,
      master_gain: master_gain,
      peaks: peaks,
      dft: dft,
      dft_size: dft_size
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
