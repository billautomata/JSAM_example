(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
window.scriptProcessor
window.start_time

window.onload = function () {



  var sample_idx = 0
  start_time = 0
  var _t = Date.now()

  // console.log = function(){}

  var Modem = require('./modem.js')
  var View_Controller = require('./modem_view.js')

  var modem = Modem.modem({
    name: 'modem',
    type: 'normy',
    id: 'modemA'
  })

  modem.setup_analyser()
  modem.analyse()

  modem.setup_transmitter()

  var ifaces = modem.get_interfaces()

  ifaces.gain_bank.forEach(function (b) {
    b.gain.value = 0.1
      // b.connect(ifaces.analyser)
  })

  var analyser = ifaces.analyser
  var freqDomain = new Float32Array(analyser.frequencyBinCount);
  var freqDomainB = new Uint8Array(analyser.frequencyBinCount);

  window.gf = function getFrequencyValue(frequency) {
    analyser.getFloatFrequencyData(freqDomain);
    analyser.getByteFrequencyData(freqDomainB);

    var nyquist = context.sampleRate / 2;
    var index = Math.round(frequency / nyquist * freqDomain.length);
    return freqDomain[index];
  }

  window.recorder = new Recorder(ifaces.master_gain)

  ifaces.master_gain.connect(ifaces.analyser)

  var display_bob = View_Controller.view_controller('test_modem')
  display_bob.connect(modem)
  display_bob.setup_svg()


  var use_interval = false
  var interval_time = 50

  window.interval

  var mean = 180

  var n_errors = 0

  function interval_tick() {

    // console.log('////')
    modem.analyse()
      //
      // ifaces.peaks.forEach(function(peak_value,peak_idx){
      //
      //   if(ifaces.gain_bank[peak_idx].gain.value > 0 && peak_value <= mean){
      //     console.log(peak_value)
      //     console.log('err too low!!!!' + peak_idx+' '+n_errors)
      //     n_errors ++
      //   }
      //   if(ifaces.gain_bank[peak_idx].gain.value === 0.0 && peak_value > mean){
      //     console.log(peak_value)
      //     console.log('err too high!!!!' + peak_idx+' '+n_errors)
      //     n_errors ++
      //   }
      //
      // })

    // console.log(ifaces.peaks)
    // var peaks = modem.get_interfaces().peaks


    display_bob.tick(true)

    if (!use_interval) {
      window.requestAnimationFrame(interval_tick)
    }

  }

  if (!use_interval) {
    interval_tick()
  } else {
    window.interval = setInterval(interval_tick, interval_time)
  }

  window.m = modem

  return;

}




window.createDownloadLink = function createDownloadLink() {
  recorder && recorder.exportWAV(function (blob) {
    var url = URL.createObjectURL(blob);
    var li = document.createElement('li');
    var au = document.createElement('audio');
    var hf = document.createElement('a');

    au.controls = true;
    au.src = url;
    hf.href = url;
    hf.download = new Date().toISOString() + '.wav';
    hf.innerHTML = hf.download;
    li.appendChild(au);
    li.appendChild(hf);
    d3.select('body').append('div').node().appendChild(li);
  });
}

},{"./modem.js":2,"./modem_view.js":3}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
module.exports.view_controller = view_controller

