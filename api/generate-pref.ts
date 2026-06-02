
import { MercadoPagoConfig, Preference } from 'mercadopago';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from .env
dotenv.config({ path: path.join(__dirname, 'src', '..', '.env') });

async function generate() {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
        console.error("Error: MERCADO_PAGO_ACCESS_TOKEN not found in environment.");
        return;
    }

    console.log("Authenticating with Access Token...");
    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);

    try {
        const result = await preference.create({
            body: {
                items: [
                    {
                        id: 'TEST-123',
                        title: 'Test Item for ID Generation',
                        quantity: 1,
                        unit_price: 100
                    }
                ]
            }
        });
        
        console.log("\n===========================================");
        console.log("PREFERENCE ID GENERATED SUCCESSFULLY");
        console.log("===========================================");
        console.log(`ID: ${result.id}`);
        console.log("===========================================\n");
    } catch (error) {
        console.error("Error generating preference:", error);
    }
}

generate();
