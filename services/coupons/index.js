const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const definition = protoLoader.loadSync('proto/coupons.proto', {
    keepCase: true,
    defaults: true,
});

const { CouponsService } = grpc.loadPackageDefinition(definition);

// Cupons de demonstração, mantidos apenas em memória.
const coupons = new Map([
    ['LIVRO10', 10],
    ['ESTUDANTE15', 15],
]);

const server = new grpc.Server();

server.addService(CouponsService.service, {
    ApplyCoupon: (call, callback) => {
        const code = call.request.code.trim().toUpperCase();
        const subtotal = call.request.subtotal_cents;

        if (!Number.isInteger(subtotal) || subtotal <= 0) {
            return callback({
                code: grpc.status.INVALID_ARGUMENT,
                details: 'O subtotal deve ser um inteiro positivo em centavos.',
            });
        }

        if (!coupons.has(code)) {
            return callback({
                code: grpc.status.NOT_FOUND,
                details: 'Cupom não encontrado.',
            });
        }

        const percentage = coupons.get(code);
        const discount = Math.round(subtotal * percentage / 100);

        callback(null, {
            code,
            percentage,
            discount_cents: discount,
            total_cents: subtotal - discount,
        });
    },
});

server.bindAsync(
    '0.0.0.0:3003',
    grpc.ServerCredentials.createInsecure(),
    (error) => {
        if (error) {
            console.error(error);
            process.exit(1);
        }

        server.start();
        console.log('Coupons Service running on port 3003');
    }
);