(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
window.onload = function () {
  //
  // window.console.time = function () {};
  // window.console.timeEnd = function () {};
  // // window.console.log = function(){};
  //
  // var DO_DRAW = true
  // window.BAUD_RATE = 300
  //
  // if (window.screen.width < 400) {
  //   d3.select('div#mobile_begin').on('click', function () {
  //     BAUD_RATE = 300
  //     d3.select(this).style('display', 'none')
  //     init_routine()
  //   })
  // } else {
  //   BAUD_RATE = 100
  //   d3.select('div#mobile_begin').remove()
  //   init_routine()
  // }
  //
  // function init_routine() {
  //
  //   var udp_mode = true
  //
  //   console.log('main.js / init_routine()')
  //
  //   var parent_baud_rate = d3.select('div#baud_rate').append('div').attr('class', 'col-md-8 col-md-offset-2')
  //
  //   parent_baud_rate.append('h4').attr('class', 'text-center').html('modem speed')
  //   var baud_scale = d3.scale.linear().domain([100, 0]).range([BAUD_RATE / 3.5, BAUD_RATE * 10])
  //   var baud_slider = parent_baud_rate.append('input').attr('type', 'range')
  //     .attr('min', 0.0)
  //     .attr('max', 100.0)
  //     .attr('value', baud_scale.invert(BAUD_RATE))
  //
  //   baud_slider.on('input', function () {
  //     // console.log(d3.event)
  //     var v = d3.select(this).node().value
  //
  //     console.log(v)
  //
  //     BAUD_RATE = baud_scale(v)
  //
  //     window.alice.reset_baud_count()
  //     window.bob.reset_baud_count()
  //
  //   })
  //
  //   var message_to_send = '0987654321--testing--1234567890--!!--abcdefghijklmnopqrstuvwxyz'
  //     // message_to_send = '01234567'
  //   var output_msg = ''
  //
  //   var Agent = require('./agent.js')
  //   var View_Controller = require('./view_controller.js')
  //
  //   window.alice = Agent.agent()
  //   alice.init({
  //     name: 'alice',
  //     type: 'client',
  //     message: 'I am alice listen to me send data using web audio api.'
  //   })
  //
  //   window.bob = Agent.agent()
  //   bob.init({
  //     name: 'bob',
  //     type: 'server',
  //     message: 'This be bob, listen to ME send data using the web audio api.'
  //   })
  //
  //
  //   var display_bob = View_Controller.view_controller('bob_modem')
  //   display_bob.connect(bob)
  //
  //   var display_alice = View_Controller.view_controller('alice_modem')
  //   display_alice.connect(alice)
  //
  //
  //   alice.connect(bob)
  //   bob.connect(alice)
  //
  //   setTimeout(draw, 500)
  //
  //   function draw() {
  //
  //     console.log('tick')
  //
  //
  //       console.time('test')
  //       alice.tick()
  //       bob.tick()
  //       console.timeEnd('test')
  //
  //     console.log('draw')
  //
  //       display_alice.tick(DO_DRAW)
  //       display_bob.tick(DO_DRAW)
  //
  //       // console.log(bob.get_state().LATEST_RX_BLOB, alice.get_state().LAST_SENT_MESSAGE )
  //
  //       var alice_state = alice.get_state()
  //       var bob_state = bob.get_state()
  //
  //       // console.log(bob_state.LATEST_RX_BLOB.length, alice_state.LAST_SENT_MESSAGE.length)
  //
  //
  //       if ((bob_state.LATEST_RX_BLOB.length !== alice_state.LAST_SENT_MESSAGE.length) || (bob_state.LATEST_RX_BLOB === alice_state.LAST_SENT_MESSAGE)) {
  //         // if(bob_state.LATEST_RX_BLOB === alice_state.LAST_SENT_MESSAGE){
  //         setTimeout(draw, BAUD_RATE)
  //           // } else {
  //
  //         // }
  //       } else {
  //
  //         console.log(bob_state.LATEST_RX_BLOB, alice_state.LAST_SENT_MESSAGE)
  //         console.log('err')
  //
  //         setTimeout(function () {
  //           //bob.perform_signaling()
  //           setTimeout(draw, BAUD_RATE * 2)
  //         })
  //
  //
  //       }
  //     }
  //     // window.requestAnimationFrame(draw);
  // }


}

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ3aW5kb3cub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAvL1xuICAvLyB3aW5kb3cuY29uc29sZS50aW1lID0gZnVuY3Rpb24gKCkge307XG4gIC8vIHdpbmRvdy5jb25zb2xlLnRpbWVFbmQgPSBmdW5jdGlvbiAoKSB7fTtcbiAgLy8gLy8gd2luZG93LmNvbnNvbGUubG9nID0gZnVuY3Rpb24oKXt9O1xuICAvL1xuICAvLyB2YXIgRE9fRFJBVyA9IHRydWVcbiAgLy8gd2luZG93LkJBVURfUkFURSA9IDMwMFxuICAvL1xuICAvLyBpZiAod2luZG93LnNjcmVlbi53aWR0aCA8IDQwMCkge1xuICAvLyAgIGQzLnNlbGVjdCgnZGl2I21vYmlsZV9iZWdpbicpLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgLy8gICAgIEJBVURfUkFURSA9IDMwMFxuICAvLyAgICAgZDMuc2VsZWN0KHRoaXMpLnN0eWxlKCdkaXNwbGF5JywgJ25vbmUnKVxuICAvLyAgICAgaW5pdF9yb3V0aW5lKClcbiAgLy8gICB9KVxuICAvLyB9IGVsc2Uge1xuICAvLyAgIEJBVURfUkFURSA9IDEwMFxuICAvLyAgIGQzLnNlbGVjdCgnZGl2I21vYmlsZV9iZWdpbicpLnJlbW92ZSgpXG4gIC8vICAgaW5pdF9yb3V0aW5lKClcbiAgLy8gfVxuICAvL1xuICAvLyBmdW5jdGlvbiBpbml0X3JvdXRpbmUoKSB7XG4gIC8vXG4gIC8vICAgdmFyIHVkcF9tb2RlID0gdHJ1ZVxuICAvL1xuICAvLyAgIGNvbnNvbGUubG9nKCdtYWluLmpzIC8gaW5pdF9yb3V0aW5lKCknKVxuICAvL1xuICAvLyAgIHZhciBwYXJlbnRfYmF1ZF9yYXRlID0gZDMuc2VsZWN0KCdkaXYjYmF1ZF9yYXRlJykuYXBwZW5kKCdkaXYnKS5hdHRyKCdjbGFzcycsICdjb2wtbWQtOCBjb2wtbWQtb2Zmc2V0LTInKVxuICAvL1xuICAvLyAgIHBhcmVudF9iYXVkX3JhdGUuYXBwZW5kKCdoNCcpLmF0dHIoJ2NsYXNzJywgJ3RleHQtY2VudGVyJykuaHRtbCgnbW9kZW0gc3BlZWQnKVxuICAvLyAgIHZhciBiYXVkX3NjYWxlID0gZDMuc2NhbGUubGluZWFyKCkuZG9tYWluKFsxMDAsIDBdKS5yYW5nZShbQkFVRF9SQVRFIC8gMy41LCBCQVVEX1JBVEUgKiAxMF0pXG4gIC8vICAgdmFyIGJhdWRfc2xpZGVyID0gcGFyZW50X2JhdWRfcmF0ZS5hcHBlbmQoJ2lucHV0JykuYXR0cigndHlwZScsICdyYW5nZScpXG4gIC8vICAgICAuYXR0cignbWluJywgMC4wKVxuICAvLyAgICAgLmF0dHIoJ21heCcsIDEwMC4wKVxuICAvLyAgICAgLmF0dHIoJ3ZhbHVlJywgYmF1ZF9zY2FsZS5pbnZlcnQoQkFVRF9SQVRFKSlcbiAgLy9cbiAgLy8gICBiYXVkX3NsaWRlci5vbignaW5wdXQnLCBmdW5jdGlvbiAoKSB7XG4gIC8vICAgICAvLyBjb25zb2xlLmxvZyhkMy5ldmVudClcbiAgLy8gICAgIHZhciB2ID0gZDMuc2VsZWN0KHRoaXMpLm5vZGUoKS52YWx1ZVxuICAvL1xuICAvLyAgICAgY29uc29sZS5sb2codilcbiAgLy9cbiAgLy8gICAgIEJBVURfUkFURSA9IGJhdWRfc2NhbGUodilcbiAgLy9cbiAgLy8gICAgIHdpbmRvdy5hbGljZS5yZXNldF9iYXVkX2NvdW50KClcbiAgLy8gICAgIHdpbmRvdy5ib2IucmVzZXRfYmF1ZF9jb3VudCgpXG4gIC8vXG4gIC8vICAgfSlcbiAgLy9cbiAgLy8gICB2YXIgbWVzc2FnZV90b19zZW5kID0gJzA5ODc2NTQzMjEtLXRlc3RpbmctLTEyMzQ1Njc4OTAtLSEhLS1hYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eidcbiAgLy8gICAgIC8vIG1lc3NhZ2VfdG9fc2VuZCA9ICcwMTIzNDU2NydcbiAgLy8gICB2YXIgb3V0cHV0X21zZyA9ICcnXG4gIC8vXG4gIC8vICAgdmFyIEFnZW50ID0gcmVxdWlyZSgnLi9hZ2VudC5qcycpXG4gIC8vICAgdmFyIFZpZXdfQ29udHJvbGxlciA9IHJlcXVpcmUoJy4vdmlld19jb250cm9sbGVyLmpzJylcbiAgLy9cbiAgLy8gICB3aW5kb3cuYWxpY2UgPSBBZ2VudC5hZ2VudCgpXG4gIC8vICAgYWxpY2UuaW5pdCh7XG4gIC8vICAgICBuYW1lOiAnYWxpY2UnLFxuICAvLyAgICAgdHlwZTogJ2NsaWVudCcsXG4gIC8vICAgICBtZXNzYWdlOiAnSSBhbSBhbGljZSBsaXN0ZW4gdG8gbWUgc2VuZCBkYXRhIHVzaW5nIHdlYiBhdWRpbyBhcGkuJ1xuICAvLyAgIH0pXG4gIC8vXG4gIC8vICAgd2luZG93LmJvYiA9IEFnZW50LmFnZW50KClcbiAgLy8gICBib2IuaW5pdCh7XG4gIC8vICAgICBuYW1lOiAnYm9iJyxcbiAgLy8gICAgIHR5cGU6ICdzZXJ2ZXInLFxuICAvLyAgICAgbWVzc2FnZTogJ1RoaXMgYmUgYm9iLCBsaXN0ZW4gdG8gTUUgc2VuZCBkYXRhIHVzaW5nIHRoZSB3ZWIgYXVkaW8gYXBpLidcbiAgLy8gICB9KVxuICAvL1xuICAvL1xuICAvLyAgIHZhciBkaXNwbGF5X2JvYiA9IFZpZXdfQ29udHJvbGxlci52aWV3X2NvbnRyb2xsZXIoJ2JvYl9tb2RlbScpXG4gIC8vICAgZGlzcGxheV9ib2IuY29ubmVjdChib2IpXG4gIC8vXG4gIC8vICAgdmFyIGRpc3BsYXlfYWxpY2UgPSBWaWV3X0NvbnRyb2xsZXIudmlld19jb250cm9sbGVyKCdhbGljZV9tb2RlbScpXG4gIC8vICAgZGlzcGxheV9hbGljZS5jb25uZWN0KGFsaWNlKVxuICAvL1xuICAvL1xuICAvLyAgIGFsaWNlLmNvbm5lY3QoYm9iKVxuICAvLyAgIGJvYi5jb25uZWN0KGFsaWNlKVxuICAvL1xuICAvLyAgIHNldFRpbWVvdXQoZHJhdywgNTAwKVxuICAvL1xuICAvLyAgIGZ1bmN0aW9uIGRyYXcoKSB7XG4gIC8vXG4gIC8vICAgICBjb25zb2xlLmxvZygndGljaycpXG4gIC8vXG4gIC8vXG4gIC8vICAgICAgIGNvbnNvbGUudGltZSgndGVzdCcpXG4gIC8vICAgICAgIGFsaWNlLnRpY2soKVxuICAvLyAgICAgICBib2IudGljaygpXG4gIC8vICAgICAgIGNvbnNvbGUudGltZUVuZCgndGVzdCcpXG4gIC8vXG4gIC8vICAgICBjb25zb2xlLmxvZygnZHJhdycpXG4gIC8vXG4gIC8vICAgICAgIGRpc3BsYXlfYWxpY2UudGljayhET19EUkFXKVxuICAvLyAgICAgICBkaXNwbGF5X2JvYi50aWNrKERPX0RSQVcpXG4gIC8vXG4gIC8vICAgICAgIC8vIGNvbnNvbGUubG9nKGJvYi5nZXRfc3RhdGUoKS5MQVRFU1RfUlhfQkxPQiwgYWxpY2UuZ2V0X3N0YXRlKCkuTEFTVF9TRU5UX01FU1NBR0UgKVxuICAvL1xuICAvLyAgICAgICB2YXIgYWxpY2Vfc3RhdGUgPSBhbGljZS5nZXRfc3RhdGUoKVxuICAvLyAgICAgICB2YXIgYm9iX3N0YXRlID0gYm9iLmdldF9zdGF0ZSgpXG4gIC8vXG4gIC8vICAgICAgIC8vIGNvbnNvbGUubG9nKGJvYl9zdGF0ZS5MQVRFU1RfUlhfQkxPQi5sZW5ndGgsIGFsaWNlX3N0YXRlLkxBU1RfU0VOVF9NRVNTQUdFLmxlbmd0aClcbiAgLy9cbiAgLy9cbiAgLy8gICAgICAgaWYgKChib2Jfc3RhdGUuTEFURVNUX1JYX0JMT0IubGVuZ3RoICE9PSBhbGljZV9zdGF0ZS5MQVNUX1NFTlRfTUVTU0FHRS5sZW5ndGgpIHx8IChib2Jfc3RhdGUuTEFURVNUX1JYX0JMT0IgPT09IGFsaWNlX3N0YXRlLkxBU1RfU0VOVF9NRVNTQUdFKSkge1xuICAvLyAgICAgICAgIC8vIGlmKGJvYl9zdGF0ZS5MQVRFU1RfUlhfQkxPQiA9PT0gYWxpY2Vfc3RhdGUuTEFTVF9TRU5UX01FU1NBR0Upe1xuICAvLyAgICAgICAgIHNldFRpbWVvdXQoZHJhdywgQkFVRF9SQVRFKVxuICAvLyAgICAgICAgICAgLy8gfSBlbHNlIHtcbiAgLy9cbiAgLy8gICAgICAgICAvLyB9XG4gIC8vICAgICAgIH0gZWxzZSB7XG4gIC8vXG4gIC8vICAgICAgICAgY29uc29sZS5sb2coYm9iX3N0YXRlLkxBVEVTVF9SWF9CTE9CLCBhbGljZV9zdGF0ZS5MQVNUX1NFTlRfTUVTU0FHRSlcbiAgLy8gICAgICAgICBjb25zb2xlLmxvZygnZXJyJylcbiAgLy9cbiAgLy8gICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgLy8gICAgICAgICAgIC8vYm9iLnBlcmZvcm1fc2lnbmFsaW5nKClcbiAgLy8gICAgICAgICAgIHNldFRpbWVvdXQoZHJhdywgQkFVRF9SQVRFICogMilcbiAgLy8gICAgICAgICB9KVxuICAvL1xuICAvL1xuICAvLyAgICAgICB9XG4gIC8vICAgICB9XG4gIC8vICAgICAvLyB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGRyYXcpO1xuICAvLyB9XG5cblxufVxuIl19
