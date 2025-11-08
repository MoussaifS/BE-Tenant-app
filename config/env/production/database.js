module.exports = ({ env }) => { 
    return {
        connection: {
            client: 'postgres',
            connection: {
                host: `/cloudsql/${env('INSTANCE_CONNECTION_NAME')}`,
                database: env('DATABASE_NAME', 'tenant-app-db'),
                user: env('DATABASE_USERNAME', 'postgres'),
                password: env('DATABASE_PASSWORD', 'postgres'),
            },
        },
    };
};   
