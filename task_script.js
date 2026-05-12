const { JSDOM } = require('jsdom');
const fs = require('fs');

async function run() {
    try {
        const url = 'http://www.sec.ba.gov.br/siig/sistemaescolar/asp/servidores/consulta_escola.asp?codigo_mec=29057809&codigo_secretaria=1125747';
        const res = await fetch(url);
        const html = await res.text();
        fs.writeFileSync('debug_get.html', html);
        const dom = new JSDOM(html);
        const document = dom.window.document;
        
        console.log('HTML length:', html.length);
        const form = document.querySelector('form');
        if (form) {
            console.log('Form found, action:', form.getAttribute('action'));
        } else {
            console.log('No form found');
        }

        const inputs = document.querySelectorAll('input');
        console.log('Input count:', inputs.length);
        const formData = new URLSearchParams();
        inputs.forEach(input => {
            console.log('Input:', input.name, '=', input.value);
            if (input.name) {
                formData.append(input.name, input.value || '');
            }
        });
        
        // Manual override based on common fields if they are missing
        if (!formData.has('codigo_mec')) formData.append('codigo_mec', '29057809');
        if (!formData.has('codigo_secretaria')) formData.append('codigo_secretaria', '1125747');

        console.log('Final form data:', formData.toString());

        const postUrl = 'http://www.sec.ba.gov.br/siig/sistemaescolar/asp/servidores/listar_servidores_nominal.asp';
        const postRes = await fetch(postUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        });

        const postHtml = await postRes.text();
        fs.writeFileSync('debug_servidores_nominal.html', postHtml);
        
        const results = {
            hasMatr: postHtml.includes('Matr'),
            hasCargo: postHtml.includes('Cargo'),
            hasNenhum: postHtml.includes('Nenhum'),
            trCount: (postHtml.match(/<tr/gi) || []).length
        };
        console.log('Results:', results);
    } catch (e) {
        console.error('Error:', e.message);
    }
}
run();
