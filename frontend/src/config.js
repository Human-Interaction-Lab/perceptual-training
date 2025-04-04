const config = {
    API_BASE_URL: process.env.NODE_ENV === 'production'
        ? 'https://speechtraining.usu.edu'
        : 'http://localhost:28303', // Updated to match the backend server port
    // You can add other config settings here
};

export default config;