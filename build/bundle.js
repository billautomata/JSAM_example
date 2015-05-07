(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

module.exports.agent = agent

var BYTES_TO_ENCODE = 4

function agent(opts) {

  (function setup_audio_context() {
    if (window.context === undefined) {
      console.log('creating new window.AudioContext()')

      navigator.getMedia = (
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia
      );

      window.AudioContext = (
        window.AudioContext ||
        window.webkitAudioContext ||
        window.mozAudioContext ||
        window.msAudioContext
      );


      // if(window.AudioConext === undefined){
      //   window.context = new window.webkitAudioContext()
      // } else {
        window.context = new window.AudioContext()
      // }

    }
    console.log('done.')
  })()

  //
  var ERROR_RATE

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
  var initialFreq = 500

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

        if(grouped_peak_ranges !== undefined){
          if (grouped_peak_ranges.length === n_osc) {
            CURRENT_STATE = 1
          }
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

          // setTimeout(function(){
            perform_signaling()
          // },2)


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

      local_osc.start(0)
      // local_osc.noteOn(100)

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

  window.console.time = function () {};
  window.console.timeEnd = function () {}

  var DO_DRAW = true
  window.BAUD_RATE = 300

  console.log(window.screen.width)

  if (window.screen.width < 400) {
    d3.select('div#mobile_begin').on('click', function () {
      BAUD_RATE = 300
      d3.select(this).style('display', 'none')
      init_routine()
    })
  } else {
    BAUD_RATE = 100
    d3.select('div#mobile_begin').remove()
    init_routine()
  }

  function init_routine() {
    var udp_mode = true

    console.log('main.js / init_routine()')

    var parent_baud_rate = d3.select('div#baud_rate').append('div').attr('class', 'col-md-8 col-md-offset-2')

    parent_baud_rate.append('h4').attr('class', 'text-center').html('modem speed')
    var baud_scale = d3.scale.linear().domain([100, 0]).range([BAUD_RATE / 3.5, BAUD_RATE * 10])
    var baud_slider = parent_baud_rate.append('input').attr('type', 'range')
      .attr('min', 0.0)
      .attr('max', 100.0)
      .attr('value', baud_scale.invert(BAUD_RATE))

    baud_slider.on('input', function () {
      // console.log(d3.event)
      var v = d3.select(this).node().value

      console.log(v)

      BAUD_RATE = baud_scale(v)

      window.alice.reset_baud_count()
      window.bob.reset_baud_count()

    })

    var message_to_send = '0987654321--testing--1234567890--!!--abcdefghijklmnopqrstuvwxyz'
      // message_to_send = '01234567'
    var output_msg = ''

    var Agent = require('./agent.js')
    var View_Controller = require('./view_controller.js')

    window.alice = Agent.agent()
    alice.init({
      type: 'client',
      message: 'I am alice listen to me send data using web audio api.'
    })

    window.bob = Agent.agent()
    bob.init({
      type: 'server',
      message: 'This be bob, listen to ME send data using the web audio api.'
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


        if ((bob_state.LATEST_RX_BLOB.length !== alice_state.LAST_SENT_MESSAGE.length) || (bob_state.LATEST_RX_BLOB === alice_state.LAST_SENT_MESSAGE)) {
          // if(bob_state.LATEST_RX_BLOB === alice_state.LAST_SENT_MESSAGE){
          setTimeout(draw, BAUD_RATE)
            // } else {

          // }
        } else {

          console.log(bob_state.LATEST_RX_BLOB, alice_state.LAST_SENT_MESSAGE)

          console.log('err')

          setTimeout(function () {
            bob.perform_signaling()
            setTimeout(draw, BAUD_RATE * 2)
          })


        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9hZ2VudC5qcyIsImpzL21haW4uanMiLCJqcy92aWV3X2NvbnRyb2xsZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL21CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzLmFnZW50ID0gYWdlbnRcblxudmFyIEJZVEVTX1RPX0VOQ09ERSA9IDRcblxuZnVuY3Rpb24gYWdlbnQob3B0cykge1xuXG4gIChmdW5jdGlvbiBzZXR1cF9hdWRpb19jb250ZXh0KCkge1xuICAgIGlmICh3aW5kb3cuY29udGV4dCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zb2xlLmxvZygnY3JlYXRpbmcgbmV3IHdpbmRvdy5BdWRpb0NvbnRleHQoKScpXG5cbiAgICAgIG5hdmlnYXRvci5nZXRNZWRpYSA9IChcbiAgICAgICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSB8fFxuICAgICAgICBuYXZpZ2F0b3Iud2Via2l0R2V0VXNlck1lZGlhIHx8XG4gICAgICAgIG5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWEgfHxcbiAgICAgICAgbmF2aWdhdG9yLm1zR2V0VXNlck1lZGlhXG4gICAgICApO1xuXG4gICAgICB3aW5kb3cuQXVkaW9Db250ZXh0ID0gKFxuICAgICAgICB3aW5kb3cuQXVkaW9Db250ZXh0IHx8XG4gICAgICAgIHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQgfHxcbiAgICAgICAgd2luZG93Lm1vekF1ZGlvQ29udGV4dCB8fFxuICAgICAgICB3aW5kb3cubXNBdWRpb0NvbnRleHRcbiAgICAgICk7XG5cblxuICAgICAgLy8gaWYod2luZG93LkF1ZGlvQ29uZXh0ID09PSB1bmRlZmluZWQpe1xuICAgICAgLy8gICB3aW5kb3cuY29udGV4dCA9IG5ldyB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0KClcbiAgICAgIC8vIH0gZWxzZSB7XG4gICAgICAgIHdpbmRvdy5jb250ZXh0ID0gbmV3IHdpbmRvdy5BdWRpb0NvbnRleHQoKVxuICAgICAgLy8gfVxuXG4gICAgfVxuICAgIGNvbnNvbGUubG9nKCdkb25lLicpXG4gIH0pKClcblxuICAvL1xuICB2YXIgRVJST1JfUkFURVxuXG4gIHZhciBNRVNTQUdFXG4gIHZhciBNRVNTQUdFX0lEWCA9IDBcblxuICB2YXIgTEFTVF9TRU5UX01FU1NBR0UgPSAnJ1xuICB2YXIgQ1VSUkVOVF9FTkNPREVEX01FU1NBR0UgPSAnJ1xuXG4gIHZhciBMQVRFU1RfUlhfQkxPQiA9ICcnXG4gIHZhciBQUkVWX1JYX0JMT0IgPSAnJ1xuXG4gIHZhciBSWF9CVUZGRVIgPSAnJ1xuICB2YXIgQ09OTkVDVEVEX0FUXG5cbiAgdmFyIHR5cGVcblxuICB2YXIgYW5hbHlzZXIgPSBjb250ZXh0LmNyZWF0ZUFuYWx5c2VyKClcbiAgdmFyIGFuYWx5c2VyRGF0YUFycmF5IC8vIHRoZSBidWZmZXIgdGhlIGFuYWx5c2VyIHdyaXRlcyB0b1xuICB2YXIgYnVmZmVyTGVuZ3RoIC8vIHRoZSBsZW5ndGggb2YgdGhlIGFuYWx5c2VyRGF0YUFycmF5XG5cbiAgdmFyIGxvY2FsQW5hbHlzZXIgPSBjb250ZXh0LmNyZWF0ZUFuYWx5c2VyKClcbiAgdmFyIGxvY2FsQW5hbHlzZXJEYXRhQXJyYXkgLy8gdGhlIGJ1ZmZlciB0aGUgYW5hbHlzZXIgd3JpdGVzIHRvXG5cbiAgdmFyIHBlYWtfcmFuZ2VzIC8vIGZsYXQgbGlzdCBvZiBpbmRleGVzIG9mIGRldGVjdGVkIHBlYWsgcmFuZ2VzXG4gIHZhciBncm91cGVkX3BlYWtfcmFuZ2VzIC8vIGNsdXN0ZXJlZCBncm91cHMgb2YgcGVhayByYW5nZXNcbiAgdmFyIG1lYW4gLy8gdGhlIHRocmVzaG9sZCBmb3IgZGV0ZXJtaW5pbmcgaWYgYSBiYW5kIGlzIHBlYWtlZFxuXG4gIHZhciBmbGlwX2Zsb3AgPSB0cnVlXG5cbiAgdmFyIHByZXZfaGlnaF9jaGFubmVsID0gLTFcbiAgdmFyIGN1cnJlbnRfaGlnaF9jaGFubmVsID0gMFxuICB2YXIgU1lOQ19DT1VOVCA9IDBcblxuICB2YXIgb3NjX2JhbmsgPSBbXVxuICB2YXIgZ2Fpbl9iYW5rID0gW11cbiAgdmFyIGZpbHRlcl9iYW5rID0gW11cblxuICB2YXIgbWFzdGVyX2dhaW5cblxuICAvLyB2YXIgbl9vc2MgPSA0NFxuICB2YXIgbl9vc2MgPSAoOCpCWVRFU19UT19FTkNPREUpICsgM1xuXG4gIGlmKEJZVEVTX1RPX0VOQ09ERSA9PT0gMSl7XG4gICAgbl9vc2MgPSAxNFxuICB9XG5cbiAgdmFyIGZyZXFSYW5nZSA9IDIwMDAwXG4gIHZhciBzcHJlYWQgPSAoZnJlcVJhbmdlIC8gbl9vc2MpXG4gIHZhciBpbml0aWFsRnJlcSA9IDUwMFxuXG4gIHZhciBDVVJSRU5UX1NUQVRFID0gLTFcblxuICBmdW5jdGlvbiB0aWNrKCkge1xuXG4gICAgdmFyIHJldF9vYmogPSB7XG4gICAgICBuZXdfZGF0YTogZmFsc2UsXG4gICAgICBkYXRhOiAnJ1xuICAgIH1cblxuICAgIGlmIChDVVJSRU5UX1NUQVRFIDwgMCkge1xuXG4gICAgICAvLyBwZXJmb3JtaW5nIGluaXRpYWxpemF0aW9uIHByb2Nlc3MsIGRvIG5vdGhpbmdcbiAgICAgIHJldHVybjtcblxuICAgIH0gZWxzZSB7XG5cbiAgICAgIGlmIChDVVJSRU5UX1NUQVRFID09PSAwKSB7XG5cbiAgICAgICAgcmVnaXN0ZXJfcGVha19yYW5nZXMoKVxuXG4gICAgICAgIGlmKGdyb3VwZWRfcGVha19yYW5nZXMgIT09IHVuZGVmaW5lZCl7XG4gICAgICAgICAgaWYgKGdyb3VwZWRfcGVha19yYW5nZXMubGVuZ3RoID09PSBuX29zYykge1xuICAgICAgICAgICAgQ1VSUkVOVF9TVEFURSA9IDFcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgfSBlbHNlIGlmIChDVVJSRU5UX1NUQVRFID09PSAxKSB7XG5cbiAgICAgICAgcGVyZm9ybV9zaWduYWxpbmcoKVxuICAgICAgICBsb29rX2Zvcl9zaWduYWxpbmcoKVxuXG4gICAgICAgIGlmIChTWU5DX0NPVU5UID4gMikge1xuICAgICAgICAgIENVUlJFTlRfU1RBVEUgPSAyXG4gICAgICAgICAgQ09OTkVDVEVEX0FUID0gRGF0ZS5ub3coKVxuICAgICAgICB9XG5cbiAgICAgIH0gZWxzZSBpZiAoQ1VSUkVOVF9TVEFURSA9PT0gMikge1xuXG4gICAgICAgIC8vIGVuY29kZSBieXRlXG4gICAgICAgIC8vIHZhciBieXRlX3RvX3NlbmQgPSBNRVNTQUdFW01FU1NBR0VfSURYXS5jaGFyQ29kZUF0KDApXG4gICAgICAgIC8vIGVuY29kZV9ieXRlKGJ5dGVfdG9fc2VuZClcblxuICAgICAgICAvLyBlbmNvZGUgYnl0ZSBhcnJheVxuICAgICAgICB2YXIgc3Vic3RyaW5nID0gTUVTU0FHRS5zdWJzdHIoTUVTU0FHRV9JRFgsQllURVNfVE9fRU5DT0RFKVxuICAgICAgICBlbmNvZGVfc3RyaW5nKHN1YnN0cmluZylcblxuICAgICAgICBpZiAobG9va19mb3Jfc2lnbmFsaW5nKCkpIHtcblxuICAgICAgICAgIC8vIHJlYWQgYnl0ZVxuICAgICAgICAgIC8vUlhfQlVGRkVSICs9IFN0cmluZy5mcm9tQ2hhckNvZGUocmVhZF9ieXRlX2Zyb21fc2lnbmFsKCkpXG4gICAgICAgICAgdmFyIGJ5dGVzX29uX3dpcmVfc3RyaW5nID0gcmVhZF9ieXRlX2FycmF5X2Zyb21fc2lnbmFsKEJZVEVTX1RPX0VOQ09ERSlcblxuICAgICAgICAgIFBSRVZfUlhfQkxPQiA9IExBVEVTVF9SWF9CTE9CXG4gICAgICAgICAgTEFURVNUX1JYX0JMT0IgPSBieXRlc19vbl93aXJlX3N0cmluZ1xuICAgICAgICAgIFJYX0JVRkZFUiArPSBieXRlc19vbl93aXJlX3N0cmluZ1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFJYX0JVRkZFUilcblxuICAgICAgICAgIGlmICh0eXBlID09PSAnY2xpZW50Jykge1xuICAgICAgICAgICAgcmV0X29iai5uZXdfZGF0YSA9IHRydWVcbiAgICAgICAgICAgIHJldF9vYmouZGF0YSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocmVhZF9ieXRlX2Zyb21fc2lnbmFsKEJZVEVTX1RPX0VOQ09ERSkpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gaW5jcmVtZW50IGJ5dGUgdG8gZW5jb2RlXG4gICAgICAgICAgTUVTU0FHRV9JRFggKz0gQllURVNfVE9fRU5DT0RFXG4gICAgICAgICAgaWYoTUVTU0FHRV9JRFggPj0gTUVTU0FHRS5sZW5ndGgpe1xuICAgICAgICAgICAgTUVTU0FHRV9JRFggPSAwXG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIE1FU1NBR0VfSURYID0gTUVTU0FHRV9JRFggJSBNRVNTQUdFLmxlbmd0aFxuXG4gICAgICAgICAgLy8gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgcGVyZm9ybV9zaWduYWxpbmcoKVxuICAgICAgICAgIC8vIH0sMilcblxuXG4gICAgICAgIH1cblxuICAgICAgfSAvLyBlbmQgb2YgQ1VSUkVOVF9TVEFURSA9PT0gMlxuXG4gICAgfVxuXG4gICAgcmV0dXJuIHJldF9vYmpcblxuICB9XG5cblxuICBmdW5jdGlvbiBsb29rX2Zvcl9zaWduYWxpbmcoKSB7XG5cbiAgICB2YXIgdmFsaWRfcmFuZ2VzID0gdmFsaWRhdGVfcmFuZ2VzKClcbiAgICBpZiAodmFsaWRfcmFuZ2VzWzhdID09PSB0cnVlICYmIHZhbGlkX3Jhbmdlc1s5XSA9PT0gZmFsc2UpIHtcbiAgICAgIGN1cnJlbnRfaGlnaF9jaGFubmVsID0gOFxuICAgIH0gZWxzZSB7XG4gICAgICBjdXJyZW50X2hpZ2hfY2hhbm5lbCA9IDlcbiAgICB9XG5cbiAgICB2YXIgZGlmZmVyZW5jZV9mb3VuZCA9IGZhbHNlXG5cbiAgICBpZiAoY3VycmVudF9oaWdoX2NoYW5uZWwgIT09IHByZXZfaGlnaF9jaGFubmVsKSB7XG4gICAgICBkaWZmZXJlbmNlX2ZvdW5kID0gdHJ1ZVxuICAgICAgU1lOQ19DT1VOVCArPSAxXG4gICAgfVxuXG4gICAgcHJldl9oaWdoX2NoYW5uZWwgPSBjdXJyZW50X2hpZ2hfY2hhbm5lbFxuXG4gICAgcmV0dXJuIGRpZmZlcmVuY2VfZm91bmRcblxuICB9XG5cbiAgZnVuY3Rpb24gaW5pdChvcHRzKSB7XG5cbiAgICBtYXN0ZXJfZ2FpbiA9IGNvbnRleHQuY3JlYXRlR2FpbigpXG4gICAgbWFzdGVyX2dhaW4uZ2Fpbi52YWx1ZSA9IDBcbiAgICBtYXN0ZXJfZ2Fpbi5jb25uZWN0KGNvbnRleHQuZGVzdGluYXRpb24pXG5cbiAgICBNRVNTQUdFID0gb3B0cy5tZXNzYWdlXG4gICAgdHlwZSA9IG9wdHMudHlwZVxuXG4gICAgLy8gY3JlYXRlIG9zYyArIGdhaW4gYmFua3NcbiAgICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBuX29zYzsgaWR4KyspIHtcblxuICAgICAgdmFyIGxvY2FsX29zYyA9IGNvbnRleHQuY3JlYXRlT3NjaWxsYXRvcigpXG4gICAgICBsb2NhbF9vc2MuZnJlcXVlbmN5LnZhbHVlID0gKGlkeCAqIHNwcmVhZCkgKyBpbml0aWFsRnJlcVxuXG4gICAgICB2YXIgbG9jYWxfZ2FpbiA9IGNvbnRleHQuY3JlYXRlR2FpbigpXG4gICAgICBsb2NhbF9nYWluLmdhaW4udmFsdWUgPSAxLjAgLyAobl9vc2MtMSlcblxuICAgICAgLy8gdmFyIGxvY2FsX2ZpbHRlciA9IGNvbnRleHQuY3JlYXRlQmlxdWFkRmlsdGVyKClcbiAgICAgIC8vIGxvY2FsX2ZpbHRlci50eXBlID0gJ2JhbmRwYXNzJ1xuICAgICAgLy8gbG9jYWxfZmlsdGVyLmZyZXF1ZW5jeS52YWx1ZSA9IChpZHggKiBzcHJlYWQpICsgaW5pdGlhbEZyZXFcbiAgICAgIC8vIGxvY2FsX2ZpbHRlci5RLnZhbHVlID0gMS4wXG4gICAgICAvL1xuICAgICAgLy8gd2luZG93LmQgPSBsb2NhbF9maWx0ZXJcblxuICAgICAgbG9jYWxfb3NjLmNvbm5lY3QobG9jYWxfZ2FpbilcblxuICAgICAgLy8gbG9jYWxfZ2Fpbi5jb25uZWN0KGxvY2FsX2ZpbHRlcilcblxuICAgICAgbG9jYWxfZ2Fpbi5jb25uZWN0KGxvY2FsQW5hbHlzZXIpXG4gICAgICBsb2NhbF9nYWluLmNvbm5lY3QobWFzdGVyX2dhaW4pXG4gICAgICAvLyBsb2NhbF9nYWluLmNvbm5lY3QoY29udGV4dC5kZXN0aW5hdGlvbilcblxuICAgICAgbG9jYWxfb3NjLnN0YXJ0KDApXG4gICAgICAvLyBsb2NhbF9vc2Mubm90ZU9uKDEwMClcblxuICAgICAgb3NjX2JhbmsucHVzaChsb2NhbF9vc2MpXG4gICAgICBnYWluX2JhbmsucHVzaChsb2NhbF9nYWluKVxuICAgICAgLy8gZmlsdGVyX2JhbmsucHVzaChsb2NhbF9maWx0ZXIpXG5cbiAgICB9XG5cbiAgICB2YXIgZmZ0U2l6ZSA9IDUxMlxuXG4gICAgYW5hbHlzZXIuZmZ0U2l6ZSA9IGZmdFNpemVcbiAgICBhbmFseXNlci5zbW9vdGhpbmdUaW1lQ29uc3RhbnQgPSAwXG4gICAgYnVmZmVyTGVuZ3RoID0gYW5hbHlzZXIuZnJlcXVlbmN5QmluQ291bnRcbiAgICBhbmFseXNlckRhdGFBcnJheSA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlckxlbmd0aClcblxuICAgIGxvY2FsQW5hbHlzZXIuZmZ0U2l6ZSA9IGZmdFNpemVcbiAgICBsb2NhbEFuYWx5c2VyLnNtb290aGluZ1RpbWVDb25zdGFudCA9IDBcbiAgICBsb2NhbEFuYWx5c2VyRGF0YUFycmF5ID0gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyTGVuZ3RoKVxuXG4gIH1cblxuICBmdW5jdGlvbiBjb25uZWN0KG90aGVyX2FnZW50KSB7XG5cbiAgICB2YXIgb3RoZXJfZ2Fpbl9iYW5rID0gb3RoZXJfYWdlbnQuZ2V0X2dhaW5fYmFuaygpXG5cbiAgICBvdGhlcl9nYWluX2JhbmsuZm9yRWFjaChmdW5jdGlvbiAoZ2Fpbk5vZGUpIHtcbiAgICAgIGdhaW5Ob2RlLmNvbm5lY3QoYW5hbHlzZXIpXG4gICAgfSlcblxuICAgIC8vIHZhciBvdGhlcl9maWx0ZXJfYmFuayA9IG90aGVyX2FnZW50LmdldF9maWx0ZXJfYmFuaygpXG4gICAgLy9cbiAgICAvLyBvdGhlcl9maWx0ZXJfYmFuay5mb3JFYWNoKGZ1bmN0aW9uKGZpbHRlck5vZGUpe1xuICAgIC8vICAgZmlsdGVyTm9kZS5jb25uZWN0KGFuYWx5c2VyKVxuICAgIC8vIH0pXG5cbiAgICBnZXRCdWZmZXIoKVxuXG4gICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICBjb25zb2xlLmxvZygnZG9uZSBjb25uZWN0aW5nJylcbiAgICAgIENVUlJFTlRfU1RBVEUgPSAwXG4gICAgfSwgMjAwKVxuXG4gIH1cblxuICBmdW5jdGlvbiBzZXRfbWVzc2FnZShtc2cpe1xuICAgIE1FU1NBR0UgPSBtc2dcbiAgICBNRVNTQUdFX0lEWCA9IDBcbiAgfVxuXG4gIGZ1bmN0aW9uIG5fY2hhbm5lbHMoKSB7XG4gICAgcmV0dXJuIG5fb3NjXG4gIH1cblxuICBmdW5jdGlvbiBnZXRfZ3JvdXBzKCkge1xuICAgIHJldHVybiBncm91cGVkX3BlYWtfcmFuZ2VzXG4gIH1cblxuICBmdW5jdGlvbiBnZXRCdWZmZXIoKSB7XG4gICAgYW5hbHlzZXIuZ2V0Qnl0ZUZyZXF1ZW5jeURhdGEoYW5hbHlzZXJEYXRhQXJyYXkpXG4gICAgcmV0dXJuIGFuYWx5c2VyRGF0YUFycmF5XG4gIH1cbiAgZnVuY3Rpb24gZ2V0X2xvY2FsX2ZyZXF1ZW5jeV9kYXRhX2J1ZmZlcigpIHtcbiAgICBsb2NhbEFuYWx5c2VyLmdldEJ5dGVGcmVxdWVuY3lEYXRhKGxvY2FsQW5hbHlzZXJEYXRhQXJyYXkpXG4gICAgcmV0dXJuIGxvY2FsQW5hbHlzZXJEYXRhQXJyYXlcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldF9nYWluX2JhbmsoKSB7XG4gICAgcmV0dXJuIGdhaW5fYmFua1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0X2ZpbHRlcl9iYW5rKCkge1xuICAgIHJldHVybiBmaWx0ZXJfYmFua1xuICB9XG5cblxuICBmdW5jdGlvbiBnZXRfYW5hbHlzZXIoKSB7XG4gICAgcmV0dXJuIGFuYWx5c2VyXG4gIH1cblxuXG4gIGZ1bmN0aW9uIHJlYWRfYnl0ZV9mcm9tX3NpZ25hbCgpIHtcblxuICAgIHZhciByYW5nZXMgPSB2YWxpZGF0ZV9yYW5nZXMoKVxuICAgIC8vIGNvbnNvbGUubG9nKHJhbmdlcylcblxuICAgIHZhciBiaW5hcnlfc3RyaW5nID0gJydcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IDg7IGkrKykge1xuICAgICAgaWYgKHJhbmdlc1tpXSkge1xuICAgICAgICBiaW5hcnlfc3RyaW5nICs9ICcxJ1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYmluYXJ5X3N0cmluZyArPSAnMCdcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcGFyc2VJbnQoYmluYXJ5X3N0cmluZywgMilcblxuICB9XG5cblxuICBmdW5jdGlvbiByZWFkX2J5dGVfYXJyYXlfZnJvbV9zaWduYWwoYnl0ZV9jb3VudCkge1xuXG4gICAgdmFyIHJldHVybl9hcnJheSA9ICcnXG5cbiAgICB2YXIgcmFuZ2VzID0gdmFsaWRhdGVfcmFuZ2VzKClcbiAgICAvLyBjb25zb2xlLmxvZyhyYW5nZXMpXG5cbiAgICBmb3IodmFyIGJ5dGVfY291bnRfaWR4ID0gMDsgYnl0ZV9jb3VudF9pZHggPCBieXRlX2NvdW50OyBieXRlX2NvdW50X2lkeCsrKXtcblxuICAgICAgdmFyIG9mZnNldCA9IDBcbiAgICAgIGlmKGJ5dGVfY291bnRfaWR4ID4gMCl7XG4gICAgICAgIG9mZnNldCArPSAyICsgKGJ5dGVfY291bnRfaWR4KjgpXG4gICAgICB9XG5cbiAgICAgIHZhciBiaW5hcnlfc3RyaW5nID0gJydcbiAgICAgIGZvciAodmFyIGkgPSAwK29mZnNldDsgaSA8IDgrb2Zmc2V0OyBpKyspIHtcbiAgICAgICAgaWYgKHJhbmdlc1tpXSkge1xuICAgICAgICAgIGJpbmFyeV9zdHJpbmcgKz0gJzEnXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYmluYXJ5X3N0cmluZyArPSAnMCdcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgYnl0ZSA9IHBhcnNlSW50KGJpbmFyeV9zdHJpbmcsIDIpXG4gICAgICByZXR1cm5fYXJyYXkgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlKVxuICAgIH1cblxuICAgIC8vIGNvbnNvbGUubG9nKHJldHVybl9hcnJheSlcbiAgICByZXR1cm4gcmV0dXJuX2FycmF5XG5cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlZ2lzdGVyX3BlYWtfcmFuZ2VzKCkge1xuXG4gICAgY29uc29sZS5sb2coJ3JlZ2lzdGVyaW5nIHBlYWsgcmFuZ2VzJylcblxuICAgIGdldEJ1ZmZlcigpXG4gICAgY29uc29sZS5sb2coYW5hbHlzZXJEYXRhQXJyYXkpXG5cbiAgICAvLyBwdXNoIG9uIHRvIG5ldyBhcnJheSBmb3Igc29ydGluZ1xuICAgIHZhciBkID0gW11cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJ1ZmZlckxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoYW5hbHlzZXJEYXRhQXJyYXlbaV0gPiAwKSB7XG4gICAgICAgIGQucHVzaChhbmFseXNlckRhdGFBcnJheVtpXSlcbiAgICAgIH1cbiAgICB9XG4gICAgZC5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICByZXR1cm4gYSAtIGJcbiAgICB9KVxuICAgIGNvbnNvbGUubG9nKCdNZWFuOiAnICsgZFtNYXRoLmZsb29yKGQubGVuZ3RoIC8gMildKVxuXG4gICAgbWVhbiA9IGRbTWF0aC5mbG9vcihkLmxlbmd0aCAvIDIpXVxuXG4gICAgLy9cbiAgICBwZWFrX3JhbmdlcyA9IFtdXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBidWZmZXJMZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGFuYWx5c2VyRGF0YUFycmF5W2ldID4gbWVhbikge1xuICAgICAgICBwZWFrX3Jhbmdlcy5wdXNoKGkpXG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gd2luZG93LnAgPSBwZWFrX3Jhbmdlc1xuXG4gICAgZ3JvdXBfcGVha19yYW5nZXMoKVxuXG4gIH1cblxuICBmdW5jdGlvbiBjaGVja19wZWFrX3JhbmdlcygpIHtcblxuICAgIGdldEJ1ZmZlcigpXG5cbiAgICB2YXIgaGl0cyA9IFtdXG4gICAgcGVha19yYW5nZXMuZm9yRWFjaChmdW5jdGlvbiAoZGF0YUFycmF5X2lkeCkge1xuICAgICAgaWYgKGFuYWx5c2VyRGF0YUFycmF5W2RhdGFBcnJheV9pZHhdID4gbWVhbikge1xuICAgICAgICBoaXRzLnB1c2godHJ1ZSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGhpdHMucHVzaChmYWxzZSlcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgcmV0dXJuIGhpdHNcblxuICB9XG5cbiAgZnVuY3Rpb24gZ3JvdXBfcGVha19yYW5nZXMoKSB7XG5cbiAgICBpZiAocGVha19yYW5nZXMgPT09IHVuZGVmaW5lZCB8fCBwZWFrX3Jhbmdlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgZ3JvdXBzID0gW10gLy8gWyBbMSwyLDNdLCBbOCw5LDEwXSwgWzMwLDMxLDMyXSAgXVxuXG4gICAgdmFyIGN1cnJlbnRfZ3JvdXBfaWR4ID0gMFxuXG4gICAgdmFyIGxvY2FsX2dyb3VwID0gbmV3IEFycmF5KClcblxuICAgIHBlYWtfcmFuZ2VzLmZvckVhY2goZnVuY3Rpb24gKHBlYWtfaWR4LCBpZHgpIHtcblxuICAgICAgLy8gaWYgdGhlIE1hdGguYWJzKHBlYWtfaWR4IC0gcGVha19yYW5nZXNbaWR4KzFdKSA9PT0gMVxuICAgICAgLy8gICAgcHVzaCBwZWFrX2lkeCBvbiB0byBsb2NhbF9ncm91cFxuICAgICAgLy8gZWxzZVxuICAgICAgLy8gICAgcHVzaCBsb2NhbF9ncm91cCBvbiB0byBncm91cHNcbiAgICAgIC8vICAgIGNsZWFyIGxvY2FsX2dyb3VwXG4gICAgICAvLyAgICBwdXNoIHBlYWtfaWR4IG9uIHRvIGxvY2FsX2dyb3VwXG5cbiAgICAgIGlmIChpZHggPT09IHBlYWtfcmFuZ2VzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ2hlcmUnKVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChNYXRoLmFicyhwZWFrX2lkeCAtIHBlYWtfcmFuZ2VzW2lkeCArIDFdKSA8PSAyKSB7XG4gICAgICAgIGxvY2FsX2dyb3VwLnB1c2gocGVha19pZHgpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2NhbF9ncm91cC5wdXNoKHBlYWtfaWR4KVxuICAgICAgICBncm91cHMucHVzaChsb2NhbF9ncm91cClcbiAgICAgICAgbG9jYWxfZ3JvdXAgPSBuZXcgQXJyYXkoKVxuICAgICAgfVxuXG4gICAgfSlcblxuICAgIGdyb3Vwcy5wdXNoKGxvY2FsX2dyb3VwKVxuXG4gICAgZ3JvdXBlZF9wZWFrX3JhbmdlcyA9IGdyb3Vwc1xuXG4gICAgcmV0dXJuIGdyb3Vwc1xuXG4gIH1cblxuICBmdW5jdGlvbiBzZXRfZ2FpbihjaGFubmVsLCB2YWx1ZSkge1xuICAgIGdhaW5fYmFua1tjaGFubmVsXS5nYWluLnZhbHVlID0gdmFsdWVcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldF92b2x1bWUodil7XG4gICAgaWYodiA+PSAxKXtcbiAgICAgIHY9MS4wXG4gICAgfVxuICAgIG1hc3Rlcl9nYWluLmdhaW4udmFsdWUgPSB2XG4gIH1cblxuICBmdW5jdGlvbiB2YWxpZGF0ZV9yYW5nZXMoKSB7XG5cbiAgICBpZiAoZ3JvdXBlZF9wZWFrX3JhbmdlcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZ2V0QnVmZmVyKClcblxuICAgIHZhciB2YWxpZF9ncm91cHMgPSBbXVxuXG4gICAgZ3JvdXBlZF9wZWFrX3Jhbmdlcy5mb3JFYWNoKGZ1bmN0aW9uIChncm91cCkge1xuXG4gICAgICB2YXIgaGl0cyA9IDBcblxuICAgICAgZ3JvdXAuZm9yRWFjaChmdW5jdGlvbiAoaWR4KSB7XG4gICAgICAgIGlmIChhbmFseXNlckRhdGFBcnJheVtpZHhdID49IG1lYW4pIHtcbiAgICAgICAgICBoaXRzICs9IDFcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgaWYgKGhpdHMgPj0gZ3JvdXAubGVuZ3RoIC8gMikge1xuICAgICAgICB2YWxpZF9ncm91cHMucHVzaCh0cnVlKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFsaWRfZ3JvdXBzLnB1c2goZmFsc2UpXG4gICAgICB9XG5cbiAgICB9KVxuXG4gICAgcmV0dXJuIHZhbGlkX2dyb3Vwc1xuXG4gIH1cblxuICBmdW5jdGlvbiBlbmNvZGVfYnl0ZShieXRlKSB7XG5cbiAgICB2YXIgY2hhcnMgPSBnZXRfZW5jb2RlZF9ieXRlX2FycmF5KGJ5dGUpXG5cbiAgICAvLyBjb25zb2xlLmxvZyhjaGFycylcblxuICAgIGNoYXJzLmZvckVhY2goZnVuY3Rpb24gKGMsIGlkeCkge1xuICAgICAgaWYgKGMgPT09ICcwJykge1xuICAgICAgICBzZXRfZ2FpbihpZHgsIDApXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZXRfZ2FpbihpZHgsIDEgLyAobl9vc2MtMikpXG4gICAgICB9XG4gICAgfSlcblxuICB9XG5cbiAgZnVuY3Rpb24gZW5jb2RlX3N0cmluZyhzdHJpbmcpe1xuXG4gICAgdmFyIGJ5dGVzID0gc3RyaW5nLnNwbGl0KCcnKVxuICAgIC8vIGNvbnNvbGUubG9nKHN0cmluZyxieXRlcylcblxuICAgIHdoaWxlKGJ5dGVzLmxlbmd0aCA8IEJZVEVTX1RPX0VOQ09ERSl7XG4gICAgICBieXRlcy5wdXNoKCcrJylcbiAgICB9XG5cbiAgICBMQVNUX1NFTlRfTUVTU0FHRSA9IENVUlJFTlRfRU5DT0RFRF9NRVNTQUdFXG4gICAgQ1VSUkVOVF9FTkNPREVEX01FU1NBR0UgPSBieXRlcy5qb2luKCcnKVxuXG4gICAgYnl0ZXMuZm9yRWFjaChmdW5jdGlvbihieXRlLGJ5dGVfaWR4KXtcblxuICAgICAgdmFyIG9mZnNldCA9IChieXRlX2lkeCAqIDgpICsgMlxuICAgICAgaWYoYnl0ZV9pZHggPT09IDApe1xuICAgICAgICBvZmZzZXQgPSAwXG4gICAgICB9XG5cbiAgICAgIGJ5dGUgPSBieXRlLmNoYXJDb2RlQXQoMClcblxuICAgICAgdmFyIGNoYXJzID0gZ2V0X2VuY29kZWRfYnl0ZV9hcnJheShieXRlKVxuXG4gICAgICAvLyBjb25zb2xlLmxvZyhjaGFycylcblxuICAgICAgY2hhcnMuZm9yRWFjaChmdW5jdGlvbiAoYywgaWR4KSB7XG4gICAgICAgIGlmIChjID09PSAnMCcpIHtcbiAgICAgICAgICBzZXRfZ2FpbihpZHgrb2Zmc2V0LCAwKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNldF9nYWluKGlkeCtvZmZzZXQsIDEgLyBuX29zYylcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgIH0pXG5cblxuXG4gIH1cblxuICBmdW5jdGlvbiBwZXJmb3JtX3NpZ25hbGluZygpIHtcbiAgICBmbGlwX2Zsb3AgPSAhZmxpcF9mbG9wXG4gICAgaWYgKGZsaXBfZmxvcCkge1xuICAgICAgc2V0X2dhaW4oOCwgMSAvIG5fb3NjKVxuICAgICAgc2V0X2dhaW4oOSwgMClcbiAgICB9IGVsc2Uge1xuICAgICAgc2V0X2dhaW4oOSwgMSAvIG5fb3NjKVxuICAgICAgc2V0X2dhaW4oOCwgMClcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRfZW5jb2RlZF9ieXRlX2FycmF5KGJ5dGUpIHtcbiAgICByZXR1cm4gcGFkKGJ5dGUudG9TdHJpbmcoMiksIDgpLnNwbGl0KCcnKVxuICB9XG5cbiAgZnVuY3Rpb24gcGFkKG4sIHdpZHRoLCB6KSB7XG4gICAgeiA9IHogfHwgJzAnO1xuICAgIG4gPSBuICsgJyc7XG4gICAgcmV0dXJuIG4ubGVuZ3RoID49IHdpZHRoID8gbiA6IG5ldyBBcnJheSh3aWR0aCAtIG4ubGVuZ3RoICsgMSkuam9pbih6KSArIG47XG4gIH1cblxuICBmdW5jdGlvbiBnZXRfc3RhdGUoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGJ1ZmZlcjogZ2V0QnVmZmVyKCksXG4gICAgICBsb2NhbF9idWZmZXI6IGdldF9sb2NhbF9mcmVxdWVuY3lfZGF0YV9idWZmZXIoKSxcbiAgICAgIFJYX0JVRkZFUjogUlhfQlVGRkVSLFxuICAgICAgQ1VSUkVOVF9TVEFURTogQ1VSUkVOVF9TVEFURSxcbiAgICAgIFNZTkNfQ09VTlQ6IFNZTkNfQ09VTlQsXG4gICAgICBNRVNTQUdFOiBNRVNTQUdFLFxuICAgICAgTUVTU0FHRV9JRFg6IE1FU1NBR0VfSURYLFxuICAgICAgQ09OTkVDVEVEX0FUOiBDT05ORUNURURfQVQsXG4gICAgICBDVVJSRU5UX0VOQ09ERURfTUVTU0FHRTogQ1VSUkVOVF9FTkNPREVEX01FU1NBR0UsXG4gICAgICBMQVNUX1NFTlRfTUVTU0FHRTogTEFTVF9TRU5UX01FU1NBR0UsXG4gICAgICBMQVRFU1RfUlhfQkxPQjogTEFURVNUX1JYX0JMT0IsXG4gICAgICBQUkVWX1JYX0JMT0I6IFBSRVZfUlhfQkxPQlxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlc2V0X2JhdWRfY291bnQoKXtcbiAgICBSWF9CVUZGRVIgPSAnJ1xuICAgIENPTk5FQ1RFRF9BVCA9IERhdGUubm93KClcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgY2hlY2tfcGVha19yYW5nZXM6IGNoZWNrX3BlYWtfcmFuZ2VzLFxuICAgIGNvbm5lY3Q6IGNvbm5lY3QsXG4gICAgZW5jb2RlX3JhbmdlOiBlbmNvZGVfYnl0ZSxcbiAgICBnZXRCdWZmZXI6IGdldEJ1ZmZlcixcbiAgICBnZXRfYW5hbHlzZXI6IGdldF9hbmFseXNlcixcbiAgICBnZXRfZW5jb2RlZF9ieXRlX2FycmF5OiBnZXRfZW5jb2RlZF9ieXRlX2FycmF5LFxuICAgIGdldF9maWx0ZXJfYmFuazogZ2V0X2ZpbHRlcl9iYW5rLFxuICAgIGdldF9nYWluX2Jhbms6IGdldF9nYWluX2JhbmssXG4gICAgZ2V0X2dyb3VwczogZ2V0X2dyb3VwcyxcbiAgICBnZXRfbG9jYWxfZnJlcXVlbmN5X2RhdGFfYnVmZmVyOiBnZXRfbG9jYWxfZnJlcXVlbmN5X2RhdGFfYnVmZmVyLFxuICAgIGdldF9zdGF0ZTogZ2V0X3N0YXRlLFxuICAgIGdyb3VwX3BlYWtfcmFuZ2VzOiBncm91cF9wZWFrX3JhbmdlcyxcbiAgICBpbml0OiBpbml0LFxuICAgIG5fY2hhbm5lbHM6IG5fY2hhbm5lbHMsXG4gICAgc2V0X2dhaW46IHNldF9nYWluLFxuICAgIHNldF9tZXNzYWdlOiBzZXRfbWVzc2FnZSxcbiAgICBzZXRfdm9sdW1lOiBzZXRfdm9sdW1lLFxuICAgIHJlYWRfYnl0ZV9mcm9tX3NpZ25hbDogcmVhZF9ieXRlX2Zyb21fc2lnbmFsLFxuICAgIHJlc2V0X2JhdWRfY291bnQ6IHJlc2V0X2JhdWRfY291bnQsXG4gICAgdGljazogdGljayxcbiAgICB2YWxpZGF0ZV9yYW5nZXM6IHZhbGlkYXRlX3JhbmdlcyxcbiAgICBwZXJmb3JtX3NpZ25hbGluZzogcGVyZm9ybV9zaWduYWxpbmdcbiAgfTtcblxufVxuIiwid2luZG93Lm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgd2luZG93LmNvbnNvbGUudGltZSA9IGZ1bmN0aW9uICgpIHt9O1xuICB3aW5kb3cuY29uc29sZS50aW1lRW5kID0gZnVuY3Rpb24gKCkge31cblxuICB2YXIgRE9fRFJBVyA9IHRydWVcbiAgd2luZG93LkJBVURfUkFURSA9IDMwMFxuXG4gIGNvbnNvbGUubG9nKHdpbmRvdy5zY3JlZW4ud2lkdGgpXG5cbiAgaWYgKHdpbmRvdy5zY3JlZW4ud2lkdGggPCA0MDApIHtcbiAgICBkMy5zZWxlY3QoJ2RpdiNtb2JpbGVfYmVnaW4nKS5vbignY2xpY2snLCBmdW5jdGlvbiAoKSB7XG4gICAgICBCQVVEX1JBVEUgPSAzMDBcbiAgICAgIGQzLnNlbGVjdCh0aGlzKS5zdHlsZSgnZGlzcGxheScsICdub25lJylcbiAgICAgIGluaXRfcm91dGluZSgpXG4gICAgfSlcbiAgfSBlbHNlIHtcbiAgICBCQVVEX1JBVEUgPSAxMDBcbiAgICBkMy5zZWxlY3QoJ2RpdiNtb2JpbGVfYmVnaW4nKS5yZW1vdmUoKVxuICAgIGluaXRfcm91dGluZSgpXG4gIH1cblxuICBmdW5jdGlvbiBpbml0X3JvdXRpbmUoKSB7XG4gICAgdmFyIHVkcF9tb2RlID0gdHJ1ZVxuXG4gICAgY29uc29sZS5sb2coJ21haW4uanMgLyBpbml0X3JvdXRpbmUoKScpXG5cbiAgICB2YXIgcGFyZW50X2JhdWRfcmF0ZSA9IGQzLnNlbGVjdCgnZGl2I2JhdWRfcmF0ZScpLmFwcGVuZCgnZGl2JykuYXR0cignY2xhc3MnLCAnY29sLW1kLTggY29sLW1kLW9mZnNldC0yJylcblxuICAgIHBhcmVudF9iYXVkX3JhdGUuYXBwZW5kKCdoNCcpLmF0dHIoJ2NsYXNzJywgJ3RleHQtY2VudGVyJykuaHRtbCgnbW9kZW0gc3BlZWQnKVxuICAgIHZhciBiYXVkX3NjYWxlID0gZDMuc2NhbGUubGluZWFyKCkuZG9tYWluKFsxMDAsIDBdKS5yYW5nZShbQkFVRF9SQVRFIC8gMy41LCBCQVVEX1JBVEUgKiAxMF0pXG4gICAgdmFyIGJhdWRfc2xpZGVyID0gcGFyZW50X2JhdWRfcmF0ZS5hcHBlbmQoJ2lucHV0JykuYXR0cigndHlwZScsICdyYW5nZScpXG4gICAgICAuYXR0cignbWluJywgMC4wKVxuICAgICAgLmF0dHIoJ21heCcsIDEwMC4wKVxuICAgICAgLmF0dHIoJ3ZhbHVlJywgYmF1ZF9zY2FsZS5pbnZlcnQoQkFVRF9SQVRFKSlcblxuICAgIGJhdWRfc2xpZGVyLm9uKCdpbnB1dCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKGQzLmV2ZW50KVxuICAgICAgdmFyIHYgPSBkMy5zZWxlY3QodGhpcykubm9kZSgpLnZhbHVlXG5cbiAgICAgIGNvbnNvbGUubG9nKHYpXG5cbiAgICAgIEJBVURfUkFURSA9IGJhdWRfc2NhbGUodilcblxuICAgICAgd2luZG93LmFsaWNlLnJlc2V0X2JhdWRfY291bnQoKVxuICAgICAgd2luZG93LmJvYi5yZXNldF9iYXVkX2NvdW50KClcblxuICAgIH0pXG5cbiAgICB2YXIgbWVzc2FnZV90b19zZW5kID0gJzA5ODc2NTQzMjEtLXRlc3RpbmctLTEyMzQ1Njc4OTAtLSEhLS1hYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eidcbiAgICAgIC8vIG1lc3NhZ2VfdG9fc2VuZCA9ICcwMTIzNDU2NydcbiAgICB2YXIgb3V0cHV0X21zZyA9ICcnXG5cbiAgICB2YXIgQWdlbnQgPSByZXF1aXJlKCcuL2FnZW50LmpzJylcbiAgICB2YXIgVmlld19Db250cm9sbGVyID0gcmVxdWlyZSgnLi92aWV3X2NvbnRyb2xsZXIuanMnKVxuXG4gICAgd2luZG93LmFsaWNlID0gQWdlbnQuYWdlbnQoKVxuICAgIGFsaWNlLmluaXQoe1xuICAgICAgdHlwZTogJ2NsaWVudCcsXG4gICAgICBtZXNzYWdlOiAnSSBhbSBhbGljZSBsaXN0ZW4gdG8gbWUgc2VuZCBkYXRhIHVzaW5nIHdlYiBhdWRpbyBhcGkuJ1xuICAgIH0pXG5cbiAgICB3aW5kb3cuYm9iID0gQWdlbnQuYWdlbnQoKVxuICAgIGJvYi5pbml0KHtcbiAgICAgIHR5cGU6ICdzZXJ2ZXInLFxuICAgICAgbWVzc2FnZTogJ1RoaXMgYmUgYm9iLCBsaXN0ZW4gdG8gTUUgc2VuZCBkYXRhIHVzaW5nIHRoZSB3ZWIgYXVkaW8gYXBpLidcbiAgICB9KVxuXG4gICAgdmFyIGRpc3BsYXlfYWxpY2UgPSBWaWV3X0NvbnRyb2xsZXIudmlld19jb250cm9sbGVyKCdhbGljZV9tb2RlbScpXG4gICAgZGlzcGxheV9hbGljZS5jb25uZWN0KGFsaWNlKVxuXG4gICAgdmFyIGRpc3BsYXlfYm9iID0gVmlld19Db250cm9sbGVyLnZpZXdfY29udHJvbGxlcignYm9iX21vZGVtJylcbiAgICBkaXNwbGF5X2JvYi5jb25uZWN0KGJvYilcblxuICAgIGFsaWNlLmNvbm5lY3QoYm9iKVxuICAgIGJvYi5jb25uZWN0KGFsaWNlKVxuXG4gICAgc2V0VGltZW91dChkcmF3LCA1MDApXG5cbiAgICBmdW5jdGlvbiBkcmF3KCkge1xuXG4gICAgICAgIGNvbnNvbGUudGltZSgndGVzdCcpXG4gICAgICAgIGFsaWNlLnRpY2soKVxuICAgICAgICBib2IudGljaygpXG4gICAgICAgIGNvbnNvbGUudGltZUVuZCgndGVzdCcpXG5cbiAgICAgICAgZGlzcGxheV9hbGljZS50aWNrKERPX0RSQVcpXG4gICAgICAgIGRpc3BsYXlfYm9iLnRpY2soRE9fRFJBVylcblxuICAgICAgICAvLyBjb25zb2xlLmxvZyhib2IuZ2V0X3N0YXRlKCkuTEFURVNUX1JYX0JMT0IsIGFsaWNlLmdldF9zdGF0ZSgpLkxBU1RfU0VOVF9NRVNTQUdFIClcblxuICAgICAgICB2YXIgYWxpY2Vfc3RhdGUgPSBhbGljZS5nZXRfc3RhdGUoKVxuICAgICAgICB2YXIgYm9iX3N0YXRlID0gYm9iLmdldF9zdGF0ZSgpXG5cbiAgICAgICAgLy8gY29uc29sZS5sb2coYm9iX3N0YXRlLkxBVEVTVF9SWF9CTE9CLmxlbmd0aCwgYWxpY2Vfc3RhdGUuTEFTVF9TRU5UX01FU1NBR0UubGVuZ3RoKVxuXG5cbiAgICAgICAgaWYgKChib2Jfc3RhdGUuTEFURVNUX1JYX0JMT0IubGVuZ3RoICE9PSBhbGljZV9zdGF0ZS5MQVNUX1NFTlRfTUVTU0FHRS5sZW5ndGgpIHx8IChib2Jfc3RhdGUuTEFURVNUX1JYX0JMT0IgPT09IGFsaWNlX3N0YXRlLkxBU1RfU0VOVF9NRVNTQUdFKSkge1xuICAgICAgICAgIC8vIGlmKGJvYl9zdGF0ZS5MQVRFU1RfUlhfQkxPQiA9PT0gYWxpY2Vfc3RhdGUuTEFTVF9TRU5UX01FU1NBR0Upe1xuICAgICAgICAgIHNldFRpbWVvdXQoZHJhdywgQkFVRF9SQVRFKVxuICAgICAgICAgICAgLy8gfSBlbHNlIHtcblxuICAgICAgICAgIC8vIH1cbiAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgIGNvbnNvbGUubG9nKGJvYl9zdGF0ZS5MQVRFU1RfUlhfQkxPQiwgYWxpY2Vfc3RhdGUuTEFTVF9TRU5UX01FU1NBR0UpXG5cbiAgICAgICAgICBjb25zb2xlLmxvZygnZXJyJylcblxuICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYm9iLnBlcmZvcm1fc2lnbmFsaW5nKClcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZHJhdywgQkFVRF9SQVRFICogMilcbiAgICAgICAgICB9KVxuXG5cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShkcmF3KTtcbiAgfVxuXG5cbn1cbiIsIm1vZHVsZS5leHBvcnRzLnZpZXdfY29udHJvbGxlciA9IHZpZXdfY29udHJvbGxlclxuXG5mdW5jdGlvbiB2aWV3X2NvbnRyb2xsZXIoZGl2X2lkKSB7XG5cbiAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgdmFyIG5hbWUgPSBkaXZfaWRcblxuICB2YXIgYWdlbnRcbiAgdmFyIHBhcmVudCA9IGQzLnNlbGVjdCgnZGl2IycgKyBkaXZfaWQpXG5cbiAgLy8gZGlzcGxheVxuICAvLyAgICBjdXJyZW50IHN0YXRlXG4gIC8vICAgIHN5bmMgY291bnRcbiAgLy8gICAgb3NjaWxsb3Njb3BlIG9mIG91dHB1dCAmIGlucHV0XG4gIC8vICAgIGZmdCBiYXJzIG9mIG91dHB1dCAmIGlucHV0XG4gIC8vICAgIGN1cnJlbnQgYmF1ZFxuICAvLyAgICByeCBidWZmZXJcblxuICB2YXIgc3ZnXG4gIHZhciBkaXZfc3luY19jb3VudFxuICB2YXIgc3luY19pbmRpY2F0b3JcbiAgdmFyIGRpdl9yeF9idWZmZXJcbiAgdmFyIGRpdl9iYXVkX21ldGVyXG4gIHZhciBiYXJzID0gW11cblxuICB2YXIgV0lEVEggPSAxMDI0XG4gIHZhciBIRUlHSFQgPSAyNTZcblxuICB2YXIgYmFyV2lkdGhcbiAgdmFyIGJ1ZmZlckxlbmd0aFxuICAgIC8vIHZhciBiYXJIZWlnaHRcblxuICAvLyBjcmVhdGUgc3ZnXG4gIGZ1bmN0aW9uIHNldHVwX3N2ZygpIHtcblxuICAgIHZhciBzdGF0ZSA9IGFnZW50LmdldF9zdGF0ZSgpXG5cbiAgICBXSURUSCA9IGJ1ZmZlckxlbmd0aFxuICAgIEhFSUdIVCA9IFdJRFRIIC8gNFxuXG4gICAgYmFyV2lkdGggPSAoV0lEVEggLyBidWZmZXJMZW5ndGgpXG5cbiAgICBwYXJlbnQuYXBwZW5kKCdoMScpLmF0dHIoJ2NsYXNzJywgJ3RleHQtY2VudGVyJykuaHRtbChuYW1lKVxuXG4gICAgc3ZnID0gcGFyZW50LmFwcGVuZCgnc3ZnJylcbiAgICAgIC5hdHRyKCdjbGFzcycsICdpbWctcmVzcG9uc2l2ZScpXG4gICAgICAuYXR0cignd2lkdGgnLCAnMTAwJScpXG4gICAgICAvLyAuYXR0cignaGVpZ2h0JywgSEVJR0hUKVxuICAgICAgLmF0dHIoJ3ByZXNlcnZlQXNwZWN0UmF0aW8nLCAneE1pZFlNaWQnKVxuICAgICAgLmF0dHIoJ3ZpZXdCb3gnLCAnMCAwICcgKyBXSURUSCArICcgJyArIEhFSUdIVClcbiAgICAgIC5zdHlsZSgnYmFja2dyb3VuZC1jb2xvcicsICdyZ2JhKDAsMCwwLDAuMSknKVxuXG4gICAgc3ZnLmFwcGVuZCgndGV4dCcpXG4gICAgICAudGV4dCgncmVjZWl2ZXIgc3BlY3RydW0nKVxuICAgICAgLmF0dHIoJ3gnLCBXSURUSClcbiAgICAgIC5hdHRyKCd5JywgMTIpXG4gICAgICAuYXR0cignZHgnLCAnLTRweCcpXG4gICAgICAuc3R5bGUoJ2ZvbnQtc2l6ZScsIDEyKVxuICAgICAgLnN0eWxlKCd0ZXh0LWFuY2hvcicsICdlbmQnKVxuICAgICAgLmF0dHIoJ2ZpbGwnLCAncmdiYSgwLDAsMCwwLjEpJylcblxuXG4gICAgYmFycyA9IFtdXG4gICAgZm9yICh2YXIgc3ZnYmFycyA9IDA7IHN2Z2JhcnMgPCBidWZmZXJMZW5ndGg7IHN2Z2JhcnMrKykge1xuICAgICAgdmFyIGJhciA9IHN2Zy5hcHBlbmQoJ3JlY3QnKVxuICAgICAgICAuYXR0cigneCcsIGJhcldpZHRoICogc3ZnYmFycylcbiAgICAgICAgLmF0dHIoJ3knLCAwKVxuICAgICAgICAuYXR0cignd2lkdGgnLCBiYXJXaWR0aClcbiAgICAgICAgLmF0dHIoJ2hlaWdodCcsIDApXG4gICAgICAgIC5hdHRyKCdmaWxsJywgJ2dyZWVuJylcbiAgICAgICAgLmF0dHIoJ3N0cm9rZScsICdub25lJylcblxuICAgICAgdmFyIGJhcl9pZHggPSBzdmdiYXJzXG4gICAgICBiYXIub24oJ21vdXNlb3ZlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc29sZS5sb2coYmFyX2lkeClcbiAgICAgIH0pXG5cbiAgICAgIGJhcnMucHVzaChiYXIpXG4gICAgfVxuXG4gICAgLy8gc3luYyBjb3VudFxuICAgIGRpdl9zeW5jX2NvdW50ID0gcGFyZW50LmFwcGVuZCgnZGl2JylcbiAgICAgIC5hdHRyKCdjbGFzcycsICdjb2wtbWQtNCcpXG4gICAgICAuc3R5bGUoJ291dGxpbmUnLCAnMXB4IGRvdHRlZCByZ2JhKDAsMCwwLDAuMSknKVxuXG4gICAgZGl2X3N5bmNfY291bnQuYXBwZW5kKCdoNCcpLmF0dHIoJ2NsYXNzJywgJ3RleHQtY2VudGVyJykuaHRtbCgnc3luY2hyb25pemF0aW9uIGNvdW50cycpXG4gICAgc3luY19pbmRpY2F0b3IgPSBkaXZfc3luY19jb3VudC5hcHBlbmQoJ2RpdicpLmF0dHIoJ2NsYXNzJywgJ3RleHQtY2VudGVyIHN5bmNfY291bnQnKVxuXG4gICAgLy8gYmF1ZCBtZXRlclxuICAgIHZhciBwYXJlbnRfYmF1ZF9tZXRlciA9IHBhcmVudC5hcHBlbmQoJ2RpdicpLmF0dHIoJ2NsYXNzJywgJ2NvbC1tZC00JylcbiAgICAgIC5zdHlsZSgnb3V0bGluZScsICcxcHggZG90dGVkIHJnYmEoMCwwLDAsMC4xKScpXG5cbiAgICBwYXJlbnRfYmF1ZF9tZXRlci5hcHBlbmQoJ2g0JykuYXR0cignY2xhc3MnLCAndGV4dC1jZW50ZXInKS5odG1sKCdiYXVkJylcbiAgICBkaXZfYmF1ZF9tZXRlciA9IHBhcmVudF9iYXVkX21ldGVyLmFwcGVuZCgnZGl2JykuYXR0cignY2xhc3MnLCAndGV4dC1jZW50ZXInKVxuXG5cbiAgICB2YXIgcGFyZW50X2lucHV0X3NsaWRlciA9IHBhcmVudC5hcHBlbmQoJ2RpdicpLmF0dHIoJ2NsYXNzJywgJ2NvbC1tZC00JylcblxuICAgIHBhcmVudF9pbnB1dF9zbGlkZXIuYXBwZW5kKCdoNCcpLmF0dHIoJ2NsYXNzJywgJ3RleHQtY2VudGVyJykuaHRtbCgndHJhbnNtaXR0ZXIgdm9sdW1lJylcblxuICAgIHZhciBzbGlkZXJfaXRzZWxmID0gcGFyZW50X2lucHV0X3NsaWRlci5hcHBlbmQoJ2lucHV0JykuYXR0cigndHlwZScsICdyYW5nZScpXG4gICAgICAuYXR0cignbWluJywgMC4wKVxuICAgICAgLmF0dHIoJ21heCcsIDEwMC4wKVxuICAgICAgLmF0dHIoJ3ZhbHVlJywgMC4wKVxuXG4gICAgc2xpZGVyX2l0c2VsZi5vbignaW5wdXQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAvLyBjb25zb2xlLmxvZyhkMy5ldmVudClcbiAgICAgIHZhciB2ID0gZDMuc2VsZWN0KHRoaXMpLm5vZGUoKS52YWx1ZVxuICAgICAgYWdlbnQuc2V0X3ZvbHVtZSh2IC8gMTAwLjApXG4gICAgfSlcblxuICAgIC8vIG1lc3NhZ2UgdG8gc2VuZFxuICAgIHZhciBwYXJlbnRfbWVzc2FnZV90b19zZW5kID0gcGFyZW50LmFwcGVuZCgnZGl2JykuYXR0cignY2xhc3MnLCAnY29sLW1kLTEyJylcblxuICAgIHBhcmVudF9tZXNzYWdlX3RvX3NlbmQuYXBwZW5kKCdoNCcpLmF0dHIoJ2NsYXNzJywgJ3RleHQtY2VudGVyJykuaHRtbCgnc2VuZGluZyB0aGlzIG1lc3NhZ2UnKVxuXG4gICAgdmFyIGlucHV0X2ZpZWxkID0gcGFyZW50X21lc3NhZ2VfdG9fc2VuZC5hcHBlbmQoJ2lucHV0JylcbiAgICAgIC5hdHRyKCd0eXBlJywgJ3RleHQnKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ21zZ19pbnB1dCcpXG5cbiAgICBpbnB1dF9maWVsZC5ub2RlKCkudmFsdWUgPSBzdGF0ZS5NRVNTQUdFXG5cbiAgICBpbnB1dF9maWVsZC5vbigna2V5dXAnLCBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgdiA9IGlucHV0X2ZpZWxkLm5vZGUoKS52YWx1ZVxuICAgICAgaWYgKHYgPT09ICcnKSB7XG4gICAgICAgIHYgPSAnICdcbiAgICAgIH1cblxuICAgICAgYWdlbnQuc2V0X21lc3NhZ2UodilcbiAgICB9KVxuXG4gICAgLy8gcnggYnVmZmVyXG4gICAgdmFyIGRpdl9yeF9idWZmZXJfcGFyZW50ID0gcGFyZW50LmFwcGVuZCgnZGl2JylcbiAgICAgIC5hdHRyKCdjbGFzcycsICdjb2wtbWQtMTInKVxuXG4gICAgZGl2X3J4X2J1ZmZlcl9wYXJlbnQuYXBwZW5kKCdoNCcpLmF0dHIoJ2NsYXNzJywgJ3RleHQtY2VudGVyJykuaHRtbCgncnggYnVmZmVyJylcblxuICAgIGRpdl9yeF9idWZmZXIgPSBkaXZfcnhfYnVmZmVyX3BhcmVudC5hcHBlbmQoJ3ByZScpLmF0dHIoJ2NsYXNzJywgJ3J4X2J1ZmZlcicpXG5cblxuXG4gICAgLy9cblxuICB9XG5cbiAgZnVuY3Rpb24gY29ubmVjdChyZW1vdGVfYWdlbnQpIHtcbiAgICBhZ2VudCA9IHJlbW90ZV9hZ2VudFxuICAgIGJ1ZmZlckxlbmd0aCA9IHJlbW90ZV9hZ2VudC5nZXRfc3RhdGUoKS5idWZmZXIubGVuZ3RoXG4gIH1cblxuICBmdW5jdGlvbiB0aWNrKGRyYXdfYmFycykge1xuXG4gICAgaWYgKGJhcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICBzZXR1cF9zdmcoKVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBzdGF0ZSA9IGFnZW50LmdldF9zdGF0ZSgpXG5cbiAgICBpZiAoZHJhd19iYXJzID09PSB0cnVlKSB7XG4gICAgICB2YXIgZGF0YUFycmF5ID0gc3RhdGUuYnVmZmVyXG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYnVmZmVyTGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYmFyc1tpXS5hdHRyKCdoZWlnaHQnLCAoZGF0YUFycmF5W2ldIC8gMjU1KSAqIEhFSUdIVClcbiAgICAgIH1cblxuICAgIH1cblxuICAgIHN5bmNfaW5kaWNhdG9yLmh0bWwoc3RhdGUuU1lOQ19DT1VOVClcbiAgICBkaXZfcnhfYnVmZmVyLmh0bWwoc3RhdGUuUlhfQlVGRkVSKVxuXG4gICAgdmFyIGJhdWQgPSA4ICogKHN0YXRlLlJYX0JVRkZFUi5sZW5ndGggLyAoKERhdGUubm93KCkgLSBzdGF0ZS5DT05ORUNURURfQVQpIC8gMTAwMC4wKSlcbiAgICBkaXZfYmF1ZF9tZXRlci5odG1sKGJhdWQudG9GaXhlZCgyKSlcblxuICAgIC8vXG4gICAgLy8gY29uc29sZS5sb2coYWdlbnQuZ2V0X3N0YXRlKCkuU1lOQ19DT1VOVClcblxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICB0aWNrOiB0aWNrLFxuICAgIGNvbm5lY3Q6IGNvbm5lY3RcbiAgfVxuXG59XG4iXX0=
