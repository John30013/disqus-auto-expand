// Include gulp & plugins
const gulp = require("gulp"),
  argv = require("yargs").argv,
  childProc = require("child_process"),
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
const taskName = argv._[0],
  optDebug = false || !!argv.debug,
  optMinify = false || !!argv.minify,
  optZip = taskName.startsWith("zip") || !!argv.zip;

let src, dist, packed;

/* ===== Utility tasks. =====
  These tasks are not exported, and require targetChrome() or targetFirefox() 
  to be called first to set the src, dist and packed directories. */
const targetChrome = function(done) {
  src = "./src/Chrome/";
  dist = "./dist/Chrome/";
  packed = "./dist/packed/Chrome/";
  done();
};
targetChrome.description = 'Targets the "Chrome" src and dist directories.';

const targetFirefox = function(done) {
  src = "./src/Firefox/";
  dist = "./dist/Firefox/";
  packed = "./dist/packed/Firefox/";
  done();
};
targetFirefox.description = 'Targets the "Firefox" src and dist directories.';

const makeDistWritable = function(done) {
  childProc.exec(`attrib -r ${dist}*.* /s`, done);
};
makeDistWritable.description =
  "Makes the files in the targeted dist directory writeable.";

const makeDistReadOnly = function(done) {
  childProc.exec(`attrib +r ${dist}*.* /s`, done);
};
makeDistReadOnly.description =
  "Makes the files in the targeted disd directory read-only.";

const copyScripts = function() {
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
    .pipe(gulp.dest(dist));
};
copyScripts.description = `Process and deploy Javascript files (${src}*.js).`;
copyScripts.flags = {
  "--debug": "Keep debug related logic in the JavaScript (default: false)",
  "--minify": "Minify the Javascript source code (default: false)",
};

const copyStyles = function() {
  return gulp
    .src(`${src}*.css`)
    .pipe(gulpIf(optMinify, csso()))
    .pipe(gulp.dest(dist));
};
copyStyles.description = `Process and deploy CSS files (${src}*.css).`;
copyStyles.flags = {
  "--minify": "optMinify the CSS source code (default: false)",
};

const copyHtml = function() {
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
    .pipe(gulp.dest(dist));
};
copyHtml.description = `Process and deploy HTML files (${src}*.html).`;
copyHtml.flags = {
  "--debug": "Keep debug related logic in the HTML (default: false)",
  "--minify": "Minify the HTML source code (default: false)",
};

const copyFiles = function() {
  return gulp
    .src([`${src}manifest.json`, `${src}images/*`], { base: src })
    .pipe(gulp.dest(dist));
};
copyFiles.description = `Copies ${src}images/* and ${src}manifest.json to ${dist}.`;

const zipTarget = function(done) {
  if (!optZip) {
    console.log("Skipping zipTarget task.");
    done();
    return;
  }
  const manifest = JSON.parse(fs.readFileSync(`${dist}manifest.json`)),
    zipFilename =
      manifest.name.toLowerCase().replace(/\s/g, "-") +
      "-v" +
      manifest.version.replace(/\./g, "_") +
      (dist.endsWith("fox/") ? "@john30013.com.zip" : ".zip");
  return gulp
    .src(`${dist}**/*`)
    .pipe(zip(zipFilename))
    .pipe(gulp.dest(packed));
};
zipTarget.description =
  "Zips the targeted dist directory into its packed directory. If called from another script, runs only if --zip command line option is specified.";

const cleanTarget = function() {
  return del([dist]);
};
cleanTarget.description = "Cleans the target dist directory tree.";

/* ===== Exported tasks. ===== */
const logArgs = function(done) {
  console.log({ taskName, optDebug, optMinify, optZip, argv });
  done();
};
logArgs.description =
  "Logs the task name and arguments to the console (mainly for debugging).";
logArgs.flags = {
  "--debug": "Keep debug related logic in the extension (default: false)",
  "--minify": "Minify the extension's source code (default: false)",
  "--zip":
    "Zip the dist files for deployment to the targeted browser's web store (default: false)",
};

const buildChrome = function(done) {
  return gulp.series(
    targetChrome,
    makeDistWritable,
    cleanTarget,
    gulp.parallel(copyScripts, copyStyles, copyHtml, copyFiles),
    zipTarget,
    makeDistReadOnly
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

const buildFirefox = function(done) {
  return gulp.series(
    targetFirefox,
    makeDistWritable,
    cleanTarget,
    gulp.parallel(copyScripts, copyStyles, copyHtml, copyFiles),
    zipTarget,
    makeDistReadOnly
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

const cleanAll = function() {
  return del(["./dist/"]);
};
cleanAll.description = "Cleans the entire dist directory tree.";

const cleanChrome = function(done) {
  return gulp.series(
    targetChrome,
    makeDistWritable,
    cleanTarget,
    makeDistReadOnly
  )(done);
};
cleanChrome.description =
  "Targets Chrome and cleans the Chrome dist directory tree.";

const cleanFirefox = function(done) {
  return gulp.series(
    targetFirefox,
    makeDistWritable,
    cleanTarget,
    makeDistReadOnly
  )(done);
};
cleanFirefox.description =
  "Targets Firefox and cleans the Firefox dist directory tree.";

const zipChrome = function(done) {
  return gulp.series(
    targetChrome,
    makeDistWritable,
    zipTarget,
    makeDistReadOnly
  )(done);
};
zipChrome.description =
  "Zips the Chrome dist directory to its packed directory.";

const zipFirefox = function(done) {
  return gulp.series(
    targetFirefox,
    makeDistWritable,
    zipTarget,
    makeDistReadOnly
  )(done);
};
zipFirefox.description =
  "Zips the Firefox dist directory to its packed directory.";

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
  logArgs,
};
module.exports.default = defaultTasks;
