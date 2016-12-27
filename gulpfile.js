var gulp = require('gulp')
var babel = require('gulp-babel')
var sourcemaps = require('gulp-sourcemaps');

gulp.task('build', function () {
  return gulp.src('src/*.js')
  .pipe(sourcemaps.init())
  .pipe(babel())
  .pipe(sourcemaps.write())
  .pipe(gulp.dest('dest'))
})

gulp.task('watch', function () {
  gulp.watch('src/*.js', ['build'])
})


gulp.task('default', ['build', 'watch'])
