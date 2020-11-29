/**
 * Gulp configuration file. Commands are:
 *   'npm start' - Runs the default task (gulp develop).
 *   'npm run api' - Generates API documentation and outputs it to api_docs/.
 *   'npm run build' - Builds the dist folder.
 *   'npm run develop' - Runs in development mode (watches for changes in files and builds the dist folder).
 */

// gulp plugins
const babel = require('gulp-babel'),
	concat = require('gulp-concat'),
	del = require('del'),
	gulp = require('gulp'),
	htmlmin = require('gulp-htmlmin'),
	imagemin = require('gulp-imagemin'),
	jsdoc = require('gulp-jsdoc3'),
	notify = require('gulp-notify'),
	plumber = require('gulp-plumber'),
	sass = require('gulp-sass'),
	sourcemaps = require('gulp-sourcemaps'),
	uglify = require('gulp-uglify');

// globals
let resources = {
	html: [
		'./src/**/*.+(html|php)',
		'!./src/**/lib/**/*', // ignore lib folders and files
		'!./src/**/_backup/**/*' // ignore backup folders
	],
	images: [
		'./src/**/*.+(png|jpg|jpeg|svg|ico|cur)',
		'!./src/**/lib/**/*', // ignore lib folders and files
		'!./src/**/_backup/**/*' // ignore backup folders
	],
	styles: [
		'./src/**/*.scss',
		'!./src/**/lib/**/*', // ignore lib folders and files
		'!./src/**/_backup/**/*' // ignore backup folders
	],
	scripts: [
		'./src/**/*.js',
		'!./src/**/lib/**/*', // ignore lib folders and files
		'!./src/**/_backup/**/*' // ignore backup folders
	],
	static: [
		'./src/**/*',
		'!./src/**/*.+(html|php)', // ignore html
		'!./src/**/*.+(png|jpg|jpeg|svg|ico|cur)', // ignore images
		'!./src/**/*.js', // ignore scripts
		'!./src/**/*.scss', // ignore styles
		'!./src/**/_backup/**/*', // ignore backup folders
		'./src/**/lib/**/*' // add back in lib folders and files
	]
};

/**
 * Generates API documentation and outputs it to api_docs/.
 */
function api() {
	// add the README file to the array
	var files = resources.scripts.concat(['./jsdoc_resources/README.md']);

	// jsdoc config
	var config = {
		opts: {
			destination: './api_docs/',
			template: './jsdoc_resources/twi-jsdoc-template'
		},
		plugins: ['plugins/markdown'],
		templates: {
			referenceTitle: 'Poodles API'
		}
	};

	return gulp
		.src(files, {
			read: false
		})
		.pipe(jsdoc(config));
}

/**
 * Deletes the api_docs folder.
 */
function cleanApi() {
	return del(['./api_docs/']);
}

/**
 * Deletes the dist folder.
 */
function cleanDist() {
	return del(['./dist/']);
}

/**
 * Creates and returns a generic plumber error handling instance.
 */
function getPlumber() {
	return plumber({
		// handle any errors running this task
		errorHandler: function(error) {
			notify.onError({
				title: 'Gulp error in ' + error.plugin,
				message: error.toString()
			})(error);
			this.emit('end'); // to call the next pipe in the task pipeline
		}
	});
}

/**
 * Compresses HTML.
 */
function html() {
	return gulp
		.src(resources.html, {
			base: './src/'
		})
		.pipe(getPlumber())
		.pipe(
			htmlmin({
				collapseWhitespace: true,
				removeComments: true
			})
		)
		.pipe(gulp.dest('./dist/'));
}

/**
 * Optimizes images.
 */
function images() {
	return gulp
		.src(resources.images, {
			base: './src/'
		})
		.pipe(getPlumber())
		.pipe(imagemin())
		.pipe(gulp.dest('./dist/'));
}

/**
 * Transpiles ES6 to ES5, minifies js, and creates sourcemaps so the ES6 can be viewed in dev tools.
 */
function scripts() {
	return gulp
		.src(resources.scripts, {
			base: './src/'
		})
		.pipe(getPlumber())
		.pipe(sourcemaps.init()) // initialize sourcemaps for .min.css files
		.pipe(
			babel({
				// compile ES2015+ into the version of javascript currently supported by browsers
				presets: ['@babel/env'],
				plugins: ['@babel/plugin-proposal-class-properties', '@babel/plugin-proposal-object-rest-spread']
			})
		)
		.pipe(uglify()) // minify the .js files
		.pipe(concat('all.min.js')) // bundle all .js files into one file
		.pipe(sourcemaps.write('maps')) // generate sourcemap for the bundle
		.pipe(gulp.dest('./dist/'));
}

/**
 * Copies folders and files that don't need compilation or transpilation to the dist folder.
 */
function static() {
	return gulp
		.src(resources.static, {
			base: './src/',
			nodir: true
		})
		.pipe(getPlumber())
		.pipe(gulp.dest('./dist/'));
}

/**
 * Processes all SCSS files:
 *   - Compiles SCSS
 *   - Minifies
 *   - Creates sourcemaps
 *   - Copies to the dist folder
 */
function styles() {
	return gulp
		.src(resources.styles, {
			base: './src/'
		})
		.pipe(getPlumber())
		.pipe(sourcemaps.init()) // initialize sourcemaps for .min.css files
		.pipe(sass({ outputStyle: 'compressed' })) // compile sass into css
		.pipe(concat('all.min.css')) // bundle all .css files into one file
		.pipe(sourcemaps.write('maps')) // generate sourcemap for the bundle
		.pipe(gulp.dest('./dist/'));
}

/**
 * Watches files for changes and runs the appropriate task when changes occur.
 */
function watch(done) {
	gulp.watch(resources.html, html);
	gulp.watch(resources.images, images);
	gulp.watch(resources.scripts, scripts);
	gulp.watch(resources.static, static);
	gulp.watch(resources.styles, styles);
	done();
}

// group common build tasks together
const build = gulp.series(cleanDist, cleanApi, gulp.parallel(api, html, images, scripts, static, styles));

// these tasks are publicly available
exports.api = gulp.series(cleanApi, api);
exports.build = gulp.series(build);
exports.develop = exports.dev = gulp.series(build, watch);
exports.default = exports.develop;
