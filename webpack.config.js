const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

module.exports = {
    mode: process.env.NODE_ENV || 'development',
    entry: './src/renderer/index.tsx',
    target: 'web',
    devtool: 'source-map',

    performance: {
        hints: false
    },

    module: {
        rules: [
            {
                test: /\.tsx?$/,
                include: /src/,
                exclude: /__tests__/,
                use: [{ loader: 'ts-loader' }]
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ]
    },

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'renderer.js',
        publicPath: '/'
    },

    devServer: {
        port: 3000,
        hot: true,
        static: {
            directory: path.join(__dirname, 'assets'),
            publicPath: '/assets'
        },
        proxy: [
            {
                context: ['/api'],
                target: 'http://localhost:8080',
                changeOrigin: true
            }
        ]
    },

    plugins: [
        new HtmlWebpackPlugin({
            template: './src/renderer/index.html'
        }),

        new CopyWebpackPlugin({
            patterns: [
                { from: 'src/renderer/styles.css', to: 'styles.css' },
                { from: 'src/renderer/themes', to: 'themes' },
                { from: 'assets', to: 'assets' }
            ]
        }),

        // ⭐ Inject API_BASE so your frontend knows where to call the API
        new webpack.DefinePlugin({
            API_BASE: JSON.stringify(
                process.env.NODE_ENV === 'production'
                    ? 'https://swim-lab.azurewebsites.net'
                    : 'http://localhost:8080'
            )
        })
    ],

    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        fallback: {
            path: false,
            fs: false,
            buffer: require.resolve('buffer/')
        }
    }
};
