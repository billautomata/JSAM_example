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

  modem.setup_transmitter(1)

  var ifaces = modem.get_interfaces()

  window.recorder = new Recorder(ifaces.master_gain)

  // ifaces.master_gain.connect(ifaces.analyser)

  var display_bob = View_Controller.view_controller('test_modem')
  display_bob.connect(modem)
  display_bob.setup_svg()

  var bufferSize = 1024 * 16
  scriptProcessor = context.createScriptProcessor(bufferSize, 1, 1)

  var g = context.createGain()
    // g.gain.value = 0.2

  // ifaces.master_gain.connect(scriptProcessor)
  scriptProcessor.connect(g)
  g.connect(ifaces.analyser)

  // scriptProcessor.connect(context.destination)

  window.huh = true

  // Give the node a function to process audio events
  scriptProcessor.onaudioprocess = function (audioProcessingEvent) {

    sample_idx = 0

    // console.log((Date.now()-_t))

    // console.log(audioProcessingEvent.inputBuffer.length)
    // console.log('here')

    // The input buffer is the song we loaded earlier
    var inputBuffer = audioProcessingEvent.inputBuffer;

    // The output buffer contains the samples that will be modified and played
    var outputBuffer = audioProcessingEvent.outputBuffer;

    // Loop through the output channels (in this case there is only one)
    for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {

      var inputData = inputBuffer.getChannelData(channel);
      var outputData = outputBuffer.getChannelData(channel);

      for (var sample = 0; sample < inputBuffer.length; sample++) {

        outputData[sample] = Math.sin(sample_idx / (1 + start_time)) * 0.1
        sample_idx++

        start_time += (0.01/inputBuffer.length)

      }

    }

    console.log(start_time)
    if(start_time > 0.1){
      start_time = 0.001
    }
    _t = Date.now()

  }

  scriptProcessor.ontime

  function interval_tick() {

    modem.analyse()
    display_bob.tick(true)

    // var n = m.get_interfaces().osc_bank[0].frequency.value
    // n += 100
    // if(n > 20000){
    //   n = 100
    // }

    // m.get_interfaces().osc_bank[0].frequency.value = n
    // m.get_interfaces().osc_bank[0].frequency.value = m.get_interfaces().osc_bank[0].frequency.value + 100

    window.requestAnimationFrame(interval_tick)
  }

  interval_tick()

  window.m = modem

  m.get_interfaces().gain_bank[0].gain.value = 0.1

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9sZWFybmluZ19tYWluLmpzIiwianMvbW9kZW0uanMiLCJqcy9tb2RlbV92aWV3LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIHNjcmlwdFByb2Nlc3Nvclxud2luZG93LnN0YXJ0X3RpbWVcblxud2luZG93Lm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgc2FtcGxlX2lkeCA9IDBcbiAgc3RhcnRfdGltZSA9IDBcbiAgdmFyIF90ID0gRGF0ZS5ub3coKVxuXG4gIC8vIGNvbnNvbGUubG9nID0gZnVuY3Rpb24oKXt9XG5cbiAgdmFyIE1vZGVtID0gcmVxdWlyZSgnLi9tb2RlbS5qcycpXG4gIHZhciBWaWV3X0NvbnRyb2xsZXIgPSByZXF1aXJlKCcuL21vZGVtX3ZpZXcuanMnKVxuXG4gIHZhciBtb2RlbSA9IE1vZGVtLm1vZGVtKHtcbiAgICBuYW1lOiAnbW9kZW0nLFxuICAgIHR5cGU6ICdub3JteScsXG4gICAgaWQ6ICdtb2RlbUEnXG4gIH0pXG5cbiAgbW9kZW0uc2V0dXBfYW5hbHlzZXIoKVxuICBtb2RlbS5hbmFseXNlKClcblxuICBtb2RlbS5zZXR1cF90cmFuc21pdHRlcigxKVxuXG4gIHZhciBpZmFjZXMgPSBtb2RlbS5nZXRfaW50ZXJmYWNlcygpXG5cbiAgd2luZG93LnJlY29yZGVyID0gbmV3IFJlY29yZGVyKGlmYWNlcy5tYXN0ZXJfZ2FpbilcblxuICAvLyBpZmFjZXMubWFzdGVyX2dhaW4uY29ubmVjdChpZmFjZXMuYW5hbHlzZXIpXG5cbiAgdmFyIGRpc3BsYXlfYm9iID0gVmlld19Db250cm9sbGVyLnZpZXdfY29udHJvbGxlcigndGVzdF9tb2RlbScpXG4gIGRpc3BsYXlfYm9iLmNvbm5lY3QobW9kZW0pXG4gIGRpc3BsYXlfYm9iLnNldHVwX3N2ZygpXG5cbiAgdmFyIGJ1ZmZlclNpemUgPSAxMDI0ICogMTZcbiAgc2NyaXB0UHJvY2Vzc29yID0gY29udGV4dC5jcmVhdGVTY3JpcHRQcm9jZXNzb3IoYnVmZmVyU2l6ZSwgMSwgMSlcblxuICB2YXIgZyA9IGNvbnRleHQuY3JlYXRlR2FpbigpXG4gICAgLy8gZy5nYWluLnZhbHVlID0gMC4yXG5cbiAgLy8gaWZhY2VzLm1hc3Rlcl9nYWluLmNvbm5lY3Qoc2NyaXB0UHJvY2Vzc29yKVxuICBzY3JpcHRQcm9jZXNzb3IuY29ubmVjdChnKVxuICBnLmNvbm5lY3QoaWZhY2VzLmFuYWx5c2VyKVxuXG4gIC8vIHNjcmlwdFByb2Nlc3Nvci5jb25uZWN0KGNvbnRleHQuZGVzdGluYXRpb24pXG5cbiAgd2luZG93Lmh1aCA9IHRydWVcblxuICAvLyBHaXZlIHRoZSBub2RlIGEgZnVuY3Rpb24gdG8gcHJvY2VzcyBhdWRpbyBldmVudHNcbiAgc2NyaXB0UHJvY2Vzc29yLm9uYXVkaW9wcm9jZXNzID0gZnVuY3Rpb24gKGF1ZGlvUHJvY2Vzc2luZ0V2ZW50KSB7XG5cbiAgICBzYW1wbGVfaWR4ID0gMFxuXG4gICAgLy8gY29uc29sZS5sb2coKERhdGUubm93KCktX3QpKVxuXG4gICAgLy8gY29uc29sZS5sb2coYXVkaW9Qcm9jZXNzaW5nRXZlbnQuaW5wdXRCdWZmZXIubGVuZ3RoKVxuICAgIC8vIGNvbnNvbGUubG9nKCdoZXJlJylcblxuICAgIC8vIFRoZSBpbnB1dCBidWZmZXIgaXMgdGhlIHNvbmcgd2UgbG9hZGVkIGVhcmxpZXJcbiAgICB2YXIgaW5wdXRCdWZmZXIgPSBhdWRpb1Byb2Nlc3NpbmdFdmVudC5pbnB1dEJ1ZmZlcjtcblxuICAgIC8vIFRoZSBvdXRwdXQgYnVmZmVyIGNvbnRhaW5zIHRoZSBzYW1wbGVzIHRoYXQgd2lsbCBiZSBtb2RpZmllZCBhbmQgcGxheWVkXG4gICAgdmFyIG91dHB1dEJ1ZmZlciA9IGF1ZGlvUHJvY2Vzc2luZ0V2ZW50Lm91dHB1dEJ1ZmZlcjtcblxuICAgIC8vIExvb3AgdGhyb3VnaCB0aGUgb3V0cHV0IGNoYW5uZWxzIChpbiB0aGlzIGNhc2UgdGhlcmUgaXMgb25seSBvbmUpXG4gICAgZm9yICh2YXIgY2hhbm5lbCA9IDA7IGNoYW5uZWwgPCBvdXRwdXRCdWZmZXIubnVtYmVyT2ZDaGFubmVsczsgY2hhbm5lbCsrKSB7XG5cbiAgICAgIHZhciBpbnB1dERhdGEgPSBpbnB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YShjaGFubmVsKTtcbiAgICAgIHZhciBvdXRwdXREYXRhID0gb3V0cHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKGNoYW5uZWwpO1xuXG4gICAgICBmb3IgKHZhciBzYW1wbGUgPSAwOyBzYW1wbGUgPCBpbnB1dEJ1ZmZlci5sZW5ndGg7IHNhbXBsZSsrKSB7XG5cbiAgICAgICAgb3V0cHV0RGF0YVtzYW1wbGVdID0gTWF0aC5zaW4oc2FtcGxlX2lkeCAvICgxICsgc3RhcnRfdGltZSkpICogMC4xXG4gICAgICAgIHNhbXBsZV9pZHgrK1xuXG4gICAgICAgIHN0YXJ0X3RpbWUgKz0gKDAuMDEvaW5wdXRCdWZmZXIubGVuZ3RoKVxuXG4gICAgICB9XG5cbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZyhzdGFydF90aW1lKVxuICAgIGlmKHN0YXJ0X3RpbWUgPiAwLjEpe1xuICAgICAgc3RhcnRfdGltZSA9IDAuMDAxXG4gICAgfVxuICAgIF90ID0gRGF0ZS5ub3coKVxuXG4gIH1cblxuICBzY3JpcHRQcm9jZXNzb3Iub250aW1lXG5cbiAgZnVuY3Rpb24gaW50ZXJ2YWxfdGljaygpIHtcblxuICAgIG1vZGVtLmFuYWx5c2UoKVxuICAgIGRpc3BsYXlfYm9iLnRpY2sodHJ1ZSlcblxuICAgIC8vIHZhciBuID0gbS5nZXRfaW50ZXJmYWNlcygpLm9zY19iYW5rWzBdLmZyZXF1ZW5jeS52YWx1ZVxuICAgIC8vIG4gKz0gMTAwXG4gICAgLy8gaWYobiA+IDIwMDAwKXtcbiAgICAvLyAgIG4gPSAxMDBcbiAgICAvLyB9XG5cbiAgICAvLyBtLmdldF9pbnRlcmZhY2VzKCkub3NjX2JhbmtbMF0uZnJlcXVlbmN5LnZhbHVlID0gblxuICAgIC8vIG0uZ2V0X2ludGVyZmFjZXMoKS5vc2NfYmFua1swXS5mcmVxdWVuY3kudmFsdWUgPSBtLmdldF9pbnRlcmZhY2VzKCkub3NjX2JhbmtbMF0uZnJlcXVlbmN5LnZhbHVlICsgMTAwXG5cbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGludGVydmFsX3RpY2spXG4gIH1cblxuICBpbnRlcnZhbF90aWNrKClcblxuICB3aW5kb3cubSA9IG1vZGVtXG5cbiAgbS5nZXRfaW50ZXJmYWNlcygpLmdhaW5fYmFua1swXS5nYWluLnZhbHVlID0gMC4xXG5cbiAgcmV0dXJuO1xuXG59XG5cblxud2luZG93LmNyZWF0ZURvd25sb2FkTGluayA9IGZ1bmN0aW9uIGNyZWF0ZURvd25sb2FkTGluaygpIHtcbiAgcmVjb3JkZXIgJiYgcmVjb3JkZXIuZXhwb3J0V0FWKGZ1bmN0aW9uIChibG9iKSB7XG4gICAgdmFyIHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gICAgdmFyIGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcbiAgICB2YXIgYXUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhdWRpbycpO1xuICAgIHZhciBoZiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcblxuICAgIGF1LmNvbnRyb2xzID0gdHJ1ZTtcbiAgICBhdS5zcmMgPSB1cmw7XG4gICAgaGYuaHJlZiA9IHVybDtcbiAgICBoZi5kb3dubG9hZCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSArICcud2F2JztcbiAgICBoZi5pbm5lckhUTUwgPSBoZi5kb3dubG9hZDtcbiAgICBsaS5hcHBlbmRDaGlsZChhdSk7XG4gICAgbGkuYXBwZW5kQ2hpbGQoaGYpO1xuICAgIGQzLnNlbGVjdCgnYm9keScpLmFwcGVuZCgnZGl2Jykubm9kZSgpLmFwcGVuZENoaWxkKGxpKTtcbiAgfSk7XG59XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuKGZ1bmN0aW9uIHNldHVwX2dsb2JhbF9hdWRpb19jb250ZXh0KCkge1xuICBpZiAod2luZG93LmNvbnRleHQgPT09IHVuZGVmaW5lZCkge1xuICAgIGNvbnNvbGUubG9nKCdjcmVhdGluZyBuZXcgd2luZG93LkF1ZGlvQ29udGV4dCgpJylcbiAgICB3aW5kb3cuQXVkaW9Db250ZXh0ID0gKFxuICAgICAgd2luZG93LkF1ZGlvQ29udGV4dCB8fFxuICAgICAgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dCB8fFxuICAgICAgd2luZG93Lm1vekF1ZGlvQ29udGV4dCB8fFxuICAgICAgd2luZG93Lm1zQXVkaW9Db250ZXh0XG4gICAgKVxuICAgIHdpbmRvdy5jb250ZXh0ID0gbmV3IHdpbmRvdy5BdWRpb0NvbnRleHQoKVxuICB9XG59KSgpXG5cbm1vZHVsZS5leHBvcnRzLm1vZGVtID0gbW9kZW1cblxuZnVuY3Rpb24gbW9kZW0ob3B0aW9ucyl7XG5cbiAgdmFyIGlkID0gb3B0aW9ucy5pZFxuICB2YXIgbmFtZSA9IG9wdGlvbnMubmFtZVxuICB2YXIgdHlwZSA9IG9wdGlvbnMudHlwZVxuXG4gIC8vIHRyYW5zbWl0dGVyXG4gIHZhciBvc2NfYmFuayA9IFtdXG4gIHZhciBmaWx0ZXJfYmFuayA9IFtdXG4gIHZhciBnYWluX2JhbmsgPSBbXVxuICB2YXIgbWFzdGVyX2dhaW5cblxuICAvLyBtaWNcblxuICBmdW5jdGlvbiBzZXR1cF90cmFuc21pdHRlcihuX29zYyl7XG5cbiAgICBpZiAodHlwZSA9PT0gJ21pYycpIHtcblxuICAgICAgbmF2aWdhdG9yLmdldE1lZGlhID0gKFxuICAgICAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhIHx8XG4gICAgICAgIG5hdmlnYXRvci53ZWJraXRHZXRVc2VyTWVkaWEgfHxcbiAgICAgICAgbmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYSB8fFxuICAgICAgICBuYXZpZ2F0b3IubXNHZXRVc2VyTWVkaWFcbiAgICAgICk7XG5cbiAgICAgIG5hdmlnYXRvci5nZXRNZWRpYShcbiAgICAgICAgLy8gY29uc3RyYWludHM6IGF1ZGlvIGFuZCB2aWRlbyBmb3IgdGhpcyBhcHBcbiAgICAgICAge1xuICAgICAgICAgIGF1ZGlvOiB0cnVlLFxuICAgICAgICAgIHZpZGVvOiBmYWxzZVxuICAgICAgICB9LFxuXG4gICAgICAgIC8vIFN1Y2Nlc3MgY2FsbGJhY2tcbiAgICAgICAgZnVuY3Rpb24gKHN0cmVhbSkge1xuXG4gICAgICAgICAgdmFyIHNvdXJjZSA9IGNvbnRleHQuY3JlYXRlTWVkaWFTdHJlYW1Tb3VyY2Uoc3RyZWFtKTtcbiAgICAgICAgICBzb3VyY2UuY29ubmVjdChhbmFseXNlcilcbiAgICAgICAgICBDVVJSRU5UX1NUQVRFID0gMFxuICAgICAgICAgIGNvbnNvbGUubG9nKCdkb25lIGNvbm5lY3RpbmcgJywgbmFtZSlcblxuICAgICAgICB9LFxuXG4gICAgICAgIC8vIEVycm9yIGNhbGxiYWNrXG4gICAgICAgIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnVGhlIGZvbGxvd2luZyBnVU0gZXJyb3Igb2NjdXJlZDogJyArIGVycik7XG4gICAgICAgIH1cbiAgICAgICk7XG5cbiAgICB9XG5cbiAgICBtYXN0ZXJfZ2FpbiA9IGNvbnRleHQuY3JlYXRlR2FpbigpXG4gICAgbWFzdGVyX2dhaW4uZ2Fpbi52YWx1ZSA9IDEuMFxuXG4gICAgZm9yKHZhciBvc2NfaWR4ID0gMDsgb3NjX2lkeCA8IG5fb3NjOyBvc2NfaWR4Kyspe1xuXG4gICAgICB2YXIgb3NjID0gY29udGV4dC5jcmVhdGVPc2NpbGxhdG9yKClcblxuICAgICAgb3NjLnR5cGUgPSAnc2luZSdcbiAgICAgIG9zYy5mcmVxdWVuY3kudmFsdWUgPSA0MDk2XG5cbiAgICAgIHZhciBmaWx0ZXIgPSBjb250ZXh0LmNyZWF0ZUJpcXVhZEZpbHRlcigpXG4gICAgICB2YXIgZ2FpbiA9IGNvbnRleHQuY3JlYXRlR2FpbigpXG5cbiAgICAgIG9zYy5zdGFydCgwKVxuXG4gICAgICAvLyBnYWluLmdhaW4udmFsdWUgPSAwXG5cbiAgICAgIG9zYy5jb25uZWN0KGdhaW4pXG4gICAgICBnYWluLmNvbm5lY3QobWFzdGVyX2dhaW4pXG5cbiAgICAgIG9zY19iYW5rLnB1c2gob3NjKVxuICAgICAgZmlsdGVyX2JhbmsucHVzaChmaWx0ZXIpXG4gICAgICBnYWluX2JhbmsucHVzaChnYWluKVxuXG4gICAgfVxuXG4gIH1cblxuXG5cbiAgLy8gZW5jb2RlclxuXG4gIC8vIHJlY2VpdmVyXG5cbiAgLy8gZGVjb2RlclxuICB2YXIgYW5hbHlzZXJcbiAgdmFyIGFuYWx5c2lzVGltZUJ1ZmZlclxuICB2YXIgYW5hbHlzaXNGcmVxdWVuY3lCdWZmZXJcblxuICBmdW5jdGlvbiBzZXR1cF9hbmFseXNlcigpe1xuXG4gICAgY29uc29sZS5sb2coaWQgKyAnXFx0JyArICdzZXR0aW5nIHVwIGFuYWx5c2VyJylcblxuICAgIGFuYWx5c2VyID0gY29udGV4dC5jcmVhdGVBbmFseXNlcigpXG4gICAgYW5hbHlzZXIuZmZ0U2l6ZSA9IDUxMlxuICAgIGFuYWx5c2VyLnNtb290aGluZ1RpbWVDb25zdGFudCA9IDAuMDBcblxuICAgIGFuYWx5c2lzVGltZUJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KGFuYWx5c2VyLmZyZXF1ZW5jeUJpbkNvdW50KVxuICAgIGFuYWx5c2lzRnJlcXVlbmN5QnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkoYW5hbHlzZXIuZnJlcXVlbmN5QmluQ291bnQpXG5cbiAgfVxuXG4gIGZ1bmN0aW9uIGFuYWx5c2UoKXtcbiAgICBhbmFseXNlci5nZXRCeXRlVGltZURvbWFpbkRhdGEoYW5hbHlzaXNUaW1lQnVmZmVyKVxuICAgIGFuYWx5c2VyLmdldEJ5dGVGcmVxdWVuY3lEYXRhKGFuYWx5c2lzRnJlcXVlbmN5QnVmZmVyKVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0X2ludGVyZmFjZXMoKXtcbiAgICByZXR1cm4ge1xuICAgICAgYW5hbHlzZXI6IGFuYWx5c2VyLFxuICAgICAgZ2Fpbl9iYW5rOiBnYWluX2JhbmssXG4gICAgICBtYXN0ZXJfZ2FpbjogbWFzdGVyX2dhaW4sXG4gICAgICBvc2NfYmFuazogb3NjX2JhbmssXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0X2J1ZmZlcnMoKXtcbiAgICByZXR1cm4ge1xuICAgICAgdGltZTogYW5hbHlzaXNUaW1lQnVmZmVyLFxuICAgICAgZnJlcTogYW5hbHlzaXNGcmVxdWVuY3lCdWZmZXJcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGFuYWx5c2U6IGFuYWx5c2UsXG4gICAgc2V0dXBfYW5hbHlzZXI6IHNldHVwX2FuYWx5c2VyLFxuICAgIHNldHVwX3RyYW5zbWl0dGVyOiBzZXR1cF90cmFuc21pdHRlcixcbiAgICBnZXRfYnVmZmVyczogZ2V0X2J1ZmZlcnMsXG4gICAgZ2V0X2ludGVyZmFjZXM6IGdldF9pbnRlcmZhY2VzXG4gIH1cblxuXG5cbn1cbiIsIm1vZHVsZS5leHBvcnRzLnZpZXdfY29udHJvbGxlciA9IHZpZXdfY29udHJvbGxlclxuXG5mdW5jdGlvbiB2aWV3X2NvbnRyb2xsZXIoZGl2X2lkKSB7XG5cbiAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgdmFyIG5hbWUgPSBkaXZfaWRcblxuICB2YXIgYWdlbnRcbiAgdmFyIHBhcmVudCA9IGQzLnNlbGVjdCgnZGl2IycgKyBkaXZfaWQpXG5cbiAgLy8gZGlzcGxheVxuICAvLyAgICBjdXJyZW50IHN0YXRlXG4gIC8vICAgIHN5bmMgY291bnRcbiAgLy8gICAgb3NjaWxsb3Njb3BlIG9mIG91dHB1dCAmIGlucHV0XG4gIC8vICAgIGZmdCBiYXJzIG9mIG91dHB1dCAmIGlucHV0XG4gIC8vICAgIGN1cnJlbnQgYmF1ZFxuICAvLyAgICByeCBidWZmZXJcblxuICB2YXIgc3ZnXG4gIHZhciBkaXZfc3luY19jb3VudFxuICB2YXIgc3luY19pbmRpY2F0b3JcbiAgdmFyIGRpdl9yeF9idWZmZXJcbiAgdmFyIGRpdl9iYXVkX21ldGVyXG4gIHZhciBiYXJzID0gW11cbiAgdmFyIGNpcmNsZXMgPSBbXVxuXG4gIHZhciBXSURUSCA9IDEwMjRcbiAgdmFyIEhFSUdIVCA9IDI1NlxuXG4gIHZhciBiYXJXaWR0aFxuICB2YXIgYnVmZmVyTGVuZ3RoXG5cbiAgdmFyIG90aGVyX2J1ZmZlcnNcblxuICAvLyBjcmVhdGUgc3ZnXG4gIGZ1bmN0aW9uIHNldHVwX3N2ZygpIHtcblxuICAgIGNvbnNvbGUubG9nKCdjYWxsaW5nIHNldHVwX3N2ZycpXG5cbiAgICAvLyB2YXIgc3RhdGUgPSBhZ2VudC5nZXRfc3RhdGUoKVxuXG4gICAgV0lEVEggPSBidWZmZXJMZW5ndGhcbiAgICBIRUlHSFQgPSBXSURUSCAvIDRcblxuICAgIGJhcldpZHRoID0gKFdJRFRIIC8gYnVmZmVyTGVuZ3RoKVxuXG4gICAgcGFyZW50LmFwcGVuZCgnaDEnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlcicpLmh0bWwobmFtZSlcblxuICAgIHN2ZyA9IHBhcmVudC5hcHBlbmQoJ3N2ZycpXG4gICAgICAuYXR0cignY2xhc3MnLCAnaW1nLXJlc3BvbnNpdmUnKVxuICAgICAgLmF0dHIoJ3dpZHRoJywgJzEwMCUnKVxuICAgICAgLy8gLmF0dHIoJ2hlaWdodCcsIEhFSUdIVClcbiAgICAgIC5hdHRyKCdwcmVzZXJ2ZUFzcGVjdFJhdGlvJywgJ3hNaWRZTWlkJylcbiAgICAgIC5hdHRyKCd2aWV3Qm94JywgJzAgMCAnICsgV0lEVEggKyAnICcgKyBIRUlHSFQpXG4gICAgICAuc3R5bGUoJ2JhY2tncm91bmQtY29sb3InLCAncmdiYSgwLDAsMCwwLjEpJylcblxuICAgIHN2Zy5hcHBlbmQoJ3RleHQnKVxuICAgICAgLnRleHQoJ3JlY2VpdmVyIHNwZWN0cnVtJylcbiAgICAgIC5hdHRyKCd4JywgV0lEVEgpXG4gICAgICAuYXR0cigneScsIDEyKVxuICAgICAgLmF0dHIoJ2R4JywgJy00cHgnKVxuICAgICAgLnN0eWxlKCdmb250LXNpemUnLCAxMilcbiAgICAgIC5zdHlsZSgndGV4dC1hbmNob3InLCAnZW5kJylcbiAgICAgIC5hdHRyKCdmaWxsJywgJ3JnYmEoMCwwLDAsMC4xKScpXG5cbiAgICBiYXJzID0gW11cbiAgICBmb3IgKHZhciBzdmdiYXJzID0gMDsgc3ZnYmFycyA8IGJ1ZmZlckxlbmd0aDsgc3ZnYmFycysrKSB7XG4gICAgICB2YXIgYmFyID0gc3ZnLmFwcGVuZCgncmVjdCcpXG4gICAgICAgIC5hdHRyKCd4JywgYmFyV2lkdGggKiBzdmdiYXJzKVxuICAgICAgICAuYXR0cigneScsIDApXG4gICAgICAgIC5hdHRyKCd3aWR0aCcsIGJhcldpZHRoKVxuICAgICAgICAuYXR0cignaGVpZ2h0JywgMClcbiAgICAgICAgLmF0dHIoJ2ZpbGwnLCAnZ3JlZW4nKVxuICAgICAgICAuYXR0cignc3Ryb2tlJywgJ25vbmUnKVxuXG4gICAgICB2YXIgY2lyY2xlID0gc3ZnLmFwcGVuZCgnY2lyY2xlJylcbiAgICAgICAgLmF0dHIoJ2N4JywgYmFyV2lkdGggKiBzdmdiYXJzKVxuICAgICAgICAuYXR0cignY3knLCAwKVxuICAgICAgICAuYXR0cigncicsIGJhcldpZHRoKVxuICAgICAgICAuYXR0cignZmlsbCcsICdyZWQnKVxuXG5cbiAgICAgIHZhciBiYXJfaWR4ID0gc3ZnYmFyc1xuICAgICAgICAvLyBiYXIub24oJ21vdXNlb3ZlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gICBjb25zb2xlLmxvZyhiYXJfaWR4KVxuICAgICAgICAvLyB9KVxuXG4gICAgICBiYXJzLnB1c2goYmFyKVxuICAgICAgY2lyY2xlcy5wdXNoKGNpcmNsZSlcbiAgICB9XG5cbiAgICAvLyBzeW5jIGNvdW50XG4gICAgZGl2X3N5bmNfY291bnQgPSBwYXJlbnQuYXBwZW5kKCdkaXYnKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ2NvbC1tZC00JylcbiAgICAgIC5zdHlsZSgnb3V0bGluZScsICcxcHggZG90dGVkIHJnYmEoMCwwLDAsMC4xKScpXG5cbiAgICBkaXZfc3luY19jb3VudC5hcHBlbmQoJ2g0JykuYXR0cignY2xhc3MnLCAndGV4dC1jZW50ZXInKS5odG1sKCdzeW5jaHJvbml6YXRpb24gY291bnRzJylcbiAgICBzeW5jX2luZGljYXRvciA9IGRpdl9zeW5jX2NvdW50LmFwcGVuZCgnZGl2JykuYXR0cignY2xhc3MnLCAndGV4dC1jZW50ZXIgc3luY19jb3VudCcpXG5cbiAgICAvLyBiYXVkIG1ldGVyXG4gICAgdmFyIHBhcmVudF9iYXVkX21ldGVyID0gcGFyZW50LmFwcGVuZCgnZGl2JykuYXR0cignY2xhc3MnLCAnY29sLW1kLTQnKVxuICAgICAgLnN0eWxlKCdvdXRsaW5lJywgJzFweCBkb3R0ZWQgcmdiYSgwLDAsMCwwLjEpJylcblxuICAgIHBhcmVudF9iYXVkX21ldGVyLmFwcGVuZCgnaDQnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlcicpLmh0bWwoJ2JhdWQnKVxuICAgIGRpdl9iYXVkX21ldGVyID0gcGFyZW50X2JhdWRfbWV0ZXIuYXBwZW5kKCdkaXYnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlcicpXG5cblxuICAgIHZhciBwYXJlbnRfaW5wdXRfc2xpZGVyID0gcGFyZW50LmFwcGVuZCgnZGl2JykuYXR0cignY2xhc3MnLCAnY29sLW1kLTQnKVxuXG4gICAgcGFyZW50X2lucHV0X3NsaWRlci5hcHBlbmQoJ2g0JykuYXR0cignY2xhc3MnLCAndGV4dC1jZW50ZXInKS5odG1sKCd0cmFuc21pdHRlciB2b2x1bWUnKVxuXG4gICAgdmFyIHNsaWRlcl9pdHNlbGYgPSBwYXJlbnRfaW5wdXRfc2xpZGVyLmFwcGVuZCgnaW5wdXQnKS5hdHRyKCd0eXBlJywgJ3JhbmdlJylcbiAgICAgIC5hdHRyKCdtaW4nLCAwLjApXG4gICAgICAuYXR0cignbWF4JywgMTAwLjApXG4gICAgICAuYXR0cigndmFsdWUnLCAwLjApXG5cbiAgICBzbGlkZXJfaXRzZWxmLm9uKCdpbnB1dCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKGQzLmV2ZW50KVxuICAgICAgdmFyIHYgPSBkMy5zZWxlY3QodGhpcykubm9kZSgpLnZhbHVlXG4gICAgICBhZ2VudC5zZXRfdm9sdW1lKHYgLyAxMDAuMClcbiAgICB9KVxuXG4gICAgLy8gbWVzc2FnZSB0byBzZW5kXG4gICAgdmFyIHBhcmVudF9tZXNzYWdlX3RvX3NlbmQgPSBwYXJlbnQuYXBwZW5kKCdkaXYnKS5hdHRyKCdjbGFzcycsICdjb2wtbWQtMTInKVxuXG4gICAgcGFyZW50X21lc3NhZ2VfdG9fc2VuZC5hcHBlbmQoJ2g0JykuYXR0cignY2xhc3MnLCAndGV4dC1jZW50ZXInKS5odG1sKCdzZW5kaW5nIHRoaXMgbWVzc2FnZScpXG5cbiAgICB2YXIgaW5wdXRfZmllbGQgPSBwYXJlbnRfbWVzc2FnZV90b19zZW5kLmFwcGVuZCgnaW5wdXQnKVxuICAgICAgLmF0dHIoJ3R5cGUnLCAndGV4dCcpXG4gICAgICAuYXR0cignY2xhc3MnLCAnbXNnX2lucHV0JylcblxuICAgIC8vIGlucHV0X2ZpZWxkLm5vZGUoKS52YWx1ZSA9IHN0YXRlLk1FU1NBR0VcblxuICAgIGlucHV0X2ZpZWxkLm9uKCdrZXl1cCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciB2ID0gaW5wdXRfZmllbGQubm9kZSgpLnZhbHVlXG4gICAgICBpZiAodiA9PT0gJycpIHtcbiAgICAgICAgdiA9ICcgJ1xuICAgICAgfVxuXG4gICAgICBhZ2VudC5zZXRfbWVzc2FnZSh2KVxuICAgIH0pXG5cbiAgICAvLyByeCBidWZmZXJcbiAgICB2YXIgZGl2X3J4X2J1ZmZlcl9wYXJlbnQgPSBwYXJlbnQuYXBwZW5kKCdkaXYnKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ2NvbC1tZC0xMicpXG5cbiAgICBkaXZfcnhfYnVmZmVyX3BhcmVudC5hcHBlbmQoJ2g0JykuYXR0cignY2xhc3MnLCAndGV4dC1jZW50ZXInKS5odG1sKCdyeCBidWZmZXInKVxuXG4gICAgZGl2X3J4X2J1ZmZlciA9IGRpdl9yeF9idWZmZXJfcGFyZW50LmFwcGVuZCgncHJlJykuYXR0cignY2xhc3MnLCAncnhfYnVmZmVyJylcblxuICB9XG5cbiAgZnVuY3Rpb24gY29ubmVjdChyZW1vdGVfYWdlbnQpIHtcbiAgICBhZ2VudCA9IHJlbW90ZV9hZ2VudFxuICAgIG90aGVyX2J1ZmZlcnMgPSByZW1vdGVfYWdlbnQuZ2V0X2J1ZmZlcnMoKVxuICAgIGJ1ZmZlckxlbmd0aCA9IG90aGVyX2J1ZmZlcnMudGltZS5sZW5ndGhcbiAgfVxuXG4gIGZ1bmN0aW9uIHRpY2soZHJhd19iYXJzKSB7XG5cbiAgICBpZiAoZHJhd19iYXJzID09PSB0cnVlKSB7XG4gICAgICB2YXIgZGF0YUFycmF5ID0gb3RoZXJfYnVmZmVycy5mcmVxXG4gICAgICB2YXIgZGF0YUFycmF5VCA9IG90aGVyX2J1ZmZlcnMudGltZVxuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJ1ZmZlckxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGJhcnNbaV0uYXR0cignaGVpZ2h0JywgKGRhdGFBcnJheVtpXSAvIDI1NSkgKiBIRUlHSFQpXG4gICAgICAgIGNpcmNsZXNbaV0uYXR0cignY3knLCAoZGF0YUFycmF5VFtpXSAvIDI1NSkgKiBIRUlHSFQpXG5cbiAgICAgIH1cblxuICAgIH1cblxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzZXR1cF9zdmc6IHNldHVwX3N2ZyxcbiAgICB0aWNrOiB0aWNrLFxuICAgIGNvbm5lY3Q6IGNvbm5lY3RcbiAgfVxuXG59XG4iXX0=
