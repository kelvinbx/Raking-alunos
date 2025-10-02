// api/proxy.js

export default async function handler(request, response) {
    // Pega a URL da Riot que queremos acessar (ex: /lol/summoner/v4/...)
    const { riotUrl } = request.query;
    
    // Pega a chave da API das variáveis de ambiente (seguro)
    const RIOT_API_KEY = process.env.RIOT_API_KEY;

    if (!riotUrl || !RIOT_API_KEY) {
        return response.status(400).json({ error: 'Faltam parâmetros ou a chave da API.' });
    }
    
    try {
        // Constrói a URL completa para a API da Riot
        const fullUrl = `https://${riotUrl}`;
        
        // Faz a chamada para a API da Riot, adicionando a chave secreta no cabeçalho
        const apiResponse = await fetch(fullUrl, {
            headers: {
                "X-Riot-Token": RIOT_API_KEY
            }
        });

        if (!apiResponse.ok) {
            throw new Error(`Erro na API da Riot: ${apiResponse.statusText}`);
        }

        const data = await apiResponse.json();
        
        // Envia os dados de volta para o nosso frontend
        return response.status(200).json(data);

    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}