(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

module.exports.agent = agent

var BYTES_TO_ENCODE = 1

function agent() {

  var myAudio = document.querySelector('audio');

  (function setup_audio_context() {
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

  var ERROR_RATE

  var MESSAGE
  var MESSAGE_IDX = 0

  // verification variables
  var LAST_SENT_MESSAGE = ''
  var CURRENT_ENCODED_MESSAGE = ''

  var LATEST_RX_BLOB = ''
  var PREV_RX_BLOB = ''

  // stats variables
  var RX_BUFFER = ''
  var CONNECTED_AT

  // options set by init(opts)
  var name
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
  var n_osc = (8 * BYTES_TO_ENCODE) + 3

  if (BYTES_TO_ENCODE === 1) {
    n_osc = 11
  }

  var freqRange = 10000
  var spread = (freqRange / n_osc)
  var initialFreq = 200

  var CURRENT_STATE = -1

  function get_osc_bank() {}

  function tick() {

    console.log(name, CURRENT_STATE)

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

        if (grouped_peak_ranges !== undefined) {
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
        var substring = MESSAGE.substr(MESSAGE_IDX, BYTES_TO_ENCODE)
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
          if (MESSAGE_IDX >= MESSAGE.length) {
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

    // options
    // name - plaintext identifier for the modem
    // type - used to invoke different state machines
    //

    name = opts.name

    if (opts.type === 'mic') {

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
          //  video.src = (window.URL && window.URL.createObjectURL(stream)) || stream;
          //  video.onloadedmetadata = function(e) {
          //     video.play();
          //     video.muted = 'true';
          //  };

          // Create a MediaStreamAudioSourceNode
          // Feed the HTMLMediaElement into it
          var source = context.createMediaStreamSource(stream);
          source.connect(analyser)
          CURRENT_STATE = 0
          console.log('done connecting ', name)
            // Create a biquadfilter
            // var biquadFilter = audioCtx.createBiquadFilter();
            // biquadFilter.type = "lowshelf";
            // biquadFilter.frequency.value = 1000;
            // biquadFilter.gain.value = range.value;

          // connect the AudioBufferSourceNode to the gainNode
          // and the gainNode to the destination, so we can play the
          // music and adjust the volume using the mouse cursor
          // source.connect(biquadFilter);
          // biquadFilter.connect(audioCtx.destination);

          // Get new mouse pointer coordinates when mouse is moved
          // then set new gain value

          // range.oninput = function() {
          //     biquadFilter.gain.value = range.value;
          // }

        },

        // Error callback
        function (err) {
          console.log('The following gUM error occured: ' + err);
        }
      );

    }

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
      local_gain.gain.value = 1.0 / (n_osc - 1)

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

    getBuffer()

    setTimeout(function () {
      console.log('done connecting')
      CURRENT_STATE = 0
    }, 200)

  }

  function set_message(msg) {
    MESSAGE = msg
    MESSAGE_IDX = 0
  }

  function n_channels() {
    return n_osc
  }


  function get_analyser() {
    return analyser
  }

  function getBuffer() {
    console.log('getting buffer ' + name)
    analyser.getByteFrequencyData(analyserDataArray)
    return analyserDataArray
  }

  function get_gain_bank() {
    return gain_bank
  }

  function get_groups() {
    return grouped_peak_ranges
  }

  function get_filter_bank() {
    return filter_bank
  }

  function get_local_frequency_data_buffer() {
    localAnalyser.getByteFrequencyData(localAnalyserDataArray)
    return localAnalyserDataArray
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

    for (var byte_count_idx = 0; byte_count_idx < byte_count; byte_count_idx++) {

      var offset = 0
      if (byte_count_idx > 0) {
        offset += 2 + (byte_count_idx * 8)
      }

      var binary_string = ''
      for (var i = 0 + offset; i < 8 + offset; i++) {
        if (ranges[i]) {
          binary_string += '1'
        } else {
          binary_string += '0'
        }
      }

      var byte = parseInt(binary_string, 2)
      return_array += String.fromCharCode(byte)

    }

    return return_array

  }

  function register_peak_ranges() {

    console.log('registering peak ranges ' + name)


    getBuffer()
    console.log(analyserDataArray)

    console.log('finding mean of buffer')
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

    // searching through the buffer

    peak_ranges = []
    for (var i = 0; i < bufferLength; i++) {
      if (analyserDataArray[i] > mean) {
        peak_ranges.push(i)
      }
    }

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

  function set_volume(v) {
    if (v >= 1) {
      v = 1.0
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
        set_gain(idx, 1 / (n_osc - 2))
      }
    })

  }

  function encode_string(string) {

    var bytes = string.split('')
      // console.log(string,bytes)

    while (bytes.length < BYTES_TO_ENCODE) {
      bytes.push('+')
    }

    LAST_SENT_MESSAGE = CURRENT_ENCODED_MESSAGE
    CURRENT_ENCODED_MESSAGE = bytes.join('')

    bytes.forEach(function (byte, byte_idx) {

      var offset = (byte_idx * 8) + 2
      if (byte_idx === 0) {
        offset = 0
      }

      byte = byte.charCodeAt(0)

      var chars = get_encoded_byte_array(byte)

      // console.log(chars)

      chars.forEach(function (c, idx) {
        if (c === '0') {
          set_gain(idx + offset, 0)
        } else {
          set_gain(idx + offset, 1 / n_osc)
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
      buffer: analyserDataArray,
      // local_buffer: get_local_frequency_data_buffer(),
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

  function reset_baud_count() {
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
    get_osc_bank: get_osc_bank,
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

  window.console.time = function () {};
  window.console.timeEnd = function () {};
  // window.console.log = function(){};

  var DO_DRAW = true
  window.BAUD_RATE = 300

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
      name: 'alice',
      type: 'client',
      message: 'I am alice listen to me send data using web audio api.'
    })

    window.bob = Agent.agent()
    bob.init({
      name: 'bob',
      type: 'server',
      message: 'This be bob, listen to ME send data using the web audio api.'
    })


    var display_bob = View_Controller.view_controller('bob_modem')
    display_bob.connect(bob)

    var display_alice = View_Controller.view_controller('alice_modem')
    display_alice.connect(alice)


    alice.connect(bob)
    bob.connect(alice)

    setTimeout(draw, 500)

    function draw() {

      console.log('tick')


        console.time('test')
        alice.tick()
        bob.tick()
        console.timeEnd('test')

      console.log('draw')

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
            //bob.perform_signaling()
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

    console.log('getting state')
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

  }

  return {
    tick: tick,
    connect: connect
  }

}

},{}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9hZ2VudC5qcyIsImpzL21haW4uanMiLCJqcy92aWV3X2NvbnRyb2xsZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM3FCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMuYWdlbnQgPSBhZ2VudFxuXG52YXIgQllURVNfVE9fRU5DT0RFID0gMVxuXG5mdW5jdGlvbiBhZ2VudCgpIHtcblxuICB2YXIgbXlBdWRpbyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2F1ZGlvJyk7XG5cbiAgKGZ1bmN0aW9uIHNldHVwX2F1ZGlvX2NvbnRleHQoKSB7XG4gICAgaWYgKHdpbmRvdy5jb250ZXh0ID09PSB1bmRlZmluZWQpIHtcblxuICAgICAgY29uc29sZS5sb2coJ2NyZWF0aW5nIG5ldyB3aW5kb3cuQXVkaW9Db250ZXh0KCknKVxuXG4gICAgICB3aW5kb3cuQXVkaW9Db250ZXh0ID0gKFxuICAgICAgICB3aW5kb3cuQXVkaW9Db250ZXh0IHx8XG4gICAgICAgIHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQgfHxcbiAgICAgICAgd2luZG93Lm1vekF1ZGlvQ29udGV4dCB8fFxuICAgICAgICB3aW5kb3cubXNBdWRpb0NvbnRleHRcbiAgICAgIClcblxuICAgICAgd2luZG93LmNvbnRleHQgPSBuZXcgd2luZG93LkF1ZGlvQ29udGV4dCgpXG5cbiAgICB9XG4gIH0pKClcblxuICB2YXIgRVJST1JfUkFURVxuXG4gIHZhciBNRVNTQUdFXG4gIHZhciBNRVNTQUdFX0lEWCA9IDBcblxuICAvLyB2ZXJpZmljYXRpb24gdmFyaWFibGVzXG4gIHZhciBMQVNUX1NFTlRfTUVTU0FHRSA9ICcnXG4gIHZhciBDVVJSRU5UX0VOQ09ERURfTUVTU0FHRSA9ICcnXG5cbiAgdmFyIExBVEVTVF9SWF9CTE9CID0gJydcbiAgdmFyIFBSRVZfUlhfQkxPQiA9ICcnXG5cbiAgLy8gc3RhdHMgdmFyaWFibGVzXG4gIHZhciBSWF9CVUZGRVIgPSAnJ1xuICB2YXIgQ09OTkVDVEVEX0FUXG5cbiAgLy8gb3B0aW9ucyBzZXQgYnkgaW5pdChvcHRzKVxuICB2YXIgbmFtZVxuICB2YXIgdHlwZVxuXG5cbiAgdmFyIGFuYWx5c2VyID0gY29udGV4dC5jcmVhdGVBbmFseXNlcigpXG4gIHZhciBhbmFseXNlckRhdGFBcnJheSAvLyB0aGUgYnVmZmVyIHRoZSBhbmFseXNlciB3cml0ZXMgdG9cbiAgdmFyIGJ1ZmZlckxlbmd0aCAvLyB0aGUgbGVuZ3RoIG9mIHRoZSBhbmFseXNlckRhdGFBcnJheVxuXG4gIHZhciBsb2NhbEFuYWx5c2VyID0gY29udGV4dC5jcmVhdGVBbmFseXNlcigpXG4gIHZhciBsb2NhbEFuYWx5c2VyRGF0YUFycmF5IC8vIHRoZSBidWZmZXIgdGhlIGFuYWx5c2VyIHdyaXRlcyB0b1xuXG4gIHZhciBwZWFrX3JhbmdlcyAvLyBmbGF0IGxpc3Qgb2YgaW5kZXhlcyBvZiBkZXRlY3RlZCBwZWFrIHJhbmdlc1xuICB2YXIgZ3JvdXBlZF9wZWFrX3JhbmdlcyAvLyBjbHVzdGVyZWQgZ3JvdXBzIG9mIHBlYWsgcmFuZ2VzXG4gIHZhciBtZWFuIC8vIHRoZSB0aHJlc2hvbGQgZm9yIGRldGVybWluaW5nIGlmIGEgYmFuZCBpcyBwZWFrZWRcblxuICB2YXIgZmxpcF9mbG9wID0gdHJ1ZVxuXG4gIHZhciBwcmV2X2hpZ2hfY2hhbm5lbCA9IC0xXG4gIHZhciBjdXJyZW50X2hpZ2hfY2hhbm5lbCA9IDBcbiAgdmFyIFNZTkNfQ09VTlQgPSAwXG5cbiAgdmFyIG9zY19iYW5rID0gW11cbiAgdmFyIGdhaW5fYmFuayA9IFtdXG4gIHZhciBmaWx0ZXJfYmFuayA9IFtdXG5cbiAgdmFyIG1hc3Rlcl9nYWluXG5cbiAgLy8gdmFyIG5fb3NjID0gNDRcbiAgdmFyIG5fb3NjID0gKDggKiBCWVRFU19UT19FTkNPREUpICsgM1xuXG4gIGlmIChCWVRFU19UT19FTkNPREUgPT09IDEpIHtcbiAgICBuX29zYyA9IDExXG4gIH1cblxuICB2YXIgZnJlcVJhbmdlID0gMTAwMDBcbiAgdmFyIHNwcmVhZCA9IChmcmVxUmFuZ2UgLyBuX29zYylcbiAgdmFyIGluaXRpYWxGcmVxID0gMjAwXG5cbiAgdmFyIENVUlJFTlRfU1RBVEUgPSAtMVxuXG4gIGZ1bmN0aW9uIGdldF9vc2NfYmFuaygpIHt9XG5cbiAgZnVuY3Rpb24gdGljaygpIHtcblxuICAgIGNvbnNvbGUubG9nKG5hbWUsIENVUlJFTlRfU1RBVEUpXG5cbiAgICB2YXIgcmV0X29iaiA9IHtcbiAgICAgIG5ld19kYXRhOiBmYWxzZSxcbiAgICAgIGRhdGE6ICcnXG4gICAgfVxuXG4gICAgaWYgKENVUlJFTlRfU1RBVEUgPCAwKSB7XG5cbiAgICAgIC8vIHBlcmZvcm1pbmcgaW5pdGlhbGl6YXRpb24gcHJvY2VzcywgZG8gbm90aGluZ1xuICAgICAgcmV0dXJuO1xuXG4gICAgfSBlbHNlIHtcblxuICAgICAgaWYgKENVUlJFTlRfU1RBVEUgPT09IDApIHtcblxuICAgICAgICByZWdpc3Rlcl9wZWFrX3JhbmdlcygpXG5cbiAgICAgICAgaWYgKGdyb3VwZWRfcGVha19yYW5nZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmIChncm91cGVkX3BlYWtfcmFuZ2VzLmxlbmd0aCA9PT0gbl9vc2MpIHtcbiAgICAgICAgICAgIENVUlJFTlRfU1RBVEUgPSAxXG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgIH0gZWxzZSBpZiAoQ1VSUkVOVF9TVEFURSA9PT0gMSkge1xuXG4gICAgICAgIHBlcmZvcm1fc2lnbmFsaW5nKClcbiAgICAgICAgbG9va19mb3Jfc2lnbmFsaW5nKClcblxuICAgICAgICBpZiAoU1lOQ19DT1VOVCA+IDIpIHtcbiAgICAgICAgICBDVVJSRU5UX1NUQVRFID0gMlxuICAgICAgICAgIENPTk5FQ1RFRF9BVCA9IERhdGUubm93KClcbiAgICAgICAgfVxuXG4gICAgICB9IGVsc2UgaWYgKENVUlJFTlRfU1RBVEUgPT09IDIpIHtcblxuICAgICAgICAvLyBlbmNvZGUgYnl0ZVxuICAgICAgICAvLyB2YXIgYnl0ZV90b19zZW5kID0gTUVTU0FHRVtNRVNTQUdFX0lEWF0uY2hhckNvZGVBdCgwKVxuICAgICAgICAvLyBlbmNvZGVfYnl0ZShieXRlX3RvX3NlbmQpXG5cbiAgICAgICAgLy8gZW5jb2RlIGJ5dGUgYXJyYXlcbiAgICAgICAgdmFyIHN1YnN0cmluZyA9IE1FU1NBR0Uuc3Vic3RyKE1FU1NBR0VfSURYLCBCWVRFU19UT19FTkNPREUpXG4gICAgICAgIGVuY29kZV9zdHJpbmcoc3Vic3RyaW5nKVxuXG4gICAgICAgIGlmIChsb29rX2Zvcl9zaWduYWxpbmcoKSkge1xuXG4gICAgICAgICAgLy8gcmVhZCBieXRlXG4gICAgICAgICAgLy9SWF9CVUZGRVIgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShyZWFkX2J5dGVfZnJvbV9zaWduYWwoKSlcbiAgICAgICAgICB2YXIgYnl0ZXNfb25fd2lyZV9zdHJpbmcgPSByZWFkX2J5dGVfYXJyYXlfZnJvbV9zaWduYWwoQllURVNfVE9fRU5DT0RFKVxuXG4gICAgICAgICAgUFJFVl9SWF9CTE9CID0gTEFURVNUX1JYX0JMT0JcbiAgICAgICAgICBMQVRFU1RfUlhfQkxPQiA9IGJ5dGVzX29uX3dpcmVfc3RyaW5nXG4gICAgICAgICAgUlhfQlVGRkVSICs9IGJ5dGVzX29uX3dpcmVfc3RyaW5nXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhSWF9CVUZGRVIpXG5cbiAgICAgICAgICBpZiAodHlwZSA9PT0gJ2NsaWVudCcpIHtcbiAgICAgICAgICAgIHJldF9vYmoubmV3X2RhdGEgPSB0cnVlXG4gICAgICAgICAgICByZXRfb2JqLmRhdGEgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJlYWRfYnl0ZV9mcm9tX3NpZ25hbChCWVRFU19UT19FTkNPREUpKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGluY3JlbWVudCBieXRlIHRvIGVuY29kZVxuICAgICAgICAgIE1FU1NBR0VfSURYICs9IEJZVEVTX1RPX0VOQ09ERVxuICAgICAgICAgIGlmIChNRVNTQUdFX0lEWCA+PSBNRVNTQUdFLmxlbmd0aCkge1xuICAgICAgICAgICAgTUVTU0FHRV9JRFggPSAwXG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIE1FU1NBR0VfSURYID0gTUVTU0FHRV9JRFggJSBNRVNTQUdFLmxlbmd0aFxuXG4gICAgICAgICAgLy8gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgIHBlcmZvcm1fc2lnbmFsaW5nKClcbiAgICAgICAgICAgIC8vIH0sMilcblxuXG4gICAgICAgIH1cblxuICAgICAgfSAvLyBlbmQgb2YgQ1VSUkVOVF9TVEFURSA9PT0gMlxuXG4gICAgfVxuXG4gICAgcmV0dXJuIHJldF9vYmpcblxuICB9XG5cbiAgZnVuY3Rpb24gbG9va19mb3Jfc2lnbmFsaW5nKCkge1xuXG4gICAgdmFyIHZhbGlkX3JhbmdlcyA9IHZhbGlkYXRlX3JhbmdlcygpXG5cbiAgICBpZiAodmFsaWRfcmFuZ2VzWzhdID09PSB0cnVlICYmIHZhbGlkX3Jhbmdlc1s5XSA9PT0gZmFsc2UpIHtcbiAgICAgIGN1cnJlbnRfaGlnaF9jaGFubmVsID0gOFxuICAgIH0gZWxzZSB7XG4gICAgICBjdXJyZW50X2hpZ2hfY2hhbm5lbCA9IDlcbiAgICB9XG5cbiAgICB2YXIgZGlmZmVyZW5jZV9mb3VuZCA9IGZhbHNlXG5cbiAgICBpZiAoY3VycmVudF9oaWdoX2NoYW5uZWwgIT09IHByZXZfaGlnaF9jaGFubmVsKSB7XG4gICAgICBkaWZmZXJlbmNlX2ZvdW5kID0gdHJ1ZVxuICAgICAgU1lOQ19DT1VOVCArPSAxXG4gICAgfVxuXG4gICAgcHJldl9oaWdoX2NoYW5uZWwgPSBjdXJyZW50X2hpZ2hfY2hhbm5lbFxuXG4gICAgcmV0dXJuIGRpZmZlcmVuY2VfZm91bmRcblxuICB9XG5cbiAgZnVuY3Rpb24gaW5pdChvcHRzKSB7XG5cbiAgICAvLyBvcHRpb25zXG4gICAgLy8gbmFtZSAtIHBsYWludGV4dCBpZGVudGlmaWVyIGZvciB0aGUgbW9kZW1cbiAgICAvLyB0eXBlIC0gdXNlZCB0byBpbnZva2UgZGlmZmVyZW50IHN0YXRlIG1hY2hpbmVzXG4gICAgLy9cblxuICAgIG5hbWUgPSBvcHRzLm5hbWVcblxuICAgIGlmIChvcHRzLnR5cGUgPT09ICdtaWMnKSB7XG5cbiAgICAgIG5hdmlnYXRvci5nZXRNZWRpYSA9IChcbiAgICAgICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSB8fFxuICAgICAgICBuYXZpZ2F0b3Iud2Via2l0R2V0VXNlck1lZGlhIHx8XG4gICAgICAgIG5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWEgfHxcbiAgICAgICAgbmF2aWdhdG9yLm1zR2V0VXNlck1lZGlhXG4gICAgICApO1xuXG4gICAgICBuYXZpZ2F0b3IuZ2V0TWVkaWEoXG4gICAgICAgIC8vIGNvbnN0cmFpbnRzOiBhdWRpbyBhbmQgdmlkZW8gZm9yIHRoaXMgYXBwXG4gICAgICAgIHtcbiAgICAgICAgICBhdWRpbzogdHJ1ZSxcbiAgICAgICAgICB2aWRlbzogZmFsc2VcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBTdWNjZXNzIGNhbGxiYWNrXG4gICAgICAgIGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgICAgICAvLyAgdmlkZW8uc3JjID0gKHdpbmRvdy5VUkwgJiYgd2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwoc3RyZWFtKSkgfHwgc3RyZWFtO1xuICAgICAgICAgIC8vICB2aWRlby5vbmxvYWRlZG1ldGFkYXRhID0gZnVuY3Rpb24oZSkge1xuICAgICAgICAgIC8vICAgICB2aWRlby5wbGF5KCk7XG4gICAgICAgICAgLy8gICAgIHZpZGVvLm11dGVkID0gJ3RydWUnO1xuICAgICAgICAgIC8vICB9O1xuXG4gICAgICAgICAgLy8gQ3JlYXRlIGEgTWVkaWFTdHJlYW1BdWRpb1NvdXJjZU5vZGVcbiAgICAgICAgICAvLyBGZWVkIHRoZSBIVE1MTWVkaWFFbGVtZW50IGludG8gaXRcbiAgICAgICAgICB2YXIgc291cmNlID0gY29udGV4dC5jcmVhdGVNZWRpYVN0cmVhbVNvdXJjZShzdHJlYW0pO1xuICAgICAgICAgIHNvdXJjZS5jb25uZWN0KGFuYWx5c2VyKVxuICAgICAgICAgIENVUlJFTlRfU1RBVEUgPSAwXG4gICAgICAgICAgY29uc29sZS5sb2coJ2RvbmUgY29ubmVjdGluZyAnLCBuYW1lKVxuICAgICAgICAgICAgLy8gQ3JlYXRlIGEgYmlxdWFkZmlsdGVyXG4gICAgICAgICAgICAvLyB2YXIgYmlxdWFkRmlsdGVyID0gYXVkaW9DdHguY3JlYXRlQmlxdWFkRmlsdGVyKCk7XG4gICAgICAgICAgICAvLyBiaXF1YWRGaWx0ZXIudHlwZSA9IFwibG93c2hlbGZcIjtcbiAgICAgICAgICAgIC8vIGJpcXVhZEZpbHRlci5mcmVxdWVuY3kudmFsdWUgPSAxMDAwO1xuICAgICAgICAgICAgLy8gYmlxdWFkRmlsdGVyLmdhaW4udmFsdWUgPSByYW5nZS52YWx1ZTtcblxuICAgICAgICAgIC8vIGNvbm5lY3QgdGhlIEF1ZGlvQnVmZmVyU291cmNlTm9kZSB0byB0aGUgZ2Fpbk5vZGVcbiAgICAgICAgICAvLyBhbmQgdGhlIGdhaW5Ob2RlIHRvIHRoZSBkZXN0aW5hdGlvbiwgc28gd2UgY2FuIHBsYXkgdGhlXG4gICAgICAgICAgLy8gbXVzaWMgYW5kIGFkanVzdCB0aGUgdm9sdW1lIHVzaW5nIHRoZSBtb3VzZSBjdXJzb3JcbiAgICAgICAgICAvLyBzb3VyY2UuY29ubmVjdChiaXF1YWRGaWx0ZXIpO1xuICAgICAgICAgIC8vIGJpcXVhZEZpbHRlci5jb25uZWN0KGF1ZGlvQ3R4LmRlc3RpbmF0aW9uKTtcblxuICAgICAgICAgIC8vIEdldCBuZXcgbW91c2UgcG9pbnRlciBjb29yZGluYXRlcyB3aGVuIG1vdXNlIGlzIG1vdmVkXG4gICAgICAgICAgLy8gdGhlbiBzZXQgbmV3IGdhaW4gdmFsdWVcblxuICAgICAgICAgIC8vIHJhbmdlLm9uaW5wdXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAvLyAgICAgYmlxdWFkRmlsdGVyLmdhaW4udmFsdWUgPSByYW5nZS52YWx1ZTtcbiAgICAgICAgICAvLyB9XG5cbiAgICAgICAgfSxcblxuICAgICAgICAvLyBFcnJvciBjYWxsYmFja1xuICAgICAgICBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ1RoZSBmb2xsb3dpbmcgZ1VNIGVycm9yIG9jY3VyZWQ6ICcgKyBlcnIpO1xuICAgICAgICB9XG4gICAgICApO1xuXG4gICAgfVxuXG4gICAgbWFzdGVyX2dhaW4gPSBjb250ZXh0LmNyZWF0ZUdhaW4oKVxuICAgIG1hc3Rlcl9nYWluLmdhaW4udmFsdWUgPSAwXG4gICAgbWFzdGVyX2dhaW4uY29ubmVjdChjb250ZXh0LmRlc3RpbmF0aW9uKVxuXG4gICAgTUVTU0FHRSA9IG9wdHMubWVzc2FnZVxuICAgIHR5cGUgPSBvcHRzLnR5cGVcblxuICAgIC8vIGNyZWF0ZSBvc2MgKyBnYWluIGJhbmtzXG4gICAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgbl9vc2M7IGlkeCsrKSB7XG5cbiAgICAgIHZhciBsb2NhbF9vc2MgPSBjb250ZXh0LmNyZWF0ZU9zY2lsbGF0b3IoKVxuICAgICAgbG9jYWxfb3NjLmZyZXF1ZW5jeS52YWx1ZSA9IChpZHggKiBzcHJlYWQpICsgaW5pdGlhbEZyZXFcblxuICAgICAgdmFyIGxvY2FsX2dhaW4gPSBjb250ZXh0LmNyZWF0ZUdhaW4oKVxuICAgICAgbG9jYWxfZ2Fpbi5nYWluLnZhbHVlID0gMS4wIC8gKG5fb3NjIC0gMSlcblxuICAgICAgLy8gdmFyIGxvY2FsX2ZpbHRlciA9IGNvbnRleHQuY3JlYXRlQmlxdWFkRmlsdGVyKClcbiAgICAgIC8vIGxvY2FsX2ZpbHRlci50eXBlID0gJ2JhbmRwYXNzJ1xuICAgICAgLy8gbG9jYWxfZmlsdGVyLmZyZXF1ZW5jeS52YWx1ZSA9IChpZHggKiBzcHJlYWQpICsgaW5pdGlhbEZyZXFcbiAgICAgIC8vIGxvY2FsX2ZpbHRlci5RLnZhbHVlID0gMS4wXG4gICAgICAvL1xuICAgICAgLy8gd2luZG93LmQgPSBsb2NhbF9maWx0ZXJcblxuICAgICAgbG9jYWxfb3NjLmNvbm5lY3QobG9jYWxfZ2FpbilcblxuICAgICAgLy8gbG9jYWxfZ2Fpbi5jb25uZWN0KGxvY2FsX2ZpbHRlcilcblxuICAgICAgbG9jYWxfZ2Fpbi5jb25uZWN0KGxvY2FsQW5hbHlzZXIpXG4gICAgICBsb2NhbF9nYWluLmNvbm5lY3QobWFzdGVyX2dhaW4pXG4gICAgICAgIC8vIGxvY2FsX2dhaW4uY29ubmVjdChjb250ZXh0LmRlc3RpbmF0aW9uKVxuXG4gICAgICBsb2NhbF9vc2Muc3RhcnQoMClcbiAgICAgICAgLy8gbG9jYWxfb3NjLm5vdGVPbigxMDApXG5cbiAgICAgIG9zY19iYW5rLnB1c2gobG9jYWxfb3NjKVxuICAgICAgZ2Fpbl9iYW5rLnB1c2gobG9jYWxfZ2FpbilcbiAgICAgICAgLy8gZmlsdGVyX2JhbmsucHVzaChsb2NhbF9maWx0ZXIpXG5cbiAgICB9XG5cbiAgICB2YXIgZmZ0U2l6ZSA9IDUxMlxuXG4gICAgYW5hbHlzZXIuZmZ0U2l6ZSA9IGZmdFNpemVcbiAgICBhbmFseXNlci5zbW9vdGhpbmdUaW1lQ29uc3RhbnQgPSAwXG4gICAgYnVmZmVyTGVuZ3RoID0gYW5hbHlzZXIuZnJlcXVlbmN5QmluQ291bnRcbiAgICBhbmFseXNlckRhdGFBcnJheSA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlckxlbmd0aClcblxuICAgIGxvY2FsQW5hbHlzZXIuZmZ0U2l6ZSA9IGZmdFNpemVcbiAgICBsb2NhbEFuYWx5c2VyLnNtb290aGluZ1RpbWVDb25zdGFudCA9IDBcbiAgICBsb2NhbEFuYWx5c2VyRGF0YUFycmF5ID0gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyTGVuZ3RoKVxuXG4gIH1cblxuICBmdW5jdGlvbiBjb25uZWN0KG90aGVyX2FnZW50KSB7XG5cbiAgICB2YXIgb3RoZXJfZ2Fpbl9iYW5rID0gb3RoZXJfYWdlbnQuZ2V0X2dhaW5fYmFuaygpXG5cbiAgICBvdGhlcl9nYWluX2JhbmsuZm9yRWFjaChmdW5jdGlvbiAoZ2Fpbk5vZGUpIHtcbiAgICAgIGdhaW5Ob2RlLmNvbm5lY3QoYW5hbHlzZXIpXG4gICAgfSlcblxuICAgIGdldEJ1ZmZlcigpXG5cbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdkb25lIGNvbm5lY3RpbmcnKVxuICAgICAgQ1VSUkVOVF9TVEFURSA9IDBcbiAgICB9LCAyMDApXG5cbiAgfVxuXG4gIGZ1bmN0aW9uIHNldF9tZXNzYWdlKG1zZykge1xuICAgIE1FU1NBR0UgPSBtc2dcbiAgICBNRVNTQUdFX0lEWCA9IDBcbiAgfVxuXG4gIGZ1bmN0aW9uIG5fY2hhbm5lbHMoKSB7XG4gICAgcmV0dXJuIG5fb3NjXG4gIH1cblxuXG4gIGZ1bmN0aW9uIGdldF9hbmFseXNlcigpIHtcbiAgICByZXR1cm4gYW5hbHlzZXJcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEJ1ZmZlcigpIHtcbiAgICBjb25zb2xlLmxvZygnZ2V0dGluZyBidWZmZXIgJyArIG5hbWUpXG4gICAgYW5hbHlzZXIuZ2V0Qnl0ZUZyZXF1ZW5jeURhdGEoYW5hbHlzZXJEYXRhQXJyYXkpXG4gICAgcmV0dXJuIGFuYWx5c2VyRGF0YUFycmF5XG4gIH1cblxuICBmdW5jdGlvbiBnZXRfZ2Fpbl9iYW5rKCkge1xuICAgIHJldHVybiBnYWluX2JhbmtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldF9ncm91cHMoKSB7XG4gICAgcmV0dXJuIGdyb3VwZWRfcGVha19yYW5nZXNcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldF9maWx0ZXJfYmFuaygpIHtcbiAgICByZXR1cm4gZmlsdGVyX2JhbmtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldF9sb2NhbF9mcmVxdWVuY3lfZGF0YV9idWZmZXIoKSB7XG4gICAgbG9jYWxBbmFseXNlci5nZXRCeXRlRnJlcXVlbmN5RGF0YShsb2NhbEFuYWx5c2VyRGF0YUFycmF5KVxuICAgIHJldHVybiBsb2NhbEFuYWx5c2VyRGF0YUFycmF5XG4gIH1cblxuXG4gIGZ1bmN0aW9uIHJlYWRfYnl0ZV9mcm9tX3NpZ25hbCgpIHtcblxuICAgIHZhciByYW5nZXMgPSB2YWxpZGF0ZV9yYW5nZXMoKVxuICAgICAgLy8gY29uc29sZS5sb2cocmFuZ2VzKVxuXG4gICAgdmFyIGJpbmFyeV9zdHJpbmcgPSAnJ1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgODsgaSsrKSB7XG4gICAgICBpZiAocmFuZ2VzW2ldKSB7XG4gICAgICAgIGJpbmFyeV9zdHJpbmcgKz0gJzEnXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBiaW5hcnlfc3RyaW5nICs9ICcwJ1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBwYXJzZUludChiaW5hcnlfc3RyaW5nLCAyKVxuXG4gIH1cblxuICBmdW5jdGlvbiByZWFkX2J5dGVfYXJyYXlfZnJvbV9zaWduYWwoYnl0ZV9jb3VudCkge1xuXG4gICAgdmFyIHJldHVybl9hcnJheSA9ICcnXG5cbiAgICB2YXIgcmFuZ2VzID0gdmFsaWRhdGVfcmFuZ2VzKClcblxuICAgIGZvciAodmFyIGJ5dGVfY291bnRfaWR4ID0gMDsgYnl0ZV9jb3VudF9pZHggPCBieXRlX2NvdW50OyBieXRlX2NvdW50X2lkeCsrKSB7XG5cbiAgICAgIHZhciBvZmZzZXQgPSAwXG4gICAgICBpZiAoYnl0ZV9jb3VudF9pZHggPiAwKSB7XG4gICAgICAgIG9mZnNldCArPSAyICsgKGJ5dGVfY291bnRfaWR4ICogOClcbiAgICAgIH1cblxuICAgICAgdmFyIGJpbmFyeV9zdHJpbmcgPSAnJ1xuICAgICAgZm9yICh2YXIgaSA9IDAgKyBvZmZzZXQ7IGkgPCA4ICsgb2Zmc2V0OyBpKyspIHtcbiAgICAgICAgaWYgKHJhbmdlc1tpXSkge1xuICAgICAgICAgIGJpbmFyeV9zdHJpbmcgKz0gJzEnXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYmluYXJ5X3N0cmluZyArPSAnMCdcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgYnl0ZSA9IHBhcnNlSW50KGJpbmFyeV9zdHJpbmcsIDIpXG4gICAgICByZXR1cm5fYXJyYXkgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlKVxuXG4gICAgfVxuXG4gICAgcmV0dXJuIHJldHVybl9hcnJheVxuXG4gIH1cblxuICBmdW5jdGlvbiByZWdpc3Rlcl9wZWFrX3JhbmdlcygpIHtcblxuICAgIGNvbnNvbGUubG9nKCdyZWdpc3RlcmluZyBwZWFrIHJhbmdlcyAnICsgbmFtZSlcblxuXG4gICAgZ2V0QnVmZmVyKClcbiAgICBjb25zb2xlLmxvZyhhbmFseXNlckRhdGFBcnJheSlcblxuICAgIGNvbnNvbGUubG9nKCdmaW5kaW5nIG1lYW4gb2YgYnVmZmVyJylcbiAgICAvLyBwdXNoIG9uIHRvIG5ldyBhcnJheSBmb3Igc29ydGluZ1xuICAgIHZhciBkID0gW11cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJ1ZmZlckxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoYW5hbHlzZXJEYXRhQXJyYXlbaV0gPiAwKSB7XG4gICAgICAgIGQucHVzaChhbmFseXNlckRhdGFBcnJheVtpXSlcbiAgICAgIH1cbiAgICB9XG4gICAgZC5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICByZXR1cm4gYSAtIGJcbiAgICB9KVxuICAgIGNvbnNvbGUubG9nKCdNZWFuOiAnICsgZFtNYXRoLmZsb29yKGQubGVuZ3RoIC8gMildKVxuXG4gICAgbWVhbiA9IGRbTWF0aC5mbG9vcihkLmxlbmd0aCAvIDIpXVxuXG4gICAgLy8gc2VhcmNoaW5nIHRocm91Z2ggdGhlIGJ1ZmZlclxuXG4gICAgcGVha19yYW5nZXMgPSBbXVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYnVmZmVyTGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChhbmFseXNlckRhdGFBcnJheVtpXSA+IG1lYW4pIHtcbiAgICAgICAgcGVha19yYW5nZXMucHVzaChpKVxuICAgICAgfVxuICAgIH1cblxuICAgIGdyb3VwX3BlYWtfcmFuZ2VzKClcblxuICB9XG5cbiAgZnVuY3Rpb24gY2hlY2tfcGVha19yYW5nZXMoKSB7XG5cbiAgICBnZXRCdWZmZXIoKVxuXG4gICAgdmFyIGhpdHMgPSBbXVxuICAgIHBlYWtfcmFuZ2VzLmZvckVhY2goZnVuY3Rpb24gKGRhdGFBcnJheV9pZHgpIHtcbiAgICAgIGlmIChhbmFseXNlckRhdGFBcnJheVtkYXRhQXJyYXlfaWR4XSA+IG1lYW4pIHtcbiAgICAgICAgaGl0cy5wdXNoKHRydWUpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBoaXRzLnB1c2goZmFsc2UpXG4gICAgICB9XG4gICAgfSlcblxuICAgIHJldHVybiBoaXRzXG5cbiAgfVxuXG4gIGZ1bmN0aW9uIGdyb3VwX3BlYWtfcmFuZ2VzKCkge1xuXG4gICAgaWYgKHBlYWtfcmFuZ2VzID09PSB1bmRlZmluZWQgfHwgcGVha19yYW5nZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGdyb3VwcyA9IFtdIC8vIFsgWzEsMiwzXSwgWzgsOSwxMF0sIFszMCwzMSwzMl0gIF1cblxuICAgIHZhciBjdXJyZW50X2dyb3VwX2lkeCA9IDBcblxuICAgIHZhciBsb2NhbF9ncm91cCA9IG5ldyBBcnJheSgpXG5cbiAgICBwZWFrX3Jhbmdlcy5mb3JFYWNoKGZ1bmN0aW9uIChwZWFrX2lkeCwgaWR4KSB7XG5cbiAgICAgIC8vIGlmIHRoZSBNYXRoLmFicyhwZWFrX2lkeCAtIHBlYWtfcmFuZ2VzW2lkeCsxXSkgPT09IDFcbiAgICAgIC8vICAgIHB1c2ggcGVha19pZHggb24gdG8gbG9jYWxfZ3JvdXBcbiAgICAgIC8vIGVsc2VcbiAgICAgIC8vICAgIHB1c2ggbG9jYWxfZ3JvdXAgb24gdG8gZ3JvdXBzXG4gICAgICAvLyAgICBjbGVhciBsb2NhbF9ncm91cFxuICAgICAgLy8gICAgcHVzaCBwZWFrX2lkeCBvbiB0byBsb2NhbF9ncm91cFxuXG4gICAgICBpZiAoaWR4ID09PSBwZWFrX3Jhbmdlcy5sZW5ndGggLSAxKSB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdoZXJlJylcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoTWF0aC5hYnMocGVha19pZHggLSBwZWFrX3Jhbmdlc1tpZHggKyAxXSkgPD0gMikge1xuICAgICAgICBsb2NhbF9ncm91cC5wdXNoKHBlYWtfaWR4KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9jYWxfZ3JvdXAucHVzaChwZWFrX2lkeClcbiAgICAgICAgZ3JvdXBzLnB1c2gobG9jYWxfZ3JvdXApXG4gICAgICAgIGxvY2FsX2dyb3VwID0gbmV3IEFycmF5KClcbiAgICAgIH1cblxuICAgIH0pXG5cbiAgICBncm91cHMucHVzaChsb2NhbF9ncm91cClcblxuICAgIGdyb3VwZWRfcGVha19yYW5nZXMgPSBncm91cHNcblxuICAgIHJldHVybiBncm91cHNcblxuICB9XG5cbiAgZnVuY3Rpb24gc2V0X2dhaW4oY2hhbm5lbCwgdmFsdWUpIHtcbiAgICBnYWluX2JhbmtbY2hhbm5lbF0uZ2Fpbi52YWx1ZSA9IHZhbHVlXG4gIH1cblxuICBmdW5jdGlvbiBzZXRfdm9sdW1lKHYpIHtcbiAgICBpZiAodiA+PSAxKSB7XG4gICAgICB2ID0gMS4wXG4gICAgfVxuICAgIG1hc3Rlcl9nYWluLmdhaW4udmFsdWUgPSB2XG4gIH1cblxuICBmdW5jdGlvbiB2YWxpZGF0ZV9yYW5nZXMoKSB7XG5cbiAgICBpZiAoZ3JvdXBlZF9wZWFrX3JhbmdlcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZ2V0QnVmZmVyKClcblxuICAgIHZhciB2YWxpZF9ncm91cHMgPSBbXVxuXG4gICAgZ3JvdXBlZF9wZWFrX3Jhbmdlcy5mb3JFYWNoKGZ1bmN0aW9uIChncm91cCkge1xuXG4gICAgICB2YXIgaGl0cyA9IDBcblxuICAgICAgZ3JvdXAuZm9yRWFjaChmdW5jdGlvbiAoaWR4KSB7XG4gICAgICAgIGlmIChhbmFseXNlckRhdGFBcnJheVtpZHhdID49IG1lYW4pIHtcbiAgICAgICAgICBoaXRzICs9IDFcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgaWYgKGhpdHMgPj0gZ3JvdXAubGVuZ3RoIC8gMikge1xuICAgICAgICB2YWxpZF9ncm91cHMucHVzaCh0cnVlKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFsaWRfZ3JvdXBzLnB1c2goZmFsc2UpXG4gICAgICB9XG5cbiAgICB9KVxuXG4gICAgcmV0dXJuIHZhbGlkX2dyb3Vwc1xuXG4gIH1cblxuICBmdW5jdGlvbiBlbmNvZGVfYnl0ZShieXRlKSB7XG5cbiAgICB2YXIgY2hhcnMgPSBnZXRfZW5jb2RlZF9ieXRlX2FycmF5KGJ5dGUpXG5cbiAgICAvLyBjb25zb2xlLmxvZyhjaGFycylcblxuICAgIGNoYXJzLmZvckVhY2goZnVuY3Rpb24gKGMsIGlkeCkge1xuICAgICAgaWYgKGMgPT09ICcwJykge1xuICAgICAgICBzZXRfZ2FpbihpZHgsIDApXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZXRfZ2FpbihpZHgsIDEgLyAobl9vc2MgLSAyKSlcbiAgICAgIH1cbiAgICB9KVxuXG4gIH1cblxuICBmdW5jdGlvbiBlbmNvZGVfc3RyaW5nKHN0cmluZykge1xuXG4gICAgdmFyIGJ5dGVzID0gc3RyaW5nLnNwbGl0KCcnKVxuICAgICAgLy8gY29uc29sZS5sb2coc3RyaW5nLGJ5dGVzKVxuXG4gICAgd2hpbGUgKGJ5dGVzLmxlbmd0aCA8IEJZVEVTX1RPX0VOQ09ERSkge1xuICAgICAgYnl0ZXMucHVzaCgnKycpXG4gICAgfVxuXG4gICAgTEFTVF9TRU5UX01FU1NBR0UgPSBDVVJSRU5UX0VOQ09ERURfTUVTU0FHRVxuICAgIENVUlJFTlRfRU5DT0RFRF9NRVNTQUdFID0gYnl0ZXMuam9pbignJylcblxuICAgIGJ5dGVzLmZvckVhY2goZnVuY3Rpb24gKGJ5dGUsIGJ5dGVfaWR4KSB7XG5cbiAgICAgIHZhciBvZmZzZXQgPSAoYnl0ZV9pZHggKiA4KSArIDJcbiAgICAgIGlmIChieXRlX2lkeCA9PT0gMCkge1xuICAgICAgICBvZmZzZXQgPSAwXG4gICAgICB9XG5cbiAgICAgIGJ5dGUgPSBieXRlLmNoYXJDb2RlQXQoMClcblxuICAgICAgdmFyIGNoYXJzID0gZ2V0X2VuY29kZWRfYnl0ZV9hcnJheShieXRlKVxuXG4gICAgICAvLyBjb25zb2xlLmxvZyhjaGFycylcblxuICAgICAgY2hhcnMuZm9yRWFjaChmdW5jdGlvbiAoYywgaWR4KSB7XG4gICAgICAgIGlmIChjID09PSAnMCcpIHtcbiAgICAgICAgICBzZXRfZ2FpbihpZHggKyBvZmZzZXQsIDApXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc2V0X2dhaW4oaWR4ICsgb2Zmc2V0LCAxIC8gbl9vc2MpXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICB9KVxuXG5cblxuICB9XG5cbiAgZnVuY3Rpb24gcGVyZm9ybV9zaWduYWxpbmcoKSB7XG4gICAgZmxpcF9mbG9wID0gIWZsaXBfZmxvcFxuICAgIGlmIChmbGlwX2Zsb3ApIHtcbiAgICAgIHNldF9nYWluKDgsIDEgLyBuX29zYylcbiAgICAgIHNldF9nYWluKDksIDApXG4gICAgfSBlbHNlIHtcbiAgICAgIHNldF9nYWluKDksIDEgLyBuX29zYylcbiAgICAgIHNldF9nYWluKDgsIDApXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0X2VuY29kZWRfYnl0ZV9hcnJheShieXRlKSB7XG4gICAgcmV0dXJuIHBhZChieXRlLnRvU3RyaW5nKDIpLCA4KS5zcGxpdCgnJylcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhZChuLCB3aWR0aCwgeikge1xuICAgIHogPSB6IHx8ICcwJztcbiAgICBuID0gbiArICcnO1xuICAgIHJldHVybiBuLmxlbmd0aCA+PSB3aWR0aCA/IG4gOiBuZXcgQXJyYXkod2lkdGggLSBuLmxlbmd0aCArIDEpLmpvaW4oeikgKyBuO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0X3N0YXRlKCkge1xuICAgIHJldHVybiB7XG4gICAgICBidWZmZXI6IGFuYWx5c2VyRGF0YUFycmF5LFxuICAgICAgLy8gbG9jYWxfYnVmZmVyOiBnZXRfbG9jYWxfZnJlcXVlbmN5X2RhdGFfYnVmZmVyKCksXG4gICAgICBSWF9CVUZGRVI6IFJYX0JVRkZFUixcbiAgICAgIENVUlJFTlRfU1RBVEU6IENVUlJFTlRfU1RBVEUsXG4gICAgICBTWU5DX0NPVU5UOiBTWU5DX0NPVU5ULFxuICAgICAgTUVTU0FHRTogTUVTU0FHRSxcbiAgICAgIE1FU1NBR0VfSURYOiBNRVNTQUdFX0lEWCxcbiAgICAgIENPTk5FQ1RFRF9BVDogQ09OTkVDVEVEX0FULFxuICAgICAgQ1VSUkVOVF9FTkNPREVEX01FU1NBR0U6IENVUlJFTlRfRU5DT0RFRF9NRVNTQUdFLFxuICAgICAgTEFTVF9TRU5UX01FU1NBR0U6IExBU1RfU0VOVF9NRVNTQUdFLFxuICAgICAgTEFURVNUX1JYX0JMT0I6IExBVEVTVF9SWF9CTE9CLFxuICAgICAgUFJFVl9SWF9CTE9COiBQUkVWX1JYX0JMT0JcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZXNldF9iYXVkX2NvdW50KCkge1xuICAgIFJYX0JVRkZFUiA9ICcnXG4gICAgQ09OTkVDVEVEX0FUID0gRGF0ZS5ub3coKVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBjaGVja19wZWFrX3JhbmdlczogY2hlY2tfcGVha19yYW5nZXMsXG4gICAgY29ubmVjdDogY29ubmVjdCxcbiAgICBlbmNvZGVfcmFuZ2U6IGVuY29kZV9ieXRlLFxuICAgIGdldEJ1ZmZlcjogZ2V0QnVmZmVyLFxuICAgIGdldF9hbmFseXNlcjogZ2V0X2FuYWx5c2VyLFxuICAgIGdldF9lbmNvZGVkX2J5dGVfYXJyYXk6IGdldF9lbmNvZGVkX2J5dGVfYXJyYXksXG4gICAgZ2V0X29zY19iYW5rOiBnZXRfb3NjX2JhbmssXG4gICAgZ2V0X2ZpbHRlcl9iYW5rOiBnZXRfZmlsdGVyX2JhbmssXG4gICAgZ2V0X2dhaW5fYmFuazogZ2V0X2dhaW5fYmFuayxcbiAgICBnZXRfZ3JvdXBzOiBnZXRfZ3JvdXBzLFxuICAgIGdldF9sb2NhbF9mcmVxdWVuY3lfZGF0YV9idWZmZXI6IGdldF9sb2NhbF9mcmVxdWVuY3lfZGF0YV9idWZmZXIsXG4gICAgZ2V0X3N0YXRlOiBnZXRfc3RhdGUsXG4gICAgZ3JvdXBfcGVha19yYW5nZXM6IGdyb3VwX3BlYWtfcmFuZ2VzLFxuICAgIGluaXQ6IGluaXQsXG4gICAgbl9jaGFubmVsczogbl9jaGFubmVscyxcbiAgICBzZXRfZ2Fpbjogc2V0X2dhaW4sXG4gICAgc2V0X21lc3NhZ2U6IHNldF9tZXNzYWdlLFxuICAgIHNldF92b2x1bWU6IHNldF92b2x1bWUsXG4gICAgcmVhZF9ieXRlX2Zyb21fc2lnbmFsOiByZWFkX2J5dGVfZnJvbV9zaWduYWwsXG4gICAgcmVzZXRfYmF1ZF9jb3VudDogcmVzZXRfYmF1ZF9jb3VudCxcbiAgICB0aWNrOiB0aWNrLFxuICAgIHZhbGlkYXRlX3JhbmdlczogdmFsaWRhdGVfcmFuZ2VzLFxuICAgIHBlcmZvcm1fc2lnbmFsaW5nOiBwZXJmb3JtX3NpZ25hbGluZ1xuICB9O1xuXG59XG4iLCJ3aW5kb3cub25sb2FkID0gZnVuY3Rpb24gKCkge1xuXG4gIHdpbmRvdy5jb25zb2xlLnRpbWUgPSBmdW5jdGlvbiAoKSB7fTtcbiAgd2luZG93LmNvbnNvbGUudGltZUVuZCA9IGZ1bmN0aW9uICgpIHt9O1xuICAvLyB3aW5kb3cuY29uc29sZS5sb2cgPSBmdW5jdGlvbigpe307XG5cbiAgdmFyIERPX0RSQVcgPSB0cnVlXG4gIHdpbmRvdy5CQVVEX1JBVEUgPSAzMDBcblxuICBpZiAod2luZG93LnNjcmVlbi53aWR0aCA8IDQwMCkge1xuICAgIGQzLnNlbGVjdCgnZGl2I21vYmlsZV9iZWdpbicpLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIEJBVURfUkFURSA9IDMwMFxuICAgICAgZDMuc2VsZWN0KHRoaXMpLnN0eWxlKCdkaXNwbGF5JywgJ25vbmUnKVxuICAgICAgaW5pdF9yb3V0aW5lKClcbiAgICB9KVxuICB9IGVsc2Uge1xuICAgIEJBVURfUkFURSA9IDEwMFxuICAgIGQzLnNlbGVjdCgnZGl2I21vYmlsZV9iZWdpbicpLnJlbW92ZSgpXG4gICAgaW5pdF9yb3V0aW5lKClcbiAgfVxuXG4gIGZ1bmN0aW9uIGluaXRfcm91dGluZSgpIHtcblxuICAgIHZhciB1ZHBfbW9kZSA9IHRydWVcblxuICAgIGNvbnNvbGUubG9nKCdtYWluLmpzIC8gaW5pdF9yb3V0aW5lKCknKVxuXG4gICAgdmFyIHBhcmVudF9iYXVkX3JhdGUgPSBkMy5zZWxlY3QoJ2RpdiNiYXVkX3JhdGUnKS5hcHBlbmQoJ2RpdicpLmF0dHIoJ2NsYXNzJywgJ2NvbC1tZC04IGNvbC1tZC1vZmZzZXQtMicpXG5cbiAgICBwYXJlbnRfYmF1ZF9yYXRlLmFwcGVuZCgnaDQnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlcicpLmh0bWwoJ21vZGVtIHNwZWVkJylcbiAgICB2YXIgYmF1ZF9zY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpLmRvbWFpbihbMTAwLCAwXSkucmFuZ2UoW0JBVURfUkFURSAvIDMuNSwgQkFVRF9SQVRFICogMTBdKVxuICAgIHZhciBiYXVkX3NsaWRlciA9IHBhcmVudF9iYXVkX3JhdGUuYXBwZW5kKCdpbnB1dCcpLmF0dHIoJ3R5cGUnLCAncmFuZ2UnKVxuICAgICAgLmF0dHIoJ21pbicsIDAuMClcbiAgICAgIC5hdHRyKCdtYXgnLCAxMDAuMClcbiAgICAgIC5hdHRyKCd2YWx1ZScsIGJhdWRfc2NhbGUuaW52ZXJ0KEJBVURfUkFURSkpXG5cbiAgICBiYXVkX3NsaWRlci5vbignaW5wdXQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAvLyBjb25zb2xlLmxvZyhkMy5ldmVudClcbiAgICAgIHZhciB2ID0gZDMuc2VsZWN0KHRoaXMpLm5vZGUoKS52YWx1ZVxuXG4gICAgICBjb25zb2xlLmxvZyh2KVxuXG4gICAgICBCQVVEX1JBVEUgPSBiYXVkX3NjYWxlKHYpXG5cbiAgICAgIHdpbmRvdy5hbGljZS5yZXNldF9iYXVkX2NvdW50KClcbiAgICAgIHdpbmRvdy5ib2IucmVzZXRfYmF1ZF9jb3VudCgpXG5cbiAgICB9KVxuXG4gICAgdmFyIG1lc3NhZ2VfdG9fc2VuZCA9ICcwOTg3NjU0MzIxLS10ZXN0aW5nLS0xMjM0NTY3ODkwLS0hIS0tYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXonXG4gICAgICAvLyBtZXNzYWdlX3RvX3NlbmQgPSAnMDEyMzQ1NjcnXG4gICAgdmFyIG91dHB1dF9tc2cgPSAnJ1xuXG4gICAgdmFyIEFnZW50ID0gcmVxdWlyZSgnLi9hZ2VudC5qcycpXG4gICAgdmFyIFZpZXdfQ29udHJvbGxlciA9IHJlcXVpcmUoJy4vdmlld19jb250cm9sbGVyLmpzJylcblxuICAgIHdpbmRvdy5hbGljZSA9IEFnZW50LmFnZW50KClcbiAgICBhbGljZS5pbml0KHtcbiAgICAgIG5hbWU6ICdhbGljZScsXG4gICAgICB0eXBlOiAnY2xpZW50JyxcbiAgICAgIG1lc3NhZ2U6ICdJIGFtIGFsaWNlIGxpc3RlbiB0byBtZSBzZW5kIGRhdGEgdXNpbmcgd2ViIGF1ZGlvIGFwaS4nXG4gICAgfSlcblxuICAgIHdpbmRvdy5ib2IgPSBBZ2VudC5hZ2VudCgpXG4gICAgYm9iLmluaXQoe1xuICAgICAgbmFtZTogJ2JvYicsXG4gICAgICB0eXBlOiAnc2VydmVyJyxcbiAgICAgIG1lc3NhZ2U6ICdUaGlzIGJlIGJvYiwgbGlzdGVuIHRvIE1FIHNlbmQgZGF0YSB1c2luZyB0aGUgd2ViIGF1ZGlvIGFwaS4nXG4gICAgfSlcblxuXG4gICAgdmFyIGRpc3BsYXlfYm9iID0gVmlld19Db250cm9sbGVyLnZpZXdfY29udHJvbGxlcignYm9iX21vZGVtJylcbiAgICBkaXNwbGF5X2JvYi5jb25uZWN0KGJvYilcblxuICAgIHZhciBkaXNwbGF5X2FsaWNlID0gVmlld19Db250cm9sbGVyLnZpZXdfY29udHJvbGxlcignYWxpY2VfbW9kZW0nKVxuICAgIGRpc3BsYXlfYWxpY2UuY29ubmVjdChhbGljZSlcblxuXG4gICAgYWxpY2UuY29ubmVjdChib2IpXG4gICAgYm9iLmNvbm5lY3QoYWxpY2UpXG5cbiAgICBzZXRUaW1lb3V0KGRyYXcsIDUwMClcblxuICAgIGZ1bmN0aW9uIGRyYXcoKSB7XG5cbiAgICAgIGNvbnNvbGUubG9nKCd0aWNrJylcblxuXG4gICAgICAgIGNvbnNvbGUudGltZSgndGVzdCcpXG4gICAgICAgIGFsaWNlLnRpY2soKVxuICAgICAgICBib2IudGljaygpXG4gICAgICAgIGNvbnNvbGUudGltZUVuZCgndGVzdCcpXG5cbiAgICAgIGNvbnNvbGUubG9nKCdkcmF3JylcblxuICAgICAgICBkaXNwbGF5X2FsaWNlLnRpY2soRE9fRFJBVylcbiAgICAgICAgZGlzcGxheV9ib2IudGljayhET19EUkFXKVxuXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGJvYi5nZXRfc3RhdGUoKS5MQVRFU1RfUlhfQkxPQiwgYWxpY2UuZ2V0X3N0YXRlKCkuTEFTVF9TRU5UX01FU1NBR0UgKVxuXG4gICAgICAgIHZhciBhbGljZV9zdGF0ZSA9IGFsaWNlLmdldF9zdGF0ZSgpXG4gICAgICAgIHZhciBib2Jfc3RhdGUgPSBib2IuZ2V0X3N0YXRlKClcblxuICAgICAgICAvLyBjb25zb2xlLmxvZyhib2Jfc3RhdGUuTEFURVNUX1JYX0JMT0IubGVuZ3RoLCBhbGljZV9zdGF0ZS5MQVNUX1NFTlRfTUVTU0FHRS5sZW5ndGgpXG5cblxuICAgICAgICBpZiAoKGJvYl9zdGF0ZS5MQVRFU1RfUlhfQkxPQi5sZW5ndGggIT09IGFsaWNlX3N0YXRlLkxBU1RfU0VOVF9NRVNTQUdFLmxlbmd0aCkgfHwgKGJvYl9zdGF0ZS5MQVRFU1RfUlhfQkxPQiA9PT0gYWxpY2Vfc3RhdGUuTEFTVF9TRU5UX01FU1NBR0UpKSB7XG4gICAgICAgICAgLy8gaWYoYm9iX3N0YXRlLkxBVEVTVF9SWF9CTE9CID09PSBhbGljZV9zdGF0ZS5MQVNUX1NFTlRfTUVTU0FHRSl7XG4gICAgICAgICAgc2V0VGltZW91dChkcmF3LCBCQVVEX1JBVEUpXG4gICAgICAgICAgICAvLyB9IGVsc2Uge1xuXG4gICAgICAgICAgLy8gfVxuICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgY29uc29sZS5sb2coYm9iX3N0YXRlLkxBVEVTVF9SWF9CTE9CLCBhbGljZV9zdGF0ZS5MQVNUX1NFTlRfTUVTU0FHRSlcbiAgICAgICAgICBjb25zb2xlLmxvZygnZXJyJylcblxuICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy9ib2IucGVyZm9ybV9zaWduYWxpbmcoKVxuICAgICAgICAgICAgc2V0VGltZW91dChkcmF3LCBCQVVEX1JBVEUgKiAyKVxuICAgICAgICAgIH0pXG5cblxuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGRyYXcpO1xuICB9XG5cblxufVxuIiwibW9kdWxlLmV4cG9ydHMudmlld19jb250cm9sbGVyID0gdmlld19jb250cm9sbGVyXG5cbmZ1bmN0aW9uIHZpZXdfY29udHJvbGxlcihkaXZfaWQpIHtcblxuICBcInVzZSBzdHJpY3RcIjtcblxuICB2YXIgbmFtZSA9IGRpdl9pZFxuXG4gIHZhciBhZ2VudFxuICB2YXIgcGFyZW50ID0gZDMuc2VsZWN0KCdkaXYjJyArIGRpdl9pZClcblxuICAvLyBkaXNwbGF5XG4gIC8vICAgIGN1cnJlbnQgc3RhdGVcbiAgLy8gICAgc3luYyBjb3VudFxuICAvLyAgICBvc2NpbGxvc2NvcGUgb2Ygb3V0cHV0ICYgaW5wdXRcbiAgLy8gICAgZmZ0IGJhcnMgb2Ygb3V0cHV0ICYgaW5wdXRcbiAgLy8gICAgY3VycmVudCBiYXVkXG4gIC8vICAgIHJ4IGJ1ZmZlclxuXG4gIHZhciBzdmdcbiAgdmFyIGRpdl9zeW5jX2NvdW50XG4gIHZhciBzeW5jX2luZGljYXRvclxuICB2YXIgZGl2X3J4X2J1ZmZlclxuICB2YXIgZGl2X2JhdWRfbWV0ZXJcbiAgdmFyIGJhcnMgPSBbXVxuXG4gIHZhciBXSURUSCA9IDEwMjRcbiAgdmFyIEhFSUdIVCA9IDI1NlxuXG4gIHZhciBiYXJXaWR0aFxuICB2YXIgYnVmZmVyTGVuZ3RoXG5cbiAgLy8gY3JlYXRlIHN2Z1xuICBmdW5jdGlvbiBzZXR1cF9zdmcoKSB7XG5cbiAgICB2YXIgc3RhdGUgPSBhZ2VudC5nZXRfc3RhdGUoKVxuXG4gICAgV0lEVEggPSBidWZmZXJMZW5ndGhcbiAgICBIRUlHSFQgPSBXSURUSCAvIDRcblxuICAgIGJhcldpZHRoID0gKFdJRFRIIC8gYnVmZmVyTGVuZ3RoKVxuXG4gICAgcGFyZW50LmFwcGVuZCgnaDEnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlcicpLmh0bWwobmFtZSlcblxuICAgIHN2ZyA9IHBhcmVudC5hcHBlbmQoJ3N2ZycpXG4gICAgICAuYXR0cignY2xhc3MnLCAnaW1nLXJlc3BvbnNpdmUnKVxuICAgICAgLmF0dHIoJ3dpZHRoJywgJzEwMCUnKVxuICAgICAgLy8gLmF0dHIoJ2hlaWdodCcsIEhFSUdIVClcbiAgICAgIC5hdHRyKCdwcmVzZXJ2ZUFzcGVjdFJhdGlvJywgJ3hNaWRZTWlkJylcbiAgICAgIC5hdHRyKCd2aWV3Qm94JywgJzAgMCAnICsgV0lEVEggKyAnICcgKyBIRUlHSFQpXG4gICAgICAuc3R5bGUoJ2JhY2tncm91bmQtY29sb3InLCAncmdiYSgwLDAsMCwwLjEpJylcblxuICAgIHN2Zy5hcHBlbmQoJ3RleHQnKVxuICAgICAgLnRleHQoJ3JlY2VpdmVyIHNwZWN0cnVtJylcbiAgICAgIC5hdHRyKCd4JywgV0lEVEgpXG4gICAgICAuYXR0cigneScsIDEyKVxuICAgICAgLmF0dHIoJ2R4JywgJy00cHgnKVxuICAgICAgLnN0eWxlKCdmb250LXNpemUnLCAxMilcbiAgICAgIC5zdHlsZSgndGV4dC1hbmNob3InLCAnZW5kJylcbiAgICAgIC5hdHRyKCdmaWxsJywgJ3JnYmEoMCwwLDAsMC4xKScpXG5cblxuICAgIGJhcnMgPSBbXVxuICAgIGZvciAodmFyIHN2Z2JhcnMgPSAwOyBzdmdiYXJzIDwgYnVmZmVyTGVuZ3RoOyBzdmdiYXJzKyspIHtcbiAgICAgIHZhciBiYXIgPSBzdmcuYXBwZW5kKCdyZWN0JylcbiAgICAgICAgLmF0dHIoJ3gnLCBiYXJXaWR0aCAqIHN2Z2JhcnMpXG4gICAgICAgIC5hdHRyKCd5JywgMClcbiAgICAgICAgLmF0dHIoJ3dpZHRoJywgYmFyV2lkdGgpXG4gICAgICAgIC5hdHRyKCdoZWlnaHQnLCAwKVxuICAgICAgICAuYXR0cignZmlsbCcsICdncmVlbicpXG4gICAgICAgIC5hdHRyKCdzdHJva2UnLCAnbm9uZScpXG5cbiAgICAgIHZhciBiYXJfaWR4ID0gc3ZnYmFyc1xuICAgICAgYmFyLm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGJhcl9pZHgpXG4gICAgICB9KVxuXG4gICAgICBiYXJzLnB1c2goYmFyKVxuICAgIH1cblxuICAgIC8vIHN5bmMgY291bnRcbiAgICBkaXZfc3luY19jb3VudCA9IHBhcmVudC5hcHBlbmQoJ2RpdicpXG4gICAgICAuYXR0cignY2xhc3MnLCAnY29sLW1kLTQnKVxuICAgICAgLnN0eWxlKCdvdXRsaW5lJywgJzFweCBkb3R0ZWQgcmdiYSgwLDAsMCwwLjEpJylcblxuICAgIGRpdl9zeW5jX2NvdW50LmFwcGVuZCgnaDQnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlcicpLmh0bWwoJ3N5bmNocm9uaXphdGlvbiBjb3VudHMnKVxuICAgIHN5bmNfaW5kaWNhdG9yID0gZGl2X3N5bmNfY291bnQuYXBwZW5kKCdkaXYnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlciBzeW5jX2NvdW50JylcblxuICAgIC8vIGJhdWQgbWV0ZXJcbiAgICB2YXIgcGFyZW50X2JhdWRfbWV0ZXIgPSBwYXJlbnQuYXBwZW5kKCdkaXYnKS5hdHRyKCdjbGFzcycsICdjb2wtbWQtNCcpXG4gICAgICAuc3R5bGUoJ291dGxpbmUnLCAnMXB4IGRvdHRlZCByZ2JhKDAsMCwwLDAuMSknKVxuXG4gICAgcGFyZW50X2JhdWRfbWV0ZXIuYXBwZW5kKCdoNCcpLmF0dHIoJ2NsYXNzJywgJ3RleHQtY2VudGVyJykuaHRtbCgnYmF1ZCcpXG4gICAgZGl2X2JhdWRfbWV0ZXIgPSBwYXJlbnRfYmF1ZF9tZXRlci5hcHBlbmQoJ2RpdicpLmF0dHIoJ2NsYXNzJywgJ3RleHQtY2VudGVyJylcblxuXG4gICAgdmFyIHBhcmVudF9pbnB1dF9zbGlkZXIgPSBwYXJlbnQuYXBwZW5kKCdkaXYnKS5hdHRyKCdjbGFzcycsICdjb2wtbWQtNCcpXG5cbiAgICBwYXJlbnRfaW5wdXRfc2xpZGVyLmFwcGVuZCgnaDQnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlcicpLmh0bWwoJ3RyYW5zbWl0dGVyIHZvbHVtZScpXG5cbiAgICB2YXIgc2xpZGVyX2l0c2VsZiA9IHBhcmVudF9pbnB1dF9zbGlkZXIuYXBwZW5kKCdpbnB1dCcpLmF0dHIoJ3R5cGUnLCAncmFuZ2UnKVxuICAgICAgLmF0dHIoJ21pbicsIDAuMClcbiAgICAgIC5hdHRyKCdtYXgnLCAxMDAuMClcbiAgICAgIC5hdHRyKCd2YWx1ZScsIDAuMClcblxuICAgIHNsaWRlcl9pdHNlbGYub24oJ2lucHV0JywgZnVuY3Rpb24gKCkge1xuICAgICAgLy8gY29uc29sZS5sb2coZDMuZXZlbnQpXG4gICAgICB2YXIgdiA9IGQzLnNlbGVjdCh0aGlzKS5ub2RlKCkudmFsdWVcbiAgICAgIGFnZW50LnNldF92b2x1bWUodiAvIDEwMC4wKVxuICAgIH0pXG5cbiAgICAvLyBtZXNzYWdlIHRvIHNlbmRcbiAgICB2YXIgcGFyZW50X21lc3NhZ2VfdG9fc2VuZCA9IHBhcmVudC5hcHBlbmQoJ2RpdicpLmF0dHIoJ2NsYXNzJywgJ2NvbC1tZC0xMicpXG5cbiAgICBwYXJlbnRfbWVzc2FnZV90b19zZW5kLmFwcGVuZCgnaDQnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlcicpLmh0bWwoJ3NlbmRpbmcgdGhpcyBtZXNzYWdlJylcblxuICAgIHZhciBpbnB1dF9maWVsZCA9IHBhcmVudF9tZXNzYWdlX3RvX3NlbmQuYXBwZW5kKCdpbnB1dCcpXG4gICAgICAuYXR0cigndHlwZScsICd0ZXh0JylcbiAgICAgIC5hdHRyKCdjbGFzcycsICdtc2dfaW5wdXQnKVxuXG4gICAgaW5wdXRfZmllbGQubm9kZSgpLnZhbHVlID0gc3RhdGUuTUVTU0FHRVxuXG4gICAgaW5wdXRfZmllbGQub24oJ2tleXVwJywgZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHYgPSBpbnB1dF9maWVsZC5ub2RlKCkudmFsdWVcbiAgICAgIGlmICh2ID09PSAnJykge1xuICAgICAgICB2ID0gJyAnXG4gICAgICB9XG5cbiAgICAgIGFnZW50LnNldF9tZXNzYWdlKHYpXG4gICAgfSlcblxuICAgIC8vIHJ4IGJ1ZmZlclxuICAgIHZhciBkaXZfcnhfYnVmZmVyX3BhcmVudCA9IHBhcmVudC5hcHBlbmQoJ2RpdicpXG4gICAgICAuYXR0cignY2xhc3MnLCAnY29sLW1kLTEyJylcblxuICAgIGRpdl9yeF9idWZmZXJfcGFyZW50LmFwcGVuZCgnaDQnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlcicpLmh0bWwoJ3J4IGJ1ZmZlcicpXG5cbiAgICBkaXZfcnhfYnVmZmVyID0gZGl2X3J4X2J1ZmZlcl9wYXJlbnQuYXBwZW5kKCdwcmUnKS5hdHRyKCdjbGFzcycsICdyeF9idWZmZXInKVxuXG5cblxuICAgIC8vXG5cbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbm5lY3QocmVtb3RlX2FnZW50KSB7XG4gICAgYWdlbnQgPSByZW1vdGVfYWdlbnRcbiAgICBidWZmZXJMZW5ndGggPSByZW1vdGVfYWdlbnQuZ2V0X3N0YXRlKCkuYnVmZmVyLmxlbmd0aFxuICB9XG5cbiAgZnVuY3Rpb24gdGljayhkcmF3X2JhcnMpIHtcblxuICAgIGlmIChiYXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgc2V0dXBfc3ZnKClcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZygnZ2V0dGluZyBzdGF0ZScpXG4gICAgdmFyIHN0YXRlID0gYWdlbnQuZ2V0X3N0YXRlKClcblxuICAgIGlmIChkcmF3X2JhcnMgPT09IHRydWUpIHtcbiAgICAgIHZhciBkYXRhQXJyYXkgPSBzdGF0ZS5idWZmZXJcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBidWZmZXJMZW5ndGg7IGkrKykge1xuICAgICAgICBiYXJzW2ldLmF0dHIoJ2hlaWdodCcsIChkYXRhQXJyYXlbaV0gLyAyNTUpICogSEVJR0hUKVxuICAgICAgfVxuXG4gICAgfVxuXG4gICAgc3luY19pbmRpY2F0b3IuaHRtbChzdGF0ZS5TWU5DX0NPVU5UKVxuICAgIGRpdl9yeF9idWZmZXIuaHRtbChzdGF0ZS5SWF9CVUZGRVIpXG5cbiAgICB2YXIgYmF1ZCA9IDggKiAoc3RhdGUuUlhfQlVGRkVSLmxlbmd0aCAvICgoRGF0ZS5ub3coKSAtIHN0YXRlLkNPTk5FQ1RFRF9BVCkgLyAxMDAwLjApKVxuICAgIGRpdl9iYXVkX21ldGVyLmh0bWwoYmF1ZC50b0ZpeGVkKDIpKVxuXG4gIH1cblxuICByZXR1cm4ge1xuICAgIHRpY2s6IHRpY2ssXG4gICAgY29ubmVjdDogY29ubmVjdFxuICB9XG5cbn1cbiJdfQ==
