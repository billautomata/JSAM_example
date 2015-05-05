(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

module.exports.agent = agent

var BYTES_TO_ENCODE = 4

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

  var LAST_SENT_MESSAGE = ''
  var CURRENT_ENCODED_MESSAGE = ''

  var LATEST_RX_BLOB = ''
  var PREV_RX_BLOB = ''

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

  if(BYTES_TO_ENCODE === 1){
    n_osc = 14
  }

  var freqRange = 20000
  var spread = (freqRange / n_osc)
  var initialFreq = 800

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
          var bytes_on_wire_string = read_byte_array_from_signal(BYTES_TO_ENCODE)

          PREV_RX_BLOB = LATEST_RX_BLOB
          LATEST_RX_BLOB = bytes_on_wire_string
          RX_BUFFER += bytes_on_wire_string
          // console.log(RX_BUFFER)

          if (type === 'client') {
            ret_obj.new_data = true
            ret_obj.data = String.fromCharCode(read_byte_from_signal(BYTES_TO_ENCODE))
          }

          // increment byte to encode
          MESSAGE_IDX += BYTES_TO_ENCODE
          if(MESSAGE_IDX >= MESSAGE.length){
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

    var fftSize = 512

    analyser.fftSize = fftSize
    analyser.smoothingTimeConstant = 0
    bufferLength = analyser.frequencyBinCount
    analyserDataArray = new Uint8Array(bufferLength)

    localAnalyser.fftSize = fftSize
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
        set_gain(idx, 1 / (n_osc-2))
      }
    })

  }

  function encode_string(string){

    var bytes = string.split('')
    // console.log(string,bytes)

    while(bytes.length < BYTES_TO_ENCODE){
      bytes.push('+')
    }

    LAST_SENT_MESSAGE = CURRENT_ENCODED_MESSAGE
    CURRENT_ENCODED_MESSAGE = bytes.join('')

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
      CONNECTED_AT: CONNECTED_AT,
      CURRENT_ENCODED_MESSAGE: CURRENT_ENCODED_MESSAGE,
      LAST_SENT_MESSAGE: LAST_SENT_MESSAGE,
      LATEST_RX_BLOB: LATEST_RX_BLOB,
      PREV_RX_BLOB: PREV_RX_BLOB
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
    perform_signaling: perform_signaling
  };

}

},{}],2:[function(require,module,exports){
window.onload = function () {
  // "use strict";

  window.console.time = function(){};  window.console.timeEnd = function(){}

  var DO_DRAW = true

  var BAUD_RATE = 1000
  var parent_baud_rate = d3.select('div#baud_rate').append('div').attr('class','col-md-8 col-md-offset-2')

  parent_baud_rate.append('h4').attr('class', 'text-center').html('modem speed')
  var baud_scale = d3.scale.linear().domain([100,0]).range([BAUD_RATE/3.5,BAUD_RATE*10])
  var baud_slider = parent_baud_rate.append('input').attr('type','range')
    .attr('min', 0.0)
    .attr('max', 100.0)
    .attr('value', baud_scale.invert(BAUD_RATE))

    baud_slider.on('input', function(){
    // console.log(d3.event)
    var v = d3.select(this).node().value

    BAUD_RATE = baud_scale(v)

    window.alice.reset_baud_count()
    window.bob.reset_baud_count()

  })

  var udp_mode = true

  console.log('main.js / window.onload anonymous function')

  var message_to_send = '0987654321--testing--1234567890--!!--abcdefghijklmnopqrstuvwxyz'
  message_to_send = '01234567'
  var output_msg = ''

  var Agent = require('./agent.js')
  var View_Controller = require('./view_controller.js')

  window.alice = Agent.agent()
  alice.init({
    type: 'client',
    message: message_to_send
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

    display_alice.tick(DO_DRAW)
    display_bob.tick(DO_DRAW)

    // console.log(bob.get_state().LATEST_RX_BLOB, alice.get_state().LAST_SENT_MESSAGE )

    var alice_state = alice.get_state()
    var bob_state = bob.get_state()

    // console.log(bob_state.LATEST_RX_BLOB.length, alice_state.LAST_SENT_MESSAGE.length)


    if((bob_state.LATEST_RX_BLOB.length !== alice_state.LAST_SENT_MESSAGE.length) || (bob_state.LATEST_RX_BLOB === alice_state.LAST_SENT_MESSAGE)){
      // if(bob_state.LATEST_RX_BLOB === alice_state.LAST_SENT_MESSAGE){
        setTimeout(draw, BAUD_RATE)
      // } else {

      // }
    } else {

      console.log(bob_state.LATEST_RX_BLOB, alice_state.LAST_SENT_MESSAGE)

      console.log('err')

      setTimeout(function(){
        bob.perform_signaling()
        setTimeout(draw, BAUD_RATE*2)
      })


    }

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

    // message to send
    var parent_message_to_send = parent.append('div').attr('class', 'col-md-12')

    parent_message_to_send.append('h4').attr('class', 'text-center').html('sending this message')

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

    // rx buffer
    var div_rx_buffer_parent = parent.append('div')
      .attr('class', 'col-md-12')

    div_rx_buffer_parent.append('h4').attr('class', 'text-center').html('rx buffer')

    div_rx_buffer = div_rx_buffer_parent.append('pre').attr('class', 'rx_buffer')



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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9hZ2VudC5qcyIsImpzL21haW4uanMiLCJqcy92aWV3X2NvbnRyb2xsZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDamxCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzLmFnZW50ID0gYWdlbnRcblxudmFyIEJZVEVTX1RPX0VOQ09ERSA9IDRcblxuZnVuY3Rpb24gYWdlbnQob3B0cykge1xuXG4gIChmdW5jdGlvbiBzZXR1cF9hdWRpb19jb250ZXh0KCkge1xuICAgIGlmICh3aW5kb3cuY29udGV4dCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zb2xlLmxvZygnY3JlYXRpbmcgbmV3IHdpbmRvdy5BdWRpb0NvbnRleHQoKScpXG4gICAgICB3aW5kb3cuY29udGV4dCA9IG5ldyB3aW5kb3cuQXVkaW9Db250ZXh0KClcbiAgICB9XG4gICAgY29uc29sZS5sb2coJ2RvbmUuJylcbiAgfSkoKVxuXG4gIHZhciBNRVNTQUdFXG4gIHZhciBNRVNTQUdFX0lEWCA9IDBcblxuICB2YXIgTEFTVF9TRU5UX01FU1NBR0UgPSAnJ1xuICB2YXIgQ1VSUkVOVF9FTkNPREVEX01FU1NBR0UgPSAnJ1xuXG4gIHZhciBMQVRFU1RfUlhfQkxPQiA9ICcnXG4gIHZhciBQUkVWX1JYX0JMT0IgPSAnJ1xuXG4gIHZhciBSWF9CVUZGRVIgPSAnJ1xuICB2YXIgQ09OTkVDVEVEX0FUXG5cbiAgdmFyIHR5cGVcblxuICB2YXIgYW5hbHlzZXIgPSBjb250ZXh0LmNyZWF0ZUFuYWx5c2VyKClcbiAgdmFyIGFuYWx5c2VyRGF0YUFycmF5IC8vIHRoZSBidWZmZXIgdGhlIGFuYWx5c2VyIHdyaXRlcyB0b1xuICB2YXIgYnVmZmVyTGVuZ3RoIC8vIHRoZSBsZW5ndGggb2YgdGhlIGFuYWx5c2VyRGF0YUFycmF5XG5cbiAgdmFyIGxvY2FsQW5hbHlzZXIgPSBjb250ZXh0LmNyZWF0ZUFuYWx5c2VyKClcbiAgdmFyIGxvY2FsQW5hbHlzZXJEYXRhQXJyYXkgLy8gdGhlIGJ1ZmZlciB0aGUgYW5hbHlzZXIgd3JpdGVzIHRvXG5cbiAgdmFyIHBlYWtfcmFuZ2VzIC8vIGZsYXQgbGlzdCBvZiBpbmRleGVzIG9mIGRldGVjdGVkIHBlYWsgcmFuZ2VzXG4gIHZhciBncm91cGVkX3BlYWtfcmFuZ2VzIC8vIGNsdXN0ZXJlZCBncm91cHMgb2YgcGVhayByYW5nZXNcbiAgdmFyIG1lYW4gLy8gdGhlIHRocmVzaG9sZCBmb3IgZGV0ZXJtaW5pbmcgaWYgYSBiYW5kIGlzIHBlYWtlZFxuXG4gIHZhciBmbGlwX2Zsb3AgPSB0cnVlXG5cbiAgdmFyIHByZXZfaGlnaF9jaGFubmVsID0gLTFcbiAgdmFyIGN1cnJlbnRfaGlnaF9jaGFubmVsID0gMFxuICB2YXIgU1lOQ19DT1VOVCA9IDBcblxuICB2YXIgb3NjX2JhbmsgPSBbXVxuICB2YXIgZ2Fpbl9iYW5rID0gW11cbiAgdmFyIGZpbHRlcl9iYW5rID0gW11cblxuICB2YXIgbWFzdGVyX2dhaW5cblxuICAvLyB2YXIgbl9vc2MgPSA0NFxuICB2YXIgbl9vc2MgPSAoOCpCWVRFU19UT19FTkNPREUpICsgM1xuXG4gIGlmKEJZVEVTX1RPX0VOQ09ERSA9PT0gMSl7XG4gICAgbl9vc2MgPSAxNFxuICB9XG5cbiAgdmFyIGZyZXFSYW5nZSA9IDIwMDAwXG4gIHZhciBzcHJlYWQgPSAoZnJlcVJhbmdlIC8gbl9vc2MpXG4gIHZhciBpbml0aWFsRnJlcSA9IDgwMFxuXG4gIHZhciBDVVJSRU5UX1NUQVRFID0gLTFcblxuICBmdW5jdGlvbiB0aWNrKCkge1xuXG4gICAgdmFyIHJldF9vYmogPSB7XG4gICAgICBuZXdfZGF0YTogZmFsc2UsXG4gICAgICBkYXRhOiAnJ1xuICAgIH1cblxuICAgIGlmIChDVVJSRU5UX1NUQVRFIDwgMCkge1xuXG4gICAgICAvLyBwZXJmb3JtaW5nIGluaXRpYWxpemF0aW9uIHByb2Nlc3MsIGRvIG5vdGhpbmdcbiAgICAgIHJldHVybjtcblxuICAgIH0gZWxzZSB7XG5cbiAgICAgIGlmIChDVVJSRU5UX1NUQVRFID09PSAwKSB7XG5cbiAgICAgICAgcmVnaXN0ZXJfcGVha19yYW5nZXMoKVxuXG4gICAgICAgIGlmIChncm91cGVkX3BlYWtfcmFuZ2VzLmxlbmd0aCA9PT0gbl9vc2MpIHtcbiAgICAgICAgICBDVVJSRU5UX1NUQVRFID0gMVxuICAgICAgICB9XG5cbiAgICAgIH0gZWxzZSBpZiAoQ1VSUkVOVF9TVEFURSA9PT0gMSkge1xuXG4gICAgICAgIHBlcmZvcm1fc2lnbmFsaW5nKClcbiAgICAgICAgbG9va19mb3Jfc2lnbmFsaW5nKClcblxuICAgICAgICBpZiAoU1lOQ19DT1VOVCA+IDIpIHtcbiAgICAgICAgICBDVVJSRU5UX1NUQVRFID0gMlxuICAgICAgICAgIENPTk5FQ1RFRF9BVCA9IERhdGUubm93KClcbiAgICAgICAgfVxuXG4gICAgICB9IGVsc2UgaWYgKENVUlJFTlRfU1RBVEUgPT09IDIpIHtcblxuICAgICAgICAvLyBlbmNvZGUgYnl0ZVxuICAgICAgICAvLyB2YXIgYnl0ZV90b19zZW5kID0gTUVTU0FHRVtNRVNTQUdFX0lEWF0uY2hhckNvZGVBdCgwKVxuICAgICAgICAvLyBlbmNvZGVfYnl0ZShieXRlX3RvX3NlbmQpXG5cbiAgICAgICAgLy8gZW5jb2RlIGJ5dGUgYXJyYXlcbiAgICAgICAgdmFyIHN1YnN0cmluZyA9IE1FU1NBR0Uuc3Vic3RyKE1FU1NBR0VfSURYLEJZVEVTX1RPX0VOQ09ERSlcbiAgICAgICAgZW5jb2RlX3N0cmluZyhzdWJzdHJpbmcpXG5cbiAgICAgICAgaWYgKGxvb2tfZm9yX3NpZ25hbGluZygpKSB7XG5cbiAgICAgICAgICAvLyByZWFkIGJ5dGVcbiAgICAgICAgICAvL1JYX0JVRkZFUiArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJlYWRfYnl0ZV9mcm9tX3NpZ25hbCgpKVxuICAgICAgICAgIHZhciBieXRlc19vbl93aXJlX3N0cmluZyA9IHJlYWRfYnl0ZV9hcnJheV9mcm9tX3NpZ25hbChCWVRFU19UT19FTkNPREUpXG5cbiAgICAgICAgICBQUkVWX1JYX0JMT0IgPSBMQVRFU1RfUlhfQkxPQlxuICAgICAgICAgIExBVEVTVF9SWF9CTE9CID0gYnl0ZXNfb25fd2lyZV9zdHJpbmdcbiAgICAgICAgICBSWF9CVUZGRVIgKz0gYnl0ZXNfb25fd2lyZV9zdHJpbmdcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZyhSWF9CVUZGRVIpXG5cbiAgICAgICAgICBpZiAodHlwZSA9PT0gJ2NsaWVudCcpIHtcbiAgICAgICAgICAgIHJldF9vYmoubmV3X2RhdGEgPSB0cnVlXG4gICAgICAgICAgICByZXRfb2JqLmRhdGEgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJlYWRfYnl0ZV9mcm9tX3NpZ25hbChCWVRFU19UT19FTkNPREUpKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGluY3JlbWVudCBieXRlIHRvIGVuY29kZVxuICAgICAgICAgIE1FU1NBR0VfSURYICs9IEJZVEVTX1RPX0VOQ09ERVxuICAgICAgICAgIGlmKE1FU1NBR0VfSURYID49IE1FU1NBR0UubGVuZ3RoKXtcbiAgICAgICAgICAgIE1FU1NBR0VfSURYID0gMFxuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBNRVNTQUdFX0lEWCA9IE1FU1NBR0VfSURYICUgTUVTU0FHRS5sZW5ndGhcblxuICAgICAgICAgIHBlcmZvcm1fc2lnbmFsaW5nKClcblxuICAgICAgICB9XG5cbiAgICAgIH0gLy8gZW5kIG9mIENVUlJFTlRfU1RBVEUgPT09IDJcblxuICAgIH1cblxuICAgIHJldHVybiByZXRfb2JqXG5cbiAgfVxuXG5cbiAgZnVuY3Rpb24gbG9va19mb3Jfc2lnbmFsaW5nKCkge1xuXG4gICAgdmFyIHZhbGlkX3JhbmdlcyA9IHZhbGlkYXRlX3JhbmdlcygpXG4gICAgaWYgKHZhbGlkX3Jhbmdlc1s4XSA9PT0gdHJ1ZSAmJiB2YWxpZF9yYW5nZXNbOV0gPT09IGZhbHNlKSB7XG4gICAgICBjdXJyZW50X2hpZ2hfY2hhbm5lbCA9IDhcbiAgICB9IGVsc2Uge1xuICAgICAgY3VycmVudF9oaWdoX2NoYW5uZWwgPSA5XG4gICAgfVxuXG4gICAgdmFyIGRpZmZlcmVuY2VfZm91bmQgPSBmYWxzZVxuXG4gICAgaWYgKGN1cnJlbnRfaGlnaF9jaGFubmVsICE9PSBwcmV2X2hpZ2hfY2hhbm5lbCkge1xuICAgICAgZGlmZmVyZW5jZV9mb3VuZCA9IHRydWVcbiAgICAgIFNZTkNfQ09VTlQgKz0gMVxuICAgIH1cblxuICAgIHByZXZfaGlnaF9jaGFubmVsID0gY3VycmVudF9oaWdoX2NoYW5uZWxcblxuICAgIHJldHVybiBkaWZmZXJlbmNlX2ZvdW5kXG5cbiAgfVxuXG4gIGZ1bmN0aW9uIGluaXQob3B0cykge1xuXG4gICAgbWFzdGVyX2dhaW4gPSBjb250ZXh0LmNyZWF0ZUdhaW4oKVxuICAgIG1hc3Rlcl9nYWluLmdhaW4udmFsdWUgPSAwXG4gICAgbWFzdGVyX2dhaW4uY29ubmVjdChjb250ZXh0LmRlc3RpbmF0aW9uKVxuXG4gICAgTUVTU0FHRSA9IG9wdHMubWVzc2FnZVxuICAgIHR5cGUgPSBvcHRzLnR5cGVcblxuICAgIC8vIGNyZWF0ZSBvc2MgKyBnYWluIGJhbmtzXG4gICAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgbl9vc2M7IGlkeCsrKSB7XG5cbiAgICAgIHZhciBsb2NhbF9vc2MgPSBjb250ZXh0LmNyZWF0ZU9zY2lsbGF0b3IoKVxuICAgICAgbG9jYWxfb3NjLmZyZXF1ZW5jeS52YWx1ZSA9IChpZHggKiBzcHJlYWQpICsgaW5pdGlhbEZyZXFcblxuICAgICAgdmFyIGxvY2FsX2dhaW4gPSBjb250ZXh0LmNyZWF0ZUdhaW4oKVxuICAgICAgbG9jYWxfZ2Fpbi5nYWluLnZhbHVlID0gMS4wIC8gKG5fb3NjLTEpXG5cbiAgICAgIC8vIHZhciBsb2NhbF9maWx0ZXIgPSBjb250ZXh0LmNyZWF0ZUJpcXVhZEZpbHRlcigpXG4gICAgICAvLyBsb2NhbF9maWx0ZXIudHlwZSA9ICdiYW5kcGFzcydcbiAgICAgIC8vIGxvY2FsX2ZpbHRlci5mcmVxdWVuY3kudmFsdWUgPSAoaWR4ICogc3ByZWFkKSArIGluaXRpYWxGcmVxXG4gICAgICAvLyBsb2NhbF9maWx0ZXIuUS52YWx1ZSA9IDEuMFxuICAgICAgLy9cbiAgICAgIC8vIHdpbmRvdy5kID0gbG9jYWxfZmlsdGVyXG5cbiAgICAgIGxvY2FsX29zYy5jb25uZWN0KGxvY2FsX2dhaW4pXG5cbiAgICAgIC8vIGxvY2FsX2dhaW4uY29ubmVjdChsb2NhbF9maWx0ZXIpXG5cbiAgICAgIGxvY2FsX2dhaW4uY29ubmVjdChsb2NhbEFuYWx5c2VyKVxuICAgICAgbG9jYWxfZ2Fpbi5jb25uZWN0KG1hc3Rlcl9nYWluKVxuICAgICAgLy8gbG9jYWxfZ2Fpbi5jb25uZWN0KGNvbnRleHQuZGVzdGluYXRpb24pXG5cbiAgICAgIGxvY2FsX29zYy5zdGFydCgpXG5cbiAgICAgIG9zY19iYW5rLnB1c2gobG9jYWxfb3NjKVxuICAgICAgZ2Fpbl9iYW5rLnB1c2gobG9jYWxfZ2FpbilcbiAgICAgIC8vIGZpbHRlcl9iYW5rLnB1c2gobG9jYWxfZmlsdGVyKVxuXG4gICAgfVxuXG4gICAgdmFyIGZmdFNpemUgPSA1MTJcblxuICAgIGFuYWx5c2VyLmZmdFNpemUgPSBmZnRTaXplXG4gICAgYW5hbHlzZXIuc21vb3RoaW5nVGltZUNvbnN0YW50ID0gMFxuICAgIGJ1ZmZlckxlbmd0aCA9IGFuYWx5c2VyLmZyZXF1ZW5jeUJpbkNvdW50XG4gICAgYW5hbHlzZXJEYXRhQXJyYXkgPSBuZXcgVWludDhBcnJheShidWZmZXJMZW5ndGgpXG5cbiAgICBsb2NhbEFuYWx5c2VyLmZmdFNpemUgPSBmZnRTaXplXG4gICAgbG9jYWxBbmFseXNlci5zbW9vdGhpbmdUaW1lQ29uc3RhbnQgPSAwXG4gICAgbG9jYWxBbmFseXNlckRhdGFBcnJheSA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlckxlbmd0aClcblxuICB9XG5cbiAgZnVuY3Rpb24gY29ubmVjdChvdGhlcl9hZ2VudCkge1xuXG4gICAgdmFyIG90aGVyX2dhaW5fYmFuayA9IG90aGVyX2FnZW50LmdldF9nYWluX2JhbmsoKVxuXG4gICAgb3RoZXJfZ2Fpbl9iYW5rLmZvckVhY2goZnVuY3Rpb24gKGdhaW5Ob2RlKSB7XG4gICAgICBnYWluTm9kZS5jb25uZWN0KGFuYWx5c2VyKVxuICAgIH0pXG5cbiAgICAvLyB2YXIgb3RoZXJfZmlsdGVyX2JhbmsgPSBvdGhlcl9hZ2VudC5nZXRfZmlsdGVyX2JhbmsoKVxuICAgIC8vXG4gICAgLy8gb3RoZXJfZmlsdGVyX2JhbmsuZm9yRWFjaChmdW5jdGlvbihmaWx0ZXJOb2RlKXtcbiAgICAvLyAgIGZpbHRlck5vZGUuY29ubmVjdChhbmFseXNlcilcbiAgICAvLyB9KVxuXG4gICAgZ2V0QnVmZmVyKClcblxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgY29uc29sZS5sb2coJ2RvbmUgY29ubmVjdGluZycpXG4gICAgICBDVVJSRU5UX1NUQVRFID0gMFxuICAgIH0sIDIwMClcblxuICB9XG5cbiAgZnVuY3Rpb24gc2V0X21lc3NhZ2UobXNnKXtcbiAgICBNRVNTQUdFID0gbXNnXG4gICAgTUVTU0FHRV9JRFggPSAwXG4gIH1cblxuICBmdW5jdGlvbiBuX2NoYW5uZWxzKCkge1xuICAgIHJldHVybiBuX29zY1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0X2dyb3VwcygpIHtcbiAgICByZXR1cm4gZ3JvdXBlZF9wZWFrX3Jhbmdlc1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0QnVmZmVyKCkge1xuICAgIGFuYWx5c2VyLmdldEJ5dGVGcmVxdWVuY3lEYXRhKGFuYWx5c2VyRGF0YUFycmF5KVxuICAgIHJldHVybiBhbmFseXNlckRhdGFBcnJheVxuICB9XG4gIGZ1bmN0aW9uIGdldF9sb2NhbF9mcmVxdWVuY3lfZGF0YV9idWZmZXIoKSB7XG4gICAgbG9jYWxBbmFseXNlci5nZXRCeXRlRnJlcXVlbmN5RGF0YShsb2NhbEFuYWx5c2VyRGF0YUFycmF5KVxuICAgIHJldHVybiBsb2NhbEFuYWx5c2VyRGF0YUFycmF5XG4gIH1cblxuICBmdW5jdGlvbiBnZXRfZ2Fpbl9iYW5rKCkge1xuICAgIHJldHVybiBnYWluX2JhbmtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldF9maWx0ZXJfYmFuaygpIHtcbiAgICByZXR1cm4gZmlsdGVyX2JhbmtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gZ2V0X2FuYWx5c2VyKCkge1xuICAgIHJldHVybiBhbmFseXNlclxuICB9XG5cblxuICBmdW5jdGlvbiByZWFkX2J5dGVfZnJvbV9zaWduYWwoKSB7XG5cbiAgICB2YXIgcmFuZ2VzID0gdmFsaWRhdGVfcmFuZ2VzKClcbiAgICAvLyBjb25zb2xlLmxvZyhyYW5nZXMpXG5cbiAgICB2YXIgYmluYXJ5X3N0cmluZyA9ICcnXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCA4OyBpKyspIHtcbiAgICAgIGlmIChyYW5nZXNbaV0pIHtcbiAgICAgICAgYmluYXJ5X3N0cmluZyArPSAnMSdcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJpbmFyeV9zdHJpbmcgKz0gJzAnXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcnNlSW50KGJpbmFyeV9zdHJpbmcsIDIpXG5cbiAgfVxuXG5cbiAgZnVuY3Rpb24gcmVhZF9ieXRlX2FycmF5X2Zyb21fc2lnbmFsKGJ5dGVfY291bnQpIHtcblxuICAgIHZhciByZXR1cm5fYXJyYXkgPSAnJ1xuXG4gICAgdmFyIHJhbmdlcyA9IHZhbGlkYXRlX3JhbmdlcygpXG4gICAgLy8gY29uc29sZS5sb2cocmFuZ2VzKVxuXG4gICAgZm9yKHZhciBieXRlX2NvdW50X2lkeCA9IDA7IGJ5dGVfY291bnRfaWR4IDwgYnl0ZV9jb3VudDsgYnl0ZV9jb3VudF9pZHgrKyl7XG5cbiAgICAgIHZhciBvZmZzZXQgPSAwXG4gICAgICBpZihieXRlX2NvdW50X2lkeCA+IDApe1xuICAgICAgICBvZmZzZXQgKz0gMiArIChieXRlX2NvdW50X2lkeCo4KVxuICAgICAgfVxuXG4gICAgICB2YXIgYmluYXJ5X3N0cmluZyA9ICcnXG4gICAgICBmb3IgKHZhciBpID0gMCtvZmZzZXQ7IGkgPCA4K29mZnNldDsgaSsrKSB7XG4gICAgICAgIGlmIChyYW5nZXNbaV0pIHtcbiAgICAgICAgICBiaW5hcnlfc3RyaW5nICs9ICcxJ1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGJpbmFyeV9zdHJpbmcgKz0gJzAnXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdmFyIGJ5dGUgPSBwYXJzZUludChiaW5hcnlfc3RyaW5nLCAyKVxuICAgICAgcmV0dXJuX2FycmF5ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZSlcbiAgICB9XG5cbiAgICAvLyBjb25zb2xlLmxvZyhyZXR1cm5fYXJyYXkpXG4gICAgcmV0dXJuIHJldHVybl9hcnJheVxuXG4gIH1cblxuICBmdW5jdGlvbiByZWdpc3Rlcl9wZWFrX3JhbmdlcygpIHtcblxuICAgIGNvbnNvbGUubG9nKCdyZWdpc3RlcmluZyBwZWFrIHJhbmdlcycpXG5cbiAgICBnZXRCdWZmZXIoKVxuICAgIGNvbnNvbGUubG9nKGFuYWx5c2VyRGF0YUFycmF5KVxuXG4gICAgLy8gcHVzaCBvbiB0byBuZXcgYXJyYXkgZm9yIHNvcnRpbmdcbiAgICB2YXIgZCA9IFtdXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBidWZmZXJMZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGFuYWx5c2VyRGF0YUFycmF5W2ldID4gMCkge1xuICAgICAgICBkLnB1c2goYW5hbHlzZXJEYXRhQXJyYXlbaV0pXG4gICAgICB9XG4gICAgfVxuICAgIGQuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgcmV0dXJuIGEgLSBiXG4gICAgfSlcbiAgICBjb25zb2xlLmxvZygnTWVhbjogJyArIGRbTWF0aC5mbG9vcihkLmxlbmd0aCAvIDIpXSlcblxuICAgIG1lYW4gPSBkW01hdGguZmxvb3IoZC5sZW5ndGggLyAyKV1cblxuICAgIC8vXG4gICAgcGVha19yYW5nZXMgPSBbXVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYnVmZmVyTGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChhbmFseXNlckRhdGFBcnJheVtpXSA+IG1lYW4pIHtcbiAgICAgICAgcGVha19yYW5nZXMucHVzaChpKVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHdpbmRvdy5wID0gcGVha19yYW5nZXNcblxuICAgIGdyb3VwX3BlYWtfcmFuZ2VzKClcblxuICB9XG5cbiAgZnVuY3Rpb24gY2hlY2tfcGVha19yYW5nZXMoKSB7XG5cbiAgICBnZXRCdWZmZXIoKVxuXG4gICAgdmFyIGhpdHMgPSBbXVxuICAgIHBlYWtfcmFuZ2VzLmZvckVhY2goZnVuY3Rpb24gKGRhdGFBcnJheV9pZHgpIHtcbiAgICAgIGlmIChhbmFseXNlckRhdGFBcnJheVtkYXRhQXJyYXlfaWR4XSA+IG1lYW4pIHtcbiAgICAgICAgaGl0cy5wdXNoKHRydWUpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBoaXRzLnB1c2goZmFsc2UpXG4gICAgICB9XG4gICAgfSlcblxuICAgIHJldHVybiBoaXRzXG5cbiAgfVxuXG4gIGZ1bmN0aW9uIGdyb3VwX3BlYWtfcmFuZ2VzKCkge1xuXG4gICAgaWYgKHBlYWtfcmFuZ2VzID09PSB1bmRlZmluZWQgfHwgcGVha19yYW5nZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGdyb3VwcyA9IFtdIC8vIFsgWzEsMiwzXSwgWzgsOSwxMF0sIFszMCwzMSwzMl0gIF1cblxuICAgIHZhciBjdXJyZW50X2dyb3VwX2lkeCA9IDBcblxuICAgIHZhciBsb2NhbF9ncm91cCA9IG5ldyBBcnJheSgpXG5cbiAgICBwZWFrX3Jhbmdlcy5mb3JFYWNoKGZ1bmN0aW9uIChwZWFrX2lkeCwgaWR4KSB7XG5cbiAgICAgIC8vIGlmIHRoZSBNYXRoLmFicyhwZWFrX2lkeCAtIHBlYWtfcmFuZ2VzW2lkeCsxXSkgPT09IDFcbiAgICAgIC8vICAgIHB1c2ggcGVha19pZHggb24gdG8gbG9jYWxfZ3JvdXBcbiAgICAgIC8vIGVsc2VcbiAgICAgIC8vICAgIHB1c2ggbG9jYWxfZ3JvdXAgb24gdG8gZ3JvdXBzXG4gICAgICAvLyAgICBjbGVhciBsb2NhbF9ncm91cFxuICAgICAgLy8gICAgcHVzaCBwZWFrX2lkeCBvbiB0byBsb2NhbF9ncm91cFxuXG4gICAgICBpZiAoaWR4ID09PSBwZWFrX3Jhbmdlcy5sZW5ndGggLSAxKSB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdoZXJlJylcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoTWF0aC5hYnMocGVha19pZHggLSBwZWFrX3Jhbmdlc1tpZHggKyAxXSkgPD0gMikge1xuICAgICAgICBsb2NhbF9ncm91cC5wdXNoKHBlYWtfaWR4KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9jYWxfZ3JvdXAucHVzaChwZWFrX2lkeClcbiAgICAgICAgZ3JvdXBzLnB1c2gobG9jYWxfZ3JvdXApXG4gICAgICAgIGxvY2FsX2dyb3VwID0gbmV3IEFycmF5KClcbiAgICAgIH1cblxuICAgIH0pXG5cbiAgICBncm91cHMucHVzaChsb2NhbF9ncm91cClcblxuICAgIGdyb3VwZWRfcGVha19yYW5nZXMgPSBncm91cHNcblxuICAgIHJldHVybiBncm91cHNcblxuICB9XG5cbiAgZnVuY3Rpb24gc2V0X2dhaW4oY2hhbm5lbCwgdmFsdWUpIHtcbiAgICBnYWluX2JhbmtbY2hhbm5lbF0uZ2Fpbi52YWx1ZSA9IHZhbHVlXG4gIH1cblxuICBmdW5jdGlvbiBzZXRfdm9sdW1lKHYpe1xuICAgIGlmKHYgPj0gMSl7XG4gICAgICB2PTEuMFxuICAgIH1cbiAgICBtYXN0ZXJfZ2Fpbi5nYWluLnZhbHVlID0gdlxuICB9XG5cbiAgZnVuY3Rpb24gdmFsaWRhdGVfcmFuZ2VzKCkge1xuXG4gICAgaWYgKGdyb3VwZWRfcGVha19yYW5nZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGdldEJ1ZmZlcigpXG5cbiAgICB2YXIgdmFsaWRfZ3JvdXBzID0gW11cblxuICAgIGdyb3VwZWRfcGVha19yYW5nZXMuZm9yRWFjaChmdW5jdGlvbiAoZ3JvdXApIHtcblxuICAgICAgdmFyIGhpdHMgPSAwXG5cbiAgICAgIGdyb3VwLmZvckVhY2goZnVuY3Rpb24gKGlkeCkge1xuICAgICAgICBpZiAoYW5hbHlzZXJEYXRhQXJyYXlbaWR4XSA+PSBtZWFuKSB7XG4gICAgICAgICAgaGl0cyArPSAxXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIGlmIChoaXRzID49IGdyb3VwLmxlbmd0aCAvIDIpIHtcbiAgICAgICAgdmFsaWRfZ3JvdXBzLnB1c2godHJ1ZSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbGlkX2dyb3Vwcy5wdXNoKGZhbHNlKVxuICAgICAgfVxuXG4gICAgfSlcblxuICAgIHJldHVybiB2YWxpZF9ncm91cHNcblxuICB9XG5cbiAgZnVuY3Rpb24gZW5jb2RlX2J5dGUoYnl0ZSkge1xuXG4gICAgdmFyIGNoYXJzID0gZ2V0X2VuY29kZWRfYnl0ZV9hcnJheShieXRlKVxuXG4gICAgLy8gY29uc29sZS5sb2coY2hhcnMpXG5cbiAgICBjaGFycy5mb3JFYWNoKGZ1bmN0aW9uIChjLCBpZHgpIHtcbiAgICAgIGlmIChjID09PSAnMCcpIHtcbiAgICAgICAgc2V0X2dhaW4oaWR4LCAwKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2V0X2dhaW4oaWR4LCAxIC8gKG5fb3NjLTIpKVxuICAgICAgfVxuICAgIH0pXG5cbiAgfVxuXG4gIGZ1bmN0aW9uIGVuY29kZV9zdHJpbmcoc3RyaW5nKXtcblxuICAgIHZhciBieXRlcyA9IHN0cmluZy5zcGxpdCgnJylcbiAgICAvLyBjb25zb2xlLmxvZyhzdHJpbmcsYnl0ZXMpXG5cbiAgICB3aGlsZShieXRlcy5sZW5ndGggPCBCWVRFU19UT19FTkNPREUpe1xuICAgICAgYnl0ZXMucHVzaCgnKycpXG4gICAgfVxuXG4gICAgTEFTVF9TRU5UX01FU1NBR0UgPSBDVVJSRU5UX0VOQ09ERURfTUVTU0FHRVxuICAgIENVUlJFTlRfRU5DT0RFRF9NRVNTQUdFID0gYnl0ZXMuam9pbignJylcblxuICAgIGJ5dGVzLmZvckVhY2goZnVuY3Rpb24oYnl0ZSxieXRlX2lkeCl7XG5cbiAgICAgIHZhciBvZmZzZXQgPSAoYnl0ZV9pZHggKiA4KSArIDJcbiAgICAgIGlmKGJ5dGVfaWR4ID09PSAwKXtcbiAgICAgICAgb2Zmc2V0ID0gMFxuICAgICAgfVxuXG4gICAgICBieXRlID0gYnl0ZS5jaGFyQ29kZUF0KDApXG5cbiAgICAgIHZhciBjaGFycyA9IGdldF9lbmNvZGVkX2J5dGVfYXJyYXkoYnl0ZSlcblxuICAgICAgLy8gY29uc29sZS5sb2coY2hhcnMpXG5cbiAgICAgIGNoYXJzLmZvckVhY2goZnVuY3Rpb24gKGMsIGlkeCkge1xuICAgICAgICBpZiAoYyA9PT0gJzAnKSB7XG4gICAgICAgICAgc2V0X2dhaW4oaWR4K29mZnNldCwgMClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzZXRfZ2FpbihpZHgrb2Zmc2V0LCAxIC8gbl9vc2MpXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICB9KVxuXG5cblxuICB9XG5cbiAgZnVuY3Rpb24gcGVyZm9ybV9zaWduYWxpbmcoKSB7XG4gICAgZmxpcF9mbG9wID0gIWZsaXBfZmxvcFxuICAgIGlmIChmbGlwX2Zsb3ApIHtcbiAgICAgIHNldF9nYWluKDgsIDEgLyBuX29zYylcbiAgICAgIHNldF9nYWluKDksIDApXG4gICAgfSBlbHNlIHtcbiAgICAgIHNldF9nYWluKDksIDEgLyBuX29zYylcbiAgICAgIHNldF9nYWluKDgsIDApXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0X2VuY29kZWRfYnl0ZV9hcnJheShieXRlKSB7XG4gICAgcmV0dXJuIHBhZChieXRlLnRvU3RyaW5nKDIpLCA4KS5zcGxpdCgnJylcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhZChuLCB3aWR0aCwgeikge1xuICAgIHogPSB6IHx8ICcwJztcbiAgICBuID0gbiArICcnO1xuICAgIHJldHVybiBuLmxlbmd0aCA+PSB3aWR0aCA/IG4gOiBuZXcgQXJyYXkod2lkdGggLSBuLmxlbmd0aCArIDEpLmpvaW4oeikgKyBuO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0X3N0YXRlKCkge1xuICAgIHJldHVybiB7XG4gICAgICBidWZmZXI6IGdldEJ1ZmZlcigpLFxuICAgICAgbG9jYWxfYnVmZmVyOiBnZXRfbG9jYWxfZnJlcXVlbmN5X2RhdGFfYnVmZmVyKCksXG4gICAgICBSWF9CVUZGRVI6IFJYX0JVRkZFUixcbiAgICAgIENVUlJFTlRfU1RBVEU6IENVUlJFTlRfU1RBVEUsXG4gICAgICBTWU5DX0NPVU5UOiBTWU5DX0NPVU5ULFxuICAgICAgTUVTU0FHRTogTUVTU0FHRSxcbiAgICAgIE1FU1NBR0VfSURYOiBNRVNTQUdFX0lEWCxcbiAgICAgIENPTk5FQ1RFRF9BVDogQ09OTkVDVEVEX0FULFxuICAgICAgQ1VSUkVOVF9FTkNPREVEX01FU1NBR0U6IENVUlJFTlRfRU5DT0RFRF9NRVNTQUdFLFxuICAgICAgTEFTVF9TRU5UX01FU1NBR0U6IExBU1RfU0VOVF9NRVNTQUdFLFxuICAgICAgTEFURVNUX1JYX0JMT0I6IExBVEVTVF9SWF9CTE9CLFxuICAgICAgUFJFVl9SWF9CTE9COiBQUkVWX1JYX0JMT0JcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZXNldF9iYXVkX2NvdW50KCl7XG4gICAgUlhfQlVGRkVSID0gJydcbiAgICBDT05ORUNURURfQVQgPSBEYXRlLm5vdygpXG4gIH1cblxuICByZXR1cm4ge1xuICAgIGNoZWNrX3BlYWtfcmFuZ2VzOiBjaGVja19wZWFrX3JhbmdlcyxcbiAgICBjb25uZWN0OiBjb25uZWN0LFxuICAgIGVuY29kZV9yYW5nZTogZW5jb2RlX2J5dGUsXG4gICAgZ2V0QnVmZmVyOiBnZXRCdWZmZXIsXG4gICAgZ2V0X2FuYWx5c2VyOiBnZXRfYW5hbHlzZXIsXG4gICAgZ2V0X2VuY29kZWRfYnl0ZV9hcnJheTogZ2V0X2VuY29kZWRfYnl0ZV9hcnJheSxcbiAgICBnZXRfZmlsdGVyX2Jhbms6IGdldF9maWx0ZXJfYmFuayxcbiAgICBnZXRfZ2Fpbl9iYW5rOiBnZXRfZ2Fpbl9iYW5rLFxuICAgIGdldF9ncm91cHM6IGdldF9ncm91cHMsXG4gICAgZ2V0X2xvY2FsX2ZyZXF1ZW5jeV9kYXRhX2J1ZmZlcjogZ2V0X2xvY2FsX2ZyZXF1ZW5jeV9kYXRhX2J1ZmZlcixcbiAgICBnZXRfc3RhdGU6IGdldF9zdGF0ZSxcbiAgICBncm91cF9wZWFrX3JhbmdlczogZ3JvdXBfcGVha19yYW5nZXMsXG4gICAgaW5pdDogaW5pdCxcbiAgICBuX2NoYW5uZWxzOiBuX2NoYW5uZWxzLFxuICAgIHNldF9nYWluOiBzZXRfZ2FpbixcbiAgICBzZXRfbWVzc2FnZTogc2V0X21lc3NhZ2UsXG4gICAgc2V0X3ZvbHVtZTogc2V0X3ZvbHVtZSxcbiAgICByZWFkX2J5dGVfZnJvbV9zaWduYWw6IHJlYWRfYnl0ZV9mcm9tX3NpZ25hbCxcbiAgICByZXNldF9iYXVkX2NvdW50OiByZXNldF9iYXVkX2NvdW50LFxuICAgIHRpY2s6IHRpY2ssXG4gICAgdmFsaWRhdGVfcmFuZ2VzOiB2YWxpZGF0ZV9yYW5nZXMsXG4gICAgcGVyZm9ybV9zaWduYWxpbmc6IHBlcmZvcm1fc2lnbmFsaW5nXG4gIH07XG5cbn1cbiIsIndpbmRvdy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIFwidXNlIHN0cmljdFwiO1xuXG4gIHdpbmRvdy5jb25zb2xlLnRpbWUgPSBmdW5jdGlvbigpe307ICB3aW5kb3cuY29uc29sZS50aW1lRW5kID0gZnVuY3Rpb24oKXt9XG5cbiAgdmFyIERPX0RSQVcgPSB0cnVlXG5cbiAgdmFyIEJBVURfUkFURSA9IDEwMDBcbiAgdmFyIHBhcmVudF9iYXVkX3JhdGUgPSBkMy5zZWxlY3QoJ2RpdiNiYXVkX3JhdGUnKS5hcHBlbmQoJ2RpdicpLmF0dHIoJ2NsYXNzJywnY29sLW1kLTggY29sLW1kLW9mZnNldC0yJylcblxuICBwYXJlbnRfYmF1ZF9yYXRlLmFwcGVuZCgnaDQnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlcicpLmh0bWwoJ21vZGVtIHNwZWVkJylcbiAgdmFyIGJhdWRfc2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKS5kb21haW4oWzEwMCwwXSkucmFuZ2UoW0JBVURfUkFURS8zLjUsQkFVRF9SQVRFKjEwXSlcbiAgdmFyIGJhdWRfc2xpZGVyID0gcGFyZW50X2JhdWRfcmF0ZS5hcHBlbmQoJ2lucHV0JykuYXR0cigndHlwZScsJ3JhbmdlJylcbiAgICAuYXR0cignbWluJywgMC4wKVxuICAgIC5hdHRyKCdtYXgnLCAxMDAuMClcbiAgICAuYXR0cigndmFsdWUnLCBiYXVkX3NjYWxlLmludmVydChCQVVEX1JBVEUpKVxuXG4gICAgYmF1ZF9zbGlkZXIub24oJ2lucHV0JywgZnVuY3Rpb24oKXtcbiAgICAvLyBjb25zb2xlLmxvZyhkMy5ldmVudClcbiAgICB2YXIgdiA9IGQzLnNlbGVjdCh0aGlzKS5ub2RlKCkudmFsdWVcblxuICAgIEJBVURfUkFURSA9IGJhdWRfc2NhbGUodilcblxuICAgIHdpbmRvdy5hbGljZS5yZXNldF9iYXVkX2NvdW50KClcbiAgICB3aW5kb3cuYm9iLnJlc2V0X2JhdWRfY291bnQoKVxuXG4gIH0pXG5cbiAgdmFyIHVkcF9tb2RlID0gdHJ1ZVxuXG4gIGNvbnNvbGUubG9nKCdtYWluLmpzIC8gd2luZG93Lm9ubG9hZCBhbm9ueW1vdXMgZnVuY3Rpb24nKVxuXG4gIHZhciBtZXNzYWdlX3RvX3NlbmQgPSAnMDk4NzY1NDMyMS0tdGVzdGluZy0tMTIzNDU2Nzg5MC0tISEtLWFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6J1xuICBtZXNzYWdlX3RvX3NlbmQgPSAnMDEyMzQ1NjcnXG4gIHZhciBvdXRwdXRfbXNnID0gJydcblxuICB2YXIgQWdlbnQgPSByZXF1aXJlKCcuL2FnZW50LmpzJylcbiAgdmFyIFZpZXdfQ29udHJvbGxlciA9IHJlcXVpcmUoJy4vdmlld19jb250cm9sbGVyLmpzJylcblxuICB3aW5kb3cuYWxpY2UgPSBBZ2VudC5hZ2VudCgpXG4gIGFsaWNlLmluaXQoe1xuICAgIHR5cGU6ICdjbGllbnQnLFxuICAgIG1lc3NhZ2U6IG1lc3NhZ2VfdG9fc2VuZFxuICB9KVxuXG4gIHdpbmRvdy5ib2IgPSBBZ2VudC5hZ2VudCgpXG4gIGJvYi5pbml0KHtcbiAgICB0eXBlOiAnc2VydmVyJyxcbiAgICBtZXNzYWdlOiBtZXNzYWdlX3RvX3NlbmRcbiAgfSlcblxuICB2YXIgZGlzcGxheV9hbGljZSA9IFZpZXdfQ29udHJvbGxlci52aWV3X2NvbnRyb2xsZXIoJ2FsaWNlX21vZGVtJylcbiAgZGlzcGxheV9hbGljZS5jb25uZWN0KGFsaWNlKVxuXG4gIHZhciBkaXNwbGF5X2JvYiA9IFZpZXdfQ29udHJvbGxlci52aWV3X2NvbnRyb2xsZXIoJ2JvYl9tb2RlbScpXG4gIGRpc3BsYXlfYm9iLmNvbm5lY3QoYm9iKVxuXG4gIGFsaWNlLmNvbm5lY3QoYm9iKVxuICBib2IuY29ubmVjdChhbGljZSlcblxuICBzZXRUaW1lb3V0KGRyYXcsIDUwMClcblxuICBmdW5jdGlvbiBkcmF3KCkge1xuXG4gICAgY29uc29sZS50aW1lKCd0ZXN0JylcbiAgICBhbGljZS50aWNrKClcbiAgICBib2IudGljaygpXG4gICAgY29uc29sZS50aW1lRW5kKCd0ZXN0JylcblxuICAgIGRpc3BsYXlfYWxpY2UudGljayhET19EUkFXKVxuICAgIGRpc3BsYXlfYm9iLnRpY2soRE9fRFJBVylcblxuICAgIC8vIGNvbnNvbGUubG9nKGJvYi5nZXRfc3RhdGUoKS5MQVRFU1RfUlhfQkxPQiwgYWxpY2UuZ2V0X3N0YXRlKCkuTEFTVF9TRU5UX01FU1NBR0UgKVxuXG4gICAgdmFyIGFsaWNlX3N0YXRlID0gYWxpY2UuZ2V0X3N0YXRlKClcbiAgICB2YXIgYm9iX3N0YXRlID0gYm9iLmdldF9zdGF0ZSgpXG5cbiAgICAvLyBjb25zb2xlLmxvZyhib2Jfc3RhdGUuTEFURVNUX1JYX0JMT0IubGVuZ3RoLCBhbGljZV9zdGF0ZS5MQVNUX1NFTlRfTUVTU0FHRS5sZW5ndGgpXG5cblxuICAgIGlmKChib2Jfc3RhdGUuTEFURVNUX1JYX0JMT0IubGVuZ3RoICE9PSBhbGljZV9zdGF0ZS5MQVNUX1NFTlRfTUVTU0FHRS5sZW5ndGgpIHx8IChib2Jfc3RhdGUuTEFURVNUX1JYX0JMT0IgPT09IGFsaWNlX3N0YXRlLkxBU1RfU0VOVF9NRVNTQUdFKSl7XG4gICAgICAvLyBpZihib2Jfc3RhdGUuTEFURVNUX1JYX0JMT0IgPT09IGFsaWNlX3N0YXRlLkxBU1RfU0VOVF9NRVNTQUdFKXtcbiAgICAgICAgc2V0VGltZW91dChkcmF3LCBCQVVEX1JBVEUpXG4gICAgICAvLyB9IGVsc2Uge1xuXG4gICAgICAvLyB9XG4gICAgfSBlbHNlIHtcblxuICAgICAgY29uc29sZS5sb2coYm9iX3N0YXRlLkxBVEVTVF9SWF9CTE9CLCBhbGljZV9zdGF0ZS5MQVNUX1NFTlRfTUVTU0FHRSlcblxuICAgICAgY29uc29sZS5sb2coJ2VycicpXG5cbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgYm9iLnBlcmZvcm1fc2lnbmFsaW5nKClcbiAgICAgICAgc2V0VGltZW91dChkcmF3LCBCQVVEX1JBVEUqMilcbiAgICAgIH0pXG5cblxuICAgIH1cblxuICAgIC8vIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZHJhdyk7XG5cbiAgfVxuXG59XG4iLCJtb2R1bGUuZXhwb3J0cy52aWV3X2NvbnRyb2xsZXIgPSB2aWV3X2NvbnRyb2xsZXJcblxuZnVuY3Rpb24gdmlld19jb250cm9sbGVyKGRpdl9pZCkge1xuXG4gIFwidXNlIHN0cmljdFwiO1xuXG4gIHZhciBuYW1lID0gZGl2X2lkXG5cbiAgdmFyIGFnZW50XG4gIHZhciBwYXJlbnQgPSBkMy5zZWxlY3QoJ2RpdiMnICsgZGl2X2lkKVxuXG4gIC8vIGRpc3BsYXlcbiAgLy8gICAgY3VycmVudCBzdGF0ZVxuICAvLyAgICBzeW5jIGNvdW50XG4gIC8vICAgIG9zY2lsbG9zY29wZSBvZiBvdXRwdXQgJiBpbnB1dFxuICAvLyAgICBmZnQgYmFycyBvZiBvdXRwdXQgJiBpbnB1dFxuICAvLyAgICBjdXJyZW50IGJhdWRcbiAgLy8gICAgcnggYnVmZmVyXG5cbiAgdmFyIHN2Z1xuICB2YXIgZGl2X3N5bmNfY291bnRcbiAgdmFyIHN5bmNfaW5kaWNhdG9yXG4gIHZhciBkaXZfcnhfYnVmZmVyXG4gIHZhciBkaXZfYmF1ZF9tZXRlclxuICB2YXIgYmFycyA9IFtdXG5cbiAgdmFyIFdJRFRIID0gMTAyNFxuICB2YXIgSEVJR0hUID0gMjU2XG5cbiAgdmFyIGJhcldpZHRoXG4gIHZhciBidWZmZXJMZW5ndGhcbiAgICAvLyB2YXIgYmFySGVpZ2h0XG5cbiAgLy8gY3JlYXRlIHN2Z1xuICBmdW5jdGlvbiBzZXR1cF9zdmcoKSB7XG5cbiAgICB2YXIgc3RhdGUgPSBhZ2VudC5nZXRfc3RhdGUoKVxuXG4gICAgV0lEVEggPSBidWZmZXJMZW5ndGhcbiAgICBIRUlHSFQgPSBXSURUSCAvIDRcblxuICAgIGJhcldpZHRoID0gKFdJRFRIIC8gYnVmZmVyTGVuZ3RoKVxuXG4gICAgcGFyZW50LmFwcGVuZCgnaDEnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlcicpLmh0bWwobmFtZSlcblxuICAgIHN2ZyA9IHBhcmVudC5hcHBlbmQoJ3N2ZycpXG4gICAgICAuYXR0cignY2xhc3MnLCAnaW1nLXJlc3BvbnNpdmUnKVxuICAgICAgLmF0dHIoJ3dpZHRoJywgJzEwMCUnKVxuICAgICAgLy8gLmF0dHIoJ2hlaWdodCcsIEhFSUdIVClcbiAgICAgIC5hdHRyKCdwcmVzZXJ2ZUFzcGVjdFJhdGlvJywgJ3hNaWRZTWlkJylcbiAgICAgIC5hdHRyKCd2aWV3Qm94JywgJzAgMCAnICsgV0lEVEggKyAnICcgKyBIRUlHSFQpXG4gICAgICAuc3R5bGUoJ2JhY2tncm91bmQtY29sb3InLCAncmdiYSgwLDAsMCwwLjEpJylcblxuICAgIHN2Zy5hcHBlbmQoJ3RleHQnKVxuICAgICAgLnRleHQoJ3JlY2VpdmVyIHNwZWN0cnVtJylcbiAgICAgIC5hdHRyKCd4JywgV0lEVEgpXG4gICAgICAuYXR0cigneScsIDEyKVxuICAgICAgLmF0dHIoJ2R4JywgJy00cHgnKVxuICAgICAgLnN0eWxlKCdmb250LXNpemUnLCAxMilcbiAgICAgIC5zdHlsZSgndGV4dC1hbmNob3InLCAnZW5kJylcbiAgICAgIC5hdHRyKCdmaWxsJywgJ3JnYmEoMCwwLDAsMC4xKScpXG5cblxuICAgIGJhcnMgPSBbXVxuICAgIGZvciAodmFyIHN2Z2JhcnMgPSAwOyBzdmdiYXJzIDwgYnVmZmVyTGVuZ3RoOyBzdmdiYXJzKyspIHtcbiAgICAgIHZhciBiYXIgPSBzdmcuYXBwZW5kKCdyZWN0JylcbiAgICAgICAgLmF0dHIoJ3gnLCBiYXJXaWR0aCAqIHN2Z2JhcnMpXG4gICAgICAgIC5hdHRyKCd5JywgMClcbiAgICAgICAgLmF0dHIoJ3dpZHRoJywgYmFyV2lkdGgpXG4gICAgICAgIC5hdHRyKCdoZWlnaHQnLCAwKVxuICAgICAgICAuYXR0cignZmlsbCcsICdncmVlbicpXG4gICAgICAgIC5hdHRyKCdzdHJva2UnLCAnbm9uZScpXG5cbiAgICAgIHZhciBiYXJfaWR4ID0gc3ZnYmFyc1xuICAgICAgYmFyLm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGJhcl9pZHgpXG4gICAgICB9KVxuXG4gICAgICBiYXJzLnB1c2goYmFyKVxuICAgIH1cblxuICAgIC8vIHN5bmMgY291bnRcbiAgICBkaXZfc3luY19jb3VudCA9IHBhcmVudC5hcHBlbmQoJ2RpdicpXG4gICAgICAuYXR0cignY2xhc3MnLCAnY29sLW1kLTQnKVxuICAgICAgLnN0eWxlKCdvdXRsaW5lJywgJzFweCBkb3R0ZWQgcmdiYSgwLDAsMCwwLjEpJylcblxuICAgIGRpdl9zeW5jX2NvdW50LmFwcGVuZCgnaDQnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlcicpLmh0bWwoJ3N5bmNocm9uaXphdGlvbiBjb3VudHMnKVxuICAgIHN5bmNfaW5kaWNhdG9yID0gZGl2X3N5bmNfY291bnQuYXBwZW5kKCdkaXYnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlciBzeW5jX2NvdW50JylcblxuICAgIC8vIGJhdWQgbWV0ZXJcbiAgICB2YXIgcGFyZW50X2JhdWRfbWV0ZXIgPSBwYXJlbnQuYXBwZW5kKCdkaXYnKS5hdHRyKCdjbGFzcycsICdjb2wtbWQtNCcpXG4gICAgICAuc3R5bGUoJ291dGxpbmUnLCAnMXB4IGRvdHRlZCByZ2JhKDAsMCwwLDAuMSknKVxuXG4gICAgcGFyZW50X2JhdWRfbWV0ZXIuYXBwZW5kKCdoNCcpLmF0dHIoJ2NsYXNzJywgJ3RleHQtY2VudGVyJykuaHRtbCgnYmF1ZCcpXG4gICAgZGl2X2JhdWRfbWV0ZXIgPSBwYXJlbnRfYmF1ZF9tZXRlci5hcHBlbmQoJ2RpdicpLmF0dHIoJ2NsYXNzJywgJ3RleHQtY2VudGVyJylcblxuXG4gICAgdmFyIHBhcmVudF9pbnB1dF9zbGlkZXIgPSBwYXJlbnQuYXBwZW5kKCdkaXYnKS5hdHRyKCdjbGFzcycsICdjb2wtbWQtNCcpXG5cbiAgICBwYXJlbnRfaW5wdXRfc2xpZGVyLmFwcGVuZCgnaDQnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlcicpLmh0bWwoJ3RyYW5zbWl0dGVyIHZvbHVtZScpXG5cbiAgICB2YXIgc2xpZGVyX2l0c2VsZiA9IHBhcmVudF9pbnB1dF9zbGlkZXIuYXBwZW5kKCdpbnB1dCcpLmF0dHIoJ3R5cGUnLCAncmFuZ2UnKVxuICAgICAgLmF0dHIoJ21pbicsIDAuMClcbiAgICAgIC5hdHRyKCdtYXgnLCAxMDAuMClcbiAgICAgIC5hdHRyKCd2YWx1ZScsIDAuMClcblxuICAgIHNsaWRlcl9pdHNlbGYub24oJ2lucHV0JywgZnVuY3Rpb24gKCkge1xuICAgICAgLy8gY29uc29sZS5sb2coZDMuZXZlbnQpXG4gICAgICB2YXIgdiA9IGQzLnNlbGVjdCh0aGlzKS5ub2RlKCkudmFsdWVcbiAgICAgIGFnZW50LnNldF92b2x1bWUodiAvIDEwMC4wKVxuICAgIH0pXG5cbiAgICAvLyBtZXNzYWdlIHRvIHNlbmRcbiAgICB2YXIgcGFyZW50X21lc3NhZ2VfdG9fc2VuZCA9IHBhcmVudC5hcHBlbmQoJ2RpdicpLmF0dHIoJ2NsYXNzJywgJ2NvbC1tZC0xMicpXG5cbiAgICBwYXJlbnRfbWVzc2FnZV90b19zZW5kLmFwcGVuZCgnaDQnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlcicpLmh0bWwoJ3NlbmRpbmcgdGhpcyBtZXNzYWdlJylcblxuICAgIHZhciBpbnB1dF9maWVsZCA9IHBhcmVudF9tZXNzYWdlX3RvX3NlbmQuYXBwZW5kKCdpbnB1dCcpXG4gICAgICAuYXR0cigndHlwZScsICd0ZXh0JylcbiAgICAgIC5hdHRyKCdjbGFzcycsICdtc2dfaW5wdXQnKVxuXG4gICAgaW5wdXRfZmllbGQubm9kZSgpLnZhbHVlID0gc3RhdGUuTUVTU0FHRVxuXG4gICAgaW5wdXRfZmllbGQub24oJ2tleXVwJywgZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHYgPSBpbnB1dF9maWVsZC5ub2RlKCkudmFsdWVcbiAgICAgIGlmICh2ID09PSAnJykge1xuICAgICAgICB2ID0gJyAnXG4gICAgICB9XG5cbiAgICAgIGFnZW50LnNldF9tZXNzYWdlKHYpXG4gICAgfSlcblxuICAgIC8vIHJ4IGJ1ZmZlclxuICAgIHZhciBkaXZfcnhfYnVmZmVyX3BhcmVudCA9IHBhcmVudC5hcHBlbmQoJ2RpdicpXG4gICAgICAuYXR0cignY2xhc3MnLCAnY29sLW1kLTEyJylcblxuICAgIGRpdl9yeF9idWZmZXJfcGFyZW50LmFwcGVuZCgnaDQnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlcicpLmh0bWwoJ3J4IGJ1ZmZlcicpXG5cbiAgICBkaXZfcnhfYnVmZmVyID0gZGl2X3J4X2J1ZmZlcl9wYXJlbnQuYXBwZW5kKCdwcmUnKS5hdHRyKCdjbGFzcycsICdyeF9idWZmZXInKVxuXG5cblxuICAgIC8vXG5cbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbm5lY3QocmVtb3RlX2FnZW50KSB7XG4gICAgYWdlbnQgPSByZW1vdGVfYWdlbnRcbiAgICBidWZmZXJMZW5ndGggPSByZW1vdGVfYWdlbnQuZ2V0X3N0YXRlKCkuYnVmZmVyLmxlbmd0aFxuICB9XG5cbiAgZnVuY3Rpb24gdGljayhkcmF3X2JhcnMpIHtcblxuICAgIGlmIChiYXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgc2V0dXBfc3ZnKClcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgc3RhdGUgPSBhZ2VudC5nZXRfc3RhdGUoKVxuXG4gICAgaWYgKGRyYXdfYmFycyA9PT0gdHJ1ZSkge1xuICAgICAgdmFyIGRhdGFBcnJheSA9IHN0YXRlLmJ1ZmZlclxuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJ1ZmZlckxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGJhcnNbaV0uYXR0cignaGVpZ2h0JywgKGRhdGFBcnJheVtpXSAvIDI1NSkgKiBIRUlHSFQpXG4gICAgICB9XG5cbiAgICB9XG5cbiAgICBzeW5jX2luZGljYXRvci5odG1sKHN0YXRlLlNZTkNfQ09VTlQpXG4gICAgZGl2X3J4X2J1ZmZlci5odG1sKHN0YXRlLlJYX0JVRkZFUilcblxuICAgIHZhciBiYXVkID0gOCAqIChzdGF0ZS5SWF9CVUZGRVIubGVuZ3RoIC8gKChEYXRlLm5vdygpIC0gc3RhdGUuQ09OTkVDVEVEX0FUKSAvIDEwMDAuMCkpXG4gICAgZGl2X2JhdWRfbWV0ZXIuaHRtbChiYXVkLnRvRml4ZWQoMikpXG5cbiAgICAvL1xuICAgIC8vIGNvbnNvbGUubG9nKGFnZW50LmdldF9zdGF0ZSgpLlNZTkNfQ09VTlQpXG5cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgdGljazogdGljayxcbiAgICBjb25uZWN0OiBjb25uZWN0XG4gIH1cblxufVxuIl19
