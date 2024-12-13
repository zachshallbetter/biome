const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
    entry: './client/src/index.ts',
    output: {
        path: path.resolve(__dirname, 'dist/client'),
        filename: 'bundle.js',
        clean: true
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.(glsl|vs|fs|vert|frag)$/,
                exclude: /node_modules/,
                use: ['raw-loader']
            }
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        alias: {
            'three': path.resolve('./node_modules/three')
        }
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './client/public/index.html',
            inject: 'body'
        }),
        new webpack.ProvidePlugin({
            THREE: 'three'
        })
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist/client'),
        },
        compress: true,
        port: 3000,
        hot: true,
        proxy: {
            '/api': 'http://localhost:8080',
            '/socket.io': {
                target: 'http://localhost:8080',
                ws: true,
            },
        },
    },
    devtool: 'source-map',
    mode: 'development'
}; 