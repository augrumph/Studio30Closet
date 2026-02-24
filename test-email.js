import emailjs from '@emailjs/browser';

const SERVICE_ID = 'service_3h2tyup';
const TEMPLATE_ID = 'template_wghvxdb';
const PUBLIC_KEY = 'DkaN2O0h-27lkoW94';

async function test() {
    try {
        emailjs.init(PUBLIC_KEY);
        const res = await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
            subject: 'Teste de malinha',
            customer_name: 'Teste',
            items_count: 1,
            order_link: 'http://link',
            order_id: '123',
            to_email: 'studio30closet@gmail.com'
        });
        console.log("Success:", res);
    } catch(err) {
        console.error("Error:", err);
    }
}
test();
