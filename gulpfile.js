// Include gulp & plugins
const gulp = require("gulp"),
  argv = require("yargs").argv,
  csso = require("gulp-csso"),
  del = require("del"),
  fs = require("fs"),
  gulpIf = require("gulp-if"),
  htmlmin = require("gulp-htmlmin"),
  removeLogging = require("gulp-remove-logging"),
  removeCode = require("gulp-remove-code"),
  terser = require("gulp-terser"),
  zip = require("gulp-zip");

// Options specified at the command line.
const optDebug = false || argv.debug,
  optMinify = false || argv.minify,
  optZip = false || argv.zip;

let src, dest;

// Tasks
const scripts = function() {
  return gulp
    .src(`${src}*.js`)
    .pipe(
      gulpIf(
        !optDebug,
        removeLogging({
          replaceWith: "0;",
          methods: [
            "assert",
            "clear",
            "count",
            "count​Reset",
            "debug",
            "dir",
            "dirxml",
            "group",
            "group​Collapsed",
            "groupEnd",
            "info",
            "log",
            "profile",
            "profileEnd",
            "table",
            "time",
            "timeEnd",
            "timeLog",
            "time​Stamp",
            "trace",
          ],
        })
      )
    )
    .pipe(gulpIf(!optDebug, removeCode({ allowDebug: false })))
    .pipe(gulpIf(optMinify, terser()))
    .pipe(gulp.dest(dest));
};
scripts.description = `Process and deploy Javascript files (${src}*.js).`;
scripts.flags = {
  "--debug": "Keep debug related logic in the JavaScript (default: false)",
  "--minify": "Minify the Javascript source code (default: false)",
};

const styles = function() {
  return gulp
    .src(`${src}*.css`)
    .pipe(gulpIf(optMinify, csso()))
    .pipe(gulp.dest(dest));
};
styles.description = `Process and deploy CSS files (${src}*.css).`;
styles.flags = {
  "--minify": "optMinify the CSS source code (default: false)",
};

const html = function() {
  return gulp
    .src(`${src}*.html`)
    .pipe(gulpIf(!optDebug, removeCode({ allowDebug: false })))
    .pipe(
      gulpIf(
        optMinify,
        htmlmin({
          collapseWhitespace: true,
          removeComments: true,
        })
      )
    )
    .pipe(gulp.dest(dest));
};
html.description = `Process and deploy HTML files (${src}*.html).`;
html.flags = {
  "--debug": "Keep debug related logic in the HTML (default: false)",
  "--minify": "Minify the HTML source code (default: false)",
};

const copyFiles = function() {
  return gulp
    .src([`${src}manifest.json`, `${src}images/*.png`], { base: src })
    .pipe(gulp.dest(dest));
};
copyFiles.description = `Copies ${src}images/* and ${src}manifest.json to ${dest}.`;

const zipItUp = function() {
  if (!optZip) {
    return;
  }
  const manifest = JSON.parse(fs.readFileSync(`${dest}manifest.json`)),
    zipFilename =
      manifest.name.toLowerCase().replace(/\s/g, "-") +
      "-v" +
      manifest.version.replace(/\./g, "_") +
      (dest.endsWith("fox/") ? "@john30013.com.zip" : ".zip");
  return gulp
    .src(`${dest}**/*`)
    .pipe(zip(zipFilename))
    .pipe(gulp.dest(packed));
};

const targetChrome = function(done) {
  src = "./src/Chrome/";
  dest = "./dist/Chrome/";
  packed = "./dist/packed/Chrome/";
  done();
};
targetChrome.description = 'Targets the "Chrome" src and dist directories.';

const targetFirefox = function(done) {
  src = "./src/Firefox/";
  dest = "./dist/Firefox/";
  packed = "./dist/packed/Firefox/";
  done();
};
targetFirefox.description = 'Targets the "Firefox" src and dist directories.';

const cleanAll = function() {
  return del(["./dist/"]);
};
cleanAll.description = "Cleans the entire dist directory tree.";

const cleanTarget = function() {
  return del([dest]);
};
cleanTarget.description = "Cleans the target dist directory tree.";

const cleanChrome = function(done) {
  return gulp.series(targetChrome, cleanTarget)(done);
};
cleanChrome.description =
  "Targets Chrome and cleans the Chrome dist directory tree.";

const zipChrome = function(done) {
  return gulp.series(targetChrome, zipItUp)(done);
};

const zipFirefox = function(done) {
  return gulp.series(targetFirefox, zipItUp)(done);
};

const buildChrome = function(done) {
  return gulp.series(
    cleanChrome,
    gulp.parallel(scripts, styles, html, copyFiles),
    zipItUp
  )(done);
};
buildChrome.description =
  "Cleans and builds the Chrome version of the extension.";
buildChrome.flags = {
  "--debug": "Keep debug related logic in the extension (default: false)",
  "--minify": "Minify the extension's source code (default: false)",
  "--zip":
    "Zip the dist files for deployment to the Chrome web store (default: false)",
};

const cleanFirefox = function(done) {
  return gulp.series(targetFirefox, cleanTarget)(done);
};
cleanChrome.description =
  "Targets Chrome and cleans the Chrome dist directory tree.";

const buildFirefox = function(done) {
  return gulp.series(
    cleanFirefox,
    gulp.parallel(scripts, styles, html, copyFiles),
    zipItUp
  )(done);
};
buildFirefox.description =
  "Cleans and builds the Firefox version of the extension.";
buildFirefox.flags = {
  "--debug": "Keep debug related logic in the extension (default: false)",
  "--minify": "Minify the extension's source code (default: false)",
  "--zip":
    "Zip the dist files for deployment to the Firefox Add-ons store (default: false)",
};

const defaultTasks = function(done) {
  return gulp.series(buildChrome, buildFirefox)(done);
};
defaultTasks.description =
  "Cleans and builds the Chrome and Firefox versions of the extension.";
defaultTasks.flags = {
  "--debug": "Keep debug related logic in the extension (default: false)",
  "--minify": "Minify the extension's source code (default: false)",
  "--zip":
    "Zip the dist files for deployment to the web store (default: false)",
};

module.exports = {
  buildChrome,
  buildFirefox,
  cleanAll,
  cleanChrome,
  cleanFirefox,
  zipChrome,
  zipFirefox,
};
module.exports.default = defaultTasks;
