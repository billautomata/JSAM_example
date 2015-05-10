(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var scriptProcessor
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

  var bufferSize = 16384
  scriptProcessor = context.createScriptProcessor(bufferSize, 1, 1)

  var g = context.createGain()
  g.gain.value = 0.2
  ifaces.master_gain.connect(scriptProcessor)
  scriptProcessor.connect(g)
  g.connect(ifaces.analyser)
    // scriptProcessor.connect(context.destination)

  // Give the node a function to process audio events

  var freqs = [1000, 2000]

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

        freqs.forEach(function(hz){
          multi = (context.sampleRate/2) / hz / Math.PI
          outputData[sample] += Math.sin(sample_idx / multi)
        })

        outputData[sample] *= 1/freqs.length

        sample_idx++

        if(sample_idx % (44100/2) === 0){
          freqs[1] = Math.random() * 1000 + 3000
          console.log(Date.now()-_t)
          _t = Date.now()
        }

      }

    }


  }

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


    ifaces.gain_bank.forEach(function (gb) {
      if (Math.random() > 0.5) {
        gb.gain.value = 0
      } else {
        gb.gain.value = 0.1
      }
    })


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

function modem(options){

  var id = options.id
  var name = options.name
  var type = options.type


  var programmed_freqs = (function create_frequencies(){

    var n_oscs = 10
    var return_array = []
    do{
      return_array.push(n_oscs*1000 + 1000)
    } while(--n_oscs)
    return return_array
  })()

  programmed_freqs = [1000,2000]


  // transmitter
  var osc_bank = []
  var filter_bank = []
  var gain_bank = []
  var master_gain

  // mic

  function setup_transmitter(){

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

    programmed_freqs.forEach(function(hz){
      var osc = context.createOscillator()

      osc.type = 'sine'
      osc.frequency.value = hz

      var filter = context.createBiquadFilter()
      var gain = context.createGain()

      osc.start(0)

      osc.connect(gain)
      gain.connect(master_gain)

      osc_bank.push(osc)
      filter_bank.push(filter)
      gain_bank.push(gain)
    })

  }

  // encoder

  // receiver

  // decoder
  var analyser
  var analysisTimeBuffer
  var analysisFrequencyBuffer

  var peaks = []

  function setup_analyser(){

    console.log(id + '\t' + 'setting up analyser')

    analyser = context.createAnalyser()
    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0.00

    analysisTimeBuffer = new Uint8Array(analyser.frequencyBinCount)
    analysisFrequencyBuffer = new Uint8Array(analyser.frequencyBinCount)

    osc_bank.forEach(function(){
      peaks.push(0)
    })

  }

  function analyse(){
    analyser.getByteTimeDomainData(analysisTimeBuffer)
    analyser.getByteFrequencyData(analysisFrequencyBuffer)
    fill_peaks()
  }

  function fill_peaks(){

    programmed_freqs.forEach(function(hz,osc_idx){
      peaks[osc_idx] = getFrequencyValue(hz)
    })

    function getFrequencyValue(frequency) {
      var nyquist = context.sampleRate/2;
      var index = Math.round(frequency/nyquist * analysisFrequencyBuffer.length);
      return analysisFrequencyBuffer[index];
    }

    window.gf = getFrequencyValue

  }


  function get_interfaces(){
    return {
      analyser: analyser,
      gain_bank: gain_bank,
      master_gain: master_gain,
      osc_bank: osc_bank,
      peaks: peaks
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9sZWFybmluZ19tYWluLmpzIiwianMvbW9kZW0uanMiLCJqcy9tb2RlbV92aWV3LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbk1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgc2NyaXB0UHJvY2Vzc29yXG53aW5kb3cuc3RhcnRfdGltZVxuXG53aW5kb3cub25sb2FkID0gZnVuY3Rpb24gKCkge1xuXG5cblxuICB2YXIgc2FtcGxlX2lkeCA9IDBcbiAgc3RhcnRfdGltZSA9IDBcbiAgdmFyIF90ID0gRGF0ZS5ub3coKVxuXG4gIC8vIGNvbnNvbGUubG9nID0gZnVuY3Rpb24oKXt9XG5cbiAgdmFyIE1vZGVtID0gcmVxdWlyZSgnLi9tb2RlbS5qcycpXG4gIHZhciBWaWV3X0NvbnRyb2xsZXIgPSByZXF1aXJlKCcuL21vZGVtX3ZpZXcuanMnKVxuXG4gIHZhciBtb2RlbSA9IE1vZGVtLm1vZGVtKHtcbiAgICBuYW1lOiAnbW9kZW0nLFxuICAgIHR5cGU6ICdub3JteScsXG4gICAgaWQ6ICdtb2RlbUEnXG4gIH0pXG5cbiAgbW9kZW0uc2V0dXBfYW5hbHlzZXIoKVxuICBtb2RlbS5hbmFseXNlKClcblxuICBtb2RlbS5zZXR1cF90cmFuc21pdHRlcigpXG5cbiAgdmFyIGlmYWNlcyA9IG1vZGVtLmdldF9pbnRlcmZhY2VzKClcblxuICBpZmFjZXMuZ2Fpbl9iYW5rLmZvckVhY2goZnVuY3Rpb24gKGIpIHtcbiAgICBiLmdhaW4udmFsdWUgPSAwLjFcbiAgICAgIC8vIGIuY29ubmVjdChpZmFjZXMuYW5hbHlzZXIpXG4gIH0pXG5cbiAgdmFyIGFuYWx5c2VyID0gaWZhY2VzLmFuYWx5c2VyXG4gIHZhciBmcmVxRG9tYWluID0gbmV3IEZsb2F0MzJBcnJheShhbmFseXNlci5mcmVxdWVuY3lCaW5Db3VudCk7XG4gIHZhciBmcmVxRG9tYWluQiA9IG5ldyBVaW50OEFycmF5KGFuYWx5c2VyLmZyZXF1ZW5jeUJpbkNvdW50KTtcblxuICB3aW5kb3cuZ2YgPSBmdW5jdGlvbiBnZXRGcmVxdWVuY3lWYWx1ZShmcmVxdWVuY3kpIHtcbiAgICBhbmFseXNlci5nZXRGbG9hdEZyZXF1ZW5jeURhdGEoZnJlcURvbWFpbik7XG4gICAgYW5hbHlzZXIuZ2V0Qnl0ZUZyZXF1ZW5jeURhdGEoZnJlcURvbWFpbkIpO1xuXG4gICAgdmFyIG55cXVpc3QgPSBjb250ZXh0LnNhbXBsZVJhdGUgLyAyO1xuICAgIHZhciBpbmRleCA9IE1hdGgucm91bmQoZnJlcXVlbmN5IC8gbnlxdWlzdCAqIGZyZXFEb21haW4ubGVuZ3RoKTtcbiAgICByZXR1cm4gZnJlcURvbWFpbltpbmRleF07XG4gIH1cblxuICB3aW5kb3cucmVjb3JkZXIgPSBuZXcgUmVjb3JkZXIoaWZhY2VzLm1hc3Rlcl9nYWluKVxuXG4gIGlmYWNlcy5tYXN0ZXJfZ2Fpbi5jb25uZWN0KGlmYWNlcy5hbmFseXNlcilcblxuICB2YXIgZGlzcGxheV9ib2IgPSBWaWV3X0NvbnRyb2xsZXIudmlld19jb250cm9sbGVyKCd0ZXN0X21vZGVtJylcbiAgZGlzcGxheV9ib2IuY29ubmVjdChtb2RlbSlcbiAgZGlzcGxheV9ib2Iuc2V0dXBfc3ZnKClcblxuICB2YXIgYnVmZmVyU2l6ZSA9IDE2Mzg0XG4gIHNjcmlwdFByb2Nlc3NvciA9IGNvbnRleHQuY3JlYXRlU2NyaXB0UHJvY2Vzc29yKGJ1ZmZlclNpemUsIDEsIDEpXG5cbiAgdmFyIGcgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKVxuICBnLmdhaW4udmFsdWUgPSAwLjJcbiAgaWZhY2VzLm1hc3Rlcl9nYWluLmNvbm5lY3Qoc2NyaXB0UHJvY2Vzc29yKVxuICBzY3JpcHRQcm9jZXNzb3IuY29ubmVjdChnKVxuICBnLmNvbm5lY3QoaWZhY2VzLmFuYWx5c2VyKVxuICAgIC8vIHNjcmlwdFByb2Nlc3Nvci5jb25uZWN0KGNvbnRleHQuZGVzdGluYXRpb24pXG5cbiAgLy8gR2l2ZSB0aGUgbm9kZSBhIGZ1bmN0aW9uIHRvIHByb2Nlc3MgYXVkaW8gZXZlbnRzXG5cbiAgdmFyIGZyZXFzID0gWzEwMDAsIDIwMDBdXG5cbiAgc2NyaXB0UHJvY2Vzc29yLm9uYXVkaW9wcm9jZXNzID0gZnVuY3Rpb24gKGF1ZGlvUHJvY2Vzc2luZ0V2ZW50KSB7XG5cbiAgICBjb25zb2xlLmxvZygnaGVyZScgKyBhdWRpb1Byb2Nlc3NpbmdFdmVudC5vdXRwdXRCdWZmZXIubGVuZ3RoKVxuXG4gICAgLy8gVGhlIGlucHV0IGJ1ZmZlciBpcyB0aGUgc29uZyB3ZSBsb2FkZWQgZWFybGllclxuICAgIHZhciBpbnB1dEJ1ZmZlciA9IGF1ZGlvUHJvY2Vzc2luZ0V2ZW50LmlucHV0QnVmZmVyO1xuXG4gICAgLy8gVGhlIG91dHB1dCBidWZmZXIgY29udGFpbnMgdGhlIHNhbXBsZXMgdGhhdCB3aWxsIGJlIG1vZGlmaWVkIGFuZCBwbGF5ZWRcbiAgICB2YXIgb3V0cHV0QnVmZmVyID0gYXVkaW9Qcm9jZXNzaW5nRXZlbnQub3V0cHV0QnVmZmVyO1xuXG4gICAgLy8gTG9vcCB0aHJvdWdoIHRoZSBvdXRwdXQgY2hhbm5lbHMgKGluIHRoaXMgY2FzZSB0aGVyZSBpcyBvbmx5IG9uZSlcbiAgICBmb3IgKHZhciBjaGFubmVsID0gMDsgY2hhbm5lbCA8IG91dHB1dEJ1ZmZlci5udW1iZXJPZkNoYW5uZWxzOyBjaGFubmVsKyspIHtcblxuICAgICAgdmFyIGlucHV0RGF0YSA9IGlucHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKGNoYW5uZWwpO1xuICAgICAgdmFyIG91dHB1dERhdGEgPSBvdXRwdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoY2hhbm5lbCk7XG5cbiAgICAgIHZhciBtdWx0aVxuICAgICAgZm9yICh2YXIgc2FtcGxlID0gMDsgc2FtcGxlIDwgaW5wdXRCdWZmZXIubGVuZ3RoOyBzYW1wbGUrKykge1xuXG4gICAgICAgIG91dHB1dERhdGFbc2FtcGxlXSA9IDBcblxuICAgICAgICBmcmVxcy5mb3JFYWNoKGZ1bmN0aW9uKGh6KXtcbiAgICAgICAgICBtdWx0aSA9IChjb250ZXh0LnNhbXBsZVJhdGUvMikgLyBoeiAvIE1hdGguUElcbiAgICAgICAgICBvdXRwdXREYXRhW3NhbXBsZV0gKz0gTWF0aC5zaW4oc2FtcGxlX2lkeCAvIG11bHRpKVxuICAgICAgICB9KVxuXG4gICAgICAgIG91dHB1dERhdGFbc2FtcGxlXSAqPSAxL2ZyZXFzLmxlbmd0aFxuXG4gICAgICAgIHNhbXBsZV9pZHgrK1xuXG4gICAgICAgIGlmKHNhbXBsZV9pZHggJSAoNDQxMDAvMikgPT09IDApe1xuICAgICAgICAgIGZyZXFzWzFdID0gTWF0aC5yYW5kb20oKSAqIDEwMDAgKyAzMDAwXG4gICAgICAgICAgY29uc29sZS5sb2coRGF0ZS5ub3coKS1fdClcbiAgICAgICAgICBfdCA9IERhdGUubm93KClcbiAgICAgICAgfVxuXG4gICAgICB9XG5cbiAgICB9XG5cblxuICB9XG5cbiAgdmFyIHVzZV9pbnRlcnZhbCA9IGZhbHNlXG4gIHZhciBpbnRlcnZhbF90aW1lID0gNTBcblxuICB3aW5kb3cuaW50ZXJ2YWxcblxuICB2YXIgbWVhbiA9IDE4MFxuXG4gIHZhciBuX2Vycm9ycyA9IDBcblxuICBmdW5jdGlvbiBpbnRlcnZhbF90aWNrKCkge1xuXG4gICAgLy8gY29uc29sZS5sb2coJy8vLy8nKVxuICAgIG1vZGVtLmFuYWx5c2UoKVxuICAgICAgLy9cbiAgICAgIC8vIGlmYWNlcy5wZWFrcy5mb3JFYWNoKGZ1bmN0aW9uKHBlYWtfdmFsdWUscGVha19pZHgpe1xuICAgICAgLy9cbiAgICAgIC8vICAgaWYoaWZhY2VzLmdhaW5fYmFua1twZWFrX2lkeF0uZ2Fpbi52YWx1ZSA+IDAgJiYgcGVha192YWx1ZSA8PSBtZWFuKXtcbiAgICAgIC8vICAgICBjb25zb2xlLmxvZyhwZWFrX3ZhbHVlKVxuICAgICAgLy8gICAgIGNvbnNvbGUubG9nKCdlcnIgdG9vIGxvdyEhISEnICsgcGVha19pZHgrJyAnK25fZXJyb3JzKVxuICAgICAgLy8gICAgIG5fZXJyb3JzICsrXG4gICAgICAvLyAgIH1cbiAgICAgIC8vICAgaWYoaWZhY2VzLmdhaW5fYmFua1twZWFrX2lkeF0uZ2Fpbi52YWx1ZSA9PT0gMC4wICYmIHBlYWtfdmFsdWUgPiBtZWFuKXtcbiAgICAgIC8vICAgICBjb25zb2xlLmxvZyhwZWFrX3ZhbHVlKVxuICAgICAgLy8gICAgIGNvbnNvbGUubG9nKCdlcnIgdG9vIGhpZ2ghISEhJyArIHBlYWtfaWR4KycgJytuX2Vycm9ycylcbiAgICAgIC8vICAgICBuX2Vycm9ycyArK1xuICAgICAgLy8gICB9XG4gICAgICAvL1xuICAgICAgLy8gfSlcblxuICAgIC8vIGNvbnNvbGUubG9nKGlmYWNlcy5wZWFrcylcbiAgICAvLyB2YXIgcGVha3MgPSBtb2RlbS5nZXRfaW50ZXJmYWNlcygpLnBlYWtzXG5cblxuICAgIGRpc3BsYXlfYm9iLnRpY2sodHJ1ZSlcblxuICAgIGlmICghdXNlX2ludGVydmFsKSB7XG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGludGVydmFsX3RpY2spXG4gICAgfVxuXG5cbiAgICBpZmFjZXMuZ2Fpbl9iYW5rLmZvckVhY2goZnVuY3Rpb24gKGdiKSB7XG4gICAgICBpZiAoTWF0aC5yYW5kb20oKSA+IDAuNSkge1xuICAgICAgICBnYi5nYWluLnZhbHVlID0gMFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZ2IuZ2Fpbi52YWx1ZSA9IDAuMVxuICAgICAgfVxuICAgIH0pXG5cblxuICB9XG5cbiAgaWYgKCF1c2VfaW50ZXJ2YWwpIHtcbiAgICBpbnRlcnZhbF90aWNrKClcbiAgfSBlbHNlIHtcbiAgICB3aW5kb3cuaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChpbnRlcnZhbF90aWNrLCBpbnRlcnZhbF90aW1lKVxuICB9XG5cbiAgd2luZG93Lm0gPSBtb2RlbVxuXG4gIHJldHVybjtcblxufVxuXG5cblxuXG53aW5kb3cuY3JlYXRlRG93bmxvYWRMaW5rID0gZnVuY3Rpb24gY3JlYXRlRG93bmxvYWRMaW5rKCkge1xuICByZWNvcmRlciAmJiByZWNvcmRlci5leHBvcnRXQVYoZnVuY3Rpb24gKGJsb2IpIHtcbiAgICB2YXIgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbiAgICB2YXIgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xuICAgIHZhciBhdSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2F1ZGlvJyk7XG4gICAgdmFyIGhmID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuXG4gICAgYXUuY29udHJvbHMgPSB0cnVlO1xuICAgIGF1LnNyYyA9IHVybDtcbiAgICBoZi5ocmVmID0gdXJsO1xuICAgIGhmLmRvd25sb2FkID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpICsgJy53YXYnO1xuICAgIGhmLmlubmVySFRNTCA9IGhmLmRvd25sb2FkO1xuICAgIGxpLmFwcGVuZENoaWxkKGF1KTtcbiAgICBsaS5hcHBlbmRDaGlsZChoZik7XG4gICAgZDMuc2VsZWN0KCdib2R5JykuYXBwZW5kKCdkaXYnKS5ub2RlKCkuYXBwZW5kQ2hpbGQobGkpO1xuICB9KTtcbn1cbiIsIlwidXNlIHN0cmljdFwiO1xuXG4oZnVuY3Rpb24gc2V0dXBfZ2xvYmFsX2F1ZGlvX2NvbnRleHQoKSB7XG4gIGlmICh3aW5kb3cuY29udGV4dCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc29sZS5sb2coJ2NyZWF0aW5nIG5ldyB3aW5kb3cuQXVkaW9Db250ZXh0KCknKVxuICAgIHdpbmRvdy5BdWRpb0NvbnRleHQgPSAoXG4gICAgICB3aW5kb3cuQXVkaW9Db250ZXh0IHx8XG4gICAgICB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0IHx8XG4gICAgICB3aW5kb3cubW96QXVkaW9Db250ZXh0IHx8XG4gICAgICB3aW5kb3cubXNBdWRpb0NvbnRleHRcbiAgICApXG4gICAgd2luZG93LmNvbnRleHQgPSBuZXcgd2luZG93LkF1ZGlvQ29udGV4dCgpXG4gIH1cbn0pKClcblxubW9kdWxlLmV4cG9ydHMubW9kZW0gPSBtb2RlbVxuXG5mdW5jdGlvbiBtb2RlbShvcHRpb25zKXtcblxuICB2YXIgaWQgPSBvcHRpb25zLmlkXG4gIHZhciBuYW1lID0gb3B0aW9ucy5uYW1lXG4gIHZhciB0eXBlID0gb3B0aW9ucy50eXBlXG5cblxuICB2YXIgcHJvZ3JhbW1lZF9mcmVxcyA9IChmdW5jdGlvbiBjcmVhdGVfZnJlcXVlbmNpZXMoKXtcblxuICAgIHZhciBuX29zY3MgPSAxMFxuICAgIHZhciByZXR1cm5fYXJyYXkgPSBbXVxuICAgIGRve1xuICAgICAgcmV0dXJuX2FycmF5LnB1c2gobl9vc2NzKjEwMDAgKyAxMDAwKVxuICAgIH0gd2hpbGUoLS1uX29zY3MpXG4gICAgcmV0dXJuIHJldHVybl9hcnJheVxuICB9KSgpXG5cbiAgcHJvZ3JhbW1lZF9mcmVxcyA9IFsxMDAwLDIwMDBdXG5cblxuICAvLyB0cmFuc21pdHRlclxuICB2YXIgb3NjX2JhbmsgPSBbXVxuICB2YXIgZmlsdGVyX2JhbmsgPSBbXVxuICB2YXIgZ2Fpbl9iYW5rID0gW11cbiAgdmFyIG1hc3Rlcl9nYWluXG5cbiAgLy8gbWljXG5cbiAgZnVuY3Rpb24gc2V0dXBfdHJhbnNtaXR0ZXIoKXtcblxuICAgIGlmICh0eXBlID09PSAnbWljJykge1xuXG4gICAgICBuYXZpZ2F0b3IuZ2V0TWVkaWEgPSAoXG4gICAgICAgIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgfHxcbiAgICAgICAgbmF2aWdhdG9yLndlYmtpdEdldFVzZXJNZWRpYSB8fFxuICAgICAgICBuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhIHx8XG4gICAgICAgIG5hdmlnYXRvci5tc0dldFVzZXJNZWRpYVxuICAgICAgKTtcblxuICAgICAgbmF2aWdhdG9yLmdldE1lZGlhKFxuICAgICAgICAvLyBjb25zdHJhaW50czogYXVkaW8gYW5kIHZpZGVvIGZvciB0aGlzIGFwcFxuICAgICAgICB7XG4gICAgICAgICAgYXVkaW86IHRydWUsXG4gICAgICAgICAgdmlkZW86IGZhbHNlXG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gU3VjY2VzcyBjYWxsYmFja1xuICAgICAgICBmdW5jdGlvbiAoc3RyZWFtKSB7XG5cbiAgICAgICAgICB2YXIgc291cmNlID0gY29udGV4dC5jcmVhdGVNZWRpYVN0cmVhbVNvdXJjZShzdHJlYW0pO1xuICAgICAgICAgIHNvdXJjZS5jb25uZWN0KGFuYWx5c2VyKVxuICAgICAgICAgIENVUlJFTlRfU1RBVEUgPSAwXG4gICAgICAgICAgY29uc29sZS5sb2coJ2RvbmUgY29ubmVjdGluZyAnLCBuYW1lKVxuXG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gRXJyb3IgY2FsbGJhY2tcbiAgICAgICAgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdUaGUgZm9sbG93aW5nIGdVTSBlcnJvciBvY2N1cmVkOiAnICsgZXJyKTtcbiAgICAgICAgfVxuICAgICAgKTtcblxuICAgIH1cblxuICAgIG1hc3Rlcl9nYWluID0gY29udGV4dC5jcmVhdGVHYWluKClcbiAgICBtYXN0ZXJfZ2Fpbi5nYWluLnZhbHVlID0gMC4wXG5cbiAgICBwcm9ncmFtbWVkX2ZyZXFzLmZvckVhY2goZnVuY3Rpb24oaHope1xuICAgICAgdmFyIG9zYyA9IGNvbnRleHQuY3JlYXRlT3NjaWxsYXRvcigpXG5cbiAgICAgIG9zYy50eXBlID0gJ3NpbmUnXG4gICAgICBvc2MuZnJlcXVlbmN5LnZhbHVlID0gaHpcblxuICAgICAgdmFyIGZpbHRlciA9IGNvbnRleHQuY3JlYXRlQmlxdWFkRmlsdGVyKClcbiAgICAgIHZhciBnYWluID0gY29udGV4dC5jcmVhdGVHYWluKClcblxuICAgICAgb3NjLnN0YXJ0KDApXG5cbiAgICAgIG9zYy5jb25uZWN0KGdhaW4pXG4gICAgICBnYWluLmNvbm5lY3QobWFzdGVyX2dhaW4pXG5cbiAgICAgIG9zY19iYW5rLnB1c2gob3NjKVxuICAgICAgZmlsdGVyX2JhbmsucHVzaChmaWx0ZXIpXG4gICAgICBnYWluX2JhbmsucHVzaChnYWluKVxuICAgIH0pXG5cbiAgfVxuXG4gIC8vIGVuY29kZXJcblxuICAvLyByZWNlaXZlclxuXG4gIC8vIGRlY29kZXJcbiAgdmFyIGFuYWx5c2VyXG4gIHZhciBhbmFseXNpc1RpbWVCdWZmZXJcbiAgdmFyIGFuYWx5c2lzRnJlcXVlbmN5QnVmZmVyXG5cbiAgdmFyIHBlYWtzID0gW11cblxuICBmdW5jdGlvbiBzZXR1cF9hbmFseXNlcigpe1xuXG4gICAgY29uc29sZS5sb2coaWQgKyAnXFx0JyArICdzZXR0aW5nIHVwIGFuYWx5c2VyJylcblxuICAgIGFuYWx5c2VyID0gY29udGV4dC5jcmVhdGVBbmFseXNlcigpXG4gICAgYW5hbHlzZXIuZmZ0U2l6ZSA9IDEwMjRcbiAgICBhbmFseXNlci5zbW9vdGhpbmdUaW1lQ29uc3RhbnQgPSAwLjAwXG5cbiAgICBhbmFseXNpc1RpbWVCdWZmZXIgPSBuZXcgVWludDhBcnJheShhbmFseXNlci5mcmVxdWVuY3lCaW5Db3VudClcbiAgICBhbmFseXNpc0ZyZXF1ZW5jeUJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KGFuYWx5c2VyLmZyZXF1ZW5jeUJpbkNvdW50KVxuXG4gICAgb3NjX2JhbmsuZm9yRWFjaChmdW5jdGlvbigpe1xuICAgICAgcGVha3MucHVzaCgwKVxuICAgIH0pXG5cbiAgfVxuXG4gIGZ1bmN0aW9uIGFuYWx5c2UoKXtcbiAgICBhbmFseXNlci5nZXRCeXRlVGltZURvbWFpbkRhdGEoYW5hbHlzaXNUaW1lQnVmZmVyKVxuICAgIGFuYWx5c2VyLmdldEJ5dGVGcmVxdWVuY3lEYXRhKGFuYWx5c2lzRnJlcXVlbmN5QnVmZmVyKVxuICAgIGZpbGxfcGVha3MoKVxuICB9XG5cbiAgZnVuY3Rpb24gZmlsbF9wZWFrcygpe1xuXG4gICAgcHJvZ3JhbW1lZF9mcmVxcy5mb3JFYWNoKGZ1bmN0aW9uKGh6LG9zY19pZHgpe1xuICAgICAgcGVha3Nbb3NjX2lkeF0gPSBnZXRGcmVxdWVuY3lWYWx1ZShoeilcbiAgICB9KVxuXG4gICAgZnVuY3Rpb24gZ2V0RnJlcXVlbmN5VmFsdWUoZnJlcXVlbmN5KSB7XG4gICAgICB2YXIgbnlxdWlzdCA9IGNvbnRleHQuc2FtcGxlUmF0ZS8yO1xuICAgICAgdmFyIGluZGV4ID0gTWF0aC5yb3VuZChmcmVxdWVuY3kvbnlxdWlzdCAqIGFuYWx5c2lzRnJlcXVlbmN5QnVmZmVyLmxlbmd0aCk7XG4gICAgICByZXR1cm4gYW5hbHlzaXNGcmVxdWVuY3lCdWZmZXJbaW5kZXhdO1xuICAgIH1cblxuICAgIHdpbmRvdy5nZiA9IGdldEZyZXF1ZW5jeVZhbHVlXG5cbiAgfVxuXG5cbiAgZnVuY3Rpb24gZ2V0X2ludGVyZmFjZXMoKXtcbiAgICByZXR1cm4ge1xuICAgICAgYW5hbHlzZXI6IGFuYWx5c2VyLFxuICAgICAgZ2Fpbl9iYW5rOiBnYWluX2JhbmssXG4gICAgICBtYXN0ZXJfZ2FpbjogbWFzdGVyX2dhaW4sXG4gICAgICBvc2NfYmFuazogb3NjX2JhbmssXG4gICAgICBwZWFrczogcGVha3NcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRfYnVmZmVycygpe1xuICAgIHJldHVybiB7XG4gICAgICB0aW1lOiBhbmFseXNpc1RpbWVCdWZmZXIsXG4gICAgICBmcmVxOiBhbmFseXNpc0ZyZXF1ZW5jeUJ1ZmZlclxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgYW5hbHlzZTogYW5hbHlzZSxcbiAgICBzZXR1cF9hbmFseXNlcjogc2V0dXBfYW5hbHlzZXIsXG4gICAgc2V0dXBfdHJhbnNtaXR0ZXI6IHNldHVwX3RyYW5zbWl0dGVyLFxuICAgIGdldF9idWZmZXJzOiBnZXRfYnVmZmVycyxcbiAgICBnZXRfaW50ZXJmYWNlczogZ2V0X2ludGVyZmFjZXNcbiAgfVxuXG59XG4iLCJtb2R1bGUuZXhwb3J0cy52aWV3X2NvbnRyb2xsZXIgPSB2aWV3X2NvbnRyb2xsZXJcblxuZnVuY3Rpb24gdmlld19jb250cm9sbGVyKGRpdl9pZCkge1xuXG4gIFwidXNlIHN0cmljdFwiO1xuXG4gIHZhciBuYW1lID0gZGl2X2lkXG5cbiAgdmFyIGFnZW50XG4gIHZhciBwYXJlbnQgPSBkMy5zZWxlY3QoJ2RpdiMnICsgZGl2X2lkKVxuXG4gIC8vIGRpc3BsYXlcbiAgLy8gICAgY3VycmVudCBzdGF0ZVxuICAvLyAgICBzeW5jIGNvdW50XG4gIC8vICAgIG9zY2lsbG9zY29wZSBvZiBvdXRwdXQgJiBpbnB1dFxuICAvLyAgICBmZnQgYmFycyBvZiBvdXRwdXQgJiBpbnB1dFxuICAvLyAgICBjdXJyZW50IGJhdWRcbiAgLy8gICAgcnggYnVmZmVyXG5cbiAgdmFyIHN2Z1xuICB2YXIgZGl2X3N5bmNfY291bnRcbiAgdmFyIHN5bmNfaW5kaWNhdG9yXG4gIHZhciBkaXZfcnhfYnVmZmVyXG4gIHZhciBkaXZfYmF1ZF9tZXRlclxuICB2YXIgYmFycyA9IFtdXG4gIHZhciBjaXJjbGVzID0gW11cblxuICB2YXIgV0lEVEggPSAxMDI0XG4gIHZhciBIRUlHSFQgPSAyNTZcblxuICB2YXIgYmFyV2lkdGhcbiAgdmFyIGJ1ZmZlckxlbmd0aFxuXG4gIHZhciBvdGhlcl9idWZmZXJzXG5cbiAgLy8gY3JlYXRlIHN2Z1xuICBmdW5jdGlvbiBzZXR1cF9zdmcoKSB7XG5cbiAgICBjb25zb2xlLmxvZygnY2FsbGluZyBzZXR1cF9zdmcnKVxuXG4gICAgLy8gdmFyIHN0YXRlID0gYWdlbnQuZ2V0X3N0YXRlKClcblxuICAgIFdJRFRIID0gYnVmZmVyTGVuZ3RoXG4gICAgSEVJR0hUID0gV0lEVEggLyA0XG5cbiAgICBiYXJXaWR0aCA9IChXSURUSCAvIGJ1ZmZlckxlbmd0aClcblxuICAgIHBhcmVudC5hcHBlbmQoJ2gxJykuYXR0cignY2xhc3MnLCAndGV4dC1jZW50ZXInKS5odG1sKG5hbWUpXG5cbiAgICBzdmcgPSBwYXJlbnQuYXBwZW5kKCdzdmcnKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ2ltZy1yZXNwb25zaXZlJylcbiAgICAgIC5hdHRyKCd3aWR0aCcsICcxMDAlJylcbiAgICAgIC8vIC5hdHRyKCdoZWlnaHQnLCBIRUlHSFQpXG4gICAgICAuYXR0cigncHJlc2VydmVBc3BlY3RSYXRpbycsICd4TWlkWU1pZCcpXG4gICAgICAuYXR0cigndmlld0JveCcsICcwIDAgJyArIFdJRFRIICsgJyAnICsgSEVJR0hUKVxuICAgICAgLnN0eWxlKCdiYWNrZ3JvdW5kLWNvbG9yJywgJ3JnYmEoMCwwLDAsMC4xKScpXG5cbiAgICBzdmcuYXBwZW5kKCd0ZXh0JylcbiAgICAgIC50ZXh0KCdyZWNlaXZlciBzcGVjdHJ1bScpXG4gICAgICAuYXR0cigneCcsIFdJRFRIKVxuICAgICAgLmF0dHIoJ3knLCAxMilcbiAgICAgIC5hdHRyKCdkeCcsICctNHB4JylcbiAgICAgIC5zdHlsZSgnZm9udC1zaXplJywgMTIpXG4gICAgICAuc3R5bGUoJ3RleHQtYW5jaG9yJywgJ2VuZCcpXG4gICAgICAuYXR0cignZmlsbCcsICdyZ2JhKDAsMCwwLDAuMSknKVxuXG4gICAgYmFycyA9IFtdXG4gICAgZm9yICh2YXIgc3ZnYmFycyA9IDA7IHN2Z2JhcnMgPCBidWZmZXJMZW5ndGg7IHN2Z2JhcnMrKykge1xuICAgICAgdmFyIGJhciA9IHN2Zy5hcHBlbmQoJ3JlY3QnKVxuICAgICAgICAuYXR0cigneCcsIGJhcldpZHRoICogc3ZnYmFycylcbiAgICAgICAgLmF0dHIoJ3knLCAwKVxuICAgICAgICAuYXR0cignd2lkdGgnLCBiYXJXaWR0aClcbiAgICAgICAgLmF0dHIoJ2hlaWdodCcsIDApXG4gICAgICAgIC5hdHRyKCdmaWxsJywgJ2dyZWVuJylcbiAgICAgICAgLmF0dHIoJ3N0cm9rZScsICdub25lJylcblxuICAgICAgdmFyIGNpcmNsZSA9IHN2Zy5hcHBlbmQoJ2NpcmNsZScpXG4gICAgICAgIC5hdHRyKCdjeCcsIGJhcldpZHRoICogc3ZnYmFycylcbiAgICAgICAgLmF0dHIoJ2N5JywgMClcbiAgICAgICAgLmF0dHIoJ3InLCBiYXJXaWR0aClcbiAgICAgICAgLmF0dHIoJ2ZpbGwnLCAncmVkJylcblxuXG4gICAgICB2YXIgYmFyX2lkeCA9IHN2Z2JhcnNcbiAgICAgICAgLy8gYmFyLm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vICAgY29uc29sZS5sb2coYmFyX2lkeClcbiAgICAgICAgLy8gfSlcblxuICAgICAgYmFycy5wdXNoKGJhcilcbiAgICAgIGNpcmNsZXMucHVzaChjaXJjbGUpXG4gICAgfVxuXG4gICAgcmV0dXJuO1xuXG4gICAgLy8gc3luYyBjb3VudFxuICAgIGRpdl9zeW5jX2NvdW50ID0gcGFyZW50LmFwcGVuZCgnZGl2JylcbiAgICAgIC5hdHRyKCdjbGFzcycsICdjb2wtbWQtNCcpXG4gICAgICAuc3R5bGUoJ291dGxpbmUnLCAnMXB4IGRvdHRlZCByZ2JhKDAsMCwwLDAuMSknKVxuXG4gICAgZGl2X3N5bmNfY291bnQuYXBwZW5kKCdoNCcpLmF0dHIoJ2NsYXNzJywgJ3RleHQtY2VudGVyJykuaHRtbCgnc3luY2hyb25pemF0aW9uIGNvdW50cycpXG4gICAgc3luY19pbmRpY2F0b3IgPSBkaXZfc3luY19jb3VudC5hcHBlbmQoJ2RpdicpLmF0dHIoJ2NsYXNzJywgJ3RleHQtY2VudGVyIHN5bmNfY291bnQnKVxuXG4gICAgLy8gYmF1ZCBtZXRlclxuICAgIHZhciBwYXJlbnRfYmF1ZF9tZXRlciA9IHBhcmVudC5hcHBlbmQoJ2RpdicpLmF0dHIoJ2NsYXNzJywgJ2NvbC1tZC00JylcbiAgICAgIC5zdHlsZSgnb3V0bGluZScsICcxcHggZG90dGVkIHJnYmEoMCwwLDAsMC4xKScpXG5cbiAgICBwYXJlbnRfYmF1ZF9tZXRlci5hcHBlbmQoJ2g0JykuYXR0cignY2xhc3MnLCAndGV4dC1jZW50ZXInKS5odG1sKCdiYXVkJylcbiAgICBkaXZfYmF1ZF9tZXRlciA9IHBhcmVudF9iYXVkX21ldGVyLmFwcGVuZCgnZGl2JykuYXR0cignY2xhc3MnLCAndGV4dC1jZW50ZXInKVxuXG5cbiAgICB2YXIgcGFyZW50X2lucHV0X3NsaWRlciA9IHBhcmVudC5hcHBlbmQoJ2RpdicpLmF0dHIoJ2NsYXNzJywgJ2NvbC1tZC00JylcblxuICAgIHBhcmVudF9pbnB1dF9zbGlkZXIuYXBwZW5kKCdoNCcpLmF0dHIoJ2NsYXNzJywgJ3RleHQtY2VudGVyJykuaHRtbCgndHJhbnNtaXR0ZXIgdm9sdW1lJylcblxuICAgIHZhciBzbGlkZXJfaXRzZWxmID0gcGFyZW50X2lucHV0X3NsaWRlci5hcHBlbmQoJ2lucHV0JykuYXR0cigndHlwZScsICdyYW5nZScpXG4gICAgICAuYXR0cignbWluJywgMC4wKVxuICAgICAgLmF0dHIoJ21heCcsIDEwMC4wKVxuICAgICAgLmF0dHIoJ3ZhbHVlJywgMC4wKVxuXG4gICAgc2xpZGVyX2l0c2VsZi5vbignaW5wdXQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAvLyBjb25zb2xlLmxvZyhkMy5ldmVudClcbiAgICAgIHZhciB2ID0gZDMuc2VsZWN0KHRoaXMpLm5vZGUoKS52YWx1ZVxuICAgICAgYWdlbnQuc2V0X3ZvbHVtZSh2IC8gMTAwLjApXG4gICAgfSlcblxuICAgIC8vIG1lc3NhZ2UgdG8gc2VuZFxuICAgIHZhciBwYXJlbnRfbWVzc2FnZV90b19zZW5kID0gcGFyZW50LmFwcGVuZCgnZGl2JykuYXR0cignY2xhc3MnLCAnY29sLW1kLTEyJylcblxuICAgIHBhcmVudF9tZXNzYWdlX3RvX3NlbmQuYXBwZW5kKCdoNCcpLmF0dHIoJ2NsYXNzJywgJ3RleHQtY2VudGVyJykuaHRtbCgnc2VuZGluZyB0aGlzIG1lc3NhZ2UnKVxuXG4gICAgdmFyIGlucHV0X2ZpZWxkID0gcGFyZW50X21lc3NhZ2VfdG9fc2VuZC5hcHBlbmQoJ2lucHV0JylcbiAgICAgIC5hdHRyKCd0eXBlJywgJ3RleHQnKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ21zZ19pbnB1dCcpXG5cbiAgICAvLyBpbnB1dF9maWVsZC5ub2RlKCkudmFsdWUgPSBzdGF0ZS5NRVNTQUdFXG5cbiAgICBpbnB1dF9maWVsZC5vbigna2V5dXAnLCBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgdiA9IGlucHV0X2ZpZWxkLm5vZGUoKS52YWx1ZVxuICAgICAgaWYgKHYgPT09ICcnKSB7XG4gICAgICAgIHYgPSAnICdcbiAgICAgIH1cblxuICAgICAgYWdlbnQuc2V0X21lc3NhZ2UodilcbiAgICB9KVxuXG4gICAgLy8gcnggYnVmZmVyXG4gICAgdmFyIGRpdl9yeF9idWZmZXJfcGFyZW50ID0gcGFyZW50LmFwcGVuZCgnZGl2JylcbiAgICAgIC5hdHRyKCdjbGFzcycsICdjb2wtbWQtMTInKVxuXG4gICAgZGl2X3J4X2J1ZmZlcl9wYXJlbnQuYXBwZW5kKCdoNCcpLmF0dHIoJ2NsYXNzJywgJ3RleHQtY2VudGVyJykuaHRtbCgncnggYnVmZmVyJylcblxuICAgIGRpdl9yeF9idWZmZXIgPSBkaXZfcnhfYnVmZmVyX3BhcmVudC5hcHBlbmQoJ3ByZScpLmF0dHIoJ2NsYXNzJywgJ3J4X2J1ZmZlcicpXG5cbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbm5lY3QocmVtb3RlX2FnZW50KSB7XG4gICAgYWdlbnQgPSByZW1vdGVfYWdlbnRcbiAgICBvdGhlcl9idWZmZXJzID0gcmVtb3RlX2FnZW50LmdldF9idWZmZXJzKClcbiAgICBidWZmZXJMZW5ndGggPSBvdGhlcl9idWZmZXJzLnRpbWUubGVuZ3RoXG4gIH1cblxuICBmdW5jdGlvbiB0aWNrKGRyYXdfYmFycykge1xuXG4gICAgaWYgKGRyYXdfYmFycyA9PT0gdHJ1ZSkge1xuICAgICAgdmFyIGRhdGFBcnJheSA9IG90aGVyX2J1ZmZlcnMuZnJlcVxuICAgICAgdmFyIGRhdGFBcnJheVQgPSBvdGhlcl9idWZmZXJzLnRpbWVcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBidWZmZXJMZW5ndGg7IGkrKykge1xuICAgICAgICBiYXJzW2ldLmF0dHIoJ2hlaWdodCcsIChkYXRhQXJyYXlbaV0gLyAyNTUpICogSEVJR0hUKVxuICAgICAgICBjaXJjbGVzW2ldLmF0dHIoJ2N5JywgKGRhdGFBcnJheVRbaV0gLyAyNTUpICogSEVJR0hUKVxuXG4gICAgICB9XG5cbiAgICB9XG5cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgc2V0dXBfc3ZnOiBzZXR1cF9zdmcsXG4gICAgdGljazogdGljayxcbiAgICBjb25uZWN0OiBjb25uZWN0XG4gIH1cblxufVxuIl19
