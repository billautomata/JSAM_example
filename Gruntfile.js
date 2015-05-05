module.exports = function (grunt) {

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-browserify')

  grunt.registerTask('default','watch')

  grunt.initConfig({

    browserify: {
      main: {
        src: 'js/main.js',
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
      }
    },

    watch: {
      everything: {
        files: ['*.html','js/*.js', 'css/*.css'],
        tasks: ['browserify'],
        options: {
          livereload: {
            port: 9000
              // you can pass in any other options you'd like to the https server, as listed here: http://nodejs™.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener
          }
        },
      },
    }

  })


}
