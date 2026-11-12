const express = require('express');
const shipping = require('./shipping');
const inventory = require('./inventory');
const cors = require('cors');
const coupons = require('./coupons');
const grpc = require('@grpc/grpc-js');

const app = express();
app.use(cors());

/**
 * Retorna a lista de produtos da loja via InventoryService
 */
app.get('/products', (req, res, next) => {
    inventory.SearchAllProducts(null, (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send({ error: 'something failed :(' });
        } else {
            res.json(data.products);
        }
    });
});

/**
 * Consulta o frete de envio no ShippingService
 */
app.get('/shipping/:cep', (req, res, next) => {
    shipping.GetShippingRate(
        {
            cep: req.params.cep,
        },
        (err, data) => {
            if (err) {
                console.error(err);
                res.status(500).send({ error: 'something failed :(' });
            } else {
                res.json({
                    cep: req.params.cep,
                    value: data.value,
                });
            }
        }
    );
});

app.get('/coupons/:code', (req, res) => {
    const rawSubtotal = req.query.subtotal_cents;

    if (
        typeof rawSubtotal !== 'string' ||
        !/^\d+$/.test(rawSubtotal)
    ) {
        return res.status(400).json({
            error: 'Informe subtotal_cents como inteiro positivo.',
        });
    }

    const subtotal = Number(rawSubtotal);

    if (
        !Number.isInteger(subtotal) ||
        subtotal <= 0 ||
        subtotal > 2147483647
    ) {
        return res.status(400).json({
            error: 'Subtotal fora do intervalo permitido.',
        });
    }

    coupons.ApplyCoupon(
        {
            code: req.params.code,
            subtotal_cents: subtotal,
        },
        { deadline: new Date(Date.now() + 5000) },
        (error, data) => {
            if (error) {
                const statusByCode = {
                    [grpc.status.INVALID_ARGUMENT]: 400,
                    [grpc.status.NOT_FOUND]: 404,
                    [grpc.status.UNAVAILABLE]: 503,
                    [grpc.status.DEADLINE_EXCEEDED]: 504,
                };

                return res.status(
                    statusByCode[error.code] || 500
                ).json({
                    error: error.details || 'Erro ao consultar cupom.',
                });
            }

            res.json(data);
        }
    );
});

/**
 * Inicia o router
 */
app.listen(3000, () => {
    console.log('Controller Service running on http://127.0.0.1:3000');
});