function view_controller(div_id) {

  "use strict";

  var name = div_id

  var agent
  var parent = d3.select('div#' + div_id)

  // display
  //    current state
  //    sync count
  //    oscilloscope of output & input
  //    fft bars of output & input
  //    current baud
  //    rx buffer

  var svg
  var div_sync_count
  var sync_indicator
  var div_rx_buffer
  var div_baud_meter
  var bars = []
  var circles = []

  var WIDTH = 1024
  var HEIGHT = 256

  var barWidth
  var bufferLength

  var other_buffers

  // create svg
  function setup_svg() {

    console.log('calling setup_svg')

    // var state = agent.get_state()

    WIDTH = bufferLength
    HEIGHT = WIDTH / 4

    barWidth = (WIDTH / bufferLength)

    parent.append('h1').attr('class', 'text-center').html(name)

    svg = parent.append('svg')
      .attr('class', 'img-responsive')
      .attr('width', '100%')
      // .attr('height', HEIGHT)
      .attr('preserveAspectRatio', 'xMidYMid')
      .attr('viewBox', '0 0 ' + WIDTH + ' ' + HEIGHT)
      .style('background-color', 'rgba(0,0,0,0.1)')

    svg.append('text')
      .text('receiver spectrum')
      .attr('x', WIDTH)
      .attr('y', 12)
      .attr('dx', '-4px')
      .style('font-size', 12)
      .style('text-anchor', 'end')
      .attr('fill', 'rgba(0,0,0,0.1)')

    bars = []
    for (var svgbars = 0; svgbars < bufferLength; svgbars++) {
      var bar = svg.append('rect')
        .attr('x', barWidth * svgbars)
        .attr('y', 0)
        .attr('width', barWidth)
        .attr('height', 0)
        .attr('fill', 'green')
        .attr('stroke', 'none')

      var circle = svg.append('circle')
        .attr('cx', barWidth * svgbars)
        .attr('cy', 0)
        .attr('r', barWidth)
        .attr('fill', 'red')


      var bar_idx = svgbars
        // bar.on('mouseover', function () {
        //   console.log(bar_idx)
        // })

      bars.push(bar)
      circles.push(circle)
    }

    return;

    // sync count
    div_sync_count = parent.append('div')
      .attr('class', 'col-md-4')
      .style('outline', '1px dotted rgba(0,0,0,0.1)')

    div_sync_count.append('h4').attr('class', 'text-center').html('synchronization counts')
    sync_indicator = div_sync_count.append('div').attr('class', 'text-center sync_count')

    // baud meter
    var parent_baud_meter = parent.append('div').attr('class', 'col-md-4')
      .style('outline', '1px dotted rgba(0,0,0,0.1)')

    parent_baud_meter.append('h4').attr('class', 'text-center').html('baud')
    div_baud_meter = parent_baud_meter.append('div').attr('class', 'text-center')


    var parent_input_slider = parent.append('div').attr('class', 'col-md-4')

    parent_input_slider.append('h4').attr('class', 'text-center').html('transmitter volume')

    var slider_itself = parent_input_slider.append('input').attr('type', 'range')
      .attr('min', 0.0)
      .attr('max', 100.0)
      .attr('value', 0.0)

    slider_itself.on('input', function () {
      // console.log(d3.event)
      var v = d3.select(this).node().value
      agent.set_volume(v / 100.0)
    })

    // message to send
    var parent_message_to_send = parent.append('div').attr('class', 'col-md-12')

    parent_message_to_send.append('h4').attr('class', 'text-center').html('sending this message')

    var input_field = parent_message_to_send.append('input')
      .attr('type', 'text')
      .attr('class', 'msg_input')

    // input_field.node().value = state.MESSAGE

    input_field.on('keyup', function () {
      var v = input_field.node().value
      if (v === '') {
        v = ' '
      }

      agent.set_message(v)
    })

    // rx buffer
    var div_rx_buffer_parent = parent.append('div')
      .attr('class', 'col-md-12')

    div_rx_buffer_parent.append('h4').attr('class', 'text-center').html('rx buffer')

    div_rx_buffer = div_rx_buffer_parent.append('pre').attr('class', 'rx_buffer')

  }

  function connect(remote_agent) {
    agent = remote_agent
    other_buffers = remote_agent.get_buffers()
    bufferLength = other_buffers.time.length
  }

  function tick(draw_bars) {

    if (draw_bars === true) {
      var dataArray = other_buffers.freq
      var dataArrayT = other_buffers.time

      for (var i = 0; i < bufferLength; i++) {
        bars[i].attr('height', (dataArray[i] / 255) * HEIGHT)
        circles[i].attr('cy', (dataArrayT[i] / 255) * HEIGHT)

      }

    }

  }

  return {
    setup_svg: setup_svg,
    tick: tick,
    connect: connect
  }

}

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9sZWFybmluZ19tYWluLmpzIiwianMvbW9kZW0uanMiLCJqcy9tb2RlbV92aWV3LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25QQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIndpbmRvdy5zY3JpcHRQcm9jZXNzb3JcbndpbmRvdy5zdGFydF90aW1lXG5cbndpbmRvdy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG5cblxuXG4gIHZhciBzYW1wbGVfaWR4ID0gMFxuICBzdGFydF90aW1lID0gMFxuICB2YXIgX3QgPSBEYXRlLm5vdygpXG5cbiAgLy8gY29uc29sZS5sb2cgPSBmdW5jdGlvbigpe31cblxuICB2YXIgTW9kZW0gPSByZXF1aXJlKCcuL21vZGVtLmpzJylcbiAgdmFyIFZpZXdfQ29udHJvbGxlciA9IHJlcXVpcmUoJy4vbW9kZW1fdmlldy5qcycpXG5cbiAgdmFyIG1vZGVtID0gTW9kZW0ubW9kZW0oe1xuICAgIG5hbWU6ICdtb2RlbScsXG4gICAgdHlwZTogJ25vcm15JyxcbiAgICBpZDogJ21vZGVtQSdcbiAgfSlcblxuICBtb2RlbS5zZXR1cF9hbmFseXNlcigpXG4gIG1vZGVtLmFuYWx5c2UoKVxuXG4gIG1vZGVtLnNldHVwX3RyYW5zbWl0dGVyKClcblxuICB2YXIgaWZhY2VzID0gbW9kZW0uZ2V0X2ludGVyZmFjZXMoKVxuXG4gIGlmYWNlcy5nYWluX2JhbmsuZm9yRWFjaChmdW5jdGlvbiAoYikge1xuICAgIGIuZ2Fpbi52YWx1ZSA9IDAuMVxuICAgICAgLy8gYi5jb25uZWN0KGlmYWNlcy5hbmFseXNlcilcbiAgfSlcblxuICB2YXIgYW5hbHlzZXIgPSBpZmFjZXMuYW5hbHlzZXJcbiAgdmFyIGZyZXFEb21haW4gPSBuZXcgRmxvYXQzMkFycmF5KGFuYWx5c2VyLmZyZXF1ZW5jeUJpbkNvdW50KTtcbiAgdmFyIGZyZXFEb21haW5CID0gbmV3IFVpbnQ4QXJyYXkoYW5hbHlzZXIuZnJlcXVlbmN5QmluQ291bnQpO1xuXG4gIHdpbmRvdy5nZiA9IGZ1bmN0aW9uIGdldEZyZXF1ZW5jeVZhbHVlKGZyZXF1ZW5jeSkge1xuICAgIGFuYWx5c2VyLmdldEZsb2F0RnJlcXVlbmN5RGF0YShmcmVxRG9tYWluKTtcbiAgICBhbmFseXNlci5nZXRCeXRlRnJlcXVlbmN5RGF0YShmcmVxRG9tYWluQik7XG5cbiAgICB2YXIgbnlxdWlzdCA9IGNvbnRleHQuc2FtcGxlUmF0ZSAvIDI7XG4gICAgdmFyIGluZGV4ID0gTWF0aC5yb3VuZChmcmVxdWVuY3kgLyBueXF1aXN0ICogZnJlcURvbWFpbi5sZW5ndGgpO1xuICAgIHJldHVybiBmcmVxRG9tYWluW2luZGV4XTtcbiAgfVxuXG4gIHdpbmRvdy5yZWNvcmRlciA9IG5ldyBSZWNvcmRlcihpZmFjZXMubWFzdGVyX2dhaW4pXG5cbiAgaWZhY2VzLm1hc3Rlcl9nYWluLmNvbm5lY3QoaWZhY2VzLmFuYWx5c2VyKVxuXG4gIHZhciBkaXNwbGF5X2JvYiA9IFZpZXdfQ29udHJvbGxlci52aWV3X2NvbnRyb2xsZXIoJ3Rlc3RfbW9kZW0nKVxuICBkaXNwbGF5X2JvYi5jb25uZWN0KG1vZGVtKVxuICBkaXNwbGF5X2JvYi5zZXR1cF9zdmcoKVxuXG5cbiAgdmFyIHVzZV9pbnRlcnZhbCA9IGZhbHNlXG4gIHZhciBpbnRlcnZhbF90aW1lID0gNTBcblxuICB3aW5kb3cuaW50ZXJ2YWxcblxuICB2YXIgbWVhbiA9IDE4MFxuXG4gIHZhciBuX2Vycm9ycyA9IDBcblxuICBmdW5jdGlvbiBpbnRlcnZhbF90aWNrKCkge1xuXG4gICAgLy8gY29uc29sZS5sb2coJy8vLy8nKVxuICAgIG1vZGVtLmFuYWx5c2UoKVxuICAgICAgLy9cbiAgICAgIC8vIGlmYWNlcy5wZWFrcy5mb3JFYWNoKGZ1bmN0aW9uKHBlYWtfdmFsdWUscGVha19pZHgpe1xuICAgICAgLy9cbiAgICAgIC8vICAgaWYoaWZhY2VzLmdhaW5fYmFua1twZWFrX2lkeF0uZ2Fpbi52YWx1ZSA+IDAgJiYgcGVha192YWx1ZSA8PSBtZWFuKXtcbiAgICAgIC8vICAgICBjb25zb2xlLmxvZyhwZWFrX3ZhbHVlKVxuICAgICAgLy8gICAgIGNvbnNvbGUubG9nKCdlcnIgdG9vIGxvdyEhISEnICsgcGVha19pZHgrJyAnK25fZXJyb3JzKVxuICAgICAgLy8gICAgIG5fZXJyb3JzICsrXG4gICAgICAvLyAgIH1cbiAgICAgIC8vICAgaWYoaWZhY2VzLmdhaW5fYmFua1twZWFrX2lkeF0uZ2Fpbi52YWx1ZSA9PT0gMC4wICYmIHBlYWtfdmFsdWUgPiBtZWFuKXtcbiAgICAgIC8vICAgICBjb25zb2xlLmxvZyhwZWFrX3ZhbHVlKVxuICAgICAgLy8gICAgIGNvbnNvbGUubG9nKCdlcnIgdG9vIGhpZ2ghISEhJyArIHBlYWtfaWR4KycgJytuX2Vycm9ycylcbiAgICAgIC8vICAgICBuX2Vycm9ycyArK1xuICAgICAgLy8gICB9XG4gICAgICAvL1xuICAgICAgLy8gfSlcblxuICAgIC8vIGNvbnNvbGUubG9nKGlmYWNlcy5wZWFrcylcbiAgICAvLyB2YXIgcGVha3MgPSBtb2RlbS5nZXRfaW50ZXJmYWNlcygpLnBlYWtzXG5cblxuICAgIGRpc3BsYXlfYm9iLnRpY2sodHJ1ZSlcblxuICAgIGlmICghdXNlX2ludGVydmFsKSB7XG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGludGVydmFsX3RpY2spXG4gICAgfVxuXG4gIH1cblxuICBpZiAoIXVzZV9pbnRlcnZhbCkge1xuICAgIGludGVydmFsX3RpY2soKVxuICB9IGVsc2Uge1xuICAgIHdpbmRvdy5pbnRlcnZhbCA9IHNldEludGVydmFsKGludGVydmFsX3RpY2ssIGludGVydmFsX3RpbWUpXG4gIH1cblxuICB3aW5kb3cubSA9IG1vZGVtXG5cbiAgcmV0dXJuO1xuXG59XG5cblxuXG5cbndpbmRvdy5jcmVhdGVEb3dubG9hZExpbmsgPSBmdW5jdGlvbiBjcmVhdGVEb3dubG9hZExpbmsoKSB7XG4gIHJlY29yZGVyICYmIHJlY29yZGVyLmV4cG9ydFdBVihmdW5jdGlvbiAoYmxvYikge1xuICAgIHZhciB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgIHZhciBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG4gICAgdmFyIGF1ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYXVkaW8nKTtcbiAgICB2YXIgaGYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG5cbiAgICBhdS5jb250cm9scyA9IHRydWU7XG4gICAgYXUuc3JjID0gdXJsO1xuICAgIGhmLmhyZWYgPSB1cmw7XG4gICAgaGYuZG93bmxvYWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkgKyAnLndhdic7XG4gICAgaGYuaW5uZXJIVE1MID0gaGYuZG93bmxvYWQ7XG4gICAgbGkuYXBwZW5kQ2hpbGQoYXUpO1xuICAgIGxpLmFwcGVuZENoaWxkKGhmKTtcbiAgICBkMy5zZWxlY3QoJ2JvZHknKS5hcHBlbmQoJ2RpdicpLm5vZGUoKS5hcHBlbmRDaGlsZChsaSk7XG4gIH0pO1xufVxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbihmdW5jdGlvbiBzZXR1cF9nbG9iYWxfYXVkaW9fY29udGV4dCgpIHtcbiAgaWYgKHdpbmRvdy5jb250ZXh0ID09PSB1bmRlZmluZWQpIHtcbiAgICBjb25zb2xlLmxvZygnY3JlYXRpbmcgbmV3IHdpbmRvdy5BdWRpb0NvbnRleHQoKScpXG4gICAgd2luZG93LkF1ZGlvQ29udGV4dCA9IChcbiAgICAgIHdpbmRvdy5BdWRpb0NvbnRleHQgfHxcbiAgICAgIHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQgfHxcbiAgICAgIHdpbmRvdy5tb3pBdWRpb0NvbnRleHQgfHxcbiAgICAgIHdpbmRvdy5tc0F1ZGlvQ29udGV4dFxuICAgIClcbiAgICB3aW5kb3cuY29udGV4dCA9IG5ldyB3aW5kb3cuQXVkaW9Db250ZXh0KClcbiAgfVxufSkoKVxuXG5tb2R1bGUuZXhwb3J0cy5tb2RlbSA9IG1vZGVtXG5cbmZ1bmN0aW9uIG1vZGVtKG9wdGlvbnMpIHtcblxuICB2YXIgaWQgPSBvcHRpb25zLmlkXG4gIHZhciBuYW1lID0gb3B0aW9ucy5uYW1lXG4gIHZhciB0eXBlID0gb3B0aW9ucy50eXBlXG5cblxuICB2YXIgcHJvZ3JhbW1lZF9mcmVxcyA9IChmdW5jdGlvbiBjcmVhdGVfZnJlcXVlbmNpZXMoKSB7XG5cbiAgICB2YXIgbl9vc2NzID0gMTBcbiAgICB2YXIgcmV0dXJuX2FycmF5ID0gW11cbiAgICBkbyB7XG4gICAgICByZXR1cm5fYXJyYXkucHVzaChuX29zY3MgKiAxMDAwICsgMTAwMClcbiAgICB9IHdoaWxlICgtLW5fb3NjcylcbiAgICByZXR1cm4gcmV0dXJuX2FycmF5XG4gIH0pKClcblxuICBwcm9ncmFtbWVkX2ZyZXFzID0gWzEwMDAsIDIwMDAsIDMwMDAsIDQwMDAsIDUwMDBdXG5cbiAgLy8gdHJhbnNtaXR0ZXJcbiAgdmFyIG9zY19iYW5rID0gW11cbiAgdmFyIGZpbHRlcl9iYW5rID0gW11cbiAgdmFyIGdhaW5fYmFuayA9IFtdXG4gIHZhciBtYXN0ZXJfZ2FpblxuXG4gIC8vIG1pY1xuXG4gIGZ1bmN0aW9uIHNldHVwX3RyYW5zbWl0dGVyKCkge1xuXG4gICAgaWYgKHR5cGUgPT09ICdtaWMnKSB7XG5cbiAgICAgIG5hdmlnYXRvci5nZXRNZWRpYSA9IChcbiAgICAgICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSB8fFxuICAgICAgICBuYXZpZ2F0b3Iud2Via2l0R2V0VXNlck1lZGlhIHx8XG4gICAgICAgIG5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWEgfHxcbiAgICAgICAgbmF2aWdhdG9yLm1zR2V0VXNlck1lZGlhXG4gICAgICApO1xuXG4gICAgICBuYXZpZ2F0b3IuZ2V0TWVkaWEoXG4gICAgICAgIC8vIGNvbnN0cmFpbnRzOiBhdWRpbyBhbmQgdmlkZW8gZm9yIHRoaXMgYXBwXG4gICAgICAgIHtcbiAgICAgICAgICBhdWRpbzogdHJ1ZSxcbiAgICAgICAgICB2aWRlbzogZmFsc2VcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBTdWNjZXNzIGNhbGxiYWNrXG4gICAgICAgIGZ1bmN0aW9uIChzdHJlYW0pIHtcblxuICAgICAgICAgIHZhciBzb3VyY2UgPSBjb250ZXh0LmNyZWF0ZU1lZGlhU3RyZWFtU291cmNlKHN0cmVhbSk7XG4gICAgICAgICAgc291cmNlLmNvbm5lY3QoYW5hbHlzZXIpXG4gICAgICAgICAgQ1VSUkVOVF9TVEFURSA9IDBcbiAgICAgICAgICBjb25zb2xlLmxvZygnZG9uZSBjb25uZWN0aW5nICcsIG5hbWUpXG5cbiAgICAgICAgfSxcblxuICAgICAgICAvLyBFcnJvciBjYWxsYmFja1xuICAgICAgICBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ1RoZSBmb2xsb3dpbmcgZ1VNIGVycm9yIG9jY3VyZWQ6ICcgKyBlcnIpO1xuICAgICAgICB9XG4gICAgICApO1xuXG4gICAgfVxuXG4gICAgbWFzdGVyX2dhaW4gPSBjb250ZXh0LmNyZWF0ZUdhaW4oKVxuICAgIG1hc3Rlcl9nYWluLmdhaW4udmFsdWUgPSAwLjBcblxuICAgIC8vIHByb2dyYW1tZWRfZnJlcXMuZm9yRWFjaChmdW5jdGlvbihoeil7XG4gICAgLy8gICB2YXIgb3NjID0gY29udGV4dC5jcmVhdGVPc2NpbGxhdG9yKClcbiAgICAvL1xuICAgIC8vICAgb3NjLnR5cGUgPSAnc2luZSdcbiAgICAvLyAgIG9zYy5mcmVxdWVuY3kudmFsdWUgPSBoelxuICAgIC8vXG4gICAgLy8gICB2YXIgZmlsdGVyID0gY29udGV4dC5jcmVhdGVCaXF1YWRGaWx0ZXIoKVxuICAgIC8vICAgdmFyIGdhaW4gPSBjb250ZXh0LmNyZWF0ZUdhaW4oKVxuICAgIC8vXG4gICAgLy8gICBvc2Muc3RhcnQoMClcbiAgICAvL1xuICAgIC8vICAgb3NjLmNvbm5lY3QoZ2FpbilcbiAgICAvLyAgIGdhaW4uY29ubmVjdChtYXN0ZXJfZ2FpbilcbiAgICAvL1xuICAgIC8vICAgb3NjX2JhbmsucHVzaChvc2MpXG4gICAgLy8gICBmaWx0ZXJfYmFuay5wdXNoKGZpbHRlcilcbiAgICAvLyAgIGdhaW5fYmFuay5wdXNoKGdhaW4pXG4gICAgLy8gfSlcblxuXG5cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgdmFyIHNhbXBsZV9pZHggPSAwXG4gICAgdmFyIGJ1ZmZlclNpemUgPSAxNjM4NFxuICAgIHdpbmRvdy5zY3JpcHRQcm9jZXNzb3IgPSBjb250ZXh0LmNyZWF0ZVNjcmlwdFByb2Nlc3NvcihidWZmZXJTaXplLCAxLCAxKVxuXG4gICAgdmFyIGcgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKVxuICAgIGcuZ2Fpbi52YWx1ZSA9IDAuMlxuICAgIHZhciBvc2MgPSBjb250ZXh0LmNyZWF0ZU9zY2lsbGF0b3IoKVxuICAgIG9zYy5zdGFydCgwKVxuICAgIG9zYy5jb25uZWN0KHNjcmlwdFByb2Nlc3NvcilcbiAgICBzY3JpcHRQcm9jZXNzb3IuY29ubmVjdChhbmFseXNlcilcblxuICAgIC8vIEdpdmUgdGhlIG5vZGUgYSBmdW5jdGlvbiB0byBwcm9jZXNzIGF1ZGlvIGV2ZW50c1xuXG4gICAgLy8gdmFyIGZyZXFzID0gWzEwMDAsIDIwMDAsIDMwMDAsIDQwMDAsIDUwMDAsIDYwMDBdXG4gICAgdmFyIGZyZXFzX3J1bm5pbmdfaWR4ID0gWzAsIDBdXG5cbiAgICBzY3JpcHRQcm9jZXNzb3Iub25hdWRpb3Byb2Nlc3MgPSBmdW5jdGlvbiAoYXVkaW9Qcm9jZXNzaW5nRXZlbnQpIHtcblxuICAgICAgY29uc29sZS5sb2coJ2hlcmUnICsgYXVkaW9Qcm9jZXNzaW5nRXZlbnQub3V0cHV0QnVmZmVyLmxlbmd0aClcblxuICAgICAgLy8gVGhlIGlucHV0IGJ1ZmZlciBpcyB0aGUgc29uZyB3ZSBsb2FkZWQgZWFybGllclxuICAgICAgdmFyIGlucHV0QnVmZmVyID0gYXVkaW9Qcm9jZXNzaW5nRXZlbnQuaW5wdXRCdWZmZXI7XG5cbiAgICAgIC8vIFRoZSBvdXRwdXQgYnVmZmVyIGNvbnRhaW5zIHRoZSBzYW1wbGVzIHRoYXQgd2lsbCBiZSBtb2RpZmllZCBhbmQgcGxheWVkXG4gICAgICB2YXIgb3V0cHV0QnVmZmVyID0gYXVkaW9Qcm9jZXNzaW5nRXZlbnQub3V0cHV0QnVmZmVyO1xuXG4gICAgICAvLyBMb29wIHRocm91Z2ggdGhlIG91dHB1dCBjaGFubmVscyAoaW4gdGhpcyBjYXNlIHRoZXJlIGlzIG9ubHkgb25lKVxuICAgICAgZm9yICh2YXIgY2hhbm5lbCA9IDA7IGNoYW5uZWwgPCBvdXRwdXRCdWZmZXIubnVtYmVyT2ZDaGFubmVsczsgY2hhbm5lbCsrKSB7XG5cbiAgICAgICAgdmFyIGlucHV0RGF0YSA9IGlucHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKGNoYW5uZWwpO1xuICAgICAgICB2YXIgb3V0cHV0RGF0YSA9IG91dHB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YShjaGFubmVsKTtcblxuICAgICAgICB2YXIgbXVsdGlcbiAgICAgICAgZm9yICh2YXIgc2FtcGxlID0gMDsgc2FtcGxlIDwgaW5wdXRCdWZmZXIubGVuZ3RoOyBzYW1wbGUrKykge1xuXG4gICAgICAgICAgb3V0cHV0RGF0YVtzYW1wbGVdID0gMFxuXG4gICAgICAgICAgcHJvZ3JhbW1lZF9mcmVxcy5mb3JFYWNoKGZ1bmN0aW9uIChoeiwgaWR4KSB7XG4gICAgICAgICAgICBtdWx0aSA9IChjb250ZXh0LnNhbXBsZVJhdGUgLyAyKSAvIGh6IC8gTWF0aC5QSVxuICAgICAgICAgICAgb3V0cHV0RGF0YVtzYW1wbGVdICs9IE1hdGguc2luKHNhbXBsZV9pZHggLyBtdWx0aSlcbiAgICAgICAgICAgIGZyZXFzX3J1bm5pbmdfaWR4W2lkeF0rK1xuICAgICAgICAgIH0pXG5cbiAgICAgICAgICBvdXRwdXREYXRhW3NhbXBsZV0gKj0gMSAvIChwcm9ncmFtbWVkX2ZyZXFzLmxlbmd0aCArIDEpXG5cbiAgICAgICAgICBzYW1wbGVfaWR4KytcblxuICAgICAgICAgIC8vIGRldGVybWluZSB3aGF0IGJpdHMgbmVlZCB0byBiZSBlbmNvZGVkXG5cblxuICAgICAgICB9XG5cbiAgICAgIH1cblxuXG4gICAgfVxuXG5cblxuICB9XG5cbiAgLy8gZW5jb2RlclxuXG4gIC8vIHJlY2VpdmVyXG5cbiAgLy8gZGVjb2RlclxuICB2YXIgYW5hbHlzZXJcbiAgdmFyIGFuYWx5c2lzVGltZUJ1ZmZlclxuICB2YXIgYW5hbHlzaXNGcmVxdWVuY3lCdWZmZXJcblxuICB2YXIgcGVha3MgPSBbXVxuXG4gIGZ1bmN0aW9uIHNldHVwX2FuYWx5c2VyKCkge1xuXG4gICAgY29uc29sZS5sb2coaWQgKyAnXFx0JyArICdzZXR0aW5nIHVwIGFuYWx5c2VyJylcblxuICAgIGFuYWx5c2VyID0gY29udGV4dC5jcmVhdGVBbmFseXNlcigpXG4gICAgYW5hbHlzZXIuZmZ0U2l6ZSA9IDEwMjRcbiAgICBhbmFseXNlci5zbW9vdGhpbmdUaW1lQ29uc3RhbnQgPSAwLjAwXG5cbiAgICBhbmFseXNpc1RpbWVCdWZmZXIgPSBuZXcgVWludDhBcnJheShhbmFseXNlci5mcmVxdWVuY3lCaW5Db3VudClcbiAgICBhbmFseXNpc0ZyZXF1ZW5jeUJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KGFuYWx5c2VyLmZyZXF1ZW5jeUJpbkNvdW50KVxuXG4gICAgb3NjX2JhbmsuZm9yRWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICBwZWFrcy5wdXNoKDApXG4gICAgfSlcblxuICB9XG5cbiAgZnVuY3Rpb24gYW5hbHlzZSgpIHtcbiAgICBhbmFseXNlci5nZXRCeXRlVGltZURvbWFpbkRhdGEoYW5hbHlzaXNUaW1lQnVmZmVyKVxuICAgIGFuYWx5c2VyLmdldEJ5dGVGcmVxdWVuY3lEYXRhKGFuYWx5c2lzRnJlcXVlbmN5QnVmZmVyKVxuICAgIGZpbGxfcGVha3MoKVxuICB9XG5cbiAgZnVuY3Rpb24gZmlsbF9wZWFrcygpIHtcblxuICAgIHByb2dyYW1tZWRfZnJlcXMuZm9yRWFjaChmdW5jdGlvbiAoaHosIG9zY19pZHgpIHtcbiAgICAgIHBlYWtzW29zY19pZHhdID0gZ2V0RnJlcXVlbmN5VmFsdWUoaHopXG4gICAgfSlcblxuICAgIGZ1bmN0aW9uIGdldEZyZXF1ZW5jeVZhbHVlKGZyZXF1ZW5jeSkge1xuICAgICAgdmFyIG55cXVpc3QgPSBjb250ZXh0LnNhbXBsZVJhdGUgLyAyO1xuICAgICAgdmFyIGluZGV4ID0gTWF0aC5yb3VuZChmcmVxdWVuY3kgLyBueXF1aXN0ICogYW5hbHlzaXNGcmVxdWVuY3lCdWZmZXIubGVuZ3RoKTtcbiAgICAgIHJldHVybiBhbmFseXNpc0ZyZXF1ZW5jeUJ1ZmZlcltpbmRleF07XG4gICAgfVxuXG4gICAgd2luZG93LmdmID0gZ2V0RnJlcXVlbmN5VmFsdWVcblxuICB9XG5cblxuICBmdW5jdGlvbiBnZXRfaW50ZXJmYWNlcygpIHtcbiAgICByZXR1cm4ge1xuICAgICAgYW5hbHlzZXI6IGFuYWx5c2VyLFxuICAgICAgZ2Fpbl9iYW5rOiBnYWluX2JhbmssXG4gICAgICBtYXN0ZXJfZ2FpbjogbWFzdGVyX2dhaW4sXG4gICAgICBvc2NfYmFuazogb3NjX2JhbmssXG4gICAgICBwZWFrczogcGVha3NcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRfYnVmZmVycygpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGltZTogYW5hbHlzaXNUaW1lQnVmZmVyLFxuICAgICAgZnJlcTogYW5hbHlzaXNGcmVxdWVuY3lCdWZmZXJcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGFuYWx5c2U6IGFuYWx5c2UsXG4gICAgc2V0dXBfYW5hbHlzZXI6IHNldHVwX2FuYWx5c2VyLFxuICAgIHNldHVwX3RyYW5zbWl0dGVyOiBzZXR1cF90cmFuc21pdHRlcixcbiAgICBnZXRfYnVmZmVyczogZ2V0X2J1ZmZlcnMsXG4gICAgZ2V0X2ludGVyZmFjZXM6IGdldF9pbnRlcmZhY2VzXG4gIH1cblxufVxuIiwibW9kdWxlLmV4cG9ydHMudmlld19jb250cm9sbGVyID0gdmlld19jb250cm9sbGVyXG5cbmZ1bmN0aW9uIHZpZXdfY29udHJvbGxlcihkaXZfaWQpIHtcblxuICBcInVzZSBzdHJpY3RcIjtcblxuICB2YXIgbmFtZSA9IGRpdl9pZFxuXG4gIHZhciBhZ2VudFxuICB2YXIgcGFyZW50ID0gZDMuc2VsZWN0KCdkaXYjJyArIGRpdl9pZClcblxuICAvLyBkaXNwbGF5XG4gIC8vICAgIGN1cnJlbnQgc3RhdGVcbiAgLy8gICAgc3luYyBjb3VudFxuICAvLyAgICBvc2NpbGxvc2NvcGUgb2Ygb3V0cHV0ICYgaW5wdXRcbiAgLy8gICAgZmZ0IGJhcnMgb2Ygb3V0cHV0ICYgaW5wdXRcbiAgLy8gICAgY3VycmVudCBiYXVkXG4gIC8vICAgIHJ4IGJ1ZmZlclxuXG4gIHZhciBzdmdcbiAgdmFyIGRpdl9zeW5jX2NvdW50XG4gIHZhciBzeW5jX2luZGljYXRvclxuICB2YXIgZGl2X3J4X2J1ZmZlclxuICB2YXIgZGl2X2JhdWRfbWV0ZXJcbiAgdmFyIGJhcnMgPSBbXVxuICB2YXIgY2lyY2xlcyA9IFtdXG5cbiAgdmFyIFdJRFRIID0gMTAyNFxuICB2YXIgSEVJR0hUID0gMjU2XG5cbiAgdmFyIGJhcldpZHRoXG4gIHZhciBidWZmZXJMZW5ndGhcblxuICB2YXIgb3RoZXJfYnVmZmVyc1xuXG4gIC8vIGNyZWF0ZSBzdmdcbiAgZnVuY3Rpb24gc2V0dXBfc3ZnKCkge1xuXG4gICAgY29uc29sZS5sb2coJ2NhbGxpbmcgc2V0dXBfc3ZnJylcblxuICAgIC8vIHZhciBzdGF0ZSA9IGFnZW50LmdldF9zdGF0ZSgpXG5cbiAgICBXSURUSCA9IGJ1ZmZlckxlbmd0aFxuICAgIEhFSUdIVCA9IFdJRFRIIC8gNFxuXG4gICAgYmFyV2lkdGggPSAoV0lEVEggLyBidWZmZXJMZW5ndGgpXG5cbiAgICBwYXJlbnQuYXBwZW5kKCdoMScpLmF0dHIoJ2NsYXNzJywgJ3RleHQtY2VudGVyJykuaHRtbChuYW1lKVxuXG4gICAgc3ZnID0gcGFyZW50LmFwcGVuZCgnc3ZnJylcbiAgICAgIC5hdHRyKCdjbGFzcycsICdpbWctcmVzcG9uc2l2ZScpXG4gICAgICAuYXR0cignd2lkdGgnLCAnMTAwJScpXG4gICAgICAvLyAuYXR0cignaGVpZ2h0JywgSEVJR0hUKVxuICAgICAgLmF0dHIoJ3ByZXNlcnZlQXNwZWN0UmF0aW8nLCAneE1pZFlNaWQnKVxuICAgICAgLmF0dHIoJ3ZpZXdCb3gnLCAnMCAwICcgKyBXSURUSCArICcgJyArIEhFSUdIVClcbiAgICAgIC5zdHlsZSgnYmFja2dyb3VuZC1jb2xvcicsICdyZ2JhKDAsMCwwLDAuMSknKVxuXG4gICAgc3ZnLmFwcGVuZCgndGV4dCcpXG4gICAgICAudGV4dCgncmVjZWl2ZXIgc3BlY3RydW0nKVxuICAgICAgLmF0dHIoJ3gnLCBXSURUSClcbiAgICAgIC5hdHRyKCd5JywgMTIpXG4gICAgICAuYXR0cignZHgnLCAnLTRweCcpXG4gICAgICAuc3R5bGUoJ2ZvbnQtc2l6ZScsIDEyKVxuICAgICAgLnN0eWxlKCd0ZXh0LWFuY2hvcicsICdlbmQnKVxuICAgICAgLmF0dHIoJ2ZpbGwnLCAncmdiYSgwLDAsMCwwLjEpJylcblxuICAgIGJhcnMgPSBbXVxuICAgIGZvciAodmFyIHN2Z2JhcnMgPSAwOyBzdmdiYXJzIDwgYnVmZmVyTGVuZ3RoOyBzdmdiYXJzKyspIHtcbiAgICAgIHZhciBiYXIgPSBzdmcuYXBwZW5kKCdyZWN0JylcbiAgICAgICAgLmF0dHIoJ3gnLCBiYXJXaWR0aCAqIHN2Z2JhcnMpXG4gICAgICAgIC5hdHRyKCd5JywgMClcbiAgICAgICAgLmF0dHIoJ3dpZHRoJywgYmFyV2lkdGgpXG4gICAgICAgIC5hdHRyKCdoZWlnaHQnLCAwKVxuICAgICAgICAuYXR0cignZmlsbCcsICdncmVlbicpXG4gICAgICAgIC5hdHRyKCdzdHJva2UnLCAnbm9uZScpXG5cbiAgICAgIHZhciBjaXJjbGUgPSBzdmcuYXBwZW5kKCdjaXJjbGUnKVxuICAgICAgICAuYXR0cignY3gnLCBiYXJXaWR0aCAqIHN2Z2JhcnMpXG4gICAgICAgIC5hdHRyKCdjeScsIDApXG4gICAgICAgIC5hdHRyKCdyJywgYmFyV2lkdGgpXG4gICAgICAgIC5hdHRyKCdmaWxsJywgJ3JlZCcpXG5cblxuICAgICAgdmFyIGJhcl9pZHggPSBzdmdiYXJzXG4gICAgICAgIC8vIGJhci5vbignbW91c2VvdmVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyAgIGNvbnNvbGUubG9nKGJhcl9pZHgpXG4gICAgICAgIC8vIH0pXG5cbiAgICAgIGJhcnMucHVzaChiYXIpXG4gICAgICBjaXJjbGVzLnB1c2goY2lyY2xlKVxuICAgIH1cblxuICAgIHJldHVybjtcblxuICAgIC8vIHN5bmMgY291bnRcbiAgICBkaXZfc3luY19jb3VudCA9IHBhcmVudC5hcHBlbmQoJ2RpdicpXG4gICAgICAuYXR0cignY2xhc3MnLCAnY29sLW1kLTQnKVxuICAgICAgLnN0eWxlKCdvdXRsaW5lJywgJzFweCBkb3R0ZWQgcmdiYSgwLDAsMCwwLjEpJylcblxuICAgIGRpdl9zeW5jX2NvdW50LmFwcGVuZCgnaDQnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlcicpLmh0bWwoJ3N5bmNocm9uaXphdGlvbiBjb3VudHMnKVxuICAgIHN5bmNfaW5kaWNhdG9yID0gZGl2X3N5bmNfY291bnQuYXBwZW5kKCdkaXYnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlciBzeW5jX2NvdW50JylcblxuICAgIC8vIGJhdWQgbWV0ZXJcbiAgICB2YXIgcGFyZW50X2JhdWRfbWV0ZXIgPSBwYXJlbnQuYXBwZW5kKCdkaXYnKS5hdHRyKCdjbGFzcycsICdjb2wtbWQtNCcpXG4gICAgICAuc3R5bGUoJ291dGxpbmUnLCAnMXB4IGRvdHRlZCByZ2JhKDAsMCwwLDAuMSknKVxuXG4gICAgcGFyZW50X2JhdWRfbWV0ZXIuYXBwZW5kKCdoNCcpLmF0dHIoJ2NsYXNzJywgJ3RleHQtY2VudGVyJykuaHRtbCgnYmF1ZCcpXG4gICAgZGl2X2JhdWRfbWV0ZXIgPSBwYXJlbnRfYmF1ZF9tZXRlci5hcHBlbmQoJ2RpdicpLmF0dHIoJ2NsYXNzJywgJ3RleHQtY2VudGVyJylcblxuXG4gICAgdmFyIHBhcmVudF9pbnB1dF9zbGlkZXIgPSBwYXJlbnQuYXBwZW5kKCdkaXYnKS5hdHRyKCdjbGFzcycsICdjb2wtbWQtNCcpXG5cbiAgICBwYXJlbnRfaW5wdXRfc2xpZGVyLmFwcGVuZCgnaDQnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlcicpLmh0bWwoJ3RyYW5zbWl0dGVyIHZvbHVtZScpXG5cbiAgICB2YXIgc2xpZGVyX2l0c2VsZiA9IHBhcmVudF9pbnB1dF9zbGlkZXIuYXBwZW5kKCdpbnB1dCcpLmF0dHIoJ3R5cGUnLCAncmFuZ2UnKVxuICAgICAgLmF0dHIoJ21pbicsIDAuMClcbiAgICAgIC5hdHRyKCdtYXgnLCAxMDAuMClcbiAgICAgIC5hdHRyKCd2YWx1ZScsIDAuMClcblxuICAgIHNsaWRlcl9pdHNlbGYub24oJ2lucHV0JywgZnVuY3Rpb24gKCkge1xuICAgICAgLy8gY29uc29sZS5sb2coZDMuZXZlbnQpXG4gICAgICB2YXIgdiA9IGQzLnNlbGVjdCh0aGlzKS5ub2RlKCkudmFsdWVcbiAgICAgIGFnZW50LnNldF92b2x1bWUodiAvIDEwMC4wKVxuICAgIH0pXG5cbiAgICAvLyBtZXNzYWdlIHRvIHNlbmRcbiAgICB2YXIgcGFyZW50X21lc3NhZ2VfdG9fc2VuZCA9IHBhcmVudC5hcHBlbmQoJ2RpdicpLmF0dHIoJ2NsYXNzJywgJ2NvbC1tZC0xMicpXG5cbiAgICBwYXJlbnRfbWVzc2FnZV90b19zZW5kLmFwcGVuZCgnaDQnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlcicpLmh0bWwoJ3NlbmRpbmcgdGhpcyBtZXNzYWdlJylcblxuICAgIHZhciBpbnB1dF9maWVsZCA9IHBhcmVudF9tZXNzYWdlX3RvX3NlbmQuYXBwZW5kKCdpbnB1dCcpXG4gICAgICAuYXR0cigndHlwZScsICd0ZXh0JylcbiAgICAgIC5hdHRyKCdjbGFzcycsICdtc2dfaW5wdXQnKVxuXG4gICAgLy8gaW5wdXRfZmllbGQubm9kZSgpLnZhbHVlID0gc3RhdGUuTUVTU0FHRVxuXG4gICAgaW5wdXRfZmllbGQub24oJ2tleXVwJywgZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHYgPSBpbnB1dF9maWVsZC5ub2RlKCkudmFsdWVcbiAgICAgIGlmICh2ID09PSAnJykge1xuICAgICAgICB2ID0gJyAnXG4gICAgICB9XG5cbiAgICAgIGFnZW50LnNldF9tZXNzYWdlKHYpXG4gICAgfSlcblxuICAgIC8vIHJ4IGJ1ZmZlclxuICAgIHZhciBkaXZfcnhfYnVmZmVyX3BhcmVudCA9IHBhcmVudC5hcHBlbmQoJ2RpdicpXG4gICAgICAuYXR0cignY2xhc3MnLCAnY29sLW1kLTEyJylcblxuICAgIGRpdl9yeF9idWZmZXJfcGFyZW50LmFwcGVuZCgnaDQnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlcicpLmh0bWwoJ3J4IGJ1ZmZlcicpXG5cbiAgICBkaXZfcnhfYnVmZmVyID0gZGl2X3J4X2J1ZmZlcl9wYXJlbnQuYXBwZW5kKCdwcmUnKS5hdHRyKCdjbGFzcycsICdyeF9idWZmZXInKVxuXG4gIH1cblxuICBmdW5jdGlvbiBjb25uZWN0KHJlbW90ZV9hZ2VudCkge1xuICAgIGFnZW50ID0gcmVtb3RlX2FnZW50XG4gICAgb3RoZXJfYnVmZmVycyA9IHJlbW90ZV9hZ2VudC5nZXRfYnVmZmVycygpXG4gICAgYnVmZmVyTGVuZ3RoID0gb3RoZXJfYnVmZmVycy50aW1lLmxlbmd0aFxuICB9XG5cbiAgZnVuY3Rpb24gdGljayhkcmF3X2JhcnMpIHtcblxuICAgIGlmIChkcmF3X2JhcnMgPT09IHRydWUpIHtcbiAgICAgIHZhciBkYXRhQXJyYXkgPSBvdGhlcl9idWZmZXJzLmZyZXFcbiAgICAgIHZhciBkYXRhQXJyYXlUID0gb3RoZXJfYnVmZmVycy50aW1lXG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYnVmZmVyTGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYmFyc1tpXS5hdHRyKCdoZWlnaHQnLCAoZGF0YUFycmF5W2ldIC8gMjU1KSAqIEhFSUdIVClcbiAgICAgICAgY2lyY2xlc1tpXS5hdHRyKCdjeScsIChkYXRhQXJyYXlUW2ldIC8gMjU1KSAqIEhFSUdIVClcblxuICAgICAgfVxuXG4gICAgfVxuXG4gIH1cblxuICByZXR1cm4ge1xuICAgIHNldHVwX3N2Zzogc2V0dXBfc3ZnLFxuICAgIHRpY2s6IHRpY2ssXG4gICAgY29ubmVjdDogY29ubmVjdFxuICB9XG5cbn1cbiJdfQ==
