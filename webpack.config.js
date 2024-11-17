// frontend/config/webpack.config.js

// Add this to the module.rules array in your webpack config
{
    test: /\.(js|mjs|jsx|ts|tsx)$/,
        include: [
            paths.appSrc,
            /node_modules\/@radix-ui/,
            /node_modules\/@babel/,
        ],
            loader: require.resolve('babel-loader'),
                options: {
        customize: require.resolve(
            'babel-preset-react-app/webpack-overrides'
        ),
            presets: [
                [
                    require.resolve('babel-preset-react-app'),
                    {
                        runtime: 'automatic',
                    },
                ],
            ],
                plugins: [
                    ['@babel/plugin-proposal-optional-chaining'],
                    ['@babel/plugin-proposal-nullish-coalescing-operator'],
                    [
                        require.resolve('babel-plugin-named-asset-import'),
                        {
                            loaderMap: {
                                svg: {
                                    ReactComponent:
                                        '@svgr/webpack?-svgo,+titleProp,+ref![path]',
                                },
                            },
                        },
                    ],
                ],
                    cacheDirectory: true,
                        cacheCompression: false,
                            compact: isEnvProduction,
    },
},