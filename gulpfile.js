// Include gulp & plugins
const gulp = require("gulp"),
  argv = require("yargs").argv,
  csso = require("gulp-csso"),
  del = require('del'),
  gulpIf = require('gulp-if'),
  htmlmin = require('gulp-htmlmin'),
  removeLogging = require('gulp-remove-logging'),
  removeCode = require('gulp-remove-code'),
  terser = require('gulp-terser');

// Options specified at the command line.
const allowDebug = false || argv.allowDebug,
  minify = true || !argv.noMinify;
let src, dest, manifest;

// Tasks
const scripts = function() {
    return gulp.src(`${src}*.js`)
      .pipe(gulpIf(!allowDebug, removeLogging(
          {'replaceWith': '0;', 
            'methods': ['assert', 'clear', 'count', 'count​Reset', 'debug', 
                'dir', 'dirxml', 'group', 'group​Collapsed', 'groupEnd', 
                'info', 'log', 'profile', 'profileEnd', 'table', 
                'time', 'timeEnd', 'timeLog', 'time​Stamp', 'trace']})))
      .pipe(gulpIf(!allowDebug, removeCode({'allowDebug': false})))
      .pipe(gulpIf(minify, terser()))
      .pipe(gulp.dest(dest));
};
scripts.description = `Process and deploy Javascript files (${src}*.js).`;
scripts.flags = {
  '--allowDebug': 'Keep debug related logic in the JavaScript (default: false)',
  '--minify': 'Minify the JavaScript source code (default: true)',
};

const styles = function() {
  return gulp.src(`${src}*.css`)
    .pipe(gulpIf(minify, csso()))
    .pipe(gulp.dest(dest));
};
styles.description = `Process and deploy CSS files (${src}*.css).`;
styles.flags = {
  '--minify': 'Minify the CSS source code (default: true)',
};

const html = function() {
  return gulp.src(`${src}*.html`)
    .pipe(gulpIf(!allowDebug, removeCode({ allowDebug: false })))
    .pipe(gulpIf(minify, htmlmin({
          collapseWhitespace: true,
          removeComments: true,
        })))
    .pipe(gulp.dest(dest))
    ;
};
html.description = `Process and deploy HTML files (${src}*.html).`;
html.flags = {
  '--allowDebug': 'Keep debug related logic in the HTML (default: false)',
  '--minify': 'Minify the HTML source code (default: true)',
};

const copyFiles = function() {
  return gulp.src([`${src}manifest.json`, `${src}images/*.png`], {base: src})
    .pipe(gulp.dest(dest))
    ;
};
copyFiles.description = `Copies ${src}images/* and ${src}manifest.json to ${dest}.`;

const targetChrome = function(done) {
  src = './src/Chrome/'; 
  dest = './dist/Chrome/';
  done();
};
targetChrome.description = 'Targets the "Chrome" src and dist directories.';

const targetFirefox = function(done) {
  src = './src/Firefox/'; 
  dest = './dist/Firefox/';
  done();
};
targetFirefox.description = 'Targets the "Firefox" src and dist directories.';

const cleanAll = function() {
  return del(['./dist/']);
};
cleanAll.description = 'Cleans the entire dist directory tree.';

const cleanTarget = function() {
  return del([dest]);
};
cleanTarget.description = 'Cleans the target dist directory tree.';

const cleanChrome = function(done) {
  return gulp.series(targetChrome, cleanTarget)(done);
};
cleanChrome.description = 'Targets Chrome and cleans the Chrome dist directory tree.';

const buildChrome = function(done) {
  return gulp.series(cleanChrome,
    gulp.parallel(scripts, styles, html, copyFiles))(done);
};
buildChrome.description = 'Cleans and builds the Chrome version of the extension.';
buildChrome.flags = {
  '--allowDebug': 'Keep debug related logic in the HTML (default: false)',
  '--minify': 'Minify the HTML source code (default: true)',
};

const cleanFirefox = function(done) {
  return gulp.series(targetFirefox, cleanTarget)(done);
};
cleanChrome.description = "Targets Chrome and cleans the Chrome dist directory tree.";

const buildFirefox = function(done) {
  return gulp.series(cleanFirefox,
    gulp.parallel(scripts, styles, html, copyFiles))(done);
};
buildFirefox.description = 'Cleans and builds the Firefox version of the extension.';
buildFirefox.flags = {
  '--allowDebug': 'Keep debug related logic in the HTML (default: false)',
  '--minify': 'Minify the HTML source code (default: true)',
};

const defaultTasks = function(done) {
  return gulp.series(buildChrome, buildFirefox)(done);
};
defaultTasks.description = 'Cleans and builds the Chrome and Firefox versions of the extension.';
defaultTasks.flags = {
  '--allowDebug': 'Keep debug related logic in the HTML (default: false)',
  '--minify': 'Minify the HTML source code (default: true)',
};

module.exports = {
  buildChrome,
  buildFirefox,
  cleanAll,
  cleanChrome,
  cleanFirefox,
};
module.exports.default = defaultTasks;
