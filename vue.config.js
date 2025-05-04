const { defineConfig } = require('@vue/cli-service')
const path = require('path')

module.exports = defineConfig({
  transpileDependencies: true,
  publicPath: process.env.NODE_ENV === 'production' ? '/' : '/',
  outputDir: 'dist',
  assetsDir: 'assets',
  
  configureWebpack: {
    optimization: {
      splitChunks: {
        chunks: 'all'
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    }
  },
  
  devServer: {
    port: 8080,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: process.env.VUE_APP_API_ENDPOINT || 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  
  css: {
    loaderOptions: {
      // scss loader option in Vue CLI
      scss: {
        // The ~ prefix is required when importing from node_modules
        additionalData: `
          // Global SCSS variables
          $primary-color: #3B82F6;
          $secondary-color: #64748B;
          $success-color: #22C55E;
          $warning-color: #F59E0B;
          $danger-color: #EF4444;
          $font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          $font-size-base: 16px;
          $spacing-unit: 8px;
          $border-radius: 4px;
        `
      }
    }
  },
  
  chainWebpack: config => {
    config.plugin('html').tap(args => {
      args[0].title = 'LM Studio Agents';
      return args;
    });
  }
})
