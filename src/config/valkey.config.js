import { GlideClient } from "@valkey/valkey-glide";

let valkeyClient = null
const connectValkey = async() => {
    for(let i = 0; i < 5; i++){
        try {
            valkeyClient = await GlideClient.createClient({
                addresses: [{
                    host: process.env.VALKEY_HOST,
                    port: parseInt(process.env.VALKEY_PORT)
                }]
            });
            console.log("Valkey connected");
            return;
        } catch(error){
            console.error(`Valkey connection failed attempt ${i + 1}`);
            await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        }
    }
    console.log("Valkey connection failed after maximum tries");
    process.exit(1);
}

const getValkeyClient = () => {
    if(!valkeyClient){
        throw new Error("Valkey not initialized")
    }
    return valkeyClient
}

export {
    connectValkey,
    getValkeyClient
}