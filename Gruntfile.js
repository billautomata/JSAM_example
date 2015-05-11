module.exports = function (grunt) {

  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-browserify')

  grunt.registerTask('default','watch')

  grunt.initConfig({

    connect: {
      server: {
        options: {
          port: 8000,
          keepalive: true,
          hostname: '*',
          protocol: 'https',
          key: grunt.file.read('./livereload.key').toString(),
          cert: grunt.file.read('./livereload.crt').toString(),
          // onCreateServer: function(server, connect, options) {
          //   var io = require('socket.io').listen(server);
          //   io.sockets.on('connection', function(socket) {
          //     // do something with socket
          //   });
          // }
        }
      }
    },

    browserify: {
      main: {
        src: 'src/main.js',
        dest: 'build/bundle.js',
        files: {
          'build/bundle.js': ['**/*.js'],
        },
        options: {
          transform: ['brfs'],
          browserifyOptions: {
            debug: true
          }
        }
      },
      // learning: {
      //   src: 'src/learning_main.js',
      //   dest: 'build/learning_bundle.js',
      //   files: {
      //     'build/learning_bundle.js': ['**/*.js'],
      //   },
      //   options: {
      //     transform: ['brfs'],
      //     browserifyOptions: {
      //       debug: true
      //     }
      //   }
      // }
    },

    watch: {
      everything: {
        files: ['*.html','src/*.js', 'css/*.css'],
        tasks: ['browserify'],
        options: {
          livereload: {
            port: 9000,
            key: grunt.file.read('./livereload.key').toString(),
            cert: grunt.file.read('./livereload.crt').toString(),
              // you can pass in any other options you'd like to the https server, as listed here: http://nodejs™.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener
          }
        },
      },
    }

  })


}
