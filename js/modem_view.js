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

    bufferLength = agent.get_interfaces().dft_size/2

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
    // div_sync_count = parent.append('div')
    //   .attr('class', 'col-md-4')
    //   .style('outline', '1px dotted rgba(0,0,0,0.1)')
    //
    // div_sync_count.append('h4').attr('class', 'text-center').html('synchronization counts')
    // sync_indicator = div_sync_count.append('div').attr('class', 'text-center sync_count')
    //
    // // baud meter
    // var parent_baud_meter = parent.append('div').attr('class', 'col-md-4')
    //   .style('outline', '1px dotted rgba(0,0,0,0.1)')
    //
    // parent_baud_meter.append('h4').attr('class', 'text-center').html('baud')
    // div_baud_meter = parent_baud_meter.append('div').attr('class', 'text-center')
    //
    //
    // var parent_input_slider = parent.append('div').attr('class', 'col-md-4')
    //
    // parent_input_slider.append('h4').attr('class', 'text-center').html('transmitter volume')
    //
    // var slider_itself = parent_input_slider.append('input').attr('type', 'range')
    //   .attr('min', 0.0)
    //   .attr('max', 100.0)
    //   .attr('value', 0.0)
    //
    // slider_itself.on('input', function () {
    //   // console.log(d3.event)
    //   var v = d3.select(this).node().value
    //   agent.set_volume(v / 100.0)
    // })
    //
    // // message to send
    // var parent_message_to_send = parent.append('div').attr('class', 'col-md-12')
    //
    // parent_message_to_send.append('h4').attr('class', 'text-center').html('sending this message')
    //
    // var input_field = parent_message_to_send.append('input')
    //   .attr('type', 'text')
    //   .attr('class', 'msg_input')
    //
    // // input_field.node().value = state.MESSAGE
    //
    // input_field.on('keyup', function () {
    //   var v = input_field.node().value
    //   if (v === '') {
    //     v = ' '
    //   }
    //
    //   agent.set_message(v)
    // })
    //
    // // rx buffer
    // var div_rx_buffer_parent = parent.append('div')
    //   .attr('class', 'col-md-12')
    //
    // div_rx_buffer_parent.append('h4').attr('class', 'text-center').html('rx buffer')
    //
    // div_rx_buffer = div_rx_buffer_parent.append('pre').attr('class', 'rx_buffer')

  }

  function connect(remote_agent) {
    agent = remote_agent
    other_buffers = remote_agent.get_buffers()
    bufferLength = other_buffers.time.length
  }

  function tick(draw_bars) {

    if (draw_bars === true) {
      // var dataArray = other_buffers.freq
      var dataArray = agent.get_interfaces().dft.spectrum
      // console.log(dataArray.length)
      //return;
//      var dataArrayT = other_buffers.time

      // for (var i = 0; i < bufferLength; i++) {
      for (var i = 0; i < dataArray.length; i++) {
        bars[i].attr('height', (dataArray[i] * 16) * HEIGHT + 10)
      }
      //
      // for (var i = 0; i < bufferLength; i++) {
      //   circles[i].attr('cy', (dataArrayT[i] / 255) * HEIGHT)
      // }

    }

  }

  return {
    setup_svg: setup_svg,
    tick: tick,
    connect: connect
  }

}
