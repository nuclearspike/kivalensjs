//KIVALENS REACT

var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var browserify = require('browserify');
var watchify = require('watchify');
var babel = require('babelify');
var notify = require("gulp-notify");
//var browserSync = require('browser-sync').create();
var liveReload = require("gulp-livereload");


function compile(watch) {
    var bundler = browserify('./src/javascript/app.js',
        { debug: true }).transform(babel);
    if (watch) {
        bundler = watchify(bundler);
    }

    function rebundle() {
        bundler.bundle()
            .on('error', function(err) {
                notify('An error occurred during building. Check the console for details.');
                console.error(err); this.emit('end');
            })
            .pipe(source('build.js'))
            .pipe(buffer())
            .pipe(sourcemaps.init({ loadMaps: true }))
            .pipe(sourcemaps.write('./'))
            .pipe(gulp.dest('./javascript'))
            .pipe(liveReload());
    }

    if (watch) {
        console.log('watching for changes...');
        bundler.on('update', function() {
            notify("Change Detected");
            console.log('-> change:bundling...');
            rebundle();
            console.log('-> done.');
            console.log('waiting...');
            notify("Done");
        });
    }

    rebundle();
}

//////CSS
var config = {sassPath: './styles', bowerDir: './bower_components'};
var sass   = require("gulp-ruby-sass");

gulp.task('css', function() {
    return gulp.src(config.sassPath + '/application.scss').pipe(sass({
        style: 'compressed',
        loadPath: ['./src/styles']
    }).on('error', notify.onError(function(error) {
        return 'Error: ' + error.message;
    }))).pipe(gulp.dest('./css')).pipe(liveReload());
});

///SERVER
gulp.task('server', function() {
    var webserver = require('gulp-webserver');
    gulp.src('./')
        .pipe(webserver({
            fallback: 'index.html',
            livereload: true,
            open: true,
            enable: true
        }));
});

/**
 * "browserify": {
    "transform": [
      "browserify-shim"
    ]
  },
 "browserify-shim": {
    "react": "global:React",
    "react/addons": "global:React",
    "react-bootstrap": "global:ReactBootstrap",
    "reflux": "global:Reflux"
  },
 */

/**
 * "transform": [
 "browserify-shim"
 ]
 *
 * "react": "^0.13.3",
 * "react-bootstrap": "^0.25.2",
 *
 "browserify-shim": {
    "jquery": "$",
        "react": "global:React",
        "react-bootstrap": "global:ReactBootstrap",
        "react-router": "global:ReactRouter",
        "reflux": "global:Reflux"
},**/

/**
 var libs = {
    "react": "window.React",
    "react/addons": "window.React",
    "react-bootstrap": "window.ReactBootstrap",
    "reflux": "window.Reflux"
}; **/

//.transform(literalify.configure(libs))

notify("Restarted...");

gulp.task('build', function() { return compile(false); });
gulp.task('watch', function() { return compile(true); });
gulp.task('default', ['build', 'css']);

gulp.task('s', ['watch', 'server']);