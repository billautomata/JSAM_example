(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

module.exports.agent = agent

var BYTES_TO_ENCODE = 6

function agent(opts) {

  (function setup_audio_context() {
    if (window.context === undefined) {
      console.log('creating new window.AudioContext()')
      window.context = new window.AudioContext()
    }
    console.log('done.')
  })()

  var MESSAGE
  var MESSAGE_IDX = 0
  var RX_BUFFER = ''
  var CONNECTED_AT

  var type

  var analyser = context.createAnalyser()
  var analyserDataArray // the buffer the analyser writes to
  var bufferLength // the length of the analyserDataArray

  var localAnalyser = context.createAnalyser()
  var localAnalyserDataArray // the buffer the analyser writes to

  var peak_ranges // flat list of indexes of detected peak ranges
  var grouped_peak_ranges // clustered groups of peak ranges
  var mean // the threshold for determining if a band is peaked

  var flip_flop = true

  var prev_high_channel = -1
  var current_high_channel = 0
  var SYNC_COUNT = 0

  var osc_bank = []
  var gain_bank = []
  var filter_bank = []

  var master_gain

  // var n_osc = 44
  var n_osc = (8*BYTES_TO_ENCODE) + 3
  var freqRange = 20000
  var spread = (freqRange / n_osc)
  var initialFreq = 150

  var CURRENT_STATE = -1

  function tick() {

    var ret_obj = {
      new_data: false,
      data: ''
    }

    if (CURRENT_STATE < 0) {

      // performing initialization process, do nothing
      return;

    } else {

      if (CURRENT_STATE === 0) {

        register_peak_ranges()

        if (grouped_peak_ranges.length === n_osc) {
          CURRENT_STATE = 1
        }

      } else if (CURRENT_STATE === 1) {

        perform_signaling()
        look_for_signaling()

        if (SYNC_COUNT > 2) {
          CURRENT_STATE = 2
          CONNECTED_AT = Date.now()
        }

      } else if (CURRENT_STATE === 2) {

        // encode byte
        // var byte_to_send = MESSAGE[MESSAGE_IDX].charCodeAt(0)
        // encode_byte(byte_to_send)

        // encode byte array
        var substring = MESSAGE.substr(MESSAGE_IDX,BYTES_TO_ENCODE)
        encode_string(substring)

        if (look_for_signaling()) {

          // read byte
          //RX_BUFFER += String.fromCharCode(read_byte_from_signal())
          RX_BUFFER += read_byte_array_from_signal(BYTES_TO_ENCODE)
          // console.log(RX_BUFFER)

          if (type === 'client') {
            ret_obj.new_data = true
            ret_obj.data = String.fromCharCode(read_byte_from_signal(BYTES_TO_ENCODE))
          }

          // increment byte to encode
          MESSAGE_IDX += BYTES_TO_ENCODE
          if(MESSAGE_IDX > MESSAGE.length){
            MESSAGE_IDX = 0
          }
          // MESSAGE_IDX = MESSAGE_IDX % MESSAGE.length

          perform_signaling()

        }

      } // end of CURRENT_STATE === 2

    }

    return ret_obj

  }


  function look_for_signaling() {

    var valid_ranges = validate_ranges()
    if (valid_ranges[8] === true && valid_ranges[9] === false) {
      current_high_channel = 8
    } else {
      current_high_channel = 9
    }

    var difference_found = false

    if (current_high_channel !== prev_high_channel) {
      difference_found = true
      SYNC_COUNT += 1
    }

    prev_high_channel = current_high_channel

    return difference_found

  }

  function init(opts) {

    master_gain = context.createGain()
    master_gain.gain.value = 0
    master_gain.connect(context.destination)

    MESSAGE = opts.message
    type = opts.type

    // create osc + gain banks
    for (var idx = 0; idx < n_osc; idx++) {

      var local_osc = context.createOscillator()
      local_osc.frequency.value = (idx * spread) + initialFreq

      var local_gain = context.createGain()
      local_gain.gain.value = 1.0 / (n_osc-1)

      // var local_filter = context.createBiquadFilter()
      // local_filter.type = 'bandpass'
      // local_filter.frequency.value = (idx * spread) + initialFreq
      // local_filter.Q.value = 1.0
      //
      // window.d = local_filter

      local_osc.connect(local_gain)

      // local_gain.connect(local_filter)

      local_gain.connect(localAnalyser)
      local_gain.connect(master_gain)
      // local_gain.connect(context.destination)

      local_osc.start()

      osc_bank.push(local_osc)
      gain_bank.push(local_gain)
      // filter_bank.push(local_filter)

    }

    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0
    bufferLength = analyser.frequencyBinCount
    analyserDataArray = new Uint8Array(bufferLength)

    localAnalyser.fftSize = 1024
    localAnalyser.smoothingTimeConstant = 0
    localAnalyserDataArray = new Uint8Array(bufferLength)

  }

  function connect(other_agent) {

    var other_gain_bank = other_agent.get_gain_bank()

    other_gain_bank.forEach(function (gainNode) {
      gainNode.connect(analyser)
    })

    // var other_filter_bank = other_agent.get_filter_bank()
    //
    // other_filter_bank.forEach(function(filterNode){
    //   filterNode.connect(analyser)
    // })

    getBuffer()

    setTimeout(function () {
      console.log('done connecting')
      CURRENT_STATE = 0
    }, 200)

  }

  function set_message(msg){
    MESSAGE = msg
    MESSAGE_IDX = 0
  }

  function n_channels() {
    return n_osc
  }

  function get_groups() {
    return grouped_peak_ranges
  }

  function getBuffer() {
    analyser.getByteFrequencyData(analyserDataArray)
    return analyserDataArray
  }
  function get_local_frequency_data_buffer() {
    localAnalyser.getByteFrequencyData(localAnalyserDataArray)
    return localAnalyserDataArray
  }

  function get_gain_bank() {
    return gain_bank
  }

  function get_filter_bank() {
    return filter_bank
  }


  function get_analyser() {
    return analyser
  }


  function read_byte_from_signal() {

    var ranges = validate_ranges()
    // console.log(ranges)

    var binary_string = ''
    for (var i = 0; i < 8; i++) {
      if (ranges[i]) {
        binary_string += '1'
      } else {
        binary_string += '0'
      }
    }

    return parseInt(binary_string, 2)

  }


  function read_byte_array_from_signal(byte_count) {

    var return_array = ''

    var ranges = validate_ranges()
    // console.log(ranges)

    for(var byte_count_idx = 0; byte_count_idx < byte_count; byte_count_idx++){

      var offset = 0
      if(byte_count_idx > 0){
        offset += 2 + (byte_count_idx*8)
      }

      var binary_string = ''
      for (var i = 0+offset; i < 8+offset; i++) {
        if (ranges[i]) {
          binary_string += '1'
        } else {
          binary_string += '0'
        }
      }

      var byte = parseInt(binary_string, 2)
      return_array += String.fromCharCode(byte)
    }

    // console.log(return_array)
    return return_array

  }

  function register_peak_ranges() {

    console.log('registering peak ranges')

    getBuffer()
    console.log(analyserDataArray)

    // push on to new array for sorting
    var d = []
    for (var i = 0; i < bufferLength; i++) {
      if (analyserDataArray[i] > 0) {
        d.push(analyserDataArray[i])
      }
    }
    d.sort(function (a, b) {
      return a - b
    })
    console.log('Mean: ' + d[Math.floor(d.length / 2)])

    mean = d[Math.floor(d.length / 2)]

    //
    peak_ranges = []
    for (var i = 0; i < bufferLength; i++) {
      if (analyserDataArray[i] > mean) {
        peak_ranges.push(i)
      }
    }

    // window.p = peak_ranges

    group_peak_ranges()

  }

  function check_peak_ranges() {

    getBuffer()

    var hits = []
    peak_ranges.forEach(function (dataArray_idx) {
      if (analyserDataArray[dataArray_idx] > mean) {
        hits.push(true)
      } else {
        hits.push(false)
      }
    })

    return hits

  }

  function group_peak_ranges() {

    if (peak_ranges === undefined || peak_ranges.length === 0) {
      return;
    }

    var groups = [] // [ [1,2,3], [8,9,10], [30,31,32]  ]

    var current_group_idx = 0

    var local_group = new Array()

    peak_ranges.forEach(function (peak_idx, idx) {

      // if the Math.abs(peak_idx - peak_ranges[idx+1]) === 1
      //    push peak_idx on to local_group
      // else
      //    push local_group on to groups
      //    clear local_group
      //    push peak_idx on to local_group

      if (idx === peak_ranges.length - 1) {
        // console.log('here')
        return;
      }

      if (Math.abs(peak_idx - peak_ranges[idx + 1]) <= 2) {
        local_group.push(peak_idx)
      } else {
        local_group.push(peak_idx)
        groups.push(local_group)
        local_group = new Array()
      }

    })

    groups.push(local_group)

    grouped_peak_ranges = groups

    return groups

  }

  function set_gain(channel, value) {
    gain_bank[channel].gain.value = value
  }

  function set_volume(v){
    if(v >= 1){
      v=1.0
    }
    master_gain.gain.value = v
  }

  function validate_ranges() {

    if (grouped_peak_ranges === undefined) {
      return;
    }

    getBuffer()

    var valid_groups = []

    grouped_peak_ranges.forEach(function (group) {

      var hits = 0

      group.forEach(function (idx) {
        if (analyserDataArray[idx] >= mean) {
          hits += 1
        }
      })

      if (hits >= group.length / 2) {
        valid_groups.push(true)
      } else {
        valid_groups.push(false)
      }

    })

    return valid_groups

  }

  function encode_byte(byte) {

    var chars = get_encoded_byte_array(byte)

    // console.log(chars)

    chars.forEach(function (c, idx) {
      if (c === '0') {
        set_gain(idx, 0)
      } else {
        set_gain(idx, 1 / n_osc)
      }
    })

  }

  function encode_string(string){

    var bytes = string.split('')

    while(bytes.length < BYTES_TO_ENCODE){
      bytes.push(' ')
    }

    bytes.forEach(function(byte,byte_idx){

      var offset = (byte_idx * 8) + 2
      if(byte_idx === 0){
        offset = 0
      }

      byte = byte.charCodeAt(0)

      var chars = get_encoded_byte_array(byte)

      // console.log(chars)

      chars.forEach(function (c, idx) {
        if (c === '0') {
          set_gain(idx+offset, 0)
        } else {
          set_gain(idx+offset, 1 / n_osc)
        }
      })

    })



  }

  function perform_signaling() {
    flip_flop = !flip_flop
    if (flip_flop) {
      set_gain(8, 1 / n_osc)
      set_gain(9, 0)
    } else {
      set_gain(9, 1 / n_osc)
      set_gain(8, 0)
    }
  }

  function get_encoded_byte_array(byte) {
    return pad(byte.toString(2), 8).split('')
  }

  function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
  }

  function get_state() {
    return {
      buffer: getBuffer(),
      local_buffer: get_local_frequency_data_buffer(),
      RX_BUFFER: RX_BUFFER,
      CURRENT_STATE: CURRENT_STATE,
      SYNC_COUNT: SYNC_COUNT,
      MESSAGE: MESSAGE,
      MESSAGE_IDX: MESSAGE_IDX,
      CONNECTED_AT: CONNECTED_AT
    }
  }

  function reset_baud_count(){
    RX_BUFFER = ''
    CONNECTED_AT = Date.now()
  }

  return {
    check_peak_ranges: check_peak_ranges,
    connect: connect,
    encode_range: encode_byte,
    getBuffer: getBuffer,
    get_analyser: get_analyser,
    get_encoded_byte_array: get_encoded_byte_array,
    get_filter_bank: get_filter_bank,
    get_gain_bank: get_gain_bank,
    get_groups: get_groups,
    get_local_frequency_data_buffer: get_local_frequency_data_buffer,
    get_state: get_state,
    group_peak_ranges: group_peak_ranges,
    init: init,
    n_channels: n_channels,
    set_gain: set_gain,
    set_message: set_message,
    set_volume: set_volume,
    read_byte_from_signal: read_byte_from_signal,
    reset_baud_count: reset_baud_count,
    tick: tick,
    validate_ranges: validate_ranges,
  };

}

},{}],2:[function(require,module,exports){
window.onload = function () {
  // "use strict";

  window.console.time = function(){};  window.console.timeEnd = function(){}

  var DO_DRAW = true

  var BAUD_RATE = 24
  var parent_baud_rate = d3.select('div#baud_rate').append('div').attr('class','col-md-8 col-md-offset-2')

  parent_baud_rate.append('h4').attr('class', 'text-center').html('modem speed')
  var baud_scale = d3.scale.linear().domain([100,0]).range([16,200])
  var baud_slider = parent_baud_rate.append('input').attr('type','range')
    .attr('min', 0.0)
    .attr('max', 100.0)
    .attr('value', 80.0)

    baud_slider.on('input', function(){
    // console.log(d3.event)
    var v = d3.select(this).node().value

    BAUD_RATE = baud_scale(v)

    window.alice.reset_baud_count()
    window.bob.reset_baud_count()

  })

  var udp_mode = true

  console.log('main.js / window.onload anonymous function')

  var message_to_send = 'abcdefghijklmnopqrstuvwxyz'
  var output_msg = ''

  var Agent = require('./agent.js')
  var View_Controller = require('./view_controller.js')

  window.alice = Agent.agent()
  alice.init({
    type: 'client',
    message: '... =) ... '
  })

  window.bob = Agent.agent()
  bob.init({
    type: 'server',
    message: message_to_send
  })

  var display_alice = View_Controller.view_controller('alice_modem')
  display_alice.connect(alice)

  var display_bob = View_Controller.view_controller('bob_modem')
  display_bob.connect(bob)

  alice.connect(bob)
  bob.connect(alice)

  setTimeout(draw, 500)

  function draw() {

    console.time('test')
    alice.tick()
    bob.tick()
    console.timeEnd('test')

    // if(){
      console.time('display')
      display_alice.tick(DO_DRAW)
      display_bob.tick(DO_DRAW)
      console.timeEnd('display')
    // }

    setTimeout(draw, BAUD_RATE)
    // window.requestAnimationFrame(draw);

  }

}

},{"./agent.js":1,"./view_controller.js":3}],3:[function(require,module,exports){
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

  var WIDTH = 1024
  var HEIGHT = 256

  var barWidth
  var bufferLength
    // var barHeight

  // create svg
  function setup_svg() {

    var state = agent.get_state()

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

      var bar_idx = svgbars
      bar.on('mouseover', function () {
        console.log(bar_idx)
      })

      bars.push(bar)
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

    // rx buffer
    var div_rx_buffer_parent = parent.append('div')
      .attr('class', 'col-md-12')

    div_rx_buffer_parent.append('h4').attr('class', 'text-left').html('rx buffer')

    div_rx_buffer = div_rx_buffer_parent.append('pre').attr('class', 'rx_buffer')

    // message to send
    var parent_message_to_send = parent.append('div').attr('class', 'col-md-12')

    parent_message_to_send.append('div').attr('class', 'text-center').html('sending this message:')

    var input_field = parent_message_to_send.append('input')
      .attr('type', 'text')
      .attr('class', 'msg_input')

    input_field.node().value = state.MESSAGE

    input_field.on('keyup', function () {
      var v = input_field.node().value
      if (v === '') {
        v = ' '
      }

      agent.set_message(v)
    })

    //

  }

  function connect(remote_agent) {
    agent = remote_agent
    bufferLength = remote_agent.get_state().buffer.length
  }

  function tick(draw_bars) {

    if (bars.length === 0) {
      setup_svg()
      return;
    }

    var state = agent.get_state()

    if (draw_bars === true) {
      var dataArray = state.buffer

      for (var i = 0; i < bufferLength; i++) {
        bars[i].attr('height', (dataArray[i] / 255) * HEIGHT)
      }

    }

    sync_indicator.html(state.SYNC_COUNT)
    div_rx_buffer.html(state.RX_BUFFER)

    var baud = 8 * (state.RX_BUFFER.length / ((Date.now() - state.CONNECTED_AT) / 1000.0))
    div_baud_meter.html(baud.toFixed(2))

    //
    // console.log(agent.get_state().SYNC_COUNT)

  }

  return {
    tick: tick,
    connect: connect
  }

}

},{}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9hZ2VudC5qcyIsImpzL21haW4uanMiLCJqcy92aWV3X2NvbnRyb2xsZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdGpCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMuYWdlbnQgPSBhZ2VudFxuXG52YXIgQllURVNfVE9fRU5DT0RFID0gNlxuXG5mdW5jdGlvbiBhZ2VudChvcHRzKSB7XG5cbiAgKGZ1bmN0aW9uIHNldHVwX2F1ZGlvX2NvbnRleHQoKSB7XG4gICAgaWYgKHdpbmRvdy5jb250ZXh0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdjcmVhdGluZyBuZXcgd2luZG93LkF1ZGlvQ29udGV4dCgpJylcbiAgICAgIHdpbmRvdy5jb250ZXh0ID0gbmV3IHdpbmRvdy5BdWRpb0NvbnRleHQoKVxuICAgIH1cbiAgICBjb25zb2xlLmxvZygnZG9uZS4nKVxuICB9KSgpXG5cbiAgdmFyIE1FU1NBR0VcbiAgdmFyIE1FU1NBR0VfSURYID0gMFxuICB2YXIgUlhfQlVGRkVSID0gJydcbiAgdmFyIENPTk5FQ1RFRF9BVFxuXG4gIHZhciB0eXBlXG5cbiAgdmFyIGFuYWx5c2VyID0gY29udGV4dC5jcmVhdGVBbmFseXNlcigpXG4gIHZhciBhbmFseXNlckRhdGFBcnJheSAvLyB0aGUgYnVmZmVyIHRoZSBhbmFseXNlciB3cml0ZXMgdG9cbiAgdmFyIGJ1ZmZlckxlbmd0aCAvLyB0aGUgbGVuZ3RoIG9mIHRoZSBhbmFseXNlckRhdGFBcnJheVxuXG4gIHZhciBsb2NhbEFuYWx5c2VyID0gY29udGV4dC5jcmVhdGVBbmFseXNlcigpXG4gIHZhciBsb2NhbEFuYWx5c2VyRGF0YUFycmF5IC8vIHRoZSBidWZmZXIgdGhlIGFuYWx5c2VyIHdyaXRlcyB0b1xuXG4gIHZhciBwZWFrX3JhbmdlcyAvLyBmbGF0IGxpc3Qgb2YgaW5kZXhlcyBvZiBkZXRlY3RlZCBwZWFrIHJhbmdlc1xuICB2YXIgZ3JvdXBlZF9wZWFrX3JhbmdlcyAvLyBjbHVzdGVyZWQgZ3JvdXBzIG9mIHBlYWsgcmFuZ2VzXG4gIHZhciBtZWFuIC8vIHRoZSB0aHJlc2hvbGQgZm9yIGRldGVybWluaW5nIGlmIGEgYmFuZCBpcyBwZWFrZWRcblxuICB2YXIgZmxpcF9mbG9wID0gdHJ1ZVxuXG4gIHZhciBwcmV2X2hpZ2hfY2hhbm5lbCA9IC0xXG4gIHZhciBjdXJyZW50X2hpZ2hfY2hhbm5lbCA9IDBcbiAgdmFyIFNZTkNfQ09VTlQgPSAwXG5cbiAgdmFyIG9zY19iYW5rID0gW11cbiAgdmFyIGdhaW5fYmFuayA9IFtdXG4gIHZhciBmaWx0ZXJfYmFuayA9IFtdXG5cbiAgdmFyIG1hc3Rlcl9nYWluXG5cbiAgLy8gdmFyIG5fb3NjID0gNDRcbiAgdmFyIG5fb3NjID0gKDgqQllURVNfVE9fRU5DT0RFKSArIDNcbiAgdmFyIGZyZXFSYW5nZSA9IDIwMDAwXG4gIHZhciBzcHJlYWQgPSAoZnJlcVJhbmdlIC8gbl9vc2MpXG4gIHZhciBpbml0aWFsRnJlcSA9IDE1MFxuXG4gIHZhciBDVVJSRU5UX1NUQVRFID0gLTFcblxuICBmdW5jdGlvbiB0aWNrKCkge1xuXG4gICAgdmFyIHJldF9vYmogPSB7XG4gICAgICBuZXdfZGF0YTogZmFsc2UsXG4gICAgICBkYXRhOiAnJ1xuICAgIH1cblxuICAgIGlmIChDVVJSRU5UX1NUQVRFIDwgMCkge1xuXG4gICAgICAvLyBwZXJmb3JtaW5nIGluaXRpYWxpemF0aW9uIHByb2Nlc3MsIGRvIG5vdGhpbmdcbiAgICAgIHJldHVybjtcblxuICAgIH0gZWxzZSB7XG5cbiAgICAgIGlmIChDVVJSRU5UX1NUQVRFID09PSAwKSB7XG5cbiAgICAgICAgcmVnaXN0ZXJfcGVha19yYW5nZXMoKVxuXG4gICAgICAgIGlmIChncm91cGVkX3BlYWtfcmFuZ2VzLmxlbmd0aCA9PT0gbl9vc2MpIHtcbiAgICAgICAgICBDVVJSRU5UX1NUQVRFID0gMVxuICAgICAgICB9XG5cbiAgICAgIH0gZWxzZSBpZiAoQ1VSUkVOVF9TVEFURSA9PT0gMSkge1xuXG4gICAgICAgIHBlcmZvcm1fc2lnbmFsaW5nKClcbiAgICAgICAgbG9va19mb3Jfc2lnbmFsaW5nKClcblxuICAgICAgICBpZiAoU1lOQ19DT1VOVCA+IDIpIHtcbiAgICAgICAgICBDVVJSRU5UX1NUQVRFID0gMlxuICAgICAgICAgIENPTk5FQ1RFRF9BVCA9IERhdGUubm93KClcbiAgICAgICAgfVxuXG4gICAgICB9IGVsc2UgaWYgKENVUlJFTlRfU1RBVEUgPT09IDIpIHtcblxuICAgICAgICAvLyBlbmNvZGUgYnl0ZVxuICAgICAgICAvLyB2YXIgYnl0ZV90b19zZW5kID0gTUVTU0FHRVtNRVNTQUdFX0lEWF0uY2hhckNvZGVBdCgwKVxuICAgICAgICAvLyBlbmNvZGVfYnl0ZShieXRlX3RvX3NlbmQpXG5cbiAgICAgICAgLy8gZW5jb2RlIGJ5dGUgYXJyYXlcbiAgICAgICAgdmFyIHN1YnN0cmluZyA9IE1FU1NBR0Uuc3Vic3RyKE1FU1NBR0VfSURYLEJZVEVTX1RPX0VOQ09ERSlcbiAgICAgICAgZW5jb2RlX3N0cmluZyhzdWJzdHJpbmcpXG5cbiAgICAgICAgaWYgKGxvb2tfZm9yX3NpZ25hbGluZygpKSB7XG5cbiAgICAgICAgICAvLyByZWFkIGJ5dGVcbiAgICAgICAgICAvL1JYX0JVRkZFUiArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJlYWRfYnl0ZV9mcm9tX3NpZ25hbCgpKVxuICAgICAgICAgIFJYX0JVRkZFUiArPSByZWFkX2J5dGVfYXJyYXlfZnJvbV9zaWduYWwoQllURVNfVE9fRU5DT0RFKVxuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFJYX0JVRkZFUilcblxuICAgICAgICAgIGlmICh0eXBlID09PSAnY2xpZW50Jykge1xuICAgICAgICAgICAgcmV0X29iai5uZXdfZGF0YSA9IHRydWVcbiAgICAgICAgICAgIHJldF9vYmouZGF0YSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmVhZF9ieXRlX2Zyb21fc2lnbmFsKEJZVEVTX1RPX0VOQ09ERSkpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gaW5jcmVtZW50IGJ5dGUgdG8gZW5jb2RlXG4gICAgICAgICAgTUVTU0FHRV9JRFggKz0gQllURVNfVE9fRU5DT0RFXG4gICAgICAgICAgaWYoTUVTU0FHRV9JRFggPiBNRVNTQUdFLmxlbmd0aCl7XG4gICAgICAgICAgICBNRVNTQUdFX0lEWCA9IDBcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gTUVTU0FHRV9JRFggPSBNRVNTQUdFX0lEWCAlIE1FU1NBR0UubGVuZ3RoXG5cbiAgICAgICAgICBwZXJmb3JtX3NpZ25hbGluZygpXG5cbiAgICAgICAgfVxuXG4gICAgICB9IC8vIGVuZCBvZiBDVVJSRU5UX1NUQVRFID09PSAyXG5cbiAgICB9XG5cbiAgICByZXR1cm4gcmV0X29ialxuXG4gIH1cblxuXG4gIGZ1bmN0aW9uIGxvb2tfZm9yX3NpZ25hbGluZygpIHtcblxuICAgIHZhciB2YWxpZF9yYW5nZXMgPSB2YWxpZGF0ZV9yYW5nZXMoKVxuICAgIGlmICh2YWxpZF9yYW5nZXNbOF0gPT09IHRydWUgJiYgdmFsaWRfcmFuZ2VzWzldID09PSBmYWxzZSkge1xuICAgICAgY3VycmVudF9oaWdoX2NoYW5uZWwgPSA4XG4gICAgfSBlbHNlIHtcbiAgICAgIGN1cnJlbnRfaGlnaF9jaGFubmVsID0gOVxuICAgIH1cblxuICAgIHZhciBkaWZmZXJlbmNlX2ZvdW5kID0gZmFsc2VcblxuICAgIGlmIChjdXJyZW50X2hpZ2hfY2hhbm5lbCAhPT0gcHJldl9oaWdoX2NoYW5uZWwpIHtcbiAgICAgIGRpZmZlcmVuY2VfZm91bmQgPSB0cnVlXG4gICAgICBTWU5DX0NPVU5UICs9IDFcbiAgICB9XG5cbiAgICBwcmV2X2hpZ2hfY2hhbm5lbCA9IGN1cnJlbnRfaGlnaF9jaGFubmVsXG5cbiAgICByZXR1cm4gZGlmZmVyZW5jZV9mb3VuZFxuXG4gIH1cblxuICBmdW5jdGlvbiBpbml0KG9wdHMpIHtcblxuICAgIG1hc3Rlcl9nYWluID0gY29udGV4dC5jcmVhdGVHYWluKClcbiAgICBtYXN0ZXJfZ2Fpbi5nYWluLnZhbHVlID0gMFxuICAgIG1hc3Rlcl9nYWluLmNvbm5lY3QoY29udGV4dC5kZXN0aW5hdGlvbilcblxuICAgIE1FU1NBR0UgPSBvcHRzLm1lc3NhZ2VcbiAgICB0eXBlID0gb3B0cy50eXBlXG5cbiAgICAvLyBjcmVhdGUgb3NjICsgZ2FpbiBiYW5rc1xuICAgIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IG5fb3NjOyBpZHgrKykge1xuXG4gICAgICB2YXIgbG9jYWxfb3NjID0gY29udGV4dC5jcmVhdGVPc2NpbGxhdG9yKClcbiAgICAgIGxvY2FsX29zYy5mcmVxdWVuY3kudmFsdWUgPSAoaWR4ICogc3ByZWFkKSArIGluaXRpYWxGcmVxXG5cbiAgICAgIHZhciBsb2NhbF9nYWluID0gY29udGV4dC5jcmVhdGVHYWluKClcbiAgICAgIGxvY2FsX2dhaW4uZ2Fpbi52YWx1ZSA9IDEuMCAvIChuX29zYy0xKVxuXG4gICAgICAvLyB2YXIgbG9jYWxfZmlsdGVyID0gY29udGV4dC5jcmVhdGVCaXF1YWRGaWx0ZXIoKVxuICAgICAgLy8gbG9jYWxfZmlsdGVyLnR5cGUgPSAnYmFuZHBhc3MnXG4gICAgICAvLyBsb2NhbF9maWx0ZXIuZnJlcXVlbmN5LnZhbHVlID0gKGlkeCAqIHNwcmVhZCkgKyBpbml0aWFsRnJlcVxuICAgICAgLy8gbG9jYWxfZmlsdGVyLlEudmFsdWUgPSAxLjBcbiAgICAgIC8vXG4gICAgICAvLyB3aW5kb3cuZCA9IGxvY2FsX2ZpbHRlclxuXG4gICAgICBsb2NhbF9vc2MuY29ubmVjdChsb2NhbF9nYWluKVxuXG4gICAgICAvLyBsb2NhbF9nYWluLmNvbm5lY3QobG9jYWxfZmlsdGVyKVxuXG4gICAgICBsb2NhbF9nYWluLmNvbm5lY3QobG9jYWxBbmFseXNlcilcbiAgICAgIGxvY2FsX2dhaW4uY29ubmVjdChtYXN0ZXJfZ2FpbilcbiAgICAgIC8vIGxvY2FsX2dhaW4uY29ubmVjdChjb250ZXh0LmRlc3RpbmF0aW9uKVxuXG4gICAgICBsb2NhbF9vc2Muc3RhcnQoKVxuXG4gICAgICBvc2NfYmFuay5wdXNoKGxvY2FsX29zYylcbiAgICAgIGdhaW5fYmFuay5wdXNoKGxvY2FsX2dhaW4pXG4gICAgICAvLyBmaWx0ZXJfYmFuay5wdXNoKGxvY2FsX2ZpbHRlcilcblxuICAgIH1cblxuICAgIGFuYWx5c2VyLmZmdFNpemUgPSAxMDI0XG4gICAgYW5hbHlzZXIuc21vb3RoaW5nVGltZUNvbnN0YW50ID0gMFxuICAgIGJ1ZmZlckxlbmd0aCA9IGFuYWx5c2VyLmZyZXF1ZW5jeUJpbkNvdW50XG4gICAgYW5hbHlzZXJEYXRhQXJyYXkgPSBuZXcgVWludDhBcnJheShidWZmZXJMZW5ndGgpXG5cbiAgICBsb2NhbEFuYWx5c2VyLmZmdFNpemUgPSAxMDI0XG4gICAgbG9jYWxBbmFseXNlci5zbW9vdGhpbmdUaW1lQ29uc3RhbnQgPSAwXG4gICAgbG9jYWxBbmFseXNlckRhdGFBcnJheSA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlckxlbmd0aClcblxuICB9XG5cbiAgZnVuY3Rpb24gY29ubmVjdChvdGhlcl9hZ2VudCkge1xuXG4gICAgdmFyIG90aGVyX2dhaW5fYmFuayA9IG90aGVyX2FnZW50LmdldF9nYWluX2JhbmsoKVxuXG4gICAgb3RoZXJfZ2Fpbl9iYW5rLmZvckVhY2goZnVuY3Rpb24gKGdhaW5Ob2RlKSB7XG4gICAgICBnYWluTm9kZS5jb25uZWN0KGFuYWx5c2VyKVxuICAgIH0pXG5cbiAgICAvLyB2YXIgb3RoZXJfZmlsdGVyX2JhbmsgPSBvdGhlcl9hZ2VudC5nZXRfZmlsdGVyX2JhbmsoKVxuICAgIC8vXG4gICAgLy8gb3RoZXJfZmlsdGVyX2JhbmsuZm9yRWFjaChmdW5jdGlvbihmaWx0ZXJOb2RlKXtcbiAgICAvLyAgIGZpbHRlck5vZGUuY29ubmVjdChhbmFseXNlcilcbiAgICAvLyB9KVxuXG4gICAgZ2V0QnVmZmVyKClcblxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgY29uc29sZS5sb2coJ2RvbmUgY29ubmVjdGluZycpXG4gICAgICBDVVJSRU5UX1NUQVRFID0gMFxuICAgIH0sIDIwMClcblxuICB9XG5cbiAgZnVuY3Rpb24gc2V0X21lc3NhZ2UobXNnKXtcbiAgICBNRVNTQUdFID0gbXNnXG4gICAgTUVTU0FHRV9JRFggPSAwXG4gIH1cblxuICBmdW5jdGlvbiBuX2NoYW5uZWxzKCkge1xuICAgIHJldHVybiBuX29zY1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0X2dyb3VwcygpIHtcbiAgICByZXR1cm4gZ3JvdXBlZF9wZWFrX3Jhbmdlc1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0QnVmZmVyKCkge1xuICAgIGFuYWx5c2VyLmdldEJ5dGVGcmVxdWVuY3lEYXRhKGFuYWx5c2VyRGF0YUFycmF5KVxuICAgIHJldHVybiBhbmFseXNlckRhdGFBcnJheVxuICB9XG4gIGZ1bmN0aW9uIGdldF9sb2NhbF9mcmVxdWVuY3lfZGF0YV9idWZmZXIoKSB7XG4gICAgbG9jYWxBbmFseXNlci5nZXRCeXRlRnJlcXVlbmN5RGF0YShsb2NhbEFuYWx5c2VyRGF0YUFycmF5KVxuICAgIHJldHVybiBsb2NhbEFuYWx5c2VyRGF0YUFycmF5XG4gIH1cblxuICBmdW5jdGlvbiBnZXRfZ2Fpbl9iYW5rKCkge1xuICAgIHJldHVybiBnYWluX2JhbmtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldF9maWx0ZXJfYmFuaygpIHtcbiAgICByZXR1cm4gZmlsdGVyX2JhbmtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gZ2V0X2FuYWx5c2VyKCkge1xuICAgIHJldHVybiBhbmFseXNlclxuICB9XG5cblxuICBmdW5jdGlvbiByZWFkX2J5dGVfZnJvbV9zaWduYWwoKSB7XG5cbiAgICB2YXIgcmFuZ2VzID0gdmFsaWRhdGVfcmFuZ2VzKClcbiAgICAvLyBjb25zb2xlLmxvZyhyYW5nZXMpXG5cbiAgICB2YXIgYmluYXJ5X3N0cmluZyA9ICcnXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCA4OyBpKyspIHtcbiAgICAgIGlmIChyYW5nZXNbaV0pIHtcbiAgICAgICAgYmluYXJ5X3N0cmluZyArPSAnMSdcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJpbmFyeV9zdHJpbmcgKz0gJzAnXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcnNlSW50KGJpbmFyeV9zdHJpbmcsIDIpXG5cbiAgfVxuXG5cbiAgZnVuY3Rpb24gcmVhZF9ieXRlX2FycmF5X2Zyb21fc2lnbmFsKGJ5dGVfY291bnQpIHtcblxuICAgIHZhciByZXR1cm5fYXJyYXkgPSAnJ1xuXG4gICAgdmFyIHJhbmdlcyA9IHZhbGlkYXRlX3JhbmdlcygpXG4gICAgLy8gY29uc29sZS5sb2cocmFuZ2VzKVxuXG4gICAgZm9yKHZhciBieXRlX2NvdW50X2lkeCA9IDA7IGJ5dGVfY291bnRfaWR4IDwgYnl0ZV9jb3VudDsgYnl0ZV9jb3VudF9pZHgrKyl7XG5cbiAgICAgIHZhciBvZmZzZXQgPSAwXG4gICAgICBpZihieXRlX2NvdW50X2lkeCA+IDApe1xuICAgICAgICBvZmZzZXQgKz0gMiArIChieXRlX2NvdW50X2lkeCo4KVxuICAgICAgfVxuXG4gICAgICB2YXIgYmluYXJ5X3N0cmluZyA9ICcnXG4gICAgICBmb3IgKHZhciBpID0gMCtvZmZzZXQ7IGkgPCA4K29mZnNldDsgaSsrKSB7XG4gICAgICAgIGlmIChyYW5nZXNbaV0pIHtcbiAgICAgICAgICBiaW5hcnlfc3RyaW5nICs9ICcxJ1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGJpbmFyeV9zdHJpbmcgKz0gJzAnXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdmFyIGJ5dGUgPSBwYXJzZUludChiaW5hcnlfc3RyaW5nLCAyKVxuICAgICAgcmV0dXJuX2FycmF5ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZSlcbiAgICB9XG5cbiAgICAvLyBjb25zb2xlLmxvZyhyZXR1cm5fYXJyYXkpXG4gICAgcmV0dXJuIHJldHVybl9hcnJheVxuXG4gIH1cblxuICBmdW5jdGlvbiByZWdpc3Rlcl9wZWFrX3JhbmdlcygpIHtcblxuICAgIGNvbnNvbGUubG9nKCdyZWdpc3RlcmluZyBwZWFrIHJhbmdlcycpXG5cbiAgICBnZXRCdWZmZXIoKVxuICAgIGNvbnNvbGUubG9nKGFuYWx5c2VyRGF0YUFycmF5KVxuXG4gICAgLy8gcHVzaCBvbiB0byBuZXcgYXJyYXkgZm9yIHNvcnRpbmdcbiAgICB2YXIgZCA9IFtdXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBidWZmZXJMZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGFuYWx5c2VyRGF0YUFycmF5W2ldID4gMCkge1xuICAgICAgICBkLnB1c2goYW5hbHlzZXJEYXRhQXJyYXlbaV0pXG4gICAgICB9XG4gICAgfVxuICAgIGQuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgcmV0dXJuIGEgLSBiXG4gICAgfSlcbiAgICBjb25zb2xlLmxvZygnTWVhbjogJyArIGRbTWF0aC5mbG9vcihkLmxlbmd0aCAvIDIpXSlcblxuICAgIG1lYW4gPSBkW01hdGguZmxvb3IoZC5sZW5ndGggLyAyKV1cblxuICAgIC8vXG4gICAgcGVha19yYW5nZXMgPSBbXVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYnVmZmVyTGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChhbmFseXNlckRhdGFBcnJheVtpXSA+IG1lYW4pIHtcbiAgICAgICAgcGVha19yYW5nZXMucHVzaChpKVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHdpbmRvdy5wID0gcGVha19yYW5nZXNcblxuICAgIGdyb3VwX3BlYWtfcmFuZ2VzKClcblxuICB9XG5cbiAgZnVuY3Rpb24gY2hlY2tfcGVha19yYW5nZXMoKSB7XG5cbiAgICBnZXRCdWZmZXIoKVxuXG4gICAgdmFyIGhpdHMgPSBbXVxuICAgIHBlYWtfcmFuZ2VzLmZvckVhY2goZnVuY3Rpb24gKGRhdGFBcnJheV9pZHgpIHtcbiAgICAgIGlmIChhbmFseXNlckRhdGFBcnJheVtkYXRhQXJyYXlfaWR4XSA+IG1lYW4pIHtcbiAgICAgICAgaGl0cy5wdXNoKHRydWUpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBoaXRzLnB1c2goZmFsc2UpXG4gICAgICB9XG4gICAgfSlcblxuICAgIHJldHVybiBoaXRzXG5cbiAgfVxuXG4gIGZ1bmN0aW9uIGdyb3VwX3BlYWtfcmFuZ2VzKCkge1xuXG4gICAgaWYgKHBlYWtfcmFuZ2VzID09PSB1bmRlZmluZWQgfHwgcGVha19yYW5nZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGdyb3VwcyA9IFtdIC8vIFsgWzEsMiwzXSwgWzgsOSwxMF0sIFszMCwzMSwzMl0gIF1cblxuICAgIHZhciBjdXJyZW50X2dyb3VwX2lkeCA9IDBcblxuICAgIHZhciBsb2NhbF9ncm91cCA9IG5ldyBBcnJheSgpXG5cbiAgICBwZWFrX3Jhbmdlcy5mb3JFYWNoKGZ1bmN0aW9uIChwZWFrX2lkeCwgaWR4KSB7XG5cbiAgICAgIC8vIGlmIHRoZSBNYXRoLmFicyhwZWFrX2lkeCAtIHBlYWtfcmFuZ2VzW2lkeCsxXSkgPT09IDFcbiAgICAgIC8vICAgIHB1c2ggcGVha19pZHggb24gdG8gbG9jYWxfZ3JvdXBcbiAgICAgIC8vIGVsc2VcbiAgICAgIC8vICAgIHB1c2ggbG9jYWxfZ3JvdXAgb24gdG8gZ3JvdXBzXG4gICAgICAvLyAgICBjbGVhciBsb2NhbF9ncm91cFxuICAgICAgLy8gICAgcHVzaCBwZWFrX2lkeCBvbiB0byBsb2NhbF9ncm91cFxuXG4gICAgICBpZiAoaWR4ID09PSBwZWFrX3Jhbmdlcy5sZW5ndGggLSAxKSB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdoZXJlJylcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoTWF0aC5hYnMocGVha19pZHggLSBwZWFrX3Jhbmdlc1tpZHggKyAxXSkgPD0gMikge1xuICAgICAgICBsb2NhbF9ncm91cC5wdXNoKHBlYWtfaWR4KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9jYWxfZ3JvdXAucHVzaChwZWFrX2lkeClcbiAgICAgICAgZ3JvdXBzLnB1c2gobG9jYWxfZ3JvdXApXG4gICAgICAgIGxvY2FsX2dyb3VwID0gbmV3IEFycmF5KClcbiAgICAgIH1cblxuICAgIH0pXG5cbiAgICBncm91cHMucHVzaChsb2NhbF9ncm91cClcblxuICAgIGdyb3VwZWRfcGVha19yYW5nZXMgPSBncm91cHNcblxuICAgIHJldHVybiBncm91cHNcblxuICB9XG5cbiAgZnVuY3Rpb24gc2V0X2dhaW4oY2hhbm5lbCwgdmFsdWUpIHtcbiAgICBnYWluX2JhbmtbY2hhbm5lbF0uZ2Fpbi52YWx1ZSA9IHZhbHVlXG4gIH1cblxuICBmdW5jdGlvbiBzZXRfdm9sdW1lKHYpe1xuICAgIGlmKHYgPj0gMSl7XG4gICAgICB2PTEuMFxuICAgIH1cbiAgICBtYXN0ZXJfZ2Fpbi5nYWluLnZhbHVlID0gdlxuICB9XG5cbiAgZnVuY3Rpb24gdmFsaWRhdGVfcmFuZ2VzKCkge1xuXG4gICAgaWYgKGdyb3VwZWRfcGVha19yYW5nZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGdldEJ1ZmZlcigpXG5cbiAgICB2YXIgdmFsaWRfZ3JvdXBzID0gW11cblxuICAgIGdyb3VwZWRfcGVha19yYW5nZXMuZm9yRWFjaChmdW5jdGlvbiAoZ3JvdXApIHtcblxuICAgICAgdmFyIGhpdHMgPSAwXG5cbiAgICAgIGdyb3VwLmZvckVhY2goZnVuY3Rpb24gKGlkeCkge1xuICAgICAgICBpZiAoYW5hbHlzZXJEYXRhQXJyYXlbaWR4XSA+PSBtZWFuKSB7XG4gICAgICAgICAgaGl0cyArPSAxXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIGlmIChoaXRzID49IGdyb3VwLmxlbmd0aCAvIDIpIHtcbiAgICAgICAgdmFsaWRfZ3JvdXBzLnB1c2godHJ1ZSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbGlkX2dyb3Vwcy5wdXNoKGZhbHNlKVxuICAgICAgfVxuXG4gICAgfSlcblxuICAgIHJldHVybiB2YWxpZF9ncm91cHNcblxuICB9XG5cbiAgZnVuY3Rpb24gZW5jb2RlX2J5dGUoYnl0ZSkge1xuXG4gICAgdmFyIGNoYXJzID0gZ2V0X2VuY29kZWRfYnl0ZV9hcnJheShieXRlKVxuXG4gICAgLy8gY29uc29sZS5sb2coY2hhcnMpXG5cbiAgICBjaGFycy5mb3JFYWNoKGZ1bmN0aW9uIChjLCBpZHgpIHtcbiAgICAgIGlmIChjID09PSAnMCcpIHtcbiAgICAgICAgc2V0X2dhaW4oaWR4LCAwKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2V0X2dhaW4oaWR4LCAxIC8gbl9vc2MpXG4gICAgICB9XG4gICAgfSlcblxuICB9XG5cbiAgZnVuY3Rpb24gZW5jb2RlX3N0cmluZyhzdHJpbmcpe1xuXG4gICAgdmFyIGJ5dGVzID0gc3RyaW5nLnNwbGl0KCcnKVxuXG4gICAgd2hpbGUoYnl0ZXMubGVuZ3RoIDwgQllURVNfVE9fRU5DT0RFKXtcbiAgICAgIGJ5dGVzLnB1c2goJyAnKVxuICAgIH1cblxuICAgIGJ5dGVzLmZvckVhY2goZnVuY3Rpb24oYnl0ZSxieXRlX2lkeCl7XG5cbiAgICAgIHZhciBvZmZzZXQgPSAoYnl0ZV9pZHggKiA4KSArIDJcbiAgICAgIGlmKGJ5dGVfaWR4ID09PSAwKXtcbiAgICAgICAgb2Zmc2V0ID0gMFxuICAgICAgfVxuXG4gICAgICBieXRlID0gYnl0ZS5jaGFyQ29kZUF0KDApXG5cbiAgICAgIHZhciBjaGFycyA9IGdldF9lbmNvZGVkX2J5dGVfYXJyYXkoYnl0ZSlcblxuICAgICAgLy8gY29uc29sZS5sb2coY2hhcnMpXG5cbiAgICAgIGNoYXJzLmZvckVhY2goZnVuY3Rpb24gKGMsIGlkeCkge1xuICAgICAgICBpZiAoYyA9PT0gJzAnKSB7XG4gICAgICAgICAgc2V0X2dhaW4oaWR4K29mZnNldCwgMClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzZXRfZ2FpbihpZHgrb2Zmc2V0LCAxIC8gbl9vc2MpXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICB9KVxuXG5cblxuICB9XG5cbiAgZnVuY3Rpb24gcGVyZm9ybV9zaWduYWxpbmcoKSB7XG4gICAgZmxpcF9mbG9wID0gIWZsaXBfZmxvcFxuICAgIGlmIChmbGlwX2Zsb3ApIHtcbiAgICAgIHNldF9nYWluKDgsIDEgLyBuX29zYylcbiAgICAgIHNldF9nYWluKDksIDApXG4gICAgfSBlbHNlIHtcbiAgICAgIHNldF9nYWluKDksIDEgLyBuX29zYylcbiAgICAgIHNldF9nYWluKDgsIDApXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0X2VuY29kZWRfYnl0ZV9hcnJheShieXRlKSB7XG4gICAgcmV0dXJuIHBhZChieXRlLnRvU3RyaW5nKDIpLCA4KS5zcGxpdCgnJylcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhZChuLCB3aWR0aCwgeikge1xuICAgIHogPSB6IHx8ICcwJztcbiAgICBuID0gbiArICcnO1xuICAgIHJldHVybiBuLmxlbmd0aCA+PSB3aWR0aCA/IG4gOiBuZXcgQXJyYXkod2lkdGggLSBuLmxlbmd0aCArIDEpLmpvaW4oeikgKyBuO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0X3N0YXRlKCkge1xuICAgIHJldHVybiB7XG4gICAgICBidWZmZXI6IGdldEJ1ZmZlcigpLFxuICAgICAgbG9jYWxfYnVmZmVyOiBnZXRfbG9jYWxfZnJlcXVlbmN5X2RhdGFfYnVmZmVyKCksXG4gICAgICBSWF9CVUZGRVI6IFJYX0JVRkZFUixcbiAgICAgIENVUlJFTlRfU1RBVEU6IENVUlJFTlRfU1RBVEUsXG4gICAgICBTWU5DX0NPVU5UOiBTWU5DX0NPVU5ULFxuICAgICAgTUVTU0FHRTogTUVTU0FHRSxcbiAgICAgIE1FU1NBR0VfSURYOiBNRVNTQUdFX0lEWCxcbiAgICAgIENPTk5FQ1RFRF9BVDogQ09OTkVDVEVEX0FUXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVzZXRfYmF1ZF9jb3VudCgpe1xuICAgIFJYX0JVRkZFUiA9ICcnXG4gICAgQ09OTkVDVEVEX0FUID0gRGF0ZS5ub3coKVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBjaGVja19wZWFrX3JhbmdlczogY2hlY2tfcGVha19yYW5nZXMsXG4gICAgY29ubmVjdDogY29ubmVjdCxcbiAgICBlbmNvZGVfcmFuZ2U6IGVuY29kZV9ieXRlLFxuICAgIGdldEJ1ZmZlcjogZ2V0QnVmZmVyLFxuICAgIGdldF9hbmFseXNlcjogZ2V0X2FuYWx5c2VyLFxuICAgIGdldF9lbmNvZGVkX2J5dGVfYXJyYXk6IGdldF9lbmNvZGVkX2J5dGVfYXJyYXksXG4gICAgZ2V0X2ZpbHRlcl9iYW5rOiBnZXRfZmlsdGVyX2JhbmssXG4gICAgZ2V0X2dhaW5fYmFuazogZ2V0X2dhaW5fYmFuayxcbiAgICBnZXRfZ3JvdXBzOiBnZXRfZ3JvdXBzLFxuICAgIGdldF9sb2NhbF9mcmVxdWVuY3lfZGF0YV9idWZmZXI6IGdldF9sb2NhbF9mcmVxdWVuY3lfZGF0YV9idWZmZXIsXG4gICAgZ2V0X3N0YXRlOiBnZXRfc3RhdGUsXG4gICAgZ3JvdXBfcGVha19yYW5nZXM6IGdyb3VwX3BlYWtfcmFuZ2VzLFxuICAgIGluaXQ6IGluaXQsXG4gICAgbl9jaGFubmVsczogbl9jaGFubmVscyxcbiAgICBzZXRfZ2Fpbjogc2V0X2dhaW4sXG4gICAgc2V0X21lc3NhZ2U6IHNldF9tZXNzYWdlLFxuICAgIHNldF92b2x1bWU6IHNldF92b2x1bWUsXG4gICAgcmVhZF9ieXRlX2Zyb21fc2lnbmFsOiByZWFkX2J5dGVfZnJvbV9zaWduYWwsXG4gICAgcmVzZXRfYmF1ZF9jb3VudDogcmVzZXRfYmF1ZF9jb3VudCxcbiAgICB0aWNrOiB0aWNrLFxuICAgIHZhbGlkYXRlX3JhbmdlczogdmFsaWRhdGVfcmFuZ2VzLFxuICB9O1xuXG59XG4iLCJ3aW5kb3cub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAvLyBcInVzZSBzdHJpY3RcIjtcblxuICB3aW5kb3cuY29uc29sZS50aW1lID0gZnVuY3Rpb24oKXt9OyAgd2luZG93LmNvbnNvbGUudGltZUVuZCA9IGZ1bmN0aW9uKCl7fVxuXG4gIHZhciBET19EUkFXID0gdHJ1ZVxuXG4gIHZhciBCQVVEX1JBVEUgPSAyNFxuICB2YXIgcGFyZW50X2JhdWRfcmF0ZSA9IGQzLnNlbGVjdCgnZGl2I2JhdWRfcmF0ZScpLmFwcGVuZCgnZGl2JykuYXR0cignY2xhc3MnLCdjb2wtbWQtOCBjb2wtbWQtb2Zmc2V0LTInKVxuXG4gIHBhcmVudF9iYXVkX3JhdGUuYXBwZW5kKCdoNCcpLmF0dHIoJ2NsYXNzJywgJ3RleHQtY2VudGVyJykuaHRtbCgnbW9kZW0gc3BlZWQnKVxuICB2YXIgYmF1ZF9zY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpLmRvbWFpbihbMTAwLDBdKS5yYW5nZShbMTYsMjAwXSlcbiAgdmFyIGJhdWRfc2xpZGVyID0gcGFyZW50X2JhdWRfcmF0ZS5hcHBlbmQoJ2lucHV0JykuYXR0cigndHlwZScsJ3JhbmdlJylcbiAgICAuYXR0cignbWluJywgMC4wKVxuICAgIC5hdHRyKCdtYXgnLCAxMDAuMClcbiAgICAuYXR0cigndmFsdWUnLCA4MC4wKVxuXG4gICAgYmF1ZF9zbGlkZXIub24oJ2lucHV0JywgZnVuY3Rpb24oKXtcbiAgICAvLyBjb25zb2xlLmxvZyhkMy5ldmVudClcbiAgICB2YXIgdiA9IGQzLnNlbGVjdCh0aGlzKS5ub2RlKCkudmFsdWVcblxuICAgIEJBVURfUkFURSA9IGJhdWRfc2NhbGUodilcblxuICAgIHdpbmRvdy5hbGljZS5yZXNldF9iYXVkX2NvdW50KClcbiAgICB3aW5kb3cuYm9iLnJlc2V0X2JhdWRfY291bnQoKVxuXG4gIH0pXG5cbiAgdmFyIHVkcF9tb2RlID0gdHJ1ZVxuXG4gIGNvbnNvbGUubG9nKCdtYWluLmpzIC8gd2luZG93Lm9ubG9hZCBhbm9ueW1vdXMgZnVuY3Rpb24nKVxuXG4gIHZhciBtZXNzYWdlX3RvX3NlbmQgPSAnYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXonXG4gIHZhciBvdXRwdXRfbXNnID0gJydcblxuICB2YXIgQWdlbnQgPSByZXF1aXJlKCcuL2FnZW50LmpzJylcbiAgdmFyIFZpZXdfQ29udHJvbGxlciA9IHJlcXVpcmUoJy4vdmlld19jb250cm9sbGVyLmpzJylcblxuICB3aW5kb3cuYWxpY2UgPSBBZ2VudC5hZ2VudCgpXG4gIGFsaWNlLmluaXQoe1xuICAgIHR5cGU6ICdjbGllbnQnLFxuICAgIG1lc3NhZ2U6ICcuLi4gPSkgLi4uICdcbiAgfSlcblxuICB3aW5kb3cuYm9iID0gQWdlbnQuYWdlbnQoKVxuICBib2IuaW5pdCh7XG4gICAgdHlwZTogJ3NlcnZlcicsXG4gICAgbWVzc2FnZTogbWVzc2FnZV90b19zZW5kXG4gIH0pXG5cbiAgdmFyIGRpc3BsYXlfYWxpY2UgPSBWaWV3X0NvbnRyb2xsZXIudmlld19jb250cm9sbGVyKCdhbGljZV9tb2RlbScpXG4gIGRpc3BsYXlfYWxpY2UuY29ubmVjdChhbGljZSlcblxuICB2YXIgZGlzcGxheV9ib2IgPSBWaWV3X0NvbnRyb2xsZXIudmlld19jb250cm9sbGVyKCdib2JfbW9kZW0nKVxuICBkaXNwbGF5X2JvYi5jb25uZWN0KGJvYilcblxuICBhbGljZS5jb25uZWN0KGJvYilcbiAgYm9iLmNvbm5lY3QoYWxpY2UpXG5cbiAgc2V0VGltZW91dChkcmF3LCA1MDApXG5cbiAgZnVuY3Rpb24gZHJhdygpIHtcblxuICAgIGNvbnNvbGUudGltZSgndGVzdCcpXG4gICAgYWxpY2UudGljaygpXG4gICAgYm9iLnRpY2soKVxuICAgIGNvbnNvbGUudGltZUVuZCgndGVzdCcpXG5cbiAgICAvLyBpZigpe1xuICAgICAgY29uc29sZS50aW1lKCdkaXNwbGF5JylcbiAgICAgIGRpc3BsYXlfYWxpY2UudGljayhET19EUkFXKVxuICAgICAgZGlzcGxheV9ib2IudGljayhET19EUkFXKVxuICAgICAgY29uc29sZS50aW1lRW5kKCdkaXNwbGF5JylcbiAgICAvLyB9XG5cbiAgICBzZXRUaW1lb3V0KGRyYXcsIEJBVURfUkFURSlcbiAgICAvLyB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGRyYXcpO1xuXG4gIH1cblxufVxuIiwibW9kdWxlLmV4cG9ydHMudmlld19jb250cm9sbGVyID0gdmlld19jb250cm9sbGVyXG5cbmZ1bmN0aW9uIHZpZXdfY29udHJvbGxlcihkaXZfaWQpIHtcblxuICBcInVzZSBzdHJpY3RcIjtcblxuICB2YXIgbmFtZSA9IGRpdl9pZFxuXG4gIHZhciBhZ2VudFxuICB2YXIgcGFyZW50ID0gZDMuc2VsZWN0KCdkaXYjJyArIGRpdl9pZClcblxuICAvLyBkaXNwbGF5XG4gIC8vICAgIGN1cnJlbnQgc3RhdGVcbiAgLy8gICAgc3luYyBjb3VudFxuICAvLyAgICBvc2NpbGxvc2NvcGUgb2Ygb3V0cHV0ICYgaW5wdXRcbiAgLy8gICAgZmZ0IGJhcnMgb2Ygb3V0cHV0ICYgaW5wdXRcbiAgLy8gICAgY3VycmVudCBiYXVkXG4gIC8vICAgIHJ4IGJ1ZmZlclxuXG4gIHZhciBzdmdcbiAgdmFyIGRpdl9zeW5jX2NvdW50XG4gIHZhciBzeW5jX2luZGljYXRvclxuICB2YXIgZGl2X3J4X2J1ZmZlclxuICB2YXIgZGl2X2JhdWRfbWV0ZXJcbiAgdmFyIGJhcnMgPSBbXVxuXG4gIHZhciBXSURUSCA9IDEwMjRcbiAgdmFyIEhFSUdIVCA9IDI1NlxuXG4gIHZhciBiYXJXaWR0aFxuICB2YXIgYnVmZmVyTGVuZ3RoXG4gICAgLy8gdmFyIGJhckhlaWdodFxuXG4gIC8vIGNyZWF0ZSBzdmdcbiAgZnVuY3Rpb24gc2V0dXBfc3ZnKCkge1xuXG4gICAgdmFyIHN0YXRlID0gYWdlbnQuZ2V0X3N0YXRlKClcblxuICAgIFdJRFRIID0gYnVmZmVyTGVuZ3RoXG4gICAgSEVJR0hUID0gV0lEVEggLyA0XG5cbiAgICBiYXJXaWR0aCA9IChXSURUSCAvIGJ1ZmZlckxlbmd0aClcblxuICAgIHBhcmVudC5hcHBlbmQoJ2gxJykuYXR0cignY2xhc3MnLCAndGV4dC1jZW50ZXInKS5odG1sKG5hbWUpXG5cbiAgICBzdmcgPSBwYXJlbnQuYXBwZW5kKCdzdmcnKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ2ltZy1yZXNwb25zaXZlJylcbiAgICAgIC5hdHRyKCd3aWR0aCcsICcxMDAlJylcbiAgICAgIC8vIC5hdHRyKCdoZWlnaHQnLCBIRUlHSFQpXG4gICAgICAuYXR0cigncHJlc2VydmVBc3BlY3RSYXRpbycsICd4TWlkWU1pZCcpXG4gICAgICAuYXR0cigndmlld0JveCcsICcwIDAgJyArIFdJRFRIICsgJyAnICsgSEVJR0hUKVxuICAgICAgLnN0eWxlKCdiYWNrZ3JvdW5kLWNvbG9yJywgJ3JnYmEoMCwwLDAsMC4xKScpXG5cbiAgICBzdmcuYXBwZW5kKCd0ZXh0JylcbiAgICAgIC50ZXh0KCdyZWNlaXZlciBzcGVjdHJ1bScpXG4gICAgICAuYXR0cigneCcsIFdJRFRIKVxuICAgICAgLmF0dHIoJ3knLCAxMilcbiAgICAgIC5hdHRyKCdkeCcsICctNHB4JylcbiAgICAgIC5zdHlsZSgnZm9udC1zaXplJywgMTIpXG4gICAgICAuc3R5bGUoJ3RleHQtYW5jaG9yJywgJ2VuZCcpXG4gICAgICAuYXR0cignZmlsbCcsICdyZ2JhKDAsMCwwLDAuMSknKVxuXG5cbiAgICBiYXJzID0gW11cbiAgICBmb3IgKHZhciBzdmdiYXJzID0gMDsgc3ZnYmFycyA8IGJ1ZmZlckxlbmd0aDsgc3ZnYmFycysrKSB7XG4gICAgICB2YXIgYmFyID0gc3ZnLmFwcGVuZCgncmVjdCcpXG4gICAgICAgIC5hdHRyKCd4JywgYmFyV2lkdGggKiBzdmdiYXJzKVxuICAgICAgICAuYXR0cigneScsIDApXG4gICAgICAgIC5hdHRyKCd3aWR0aCcsIGJhcldpZHRoKVxuICAgICAgICAuYXR0cignaGVpZ2h0JywgMClcbiAgICAgICAgLmF0dHIoJ2ZpbGwnLCAnZ3JlZW4nKVxuICAgICAgICAuYXR0cignc3Ryb2tlJywgJ25vbmUnKVxuXG4gICAgICB2YXIgYmFyX2lkeCA9IHN2Z2JhcnNcbiAgICAgIGJhci5vbignbW91c2VvdmVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhiYXJfaWR4KVxuICAgICAgfSlcblxuICAgICAgYmFycy5wdXNoKGJhcilcbiAgICB9XG5cbiAgICAvLyBzeW5jIGNvdW50XG4gICAgZGl2X3N5bmNfY291bnQgPSBwYXJlbnQuYXBwZW5kKCdkaXYnKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ2NvbC1tZC00JylcbiAgICAgIC5zdHlsZSgnb3V0bGluZScsICcxcHggZG90dGVkIHJnYmEoMCwwLDAsMC4xKScpXG5cbiAgICBkaXZfc3luY19jb3VudC5hcHBlbmQoJ2g0JykuYXR0cignY2xhc3MnLCAndGV4dC1jZW50ZXInKS5odG1sKCdzeW5jaHJvbml6YXRpb24gY291bnRzJylcbiAgICBzeW5jX2luZGljYXRvciA9IGRpdl9zeW5jX2NvdW50LmFwcGVuZCgnZGl2JykuYXR0cignY2xhc3MnLCAndGV4dC1jZW50ZXIgc3luY19jb3VudCcpXG5cbiAgICAvLyBiYXVkIG1ldGVyXG4gICAgdmFyIHBhcmVudF9iYXVkX21ldGVyID0gcGFyZW50LmFwcGVuZCgnZGl2JykuYXR0cignY2xhc3MnLCAnY29sLW1kLTQnKVxuICAgICAgLnN0eWxlKCdvdXRsaW5lJywgJzFweCBkb3R0ZWQgcmdiYSgwLDAsMCwwLjEpJylcblxuICAgIHBhcmVudF9iYXVkX21ldGVyLmFwcGVuZCgnaDQnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlcicpLmh0bWwoJ2JhdWQnKVxuICAgIGRpdl9iYXVkX21ldGVyID0gcGFyZW50X2JhdWRfbWV0ZXIuYXBwZW5kKCdkaXYnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlcicpXG5cblxuICAgIHZhciBwYXJlbnRfaW5wdXRfc2xpZGVyID0gcGFyZW50LmFwcGVuZCgnZGl2JykuYXR0cignY2xhc3MnLCAnY29sLW1kLTQnKVxuXG4gICAgcGFyZW50X2lucHV0X3NsaWRlci5hcHBlbmQoJ2g0JykuYXR0cignY2xhc3MnLCAndGV4dC1jZW50ZXInKS5odG1sKCd0cmFuc21pdHRlciB2b2x1bWUnKVxuXG4gICAgdmFyIHNsaWRlcl9pdHNlbGYgPSBwYXJlbnRfaW5wdXRfc2xpZGVyLmFwcGVuZCgnaW5wdXQnKS5hdHRyKCd0eXBlJywgJ3JhbmdlJylcbiAgICAgIC5hdHRyKCdtaW4nLCAwLjApXG4gICAgICAuYXR0cignbWF4JywgMTAwLjApXG4gICAgICAuYXR0cigndmFsdWUnLCAwLjApXG5cbiAgICBzbGlkZXJfaXRzZWxmLm9uKCdpbnB1dCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKGQzLmV2ZW50KVxuICAgICAgdmFyIHYgPSBkMy5zZWxlY3QodGhpcykubm9kZSgpLnZhbHVlXG4gICAgICBhZ2VudC5zZXRfdm9sdW1lKHYgLyAxMDAuMClcbiAgICB9KVxuXG4gICAgLy8gcnggYnVmZmVyXG4gICAgdmFyIGRpdl9yeF9idWZmZXJfcGFyZW50ID0gcGFyZW50LmFwcGVuZCgnZGl2JylcbiAgICAgIC5hdHRyKCdjbGFzcycsICdjb2wtbWQtMTInKVxuXG4gICAgZGl2X3J4X2J1ZmZlcl9wYXJlbnQuYXBwZW5kKCdoNCcpLmF0dHIoJ2NsYXNzJywgJ3RleHQtbGVmdCcpLmh0bWwoJ3J4IGJ1ZmZlcicpXG5cbiAgICBkaXZfcnhfYnVmZmVyID0gZGl2X3J4X2J1ZmZlcl9wYXJlbnQuYXBwZW5kKCdwcmUnKS5hdHRyKCdjbGFzcycsICdyeF9idWZmZXInKVxuXG4gICAgLy8gbWVzc2FnZSB0byBzZW5kXG4gICAgdmFyIHBhcmVudF9tZXNzYWdlX3RvX3NlbmQgPSBwYXJlbnQuYXBwZW5kKCdkaXYnKS5hdHRyKCdjbGFzcycsICdjb2wtbWQtMTInKVxuXG4gICAgcGFyZW50X21lc3NhZ2VfdG9fc2VuZC5hcHBlbmQoJ2RpdicpLmF0dHIoJ2NsYXNzJywgJ3RleHQtY2VudGVyJykuaHRtbCgnc2VuZGluZyB0aGlzIG1lc3NhZ2U6JylcblxuICAgIHZhciBpbnB1dF9maWVsZCA9IHBhcmVudF9tZXNzYWdlX3RvX3NlbmQuYXBwZW5kKCdpbnB1dCcpXG4gICAgICAuYXR0cigndHlwZScsICd0ZXh0JylcbiAgICAgIC5hdHRyKCdjbGFzcycsICdtc2dfaW5wdXQnKVxuXG4gICAgaW5wdXRfZmllbGQubm9kZSgpLnZhbHVlID0gc3RhdGUuTUVTU0FHRVxuXG4gICAgaW5wdXRfZmllbGQub24oJ2tleXVwJywgZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHYgPSBpbnB1dF9maWVsZC5ub2RlKCkudmFsdWVcbiAgICAgIGlmICh2ID09PSAnJykge1xuICAgICAgICB2ID0gJyAnXG4gICAgICB9XG5cbiAgICAgIGFnZW50LnNldF9tZXNzYWdlKHYpXG4gICAgfSlcblxuICAgIC8vXG5cbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbm5lY3QocmVtb3RlX2FnZW50KSB7XG4gICAgYWdlbnQgPSByZW1vdGVfYWdlbnRcbiAgICBidWZmZXJMZW5ndGggPSByZW1vdGVfYWdlbnQuZ2V0X3N0YXRlKCkuYnVmZmVyLmxlbmd0aFxuICB9XG5cbiAgZnVuY3Rpb24gdGljayhkcmF3X2JhcnMpIHtcblxuICAgIGlmIChiYXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgc2V0dXBfc3ZnKClcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgc3RhdGUgPSBhZ2VudC5nZXRfc3RhdGUoKVxuXG4gICAgaWYgKGRyYXdfYmFycyA9PT0gdHJ1ZSkge1xuICAgICAgdmFyIGRhdGFBcnJheSA9IHN0YXRlLmJ1ZmZlclxuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJ1ZmZlckxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGJhcnNbaV0uYXR0cignaGVpZ2h0JywgKGRhdGFBcnJheVtpXSAvIDI1NSkgKiBIRUlHSFQpXG4gICAgICB9XG5cbiAgICB9XG5cbiAgICBzeW5jX2luZGljYXRvci5odG1sKHN0YXRlLlNZTkNfQ09VTlQpXG4gICAgZGl2X3J4X2J1ZmZlci5odG1sKHN0YXRlLlJYX0JVRkZFUilcblxuICAgIHZhciBiYXVkID0gOCAqIChzdGF0ZS5SWF9CVUZGRVIubGVuZ3RoIC8gKChEYXRlLm5vdygpIC0gc3RhdGUuQ09OTkVDVEVEX0FUKSAvIDEwMDAuMCkpXG4gICAgZGl2X2JhdWRfbWV0ZXIuaHRtbChiYXVkLnRvRml4ZWQoMikpXG5cbiAgICAvL1xuICAgIC8vIGNvbnNvbGUubG9nKGFnZW50LmdldF9zdGF0ZSgpLlNZTkNfQ09VTlQpXG5cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgdGljazogdGljayxcbiAgICBjb25uZWN0OiBjb25uZWN0XG4gIH1cblxufVxuIl19
