const config = {
    API_BASE_URL: process.env.NODE_ENV === 'production'
        ? 'https://speechtraining.usu.edu'
        : 'http://localhost:3000',
    // You can add other config settings here
};

export default config;