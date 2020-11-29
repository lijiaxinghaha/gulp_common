const { src, dest, series, parallel } = require("gulp");
const del = require("del");
const browserSync = require("browser-sync");
const bs = browserSync.create();
const loadPlugins = require("gulp-load-plugins");
const { watch } = require("browser-sync");

const plugins = loadPlugins();

const cwd = process.cwd();
let cf = {
  build: {
    src: "src",
    dist: "dist",
    temp: "temp",
    public: "public",
    paths: {
      styles: "assets/styles/*.scss",
      scripts: "assets/scripts/*.js",
      pages: "*.html",
      fonts: "assets/fonts/**",
      images: "assets/images/**",
    },
  },
};
try {
  const recf = require(`${cwd}/page.config.js`);
  cf = Object.assign({}, cf, recf);
} catch (error) {}

const clean = () => {
  return del([cf.build.dist, cf.build.temp]);
};
const style = () => {
  return src(cf.build.paths.styles, { base: cf.build.src, cwd: cf.build.src })
    .pipe(plugins.sass({ outputStyle: "expanded" }))
    .pipe(dest(cf.build.temp))
    .pipe(bs.reload({ stream: true }));
};

const script = () => {
  return src(cf.build.paths.scripts, { base: cf.build.src, cwd: cf.build.src })
    .pipe(plugins.babel({ presets: [require("@babel/preset-env")] }))
    .pipe(dest(cf.build.temp))
    .pipe(bs.reload({ stream: true }));
};

const page = () => {
  return src(cf.build.paths.pages, { base: cf.build.src, cwd: cf.build.src })
    .pipe(plugins.swig({ data: cf.data, defaults: { cache: false } })) // 防止模板缓存导致页面不能及时更新
    .pipe(dest(cf.build.temp))
    .pipe(bs.reload({ stream: true }));
};
const image = () => {
  return src(cf.build.paths.images, {
    base: cf.build.src,
    cwd: cf.build.src,
  })
    .pipe(plugins.imagemin())
    .pipe(dest(cf.build.dist));
};
const font = () => {
  return src(cf.build.paths.fonts, { base: cf.build.src, cwd: cf.build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(cf.build.dist));
};
const public = () => {
  return src("**", {
    base: cf.build.public,
    cwd: cf.build.public,
  }).pipe(dest(cf.build.dist));
};

// 开发环境启动本地服务
const serve = () => {
  watch(cf.build.paths.styles, { cwd: cf.build.src }, style);
  watch(cf.build.paths.scripts, { cwd: cf.build.src }, script);
  watch(cf.build.paths.pages, { cwd: cf.build.src }, page);
  watch(
    [cf.build.paths.images, cf.build.paths.fonts],
    { cwd: cf.build.src },
    bs.reload
  );
  watch("**", { cwd: cf.build.public }, bs.reload);
  bs.init({
    notify: false,
    port: 2080,
    server: {
      baseDir: [cf.build.arc, cf.build.temp, cf.build.public],
      routes: {
        "/node_modules": "node_modules",
      },
    },
  });
};

//gulp-useref可以利用模版的注释将HTML引用的多个CSS和JS合并起来，不负责压缩
const useref = () => {
  return (
    src(cf.build.paths.pages, { base: cf.build.temp, cwd: cf.build.temp })
      .pipe(plugins.useref({ searchPath: [cf.build.temp, "."] }))
      // html js css
      .pipe(plugins.if(/\.js$/, plugins.uglify()))
      .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
      .pipe(
        plugins.if(
          /\.html$/,
          plugins.htmlmin({
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: true,
          })
        )
      )
      .pipe(dest(cf.build.dist))
  );
};

const comp = parallel(style, script, page);

const build = series(
  clean,
  parallel(series(comp, useref), image, font, public)
);

const develop = series(comp, serve);

module.exports = {
  develop,
  clean,
  build,
};
