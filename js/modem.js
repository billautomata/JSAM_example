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

function modem(options){

  var id = options.id
  var name = options.name
  var type = options.type

  // transmitter
  var osc_bank = []
  var filter_bank = []
  var gain_bank = []
  var master_gain

  // mic

  function setup_transmitter(n_osc){

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
    master_gain.gain.value = 1.0

    for(var osc_idx = 0; osc_idx < n_osc; osc_idx++){

      var osc = context.createOscillator()

      osc.type = 'sine'
      osc.frequency.value = 4096

      var filter = context.createBiquadFilter()
      var gain = context.createGain()

      osc.start(0)

      // gain.gain.value = 0

      osc.connect(gain)
      gain.connect(master_gain)

      osc_bank.push(osc)
      filter_bank.push(filter)
      gain_bank.push(gain)

    }

  }



  // encoder

  // receiver

  // decoder
  var analyser
  var analysisTimeBuffer
  var analysisFrequencyBuffer

  function setup_analyser(){

    console.log(id + '\t' + 'setting up analyser')

    analyser = context.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.00

    analysisTimeBuffer = new Uint8Array(analyser.frequencyBinCount)
    analysisFrequencyBuffer = new Uint8Array(analyser.frequencyBinCount)

  }

  function analyse(){
    analyser.getByteTimeDomainData(analysisTimeBuffer)
    analyser.getByteFrequencyData(analysisFrequencyBuffer)
  }

  function get_interfaces(){
    return {
      analyser: analyser,
      gain_bank: gain_bank,
      master_gain: master_gain,
      osc_bank: osc_bank,
    }
  }

  function get_buffers(){
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
