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
